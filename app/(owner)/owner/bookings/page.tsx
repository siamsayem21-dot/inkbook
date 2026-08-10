export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStudioId } from "@/lib/auth/config";
import { getOutstandingBalanceCents } from "@/lib/booking-balance";

type BookingStatus = "pending_deposit" | "awaiting_schedule" | "confirmed" | "completed" | "cancelled" | "no_show";

// Filter/count-strip order — the actual chronological flow of a booking's
// life (deposit requested -> paid+scheduled -> confirmed -> completed),
// with the two exit states (cancelled/no_show) at the end. Matches the same
// local-order-override pattern already used by Consultations' FILTER_ORDER.
const FILTER_ORDER: BookingStatus[] = [
  "pending_deposit", "awaiting_schedule", "confirmed", "completed", "cancelled", "no_show",
];

const STATUS_META: Record<BookingStatus, { label: string; badge: string }> = {
  pending_deposit:   { label: "Awaiting Deposit",  badge: "bg-amber-50 text-amber-700" },
  awaiting_schedule: { label: "Awaiting Schedule", badge: "bg-violet-50 text-violet-700" },
  confirmed:         { label: "Confirmed",         badge: "bg-emerald-50 text-emerald-700" },
  completed:         { label: "Completed",         badge: "bg-green-50 text-green-700" },
  cancelled:         { label: "Cancelled",         badge: "bg-zinc-100 text-zinc-500" },
  no_show:           { label: "No-show",           badge: "bg-red-50 text-red-700" },
};

