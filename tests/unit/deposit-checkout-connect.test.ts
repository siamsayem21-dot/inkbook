import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createSupabaseMock, type SupabaseMock } from "../mocks/supabase";

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/stripe/client", () => ({ getStripe: vi.fn() }));

import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe/client";
import { getOrCreateDepositCheckoutSession } from "@/lib/stripe/deposit-checkout";

let sb: SupabaseMock;
let createSpy: ReturnType<typeof vi.fn>;

const BASE_PARAMS = {
  bookingId: "booking-1",
  depositAmountCents: 10000,
  artistId: "artist-1",
  artistName: "Jane Artist",
  studioName: "Ink & Iron",
  clientEmail: "client@example.com",
  successUrl: "https://example.com/success",
  cancelUrl: "https://example.com/cancel",
};

beforeEach(() => {
  sb = createSupabaseMock();
  vi.mocked(createAdminClient).mockReturnValue(sb.client as unknown as ReturnType<typeof createAdminClient>);
  createSpy = vi.fn(() => Promise.resolve({ id: "cs_1", url: "https://checkout.stripe.com/cs_1" }));
  vi.mocked(getStripe).mockReturnValue({
    checkout: { sessions: { create: createSpy, retrieve: vi.fn() } },
  } as unknown as ReturnType<typeof getStripe>);
});

describe("getOrCreateDepositCheckoutSession — Stripe Connect gating", () => {
  const originalFlag = process.env.STRIPE_CONNECT_ENABLED;
  afterEach(() => {
    if (originalFlag === undefined) delete process.env.STRIPE_CONNECT_ENABLED;
    else process.env.STRIPE_CONNECT_ENABLED = originalFlag;
  });

  it("with the flag off (production default today), behaves exactly as before — no bookings lookup, no stripeAccount passed", async () => {
    delete process.env.STRIPE_CONNECT_ENABLED;
    sb.queueFrom("deposit_payments", []); // existing-session reuse lookup — none
    sb.queueFrom("deposit_payments", []); // pending-row lookup — none
    sb.queueFrom("deposit_payments", { id: "dp-1" }); // insert

    const result = await getOrCreateDepositCheckoutSession(BASE_PARAMS);

    expect(result.checkoutUrl).toBe("https://checkout.stripe.com/cs_1");
    expect(sb.fromCalls).not.toContain("bookings"); // never queries booking->studio when Connect is off
    expect(createSpy).toHaveBeenCalledWith(expect.anything(), undefined);
  });

  it("with the flag on and the studio eligible, creates a Direct Charge on the studio's connected account", async () => {
    process.env.STRIPE_CONNECT_ENABLED = "true";
    sb.queueFrom("deposit_payments", []); // existing-session reuse — none
    sb.queueFrom("bookings", { studio_id: "studio-1" }); // studio lookup for Connect check
    sb.queueFrom("studios", {
      stripe_connected_account_id: "acct_123",
      stripe_connect_charges_enabled: true,
      stripe_connect_payouts_enabled: true,
      stripe_connect_details_submitted: true,
    });
    sb.queueFrom("deposit_payments", []); // pending-row lookup — none
    sb.queueFrom("deposit_payments", { id: "dp-1" }); // insert

    const result = await getOrCreateDepositCheckoutSession(BASE_PARAMS);

    expect(result.checkoutUrl).toBe("https://checkout.stripe.com/cs_1");
    expect(createSpy).toHaveBeenCalledWith(expect.anything(), { stripeAccount: "acct_123" });
  });

  it("fails closed with PAYMENT_SETUP_REQUIRED_ERROR when the studio has no connected account — never falls back to the platform account", async () => {
    process.env.STRIPE_CONNECT_ENABLED = "true";
    sb.queueFrom("deposit_payments", []); // existing-session reuse — none
    sb.queueFrom("bookings", { studio_id: "studio-1" });
    sb.queueFrom("studios", null); // no connected account

    const result = await getOrCreateDepositCheckoutSession(BASE_PARAMS);

    expect(result.error).toBe("payment_setup_required");
    expect(result.checkoutUrl).toBeUndefined();
    expect(createSpy).not.toHaveBeenCalled();
  });

  it("fails closed when charges are not yet enabled on an existing connected account", async () => {
    process.env.STRIPE_CONNECT_ENABLED = "true";
    sb.queueFrom("deposit_payments", []);
    sb.queueFrom("bookings", { studio_id: "studio-1" });
    sb.queueFrom("studios", {
      stripe_connected_account_id: "acct_123",
      stripe_connect_charges_enabled: false,
      stripe_connect_payouts_enabled: false,
      stripe_connect_details_submitted: true,
    });

    const result = await getOrCreateDepositCheckoutSession(BASE_PARAMS);

    expect(result.error).toBe("payment_setup_required");
    expect(createSpy).not.toHaveBeenCalled();
  });

  it("returns an error when the booking itself doesn't exist (Connect enabled)", async () => {
    process.env.STRIPE_CONNECT_ENABLED = "true";
    sb.queueFrom("deposit_payments", []);
    sb.queueFrom("bookings", null);

    const result = await getOrCreateDepositCheckoutSession(BASE_PARAMS);

    expect(result.error).toBe("Booking not found");
    expect(createSpy).not.toHaveBeenCalled();
  });
});
