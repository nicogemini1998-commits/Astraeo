import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";

interface ChatRequestBody {
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  systemPrompt: string;
  model?: string;
  apiKey: string;
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as ChatRequestBody;
  const { messages, systemPrompt, model, apiKey } = body;

  if (!apiKey) {
    return Response.json({ error: "API key requerida" }, { status: 401 });
  }

  const client = new Anthropic({ apiKey });
  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      try {
        const stream = client.messages.stream({
          model: model ?? "claude-sonnet-4-6",
          max_tokens: 4096,
          system: systemPrompt,
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
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Error desconocido";
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
}
