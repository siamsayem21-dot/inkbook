// In-process, single-instance duplicate-submission guard — same
// architecture and same acknowledged limitation as lib/rate-limit.ts
// (state doesn't survive a cold start or cross multiple warm serverless
// instances). Sufficient for the case this protects against: a client's
// browser retrying a flaky POST within seconds, not a distributed replay
// attack. No schema/migration needed.
//
// UPGRADE PATH: same as lib/rate-limit.ts — move to @upstash/redis before
// high-traffic launch if stronger cross-instance guarantees are needed.

type CachedResult<T> = { result: T; expiresAt: number };
const store = new Map<string, CachedResult<unknown>>();

const DEFAULT_TTL_MS = 30_000;

// Probabilistic cleanup, mirroring lib/rate-limit.ts's maybeEvict.
function maybeEvict(): void {
  if (Math.random() > 0.01) return;
  const now = Date.now();
  store.forEach((entry, key) => {
    if (entry.expiresAt < now) store.delete(key);
  });
}

/**
 * Runs `fn()` once per `key` within `ttlMs`; a repeated call with the same
 * key inside that window returns the cached result of the first call
 * instead of re-running `fn` — e.g. prevents a retried form submission
 * (flaky network, double form-resubmit) from inserting a duplicate row.
 *
 * Only caches results for which `shouldCache(result)` is true (default:
 * always cache) — callers doing something like a create-then-return-{error}
 * pattern should pass a predicate that excludes error results, so a
 * genuinely failed attempt can be retried immediately rather than replaying
 * the same failure for the rest of the TTL window.
 */
export async function withIdempotency<T>(
  key: string,
  fn: () => Promise<T>,
  options?: { ttlMs?: number; shouldCache?: (result: T) => boolean }
): Promise<T> {
  const ttlMs = options?.ttlMs ?? DEFAULT_TTL_MS;
  const shouldCache = options?.shouldCache ?? (() => true);

  const now = Date.now();
  const cached = store.get(key);
  if (cached && cached.expiresAt > now) {
    return cached.result as T;
  }

  const result = await fn();
  if (shouldCache(result)) {
    store.set(key, { result, expiresAt: now + ttlMs });
  }
  maybeEvict();
  return result;
}