function fmtDate(d: string | null) {
  if (!d) return "Not yet scheduled";
  const [y, mo, day] = d.split("-").map(Number);
  return new Date(y, mo - 1, day).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtTime(t: string | null) {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

type Row = {
  id: string;
  date: string | null;
  time: string | null;
  status: BookingStatus;
  style: string;
  deposit_amount_cents: number;
  deposit_paid: boolean;
  total_amount_cents: number | null;
  quote_amount_cents: number | null;
  remainder_collected: boolean;
  client_id: string;
  artist_id: string;
};

export default async function OwnerBookingsPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const studioId = await getStudioId();
  if (!studioId) redirect("/login");

  const supabase = createAdminClient();

  const { data: bookingsRaw, error } = await supabase
    .from("bookings")
    .select(
      "id, date, time, status, style, deposit_amount_cents, deposit_paid, " +
      "total_amount_cents, quote_amount_cents, remainder_collected, client_id, artist_id"
    )
    .eq("studio_id", studioId)
    .order("date", { ascending: false, nullsFirst: true })
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div className="-m-4 -mt-16 md:-m-8 min-h-[calc(100vh-3rem)] md:min-h-screen" style={{ background: "#FAF9FC" }}>
        <div className="p-4 pt-16 md:p-8">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm px-6 py-16 text-center">
            <p className="text-zinc-500 text-sm">Failed to load bookings.</p>
            <p className="text-xs text-zinc-400 mt-2 font-mono">{error.message}</p>
          </div>
        </div>
      </div>
    );
  }

  const allBookings = (bookingsRaw ?? []) as Row[];

  const bookingIds = allBookings.map((b) => b.id);
  const clientIds  = Array.from(new Set(allBookings.map((b) => b.client_id).filter(Boolean)));
  const artistIds  = Array.from(new Set(allBookings.map((b) => b.artist_id).filter(Boolean)));

  const [{ data: clientsRaw }, { data: artistsRaw }, pendingDepositResult, consentResult] = await Promise.all([
    clientIds.length ? supabase.from("clients").select("id, full_name").in("id", clientIds) : Promise.resolve({ data: [] }),
    artistIds.length ? supabase.from("artists").select("id, name").in("id", artistIds) : Promise.resolve({ data: [] }),
    bookingIds.length
      ? (supabase
          .from("deposit_payments" as never)
          .select("booking_id")
          .in("booking_id", bookingIds)
          .eq("payment_type", "deposit")
          .eq("payment_status", "pending") as unknown as Promise<{ data: Array<{ booking_id: string }> | null }>)
      : Promise.resolve({ data: [] as Array<{ booking_id: string }> }),
    bookingIds.length
      ? supabase.from("consent_forms").select("booking_id").in("booking_id", bookingIds)
      : Promise.resolve({ data: [] as Array<{ booking_id: string }> }),
  ]);

  const clientName = Object.fromEntries(
    ((clientsRaw ?? []) as { id: string; full_name: string }[]).map((c) => [c.id, c.full_name])
  );
  const artistName = Object.fromEntries(
    ((artistsRaw ?? []) as { id: string; name: string }[]).map((a) => [a.id, a.name])
  );
  const pendingDepositSet = new Set((pendingDepositResult.data ?? []).map((d) => d.booking_id));
  const consentSignedSet = new Set(
    ((consentResult.data ?? []) as { booking_id: string }[]).map((c) => c.booking_id)
  );

  const activeStatus = searchParams.status ?? "all";
  const bookings = activeStatus === "all" ? allBookings : allBookings.filter((b) => b.status === activeStatus);

  const stageCounts = Object.fromEntries(
    FILTER_ORDER.map((s) => [s, allBookings.filter((b) => b.status === s).length])
  );
  // An awaiting_schedule booking with no date/time yet is the one state that
  // genuinely needs the owner to act (assignSchedule()) — mirrors
  // BookingActions.tsx's own needsSchedule check.
  const needsScheduleCount = allBookings.filter((b) => b.status === "awaiting_schedule" && !b.date).length;

  return (
    <div className="-m-4 -mt-16 md:-m-8 min-h-[calc(100vh-3rem)] md:min-h-screen" style={{ background: "#FAF9FC" }}>
      <div className="p-4 pt-16 md:p-8 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-zinc-900">Bookings</h1>
            <p className="text-sm text-zinc-500 mt-1">
              {activeStatus === "all" ? `${allBookings.length} total` : `${bookings.length} ${STATUS_META[activeStatus as BookingStatus]?.label ?? activeStatus}`}
              {needsScheduleCount > 0 && (
                <span className="text-amber-600 font-medium"> · {needsScheduleCount} need{needsScheduleCount === 1 ? "s" : ""} scheduling</span>
              )}
            </p>
          </div>
        </div>

        {/* Filter / status overview strip */}
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-4 sm:p-5">
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            <Link
              href="/owner/bookings"
              className={`shrink-0 rounded-xl border px-3.5 py-2.5 text-center min-w-[76px] transition-colors ${
                activeStatus === "all" ? "border-violet-200 bg-violet-50" : "border-zinc-100 hover:border-zinc-200"
              }`}
            >
              <p className={`text-lg font-bold tabular-nums ${activeStatus === "all" ? "text-violet-700" : "text-zinc-900"}`}>{allBookings.length}</p>
              <p className="text-[9px] uppercase tracking-widest text-zinc-400 mt-0.5">All</p>
            </Link>
            {FILTER_ORDER.map((s) => (
              <Link
                key={s}
                href={`/owner/bookings?status=${s}`}
                className={`shrink-0 rounded-xl border px-3.5 py-2.5 text-center min-w-[88px] transition-colors ${
                  activeStatus === s ? "border-violet-200 bg-violet-50" : "border-zinc-100 hover:border-zinc-200"
                }`}
              >
                <p className={`text-lg font-bold tabular-nums ${activeStatus === s ? "text-violet-700" : "text-zinc-900"}`}>
                  {stageCounts[s] ?? 0}
                </p>
                <p className="text-[9px] uppercase tracking-widest text-zinc-400 mt-0.5 truncate">{STATUS_META[s].label}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* Empty state */}
        {bookings.length === 0 ? (
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm px-6 py-16 text-center">
            {activeStatus === "all" ? (
              <>
                <p className="text-base font-semibold text-zinc-900 mb-2">No Bookings Yet</p>
                <p className="text-zinc-500 text-sm max-w-md mx-auto">
                  Bookings appear here automatically once a client pays a deposit — from an accepted{" "}
                  <Link href="/owner/consultations" className="text-violet-600 hover:underline">consultation</Link>,{" "}
                  <Link href="/owner/requests" className="text-violet-600 hover:underline">custom request</Link>, or your studio&apos;s public booking page. There&apos;s no manual &quot;create booking&quot; step here by design.
                </p>
              </>
            ) : (
              <>
                <p className="text-base font-semibold text-zinc-900 mb-2">No {STATUS_META[activeStatus as BookingStatus]?.label ?? activeStatus} Bookings</p>
                <p className="text-zinc-500 text-sm">Nothing in this state right now.</p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {bookings.map((b) => {
              const meta = STATUS_META[b.status] ?? { label: b.status, badge: "bg-zinc-100 text-zinc-500" };
              const needsSchedule = b.status === "awaiting_schedule" && !b.date;
              const hasPendingDeposit = pendingDepositSet.has(b.id);
              const balanceDueCents = getOutstandingBalanceCents(b);
              const time = fmtTime(b.time);
              const hasConsent = consentSignedSet.has(b.id);

              return (
                <Link
                  key={b.id}
                  href={`/owner/bookings/${b.id}`}
                  className={`block bg-white rounded-2xl border shadow-sm overflow-hidden hover:border-violet-200 transition-colors ${
                    needsSchedule ? "border-amber-200" : "border-zinc-200"
                  }`}
                >
                  <div className="px-5 py-4 flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <p className="font-semibold text-zinc-900">{clientName[b.client_id] ?? "—"}</p>
                        {needsSchedule && (
                          <span className="text-[10px] px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full font-medium flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            Needs scheduling
                          </span>
                        )}
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${meta.badge}`}>
                          {meta.label}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 bg-zinc-100 text-zinc-600 rounded-full">
                          {b.style}
                        </span>
                        {b.deposit_paid ? (
                          <span className="text-[10px] px-2 py-0.5 bg-green-50 text-green-700 rounded-full font-mono">
                            ${(b.deposit_amount_cents / 100).toFixed(2)} deposit ✓
                          </span>
                        ) : hasPendingDeposit ? (
                          <span className="text-[10px] px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full font-mono">
                            ${(b.deposit_amount_cents / 100).toFixed(2)} deposit pending
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 bg-zinc-100 text-zinc-500 rounded-full font-mono">
                            ${(b.deposit_amount_cents / 100).toFixed(2)} deposit not requested
                          </span>
                        )}
                        {balanceDueCents !== null && balanceDueCents > 0 && (
                          <span className="text-[10px] px-2 py-0.5 bg-sky-50 text-sky-700 rounded-full font-mono">
                            ${(balanceDueCents / 100).toFixed(2)} balance due
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500">
                        {artistName[b.artist_id] ?? "Unassigned"} · {fmtDate(b.date)}{time ? ` at ${time}` : ""}
                      </p>
                      <p className="text-xs text-zinc-400 mt-1.5">
                        {hasConsent ? "Consent signed" : "No consent form yet"}
                      </p>
                    </div>

                    <div className="text-right shrink-0 flex flex-col items-end gap-2">
                      <p className="text-xs text-violet-600 font-medium">View →</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
