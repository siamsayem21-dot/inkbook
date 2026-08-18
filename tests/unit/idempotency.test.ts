import { describe, it, expect, vi } from "vitest";
import { withIdempotency } from "@/lib/idempotency";

describe("withIdempotency", () => {
  it("runs fn on the first call for a key", async () => {
    const fn = vi.fn(() => Promise.resolve({ id: "1" }));
    const result = await withIdempotency(`key-${Math.random()}`, fn);
    expect(result).toEqual({ id: "1" });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("returns the cached result on a repeat call with the same key, without re-running fn", async () => {
    const key = `key-${Math.random()}`;
    const fn = vi.fn(() => Promise.resolve({ id: "first-call" }));
    const first = await withIdempotency(key, fn);
    const second = await withIdempotency(key, fn);
    expect(first).toEqual({ id: "first-call" });
    expect(second).toEqual({ id: "first-call" }); // same cached result, not a fresh call
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("runs fn independently for different keys", async () => {
    const fn = vi.fn((): Promise<{ id: string }> => Promise.resolve({ id: "x" }));
    await withIdempotency(`key-a-${Math.random()}`, fn);
    await withIdempotency(`key-b-${Math.random()}`, fn);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("re-runs fn after the TTL expires", async () => {
    const key = `key-${Math.random()}`;
    const fn = vi.fn(() => Promise.resolve({ id: "x" }));
    await withIdempotency(key, fn, { ttlMs: 1 });
    await new Promise((r) => setTimeout(r, 10));
    await withIdempotency(key, fn, { ttlMs: 1 });
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("does not cache a result excluded by shouldCache, allowing an immediate retry", async () => {
    const key = `key-${Math.random()}`;
    const fn = vi.fn(() => Promise.resolve({ error: "transient failure" }));
    await withIdempotency(key, fn, { shouldCache: (r) => !r.error });
    await withIdempotency(key, fn, { shouldCache: (r) => !r.error });
    expect(fn).toHaveBeenCalledTimes(2); // both ran — failure was never cached
  });

  // Regression test for a real bug found via live testing (2026-08-19): two
  // genuinely CONCURRENT calls (not sequential — both start before either
  // finishes) both saw "nothing cached yet" under the old implementation
  // and both ran `fn`, creating two real Stripe Checkout Sessions from a
  // single double-click. Sequential-only tests above never exercised this.
  it("runs fn only ONCE for truly concurrent calls with the same key (not just sequential repeats)", async () => {
    const key = `key-${Math.random()}`;
    let callCount = 0;
    const fn = vi.fn(async () => {
      callCount++;
      // Simulate real async work (e.g. a Stripe API round trip) so both
      // concurrent calls are genuinely in-flight at the same time, not
      // resolved synchronously before the second call starts.
      await new Promise((r) => setTimeout(r, 20));
      return { id: "concurrent-result", callNumber: callCount };
    });

    const [a, b] = await Promise.all([
      withIdempotency(key, fn),
      withIdempotency(key, fn),
    ]);

    expect(fn).toHaveBeenCalledTimes(1); // only one real invocation, not two
    expect(a).toBe(b); // both callers received the exact same result
  });

  it("runs fn independently for concurrent calls with DIFFERENT keys (concurrency guard doesn't over-block)", async () => {
    const fn = vi.fn(async () => {
      await new Promise((r) => setTimeout(r, 10));
      return { id: "x" };
    });
    await Promise.all([
      withIdempotency(`key-a-${Math.random()}`, fn),
      withIdempotency(`key-b-${Math.random()}`, fn),
    ]);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("removes the entry on a thrown error so an immediate retry is never blocked", async () => {
    const key = `key-${Math.random()}`;
    let attempt = 0;
    const fn = vi.fn(async () => {
      attempt++;
      if (attempt === 1) throw new Error("transient");
      return { id: "second-attempt-succeeded" };
    });

    await expect(withIdempotency(key, fn)).rejects.toThrow("transient");
    const result = await withIdempotency(key, fn);
    expect(result).toEqual({ id: "second-attempt-succeeded" });
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
