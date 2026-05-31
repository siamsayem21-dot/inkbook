import { createClient } from "@supabase/supabase-js";
import { getCurrentUser } from "@/lib/auth/config";
import DashboardStats from "@/components/owner/DashboardStats";
import BookingOverview from "@/components/owner/BookingOverview";
import RevenueChart from "@/components/owner/RevenueChart";
import PlanBanner from "@/components/owner/PlanBanner";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

const PLAN_LABELS: Record<string, string> = {
  solo: "Solo — $49/mo",
  studio: "Studio — $79/mo",
  pro: "Pro — $129/mo",
};

export default async function OwnerDashboardPage({
  searchParams,
}: {
  searchParams: { subscribed?: string };
}) {
  const user = await getCurrentUser();
  let planLabel = "Solo — $49/mo";
  let subscriptionStatus = "trialing";

  if (user) {
    const supabase = adminClient();
    const { data: studio } = await supabase
      .from("studios")
      .select("plan, subscription_status")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (studio) {
      planLabel = PLAN_LABELS[studio.plan as string] ?? studio.plan;
      subscriptionStatus = studio.subscription_status as string;
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <h1 className="text-2xl font-bold">Studio Dashboard</h1>
        {searchParams.subscribed === "true" && (
          <span className="text-xs bg-green-500/10 text-green-400 border border-green-500/20 px-3 py-1.5 rounded-full">
            Subscription active!
          </span>
        )}
      </div>

      <PlanBanner planLabel={planLabel} subscriptionStatus={subscriptionStatus} />

      <DashboardStats />
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <RevenueChart />
        <BookingOverview />
      </div>
    </div>
  );
}
