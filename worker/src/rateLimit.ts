import type { Context, MiddlewareHandler } from "hono";

// Global per-IP request throttle applied as Hono middleware.
//
// Backed by KV with a fixed time-window counter. KV read-then-write is NOT
// atomic and is eventually consistent, so under heavy concurrency from a single
// IP the effective limit is approximate (it can be overshot). That is an
// acceptable trade-off for coarse abuse/cost protection at the edge; for a hard,
// exact limit use a Durable Object instead. The limiter also fails OPEN: if KV
// is unavailable we allow the request rather than 500 the whole API.

export const DEFAULT_RATE_LIMIT = 100;
export const DEFAULT_WINDOW_SECONDS = 60;
// KV enforces a 60s minimum TTL, so windows shorter than that still persist for
// 60s (the bucket math below is what actually bounds the window).
const MIN_KV_TTL_SECONDS = 60;

export interface RateLimitOptions {
  limit?: number;
  windowSeconds?: number;
  prefix?: string;
  /** Return true to bypass the limiter for a given request (e.g. health checks). */
  skip?: (c: Context) => boolean;
}

type RateLimitEnv = { Bindings: { SESSIONS: KVNamespace } };

export function getClientIp(c: Context): string {
  // Cloudflare sets CF-Connecting-IP to the real client IP and it cannot be
  // spoofed by the client (edge-populated). X-Forwarded-For is a best-effort
  // fallback for non-CF/local environments.
  const cfIp = c.req.header("CF-Connecting-IP");
  if (cfIp) return cfIp.trim();
  const xff = c.req.header("X-Forwarded-For");
  if (xff) return xff.split(",")[0].trim();
  return "unknown";
}

export function rateLimit(
  options: RateLimitOptions = {}
): MiddlewareHandler<RateLimitEnv> {
  const limit = options.limit ?? DEFAULT_RATE_LIMIT;
  const windowSeconds = options.windowSeconds ?? DEFAULT_WINDOW_SECONDS;
  const prefix = options.prefix ?? "rl";
  const skip = options.skip;

  return async (c, next) => {
    if (skip?.(c)) return next();

    const kv = c.env.SESSIONS;
    const ip = getClientIp(c);
    const nowSec = Math.floor(Date.now() / 1000);
    const bucket = Math.floor(nowSec / windowSeconds);
    const key = `${prefix}:${ip}:${bucket}`;

    let current = 0;
    try {
      current = Number((await kv.get(key)) ?? "0") || 0;
    } catch {
      // KV read failed — fail open so a limiter outage doesn't break the API.
      return next();
    }

    if (current >= limit) {
      const retryAfter = windowSeconds - (nowSec % windowSeconds);
      c.header("Retry-After", String(retryAfter));
      return c.json({ error: "Too many requests" }, 429);
    }

    try {
      await kv.put(key, String(current + 1), {
        expirationTtl: Math.max(MIN_KV_TTL_SECONDS, windowSeconds),
      });
    } catch {
      // KV write failed — allow the request; the counter just won't advance.
    }

    return next();
  };
}
