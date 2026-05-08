import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { CHANNELS, publish } from "@/lib/redis";
import { ok, err, validationError, handleRouteError } from "@/lib/errors";
import { parseBody, AgentMessageSchema } from "@/lib/validate";
import { checkRateLimit, LIMITS, requestKey } from "@/lib/rate-limit";
import { invalidateAgentContext } from "@/lib/agent-context";
import { z, ZodError } from "zod";

const QuerySchema = z.object({
  toAgent: z.string().cuid(),
  unreadOnly: z.string().optional().transform((v) => v === "true"),
  limit: z.string().optional().transform((v) => Math.min(100, parseInt(v ?? "50", 10))),
});

// GET /api/memory/messages?toAgent=...
export async function GET(req: NextRequest) {
  try {
    const rl = await checkRateLimit(requestKey(req, "memory"), LIMITS.memory);
    if (!rl.allowed) return err("Too many requests", 429, "RATE_LIMITED");

    const params = Object.fromEntries(req.nextUrl.searchParams.entries());
    const { toAgent, unreadOnly, limit } = QuerySchema.parse(params);

    const messages = await db.agentMessage.findMany({
      where: { toAgent, ...(unreadOnly ? { read: false } : {}) },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    // Mark returned messages as read
    if (messages.length > 0) {
      await db.agentMessage.updateMany({
        where: { id: { in: messages.map((m) => m.id) } },
        data: { read: true },
      });
    }

    return ok(messages);
  } catch (e) {
    if (e instanceof ZodError) return validationError(e);
    return handleRouteError(e);
  }
}

// POST /api/memory/messages
export async function POST(req: NextRequest) {
  try {
    const rl = await checkRateLimit(requestKey(req, "memory"), LIMITS.memory);
    if (!rl.allowed) return err("Too many requests", 429, "RATE_LIMITED");

    const body = await parseBody(req, AgentMessageSchema);
    const { fromAgent, toAgent, channel, content } = body;

    const message = await db.agentMessage.create({
      data: { fromAgent, toAgent, channel, content: content as never },
    });

    await Promise.all([
      invalidateAgentContext(toAgent),
      publish(CHANNELS.agentMessage(toAgent), { fromAgent, channel, content }),
    ]);

    return ok(message, undefined, 201);
  } catch (e) {
    if (e instanceof ZodError) return validationError(e);
    return handleRouteError(e);
  }
}
