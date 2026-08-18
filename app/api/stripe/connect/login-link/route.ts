import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe/client";
import { isStripeConnectEnabled } from "@/lib/stripe/connect";

// Stripe Standard-account login links are single-use and short-lived, so
// they're generated fresh on every click rather than stored — this route
// is a plain browser-navigable GET (the "Manage on Stripe" link in
// StripeConnectCard.tsx), not a fetch+redirect, matching how Stripe's own
// login links are meant to be used.
//
// Gated behind isStripeConnectEnabled() — see lib/stripe/connect.ts.
export async function GET() {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  const fallback = `${baseUrl}/owner/settings/billing`;

  if (!isStripeConnectEnabled()) {
    return Response.redirect(fallback, 302);
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.redirect(`${baseUrl}/login`, 302);
  }

  const admin = createAdminClient();
  const { data: studioRaw } = await admin
    .from("studios")
    .select("stripe_connected_account_id")
    .eq("owner_id", user.id)
    .maybeSingle();

  const accountId = (studioRaw as { stripe_connected_account_id: string | null } | null)?.stripe_connected_account_id;
  if (!accountId) {
    return Response.redirect(fallback, 302);
  }

  try {
    const stripe = getStripe();
    const loginLink = await stripe.accounts.createLoginLink(accountId);
    return Response.redirect(loginLink.url, 302);
  } catch (err) {
    console.error("[stripe/connect/login-link] failed:", err);
    return Response.redirect(fallback, 302);
  }
}
