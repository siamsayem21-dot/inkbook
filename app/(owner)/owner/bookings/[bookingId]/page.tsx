export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStudioId } from "@/lib/auth/config";
import { getOutstandingBalanceCents } from "@/lib/booking-balance";
import BookingActions from "./BookingActions";

type BookingStatus = "pending_deposit" | "awaiting_schedule" | "confirmed" | "completed" | "cancelled" | "no_show";

const STATUS_META: Record<BookingStatus, { label: string; badge: string }> = {
  confirmed:         { label: "Confirmed",         badge: "bg-emerald-50 text-emerald-700" },
  pending_deposit:   { label: "Awaiting Deposit",  badge: "bg-amber-50 text-amber-700" },
  awaiting_schedule: { label: "Awaiting Schedule", badge: "bg-violet-50 text-violet-700" },
  completed:         { label: "Completed",         badge: "bg-green-50 text-green-700" },
  cancelled:         { label: "Cancelled",         badge: "bg-zinc-100 text-zinc-500" },
  no_show:           { label: "No-show",           badge: "bg-red-50 text-red-700" },
};

type BookingDetail = {
  id: string;
  date: string | null;
  time: string | null;
  style: string;
  description: string | null;
  status: BookingStatus;
  deposit_amount_cents: number;
  deposit_paid: boolean;
  deposit_kept: boolean;
  total_amount_cents: number | null;
  quote_amount_cents: number | null;
  remainder_collected: boolean;
  remainder_collected_at: string | null;
  completed_at: string | null;
  clients: { full_name: string; email: string; phone: string } | null;
  artists: { name: string } | null;
};

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

function ErrorCard({ message }: { message: string }) {
  return (
    <div className="-m-4 -mt-16 md:-m-8 min-h-[calc(100vh-3rem)] md:min-h-screen" style={{ background: "#FAF9FC" }}>
      <div className="p-4 pt-16 md:p-8 max-w-2xl space-y-6">
        <Link href="/owner/bookings" className="text-zinc-500 hover:text-zinc-900 text-sm transition-colors">
          ← All bookings
        </Link>
        <div className="bg-white border border-zinc-200 shadow-sm rounded-2xl p-8 text-center space-y-3">
          <p className="text-zinc-800 font-medium">Booking unavailable</p>
          <p className="text-zinc-500 text-sm">{message}</p>
          <Link href="/owner/bookings" className="inline-block mt-2 text-sm text-violet-600 hover:underline">
            Return to bookings →
          </Link>
        </div>
      </div>
    </div>
  );
}

interface Props {
  params: { bookingId: string };
  searchParams: { deposit?: string; remainder?: string };
}

