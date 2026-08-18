import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createSupabaseMock, type SupabaseMock } from "../mocks/supabase";

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));

import { createAdminClient } from "@/lib/supabase/admin";
import {
  isStripeConnectEnabled,
  isEligibleForDirectCharge,
  getStudioConnectStatus,
  PAYMENT_SETUP_REQUIRED_ERROR,
} from "@/lib/stripe/connect";

describe("isStripeConnectEnabled", () => {
  const original = process.env.STRIPE_CONNECT_ENABLED;
  afterEach(() => {
    if (original === undefined) delete process.env.STRIPE_CONNECT_ENABLED;
    else process.env.STRIPE_CONNECT_ENABLED = original;
  });

  it("is false when the env var is unset (the production default today)", () => {
    delete process.env.STRIPE_CONNECT_ENABLED;
    expect(isStripeConnectEnabled()).toBe(false);
  });

  it("is false for any value other than the literal string 'true'", () => {
    process.env.STRIPE_CONNECT_ENABLED = "1";
    expect(isStripeConnectEnabled()).toBe(false);
    process.env.STRIPE_CONNECT_ENABLED = "TRUE";
    expect(isStripeConnectEnabled()).toBe(false);
  });

  it("is true only when explicitly set to 'true'", () => {
    process.env.STRIPE_CONNECT_ENABLED = "true";
    expect(isStripeConnectEnabled()).toBe(true);
  });
});

describe("isEligibleForDirectCharge", () => {
  it("is false with no connected account", () => {
    expect(isEligibleForDirectCharge({ accountId: null, chargesEnabled: false, payoutsEnabled: false, detailsSubmitted: false })).toBe(false);
  });

  it("is false with a connected account but charges not enabled", () => {
    expect(isEligibleForDirectCharge({ accountId: "acct_1", chargesEnabled: false, payoutsEnabled: false, detailsSubmitted: true })).toBe(false);
  });

  it("is true only with both a connected account and charges enabled", () => {
    expect(isEligibleForDirectCharge({ accountId: "acct_1", chargesEnabled: true, payoutsEnabled: false, detailsSubmitted: true })).toBe(true);
  });
});

describe("getStudioConnectStatus", () => {
  let sb: SupabaseMock;
  beforeEach(() => {
    sb = createSupabaseMock();
  });

  it("returns all-false/null defaults when the studio row is missing", async () => {
    const status = await getStudioConnectStatus(sb.client as unknown as ReturnType<typeof createAdminClient>, "studio-x");
    expect(status).toEqual({ accountId: null, chargesEnabled: false, payoutsEnabled: false, detailsSubmitted: false });
  });

  it("maps the studio row's Connect columns correctly", async () => {
    sb.queueFrom("studios", {
      stripe_connected_account_id: "acct_1",
      stripe_connect_charges_enabled: true,
      stripe_connect_payouts_enabled: false,
      stripe_connect_details_submitted: true,
    });
    const status = await getStudioConnectStatus(sb.client as unknown as ReturnType<typeof createAdminClient>, "studio-1");
    expect(status).toEqual({ accountId: "acct_1", chargesEnabled: true, payoutsEnabled: false, detailsSubmitted: true });
  });
});

describe("PAYMENT_SETUP_REQUIRED_ERROR", () => {
  it("is a stable, greppable error code", () => {
    expect(PAYMENT_SETUP_REQUIRED_ERROR).toBe("payment_setup_required");
  });
});
