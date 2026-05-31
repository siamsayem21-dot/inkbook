import { createClient } from "@supabase/supabase-js";
import { getCurrentUser } from "@/lib/auth/config";
import BillingClient from "./BillingClient";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

const PLAN_INFO: Record<string, { label: string; price: string; artists: string }> = {
  solo:   { label: "Solo",   price: "$49/mo",  artists: "1 artist" },
  studio: { label: "Studio", price: "$79/mo",  artists: "2–5 artists" },
  pro:    { label: "Pro",    price: "$129/mo", artists: "6+ artists" },
};

export default async function BillingSettingsPage() {
  const user = await getCurrentUser();

  let plan = "solo";
  let subscriptionStatus = "trialing";
  let hasStripeCustomer = false;

  if (user) {
    const supabase = adminClient();
    const { data: studio } = await supabase
      .from("studios")
      .select("plan, subscription_status, stripe_customer_id")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (studio) {
      plan = (studio.plan as string) ?? "solo";
      subscriptionStatus = (studio.subscription_status as string) ?? "trialing";
      hasStripeCustomer = !!(studio.stripe_customer_id as string | null);
    }
  }

  const planInfo = PLAN_INFO[plan] ?? PLAN_INFO.solo;

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-bold">Billing &amp; plan</h1>
      <BillingClient
        planLabel={planInfo.label}
        planPrice={planInfo.price}
        planArtists={planInfo.artists}
        subscriptionStatus={subscriptionStatus}
        hasStripeCustomer={hasStripeCustomer}
      />
    </div>
  );
}
