export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth/config";
import { getOutstandingBalanceCents } from "@/lib/booking-balance";
import Link from "next/link";
import ArtistBookingActions from "./ArtistBookingActions";

type BookingDetail = {
  id: string;
  date: string | null;
  time: string | null;
  style: string;
  description: string | null;
  status: string;
  deposit_paid: boolean;
  deposit_kept: boolean;
  deposit_amount_cents: number;
  total_amount_cents: number | null;
  quote_amount_cents: number | null;
  remainder_collected: boolean;
  completed_at: string | null;
  clients: { full_name: string; email: string; phone: string } | null;
};

// Mirrors app/(owner)/owner/bookings/[bookingId]/page.tsx's fmtDate/fmt12h
// exactly — an awaiting_schedule booking (date/time both null until the
// owner assigns a schedule) is a real, reachable state, not an edge case;
// these previously assumed a non-null string and crashed the whole page for
// any such booking (found via the Artist Requests "Active — Deposit Paid"
// linked-booking scenario, 2026-08-17, but reachable from any awaiting_schedule
// booking regardless of origin).
function fmtDate(dateStr: string | null) {
  if (!dateStr) return "Not yet scheduled";
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });
}

function fmt12h(time: string | null) {
  if (!time) return "—";
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`;
}

const STATUS_META: Record<string, { label: string; badge: string }> = {
  pending_deposit:   { label: "Awaiting Deposit",  badge: "bg-amber-50 text-amber-700" },
  awaiting_schedule: { label: "Awaiting Schedule", badge: "bg-violet-50 text-violet-700" },
  confirmed:         { label: "Confirmed",         badge: "bg-emerald-50 text-emerald-700" },
  completed:         { label: "Completed",         badge: "bg-green-50 text-green-700" },
  cancelled:         { label: "Cancelled",         badge: "bg-zinc-100 text-zinc-500" },
  no_show:           { label: "No-show",           badge: "bg-red-50 text-red-700" },
};

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="-m-4 -mt-16 md:-m-8 min-h-[calc(100vh-3rem)] md:min-h-screen" style={{ background: "#FAF9FC" }}>
      <div className="p-4 pt-16 md:p-8 space-y-6 max-w-2xl">{children}</div>
    </div>
  );
}

function ErrorCard({ message }: { message: string }) {
  return (
    <PageShell>
      <Link href="/artist/bookings" className="text-xs text-zinc-500 hover:text-zinc-900 transition-colors">
        ← Back to bookings
      </Link>
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-8 text-center space-y-3">
        <p className="text-zinc-900 font-medium text-sm">Booking unavailable</p>
        <p className="text-zinc-500 text-sm">{message}</p>
        <Link href="/artist/bookings" className="inline-block mt-2 text-sm text-violet-600 hover:text-violet-700 font-medium">
          Return to my bookings →
        </Link>
      </div>
    </PageShell>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-zinc-400 mb-0.5">{label}</p>
      <p className="text-sm text-zinc-700">{value}</p>
    </div>
  );
}

interface Props {
  params: { bookingId: string };
}

export default async function ArtistBookingDetailPage({ params }: Props) {
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

  const { data: bookingRaw, error: bookingError } = await supabase
    .from("bookings")
    .select(
      "id, date, time, style, description, status, deposit_paid, deposit_kept, deposit_amount_cents, " +
        "total_amount_cents, quote_amount_cents, remainder_collected, completed_at, clients(full_name, email, phone)"
    )
    .eq("id", params.bookingId)
    .eq("artist_id", artist.id)
    .maybeSingle();

  if (bookingError) {
    console.error("[artist/booking-detail] query error:", bookingError.message, "| bookingId:", params.bookingId);
    return <ErrorCard message="Could not load this booking. Please try again or contact support." />;
  }

  if (!bookingRaw) {
    return <ErrorCard message="This booking doesn't exist or you don't have access to it." />;
  }

  const b = bookingRaw as unknown as BookingDetail;

  // Consultation/project link — a booking may have originated from a saved
  // AI consultation (consultations.booking_id) or a custom request
  // (custom_requests.booking_id). Neither is a column on bookings itself;
  // both link back the other way, so this is a lightweight reverse lookup.
  // Since this booking is already scoped to the current artist above, any
  // linked consultation found here was assigned to this same artist too
  // (both bookConsultation() and startConsultationDeposit() set artist_id
  // to the same artist that ends up on the booking).
  const [{ data: consultRaw }, { data: requestRaw }] = await Promise.all([
    supabase.from("consultations").select("id, placement, estimated_size, budget_range").eq("booking_id", params.bookingId).maybeSingle(),
    supabase.from("custom_requests").select("id, placement, size, budget_range").eq("booking_id", params.bookingId).maybeSingle(),
  ]);
  const consult = consultRaw as { id: string; placement: string; estimated_size: string; budget_range: string } | null;
  const request = requestRaw as { id: string; placement: string; size: string; budget_range: string } | null;
  const project = consult
    ? { kind: "consultation" as const, id: consult.id, placement: consult.placement, size: consult.estimated_size, budget: consult.budget_range }
    : request
      ? { kind: "request" as const, id: request.id, placement: request.placement, size: request.size, budget: request.budget_range }
      : null;

  const { data: consentRaw } = await supabase
    .from("consent_forms")
    .select("id, signed_at")
    .eq("booking_id", params.bookingId)
    .maybeSingle();

  const consent = consentRaw as { id: string; signed_at: string } | null;
  const statusMeta = STATUS_META[b.status] ?? { label: b.status, badge: "bg-zinc-100 text-zinc-500" };
  // getOutstandingBalanceCents(), not getBalanceDueCents() — respects
  // deposit_paid/remainder_collected so a fully-paid booking shows $0
  // outstanding instead of a stale raw total-minus-deposit figure. Same fix
  // already applied to Owner Bookings; this page had been missed until now.
  const balanceDueCents = getOutstandingBalanceCents(b);

  return (
    <PageShell>
      <Link href="/artist/bookings" className="text-xs text-zinc-500 hover:text-zinc-900 transition-colors">
        ← Bookings
      </Link>

      <div className="flex items-start justify-between gap-4">
        <h1 className="text-2xl font-bold text-zinc-900">{b.clients?.full_name ?? "Booking"}</h1>
        <span className={`text-xs px-3 py-1.5 rounded-full font-medium shrink-0 ${statusMeta.badge}`}>
          {statusMeta.label}
        </span>
      </div>

      {b.deposit_kept && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
          Deposit was kept — client no-showed.
        </div>
      )}

      <div className="bg-white border border-zinc-200 shadow-sm rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-zinc-100">
          <p className="text-[10px] uppercase tracking-widest text-zinc-400">Appointment</p>
        </div>
        <div className="px-5 py-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Detail label="Date" value={fmtDate(b.date)} />
          <Detail label="Time" value={fmt12h(b.time)} />
          <Detail label="Style" value={b.style} />
        </div>
      </div>

      <div className="bg-white border border-zinc-200 shadow-sm rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-zinc-100">
          <p className="text-[10px] uppercase tracking-widest text-zinc-400">Client</p>
        </div>
        <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Detail label="Name"  value={b.clients?.full_name ?? "—"} />
          <Detail label="Email" value={b.clients?.email ?? "—"} />
          <Detail label="Phone" value={b.clients?.phone ?? "—"} />
        </div>
      </div>

      {project && (
        <div className="bg-white border border-zinc-200 shadow-sm rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-zinc-100 flex items-center justify-between gap-3">
            <p className="text-[10px] uppercase tracking-widest text-zinc-400">Tattoo Project</p>
            {project.kind === "consultation" && (
              <Link href={`/artist/consultations/${project.id}`} className="text-xs text-violet-600 hover:text-violet-700 font-medium">
                View consultation →
              </Link>
            )}
          </div>
          <div className="px-5 py-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Detail label="Placement" value={project.placement || "—"} />
            <Detail label="Size"      value={project.size || "—"} />
            <Detail label="Budget"    value={project.budget || "—"} />
          </div>
        </div>
      )}

      {b.description && (
        <div className="bg-white border border-zinc-200 shadow-sm rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-zinc-100">
            <p className="text-[10px] uppercase tracking-widest text-zinc-400">Notes</p>
          </div>
          <div className="px-5 py-4">
            <p className="text-sm text-zinc-700 leading-relaxed whitespace-pre-wrap">{b.description}</p>
          </div>
        </div>
      )}

      <div className="bg-white border border-zinc-200 shadow-sm rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-zinc-100">
          <p className="text-[10px] uppercase tracking-widest text-zinc-400">Payment</p>
        </div>
        <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Detail
            label="Deposit"
            value={`$${(b.deposit_amount_cents / 100).toFixed(2)} — ${b.deposit_paid ? "Paid" : "Unpaid"}`}
          />
          {balanceDueCents !== null && (
            <Detail
              label="Remaining balance"
              value={`$${(balanceDueCents / 100).toFixed(2)} — ${b.remainder_collected ? "Collected" : "Not yet collected"}`}
            />
          )}
        </div>
      </div>

      <div className="bg-white border border-zinc-200 shadow-sm rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-zinc-100">
          <p className="text-[10px] uppercase tracking-widest text-zinc-400">Consent &amp; Session</p>
        </div>
        <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Detail
            label="Consent form"
            value={consent ? `Signed ${new Date(consent.signed_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}` : "Not submitted"}
          />
          <Detail
            label="Aftercare"
            value={b.status === "completed" && b.completed_at
              ? `Sent (${new Date(b.completed_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })})`
              : "Sent automatically when the session is marked completed"}
          />
        </div>
      </div>

      <ArtistBookingActions bookingId={b.id} status={b.status} hasConsent={!!consent} />
    </PageShell>
  );
}
