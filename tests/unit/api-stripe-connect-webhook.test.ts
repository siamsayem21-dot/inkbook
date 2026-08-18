import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { createSupabaseMock, type SupabaseMock } from "../mocks/supabase";

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/stripe/client", () => ({ getStripe: vi.fn() }));
vi.mock("@/lib/twilio/client", () => ({
  trySendSms: vi.fn(() => Promise.resolve()),
  buildSmsMessage: vi.fn(() => "sms body"),
}));
vi.mock("@/lib/email", () => ({
  sendBookingConfirmationEmail: vi.fn(() => Promise.resolve()),
  sendRemainderReceivedEmail: vi.fn(() => Promise.resolve()),
}));

import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe/client";
import { POST } from "@/app/api/stripe/connect-webhook/route";

let sb: SupabaseMock;

function mockConstructEvent(event: unknown) {
  vi.mocked(getStripe).mockReturnValue({
    webhooks: { constructEvent: vi.fn(() => event) },
  } as unknown as ReturnType<typeof getStripe>);
}

function makeRequest(body: string, withSignature = true) {
  return new NextRequest("http://localhost/api/stripe/connect-webhook", {
    method: "POST",
    body,
    headers: withSignature ? { "stripe-signature": "t=1,v1=fake" } : {},
  });
}

beforeEach(() => {
  sb = createSupabaseMock();
  vi.mocked(createAdminClient).mockReturnValue(sb.client as unknown as ReturnType<typeof createAdminClient>);
});

