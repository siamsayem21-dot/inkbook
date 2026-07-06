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

const ARTIST = { id: "artist-1", name: "Jane Artist", studio_id: "studio-1" };
const STUDIO = { id: "studio-1", name: "Ink & Iron", deposit_amount_cents: 5000 };

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/bookings", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
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

/** Queues the standard happy-path lookups: artist, studio, blacklist x2 (clear), no slot collision. */
function queueHappyPathPrelude(overrides?: { blockedByEmail?: unknown; blockedByPhone?: unknown; slotTaken?: unknown }) {
  sb.queueFrom("artists", ARTIST);
  sb.queueFrom("studios", STUDIO);
  sb.queueFrom("blacklist", overrides?.blockedByEmail ?? null);
  sb.queueFrom("blacklist", overrides?.blockedByPhone ?? null);
  sb.queueFrom("bookings", overrides?.slotTaken ?? null); // slot collision check
}

describe("POST /api/bookings", () => {
  it("400s when required fields are missing", async () => {
    const res = await POST(makeRequest({ artistId: "x" }));
    expect(res.status).toBe(400);
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

  it("500s when the booking insert fails", async () => {
    queueHappyPathPrelude();
    sb.queueFrom("clients", { id: "existing-client-1" });
    sb.queueFrom("bookings", null, { message: "insert failed" });

    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(500);
  });
});
