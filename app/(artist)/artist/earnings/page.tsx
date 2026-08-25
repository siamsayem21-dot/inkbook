export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/config";
import { createAdminClient } from "@/lib/supabase/admin";
import { DollarSign, CheckCircle2, Clock3, CalendarRange } from "lucide-react";
import { getBookingTotalCents, getOutstandingBalanceCents } from "@/lib/booking-balance";
import MotionCard from "@/components/ui/MotionCard";

// Same qualifying-status contract as Artist Dashboard's "This Month's
// Earnings" card (app/(artist)/artist/dashboard/page.tsx) — the two must
// never disagree for the same artist/month. See Artist Earnings 2/10 for
// the full canonical-rule writeup.
const EARNING_STATUSES = ["confirmed", "completed"];

const STATUS_META: Record<string, { label: string; badge: string }> = {
  confirmed: { label: "Confirmed", badge: "bg-emerald-50 text-emerald-700" },
  completed: { label: "Completed", badge: "bg-green-50 text-green-700" },
};

type EarningBooking = {
  id: string;
  date: string;
  time: string;
  style: string;
  status: string;
  deposit_amount_cents: number;
  deposit_paid: boolean;
  remainder_collected: boolean;
  total_amount_cents: number | null;
  quote_amount_cents: number | null;
  clients: { full_name: string } | null;
};

function fmtMoney(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);
}

function fmtDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmt12h(time: string) {
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

// { first, last } as YYYY-MM-DD, matching bookings.date's own literal-local
// format — same shape Artist Dashboard already uses, no timezone conversion
// applied (see Artist Earnings 2/10 for why: no other locked page applies
// per-studio timezone to "this month" boundaries either).
function monthRangeFromKey(key: string) {
  const [y, m] = key.split("-").map(Number);
  const first = `${y}-${pad(m)}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const last = `${y}-${pad(m)}-${pad(lastDay)}`;
  return { first, last };
}

function monthKeyOffset(key: string, offset: number) {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 1 + offset, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

function monthLabel(key: string) {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

interface Props {
  searchParams: { month?: string };
}

export default async function EarningsPage({ searchParams }: Props) {
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

  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
  const rawMonth = searchParams.month;
  const monthKey = rawMonth && /^\d{4}-\d{2}$/.test(rawMonth) ? rawMonth : currentMonthKey;
  const isCurrentMonth = monthKey === currentMonthKey;
  const { first, last } = monthRangeFromKey(monthKey);
  const prevMonthKey = monthKeyOffset(monthKey, -1);
  const nextMonthKey = monthKeyOffset(monthKey, 1);

  const [{ data: periodRaw }, { data: allTimeRaw }] = await Promise.all([
    supabase
      .from("bookings")
      .select(
        "id, date, time, style, status, deposit_amount_cents, deposit_paid, remainder_collected, total_amount_cents, quote_amount_cents, clients(full_name)"
      )
      .eq("artist_id", artist.id)
      .in("status", EARNING_STATUSES)
      .gte("date", first)
      .lte("date", last)
      .order("date", { ascending: false })
      .order("time", { ascending: false }),
    supabase
      .from("bookings")
      .select("deposit_amount_cents")
      .eq("artist_id", artist.id)
      .in("status", EARNING_STATUSES),
  ]);

  const periodBookings = (periodRaw ?? []) as unknown as EarningBooking[];
  const allTimeCents = ((allTimeRaw ?? []) as { deposit_amount_cents: number }[]).reduce(
    (s, b) => s + (b.deposit_amount_cents ?? 0), 0
  );

  const periodTotalCents = periodBookings.reduce((s, b) => s + (b.deposit_amount_cents ?? 0), 0);
  const completed = periodBookings.filter((b) => b.status === "completed");
  const confirmed = periodBookings.filter((b) => b.status === "confirmed");
  const completedCents = completed.reduce((s, b) => s + (b.deposit_amount_cents ?? 0), 0);
  const confirmedCents = confirmed.reduce((s, b) => s + (b.deposit_amount_cents ?? 0), 0);

  const statCards = [
    { icon: DollarSign, value: fmtMoney(periodTotalCents), label: `${monthLabel(monthKey)} Earnings`, sub: "confirmed & completed deposits" },
    { icon: CalendarRange, value: String(periodBookings.length), label: "Sessions", sub: "in this period" },
    { icon: CheckCircle2, value: fmtMoney(completedCents), label: "Completed", sub: `${completed.length} session${completed.length === 1 ? "" : "s"} done` },
    { icon: Clock3, value: fmtMoney(confirmedCents), label: "Confirmed (upcoming)", sub: `${confirmed.length} not yet completed` },
  ];

  return (
    <div className="-m-4 -mt-16 md:-m-8 min-h-[calc(100vh-3rem)] md:min-h-screen" style={{ background: "#FAF9FC" }}>
      <div className="p-4 pt-16 md:p-8 space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-zinc-900">My Earnings</h1>
          <p className="text-sm text-zinc-500 mt-1">Money attributed to your confirmed and completed sessions.</p>
        </div>

        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-4 md:p-5 flex items-center justify-between gap-3">
          <Link
            href={`/artist/earnings?month=${prevMonthKey}`}
            className="text-sm text-zinc-500 hover:text-zinc-900 px-3 py-1.5 rounded-lg hover:bg-zinc-50 transition-colors shrink-0"
          >
            ← Prev
          </Link>
          <div className="text-center min-w-0">
            <p className="text-sm font-semibold text-zinc-900 truncate">{monthLabel(monthKey)}</p>
            {isCurrentMonth ? (
              <p className="text-[11px] text-violet-600 font-medium mt-0.5">Current month</p>
            ) : (
              <Link href="/artist/earnings" className="text-[11px] text-violet-600 hover:text-violet-700 font-medium mt-0.5 inline-block">
                Jump to current month
              </Link>
            )}
          </div>
          <Link
            href={`/artist/earnings?month=${nextMonthKey}`}
            className="text-sm text-zinc-500 hover:text-zinc-900 px-3 py-1.5 rounded-lg hover:bg-zinc-50 transition-colors shrink-0"
          >
            Next →
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {statCards.map((s) => (
            <MotionCard key={s.label} className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-5">
              <div className="w-9 h-9 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center mb-3">
                <s.icon size={17} />
              </div>
              <p className="text-2xl font-bold text-zinc-900">{s.value}</p>
              <p className="text-sm text-zinc-500 mt-0.5">{s.label}</p>
              <p className="text-xs text-zinc-400 mt-1">{s.sub}</p>
            </MotionCard>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-5">
          <p className="text-xs text-zinc-400 uppercase tracking-widest mb-1">All-time earnings</p>
          <p className="text-xl font-bold text-zinc-900">{fmtMoney(allTimeCents)}</p>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-zinc-500 mb-3">Earning sessions — {monthLabel(monthKey)}</h2>
          {periodBookings.length === 0 ? (
            <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm px-6 py-12 text-center">
              <p className="text-base font-semibold text-zinc-900 mb-1">No earnings this period</p>
              <p className="text-zinc-500 text-sm">No confirmed or completed sessions for {monthLabel(monthKey)}.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {periodBookings.map((b) => {
                const meta = STATUS_META[b.status] ?? { label: b.status, badge: "bg-zinc-100 text-zinc-500" };
                const totalCents = getBookingTotalCents(b);
                const outstandingCents = getOutstandingBalanceCents(b);
                return (
                  <Link
                    key={b.id}
                    href={`/artist/bookings/${b.id}`}
                    className="block bg-white rounded-2xl border border-zinc-200 shadow-sm p-4 hover:border-violet-200 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <p className="font-semibold text-sm text-zinc-900 truncate">{b.clients?.full_name ?? "Unknown client"}</p>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${meta.badge}`}>{meta.label}</span>
                        </div>
                        <p className="text-zinc-500 text-xs">{fmtDate(b.date)} at {fmt12h(b.time)} · {b.style}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold text-zinc-900">{fmtMoney(b.deposit_amount_cents)}</p>
                        <p className="text-[10px] text-zinc-400">deposit</p>
                        {totalCents !== null && outstandingCents !== null && (
                          <p className="text-[10px] text-zinc-400 mt-0.5">
                            {outstandingCents === 0 ? "Paid in full" : `${fmtMoney(outstandingCents)} outstanding`}
                          </p>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
