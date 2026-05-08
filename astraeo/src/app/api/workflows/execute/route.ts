import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";
import { z, ZodError } from "zod";
import type { WorkflowNode, WorkflowEdge, Workflow, Agent } from "@/lib/types";
import { checkRateLimit, LIMITS, requestKey } from "@/lib/rate-limit";
import { err, validationError, handleRouteError } from "@/lib/errors";
import { buildAgentContext, formatContextBlock } from "@/lib/agent-context";

const ExecuteBodySchema = z.object({
  workflow: z.object({
    id: z.string().optional(),
    nodes: z.array(z.unknown()).min(1).max(50),
    edges: z.array(z.unknown()).max(200),
  }),
  agents: z.array(z.unknown()).max(20).default([]),
  triggerInput: z.string().min(1).max(32_000),
  apiKey: z.string().min(10).max(256),
  model: z.string().max(64).optional(),
  agentId: z.string().cuid().optional(),
});

// ─── Request Body ─────────────────────────────────────────────────────────────
interface ExecuteRequestBody {
  workflow: Workflow;
  agents: Agent[];
  triggerInput: string;
  apiKey: string;
  model?: string;
}

// ─── SSE Event Types ──────────────────────────────────────────────────────────
interface NodeStartEvent {
  type: "node_start";
  nodeId: string;
  nodeLabel: string;
}

interface NodeOutputEvent {
  type: "node_output";
  nodeId: string;
  output: string;
}

interface NodeDoneEvent {
  type: "node_done";
  nodeId: string;
  durationMs: number;
}

interface NodeErrorEvent {
  type: "node_error";
  nodeId: string;
  error: string;
}

interface WorkflowDoneEvent {
  type: "workflow_done";
  totalDurationMs: number;
  finalOutput: string;
}

type SSEEvent =
  | NodeStartEvent
  | NodeOutputEvent
  | NodeDoneEvent
  | NodeErrorEvent
  | WorkflowDoneEvent;

// ─── Topological Sort ─────────────────────────────────────────────────────────
function topoSort(nodes: WorkflowNode[], edges: WorkflowEdge[]): WorkflowNode[] {
  const inDeg = new Map<string, number>(nodes.map((n) => [n.id, 0]));
  const adj = new Map<string, string[]>(nodes.map((n) => [n.id, []]));

  for (const e of edges) {
    inDeg.set(e.to, (inDeg.get(e.to) ?? 0) + 1);
    adj.get(e.from)?.push(e.to);
  }

  const queue = nodes.filter((n) => (inDeg.get(n.id) ?? 0) === 0);
  const result: WorkflowNode[] = [];

  while (queue.length > 0) {
    const cur = queue.shift()!;
    result.push(cur);
    for (const nextId of adj.get(cur.id) ?? []) {
      const deg = (inDeg.get(nextId) ?? 1) - 1;
      inDeg.set(nextId, deg);
      if (deg === 0) {
        const nextNode = nodes.find((n) => n.id === nextId);
        if (nextNode) queue.push(nextNode);
      }
    }
  }

  // If cycle detected (not all nodes sorted), fall back to original order
  return result.length === nodes.length ? result : nodes;
}

