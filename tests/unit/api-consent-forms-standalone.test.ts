import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { createSupabaseMock, type SupabaseMock } from "../mocks/supabase";

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));

import { createAdminClient } from "@/lib/supabase/admin";
import { POST } from "@/app/api/consent-forms/standalone/route";

let sb: SupabaseMock;

const VALID_BODY = {
  studioSlug: "ink-and-iron",
  fullName: "Alex Client",
  dateOfBirth: "1990-01-01",
  isMinor: false,
  placement: "forearm",
  artistName: "Jordan Artist",
  designDescription: "Small script tattoo",
  agreedToAftercare: true,
  signature: "data:image/png;base64,AAA",
};

// Each call defaults to its own IP so the shared rate-limit store (a
// module-level singleton in lib/rate-limit.ts) doesn't let one test's
// requests count against another's budget.
let ipCounter = 0;
function makeRequest(body: unknown, ip = `10.0.3.${++ipCounter}`) {
  return new NextRequest("http://localhost/api/consent-forms/standalone", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
  });
}

beforeEach(() => {
  sb = createSupabaseMock();
  vi.mocked(createAdminClient).mockReturnValue(sb.client as unknown as ReturnType<typeof createAdminClient>);
});

describe("POST /api/consent-forms/standalone", () => {
  it("400s when required fields are missing", async () => {
    const res = await POST(makeRequest({ ...VALID_BODY, fullName: undefined }));
    expect(res.status).toBe(400);
  });

  it("422s when isMinor is true", async () => {
    const res = await POST(makeRequest({ ...VALID_BODY, isMinor: true }));
    expect(res.status).toBe(422);
  });

  it("422s when aftercare is not agreed to", async () => {
    const res = await POST(makeRequest({ ...VALID_BODY, agreedToAftercare: false }));
    expect(res.status).toBe(422);
  });

  it("404s when the studio does not exist", async () => {
    sb.queueFrom("studios", null);
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(404);
  });

  it("succeeds and inserts a standalone consent form", async () => {
    sb.queueFrom("studios", { id: "studio-1" });
    sb.queueFrom("standalone_consent_forms", { id: "form-1" });
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ success: true, id: "form-1" });
  });
});

describe("POST /api/consent-forms/standalone — rate limiting", () => {
  it("blocks the 6th request within the window from the same IP", async () => {
    const ip = "203.0.113.40";
    for (let i = 0; i < 5; i++) {
      // missing fullName -> 400, but under the rate limit
      const res = await POST(makeRequest({ ...VALID_BODY, fullName: undefined }, ip));
      expect(res.status).toBe(400);
    }
    const blocked = await POST(makeRequest({ ...VALID_BODY, fullName: undefined }, ip));
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("Retry-After")).toBeTruthy();
  });

  it("never reaches Supabase once a request is rate-limited", async () => {
    const ip = "203.0.113.41";
    for (let i = 0; i < 5; i++) await POST(makeRequest({ ...VALID_BODY, fullName: undefined }, ip));
    sb.fromCalls.length = 0;

    const res = await POST(makeRequest(VALID_BODY, ip));
    expect(res.status).toBe(429);
    expect(sb.fromCalls).toHaveLength(0);
  });

  it("tracks a different IP independently of one that's already at its limit", async () => {
    const exhaustedIp = "203.0.113.42";
    for (let i = 0; i < 5; i++) await POST(makeRequest({ ...VALID_BODY, fullName: undefined }, exhaustedIp));

    const res = await POST(makeRequest({ ...VALID_BODY, fullName: undefined }, "203.0.113.43"));
    expect(res.status).toBe(400); // missing fields, not rate-limited
  });
});
