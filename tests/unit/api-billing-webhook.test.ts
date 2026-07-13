import { describe, it, expect, beforeEach, vi } from "vitest";
import { createSupabaseMock, type SupabaseMock } from "../mocks/supabase";

const constructEvent = vi.fn();

vi.mock("stripe", () => ({
  default: vi.fn().mockImplementation(function StripeMock(this: { webhooks: unknown }) {
    this.webhooks = { constructEvent };
  }),
}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/twilio/client", () => ({
  trySendSms: vi.fn(() => Promise.resolve()),
  buildSmsMessage: vi.fn(() => "sms body"),
}));

import { createAdminClient } from "@/lib/supabase/admin";
import { trySendSms } from "@/lib/twilio/client";
import { POST } from "@/app/api/billing/webhook/route";

let sb: SupabaseMock;

function makeRequest(withSignature = true) {
  return new Request("http://localhost/api/billing/webhook", {
    method: "POST",
    body: "{}",
    headers: withSignature ? { "stripe-signature": "t=1,v1=fake" } : {},
  });
}

beforeEach(() => {
  sb = createSupabaseMock();
  vi.mocked(createAdminClient).mockReturnValue(sb.client as unknown as ReturnType<typeof createAdminClient>);
  vi.mocked(trySendSms).mockClear();
  constructEvent.mockReset();
});

describe("POST /api/billing/webhook — signature handling", () => {
  it("400s when the stripe-signature header is missing", async () => {
    const res = await POST(makeRequest(false));
    expect(res.status).toBe(400);
  });

  it("400s when signature verification throws", async () => {
    constructEvent.mockImplementation(() => {
      throw new Error("bad sig");
    });
    const res = await POST(makeRequest());
    expect(res.status).toBe(400);
  });

  it("acknowledges unhandled event types", async () => {
    constructEvent.mockReturnValue({ type: "invoice.paid", data: { object: {} } });
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    expect(sb.fromCalls).toHaveLength(0);
  });
});

describe("POST /api/billing/webhook — checkout.session.completed", () => {
  it("skips entirely when depositPaymentId is present (owned by the deposit webhook)", async () => {
    constructEvent.mockReturnValue({
      type: "checkout.session.completed",
      data: { object: { metadata: { depositPaymentId: "dp_1", bookingId: "bk_1" } } },
    });
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    expect(sb.fromCalls).toHaveLength(0);
  });

  it("confirms a legacy booking deposit and sends SMS", async () => {
    constructEvent.mockReturnValue({
      type: "checkout.session.completed",
      data: { object: { payment_intent: "pi_1", metadata: { bookingId: "bk_legacy" } } },
    });
    sb.queueFrom("bookings", { deposit_paid: false }); // idempotency check — not yet paid
    sb.queueFrom("bookings", { success: true }); // update confirmed
    sb.queueFrom("deposits", { success: true }); // update paid
    sb.queueFrom("bookings", {
      client_id: "client-1", artist_id: "artist-1", studio_id: "studio-1",
      date: "2026-08-01", time: "10:00:00", deposit_amount_cents: 5000,
    }); // re-fetch
    sb.queueFrom("clients", { full_name: "Alex", email: "alex@example.com", phone: "5551234567" });
    sb.queueFrom("artists", { name: "Jane Artist" });
    sb.queueFrom("studios", { name: "Ink & Iron", address: null });

    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    expect(trySendSms).toHaveBeenCalledWith("5551234567", "sms body");
  });

  it("is idempotent — a retried event for an already-confirmed legacy booking is skipped without re-notifying", async () => {
    constructEvent.mockReturnValue({
      type: "checkout.session.completed",
      data: { object: { payment_intent: "pi_1", metadata: { bookingId: "bk_legacy" } } },
    });
    sb.queueFrom("bookings", { deposit_paid: true }); // idempotency check — already processed

    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    expect(sb.fromCalls).not.toContain("deposits");
    expect(trySendSms).not.toHaveBeenCalled();
  });

  it("skips the subscription branch when no userId is present in metadata", async () => {
    constructEvent.mockReturnValue({
      type: "checkout.session.completed",
      data: { object: { metadata: {} } },
    });
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    expect(sb.fromCalls).not.toContain("studios");
  });

  it("activates the studio subscription when userId is present", async () => {
    constructEvent.mockReturnValue({
      type: "checkout.session.completed",
      data: {
        object: {
          customer: "cus_1", subscription: "sub_1",
          metadata: { userId: "owner-1", planId: "studio" },
        },
      },
    });
    sb.queueFrom("studios", { success: true });
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    const chain = sb.getChain("studios");
    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ subscription_status: "active", plan: "studio" })
    );
    expect(chain.eq).toHaveBeenCalledWith("owner_id", "owner-1");
  });
});

describe("POST /api/billing/webhook — subscription lifecycle", () => {
  it("maps price id to plan and status on customer.subscription.created", async () => {
    constructEvent.mockReturnValue({
      type: "customer.subscription.created",
      data: {
        object: {
          id: "sub_1", customer: "cus_1", status: "trialing",
          items: { data: [{ price: { id: "price_pro" } }] },
        },
      },
    });
    sb.queueFrom("studios", { success: true });
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    const chain = sb.getChain("studios");
    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ subscription_status: "trialing", plan: "pro" })
    );
  });

  it.each([
    ["active", "active"],
    ["trialing", "trialing"],
    ["past_due", "past_due"],
    ["canceled", "canceled"],
    ["something_unrecognized", "unpaid"],
  ])("maps subscription status '%s' -> local status '%s' on update", async (stripeStatus, localStatus) => {
    constructEvent.mockReturnValue({
      type: "customer.subscription.updated",
      data: {
        object: {
          id: "sub_1", customer: "cus_1", status: stripeStatus,
          items: { data: [{ price: { id: "price_solo" } }] },
        },
      },
    });
    sb.queueFrom("studios", { success: true });
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    const chain = sb.getChain("studios");
    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ subscription_status: localStatus })
    );
  });

  it("cancels the studio subscription on customer.subscription.deleted", async () => {
    constructEvent.mockReturnValue({
      type: "customer.subscription.deleted",
      data: { object: { customer: "cus_1" } },
    });
    sb.queueFrom("studios", { success: true });
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    const chain = sb.getChain("studios");
    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ subscription_status: "canceled" })
    );
    expect(chain.eq).toHaveBeenCalledWith("stripe_customer_id", "cus_1");
  });
});
