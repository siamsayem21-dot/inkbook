import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const priceId: string | undefined = body?.priceId;
  const planId: string | undefined = body?.planId;

  if (!priceId || !planId) {
    return Response.json({ error: "Missing priceId or planId" }, { status: 400 });
  }

  const supabase = createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Look up existing Stripe customer ID to avoid creating duplicate customers
  const admin = createAdminClient();
  const { data: studioRaw } = await admin
    .from("studios")
    .select("stripe_customer_id")
    .eq("owner_id", user.id)
    .maybeSingle();
  const studio = studioRaw as { stripe_customer_id: string | null } | null;

  if (!process.env.STRIPE_SECRET_KEY) {
    return Response.json({ error: "Payment not configured" }, { status: 503 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  const params: Stripe.Checkout.SessionCreateParams = {
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/owner/dashboard?subscribed=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
    metadata: { userId: user.id, planId },
  };

  // Reuse existing Stripe customer so portal/billing history stays on one account
  if (studio?.stripe_customer_id) {
    params.customer = studio.stripe_customer_id;
  } else {
    params.customer_email = user.email ?? undefined;
  }

  try {
    const session = await stripe.checkout.sessions.create(params);
    return Response.json({ url: session.url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: `Stripe error: ${msg}` }, { status: 502 });
  }
}
