export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import BillingClient from "./BillingClient";

const PLAN_INFO: Record<string, { label: string; price: string; artists: string }> = {
  solo:   { label: "Solo",   price: "$49/mo",  artists: "1 artist" },
  studio: { label: "Studio", price: "$79/mo",  artists: "2–5 artists" },
  pro:    { label: "Pro",    price: "$129/mo", artists: "6+ artists" },
};

type StudioBilling = { plan: string; subscription_status: string; stripe_customer_id: string | null };

export default async function BillingSettingsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: studioRaw } = await admin
    .from("studios")
    .select("plan, subscription_status, stripe_customer_id")
    .eq("owner_id", user.id)
    .maybeSingle();

  const studio = studioRaw as StudioBilling | null;
  const plan = studio?.plan ?? "solo";
  const subscriptionStatus = studio?.subscription_status ?? "trialing";
  const hasStripeCustomer = !!studio?.stripe_customer_id;
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
