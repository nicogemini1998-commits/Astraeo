import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";
import { z, ZodError } from "zod";
import { checkRateLimit, LIMITS, requestKey } from "@/lib/rate-limit";
import { err, validationError, handleRouteError } from "@/lib/errors";
import { buildAgentContext, formatContextBlock } from "@/lib/agent-context";

const ChatBodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(32_000),
      })
    )
    .min(1)
    .max(100),
  systemPrompt: z.string().max(16_000).default("Eres un asistente útil."),
  model: z.string().max(64).optional(),
  apiKey: z.string().min(10).max(256),
  agentId: z.string().cuid().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const rl = await checkRateLimit(requestKey(req, "chat"), LIMITS.chat);
    if (!rl.allowed) return err("Too many requests — slow down", 429, "RATE_LIMITED");

    const body = ChatBodySchema.parse(await req.json());
    const { messages, systemPrompt, model, apiKey, agentId } = body;

    let enrichedSystem = systemPrompt;
    if (agentId) {
      const snapshot = await buildAgentContext({ agentId });
      const ctxBlock = formatContextBlock(snapshot);
      if (ctxBlock) enrichedSystem = `${systemPrompt}\n\n${ctxBlock}`;
    }

    const client = new Anthropic({ apiKey });
    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        try {
          const stream = client.messages.stream({
            model: model ?? "claude-sonnet-4-6",
            max_tokens: 4096,
            system: enrichedSystem,
            messages,
          });

          for await (const chunk of stream) {
            if (
              chunk.type === "content_block_delta" &&
              chunk.delta.type === "text_delta"
            ) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: "text", delta: chunk.delta.text })}\n\n`
                )
              );
            }
          }

          const finalMessage = await stream.finalMessage();
          const tokens = finalMessage.usage?.output_tokens ?? 0;
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "done", tokens })}\n\n`
            )
          );
          controller.close();
        } catch (streamErr: unknown) {
          const message =
            streamErr instanceof Error ? streamErr.message : "Stream error";
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "error", message })}\n\n`
            )
          );
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
  } catch (e) {
    if (e instanceof ZodError) return validationError(e);
    return handleRouteError(e);
  }
}
