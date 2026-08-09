import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStudioId } from "@/lib/auth/config";
import { formatDate, formatDateTime } from "@/lib/utils";
import {
  PIPELINE_STAGES,
  CUSTOM_REQUEST_STATUS_MAP,
  BOOKED_OR_LATER,
  QUALIFIED_STAGES,
  QUOTED_OR_LATER,
  DEPOSIT_PAID_OR_LATER,
  type LeadStatus,
} from "@/lib/pipeline";
import StatsGrid from "./_components/StatsGrid";
import BookingOverview from "./_components/BookingOverview";
import RevenueChart, { type MonthRevenue } from "./_components/RevenueChart";
import OnboardingChecklist from "./_components/OnboardingChecklist";
import LeadPipelineOverview from "./_components/LeadPipelineOverview";
import UpcomingAppointments, { type UpcomingAppointment } from "./_components/UpcomingAppointments";
import RecentConsultations, { type RecentConsultation } from "./_components/RecentConsultations";
import LocationsOverview, { type LocationSummary } from "./_components/LocationsOverview";
import PeriodControl from "./_components/PeriodControl";

export const dynamic = "force-dynamic";

type Period = "month" | "all";
type Bounds = { start: Date; endExclusive: Date; label: string };

function fmtMoney(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);
}

/** Month bounds `offsetMonths` away from the current month (0 = this month). */
function monthBounds(offsetMonths: number): Bounds {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + offsetMonths;
  const start = new Date(y, m, 1);
  return {
    start,
    endExclusive: new Date(y, m + 1, 1),
    label: start.toLocaleDateString("en-US", { month: "short" }),
  };
}

