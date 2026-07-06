import { describe, it, expect, beforeEach, vi } from "vitest";
import { checkRateLimit, getClientIp, rateLimitedResponse } from "@/lib/rate-limit";

describe("checkRateLimit", () => {
  it("allows requests under the limit and decrements remaining", () => {
    const id = `test-allow-${Math.random()}`;
    const r1 = checkRateLimit(id, 3, 60_000);
    const r2 = checkRateLimit(id, 3, 60_000);
    expect(r1.allowed).toBe(true);
    expect(r1.remaining).toBe(2);
    expect(r2.allowed).toBe(true);
    expect(r2.remaining).toBe(1);
  });

  it("blocks once the limit is reached within the window", () => {
    const id = `test-block-${Math.random()}`;
    checkRateLimit(id, 2, 60_000);
    checkRateLimit(id, 2, 60_000);
    const third = checkRateLimit(id, 2, 60_000);
    expect(third.allowed).toBe(false);
    expect(third.remaining).toBe(0);
    expect(third.retryAfter).toBeGreaterThan(0);
  });

  it("resets after the window elapses", () => {
    vi.useFakeTimers();
    try {
      const id = `test-reset-${Math.random()}`;
      checkRateLimit(id, 1, 1_000);
      const blocked = checkRateLimit(id, 1, 1_000);
      expect(blocked.allowed).toBe(false);

      vi.advanceTimersByTime(1_001);

      const afterWindow = checkRateLimit(id, 1, 1_000);
      expect(afterWindow.allowed).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it("tracks separate identifiers independently", () => {
    const idA = `test-a-${Math.random()}`;
    const idB = `test-b-${Math.random()}`;
    checkRateLimit(idA, 1, 60_000);
    const blockedA = checkRateLimit(idA, 1, 60_000);
    const allowedB = checkRateLimit(idB, 1, 60_000);
    expect(blockedA.allowed).toBe(false);
    expect(allowedB.allowed).toBe(true);
  });
});

describe("getClientIp", () => {
  it("uses the first entry of x-forwarded-for", () => {
    const req = new Request("http://localhost", {
      headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
    });
    expect(getClientIp(req)).toBe("1.2.3.4");
  });

  it("falls back to x-real-ip when x-forwarded-for is absent", () => {
    const req = new Request("http://localhost", {
      headers: { "x-real-ip": "9.9.9.9" },
    });
    expect(getClientIp(req)).toBe("9.9.9.9");
  });

  it("falls back to 'unknown' when no IP headers are present", () => {
    const req = new Request("http://localhost");
    expect(getClientIp(req)).toBe("unknown");
  });
});

describe("rateLimitedResponse", () => {
  it("returns a 429 with Retry-After header", async () => {
    const res = rateLimitedResponse(42);
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("42");
    const body = await res.json();
    expect(body.error).toMatch(/too many requests/i);
  });
});
