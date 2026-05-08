import { db } from "./db";
import { cache } from "./redis";

const CACHE_TTL = 30; // seconds

interface AgentContextOptions {
  agentId: string;
  includeShared?: boolean;
  maxMemoryKeys?: number;
  maxMessages?: number;
  maxTaskLog?: number;
}

interface MemorySnapshot {
  privateMemory: Record<string, unknown>;
  sharedContext: Record<string, unknown>;
  recentMessages: Array<{
    from: string;
    channel: string;
    content: unknown;
    at: string;
  }>;
  recentTasks: Array<{
    description: string;
    status: string;
    hash: string;
  }>;
}

export async function buildAgentContext(opts: AgentContextOptions): Promise<MemorySnapshot> {
  const {
    agentId,
    includeShared = true,
    maxMemoryKeys = 50,
    maxMessages = 20,
    maxTaskLog = 10,
  } = opts;

  const cacheKey = `agent-ctx:${agentId}`;
  const cached = await cache.get<MemorySnapshot>(cacheKey);
  if (cached) return cached;

  const [privateRows, sharedRows, messages, tasks] = await Promise.all([
    db.agentMemory.findMany({
      where: {
        agentId,
        OR: [{ ttlAt: null }, { ttlAt: { gt: new Date() } }],
      },
      orderBy: { updatedAt: "desc" },
      take: maxMemoryKeys,
      select: { key: true, value: true },
    }),

    includeShared
      ? db.sharedContext.findMany({
          where: { OR: [{ ttlAt: null }, { ttlAt: { gt: new Date() } }] },
          orderBy: { updatedAt: "desc" },
          take: 30,
          select: { key: true, value: true },
        })
      : [],

    db.agentMessage.findMany({
      where: { toAgent: agentId },
      orderBy: { createdAt: "desc" },
      take: maxMessages,
      select: { fromAgent: true, channel: true, content: true, createdAt: true },
    }),

    db.taskLog.findMany({
      where: { agentId },
      orderBy: { startedAt: "desc" },
      take: maxTaskLog,
      select: { description: true, status: true, taskHash: true },
    }),
  ]);

  const snapshot: MemorySnapshot = {
    privateMemory: Object.fromEntries(
      privateRows.map((r) => [r.key, r.value])
    ),
    sharedContext: Object.fromEntries(
      sharedRows.map((r) => [r.key, r.value])
    ),
    recentMessages: messages.map((m) => ({
      from: m.fromAgent,
      channel: m.channel,
      content: m.content,
      at: m.createdAt.toISOString(),
    })),
    recentTasks: tasks.map((t) => ({
      description: t.description,
      status: t.status,
      hash: t.taskHash,
    })),
  };

  await cache.set(cacheKey, snapshot, CACHE_TTL);
  return snapshot;
}

export function formatContextBlock(snapshot: MemorySnapshot): string {
  const parts: string[] = [];

  if (Object.keys(snapshot.privateMemory).length > 0) {
    parts.push(
      "## Your private memory\n" +
      JSON.stringify(snapshot.privateMemory, null, 2)
    );
  }

  if (Object.keys(snapshot.sharedContext).length > 0) {
    parts.push(
      "## Shared team context\n" +
      JSON.stringify(snapshot.sharedContext, null, 2)
    );
  }

  if (snapshot.recentMessages.length > 0) {
    const lines = snapshot.recentMessages.map(
      (m) => `  [${m.channel}] from ${m.from}: ${JSON.stringify(m.content)}`
    );
    parts.push("## Messages received\n" + lines.join("\n"));
  }

  if (snapshot.recentTasks.length > 0) {
    const lines = snapshot.recentTasks.map(
      (t) => `  [${t.status}] ${t.description}`
    );
    parts.push(
      "## Recent tasks (do NOT repeat tasks marked done)\n" + lines.join("\n")
    );
  }

  if (parts.length === 0) return "";

  return [
    "---",
    "# Agent context (injected automatically)",
    ...parts,
    "---",
  ].join("\n\n");
}

/** Invalidate cached context when memory changes */
export async function invalidateAgentContext(agentId: string): Promise<void> {
  const { cache: c } = await import("./redis");
  await c.del(`agent-ctx:${agentId}`);
}
