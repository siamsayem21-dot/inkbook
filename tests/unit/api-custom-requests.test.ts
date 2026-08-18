import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
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

  describe("Stripe Connect (subscription-only payment architecture)", () => {
    const originalConnectFlag = process.env.STRIPE_CONNECT_ENABLED;

    afterEach(() => {
      if (originalConnectFlag === undefined) delete process.env.STRIPE_CONNECT_ENABLED;
      else process.env.STRIPE_CONNECT_ENABLED = originalConnectFlag;
    });

    // Each test below uses its own request id (not the shared `params`/"req-1"
    // constant) — the deposit route now has real idempotency keyed by request
    // id (bug fix, see app/api/custom-requests/[id]/deposit/route.ts), so
    // reusing "req-1" across tests that each expect a fresh Stripe call would
    // have the second+ test silently receive the first test's cached result.

    it("creates the session as a Direct Charge on the studio's connected account when eligible", async () => {
      process.env.STRIPE_CONNECT_ENABLED = "true";
      const createSpy = vi.fn(() => Promise.resolve({ url: "https://checkout.stripe.com/session_1" }));
      vi.mocked(getStripe).mockReturnValue({
        checkout: { sessions: { create: createSpy } },
      } as unknown as ReturnType<typeof getStripe>);

      sb.queueFrom("custom_requests", {
        id: "req-connect-eligible", studio_id: "s1", artist_id: "artist-1", client_email: "a@b.com",
        deposit_amount: 150, status: "quoted",
      });
      sb.queueFrom("studios", { name: "Ink & Iron" });
      sb.queueFrom("artists", { name: "Jane Artist" });
      sb.queueFrom("studios", {
        stripe_connected_account_id: "acct_123",
        stripe_connect_charges_enabled: true,
        stripe_connect_payouts_enabled: true,
        stripe_connect_details_submitted: true,
      });

      const res = await createDeposit(depositReq({ studioSlug: "ink-iron" }), { params: { id: "req-connect-eligible" } });
      expect(res.status).toBe(200);
      expect(createSpy).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ stripeAccount: "acct_123" })
      );
    });

    it("fails closed with 402 payment_setup_required when the studio hasn't connected Stripe — never falls back to the platform account", async () => {
      process.env.STRIPE_CONNECT_ENABLED = "true";
      const createSpy = vi.fn(() => Promise.resolve({ url: "https://checkout.stripe.com/session_1" }));
      vi.mocked(getStripe).mockReturnValue({
        checkout: { sessions: { create: createSpy } },
      } as unknown as ReturnType<typeof getStripe>);

      sb.queueFrom("custom_requests", {
        id: "req-connect-not-connected", studio_id: "s1", artist_id: "artist-1", client_email: "a@b.com",
        deposit_amount: 150, status: "quoted",
      });
      sb.queueFrom("studios", { name: "Ink & Iron" });
      sb.queueFrom("artists", { name: "Jane Artist" });
      sb.queueFrom("studios", null); // no connected account at all

      const res = await createDeposit(depositReq({ studioSlug: "ink-iron" }), { params: { id: "req-connect-not-connected" } });
      expect(res.status).toBe(402);
      const body = await res.json();
      expect(body.error).toBe("payment_setup_required");
      expect(createSpy).not.toHaveBeenCalled(); // never charges anyone when not eligible
    });

    it("fails closed when the studio has an account but charges are not yet enabled", async () => {
      process.env.STRIPE_CONNECT_ENABLED = "true";
      const createSpy = vi.fn(() => Promise.resolve({ url: "https://checkout.stripe.com/session_1" }));
      vi.mocked(getStripe).mockReturnValue({
        checkout: { sessions: { create: createSpy } },
      } as unknown as ReturnType<typeof getStripe>);

      sb.queueFrom("custom_requests", {
        id: "req-connect-charges-disabled", studio_id: "s1", artist_id: "artist-1", client_email: "a@b.com",
        deposit_amount: 150, status: "quoted",
      });
      sb.queueFrom("studios", { name: "Ink & Iron" });
      sb.queueFrom("artists", { name: "Jane Artist" });
      sb.queueFrom("studios", {
        stripe_connected_account_id: "acct_123",
        stripe_connect_charges_enabled: false, // onboarding incomplete
        stripe_connect_payouts_enabled: false,
        stripe_connect_details_submitted: true,
      });

      const res = await createDeposit(depositReq({ studioSlug: "ink-iron" }), { params: { id: "req-connect-charges-disabled" } });
      expect(res.status).toBe(402);
      expect(createSpy).not.toHaveBeenCalled();
    });
  });

  describe("idempotency — duplicate Checkout Session prevention (bug fix)", () => {
    it("a second call for the same request returns the SAME session instead of creating a new one", async () => {
      const createSpy = vi.fn(() => Promise.resolve({ url: "https://checkout.stripe.com/session_dedupe" }));
      vi.mocked(getStripe).mockReturnValue({
        checkout: { sessions: { create: createSpy } },
      } as unknown as ReturnType<typeof getStripe>);

      const dupeParams = { params: { id: "req-dupe-click" } };
      // Two independent calls need two independent sets of queued reads —
      // the idempotency check happens AFTER the DB reads (status/blacklist/
      // studio/artist lookups still run on every call), only the actual
      // Stripe session creation is deduped.
      for (let i = 0; i < 2; i++) {
        sb.queueFrom("custom_requests", {
          id: "req-dupe-click", studio_id: "s1", artist_id: "artist-1", client_email: "a@b.com",
          deposit_amount: 150, status: "quoted",
        });
        sb.queueFrom("studios", { name: "Ink & Iron" });
        sb.queueFrom("artists", { name: "Jane Artist" });
      }

      const first = await createDeposit(depositReq({ studioSlug: "ink-iron" }), dupeParams);
      const second = await createDeposit(depositReq({ studioSlug: "ink-iron" }), dupeParams);

      const firstBody = await first.json();
      const secondBody = await second.json();
      expect(firstBody.url).toBe("https://checkout.stripe.com/session_dedupe");
      expect(secondBody.url).toBe("https://checkout.stripe.com/session_dedupe"); // same session, not a new one
      expect(createSpy).toHaveBeenCalledTimes(1); // Stripe was only ever asked to create ONE session
    });

    it("rejects with 409 when the request already has a recorded stripe_payment_intent_id (already paid)", async () => {
      const createSpy = vi.fn();
      vi.mocked(getStripe).mockReturnValue({
        checkout: { sessions: { create: createSpy } },
      } as unknown as ReturnType<typeof getStripe>);

      sb.queueFrom("custom_requests", {
        id: "req-already-paid", studio_id: "s1", artist_id: "artist-1", client_email: "a@b.com",
        deposit_amount: 150, status: "quoted", stripe_payment_intent_id: "pi_already_charged",
      });

      const res = await createDeposit(depositReq({ studioSlug: "ink-iron" }), { params: { id: "req-already-paid" } });
      expect(res.status).toBe(409);
      const body = await res.json();
      expect(body.error).toMatch(/already been paid/i);
      expect(createSpy).not.toHaveBeenCalled();
      expect(sb.rpc).not.toHaveBeenCalled(); // returns before even the blacklist RPC check
    });

    // Regression test for the exact live bug found 2026-08-19: a real
    // double-click fires two genuinely CONCURRENT requests (not one after
    // the other) — a Promise.all here reproduces that, unlike an awaited
    // sequential pair, which would have passed even before this route had
    // any idempotency protection at all.
    it("a true double-click (two concurrent requests) creates only ONE real Stripe session", async () => {
      const createSpy = vi.fn(async () => {
        await new Promise((r) => setTimeout(r, 10)); // real network latency
        return { url: "https://checkout.stripe.com/session_concurrent" };
      });
      vi.mocked(getStripe).mockReturnValue({
        checkout: { sessions: { create: createSpy } },
      } as unknown as ReturnType<typeof getStripe>);

      const dupeParams = { params: { id: "req-concurrent-dupe-click" } };
      for (let i = 0; i < 2; i++) {
        sb.queueFrom("custom_requests", {
          id: "req-concurrent-dupe-click", studio_id: "s1", artist_id: "artist-1", client_email: "a@b.com",
          deposit_amount: 150, status: "quoted",
        });
        sb.queueFrom("studios", { name: "Ink & Iron" });
        sb.queueFrom("artists", { name: "Jane Artist" });
      }

      const [res1, res2] = await Promise.all([
        createDeposit(depositReq({ studioSlug: "ink-iron" }), dupeParams),
        createDeposit(depositReq({ studioSlug: "ink-iron" }), dupeParams),
      ]);
      const [body1, body2] = await Promise.all([res1.json(), res2.json()]);

      expect(createSpy).toHaveBeenCalledTimes(1); // the actual bug: this was 2 before the fix
      expect(body1.url).toBe(body2.url);
      expect(body1.url).toBe("https://checkout.stripe.com/session_concurrent");
    });
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
    sb.queueFrom("studios", [STUDIO]);
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
    sb.queueFrom("studios", [STUDIO]);
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

// Regression coverage for the same real bug class found and fixed in
// app/api/custom-requests/[id]/quote/route.ts and .../decline/route.ts: the
// owner-lookup query was `.eq("owner_id", user.id).maybeSingle()` with no
// studio filter, which silently returns null for any owner who owns more
// than one studio (confirmed live against production — the real test owner
// has 3). Fixed here by fetching every studio the user owns (not
// .maybeSingle()) and matching against the request's own studio_id once
// it's known, rather than assuming a single owned studio.
//
// This route has no UI (dead code — nothing in the app calls it; scheduling
// is handled by the approved Bookings module's assignSchedule() instead),
// so this bug was invisible in practice, but the endpoint itself was still
// broken for any real multi-studio owner who might call it directly.
describe("PATCH /api/custom-requests/[id]/schedule — multi-studio owner scoping", () => {
  const params = { params: { id: "req-1" } };

  function scheduleReq(body: unknown) {
    return new NextRequest("http://localhost/api/custom-requests/req-1/schedule", {
      method: "PATCH",
      body: JSON.stringify(body),
      headers: { "content-type": "application/json" },
    });
  }

  const CUSTOM_REQUEST = {
    id: "req-1", studio_id: "studio-B", artist_id: "artist-1", booking_id: "bk-1",
    client_name: "Alex Client", client_email: "alex@example.com", client_phone: "5551234567",
    status: "accepted", deposit_amount: 150, quote_amount: 600,
  };
  const BOOKING = { id: "bk-1", status: "awaiting_schedule", artist_id: "artist-1" };

  beforeEach(() => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "owner-multi-1" } as never);
  });

  it("succeeds for an owner who owns multiple studios, scheduling a request in one of them", async () => {
    // Three studios owned by the same user — studio-B (where this request
    // actually lives) is deliberately not first, to prove this isn't
    // accidentally working via "pick the first row" luck.
    sb.queueFrom("studios", [
      { id: "studio-A", name: "Studio A", subdomain: "studio-a", owner_id: "owner-multi-1" },
      { id: "studio-B", name: "Studio B", subdomain: "studio-b", owner_id: "owner-multi-1" },
      { id: "studio-C", name: "Studio C", subdomain: "studio-c", owner_id: "owner-multi-1" },
    ]);
    sb.queueFrom("custom_requests", CUSTOM_REQUEST);
    sb.queueFrom("bookings", BOOKING);
    sb.queueFrom("bookings", []); // conflict check — no conflict
    sb.queueFrom("artists", { name: "Jane Artist", monthly_booking_cap: 5 });
    sb.queueFrom("bookings", []); // monthly count — under cap
    sb.queueFrom("bookings", { success: true }); // update
    sb.queueFrom("custom_requests", { success: true }); // update
    sb.queueFrom("artists", { name: "Jane Artist" }); // notification lookup
    sb.queueFrom("studios", { address: "123 Main St" }); // notification lookup

    const res = await scheduleRequest(scheduleReq({ date: "2099-09-01", time: "14:00" }), params);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);

    const studiosChain = sb.getChain("studios", 1);
    expect(studiosChain.eq).toHaveBeenCalledWith("owner_id", "owner-multi-1");
  });

  it("403s when none of the owner's studios match the request's studio", async () => {
    sb.queueFrom("studios", [
      { id: "studio-A", name: "Studio A", subdomain: "studio-a", owner_id: "owner-multi-1" },
      { id: "studio-C", name: "Studio C", subdomain: "studio-c", owner_id: "owner-multi-1" },
    ]);
    sb.queueFrom("custom_requests", CUSTOM_REQUEST); // studio_id: "studio-B" — not owned by this user

    const res = await scheduleRequest(scheduleReq({ date: "2099-09-01", time: "14:00" }), params);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("Forbidden");
  });

  it("403s with a distinct message when the user owns no studio at all", async () => {
    sb.queueFrom("studios", []);

    const res = await scheduleRequest(scheduleReq({ date: "2099-09-01", time: "14:00" }), params);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("Forbidden — studio owners only");
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

// Regression coverage for a real bug found during Owner Requests approve-flow
// verification: the owner-lookup query was `.eq("owner_id", user.id)` with no
// studio_id filter, then `.maybeSingle()`. For any owner who owns more than
// one studio (a real, common case — confirmed live against production, where
// the test owner has 3 studios), Supabase's .maybeSingle() returns null
// (silently — the error is discarded by the destructure) whenever more than
// one row matches, which made isOwner false and every approval attempt
// 403 "Forbidden" for that owner, with no client-visible explanation.
// Fixed by scoping both the artists and studios lookups to
// cr.studio_id — the request's own studio — not just user.id, so exactly
// one row can ever match regardless of how many studios the owner has.
describe("POST /api/custom-requests/[id]/quote — owner scoping (multi-studio owner)", () => {
  const params = { params: { id: "req-1" } };

  function quoteReq(body: unknown) {
    return new NextRequest("http://localhost/api/custom-requests/req-1/quote", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "content-type": "application/json" },
    });
  }

  it("succeeds for an owner who owns multiple studios, approving a request in one of them", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "owner-multi-1" } as never);
    sb.queueFrom("custom_requests", {
      id: "req-1", studio_id: "studio-A", artist_id: "artist-1",
      client_name: "Alex Client", client_email: "alex@example.com", status: "pending",
    });
    // Scoped to studio-A specifically — this is what makes the lookup safe
    // even though owner-multi-1 also owns studio-B and studio-C in reality.
    sb.queueFrom("artists", null); // artistRow — this user isn't an artist
    sb.queueFrom("studios", { id: "studio-A", name: "Studio A", subdomain: "studio-a", owner_id: "owner-multi-1" });
    sb.queueFrom("artists", { name: "Jane Artist", minimum_rate_cents: 15000 }); // rate floor lookup
    sb.queueFrom("studios", { name: "Studio A", subdomain: "studio-a" }); // resolve studio name for email
    sb.queueFrom("custom_requests", { success: true }); // update

    const res = await sendQuote(quoteReq({ quote_amount: 500, deposit_amount: 100 }), params);
    expect(res.status).toBe(200);

    const artistChain = sb.getChain("artists", 1);
    expect(artistChain.eq).toHaveBeenCalledWith("user_id", "owner-multi-1");
    expect(artistChain.eq).toHaveBeenCalledWith("studio_id", "studio-A");

    const studioChain = sb.getChain("studios", 1);
    expect(studioChain.eq).toHaveBeenCalledWith("owner_id", "owner-multi-1");
    expect(studioChain.eq).toHaveBeenCalledWith("id", "studio-A");
  });

  it("still 403s a real stranger who owns no studio and is no artist here", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "stranger-1" } as never);
    sb.queueFrom("custom_requests", {
      id: "req-1", studio_id: "studio-A", artist_id: "artist-1",
      client_name: "Alex Client", client_email: "alex@example.com", status: "pending",
    });
    sb.queueFrom("artists", null); // not an artist anywhere relevant
    sb.queueFrom("studios", null); // owns no studio matching studio-A

    const res = await sendQuote(quoteReq({ quote_amount: 500, deposit_amount: 100 }), params);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("Forbidden");
  });
});
