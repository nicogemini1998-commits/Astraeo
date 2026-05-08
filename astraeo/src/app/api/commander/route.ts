import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";
import { z, ZodError } from "zod";
import { checkRateLimit, LIMITS, requestKey } from "@/lib/rate-limit";
import { ok, err, validationError, handleRouteError } from "@/lib/errors";
import { buildAgentContext, formatContextBlock } from "@/lib/agent-context";

const CommanderBodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.union([z.string(), z.array(z.unknown())]),
      })
    )
    .min(1)
    .max(100),
  systemPrompt: z.string().max(16_000).default("Eres un agente de IA."),
  tools: z.array(z.unknown()).max(64).default([]),
  model: z.string().max(64).optional(),
  apiKey: z.string().min(10).max(256),
  agentId: z.string().cuid().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const rl = await checkRateLimit(requestKey(req, "commander"), LIMITS.commander);
    if (!rl.allowed) return err("Too many requests — slow down", 429, "RATE_LIMITED");

    const body = CommanderBodySchema.parse(await req.json());
    const { messages, systemPrompt, tools, model, apiKey, agentId } = body;

    let enrichedSystem = systemPrompt;
    if (agentId) {
      const snapshot = await buildAgentContext({ agentId });
      const ctxBlock = formatContextBlock(snapshot);
      if (ctxBlock) enrichedSystem = `${systemPrompt}\n\n${ctxBlock}`;
    }

    const client = new Anthropic({ apiKey });

    const response = await client.messages.create({
      model: model ?? "claude-sonnet-4-6",
      max_tokens: 4096,
      system: enrichedSystem,
      tools: tools as Anthropic.Tool[],
      messages: messages as Anthropic.MessageParam[],
    });

    return ok({
      content: response.content,
      stop_reason: response.stop_reason,
      usage: response.usage,
    });
  } catch (e) {
    if (e instanceof ZodError) return validationError(e);
    return handleRouteError(e);
  }
}
