import { createClient, RedisClientType } from "redis";

type RedisClient = RedisClientType<any, any, any>;

declare global {
  var __redis: RedisClient | undefined;
  var __redisSub: RedisClient | undefined;
}

function createRedisClient(): RedisClient {
  const url = process.env.REDIS_URL ?? "redis://localhost:6379";
  const client = createClient({ url }) as RedisClient;

  client.on("error", (err: Error) => {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[redis] connection error (non-fatal in dev):", err.message);
    }
  });

  return client;
}

async function ensureConnected(client: RedisClient): Promise<void> {
  if (!client.isOpen) {
    await client.connect();
  }
}

// Singleton publisher client
export async function getRedis(): Promise<RedisClient> {
  const client = globalThis.__redis ?? createRedisClient();
  if (process.env.NODE_ENV !== "production") {
    globalThis.__redis = client;
  }
  await ensureConnected(client);
  return client;
}

// Separate subscriber client (subscribe() requires dedicated connection)
export async function getSubscriber(): Promise<RedisClient> {
  const client = globalThis.__redisSub ?? createRedisClient();
  if (process.env.NODE_ENV !== "production") {
    globalThis.__redisSub = client;
  }
  await ensureConnected(client);
  return client;
}

// Cache helpers
export const cache = {
  async get<T>(key: string): Promise<T | null> {
    try {
      const redis = await getRedis();
      const raw = await redis.get(key);
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },

  async set<T>(key: string, value: T, ttlSeconds = 300): Promise<void> {
    try {
      const redis = await getRedis();
      await redis.set(key, JSON.stringify(value), { EX: ttlSeconds });
    } catch {
      // Non-fatal: cache miss on next read
    }
  },

  async del(key: string): Promise<void> {
    try {
      const redis = await getRedis();
      await redis.del(key);
    } catch {
      // Non-fatal
    }
  },

  async invalidatePrefix(prefix: string): Promise<void> {
    try {
      const redis = await getRedis();
      const keys = await redis.keys(`${prefix}*`);
      if (keys.length > 0) {
        await redis.del(keys);
      }
    } catch {
      // Non-fatal
    }
  },
};

// Pub/sub helpers
export async function publish(channel: string, payload: unknown): Promise<void> {
  try {
    const redis = await getRedis();
    await redis.publish(channel, JSON.stringify(payload));
  } catch {
    // Non-fatal: subscribers miss event, not a data-loss issue
  }
}

export async function subscribe(
  channel: string,
  handler: (payload: unknown) => void
): Promise<() => Promise<void>> {
  const sub = await getSubscriber();
  await sub.subscribe(channel, (message: string) => {
    try {
      handler(JSON.parse(message));
    } catch {
      // Malformed message — skip
    }
  });

  return async () => {
    await sub.unsubscribe(channel);
  };
}

// Channel name constants
export const CHANNELS = {
  agentMemoryWrite: (agentId: string) => `agent:memory:${agentId}`,
  sharedContext: "team:shared-context",
  agentMessage: (toAgentId: string) => `agent:msg:${toAgentId}`,
  taskLog: "team:task-log",
} as const;
