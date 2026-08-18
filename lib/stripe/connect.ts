import { createAdminClient } from "@/lib/supabase/admin";

// Single flag gating EVERY new Stripe Connect surface (onboarding route,
// connect webhook, deposit-checkout's connected-account branch, and the
// Owner Settings UI section). Unset/false in production until Siam sets it
// — see the NEEDS_SIAM activation checklist. This is what makes it safe to
// deploy all this session's Connect code today with zero live behavior
// change: every new code path short-circuits before touching Stripe or the
// new `studios.stripe_connect_*` columns (which may not even exist in
// production yet — see the migration file's own comment on deploy
// ordering).
export function isStripeConnectEnabled(): boolean {
  return process.env.STRIPE_CONNECT_ENABLED === "true";
}

export type ConnectedAccountStatus = {
  accountId: string | null;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
};

/**
 * A studio is eligible to receive a Direct Charge only when it has a
 * connected account AND Stripe reports charges_enabled — an account can
 * exist but still be mid-onboarding or later restricted, so "has an id" is
 * never sufficient on its own.
 */
export function isEligibleForDirectCharge(status: ConnectedAccountStatus): boolean {
  return Boolean(status.accountId) && status.chargesEnabled;
}

/**
 * Looks up a studio's Connect status by studio id. Only ever call this when
 * isStripeConnectEnabled() is true — callers are expected to check the flag
 * first (kept as two separate functions rather than one, so the flag check
 * never depends on a DB round trip, and so a test can exercise the status
 * lookup without also having to fake the flag).
 */
export async function getStudioConnectStatus(
  supabase: ReturnType<typeof createAdminClient>,
  studioId: string
): Promise<ConnectedAccountStatus> {
  const { data } = await supabase
    .from("studios")
    .select(
      "stripe_connected_account_id, stripe_connect_charges_enabled, stripe_connect_payouts_enabled, stripe_connect_details_submitted"
    )
    .eq("id", studioId)
    .maybeSingle();

  const row = data as {
    stripe_connected_account_id: string | null;
    stripe_connect_charges_enabled: boolean;
    stripe_connect_payouts_enabled: boolean;
    stripe_connect_details_submitted: boolean;
  } | null;

  return {
    accountId: row?.stripe_connected_account_id ?? null,
    chargesEnabled: row?.stripe_connect_charges_enabled ?? false,
    payoutsEnabled: row?.stripe_connect_payouts_enabled ?? false,
    detailsSubmitted: row?.stripe_connect_details_submitted ?? false,
  };
}

// Distinct, greppable error code — never a generic Stripe error string —
// so every call site (owner-sent link, client-portal self-serve,
// messaging-thread link) can recognize this specific case and show a
// "payment setup required" message instead of a broken/misleading
// checkout button. This is the fail-closed contract: this error means
// "do not attempt to charge anyone," never "fall back to some other
// account."
export const PAYMENT_SETUP_REQUIRED_ERROR = "payment_setup_required";
