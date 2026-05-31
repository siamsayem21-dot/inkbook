import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/config";
import { createAdminClient } from "@/lib/supabase/admin";
import RevenueChart, { type MonthRevenue } from "@/components/owner/RevenueChart";

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

export default async function RevenuePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = createAdminClient();

  const { data: studioRaw } = await supabase
    .from("studios")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle();

  const studioId = (studioRaw as { id: string } | null)?.id ?? null;

  const thisMonth  = monthRange(0);
  const lastMonth  = monthRange(-1);

  const fetchRevenue = async (first: string, last: string) => {
    if (!studioId) return 0;
    const { data } = await supabase
      .from("bookings")
      .select("deposit_amount")
      .eq("studio_id", studioId)
      .in("status", ["confirmed", "completed", "no_show"])
      .gte("date", first)
      .lte("date", last);
    return ((data ?? []) as { deposit_amount: number }[]).reduce((s, b) => s + (b.deposit_amount ?? 0), 0);
  };

  const [thisMonthRev, lastMonthRev, noShowRev] = await Promise.all([
    fetchRevenue(thisMonth.first, thisMonth.last),
    fetchRevenue(lastMonth.first, lastMonth.last),
    (async () => {
      if (!studioId) return 0;
      const { data } = await supabase
        .from("bookings")
        .select("deposit_amount")
        .eq("studio_id", studioId)
        .eq("status", "no_show");
      return ((data ?? []) as { deposit_amount: number }[]).reduce((s, b) => s + (b.deposit_amount ?? 0), 0);
    })(),
  ]);

  const txFee = Math.round(thisMonthRev * 0.01);

  const statCards = [
    { label: "This month",                  value: fmtMoney(thisMonthRev) },
    { label: "Last month",                  value: fmtMoney(lastMonthRev) },
    { label: "Transaction fees (1%)",        value: fmtMoney(txFee) },
    { label: "Deposits kept (no-shows)",     value: fmtMoney(noShowRev) },
  ];

  // Revenue chart — last 6 months
  const ranges = Array.from({ length: 6 }, (_, i) => monthRange(i - 5));
  const monthData: MonthRevenue[] = await Promise.all(
    ranges.map(async ({ first, last, label }) => ({
      label,
      amount: await fetchRevenue(first, last),
    }))
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Revenue</h1>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
