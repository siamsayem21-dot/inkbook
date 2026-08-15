export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getStudioId } from "@/lib/auth/config";
import { createAdminClient } from "@/lib/supabase/admin";
import BillingClient from "./BillingClient";

const PLAN_INFO: Record<string, { label: string; price: string; artists: string }> = {
  solo:   { label: "Solo",   price: "$49/mo",  artists: "1 artist" },
  studio: { label: "Studio", price: "$79/mo",  artists: "2–5 artists" },
  pro:    { label: "Pro",    price: "$129/mo", artists: "6+ artists" },
};

type StudioBilling = { plan: string; subscription_status: string; stripe_customer_id: string | null };

export default async function BillingSettingsPage() {
  const studioId = await getStudioId();
  if (!studioId) redirect("/login");

  const admin = createAdminClient();
  const { data: studioRaw } = await admin
    .from("studios")
    .select("plan, subscription_status, stripe_customer_id")
    .eq("id", studioId)
    .maybeSingle();

  const studio = studioRaw as StudioBilling | null;
  const plan = studio?.plan ?? "solo";
  const subscriptionStatus = studio?.subscription_status ?? "trialing";
  const hasStripeCustomer = !!studio?.stripe_customer_id;
  const planInfo = PLAN_INFO[plan] ?? PLAN_INFO.solo;

  return (
    <div className="-m-4 -mt-16 md:-m-8 min-h-[calc(100vh-3rem)] md:min-h-screen" style={{ background: "#FAF9FC" }}>
      <div className="p-4 pt-16 md:p-8 space-y-6 max-w-xl">
        <h1 className="text-2xl md:text-3xl font-bold text-zinc-900">Billing &amp; plan</h1>
        <BillingClient
          planLabel={planInfo.label}
          planPrice={planInfo.price}
          planArtists={planInfo.artists}
          subscriptionStatus={subscriptionStatus}
          hasStripeCustomer={hasStripeCustomer}
        />
      </div>
    </div>
  );
}
