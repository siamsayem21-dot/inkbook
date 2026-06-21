// Sliding window rate limiter — in-process, no external dependency.
//
// Works within a single Vercel serverless function instance (Node.js runtime).
// State persists for the lifetime of a warm instance (~5–10 min idle TTL).
// Each Vercel instance enforces limits independently; limits are not shared
// across concurrent instances. This is sufficient protection against scripted
// single-IP abuse at pre-beta scale.
//
// UPGRADE PATH: Replace `store` with @upstash/redis + @upstash/ratelimit
// (UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN env vars) for true
// distributed, cross-instance rate limiting before high-traffic launch.

type Entry = { timestamps: number[] };

// Module-level store — persists across requests within a warm Lambda instance.
const store = new Map<string, Entry>();

// Probabilistic cleanup runs on ~1% of requests to evict fully-expired entries.
function maybeEvict(windowMs: number): void {
  if (Math.random() > 0.01) return;
  const cutoff = Date.now() - windowMs;
  store.forEach((entry, key) => {
    if (entry.timestamps.every((t: number) => t < cutoff)) store.delete(key);
  });
}

export type RateLimitResult =
  | { allowed: true;  remaining: number; retryAfter: 0 }
  | { allowed: false; remaining: 0;     retryAfter: number };

/**
 * Check whether `identifier` (typically an IP address) is within the
 * allowed request budget for the current sliding window.
 *
 * @param identifier  Client IP or other unique key
 * @param maxRequests Maximum requests allowed within `windowMs`
 * @param windowMs    Window length in milliseconds (default 60 000 = 1 min)
 */
export function checkRateLimit(
  identifier: string,
  maxRequests: number,
  windowMs = 60_000
): RateLimitResult {
  const now = Date.now();
  const cutoff = now - windowMs;

  const entry = store.get(identifier) ?? { timestamps: [] };
  // Drop timestamps outside the current window
  entry.timestamps = entry.timestamps.filter((t) => t >= cutoff);

  if (entry.timestamps.length >= maxRequests) {
    // Time until the oldest request in the window expires
    const retryAfter = Math.ceil((entry.timestamps[0] + windowMs - now) / 1000);
    store.set(identifier, entry);
    maybeEvict(windowMs);
    return { allowed: false, remaining: 0, retryAfter };
  }

  entry.timestamps.push(now);
  store.set(identifier, entry);
  maybeEvict(windowMs);

  return {
    allowed: true,
    remaining: maxRequests - entry.timestamps.length,
    retryAfter: 0,
  };
}

/**
 * Extract the client IP from a Next.js Request object.
 * Vercel injects x-forwarded-for; falls back to x-real-ip then "unknown".
 */
export function getClientIp(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

/**
 * Build a standardised 429 Response with Retry-After and rate-limit headers.
 */
export function rateLimitedResponse(retryAfter: number): Response {
  return Response.json(
    { error: "Too many requests. Please slow down and try again shortly." },
    {
      status: 429,
      headers: {
        "Retry-After":          String(retryAfter),
        "X-RateLimit-Limit":    "20",
        "X-RateLimit-Remaining": "0",
      },
    }
  );
}
