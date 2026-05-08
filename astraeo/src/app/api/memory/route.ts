import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { cache, CHANNELS, publish } from "@/lib/redis";
import { ok, err, validationError, handleRouteError, notFound } from "@/lib/errors";
import { parseBody, MemoryWriteSchema, MemoryReadSchema } from "@/lib/validate";
import { checkRateLimit, LIMITS, requestKey } from "@/lib/rate-limit";
import { invalidateAgentContext } from "@/lib/agent-context";
import { ZodError } from "zod";

// GET /api/memory?agentId=...&key=...
export async function GET(req: NextRequest) {
  try {
    const rl = await checkRateLimit(requestKey(req, "memory"), LIMITS.memory);
    if (!rl.allowed) return err("Too many requests", 429, "RATE_LIMITED");

    const params = Object.fromEntries(req.nextUrl.searchParams.entries());
    const { agentId, key } = MemoryReadSchema.parse(params);

    if (key) {
      const entry = await db.agentMemory.findUnique({
        where: { agentId_key: { agentId, key } },
      });
      if (!entry) return notFound("Memory key");
      if (entry.ttlAt && entry.ttlAt < new Date()) {
        await db.agentMemory.delete({ where: { agentId_key: { agentId, key } } });
        return notFound("Memory key");
      }
      return ok(entry);
    }

    const entries = await db.agentMemory.findMany({
      where: {
        agentId,
        OR: [{ ttlAt: null }, { ttlAt: { gt: new Date() } }],
      },
      orderBy: { updatedAt: "desc" },
    });
    return ok(entries);
  } catch (e) {
    if (e instanceof ZodError) return validationError(e);
    return handleRouteError(e);
  }
}

// POST /api/memory
export async function POST(req: NextRequest) {
  try {
    const rl = await checkRateLimit(requestKey(req, "memory"), LIMITS.memory);
    if (!rl.allowed) return err("Too many requests", 429, "RATE_LIMITED");

    const body = await parseBody(req, MemoryWriteSchema);
    const { agentId, key, value, ttlSeconds } = body;

    const ttlAt = ttlSeconds ? new Date(Date.now() + ttlSeconds * 1000) : null;

    const entry = await db.agentMemory.upsert({
      where: { agentId_key: { agentId, key } },
      update: { value: value as never, ttlAt, updatedAt: new Date() },
      create: { agentId, key, value: value as never, ttlAt },
    });

    // Invalidate cache + notify subscribers
    await Promise.all([
      invalidateAgentContext(agentId),
      cache.del(`agent-ctx:${agentId}`),
      publish(CHANNELS.agentMemoryWrite(agentId), { agentId, key, value }),
    ]);

    return ok(entry, undefined, 201);
  } catch (e) {
    if (e instanceof ZodError) return validationError(e);
    return handleRouteError(e);
  }
}

// DELETE /api/memory?agentId=...&key=...
export async function DELETE(req: NextRequest) {
  try {
    const params = Object.fromEntries(req.nextUrl.searchParams.entries());
    const { agentId, key } = MemoryReadSchema.parse({ ...params });

    if (!key) return err("key is required for DELETE", 400, "BAD_REQUEST");

    await db.agentMemory.delete({
      where: { agentId_key: { agentId, key } },
    });

    await invalidateAgentContext(agentId);
    return ok({ deleted: true });
  } catch (e) {
    if (e instanceof ZodError) return validationError(e);
    return handleRouteError(e);
  }
}
