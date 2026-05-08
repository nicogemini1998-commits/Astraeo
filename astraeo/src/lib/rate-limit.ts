import { getRedis } from "./redis";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number; // unix ms
}

interface TokenBucketOptions {
  /** Max tokens (burst capacity) */
  capacity: number;
  /** Tokens added per second */
  refillRate: number;
  /** How long to track the bucket in Redis (seconds) */
  windowSeconds?: number;
}

/**
 * Token bucket rate limiter backed by Redis.
 * Uses a single atomic Lua script to avoid race conditions.
 */
export async function checkRateLimit(
  key: string,
  opts: TokenBucketOptions
): Promise<RateLimitResult> {
  const { capacity, refillRate, windowSeconds = 60 } = opts;
  const now = Date.now();

  // Lua script: atomic token-bucket refill + consume
  const script = `
    local key        = KEYS[1]
    local capacity   = tonumber(ARGV[1])
    local refill     = tonumber(ARGV[2])
    local now        = tonumber(ARGV[3])
    local window     = tonumber(ARGV[4])

    local data = redis.call("HMGET", key, "tokens", "ts")
    local tokens = tonumber(data[1]) or capacity
    local ts     = tonumber(data[2]) or now

    -- Refill tokens based on elapsed time (in seconds)
    local elapsed = math.max(0, (now - ts) / 1000)
    tokens = math.min(capacity, tokens + elapsed * refill)

    local allowed = 0
    if tokens >= 1 then
      tokens  = tokens - 1
      allowed = 1
    end

    redis.call("HMSET", key, "tokens", tokens, "ts", now)
    redis.call("EXPIRE", key, window)

    -- Return: allowed, remaining (floor), resetAt ms
    local refillMs = math.ceil((1 - tokens) / refill * 1000)
    return { allowed, math.floor(tokens), now + math.max(0, refillMs) }
  `;

  try {
    const redis = await getRedis();
    const result = await redis.eval(script, {
      keys: [`rl:${key}`],
      arguments: [
        String(capacity),
        String(refillRate),
        String(now),
        String(windowSeconds),
      ],
    }) as [number, number, number];

    return {
      allowed: result[0] === 1,
      remaining: result[1],
      resetAt: result[2],
    };
  } catch {
    // Redis unavailable → fail open (don't block requests)
    return { allowed: true, remaining: capacity, resetAt: now + windowSeconds * 1000 };
  }
}

// Preset limits for common surfaces
export const LIMITS = {
  chat:       { capacity: 20, refillRate: 1 },     // 20 burst, 1/s
  commander:  { capacity: 10, refillRate: 0.5 },   // 10 burst, 1 per 2s
  memory:     { capacity: 60, refillRate: 5 },     // 60 burst, 5/s
  workflow:   { capacity: 5,  refillRate: 0.1 },   // 5 burst, 1 per 10s
  default:    { capacity: 30, refillRate: 2 },
} as const satisfies Record<string, TokenBucketOptions>;

/** Extract a stable identifier from a Next.js request for rate limit keying */
export function requestKey(req: Request, surface: string): string {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";
  return `${surface}:${ip}`;
}
