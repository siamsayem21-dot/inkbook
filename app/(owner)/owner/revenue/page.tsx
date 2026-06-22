import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStudioId } from "@/lib/auth/config";
import RevenueChart, { type MonthRevenue } from "@/components/owner/RevenueChart";

export const dynamic = "force-dynamic";

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

export default async function RevenuePage() {
  const studioId = await getStudioId();
  if (!studioId) redirect("/login");

  const supabase = createAdminClient();

  const thisMonth = monthRange(0);
  const lastMonth = monthRange(-1);

  const fetchBookingRevenueCents = async (first: string, last: string) => {
    const { data } = await supabase
      .from("bookings")
      .select("deposit_amount_cents")
      .eq("studio_id", studioId)
      .eq("deposit_paid", true)
      .gte("date", first)
      .lte("date", last);
    return ((data ?? []) as { deposit_amount_cents: number }[])
      .reduce((s, b) => s + (b.deposit_amount_cents ?? 0), 0);
  };

  // Bucket custom request revenue by deposit_paid_at (set by webhook when client pays).
  // Prerequisite: run migration 20260622000006 to add the column.
  const fetchCustomRequestRevenueCents = async (first: string, last: string) => {
    const { data, error } = await supabase
      .from("custom_requests")
      .select("deposit_amount")
      .eq("studio_id", studioId)
      .eq("status", "accepted")
      .gte("deposit_paid_at", `${first}T00:00:00`)
      .lte("deposit_paid_at", `${last}T23:59:59`);
    if (error) console.error("[revenue] custom_requests query:", error.code, error.message);
    return Math.round(
      ((data ?? []) as { deposit_amount: number | null }[])
        .reduce((s, r) => s + (r.deposit_amount ?? 0), 0) * 100
    );
  };

  const fetchRevenueCents = async (first: string, last: string) => {
    const [bookings, custom] = await Promise.all([
      fetchBookingRevenueCents(first, last),
      fetchCustomRequestRevenueCents(first, last),
    ]);
    return bookings + custom;
  };

  const [thisMonthCents, lastMonthCents, keptCents] = await Promise.all([
    fetchRevenueCents(thisMonth.first, thisMonth.last),
    fetchRevenueCents(lastMonth.first, lastMonth.last),
    (async () => {
      const { data } = await supabase
        .from("bookings")
        .select("deposit_amount_cents")
        .eq("studio_id", studioId)
        .eq("deposit_kept", true);
      return ((data ?? []) as { deposit_amount_cents: number }[])
        .reduce((s, b) => s + (b.deposit_amount_cents ?? 0), 0);
    })(),
  ]);

  const statCards = [
    { label: "This month",               value: fmtMoney(thisMonthCents) },
    { label: "Last month",               value: fmtMoney(lastMonthCents) },
    { label: "Deposits kept (no-shows)", value: fmtMoney(keptCents) },
  ];

  // Revenue chart — last 6 months
  const ranges = Array.from({ length: 6 }, (_, i) => monthRange(i - 5));
  const monthData: MonthRevenue[] = await Promise.all(
    ranges.map(async ({ first, last, label }) => ({
      label,
      amount: (await fetchRevenueCents(first, last)) / 100,
    }))
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Revenue</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {statCards.map((s) => (
          <div key={s.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <p className="text-zinc-400 text-xs mb-1">{s.label}</p>
            <p className="text-2xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>
      <RevenueChart months={monthData} />
    </div>
  );
}
