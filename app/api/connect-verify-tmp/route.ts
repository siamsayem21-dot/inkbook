// TEMPORARY -- Stripe Connect activation prerequisite verification (and,
// gated behind an explicit query param, one-time creation of the missing
// connect-webhook endpoint). Created and removed within the same session.
//
// Read-only by default: GET just lists/retrieves, no mutation.
// GET ?create=1 additionally creates the connect-webhook endpoint, but
// ONLY if one doesn't already exist -- never overwrites/recreates an
// existing one. connect:true is required for it to actually receive
// connected-account events (not just platform-account events) -- exact
// URL/events match TASKS.md's own documented activation checklist step 3.
//
// The Stripe secret key itself is never read, logged, or returned. The
// endpoint's own webhook *signing secret* (revealed only once, at creation)
// IS returned in the JSON body when ?create=1 actually creates something --
// the caller is responsible for capturing it directly into Vercel without
// ever printing/logging it, per this session's standing secret-handling
// rule.
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe/client";

const CONNECT_WEBHOOK_URL = "https://www.inkbook.tech/api/stripe/connect-webhook";
const REQUIRED_EVENTS = ["account.updated", "checkout.session.completed"] as const;

export async function GET(request: NextRequest) {
  const stripe = getStripe();
  const result: Record<string, unknown> = {};

  try {
    await stripe.accounts.list({ limit: 1 });
    result.connectEnabledOnPlatformAccount = true;
  } catch (err) {
    result.connectEnabledOnPlatformAccount = false;
    result.connectCheckError = err instanceof Error ? err.message : String(err);
  }

  const endpoints = await stripe.webhookEndpoints.list({ limit: 20 });
  result.webhookEndpoints = endpoints.data.map((e) => ({
    url: e.url,
    status: e.status,
    enabledEvents: e.enabled_events,
  }));

  let connectHook = endpoints.data.find((e) => e.url === CONNECT_WEBHOOK_URL);
  result.connectWebhookFound = !!connectHook;

  const shouldCreate = request.nextUrl.searchParams.get("create") === "1";
  if (!connectHook && shouldCreate) {
    const created = await stripe.webhookEndpoints.create({
      url: CONNECT_WEBHOOK_URL,
      enabled_events: [...REQUIRED_EVENTS],
      connect: true,
      description: "InkBook Connect webhook -- created via one-time verified activation step",
    });
    result.created = true;
    result.createdSecret = created.secret; // revealed once, by Stripe's own design
    connectHook = created;
  } else {
    result.created = false;
  }

  if (connectHook) {
    result.connectWebhookStatus = connectHook.status;
    result.connectWebhookHasAccountUpdated = connectHook.enabled_events.includes("account.updated");
    result.connectWebhookHasCheckoutCompleted = connectHook.enabled_events.includes("checkout.session.completed");
  }

  return NextResponse.json(result);
}
