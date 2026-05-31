import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST() {
  const supabase = createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: studioRaw } = await admin
    .from("studios")
    .select("stripe_customer_id")
    .eq("owner_id", user.id)
    .maybeSingle();
  const studio = studioRaw as { stripe_customer_id: string | null } | null;

  if (!studio?.stripe_customer_id) {
    return Response.json({ error: "No billing account found. Please subscribe first." }, { status: 404 });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return Response.json({ error: "Payment not configured" }, { status: 503 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: studio.stripe_customer_id as string,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/owner/settings/billing`,
    });
    return Response.json({ url: session.url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: `Stripe error: ${msg}` }, { status: 502 });
  }
}
