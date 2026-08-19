import { describe, it, expect, beforeEach, afterEach } from "vitest";

// Confirms rule: "the app remains fully functional when Sentry env vars are
// unset" -- next.config.mjs must load and produce a usable config object
// with zero Sentry env vars present, exactly like a fresh clone/CI without
// any Sentry setup yet.
describe("next.config.mjs — safe with no Sentry env vars", () => {
  const SENTRY_VARS = ["SENTRY_DSN", "NEXT_PUBLIC_SENTRY_DSN", "SENTRY_ORG", "SENTRY_PROJECT", "SENTRY_AUTH_TOKEN"];
  const originalValues: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of SENTRY_VARS) {
      originalValues[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const key of SENTRY_VARS) {
      if (originalValues[key] !== undefined) process.env[key] = originalValues[key];
    }
  });

  it("loads without throwing and produces a valid Next.js config object", async () => {
    const mod = await import("../../next.config.mjs");
    const config = mod.default;
    expect(config).toBeTruthy();
    expect(config.images?.remotePatterns?.[0]?.hostname).toBe("images.unsplash.com");
  });
});
