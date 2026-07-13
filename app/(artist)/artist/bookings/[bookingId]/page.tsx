export const dynamic = "force-dynamic";

import { createAdminClient } from "@/lib/supabase/admin";
import { getBalanceDueCents } from "@/lib/booking-balance";
import Link from "next/link";

const ARTIST_ID = "fa2900bc-f613-4f75-8f64-e1e0d7e32a79";

type BookingDetail = {
  id: string;
  date: string;
  time: string;
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

function fmtDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });
}

function fmt12h(time: string) {
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`;
}

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  confirmed:       { label: "Confirmed",       className: "bg-green-500/10 text-green-400 border-green-500/20" },
  pending_deposit: { label: "Deposit pending", className: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" },
  completed:       { label: "Completed",       className: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20" },
  cancelled:       { label: "Cancelled",       className: "bg-red-500/10 text-red-400 border-red-500/20" },
  no_show:         { label: "No-show",         className: "bg-red-500/10 text-red-400 border-red-500/20" },
};

function ErrorCard({ message }: { message: string }) {
  return (
    <div className="max-w-2xl space-y-6">
      <Link href="/artist/bookings" className="text-zinc-500 hover:text-white text-sm transition-colors">
        ← Back to bookings
      </Link>
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center space-y-3">
        <p className="text-zinc-300 font-medium">Booking unavailable</p>
        <p className="text-zinc-500 text-sm">{message}</p>
        <Link href="/artist/bookings" className="inline-block mt-2 text-sm text-[#c9a84c] hover:underline">
          Return to my bookings →
        </Link>
      </div>
    </div>
  );
}

interface Props {
  params: { bookingId: string };
}

export default async function ArtistBookingDetailPage({ params }: Props) {
  const supabase = createAdminClient();

  const { data: bookingRaw, error: bookingError } = await supabase
    .from("bookings")
    .select(
      "id, date, time, style, description, status, deposit_paid, deposit_kept, deposit_amount_cents, " +
        "total_amount_cents, quote_amount_cents, remainder_collected, completed_at, clients(full_name, email, phone)"
    )
    .eq("id", params.bookingId)
    .eq("artist_id", ARTIST_ID)
    .maybeSingle();

  if (bookingError) {
    console.error("[artist/booking-detail] query error:", bookingError.message, "| bookingId:", params.bookingId);
    return <ErrorCard message="Could not load this booking. Please try again or contact support." />;
  }

  if (!bookingRaw) {
    return <ErrorCard message="This booking doesn't exist or you don't have access to it." />;
  }

  const b = bookingRaw as unknown as BookingDetail;

  const { data: consentRaw } = await supabase
    .from("consent_forms")
    .select("id")
    .eq("booking_id", params.bookingId)
    .maybeSingle();

  const hasConsent = !!consentRaw;
  const statusInfo = STATUS_LABELS[b.status] ?? { label: b.status, className: "bg-zinc-800 text-zinc-400 border-zinc-700" };
  const balanceDueCents = getBalanceDueCents(b);

  const fields = [
    { label: "Client name",  value: b.clients?.full_name ?? "—" },
    { label: "Date",         value: fmtDate(b.date) },
    { label: "Time",         value: fmt12h(b.time) },
    { label: "Style",        value: b.style },
    { label: "Deposit",      value: `$${(b.deposit_amount_cents / 100).toFixed(2)} ${b.deposit_paid ? "✓ Paid" : "— Unpaid"}` },
    ...(balanceDueCents !== null
      ? [{
          label: "Remaining balance",
          value: `$${(balanceDueCents / 100).toFixed(2)} ${b.remainder_collected ? "✓ Collected" : "— Not yet collected"}`,
        }]
      : []),
    { label: "Consent form", value: hasConsent ? "✓ Signed" : "Not submitted" },
    {
      label: "Aftercare",
      value: b.status === "completed" && b.completed_at
        ? `✓ Sent (${new Date(b.completed_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })})`
        : "Sent when session is marked completed",
    },
    { label: "Description",  value: b.description ?? "—" },
    { label: "Client email", value: b.clients?.email ?? "—" },
    { label: "Client phone", value: b.clients?.phone ?? "—" },
  ];

  return (
    <div className="max-w-2xl space-y-6">
      <Link href="/artist/bookings" className="text-zinc-500 hover:text-white text-sm transition-colors">
        ← Bookings
      </Link>

      <div className="flex items-start justify-between">
        <h1 className="text-2xl font-bold">Booking detail</h1>
        <span className={`text-xs border px-2.5 py-1 rounded-full ${statusInfo.className}`}>
          {statusInfo.label}
        </span>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {fields.map((f) => (
            <div key={f.label} className={f.label === "Description" ? "col-span-2" : ""}>
              <p className="text-zinc-400 text-xs mb-0.5">{f.label}</p>
              <p className="text-sm font-medium">{f.value}</p>
            </div>
          ))}
        </div>

        {b.deposit_kept && (
          <div className="bg-red-950 border border-red-800 text-red-300 text-sm rounded-lg px-4 py-3">
            Deposit was kept — client no-showed.
          </div>
        )}
      </div>
    </div>
  );
}
