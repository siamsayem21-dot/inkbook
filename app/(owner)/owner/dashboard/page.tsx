import { createClient } from "@supabase/supabase-js";
import { getCurrentUser } from "@/lib/auth/config";
import DashboardStats from "@/components/owner/DashboardStats";
import BookingOverview from "@/components/owner/BookingOverview";
import RevenueChart, { type MonthRevenue } from "@/components/owner/RevenueChart";
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

function fmtMoney(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

function monthRange(offsetMonths: number) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + offsetMonths;
  const first = new Date(y, m, 1);
  const last = new Date(y, m + 1, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    first: `${first.getFullYear()}-${pad(first.getMonth() + 1)}-01`,
    last:  `${last.getFullYear()}-${pad(last.getMonth() + 1)}-${pad(last.getDate())}`,
    label: first.toLocaleDateString("en-US", { month: "short" }),
  };
}

export default async function OwnerDashboardPage({
  searchParams,
}: {
  searchParams: { subscribed?: string };
}) {
  const user = await getCurrentUser();
  let planLabel = "Solo — $49/mo";
  let subscriptionStatus = "trialing";

  const supabase = adminClient();

  type StudioRow = { id: string; plan: string; subscription_status: string };
  let studio: StudioRow | null = null;

  if (user) {
    const { data } = await supabase
      .from("studios")
      .select("id, plan, subscription_status")
      .eq("owner_id", user.id)
      .maybeSingle();

    studio = data as StudioRow | null;
    if (studio) {
      planLabel = PLAN_LABELS[studio.plan] ?? studio.plan;
      subscriptionStatus = studio.subscription_status;
    }
  }

  // ── Real stats ───────────────────────────────────────────────────────────────
  const studioId = studio?.id ?? null;

  const thisMonth = monthRange(0);

  const [
    { count: totalBookings },
    { count: activeArtists },
    { data: monthBookings },
    { data: noShowData },
    { data: bookingsByStatus },
  ] = await Promise.all([
    studioId
      ? supabase.from("bookings").select("id", { count: "exact", head: true }).eq("studio_id", studioId)
      : Promise.resolve({ count: 0, data: null, error: null }),

    studioId
      ? supabase.from("artists").select("id", { count: "exact", head: true }).eq("studio_id", studioId).eq("is_active", true)
      : Promise.resolve({ count: 0, data: null, error: null }),

    studioId
      ? supabase.from("bookings").select("deposit_amount").eq("studio_id", studioId)
          .in("status", ["confirmed", "completed", "no_show"])
          .gte("date", thisMonth.first).lte("date", thisMonth.last)
      : Promise.resolve({ data: [], error: null }),

    studioId
      ? supabase.from("bookings").select("status").eq("studio_id", studioId)
          .in("status", ["confirmed", "completed", "no_show"])
      : Promise.resolve({ data: [], error: null }),

    studioId
      ? supabase.from("bookings").select("status").eq("studio_id", studioId)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const monthRevenue = ((monthBookings ?? []) as { deposit_amount: number }[])
    .reduce((s, b) => s + (b.deposit_amount ?? 0), 0);

  const noShowRows = (noShowData ?? []) as { status: string }[];
  const noShows = noShowRows.filter((b) => b.status === "no_show").length;
  const noShowTotal = noShowRows.length;
  const noShowRate = noShowTotal > 0 ? ((noShows / noShowTotal) * 100).toFixed(1) + "%" : "0%";

  const statusRows = (bookingsByStatus ?? []) as { status: string }[];
  const counts = {
    confirmed:       statusRows.filter((b) => b.status === "confirmed").length,
    pending_deposit: statusRows.filter((b) => b.status === "pending_deposit").length,
    completed:       statusRows.filter((b) => b.status === "completed").length,
    cancelled:       statusRows.filter((b) => b.status === "cancelled").length,
  };

  const stats = [
    { label: "Total bookings",  value: String(totalBookings ?? 0) },
    { label: "Active artists",  value: String(activeArtists ?? 0) },
    { label: "Monthly revenue", value: fmtMoney(monthRevenue) },
    { label: "No-show rate",    value: noShowRate, sub: "of confirmed bookings" },
  ];

  // ── Revenue chart: last 6 months ─────────────────────────────────────────────
  const monthData: MonthRevenue[] = await (async () => {
    if (!studioId) return Array.from({ length: 6 }, (_, i) => ({ label: monthRange(i - 5).label, amount: 0 }));

    const ranges = Array.from({ length: 6 }, (_, i) => monthRange(i - 5));
    const results = await Promise.all(
      ranges.map(({ first, last }) =>
        supabase.from("bookings").select("deposit_amount")
          .eq("studio_id", studioId)
          .in("status", ["confirmed", "completed", "no_show"])
          .gte("date", first).lte("date", last)
      )
    );

    return ranges.map(({ label }, i) => ({
      label,
      amount: ((results[i].data ?? []) as { deposit_amount: number }[])
        .reduce((s, b) => s + (b.deposit_amount ?? 0), 0),
    }));
  })();

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
      <DashboardStats stats={stats} />
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <RevenueChart months={monthData} />
        <BookingOverview counts={counts} />
      </div>
    </div>
  );
}
