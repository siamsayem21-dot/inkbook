import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/config";
import { createAdminClient } from "@/lib/supabase/admin";
import EarningsWidget, { type WeekEarning } from "@/components/artist/EarningsWidget";

function fmtMoney(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

function monthRange(offsetMonths: number) {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth() + offsetMonths, 1);
  const last  = new Date(now.getFullYear(), now.getMonth() + offsetMonths + 1, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    first: `${first.getFullYear()}-${pad(first.getMonth() + 1)}-01`,
    last:  `${last.getFullYear()}-${pad(last.getMonth() + 1)}-${pad(last.getDate())}`,
  };
}

function sumDeposits(rows: { deposit_amount_cents: number }[]) {
  return rows.reduce((s, b) => s + (b.deposit_amount_cents ?? 0), 0) / 100;
}

export default async function EarningsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = createAdminClient();

  const { data: artistRaw } = await supabase
    .from("artists")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  const artist = artistRaw as { id: string } | null;
  if (!artist) redirect("/artist/dashboard");

  const thisMonth = monthRange(0);
  const lastMonth = monthRange(-1);

  const PAID_STATUSES = ["confirmed", "completed"];

  const [
    { data: thisMonthRaw },
    { data: lastMonthRaw },
    { data: allTimeRaw },
  ] = await Promise.all([
    supabase.from("bookings").select("deposit_amount_cents").eq("artist_id", artist.id)
      .in("status", PAID_STATUSES).gte("date", thisMonth.first).lte("date", thisMonth.last),
    supabase.from("bookings").select("deposit_amount_cents").eq("artist_id", artist.id)
      .in("status", PAID_STATUSES).gte("date", lastMonth.first).lte("date", lastMonth.last),
    supabase.from("bookings").select("deposit_amount_cents").eq("artist_id", artist.id)
      .in("status", PAID_STATUSES),
  ]);

  const thisMonthTotal = sumDeposits((thisMonthRaw ?? []) as { deposit_amount_cents: number }[]);
  const lastMonthTotal = sumDeposits((lastMonthRaw ?? []) as { deposit_amount_cents: number }[]);
  const allTimeTotal   = sumDeposits((allTimeRaw  ?? []) as { deposit_amount_cents: number }[]);

  // Re-fetch with date for the weekly breakdown
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const { data: thisMonthWithDate } = await supabase
    .from("bookings")
    .select("deposit_amount_cents, date")
    .eq("artist_id", artist.id)
    .in("status", PAID_STATUSES)
    .gte("date", thisMonth.first)
    .lte("date", thisMonth.last);

  const weeksReal: WeekEarning[] = [1, 2, 3, 4].map((wk) => {
    const wkFirst = new Date(firstOfMonth);
    wkFirst.setDate(1 + (wk - 1) * 7);
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const wkLast = new Date(firstOfMonth);
    wkLast.setDate(Math.min(wk * 7, daysInMonth));
    const pad = (n: number) => String(n).padStart(2, "0");
    const firstStr = `${wkFirst.getFullYear()}-${pad(wkFirst.getMonth() + 1)}-${pad(wkFirst.getDate())}`;
    const lastStr  = `${wkLast.getFullYear()}-${pad(wkLast.getMonth() + 1)}-${pad(wkLast.getDate())}`;
    const amount = ((thisMonthWithDate ?? []) as { deposit_amount_cents: number; date: string }[])
      .filter((b) => b.date >= firstStr && b.date <= lastStr)
      .reduce((s, b) => s + (b.deposit_amount_cents ?? 0), 0) / 100;
    return { label: `Wk ${wk}`, amount };
  });

  const statCards = [
    { label: "This month", value: fmtMoney(thisMonthTotal) },
    { label: "Last month", value: fmtMoney(lastMonthTotal) },
    { label: "All time",   value: fmtMoney(allTimeTotal) },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">My Earnings</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {statCards.map((s) => (
          <div key={s.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <p className="text-zinc-400 text-sm mb-1">{s.label}</p>
            <p className="text-2xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>
      <EarningsWidget monthTotal={thisMonthTotal} weeks={weeksReal} />
    </div>
  );
}
