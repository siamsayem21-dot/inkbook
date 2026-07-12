export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStudioId } from "@/lib/auth/config";
import { getBalanceDueCents } from "@/lib/booking-balance";
import BookingActions from "./BookingActions";

type BookingStatus = "pending_deposit" | "awaiting_schedule" | "confirmed" | "completed" | "cancelled" | "no_show";

const STATUS_LABELS: Record<BookingStatus, { label: string; className: string }> = {
  confirmed:         { label: "Confirmed",        className: "bg-[#c9a84c]/10 text-[#c9a84c] border-[#c9a84c]/20" },
  pending_deposit:   { label: "Awaiting deposit", className: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" },
  awaiting_schedule: { label: "Awaiting schedule",className: "bg-violet-500/10 text-violet-400 border-violet-500/20" },
  completed:         { label: "Completed",        className: "bg-green-500/10 text-green-400 border-green-500/20" },
  cancelled:         { label: "Cancelled",        className: "bg-white/5 text-white/30 border-white/10" },
  no_show:           { label: "No-show",          className: "bg-red-500/10 text-red-400 border-red-500/20" },
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
    <div className="max-w-2xl space-y-6">
      <Link href="/owner/bookings" className="text-zinc-500 hover:text-white text-sm transition-colors">
        ← All bookings
      </Link>
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center space-y-3">
        <p className="text-zinc-300 font-medium">Booking unavailable</p>
        <p className="text-zinc-500 text-sm">{message}</p>
        <Link href="/owner/bookings" className="inline-block mt-2 text-sm text-[#c9a84c] hover:underline">
          Return to bookings →
        </Link>
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
        "total_amount_cents, quote_amount_cents, remainder_collected, remainder_collected_at, " +
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

  const statusInfo = STATUS_LABELS[b.status] ?? { label: b.status, className: "bg-zinc-800 text-zinc-400 border-zinc-700" };
  const depositParam = searchParams.deposit === "paid" || searchParams.deposit === "cancelled"
    ? searchParams.deposit
    : null;
  const balanceDueCents = getBalanceDueCents(b);
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
        ? `$${(b.deposit_amount_cents / 100).toFixed(2)} — ✓ Paid`
        : depositPaymentStatus === "pending"
        ? `$${(b.deposit_amount_cents / 100).toFixed(2)} — Request sent`
        : `$${(b.deposit_amount_cents / 100).toFixed(2)} — Not requested`,
    },
    ...(balanceDueCents !== null
      ? [{
          label: "Remaining balance",
          value: b.remainder_collected
            ? `$${(balanceDueCents / 100).toFixed(2)} — ✓ Collected`
            : remainderPaymentStatus === "pending"
            ? `$${(balanceDueCents / 100).toFixed(2)} — Request sent`
            : `$${(balanceDueCents / 100).toFixed(2)} — Not requested`,
        }]
      : []),
    { label: "Consent form",  value: hasConsent ? "✓ Signed" : "Not submitted" },
    { label: "Client email",  value: b.clients?.email ?? "—" },
    { label: "Client phone",  value: b.clients?.phone ?? "—" },
    { label: "Description",   value: b.description ?? "—", wide: true },
  ];

  return (
    <div className="max-w-2xl space-y-6">
      <Link href="/owner/bookings" className="text-zinc-500 hover:text-white text-sm transition-colors">
        ← All bookings
      </Link>

      <div className="flex items-start justify-between">
        <h1 className="text-2xl font-bold">Booking detail</h1>
        <span className={`text-xs border px-2.5 py-1 rounded-full ${statusInfo.className}`}>
          {statusInfo.label}
        </span>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
        {b.deposit_kept && (
          <div className="bg-red-950 border border-red-800 text-red-300 text-sm rounded-lg px-4 py-3">
            Deposit was kept — client no-showed.
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          {fields.map((f) => (
            <div key={f.label} className={f.wide ? "col-span-2" : ""}>
              <p className="text-zinc-400 text-xs mb-0.5">{f.label}</p>
              <p className="text-sm font-medium">{f.value}</p>
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
  );
}
