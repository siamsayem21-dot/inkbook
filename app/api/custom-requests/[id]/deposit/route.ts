import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit, getClientIp, rateLimitedResponse } from "@/lib/rate-limit";
import {
  isStripeConnectEnabled,
  getStudioConnectStatus,
  isEligibleForDirectCharge,
  PAYMENT_SETUP_REQUIRED_ERROR,
} from "@/lib/stripe/connect";
import { withIdempotency } from "@/lib/idempotency";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Limit per-request-ID to prevent Stripe session spam
  const rl = checkRateLimit(`custom-deposit:${getClientIp(request)}:${params.id}`, 3, 60_000);
  if (!rl.allowed) return rateLimitedResponse(rl.retryAfter);

  const body = await request.json();
  const { studioSlug } = body as { studioSlug?: string };

  if (!studioSlug) {
    return NextResponse.json({ error: "Missing studioSlug" }, { status: 400 });
  }

  let stripe;
  try {
    stripe = getStripe();
  } catch {
    return NextResponse.json(
      { error: "Payment is not configured. Please contact the studio." },
      { status: 503 }
    );
  }

  const supabase = createAdminClient();

  const { data: reqData } = await supabase
    .from("custom_requests")
    .select("id, studio_id, artist_id, client_name, client_email, client_phone, deposit_amount, status, stripe_payment_intent_id")
    .eq("id", params.id)
    .single();

  if (!reqData) return NextResponse.json({ error: "Request not found" }, { status: 404 });

  const cr = reqData as {
    id: string;
    studio_id: string;
    artist_id: string | null;
    client_name: string;
    client_email: string;
    client_phone: string | null;
    deposit_amount: number | null;
    status: string;
    stripe_payment_intent_id: string | null;
  };

  if (cr.status !== "quoted") {
    return NextResponse.json({ error: "This request does not have a pending quote" }, { status: 409 });
  }

  // Defense in depth: stripe_payment_intent_id is only ever set once this
  // request's deposit has actually been paid (see the process_custom_request_deposit
  // RPC) — normally redundant with the status check above (the RPC sets both
  // atomically), but cheap insurance against ever creating a second Checkout
  // Session for an already-paid request.
  if (cr.stripe_payment_intent_id) {
    return NextResponse.json({ error: "This request has already been paid" }, { status: 409 });
  }

  if (!cr.deposit_amount || cr.deposit_amount <= 0) {
    return NextResponse.json({ error: "No deposit amount set on this request" }, { status: 400 });
  }

  // Blacklist check — same is_client_blacklisted() RPC continueToDeposit()
  // (the consultation-flow equivalent) is backed by. Gated here at deposit
  // time, not at initial custom-request submission — matches that same
  // precedent (see app/portal/[studio]/projects/[id]/actions.ts).
  const { data: isBlacklisted } = await supabase.rpc("is_client_blacklisted" as never, {
    p_studio_id: cr.studio_id,
    p_email: cr.client_email,
    p_phone: cr.client_phone,
  } as never);
  if (isBlacklisted) {
    return NextResponse.json(
      { error: "This request cannot be completed. Please contact the studio directly." },
      { status: 403 }
    );
  }

  const [{ data: studioData }, { data: artistData }] = await Promise.all([
    supabase.from("studios").select("name").eq("id", cr.studio_id).single(),
    cr.artist_id
      ? supabase.from("artists").select("name").eq("id", cr.artist_id).single()
      : Promise.resolve({ data: null }),
  ]);

  const studioName = (studioData as { name: string } | null)?.name ?? "Studio";
  const artistName = (artistData as { name: string } | null)?.name ?? "Artist";

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

  const depositCents = Math.round(cr.deposit_amount * 100);

  // Stripe Connect (subscription-only payment architecture) — same
  // fail-closed contract as lib/stripe/deposit-checkout.ts: gated behind
  // isStripeConnectEnabled() (off in production today, so this block is
  // fully inert until Siam activates it), and when enabled, NEVER falls
  // back to the platform account if the studio isn't eligible.
  let stripeAccountOption: { stripeAccount: string } | undefined;
  if (isStripeConnectEnabled()) {
    const status = await getStudioConnectStatus(supabase, cr.studio_id);
    if (!isEligibleForDirectCharge(status)) {
      return NextResponse.json({ error: PAYMENT_SETUP_REQUIRED_ERROR }, { status: 402 });
    }
    stripeAccountOption = { stripeAccount: status.accountId! };
  }

  // Idempotency (bug found via manual verification, fixed here): this route
  // previously created a brand-new Stripe Checkout Session on every call
  // with no reuse/dedup at all, unlike its sibling
  // lib/stripe/deposit-checkout.ts. That meant a duplicate click, a
  // double-submit, or simply the browser's post-payment redirect landing
  // before the webhook has flipped `status` away from "quoted" could all
  // create a second real Checkout Session for the same request. Keyed by
  // the request id from the URL (server-derived, never client-supplied),
  // not by anything the caller sends — a second call within the window
  // returns the exact same checkout URL instead of creating a new session.
  // Real Stripe/network failures are never cached (shouldCache), so a
  // genuine transient error can still be retried immediately.
  const result = await withIdempotency(
    `custom-request-deposit:${params.id}`,
    async (): Promise<{ url?: string; error?: string; status: number }> => {
      try {
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ["card"],
          customer_email: cr.client_email,
          line_items: [
            {
              price_data: {
                currency: "usd",
                product_data: {
                  name: `Custom Tattoo Deposit — ${artistName}`,
                  description: `${studioName} · Non-refundable deposit to confirm your custom appointment`,
                },
                unit_amount: depositCents,
              },
              quantity: 1,
            },
          ],
          mode: "payment",
          success_url: `${baseUrl}/book/${studioSlug}/request/${params.id}?deposit=paid`,
          cancel_url: `${baseUrl}/book/${studioSlug}/request/${params.id}?deposit=cancelled`,
          metadata: { customRequestId: params.id, studioSlug },
        }, stripeAccountOption);

        return { url: session.url ?? undefined, status: 200 };
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown Stripe error";
        console.error("[custom-requests/deposit] Stripe session creation failed:", msg);
        return { error: `Stripe error: ${msg}`, status: 502 };
      }
    },
    { ttlMs: 5 * 60_000, shouldCache: (r) => Boolean(r.url) }
  );

  return NextResponse.json(
    result.url ? { url: result.url } : { error: result.error ?? "Failed to create checkout session" },
    { status: result.status }
  );
}
