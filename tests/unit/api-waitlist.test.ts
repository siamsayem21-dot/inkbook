import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { createSupabaseMock, type SupabaseMock } from "../mocks/supabase";

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));

import { createAdminClient } from "@/lib/supabase/admin";
import { POST } from "@/app/api/waitlist/route";

const ARTIST = { id: "artist-1", studio_id: "studio-1" };

// Each call defaults to its own IP so the shared rate-limit store (a
// module-level singleton in lib/rate-limit.ts) doesn't let one test's
// requests count against another's budget.
let ipCounter = 0;
function makeRequest(body: unknown, ip = `10.0.1.${++ipCounter}`) {
  return new NextRequest("http://localhost/api/waitlist", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
  });
}

const VALID_BODY = {
  artistId: ARTIST.id,
  clientName: "Alex Client",
  clientEmail: "alex@example.com",
  clientPhone: "5551234567",
  style: "Traditional",
};

let sb: SupabaseMock;

beforeEach(() => {
  sb = createSupabaseMock();
  vi.mocked(createAdminClient).mockReturnValue(sb.client as unknown as ReturnType<typeof createAdminClient>);
});

describe("POST /api/waitlist", () => {
  it("400s when required fields are missing", async () => {
    const res = await POST(makeRequest({ artistId: "x" }));
    expect(res.status).toBe(400);
  });

  it("404s when the artist does not exist", async () => {
    sb.queueFrom("artists", null);
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(404);
  });

  it("joins the waitlist for a new client", async () => {
    sb.queueFrom("artists", ARTIST);
    sb.queueFrom("clients", null); // existingClient lookup miss
    sb.queueFrom("clients", { id: "new-client-1" }); // insert new client
    sb.queueFrom("waitlist", null); // existingEntry pre-check
    sb.queueFrom("waitlist", { success: true }); // insert

    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);

    const insertArg = (sb.getChain("waitlist", 2) as { insert: { mock: { calls: unknown[][] } } })
      .insert.mock.calls[0][0] as Record<string, unknown>;
    expect(insertArg).toEqual(
      expect.objectContaining({ studio_id: "studio-1", artist_id: "artist-1", client_id: "new-client-1", preferred_style: "Traditional" })
    );
  });

  it("reports alreadyOnWaitlist without erroring when the entry already exists (pre-check)", async () => {
    sb.queueFrom("artists", ARTIST);
    sb.queueFrom("clients", { id: "existing-client-1" });
    sb.queueFrom("waitlist", { id: "existing-entry-1" }); // existingEntry pre-check hit

    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.alreadyOnWaitlist).toBe(true);
  });

  it("reports alreadyOnWaitlist when the unique constraint catches a race", async () => {
    sb.queueFrom("artists", ARTIST);
    sb.queueFrom("clients", { id: "existing-client-1" });
    sb.queueFrom("waitlist", null); // pre-check found nothing
    sb.queueFrom("waitlist", null, { code: "23505", message: "duplicate key" }); // insert races and fails

    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.alreadyOnWaitlist).toBe(true);
  });
});

describe("POST /api/waitlist — rate limiting", () => {
  it("blocks the 6th request within the window from the same IP", async () => {
    const ip = "203.0.113.20";
    for (let i = 0; i < 5; i++) {
      const res = await POST(makeRequest({}, ip)); // missing fields -> 400, but under the rate limit
      expect(res.status).toBe(400);
    }
    const blocked = await POST(makeRequest({}, ip));
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("Retry-After")).toBeTruthy();
  });

  it("never reaches Supabase once a request is rate-limited", async () => {
    const ip = "203.0.113.21";
    for (let i = 0; i < 5; i++) await POST(makeRequest({}, ip));
    sb.fromCalls.length = 0;

    const res = await POST(makeRequest(VALID_BODY, ip));
    expect(res.status).toBe(429);
    expect(sb.fromCalls).toHaveLength(0);
  });

  it("tracks a different IP independently of one that's already at its limit", async () => {
    const exhaustedIp = "203.0.113.22";
    for (let i = 0; i < 5; i++) await POST(makeRequest({}, exhaustedIp));

    const res = await POST(makeRequest({}, "203.0.113.23"));
    expect(res.status).toBe(400); // missing fields, not rate-limited
  });
});
