import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { CHANNELS, publish } from "@/lib/redis";
import { ok, err, validationError, handleRouteError } from "@/lib/errors";
import { parseBody, SharedContextWriteSchema } from "@/lib/validate";
import { checkRateLimit, LIMITS, requestKey } from "@/lib/rate-limit";
import { ZodError } from "zod";

// GET /api/memory/shared
export async function GET(req: NextRequest) {
  try {
    const rl = await checkRateLimit(requestKey(req, "memory"), LIMITS.memory);
    if (!rl.allowed) return err("Too many requests", 429, "RATE_LIMITED");

    const entries = await db.sharedContext.findMany({
      where: { OR: [{ ttlAt: null }, { ttlAt: { gt: new Date() } }] },
      orderBy: { updatedAt: "desc" },
    });
    return ok(entries);
  } catch (e) {
    return handleRouteError(e);
  }
}

// POST /api/memory/shared
export async function POST(req: NextRequest) {
  try {
    const rl = await checkRateLimit(requestKey(req, "memory"), LIMITS.memory);
    if (!rl.allowed) return err("Too many requests", 429, "RATE_LIMITED");

    const body = await parseBody(req, SharedContextWriteSchema);
    const { key, value, writtenBy, ttlSeconds } = body;

    const ttlAt = ttlSeconds ? new Date(Date.now() + ttlSeconds * 1000) : null;

    const entry = await db.sharedContext.upsert({
      where: { key },
      update: { value: value as never, writtenBy, ttlAt, updatedAt: new Date() },
      create: { key, value: value as never, writtenBy, ttlAt },
    });

    await publish(CHANNELS.sharedContext, { key, value, writtenBy });

    return ok(entry, undefined, 201);
  } catch (e) {
    if (e instanceof ZodError) return validationError(e);
    return handleRouteError(e);
  }
}