// ─── Safe condition evaluator ─────────────────────────────────────────────────
function evaluateCondition(expression: string, context: Record<string, unknown>): boolean {
  const expr = expression.trim();
  if (!expr) return true;
  const output = String(context.output ?? context.prevOutput ?? "");
  try {
    if (expr === "true") return true;
    if (expr === "false") return false;
    if (expr === "output") return output.length > 0;
    if (expr === "!output") return output.length === 0;

    let m: RegExpMatchArray | null;

    m = expr.match(/^output\.includes\(['"](.+)['"]\)$/);
    if (m) return output.includes(m[1]);

    m = expr.match(/^!output\.includes\(['"](.+)['"]\)$/);
    if (m) return !output.includes(m[1]);

    m = expr.match(/^output\.startsWith\(['"](.+)['"]\)$/);
    if (m) return output.startsWith(m[1]);

    m = expr.match(/^output\.endsWith\(['"](.+)['"]\)$/);
    if (m) return output.endsWith(m[1]);

    m = expr.match(/^output\.length\s*(>|>=|<|<=|===?|!==?)\s*(\d+)$/);
    if (m) {
      const n = parseInt(m[2], 10);
      if (m[1] === ">" ) return output.length >  n;
      if (m[1] === ">=") return output.length >= n;
      if (m[1] === "<" ) return output.length <  n;
      if (m[1] === "<=") return output.length <= n;
      return output.length === n;
    }

    m = expr.match(/^output\s*(===?|!==?)\s*['"](.*)['"]$/);
    if (m) return m[1].startsWith("!") ? output !== m[2] : output === m[2];

    return false;
  } catch {
    return false;
  }
}

// ─── Route Handler ────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const rl = await checkRateLimit(requestKey(req, "workflow"), LIMITS.workflow);
    if (!rl.allowed) return err("Too many requests — slow down", 429, "RATE_LIMITED");
  } catch {
    // Redis unavailable — continue
  }

  let parsedBody: ExecuteRequestBody;
  try {
    const raw = await req.json();
    parsedBody = ExecuteBodySchema.parse(raw) as ExecuteRequestBody;
  } catch (e) {
    if (e instanceof ZodError) return validationError(e);
    return handleRouteError(e);
  }

  const { workflow, agents, triggerInput, apiKey, model, agentId } = parsedBody as ExecuteRequestBody & { agentId?: string };

  let sharedCtxBlock = "";
  if (agentId) {
    try {
      const snapshot = await buildAgentContext({ agentId, includeShared: true });
      sharedCtxBlock = formatContextBlock(snapshot);
    } catch {
      // Non-fatal
    }
  }

  const client = new Anthropic({ apiKey });
  const encoder = new TextEncoder();
  const effectiveModel = model ?? "claude-sonnet-4-6";

  const readable = new ReadableStream({
    async start(controller) {
      const send = (event: SSEEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      const workflowStart = Date.now();

      // Context accumulates outputs keyed by node id
      const context: Record<string, unknown> = {
        triggerInput,
        input: triggerInput,
      };
      let lastOutput = triggerInput;

      try {
        const sorted = topoSort(workflow.nodes, workflow.edges);

        for (const node of sorted) {
          const nodeStart = Date.now();

          send({ type: "node_start", nodeId: node.id, nodeLabel: node.label });

          try {
            let output = "";

            switch (node.type) {
              case "trigger": {
                output = triggerInput;
                break;
              }

              case "agent": {
                // Find matching agent by config.agentId or first agent
                const targetAgent =
                  agents.find((a) => a.id === (node.config.agentId as string)) ?? agents[0];

                const nodePrompt =
                  typeof node.config.prompt === "string" && node.config.prompt.trim()
                    ? node.config.prompt
                    : node.label;

                const baseSystem = targetAgent?.systemPrompt ?? "Eres un asistente útil.";
                const systemPrompt = sharedCtxBlock
                  ? `${baseSystem}\n\n${sharedCtxBlock}`
                  : baseSystem;
                const userContent = [
                  lastOutput ? `Contexto previo:\n${lastOutput}` : "",
                  `Tarea: ${nodePrompt}`,
                ]
                  .filter(Boolean)
                  .join("\n\n");

                const message = await client.messages.create({
                  model: effectiveModel,
                  max_tokens: 2048,
                  system: systemPrompt,
                  messages: [{ role: "user", content: userContent }],
                });

                output =
                  message.content
                    .filter((b) => b.type === "text")
                    .map((b) => (b as { type: "text"; text: string }).text)
                    .join("") ?? "";
                break;
              }

              case "condition": {
                const expression =
                  typeof node.config.expression === "string"
                    ? node.config.expression
                    : "true";
                const passed = evaluateCondition(expression, { ...context, lastOutput });
                output = passed ? lastOutput : "";
                if (!passed) {
                  send({ type: "node_output", nodeId: node.id, output: "[condición no cumplida — rama omitida]" });
                  send({ type: "node_done", nodeId: node.id, durationMs: Date.now() - nodeStart });
                  continue;
                }
                break;
              }

              case "action": {
                const actionType = (node.config.action as string) ?? "passthrough";
                switch (actionType) {
                  case "summarize": {
                    const summaryMsg = await client.messages.create({
                      model: effectiveModel,
                      max_tokens: 512,
                      messages: [
                        {
                          role: "user",
                          content: `Resume el siguiente texto en 2-3 frases concisas:\n\n${lastOutput}`,
                        },
                      ],
                    });
                    output =
                      summaryMsg.content
                        .filter((b) => b.type === "text")
                        .map((b) => (b as { type: "text"; text: string }).text)
                        .join("") ?? lastOutput;
                    break;
                  }
                  case "format": {
                    const template = (node.config.template as string) ?? "{output}";
                    output = template.replace("{output}", lastOutput).replace("{input}", triggerInput);
                    break;
                  }
                  default: {
                    output = lastOutput;
                  }
                }
                break;
              }

              case "output": {
                // Final output node — collect and format
                const template = (node.config.template as string) ?? "{output}";
                output = template
                  .replace("{output}", lastOutput)
                  .replace("{input}", triggerInput);
                break;
              }

              default: {
                output = lastOutput;
              }
            }

            // Update context
            context[node.id] = output;
            context.lastOutput = output;
            if (output) lastOutput = output;

            send({ type: "node_output", nodeId: node.id, output });
            send({ type: "node_done", nodeId: node.id, durationMs: Date.now() - nodeStart });
          } catch (nodeErr: unknown) {
            const errMsg = nodeErr instanceof Error ? nodeErr.message : "Error desconocido en nodo";
            send({ type: "node_error", nodeId: node.id, error: errMsg });
            send({ type: "node_done", nodeId: node.id, durationMs: Date.now() - nodeStart });
            // Continue to next node rather than aborting the whole workflow
          }
        }

        send({
          type: "workflow_done",
          totalDurationMs: Date.now() - workflowStart,
          finalOutput: lastOutput,
        });
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : "Error en la ejecución del workflow";
        send({ type: "node_error", nodeId: "workflow", error: errMsg });
        send({
          type: "workflow_done",
          totalDurationMs: Date.now() - workflowStart,
          finalOutput: "",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