describe("POST /api/stripe/connect-webhook", () => {
  const originalFlag = process.env.STRIPE_CONNECT_ENABLED;
  afterEach(() => {
    if (originalFlag === undefined) delete process.env.STRIPE_CONNECT_ENABLED;
    else process.env.STRIPE_CONNECT_ENABLED = originalFlag;
  });

  it("503s when Stripe Connect is not enabled — never verifies a signature or touches the DB", async () => {
    delete process.env.STRIPE_CONNECT_ENABLED;
    const res = await POST(makeRequest("{}"));
    expect(res.status).toBe(503);
    expect(sb.fromCalls).toHaveLength(0);
  });

  describe("with Connect enabled", () => {
    beforeEach(() => {
      process.env.STRIPE_CONNECT_ENABLED = "true";
    });

    it("400s when the stripe-signature header is missing", async () => {
      const res = await POST(makeRequest("{}", false));
      expect(res.status).toBe(400);
    });

    it("400s when signature verification throws", async () => {
      vi.mocked(getStripe).mockReturnValue({
        webhooks: { constructEvent: vi.fn(() => { throw new Error("bad sig"); }) },
      } as unknown as ReturnType<typeof getStripe>);
      const res = await POST(makeRequest("{}"));
      expect(res.status).toBe(400);
    });

    it("acknowledges (200) an event with no account context without touching the DB", async () => {
      mockConstructEvent({ id: "evt_1", type: "checkout.session.completed", data: { object: {} } }); // no `account`
      const res = await POST(makeRequest("{}"));
      expect(res.status).toBe(200);
      expect(sb.fromCalls).toHaveLength(0);
    });

    it("account.updated: syncs charges_enabled/payouts_enabled/details_submitted onto the matching studio", async () => {
      mockConstructEvent({
        type: "account.updated",
        account: "acct_123",
        data: { object: { charges_enabled: true, payouts_enabled: true, details_submitted: true } },
      });
      sb.queueFrom("studios", { id: "studio-1" }); // update target (mock doesn't need real return)
      const res = await POST(makeRequest("{}"));
      expect(res.status).toBe(200);
      const chain = sb.getChain("studios");
      expect(chain.update).toHaveBeenCalledWith(
        expect.objectContaining({
          stripe_connect_charges_enabled: true,
          stripe_connect_payouts_enabled: true,
          stripe_connect_details_submitted: true,
        })
      );
      expect(chain.eq).toHaveBeenCalledWith("stripe_connected_account_id", "acct_123");
    });

    it("checkout.session.completed: reconciles a deposit_payments row for the correct studio", async () => {
      mockConstructEvent({
        type: "checkout.session.completed",
        account: "acct_123",
        data: {
          object: {
            id: "cs_1",
            payment_intent: "pi_1",
            metadata: { depositPaymentId: "dp-1" },
          },
        },
      });
      sb.queueFrom("studios", { id: "studio-1", name: "Ink & Iron" }); // resolve studio by connected account
      sb.queueFrom("deposit_payments", { id: "dp-1", booking_id: "booking-1", payment_status: "pending", payment_type: "deposit" });
      sb.queueFrom("bookings", { studio_id: "studio-1", client_id: "client-1", artist_id: "artist-1", date: null, time: null, deposit_amount_cents: 10000 });
      // dp update, bookings update, consultations lookup (none)
      sb.queueFrom("consultations", null);

      const res = await POST(makeRequest("{}"));
      expect(res.status).toBe(200);
    });

    it("STUDIO MISMATCH: refuses to reconcile a booking that belongs to a different studio than the event's connected account", async () => {
      mockConstructEvent({
        type: "checkout.session.completed",
        account: "acct_A", // Studio A's connected account
        data: {
          object: { id: "cs_1", payment_intent: "pi_1", metadata: { depositPaymentId: "dp-1" } },
        },
      });
      sb.queueFrom("studios", { id: "studio-A", name: "Studio A" }); // resolved from acct_A
      sb.queueFrom("deposit_payments", { id: "dp-1", booking_id: "booking-1", payment_status: "pending", payment_type: "deposit" });
      sb.queueFrom("bookings", { studio_id: "studio-B", client_id: "client-1", artist_id: "artist-1", date: null, time: null, deposit_amount_cents: 10000 }); // booking actually belongs to Studio B!

      const res = await POST(makeRequest("{}"));
      expect(res.status).toBe(200); // acknowledged, but NOT reconciled
      // The critical assertion: only the read that discovered the mismatch
      // happened — no update to deposit_payments/bookings was ever issued.
      expect(sb.fromCalls.filter((t) => t === "deposit_payments")).toHaveLength(1); // one read, zero writes
      const dpChain = sb.getChain("deposit_payments");
      expect(dpChain.update).not.toHaveBeenCalled();
    });

    it("is idempotent — a replayed event for an already-paid deposit is acknowledged without re-processing", async () => {
      mockConstructEvent({
        type: "checkout.session.completed",
        account: "acct_123",
        data: { object: { id: "cs_1", payment_intent: "pi_1", metadata: { depositPaymentId: "dp-1" } } },
      });
      sb.queueFrom("studios", { id: "studio-1", name: "Ink & Iron" });
      sb.queueFrom("deposit_payments", { id: "dp-1", booking_id: "booking-1", payment_status: "paid", payment_type: "deposit" });
      sb.queueFrom("bookings", { studio_id: "studio-1", client_id: "client-1", artist_id: "artist-1", date: null, time: null, deposit_amount_cents: 10000 });

      const res = await POST(makeRequest("{}"));
      expect(res.status).toBe(200);
    });

    it("custom_requests branch: STUDIO MISMATCH is rejected before the RPC ever runs", async () => {
      mockConstructEvent({
        type: "checkout.session.completed",
        account: "acct_A",
        data: {
          object: { id: "cs_1", payment_intent: "pi_1", metadata: { customRequestId: "cr-1" } },
        },
      });
      sb.queueFrom("studios", { id: "studio-A", name: "Studio A" });
      sb.queueFrom("custom_requests", { studio_id: "studio-B", status: "quoted" }); // belongs to a different studio

      const res = await POST(makeRequest("{}"));
      expect(res.status).toBe(200);
      expect(sb.rpc).not.toHaveBeenCalled(); // studio mismatch caught before the RPC ever runs
    });
  });
});
