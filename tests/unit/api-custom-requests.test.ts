import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { createSupabaseMock, type SupabaseMock } from "../mocks/supabase";

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/stripe/client", () => ({ getStripe: vi.fn() }));
vi.mock("@/lib/auth/config", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/lib/twilio/client", () => ({ trySendSms: vi.fn(() => Promise.resolve()) }));
vi.mock("@/lib/email", () => ({
  sendSessionScheduledEmail: vi.fn(() => Promise.resolve()),
  sendCustomRequestReceivedEmail: vi.fn(() => Promise.resolve()),
  sendCustomRequestQuoteEmail: vi.fn(() => Promise.resolve()),
}));

import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe/client";
import { getCurrentUser } from "@/lib/auth/config";
import { POST as submitRequest } from "@/app/api/custom-requests/route";
import { POST as createDeposit } from "@/app/api/custom-requests/[id]/deposit/route";
import { PATCH as scheduleRequest } from "@/app/api/custom-requests/[id]/schedule/route";
import { POST as sendQuote } from "@/app/api/custom-requests/[id]/quote/route";

let sb: SupabaseMock;
let ipCounter = 0;
function uniqueIp() {
  ipCounter += 1;
  return `10.0.0.${ipCounter}`;
}

beforeEach(() => {
  sb = createSupabaseMock();
  vi.mocked(createAdminClient).mockReturnValue(sb.client as unknown as ReturnType<typeof createAdminClient>);
});

const VALID_SUBMISSION = {
  studio_id: "studio-1",
  client_name: "Alex Client",
  client_email: "alex@example.com",
  client_phone: "5551234567",
  design_description: "A large back piece with dragons and clouds",
  placement: "back",
  size: "Large (4–6\")",
  budget_range: "$600–1,000",
};

function submitReq(body: unknown, ip = uniqueIp()) {
  return new NextRequest("http://localhost/api/custom-requests", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
  });
}

