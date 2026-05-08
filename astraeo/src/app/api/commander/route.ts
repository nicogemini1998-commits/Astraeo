import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";

interface CommanderRequestBody {
  messages: Array<{ role: "user" | "assistant"; content: unknown }>;
  systemPrompt: string;
  tools: Anthropic.Tool[];
  model?: string;
  apiKey: string;
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as CommanderRequestBody;
  const { messages, systemPrompt, tools, model, apiKey } = body;

  if (!apiKey) {
    return Response.json({ error: "API key requerida" }, { status: 401 });
  }

  try {
    const client = new Anthropic({ apiKey });

    const response = await client.messages.create({
      model: model ?? "claude-sonnet-4-6",
      max_tokens: 4096,
      system: systemPrompt,
      tools,
      messages: messages as Anthropic.MessageParam[],
    });

    return Response.json({
      content: response.content,
      stop_reason: response.stop_reason,
      usage: response.usage,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return Response.json({ error: message }, { status: 500 });
  }
}
