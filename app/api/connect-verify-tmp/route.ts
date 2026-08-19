// TEMPORARY -- Stripe Connect activation prerequisite verification.
// Created and removed within the same session. READ-ONLY Stripe API calls
// only (list/retrieve) -- never creates, updates, or deletes anything.
// Runs server-side against the real Production STRIPE_SECRET_KEY; the key
// itself is never read, logged, or returned -- only derived, non-secret
// facts about existing configuration (webhook URLs/event names are not
// secret, they're what's already publicly registered).
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe/client";

export async function GET() {
  const stripe = getStripe();
  const result: Record<string, unknown> = {};

  // 1. Is Connect enabled on the platform account? Listing connected
  // accounts (even zero results) only succeeds if Connect is enabled;
  // Stripe returns a specific error otherwise.
  try {
    await stripe.accounts.list({ limit: 1 });
    result.connectEnabledOnPlatformAccount = true;
  } catch (err) {
    result.connectEnabledOnPlatformAccount = false;
    result.connectCheckError = err instanceof Error ? err.message : String(err);
  }

  // 2. Webhook endpoints currently registered -- URL + event list only,
  // nothing secret (no signing secrets are ever included in this API's
  // response).
  const endpoints = await stripe.webhookEndpoints.list({ limit: 20 });
  result.webhookEndpoints = endpoints.data.map((e) => ({
    url: e.url,
    status: e.status,
    enabledEvents: e.enabled_events,
  }));

  const connectHook = endpoints.data.find((e) => e.url.includes("connect-webhook"));
  result.connectWebhookFound = !!connectHook;
  if (connectHook) {
    result.connectWebhookStatus = connectHook.status;
    result.connectWebhookHasAccountUpdated = connectHook.enabled_events.includes("account.updated");
    result.connectWebhookHasCheckoutCompleted = connectHook.enabled_events.includes("checkout.session.completed");
  }

  return NextResponse.json(result);
}
