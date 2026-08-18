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
});
