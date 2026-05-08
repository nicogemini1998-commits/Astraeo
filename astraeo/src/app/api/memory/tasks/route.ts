import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { CHANNELS, publish } from "@/lib/redis";
import { ok, err, validationError, handleRouteError } from "@/lib/errors";
import { parseBody, TaskLogWriteSchema, TaskLogUpdateSchema } from "@/lib/validate";
import { checkRateLimit, LIMITS, requestKey } from "@/lib/rate-limit";
import { invalidateAgentContext } from "@/lib/agent-context";
import { z, ZodError } from "zod";

const QuerySchema = z.object({
  agentId: z.string().cuid(),
  status: z.enum(["pending", "running", "done", "failed"]).optional(),
  limit: z.string().optional().transform((v) => Math.min(100, parseInt(v ?? "20", 10))),
});

// GET /api/memory/tasks?agentId=...
export async function GET(req: NextRequest) {
  try {
    const params = Object.fromEntries(req.nextUrl.searchParams.entries());
    const { agentId, status, limit } = QuerySchema.parse(params);

    const tasks = await db.taskLog.findMany({
      where: { agentId, ...(status ? { status } : {}) },
      orderBy: { startedAt: "desc" },
      take: limit,
    });

    return ok(tasks);
  } catch (e) {
    if (e instanceof ZodError) return validationError(e);
    return handleRouteError(e);
  }
}

// POST /api/memory/tasks — create or no-op if duplicate (idempotent via taskHash)
export async function POST(req: NextRequest) {
  try {
    const rl = await checkRateLimit(requestKey(req, "memory"), LIMITS.memory);
    if (!rl.allowed) return err("Too many requests", 429, "RATE_LIMITED");

    const body = await parseBody(req, TaskLogWriteSchema);
    const { agentId, taskHash, description, status, result } = body;

    const existing = await db.taskLog.findUnique({
      where: { agentId_taskHash: { agentId, taskHash } },
    });

    if (existing) {
      return ok({ ...existing, duplicate: true });
    }

    const task = await db.taskLog.create({
      data: {
        agentId,
        taskHash,
        description,
        status,
        result: result ? (result as never) : undefined,
      },
    });

    await Promise.all([
      invalidateAgentContext(agentId),
      publish(CHANNELS.taskLog, { agentId, taskHash, description, status }),
    ]);

    return ok(task, undefined, 201);
  } catch (e) {
    if (e instanceof ZodError) return validationError(e);
    return handleRouteError(e);
  }
}

// PATCH /api/memory/tasks — update status/result
export async function PATCH(req: NextRequest) {
  try {
    const body = await parseBody(req, TaskLogUpdateSchema);
    const { id, status, result, finishedAt } = body;

    const task = await db.taskLog.update({
      where: { id },
      data: {
        status,
        result: result ? (result as never) : undefined,
        finishedAt: finishedAt ? new Date(finishedAt) : status === "done" || status === "failed" ? new Date() : undefined,
      },
    });

    await invalidateAgentContext(task.agentId);
    await publish(CHANNELS.taskLog, { agentId: task.agentId, taskHash: task.taskHash, status });

    return ok(task);
  } catch (e) {
    if (e instanceof ZodError) return validationError(e);
    return handleRouteError(e);
  }
}
