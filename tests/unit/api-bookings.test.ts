import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { createSupabaseMock, type SupabaseMock } from "../mocks/supabase";

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/twilio/client", () => ({
  trySendSms: vi.fn(() => Promise.resolve()),
  buildSmsMessage: vi.fn(() => "sms body"),
}));

import { createAdminClient } from "@/lib/supabase/admin";
import { trySendSms } from "@/lib/twilio/client";
import { POST } from "@/app/api/bookings/route";

const ARTIST = { id: "artist-1", name: "Jane Artist", studio_id: "studio-1", monthly_booking_cap: 20 };
const STUDIO = { id: "studio-1", name: "Ink & Iron", deposit_amount_cents: 5000 };

// Each call defaults to its own IP so the shared rate-limit store (a
// module-level singleton in lib/rate-limit.ts) doesn't let one test's
// requests count against another's budget.
let ipCounter = 0;
function makeRequest(body: unknown, ip = `10.0.0.${++ipCounter}`) {
  return new NextRequest("http://localhost/api/bookings", {
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
  date: "2026-08-01",
  time: "10:00",
  style: "Traditional",
};

let sb: SupabaseMock;

beforeEach(() => {
  sb = createSupabaseMock();
  vi.mocked(createAdminClient).mockReturnValue(sb.client as unknown as ReturnType<typeof createAdminClient>);
  vi.mocked(trySendSms).mockClear();
});

/** Queues the standard happy-path lookups: artist, studio, blacklist x2 (clear), no slot collision, under monthly cap. */
function queueHappyPathPrelude(overrides?: {
  blockedByEmail?: unknown; blockedByPhone?: unknown; slotTaken?: unknown; bookingsThisMonth?: unknown[];
}) {
  sb.queueFrom("artists", ARTIST);
  sb.queueFrom("studios", STUDIO);
  sb.queueFrom("blacklist", overrides?.blockedByEmail ?? null);
  sb.queueFrom("blacklist", overrides?.blockedByPhone ?? null);
  sb.queueFrom("bookings", overrides?.slotTaken ?? null); // slot collision check
  if (overrides?.slotTaken === undefined) {
    sb.queueFrom("bookings", overrides?.bookingsThisMonth ?? []); // monthly cap count (Phase C Feature 6)
  }
}

describe("POST /api/bookings", () => {
  it("400s when required fields are missing", async () => {
    const res = await POST(makeRequest({ artistId: "x" }));
    expect(res.status).toBe(400);
  });

  it("400s (not a 500 crash) when the request body is malformed JSON", async () => {
    const ip = `10.0.0.${++ipCounter}`;
    const req = new NextRequest("http://localhost/api/bookings", {
      method: "POST",
      body: "{not valid json",
      headers: { "content-type": "application/json", "x-forwarded-for": ip },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/invalid json/i);
  });

  it("404s when the artist does not exist", async () => {
    sb.queueFrom("artists", null);
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toMatch(/artist not found/i);
  });

  it("404s when the artist's studio does not exist", async () => {
    sb.queueFrom("artists", ARTIST);
    sb.queueFrom("studios", null);
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toMatch(/studio not found/i);
  });

  it("403s when the client is blacklisted by email", async () => {
    queueHappyPathPrelude({ blockedByEmail: { id: "bl-1" } });
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(403);
  });

  it("403s when the client is blacklisted by phone", async () => {
    queueHappyPathPrelude({ blockedByPhone: { id: "bl-2" } });
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(403);
  });

  it("409s when the artist already has a booking at that date/time", async () => {
    queueHappyPathPrelude({ slotTaken: { id: "existing-booking" } });
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toMatch(/no longer available/i);
  });

  it("reuses an existing client record instead of creating a duplicate", async () => {
    queueHappyPathPrelude();
    sb.queueFrom("clients", { id: "existing-client-1" }); // existingClient lookup
    sb.queueFrom("bookings", { id: "booking-1", deposit_amount_cents: 5000 }); // insert booking

    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(201);
    // clients table should only be touched once (lookup) — no insert branch taken
    expect(sb.fromCalls.filter((t) => t === "clients")).toHaveLength(1);
  });

  it("creates a new client when none exists, then creates the booking and sends the deposit-pending SMS", async () => {
    queueHappyPathPrelude();
    sb.queueFrom("clients", null); // existingClient lookup miss
    sb.queueFrom("clients", { id: "new-client-1" }); // insert new client
    sb.queueFrom("bookings", { id: "booking-1", deposit_amount_cents: 5000 }); // insert booking

    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.bookingId).toBe("booking-1");
    expect(body.depositAmountCents).toBe(5000);
    expect(body.studioName).toBe(STUDIO.name);
    expect(body.artistName).toBe(ARTIST.name);
    expect(sb.fromCalls.filter((t) => t === "clients")).toHaveLength(2);
    expect(trySendSms).toHaveBeenCalledWith(VALID_BODY.clientPhone, "sms body");
  });

  it("409s with waitlistEligible when the artist is at their monthly booking cap (Phase C Feature 6)", async () => {
    sb.queueFrom("artists", ARTIST);
    sb.queueFrom("studios", STUDIO);
    sb.queueFrom("blacklist", null);
    sb.queueFrom("blacklist", null);
    sb.queueFrom("bookings", null); // no slot collision
    sb.queueFrom("bookings", Array.from({ length: 20 }, (_, i) => ({ id: `bk-${i}` }))); // at cap (20/20)

    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.waitlistEligible).toBe(true);
    expect(sb.fromCalls).not.toContain("clients");
  });

  it("500s when the booking insert fails", async () => {
    queueHappyPathPrelude();
    sb.queueFrom("clients", { id: "existing-client-1" });
    sb.queueFrom("bookings", null, { message: "insert failed" });

    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(500);
  });
});

describe("POST /api/bookings — rate limiting", () => {
  it("blocks the 6th request within the window from the same IP", async () => {
    const ip = "203.0.113.9";
    for (let i = 0; i < 5; i++) {
      const res = await POST(makeRequest({}, ip)); // missing fields -> 400, but under the rate limit
      expect(res.status).toBe(400);
    }
    const blocked = await POST(makeRequest({}, ip));
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("Retry-After")).toBeTruthy();
  });

  it("never reaches Supabase once a request is rate-limited", async () => {
    const ip = "203.0.113.10";
    for (let i = 0; i < 5; i++) await POST(makeRequest({}, ip));
    sb.fromCalls.length = 0;

    const res = await POST(makeRequest(VALID_BODY, ip));
    expect(res.status).toBe(429);
    expect(sb.fromCalls).toHaveLength(0);
  });

  it("tracks a different IP independently of one that's already at its limit", async () => {
    const exhaustedIp = "203.0.113.11";
    for (let i = 0; i < 5; i++) await POST(makeRequest({}, exhaustedIp));

    const res = await POST(makeRequest({}, "203.0.113.12"));
    expect(res.status).toBe(400); // missing fields, not rate-limited
  });
});