describe("POST /api/custom-requests", () => {
  it("429s after the 5th request per minute from the same IP", async () => {
    const ip = uniqueIp();
    sb.queueFrom("studios", { id: "studio-1", name: "Ink & Iron", subdomain: "ink-iron" });
    for (let i = 0; i < 5; i++) {
      sb.queueFrom("studios", { id: "studio-1", name: "Ink & Iron", subdomain: "ink-iron" });
      sb.queueFrom("blacklist", null);
      sb.queueFrom("blacklist", null);
      sb.queueFrom("custom_requests", { id: `req-${i}` });
      sb.queueFrom("studios", { owner_id: "owner-1" });
      await submitRequest(submitReq(VALID_SUBMISSION, ip));
    }
    const sixth = await submitRequest(submitReq(VALID_SUBMISSION, ip));
    expect(sixth.status).toBe(429);
  });

  it("400s when required fields are missing", async () => {
    const res = await submitRequest(submitReq({ studio_id: "studio-1" }));
    expect(res.status).toBe(400);
  });

  it("404s when the studio does not exist", async () => {
    sb.queueFrom("studios", null);
    const res = await submitRequest(submitReq(VALID_SUBMISSION));
    expect(res.status).toBe(404);
  });

  it("403s when the client is blacklisted", async () => {
    sb.queueFrom("studios", { id: "studio-1", name: "Ink & Iron", subdomain: "ink-iron" });
    sb.queueFrom("blacklist", { id: "bl-1" }); // blocked by email
    sb.queueFrom("blacklist", null);
    const res = await submitRequest(submitReq(VALID_SUBMISSION));
    expect(res.status).toBe(403);
  });

  it("500s when the insert fails", async () => {
    sb.queueFrom("studios", { id: "studio-1", name: "Ink & Iron", subdomain: "ink-iron" });
    sb.queueFrom("blacklist", null);
    sb.queueFrom("blacklist", null);
    sb.queueFrom("custom_requests", null, { message: "insert failed" });
    const res = await submitRequest(submitReq(VALID_SUBMISSION));
    expect(res.status).toBe(500);
  });

  it("creates the request and notifies the specified artist", async () => {
    sb.queueFrom("studios", { id: "studio-1", name: "Ink & Iron", subdomain: "ink-iron" });
    sb.queueFrom("blacklist", null);
    sb.queueFrom("blacklist", null);
    sb.queueFrom("custom_requests", { id: "req-1" });
    sb.queueFrom("artists", { name: "Jane Artist", email: "jane@example.com" });

    const res = await submitRequest(submitReq({ ...VALID_SUBMISSION, artist_id: "artist-1" }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBe("req-1");
  });

  it("falls back to the studio owner when no artist is specified", async () => {
    sb.queueFrom("studios", { id: "studio-1", name: "Ink & Iron", subdomain: "ink-iron" });
    sb.queueFrom("blacklist", null);
    sb.queueFrom("blacklist", null);
    sb.queueFrom("custom_requests", { id: "req-2" });
    sb.queueFrom("studios", { owner_id: "owner-1" });
    sb.getUserById.mockResolvedValueOnce({ data: { user: { email: "owner@example.com" } }, error: null });

    const res = await submitRequest(submitReq(VALID_SUBMISSION));
    expect(res.status).toBe(201);
  });
});

describe("POST /api/custom-requests/[id]/deposit", () => {
  function depositReq(body: unknown, ip = uniqueIp()) {
    return new NextRequest("http://localhost/api/custom-requests/req-1/deposit", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "content-type": "application/json", "x-forwarded-for": ip },
    });
  }
  const params = { params: { id: "req-1" } };

  beforeEach(() => {
    vi.mocked(getStripe).mockReturnValue({
      checkout: { sessions: { create: vi.fn(() => Promise.resolve({ url: "https://checkout.stripe.com/session_1" })) } },
    } as unknown as ReturnType<typeof getStripe>);
  });

  it("429s after the 3rd deposit request per minute for the same request id + IP", async () => {
    const ip = uniqueIp();
    for (let i = 0; i < 3; i++) {
      sb.queueFrom("custom_requests", {
        id: "req-1", studio_id: "s1", artist_id: null, client_email: "a@b.com",
        deposit_amount: 150, status: "quoted",
      });
      sb.queueFrom("studios", { name: "Ink & Iron" });
      await createDeposit(depositReq({ studioSlug: "ink-iron" }, ip), params);
    }
    const fourth = await createDeposit(depositReq({ studioSlug: "ink-iron" }, ip), params);
    expect(fourth.status).toBe(429);
  });

  it("400s when studioSlug is missing", async () => {
    const res = await createDeposit(depositReq({}), params);
    expect(res.status).toBe(400);
  });

  it("503s when Stripe is not configured", async () => {
    vi.mocked(getStripe).mockImplementation(() => {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    });
    const res = await createDeposit(depositReq({ studioSlug: "ink-iron" }), params);
    expect(res.status).toBe(503);
  });

  it("404s when the custom request does not exist", async () => {
    sb.queueFrom("custom_requests", null);
    const res = await createDeposit(depositReq({ studioSlug: "ink-iron" }), params);
    expect(res.status).toBe(404);
  });

  it("409s when the request does not have a pending quote", async () => {
    sb.queueFrom("custom_requests", { id: "req-1", status: "pending", deposit_amount: null });
    const res = await createDeposit(depositReq({ studioSlug: "ink-iron" }), params);
    expect(res.status).toBe(409);
  });

  it("400s when the quote has no deposit amount set", async () => {
    sb.queueFrom("custom_requests", { id: "req-1", status: "quoted", deposit_amount: 0 });
    const res = await createDeposit(depositReq({ studioSlug: "ink-iron" }), params);
    expect(res.status).toBe(400);
  });

  it("creates a Stripe checkout session for a valid quoted request", async () => {
    sb.queueFrom("custom_requests", {
      id: "req-1", studio_id: "s1", artist_id: "artist-1", client_email: "a@b.com",
      deposit_amount: 150, status: "quoted",
    });
    sb.queueFrom("studios", { name: "Ink & Iron" });
    sb.queueFrom("artists", { name: "Jane Artist" });

    const res = await createDeposit(depositReq({ studioSlug: "ink-iron" }), params);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.url).toContain("checkout.stripe.com");
  });

  it("403s and never creates a Stripe session when the client is blacklisted", async () => {
    sb.queueFrom("custom_requests", {
      id: "req-1", studio_id: "s1", artist_id: "artist-1",
      client_email: "blocked@example.com", client_phone: "+15550000000",
      deposit_amount: 150, status: "quoted",
    });
    sb.queueRpc(true); // is_client_blacklisted -> blocked

    const res = await createDeposit(depositReq({ studioSlug: "ink-iron" }), params);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toMatch(/contact the studio directly/i);
    expect(sb.fromCalls).not.toContain("studios");
    expect(sb.fromCalls).not.toContain("artists");
  });
});

