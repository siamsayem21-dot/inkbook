import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe/client";
import { isStripeConnectEnabled } from "@/lib/stripe/connect";

// Creates (or resumes) a Standard Stripe Connect account for the caller's
// own studio and returns a Stripe-hosted Account Link URL. Two entry
// points share the same logic (see MASTER_PLAN.md's payment architecture
// plan, Section 4):
//   - POST: called via fetch from the "Connect Stripe" button in Owner
//     Settings — returns JSON `{ url }`, the client does the redirect.
//   - GET: this route is also the Account Link's own `refresh_url` — Stripe
//     redirects the browser here directly (a real navigation, not fetch)
//     when a link has expired, so this issues a fresh one and 302s to it.
//
// Gated behind isStripeConnectEnabled(): with the flag off (the production
// default until Siam completes the activation checklist), both entry
// points return/redirect to an error without ever calling
// stripe.accounts.create() — so this route existing in production today
// creates zero real Stripe accounts, matching "do not create Stripe
// accounts yet."
type OnboardResult = { url: string } | { error: string; status: number };

async function createOrResumeOnboardingLink(): Promise<OnboardResult> {
  if (!isStripeConnectEnabled()) {
    return { error: "Stripe Connect is not yet enabled.", status: 503 };
  }

  const supabase = createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Not authenticated", status: 401 };
  }

  const admin = createAdminClient();
  const { data: studioRaw } = await admin
    .from("studios")
    .select("id, stripe_connected_account_id")
    .eq("owner_id", user.id)
    .maybeSingle();

  const studio = studioRaw as { id: string; stripe_connected_account_id: string | null } | null;
  if (!studio) {
    return { error: "No studio found for this account", status: 404 };
  }

  let stripe;
  try {
    stripe = getStripe();
  } catch {
    return { error: "Payment is not configured", status: 503 };
  }

  let accountId = studio.stripe_connected_account_id;

  if (!accountId) {
    try {
      const account = await stripe.accounts.create({ type: "standard" });
      accountId = account.id;

      const { error: updateError } = await admin
        .from("studios")
        .update({ stripe_connected_account_id: accountId } as never)
        .eq("id", studio.id);

      if (updateError) {
        console.error("[stripe/connect/onboard] failed to save account id:", updateError.message);
        return { error: "Failed to save connected account", status: 500 };
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown Stripe error";
      console.error("[stripe/connect/onboard] account creation failed:", msg);
      return { error: `Stripe error: ${msg}`, status: 502 };
    }
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

  try {
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${baseUrl}/api/stripe/connect/onboard`,
      return_url: `${baseUrl}/owner/settings/billing?connect=return`,
      type: "account_onboarding",
    });
    return { url: accountLink.url };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown Stripe error";
    console.error("[stripe/connect/onboard] account link creation failed:", msg);
    return { error: `Stripe error: ${msg}`, status: 502 };
  }
}

export async function POST() {
  const result = await createOrResumeOnboardingLink();
  if ("error" in result) {
    return Response.json({ error: result.error }, { status: result.status });
  }
  return Response.json({ url: result.url });
}

export async function GET() {
  const result = await createOrResumeOnboardingLink();
  if ("error" in result) {
    // A real browser navigation landed here (Stripe's refresh_url) — no JS
    // on the other end to read a JSON error, so send them somewhere a
    // human can see what happened instead of a bare JSON error page.
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ??
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
    return Response.redirect(
      `${baseUrl}/owner/settings/billing?connect=error&reason=${encodeURIComponent(result.error)}`,
      302
    );
  }
  return Response.redirect(result.url, 302);
}
