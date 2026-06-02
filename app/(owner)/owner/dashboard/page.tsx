import { createAdminClient } from "@/lib/supabase/admin";
import DashboardStats from "@/components/owner/DashboardStats";
import BookingOverview from "@/components/owner/BookingOverview";
import RevenueChart, { type MonthRevenue } from "@/components/owner/RevenueChart";
import PlanBanner from "@/components/owner/PlanBanner";
import OnboardingChecklist from "@/components/owner/OnboardingChecklist";
import CopyLinkButton from "@/components/artist/CopyLinkButton";

export const dynamic = "force-dynamic";

const STUDIO_ID = "5fe382a1-fee7-4387-b625-4bf7a52b8f45";

const PLAN_LABELS: Record<string, string> = {
  solo: "Solo — $49/mo",
  studio: "Studio — $79/mo",
  pro: "Pro — $129/mo",
};

function fmtMoney(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);
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
  const supabase = createAdminClient();

  const { data: studioRaw } = await supabase
    .from("studios")
    .select("plan, subscription_status, subdomain")
    .eq("id", STUDIO_ID)
    .maybeSingle();

  const studio = studioRaw as { plan: string; subscription_status: string; subdomain: string } | null;
  const planLabel = studio ? (PLAN_LABELS[studio.plan] ?? studio.plan) : "Solo — $49/mo";
  const subscriptionStatus = studio?.subscription_status ?? "trialing";
  const subdomain = studio?.subdomain ?? "my-studio";
  const bookingLink = `inkbook.tech/book/${subdomain}`;

  const thisMonth = monthRange(0);

  const [
    { count: totalBookings },
    { count: activeArtists },
    { data: monthBookings },
    { data: noShowData },
    { data: bookingsByStatus },
  ] = await Promise.all([
    supabase.from("bookings").select("id", { count: "exact", head: true }).eq("studio_id", STUDIO_ID),

    supabase.from("artists").select("id", { count: "exact", head: true }).eq("studio_id", STUDIO_ID),

    supabase.from("bookings")
      .select("deposit_amount_cents")
      .eq("studio_id", STUDIO_ID)
      .eq("deposit_paid", true)
      .gte("date", thisMonth.first)
      .lte("date", thisMonth.last),

    supabase.from("bookings")
      .select("status")
      .eq("studio_id", STUDIO_ID)
      .in("status", ["confirmed", "completed", "no_show"]),

    supabase.from("bookings")
      .select("status")
      .eq("studio_id", STUDIO_ID),
  ]);

  const monthRevenueCents = ((monthBookings ?? []) as { deposit_amount_cents: number }[])
    .reduce((s, b) => s + (b.deposit_amount_cents ?? 0), 0);

  const noShowRows = (noShowData ?? []) as { status: string }[];
  const noShows = noShowRows.filter((b) => b.status === "no_show").length;
  const noShowRate = noShowRows.length > 0
    ? ((noShows / noShowRows.length) * 100).toFixed(1) + "%"
    : "0%";

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
    { label: "Monthly revenue", value: fmtMoney(monthRevenueCents) },
    { label: "No-show rate",    value: noShowRate, sub: "of confirmed bookings" },
  ];

  const ranges = Array.from({ length: 6 }, (_, i) => monthRange(i - 5));
  const chartResults = await Promise.all(
    ranges.map(({ first, last }) =>
      supabase.from("bookings")
        .select("deposit_amount_cents")
        .eq("studio_id", STUDIO_ID)
        .eq("deposit_paid", true)
        .gte("date", first)
        .lte("date", last)
    )
  );

  const monthData: MonthRevenue[] = ranges.map(({ label }, i) => ({
    label,
    amount: ((chartResults[i].data ?? []) as { deposit_amount_cents: number }[])
      .reduce((s, b) => s + (b.deposit_amount_cents ?? 0), 0) / 100,
  }));

  const artistsDone = (activeArtists ?? 0) > 0;
  const linkDone    = (totalBookings ?? 0) > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <h1 className="text-2xl font-bold">Studio Dashboard</h1>
        {searchParams.subscribed === "true" && (
          <span className="text-xs bg-green-500/10 text-green-400 border border-green-500/20 px-3 py-1.5 rounded-full">
            Subscription active!
          </span>
        )}
      </div>

      {/* Onboarding checklist — hides once all steps complete */}
      <OnboardingChecklist
        artistsDone={artistsDone}
        linkDone={linkDone}
        bookingLink={bookingLink}
      />

      <PlanBanner planLabel={planLabel} subscriptionStatus={subscriptionStatus} />
      <DashboardStats stats={stats} />

      {/* Empty state or charts */}
      {(totalBookings ?? 0) === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center">
          <p className="text-base font-semibold mb-2">No bookings yet</p>
          <p className="text-zinc-400 text-sm mb-6">
            Share your booking link to get started.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <code className="text-sm font-mono text-gold bg-zinc-800 px-3 py-2 rounded-lg break-all">
              {bookingLink}
            </code>
            <CopyLinkButton link={bookingLink} />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <RevenueChart months={monthData} />
          <BookingOverview counts={counts} />
        </div>
      )}
    </div>
  );
}