describe("PATCH /api/custom-requests/[id]/schedule — monthly booking cap", () => {
  const params = { params: { id: "req-1" } };

  function scheduleReq(body: unknown) {
    return new NextRequest("http://localhost/api/custom-requests/req-1/schedule", {
      method: "PATCH",
      body: JSON.stringify(body),
      headers: { "content-type": "application/json" },
    });
  }

  const STUDIO = { id: "studio-1", name: "Ink & Iron", subdomain: "ink-iron", owner_id: "owner-1" };
  const CUSTOM_REQUEST = {
    id: "req-1", studio_id: "studio-1", artist_id: "artist-1", booking_id: "bk-1",
    client_name: "Alex Client", client_email: "alex@example.com", client_phone: "5551234567",
    status: "accepted", deposit_amount: 150, quote_amount: 600,
  };
  const BOOKING = { id: "bk-1", status: "awaiting_schedule", artist_id: "artist-1" };

  beforeEach(() => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "owner-1" } as never);
  });

  it("rejects scheduling when the artist is already at capacity for that month (same check as assignSchedule)", async () => {
    sb.queueFrom("studios", STUDIO);
    sb.queueFrom("custom_requests", CUSTOM_REQUEST);
    sb.queueFrom("bookings", BOOKING);
    sb.queueFrom("bookings", []); // conflict check — no conflict
    sb.queueFrom("artists", { name: "Jane Artist", monthly_booking_cap: 2 });
    sb.queueFrom("bookings", [{ id: "bk-x" }, { id: "bk-y" }]); // monthly count — at cap

    const res = await scheduleRequest(scheduleReq({ date: "2099-09-01", time: "14:00" }), params);
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toMatch(/already at capacity for that month/);
  });

  it("schedules successfully when the artist is under their monthly cap", async () => {
    sb.queueFrom("studios", STUDIO);
    sb.queueFrom("custom_requests", CUSTOM_REQUEST);
    sb.queueFrom("bookings", BOOKING);
    sb.queueFrom("bookings", []); // conflict check — no conflict
    sb.queueFrom("artists", { name: "Jane Artist", monthly_booking_cap: 5 });
    sb.queueFrom("bookings", [{ id: "bk-x" }]); // monthly count — under cap
    sb.queueFrom("bookings", { success: true }); // update
    sb.queueFrom("custom_requests", { success: true }); // update
    sb.queueFrom("artists", { name: "Jane Artist" }); // notification lookup
    sb.queueFrom("studios", { address: "123 Main St" }); // notification lookup

    const res = await scheduleRequest(scheduleReq({ date: "2099-09-01", time: "14:00" }), params);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});

describe("POST /api/custom-requests/[id]/quote — owner-set minimum rate floor", () => {
  const params = { params: { id: "req-1" } };

  function quoteReq(body: unknown) {
    return new NextRequest("http://localhost/api/custom-requests/req-1/quote", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "content-type": "application/json" },
    });
  }

  it("rejects an artist's quote below their own minimum rate", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "artist-user-1" } as never);
    sb.queueFrom("custom_requests", {
      id: "req-1", studio_id: "studio-1", artist_id: null,
      client_name: "Alex Client", client_email: "alex@example.com", status: "pending",
    });
    sb.queueFrom("artists", { id: "artist-1", name: "Jane Artist", studio_id: "studio-1" }); // artistRow (self)
    sb.queueFrom("studios", null); // studioRow — this user isn't an owner
    sb.queueFrom("artists", { name: "Jane Artist", minimum_rate_cents: 15000 }); // rate floor lookup

    const res = await sendQuote(quoteReq({ quote_amount: 100, deposit_amount: 50 }), params);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/at least \$150\.00.*Jane Artist's minimum rate/);
  });

  it("accepts an artist's quote at or above their minimum rate", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "artist-user-1" } as never);
    sb.queueFrom("custom_requests", {
      id: "req-1", studio_id: "studio-1", artist_id: null,
      client_name: "Alex Client", client_email: "alex@example.com", status: "pending",
    });
    sb.queueFrom("artists", { id: "artist-1", name: "Jane Artist", studio_id: "studio-1" }); // artistRow (self)
    sb.queueFrom("studios", null); // studioRow — this user isn't an owner
    sb.queueFrom("artists", { name: "Jane Artist", minimum_rate_cents: 15000 }); // rate floor lookup
    sb.queueFrom("studios", { name: "Ink & Iron", subdomain: "ink-iron" }); // resolve studio name for email
    sb.queueFrom("custom_requests", { success: true }); // update

    const res = await sendQuote(quoteReq({ quote_amount: 200, deposit_amount: 50 }), params);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("rejects an owner's quote for an assigned artist below that artist's minimum rate", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "owner-1" } as never);
    sb.queueFrom("custom_requests", {
      id: "req-1", studio_id: "studio-1", artist_id: "artist-1",
      client_name: "Alex Client", client_email: "alex@example.com", status: "pending",
    });
    sb.queueFrom("artists", null); // artistRow — this user isn't an artist
    sb.queueFrom("studios", { id: "studio-1", name: "Ink & Iron", subdomain: "ink-iron", owner_id: "owner-1" }); // studioRow
    sb.queueFrom("artists", { name: "Jane Artist", minimum_rate_cents: 20000 }); // rate floor lookup

    const res = await sendQuote(quoteReq({ quote_amount: 100, deposit_amount: 50 }), params);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/at least \$200\.00.*Jane Artist's minimum rate/);
  });
});
