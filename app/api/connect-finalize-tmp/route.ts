// TEMPORARY -- Stripe Connect activation finalization checks.
// Created and removed within the same session. READ-ONLY only: Stripe
// list/retrieve calls and Supabase SELECTs. Never creates, updates, or
// deletes anything on Stripe or in the database.
//
// Never reads, logs, or returns any secret value (STRIPE_SECRET_KEY,
// STRIPE_CONNECT_WEBHOOK_SECRET, SUPABASE_SERVICE_ROLE_KEY) -- only
// derived, non-secret facts (key mode prefix, webhook URL/status/events,
// column existence).
//
// GET ?create=1 additionally creates a connect-webhook endpoint scoped to
// whichever Stripe mode STRIPE_SECRET_KEY is actually in (test today) --
// but ONLY if none already exists in that same mode. Never overwrites or
// touches any existing endpoint (including the separate live-mode one).
// The resulting signing secret (revealed only once, at creation, by
// Stripe's own design) is returned in the JSON body for the caller to
// pipe directly into Vercel without ever printing/logging it.
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe/client";
import { createAdminClient } from "@/lib/supabase/admin";

const CONNECT_WEBHOOK_URL = "https://www.inkbook.tech/api/stripe/connect-webhook";
const REQUIRED_EVENTS = ["account.updated", "checkout.session.completed"] as const;

export async function GET(request: NextRequest) {
  const result: Record<string, unknown> = {};

  // 1. Key mode -- which Stripe mode is STRIPE_SECRET_KEY actually in?
  // Never reads the rest of the key.
  const rawKey = process.env.STRIPE_SECRET_KEY || "";
  result.stripeKeyMode = rawKey.startsWith("sk_live_")
    ? "live"
    : rawKey.startsWith("sk_test_")
    ? "test"
    : "unknown";
  result.connectWebhookSecretConfigured = !!process.env.STRIPE_CONNECT_WEBHOOK_SECRET;
  result.connectEnabledFlagCurrentlySet = process.env.STRIPE_CONNECT_ENABLED === "true";

  // 2. Is Connect enabled on the platform account?
  const stripe = getStripe();
  try {
    await stripe.accounts.list({ limit: 1 });
    result.connectEnabledOnPlatformAccount = true;
  } catch (err) {
    result.connectEnabledOnPlatformAccount = false;
    result.connectCheckError = err instanceof Error ? err.message : String(err);
  }

  // 3. The connect-webhook endpoint itself.
  const endpoints = await stripe.webhookEndpoints.list({ limit: 20 });
  result.allEndpoints = endpoints.data.map((e) => ({
    url: e.url,
    status: e.status,
    livemode: e.livemode,
    enabledEvents: e.enabled_events,
  }));

  let hook = endpoints.data.find((e) => e.url === CONNECT_WEBHOOK_URL);
  result.connectWebhookFound = !!hook;

  const shouldCreate = request.nextUrl.searchParams.get("create") === "1";
  if (!hook && shouldCreate) {
    const created = await stripe.webhookEndpoints.create({
      url: CONNECT_WEBHOOK_URL,
      enabled_events: [...REQUIRED_EVENTS],
      connect: true,
      description:
        "InkBook Connect webhook (test-mode, matches STRIPE_SECRET_KEY) -- created via one-time verified activation step",
    });
    result.created = true;
    result.createdSecret = created.secret;
    hook = created;
  } else {
    result.created = false;
  }

  if (hook) {
    result.connectWebhook = {
      id: hook.id,
      status: hook.status,
      livemode: hook.livemode,
      apiVersion: hook.api_version,
      created: hook.created,
      hasAccountUpdated: hook.enabled_events.includes(REQUIRED_EVENTS[0]),
      hasCheckoutCompleted: hook.enabled_events.includes(REQUIRED_EVENTS[1]),
      eventCount: hook.enabled_events.length,
      description: hook.description,
    };
  }
  // Note: Stripe's API never returns a "secret" field on list/retrieve,
  // only once at creation time -- so this route cannot fetch or compare
  // the actual current signing secret value of a pre-existing endpoint.
  result.signingSecretRetrievableViaApi = false;

  // 4. studios table -- confirm the 5 Connect columns exist live.
  try {
    const admin = createAdminClient();
    const { error } = await admin
      .from("studios")
      .select(
        "stripe_connected_account_id, stripe_connect_charges_enabled, stripe_connect_payouts_enabled, stripe_connect_details_submitted, stripe_connect_updated_at"
      )
      .limit(1);
    result.studiosConnectColumnsExist = !error;
    if (error) result.studiosConnectColumnsError = error.message;
  } catch (err) {
    result.studiosConnectColumnsExist = false;
    result.studiosConnectColumnsError = err instanceof Error ? err.message : String(err);
  }

  return NextResponse.json(result);
}