export default async function BookingDetailPage({ params, searchParams }: Props) {
  const studioId = await getStudioId();
  if (!studioId) redirect("/login");

  const supabase = createAdminClient();

  const { data: bookingRaw, error: bookingError } = await supabase
    .from("bookings")
    .select(
      "id, date, time, style, description, status, deposit_amount_cents, deposit_paid, deposit_kept, " +
        "total_amount_cents, quote_amount_cents, remainder_collected, remainder_collected_at, completed_at, " +
        "clients(full_name, email, phone), artists(name)"
    )
    .eq("id", params.bookingId)
    .eq("studio_id", studioId)
    .maybeSingle();

  if (bookingError) {
    console.error("[owner/booking-detail] query error:", bookingError.message, "| id:", params.bookingId);
    return <ErrorCard message="Could not load this booking. Please try again or contact support." />;
  }

  if (!bookingRaw) {
    return <ErrorCard message="This booking doesn't exist or you don't have access to it." />;
  }

  const b = bookingRaw as unknown as BookingDetail;

  const [{ data: consentRaw }, depositPaymentResult, legacyDepositResult, remainderPaymentResult] = await Promise.all([
    supabase
      .from("consent_forms")
      .select("id, signed_at, state_template, is_minor, guardian_name, id_photo_url")
      .eq("booking_id", params.bookingId)
      .maybeSingle(),
    (supabase
      .from("deposit_payments" as never)
      .select("payment_status")
      .eq("booking_id", params.bookingId)
      .eq("payment_type", "deposit")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()) as unknown as Promise<{
        data: { payment_status: string } | null;
      }>,
    // Self-serve bookings (white-label booking page) write to the legacy `deposits`
    // table, not `deposit_payments`. Query both so owner sees the correct status
    // regardless of which flow created the deposit session.
    (supabase
      .from("deposits" as never)
      .select("status")
      .eq("booking_id", params.bookingId)
      .maybeSingle()) as unknown as Promise<{
        data: { status: string } | null;
      }>,
    (supabase
      .from("deposit_payments" as never)
      .select("payment_status")
      .eq("booking_id", params.bookingId)
      .eq("payment_type", "remainder")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()) as unknown as Promise<{
        data: { payment_status: string } | null;
      }>,
  ]);

  // Prefer deposit_payments (owner-initiated flow); fall back to deposits (self-serve).
  // Both tables use the same status vocabulary: pending | paid | refunded | kept.
  const depositPaymentStatus = (
    depositPaymentResult.data?.payment_status ??
    legacyDepositResult.data?.status ??
    "none"
  ) as "none" | "pending" | "paid" | "refunded" | "kept";

  const hasConsent = !!consentRaw;
  const consentForm = consentRaw as {
    id: string;
    signed_at: string;
    state_template: string;
    is_minor: boolean;
    guardian_name: string | null;
    id_photo_url: string;
  } | null;

  const remainderPaymentStatus = (remainderPaymentResult.data?.payment_status ?? "none") as
    "none" | "pending" | "paid" | "refunded" | "kept";

  const statusInfo = STATUS_META[b.status] ?? { label: b.status, badge: "bg-zinc-100 text-zinc-500" };
  const depositParam = searchParams.deposit === "paid" || searchParams.deposit === "cancelled"
    ? searchParams.deposit
    : null;
  const balanceDueCents = getOutstandingBalanceCents(b);
  const remainderParam = searchParams.remainder === "paid" || searchParams.remainder === "cancelled"
    ? searchParams.remainder
    : null;

  const fields: { label: string; value: string; wide?: boolean }[] = [
    { label: "Client",        value: b.clients?.full_name ?? "—" },
    { label: "Artist",        value: b.artists?.name ?? "—" },
    { label: "Date",          value: fmtDate(b.date) },
    { label: "Time",          value: fmt12h(b.time) },
    { label: "Style",         value: b.style },
    {
      label: "Deposit",
      value: b.deposit_paid
        ? `$${(b.deposit_amount_cents / 100).toFixed(2)} — Paid`
        : depositPaymentStatus === "pending"
        ? `$${(b.deposit_amount_cents / 100).toFixed(2)} — Request sent`
        : `$${(b.deposit_amount_cents / 100).toFixed(2)} — Not requested`,
    },
    ...(balanceDueCents !== null
      ? [{
          label: "Remaining balance",
          value: b.remainder_collected
            ? `$${(balanceDueCents / 100).toFixed(2)} — Collected`
            : remainderPaymentStatus === "pending"
            ? `$${(balanceDueCents / 100).toFixed(2)} — Request sent`
            : `$${(balanceDueCents / 100).toFixed(2)} — Not requested`,
        }]
      : []),
    { label: "Consent form",  value: hasConsent ? "Signed" : "Not submitted" },
    {
      label: "Aftercare",
      value: b.status === "completed" && b.completed_at
        ? `Sent (${new Date(b.completed_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })})`
        : "Sent when session is marked completed",
    },
    { label: "Client email",  value: b.clients?.email ?? "—" },
    { label: "Client phone",  value: b.clients?.phone ?? "—" },
    { label: "Description",   value: b.description ?? "—", wide: true },
  ];

  return (
    <div className="-m-4 -mt-16 md:-m-8 min-h-[calc(100vh-3rem)] md:min-h-screen" style={{ background: "#FAF9FC" }}>
      <div className="p-4 pt-16 md:p-8 max-w-2xl space-y-6">
        <Link href="/owner/bookings" className="text-zinc-500 hover:text-zinc-900 text-sm transition-colors">
          ← All bookings
        </Link>

        <div className="flex items-start justify-between flex-wrap gap-3">
          <h1 className="text-2xl font-bold text-zinc-900">Booking Detail</h1>
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusInfo.badge}`}>
            {statusInfo.label}
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6 space-y-4">
          {b.deposit_kept && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
              Deposit was kept — client no-showed.
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            {fields.map((f) => (
              <div key={f.label} className={f.wide ? "col-span-2" : ""}>
                <p className="text-zinc-400 text-xs mb-0.5">{f.label}</p>
                <p className="text-sm font-medium text-zinc-800">{f.value}</p>
              </div>
            ))}
          </div>
        </div>

        <BookingActions
          bookingId={params.bookingId}
          status={b.status}
          date={b.date}
          depositAmountCents={b.deposit_amount_cents}
          hasConsent={hasConsent}
          consentForm={consentForm}
          depositParam={depositParam}
          depositPaymentStatus={depositPaymentStatus}
          balanceDueCents={balanceDueCents}
          remainderCollected={b.remainder_collected}
          remainderPaymentStatus={remainderPaymentStatus}
          remainderParam={remainderParam}
        />
      </div>
    </div>
  );
}
