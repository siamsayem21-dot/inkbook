// In-process, single-instance duplicate-submission guard — same
// architecture and same acknowledged limitation as lib/rate-limit.ts
// (state doesn't survive a cold start or cross multiple warm serverless
// instances). Sufficient for the case this protects against: a client's
// browser retrying a flaky POST within seconds, not a distributed replay
// attack. No schema/migration needed.
//
// UPGRADE PATH: same as lib/rate-limit.ts — move to @upstash/redis before
// high-traffic launch if stronger cross-instance guarantees are needed.

// Caches the IN-FLIGHT PROMISE itself, set into the map synchronously
// before any `await` — not just the resolved value. This closes a real
// concurrency bug found via live testing: caching only the resolved value
// leaves a check-then-write race window where two genuinely concurrent
// calls (e.g. a real double-click firing two overlapping fetches a few ms
// apart, not a sequential retry) can both see "nothing cached yet" and
// both run `fn()`, defeating the whole guard. Storing the promise
// synchronously means the second call finds it immediately — there is no
// `await` between the map lookup and the map write for it to race through.
type Entry<T> = { promise: Promise<T>; expiresAt: number | null }; // null while pending
const store = new Map<string, Entry<unknown>>();

const DEFAULT_TTL_MS = 30_000;

// Probabilistic cleanup, mirroring lib/rate-limit.ts's maybeEvict. Never
// evicts a pending (expiresAt: null) entry — only settled ones past TTL.
function maybeEvict(): void {
  if (Math.random() > 0.01) return;
  const now = Date.now();
  store.forEach((entry, key) => {
    if (entry.expiresAt !== null && entry.expiresAt < now) store.delete(key);
  });
}

/**
 * Runs `fn()` once per `key` within `ttlMs`; a repeated call with the same
 * key inside that window — whether sequential (a retried request after the
 * first finished) or truly concurrent (two overlapping in-flight requests)
 * — receives the same result instead of `fn` running twice. E.g. prevents
 * a double-clicked "Pay Deposit" button from creating two real Stripe
 * Checkout Sessions.
 *
 * Only caches results for which `shouldCache(result)` is true (default:
 * always cache) — callers doing something like a create-then-return-{error}
 * pattern should pass a predicate that excludes error results, so a
 * genuinely failed attempt can be retried immediately rather than replaying
 * the same failure for the rest of the TTL window. A thrown exception is
 * never cached either way — the entry is removed so the next call can
 * retry from scratch.
 */
export async function withIdempotency<T>(
  key: string,
  fn: () => Promise<T>,
  options?: { ttlMs?: number; shouldCache?: (result: T) => boolean }
): Promise<T> {
  const ttlMs = options?.ttlMs ?? DEFAULT_TTL_MS;
  const shouldCache = options?.shouldCache ?? (() => true);

  const now = Date.now();
  const existing = store.get(key) as Entry<T> | undefined;
  if (existing && (existing.expiresAt === null || existing.expiresAt > now)) {
    return existing.promise;
  }

  const promise = fn();
  // Set BEFORE awaiting — this is the synchronous step that closes the
  // race. Any concurrent call arriving before `promise` settles will hit
  // the `existing` branch above instead of calling `fn()` again.
  store.set(key, { promise, expiresAt: null });

  try {
    const result = await promise;
    if (shouldCache(result)) {
      store.set(key, { promise, expiresAt: Date.now() + ttlMs });
    } else {
      store.delete(key);
    }
    maybeEvict();
    return result;
  } catch (err) {
    store.delete(key); // never cache a thrown error — allow an immediate retry
    throw err;
  }
}
