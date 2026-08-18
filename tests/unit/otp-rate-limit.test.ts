import { describe, it, expect, vi } from "vitest";

vi.mock("next/headers", () => ({
  headers: () => new Map([["x-forwarded-for", "198.51.100.9"]]),
}));

import { checkOtpSendAllowed } from "@/app/book/[studio]/login/rate-limit-action";

describe("checkOtpSendAllowed", () => {
  it("allows the first several sends for a given IP+email", async () => {
    const email = `user-${Math.random()}@example.com`;
    for (let i = 0; i < 5; i++) {
      const result = await checkOtpSendAllowed(email);
      expect(result.allowed).toBe(true);
    }
  });

  it("blocks after the limit is exceeded for the same IP+email", async () => {
    const email = `blocked-${Math.random()}@example.com`;
    for (let i = 0; i < 5; i++) await checkOtpSendAllowed(email);
    const sixth = await checkOtpSendAllowed(email);
    expect(sixth.allowed).toBe(false);
    expect(sixth.retryAfter).toBeGreaterThan(0);
  });

  it("does not block a different email from the same IP", async () => {
    const emailA = `a-${Math.random()}@example.com`;
    const emailB = `b-${Math.random()}@example.com`;
    for (let i = 0; i < 5; i++) await checkOtpSendAllowed(emailA);
    const forB = await checkOtpSendAllowed(emailB);
    expect(forB.allowed).toBe(true);
  });
});
