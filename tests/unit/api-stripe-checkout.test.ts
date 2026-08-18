import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { createSupabaseMock, type SupabaseMock } from "../mocks/supabase";

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/stripe/client", () => ({ getStripe: vi.fn() }));

import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe/client";
import { POST } from "@/app/api/stripe/checkout/route";

let sb: SupabaseMock;

const VALID_BODY = { bookingId: "bk-1", studioSlug: "ink-iron", artistId: "artist-1" };

let ipCounter = 0;
function makeRequest(body: unknown, ip = `10.0.4.${++ipCounter}`) {
  return new NextRequest("http://localhost/api/stripe/checkout", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
  });
}

beforeEach(() => {
  sb = createSupabaseMock();
  vi.mocked(createAdminClient).mockReturnValue(sb.client as unknown as ReturnType<typeof createAdminClient>);
  vi.mocked(getStripe).mockReturnValue({
    checkout: {
      sessions: {
        create: vi.fn(() => Promise.resolve({ id: "cs_1", url: "https://checkout.stripe.com/session_1" })),
        retrieve: vi.fn(() => Promise.resolve({ url: "https://checkout.stripe.com/existing" })),
      },
    },
  } as unknown as ReturnType<typeof getStripe>);
});

describe("POST /api/stripe/checkout", () => {
  it("400s when required fields are missing", async () => {
    const res = await POST(makeRequest({ bookingId: "bk-1" }));
    expect(res.status).toBe(400);
  });

  it("404s when the booking does not exist", async () => {
    sb.queueFrom("bookings", null);
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(404);
  });

  it("409s when the deposit is already paid", async () => {
    sb.queueFrom("bookings", { id: "bk-1", deposit_amount_cents: 10000, studio_id: "s1", artist_id: "artist-1", status: "confirmed" });
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(409);
  });

  it("creates a Stripe checkout session for a valid pending_deposit booking", async () => {
    sb.queueFrom("bookings", { id: "bk-1", deposit_amount_cents: 10000, studio_id: "s1", artist_id: "artist-1", status: "pending_deposit" });
    sb.queueFrom("deposits", null); // no existing deposit session
    sb.queueFrom("studios", { name: "Ink & Iron" });
    sb.queueFrom("artists", { name: "Jane Artist" });

    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.url).toContain("checkout.stripe.com");
  });
});

describe("POST /api/stripe/checkout — idempotency", () => {
  it("creates exactly one Stripe session when two requests for the same booking arrive concurrently", async () => {
    const body = { bookingId: "bk-concurrent", studioSlug: "ink-iron", artistId: "artist-1" };
    // Every queued row is read twice (once per concurrent call) — supabase
    // mock queues are consumed in order, so duplicate each row.
    for (let i = 0; i < 2; i++) {
      sb.queueFrom("bookings", { id: "bk-concurrent", deposit_amount_cents: 10000, studio_id: "s1", artist_id: "artist-1", status: "pending_deposit" });
      sb.queueFrom("deposits", null);
      sb.queueFrom("studios", { name: "Ink & Iron" });
      sb.queueFrom("artists", { name: "Jane Artist" });
    }

    const createSpy = vi.mocked(getStripe)().checkout.sessions.create;

    const [res1, res2] = await Promise.all([
      POST(makeRequest(body, "10.0.9.1")),
      POST(makeRequest(body, "10.0.9.2")),
    ]);

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
    const [body1, body2] = await Promise.all([res1.json(), res2.json()]);
    expect(body1.url).toBe(body2.url);
    expect(createSpy).toHaveBeenCalledTimes(1);
  });
});

describe("POST /api/stripe/checkout — rate limiting", () => {
  it("blocks the 6th request within the window from the same IP", async () => {
    const ip = "203.0.113.50";
    for (let i = 0; i < 5; i++) {
      // missing fields -> 400, but under the rate limit
      const res = await POST(makeRequest({ bookingId: "bk-1" }, ip));
      expect(res.status).toBe(400);
    }
    const blocked = await POST(makeRequest({ bookingId: "bk-1" }, ip));
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("Retry-After")).toBeTruthy();
  });

  it("never reaches Supabase once a request is rate-limited", async () => {
    const ip = "203.0.113.51";
    for (let i = 0; i < 5; i++) await POST(makeRequest({ bookingId: "bk-1" }, ip));
    sb.fromCalls.length = 0;

    const res = await POST(makeRequest(VALID_BODY, ip));
    expect(res.status).toBe(429);
    expect(sb.fromCalls).toHaveLength(0);
  });

  it("tracks a different IP independently of one that's already at its limit", async () => {
    const exhaustedIp = "203.0.113.52";
    for (let i = 0; i < 5; i++) await POST(makeRequest({ bookingId: "bk-1" }, exhaustedIp));

    const res = await POST(makeRequest({ bookingId: "bk-1" }, "203.0.113.53"));
    expect(res.status).toBe(400); // missing fields, not rate-limited
  });
});