function todayStr(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** null bounds = unbounded ("All time"). */
function inPeriod(bounds: Bounds | null, iso: string | null): boolean {
  if (!iso) return false;
  if (!bounds) return true;
  const d = new Date(iso);
  return d >= bounds.start && d < bounds.endExclusive;
}

/** Division-by-zero-safe rate: shows "—" (not a misleading "0%") when there's nothing to compute a rate from yet. */
function rateOrEmpty(numerator: number, denominator: number, sub: string): { value: string; sub: string; unavailable: boolean } {
  if (denominator === 0) return { value: "—", sub: "not enough data yet", unavailable: true };
  return { value: ((numerator / denominator) * 100).toFixed(1) + "%", sub, unavailable: false };
}

interface NormalizedLead {
  id: string;
  clientName: string;
  status: LeadStatus;
  createdAt: string;
}

export default async function OwnerDashboardPage({
  searchParams,
}: {
  searchParams: { subscribed?: string; period?: string };
}) {
  const studioId = await getStudioId();
  if (!studioId) redirect("/login");

  const supabase = createAdminClient();

  const period: Period = searchParams.period === "all" ? "all" : "month";
  const thisMonth = monthBounds(0);
  const periodBounds: Bounds | null = period === "month" ? thisMonth : null;
  const periodLabel = period === "month" ? "this month" : "all time";
  const today = todayStr();
  const todayMidnight = new Date();
  todayMidnight.setHours(0, 0, 0, 0);

  const { data: studioRaw } = await supabase
    .from("studios")
    .select("name, subdomain, address, state")
    .eq("id", studioId)
    .maybeSingle();

  const studio = studioRaw as { name: string; subdomain: string; address: string | null; state: string | null } | null;
  const subdomain = studio?.subdomain ?? "my-studio";
  const bookingLink = `inkbook.tech/book/${subdomain}`;

  const [
    { count: activeArtists },
    { data: bookingsAllRaw },
    { data: consultationsRaw },
    { data: customRequestsRaw },
    { data: upcomingRaw },
  ] = await Promise.all([
    supabase.from("artists").select("id", { count: "exact", head: true }).eq("studio_id", studioId).eq("is_active", true),

    // Full booking set for this studio — status breakdown, no-show rate, the
    // deposit_payments join below, and the Locations table's Bookings column
    // are all derived from this one fetch (fetch-all-then-filter-in-JS, same
    // pattern already used by /owner/pipeline and /owner/consultations).
    supabase.from("bookings").select("id, status, date").eq("studio_id", studioId),

    // artist_id: set when the owner assigns an artist (consultations table,
    // added in 20260621000001_consultation_booking_link.sql) — powers Recent
    // Consultations' "assigned/preferred artist" column.
    supabase.from("consultations")
      .select("id, client_name, status, created_at, artist_id")
      .eq("studio_id" as never, studioId)
      .order("created_at", { ascending: false }),

    supabase.from("custom_requests")
      .select("id, client_name, status, created_at, deposit_amount, deposit_paid_at")
      .eq("studio_id", studioId)
      .order("created_at", { ascending: false }),

    // Upcoming appointments: only bookings that are actually locked in (status
    // "confirmed" — schema comment: "deposit paid, appointment locked") and have a
    // real date. "awaiting_schedule" bookings have date = NULL and are excluded.
    // Deliberately not period-scoped — "what's next" regardless of the period toggle.
    supabase.from("bookings")
      .select("id, date, time, client_id, artist_id, status")
      .eq("studio_id", studioId)
      .eq("status", "confirmed")
      .not("date", "is", null)
      .gte("date", today)
      .order("date", { ascending: true })
      .order("time", { ascending: true })
      .limit(6),
  ]);

  const bookingsAll = (bookingsAllRaw ?? []) as { id: string; status: string; date: string | null }[];
  const bookingIds = bookingsAll.map((b) => b.id);

  // deposit_payments: the actual Stripe payment ledger (paid_at + payment_status +
  // payment_type in {deposit, remainder}) — a more accurate "successfully collected"
  // signal than bookings.deposit_paid, and the only source that also captures
  // remainder payments. payment_type was added by a later migration than the
  // generated lib/supabase/types.ts Row shape, hence the `as never` cast — same
  // pattern already used in app/(owner)/owner/bookings/page.tsx for this table.
  const { data: depositPaymentsRaw } = bookingIds.length
    ? await supabase
        .from("deposit_payments" as never)
        .select("amount_cents, payment_status, paid_at, payment_type, booking_id")
        .in("booking_id", bookingIds)
    : { data: [] as unknown[] };

  const depositPaymentsAll = (depositPaymentsRaw ?? []) as {
    amount_cents: number; payment_status: string; paid_at: string | null; payment_type: string; booking_id: string;
  }[];

  const consultationsAll = (consultationsRaw ?? []) as {
    id: string; client_name: string; status: string; created_at: string; artist_id: string | null;
  }[];
  const customRequestsAll = (customRequestsRaw ?? []) as {
    id: string; client_name: string; status: string; created_at: string; deposit_amount: number | null; deposit_paid_at: string | null;
  }[];

  // ── Revenue: "successfully collected payments/deposits" — paid deposit_payments
  // rows (deposit + remainder) for this studio's bookings, plus custom_requests'
  // own deposit fields (custom_requests aren't tracked in deposit_payments — that
  // table is booking-specific). Both filtered by when the money actually landed
  // (paid_at / deposit_paid_at), not by appointment date.
  function revenueCentsIn(bounds: Bounds | null): number {
    const fromBookings = depositPaymentsAll
      .filter((p) => p.payment_status === "paid" && inPeriod(bounds, p.paid_at))
      .reduce((s, p) => s + p.amount_cents, 0);
    const fromCustomRequests = Math.round(
      customRequestsAll
        .filter((cr) => cr.status === "accepted" && inPeriod(bounds, cr.deposit_paid_at))
        .reduce((s, cr) => s + (cr.deposit_amount ?? 0), 0) * 100
    );
    return fromBookings + fromCustomRequests;
  }
  const periodRevenueCents = revenueCentsIn(periodBounds);

  // 6-month revenue trend — same source/definition as the Revenue KPI above, just
  // bucketed monthly instead of by the selected period, so the two never disagree.
  const chartRanges = Array.from({ length: 6 }, (_, i) => monthBounds(i - 5));
  const monthData: MonthRevenue[] = chartRanges.map((b) => ({ label: b.label, amount: revenueCentsIn(b) / 100 }));

  // ── Booking status breakdown (all-time — unchanged from before) ──
  const counts = {
    confirmed:       bookingsAll.filter((b) => b.status === "confirmed").length,
    pending_deposit: bookingsAll.filter((b) => b.status === "pending_deposit").length,
    completed:       bookingsAll.filter((b) => b.status === "completed").length,
    cancelled:       bookingsAll.filter((b) => b.status === "cancelled").length,
  };

  // ── No-Show Rate = no-show appointments / past confirmed appointments ──
  const pastConfirmed = bookingsAll.filter((b) =>
    b.date != null &&
    new Date(b.date) < todayMidnight &&
    ["confirmed", "completed", "no_show"].includes(b.status) &&
    inPeriod(periodBounds, b.date)
  );
  const noShows = pastConfirmed.filter((b) => b.status === "no_show").length;
  const noShowRate = rateOrEmpty(noShows, pastConfirmed.length, "of past confirmed appointments");

  // ── Leads: consultations + custom_requests merged onto the shared LeadStatus funnel ──
  const consultationLeads: NormalizedLead[] = consultationsAll.map((c) => ({
    id: c.id,
    clientName: c.client_name,
    status: (c.status === "converted" ? "completed" : c.status) as LeadStatus,
    createdAt: c.created_at,
  }));
  const customRequestLeads: NormalizedLead[] = customRequestsAll.map((cr) => ({
    id: cr.id,
    clientName: cr.client_name,
    status: CUSTOM_REQUEST_STATUS_MAP[cr.status] ?? "new",
    createdAt: cr.created_at,
  }));
  const allLeads = [...consultationLeads, ...customRequestLeads]; // all-time — feeds the pipeline overview only
  const periodLeads = allLeads.filter((l) => inPeriod(periodBounds, l.createdAt)); // this period's cohort — feeds the 6 KPI cards

  const newLeadsCount = periodLeads.length;
  const qualifiedLeadsCount = periodLeads.filter((l) => QUALIFIED_STAGES.has(l.status)).length;
  const quotedOrLaterCount = periodLeads.filter((l) => QUOTED_OR_LATER.has(l.status)).length;
  const depositPaidOrLaterCount = periodLeads.filter((l) => DEPOSIT_PAID_OR_LATER.has(l.status)).length;
  const bookedCount = periodLeads.filter((l) => BOOKED_OR_LATER.has(l.status)).length;

  const depositRate = rateOrEmpty(depositPaidOrLaterCount, quotedOrLaterCount, "of quotes sent");
  const bookingRate = rateOrEmpty(bookedCount, qualifiedLeadsCount, "of qualified leads");

  const stats = [
    { label: "Revenue",         value: fmtMoney(periodRevenueCents), sub: periodLabel },
    { label: "New leads",       value: String(newLeadsCount),        sub: periodLabel },
    { label: "Qualified leads", value: String(qualifiedLeadsCount),  sub: "reviewed → completed" },
    { label: "Deposit rate",    value: depositRate.value,            sub: depositRate.sub,  unavailable: depositRate.unavailable },
    { label: "Booking rate",    value: bookingRate.value,            sub: bookingRate.sub,  unavailable: bookingRate.unavailable },
    { label: "No-show rate",    value: noShowRate.value,             sub: noShowRate.sub,   unavailable: noShowRate.unavailable },
  ];

  // ── Lead pipeline overview — always all-time, mirrors /owner/pipeline's own counts ──
  const stageCounts = Object.fromEntries(
    PIPELINE_STAGES.map((s) => [s.value, allLeads.filter((l) => l.status === s.value).length])
  );

  // ── Recent consultations (consultations table only — matches the /owner/consultations page) ──
  const upcomingBookings = (upcomingRaw ?? []) as {
    id: string; date: string; time: string; client_id: string; artist_id: string; status: string;
  }[];

  const artistIds = Array.from(new Set([
    ...upcomingBookings.map((b) => b.artist_id),
    ...consultationsAll.map((c) => c.artist_id).filter((id): id is string => !!id),
  ]));
  const clientIds = Array.from(new Set(upcomingBookings.map((b) => b.client_id)));

  const [{ data: artistsRaw }, { data: clientsRaw }] = await Promise.all([
    artistIds.length ? supabase.from("artists").select("id, name").in("id", artistIds) : Promise.resolve({ data: [] }),
    clientIds.length ? supabase.from("clients").select("id, full_name").in("id", clientIds) : Promise.resolve({ data: [] }),
  ]);
  const artistName = Object.fromEntries(((artistsRaw ?? []) as { id: string; name: string }[]).map((a) => [a.id, a.name]));
  const clientName = Object.fromEntries(((clientsRaw ?? []) as { id: string; full_name: string }[]).map((c) => [c.id, c.full_name]));

  const recentConsultations: RecentConsultation[] = consultationsAll.slice(0, 5).map((c) => ({
    id: c.id,
    clientName: c.client_name,
    status: c.status,
    createdAtLabel: formatDate(c.created_at),
    artistName: c.artist_id ? (artistName[c.artist_id] ?? null) : null,
  }));

  const upcomingAppointments: UpcomingAppointment[] = upcomingBookings.map((b) => ({
    id: b.id,
    clientName: clientName[b.client_id] ?? "—",
    artistName: artistName[b.artist_id] ?? "—",
    dateTimeLabel: formatDateTime(b.date, b.time),
    status: b.status,
    statusLabel: "Confirmed",
  }));

  // ── Studio / location performance ──
  // No `locations` table exists yet — bookings/artists/consultations are only ever
  // scoped by studio_id, with no location_id. This always renders exactly one row
  // (the studio itself) but is shaped as a list so a future locations table can
  // populate more without changing this component.
  const addressLabel = [studio?.address, studio?.state].filter(Boolean).join(", ") || null;
  const periodBookingsCount = bookingsAll.filter((b) => inPeriod(periodBounds, b.date)).length;
  const locations: LocationSummary[] = [
    {
      id: studioId,
      name: studio?.name ?? "Your studio",
      addressLabel,
      revenueLabel: fmtMoney(periodRevenueCents),
      leads: newLeadsCount,
      bookings: periodBookingsCount,
      bookingRateLabel: bookingRate.value,
    },
  ];

  const artistsDone = (activeArtists ?? 0) > 0;
  const linkDone    = bookingsAll.length > 0;

  return (
    // Breaks out of OwnerLayout's dark padding (p-4 pt-16 md:p-8) to paint this
    // page's own light canvas — first module of the dark→light InkBook migration.
    // Other owner pages are untouched; only the shared sidebar shell was relit.
    <div className="-m-4 -mt-16 md:-m-8 min-h-[calc(100vh-3rem)] md:min-h-screen" style={{ background: "#FAF9FC" }}>
      <div className="p-4 pt-16 md:p-8 space-y-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <h1 className="text-2xl md:text-3xl font-bold text-zinc-900">Studio Dashboard</h1>
          <div className="flex items-center gap-3">
            {searchParams.subscribed === "true" && (
              <span className="text-xs bg-green-50 text-green-700 border border-green-200 px-3 py-1.5 rounded-full">
                Subscription active!
              </span>
            )}
            <PeriodControl />
          </div>
        </div>

        {/* Onboarding checklist — compact, collapsible, hides once all steps complete */}
        <OnboardingChecklist
          artistsDone={artistsDone}
          linkDone={linkDone}
          bookingLink={bookingLink}
        />

        <StatsGrid stats={stats} />

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <RevenueChart months={monthData} />
          <BookingOverview counts={counts} />
        </div>

        <LeadPipelineOverview stageCounts={stageCounts} total={allLeads.length} />

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <UpcomingAppointments appointments={upcomingAppointments} />
          <RecentConsultations items={recentConsultations} />
        </div>

        <LocationsOverview locations={locations} />
      </div>
    </div>
  );
}
