import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStudioId } from "@/lib/auth/config";
import RevenueChart, { type MonthRevenue } from "@/components/owner/RevenueChart";
import { aggregateRevenueByMonth, sumKeptDepositCents } from "@/lib/revenue";
import MotionCard from "@/components/ui/MotionCard";

export const dynamic = "force-dynamic";

function fmtMoney(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);
}

function monthLabel(offsetFromNow: number) {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() + offsetFromNow, 1);
  return { key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, label: d.toLocaleDateString("en-US", { month: "short" }) };
}

export default async function RevenuePage() {
  const studioId = await getStudioId();
  if (!studioId) redirect("/login");

  const supabase = createAdminClient();

  const { data: bookingsRaw } = await supabase
    .from("bookings")
    .select("id, deposit_amount_cents, deposit_paid, deposit_paid_at, deposit_kept, created_at")
    .eq("studio_id", studioId);
  const bookings = (bookingsRaw ?? []) as {
    id: string; deposit_amount_cents: number; deposit_paid: boolean;
    deposit_paid_at: string | null; deposit_kept: boolean; created_at: string;
  }[];

  const bookingIds = bookings.map((b) => b.id);

  // Remainder payments have no dollar amount stored on `bookings` itself —
  // deposit_payments is the only source (and, unlike deposits, remainder
  // collection has no legacy pre-ledger path, so this is complete). Fetched
  // unfiltered by status/type — aggregateRevenueByMonth() does that filtering
  // itself, so pending/refunded rows and deposit-type rows are excluded there.
  const { data: depositPaymentsRaw } = bookingIds.length
    ? await supabase
        .from("deposit_payments")
        .select("amount_cents, payment_status, payment_type, paid_at")
        .in("booking_id", bookingIds)
    : { data: [] as { amount_cents: number; payment_status: string; payment_type: string; paid_at: string | null }[] };
  const depositPayments = (depositPaymentsRaw ?? []) as { amount_cents: number; payment_status: string; payment_type: string; paid_at: string | null }[];

  // custom_requests' deposit-paid lifecycle continues past "accepted" into
  // "scheduled" and "completed" (see 20260623000004_custom_requests_booking_link.sql) —
  // filtering to "accepted" alone silently drops revenue the moment a request
  // progresses, which is every request that isn't still brand new. Fetched
  // unfiltered by status — aggregateRevenueByMonth() applies the eligible-status
  // check itself (declined/pending/quoted excluded there).
  const { data: customRequestsRaw, error: crError } = await supabase
    .from("custom_requests")
    .select("deposit_amount, deposit_paid_at, status")
    .eq("studio_id", studioId)
    .not("deposit_paid_at", "is", null);
  if (crError) console.error("[revenue] custom_requests query:", crError.code, crError.message);
  const customRequests = (customRequestsRaw ?? []) as { deposit_amount: number | null; deposit_paid_at: string; status: string }[];

  const revenueByMonth = aggregateRevenueByMonth(bookings, depositPayments, customRequests);
  const keptCents = sumKeptDepositCents(bookings);

  const thisMonth = monthLabel(0);
  const lastMonth = monthLabel(-1);
  const thisMonthCents = revenueByMonth[thisMonth.key] ?? 0;
  const lastMonthCents = revenueByMonth[lastMonth.key] ?? 0;

  const statCards = [
    { label: "This month",               value: fmtMoney(thisMonthCents) },
    { label: "Last month",               value: fmtMoney(lastMonthCents) },
    { label: "Deposits kept (no-shows)", value: fmtMoney(keptCents) },
  ];

  // Revenue chart — last 6 months
  const monthData: MonthRevenue[] = Array.from({ length: 6 }, (_, i) => {
    const { key, label } = monthLabel(i - 5);
    return { label, amount: (revenueByMonth[key] ?? 0) / 100 };
  });

  return (
    <div className="-m-4 -mt-16 md:-m-8 min-h-[calc(100vh-3rem)] md:min-h-screen" style={{ background: "#FAF9FC" }}>
      <div className="p-4 pt-16 md:p-8 space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-zinc-900">Revenue</h1>
          <p className="text-sm text-zinc-500 mt-1">Deposits and remainder payments collected through InkBook.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {statCards.map((s) => (
            <MotionCard key={s.label} className="bg-white rounded-2xl border border-zinc-200 shadow-sm hover:shadow-elevation-3 p-5">
              <p className="text-zinc-500 text-xs mb-1">{s.label}</p>
              <p className="text-2xl font-bold text-zinc-900">{s.value}</p>
            </MotionCard>
          ))}
        </div>

        <RevenueChart months={monthData} />
      </div>
    </div>
  );
}
