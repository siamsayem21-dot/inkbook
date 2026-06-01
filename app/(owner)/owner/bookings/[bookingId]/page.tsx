export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/config";
import { createAdminClient } from "@/lib/supabase/admin";
import BookingActions from "./BookingActions";

type BookingStatus = "pending_deposit" | "confirmed" | "completed" | "cancelled" | "no_show";

const STATUS_LABELS: Record<BookingStatus, { label: string; className: string }> = {
  confirmed:       { label: "Confirmed",        className: "bg-[#D4A853]/10 text-[#D4A853] border-[#D4A853]/20" },
  pending_deposit: { label: "Awaiting deposit", className: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" },
  completed:       { label: "Completed",        className: "bg-green-500/10 text-green-400 border-green-500/20" },
  cancelled:       { label: "Cancelled",        className: "bg-white/5 text-white/30 border-white/10" },
  no_show:         { label: "No-show",          className: "bg-red-500/10 text-red-400 border-red-500/20" },
};

type BookingDetail = {
  id: string;
  date: string;
  time: string;
  style: string;
  description: string | null;
  status: BookingStatus;
  deposit_amount: number;
  deposit_paid: boolean;
  deposit_kept: boolean;
  clients: { full_name: string; email: string; phone: string } | null;
  artists: { name: string } | null;
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

function ErrorCard({ message }: { message: string }) {
  return (
    <div className="max-w-2xl space-y-6">
      <Link href="/owner/bookings" className="text-zinc-500 hover:text-white text-sm transition-colors">
        ← All bookings
      </Link>
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center space-y-3">
        <p className="text-zinc-300 font-medium">Booking unavailable</p>
        <p className="text-zinc-500 text-sm">{message}</p>
        <Link href="/owner/bookings" className="inline-block mt-2 text-sm text-[#D4A853] hover:underline">
          Return to bookings →
        </Link>
      </div>
    </div>
  );
}

interface Props {
  params: { bookingId: string };
}

export default async function BookingDetailPage({ params }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = createAdminClient();

  // Resolve the owner's studio for the ownership security check
  const { data: studioRaw } = await supabase
    .from("studios")
    .select("id")
    .eq("owner_id", user.id)
    .limit(1);

  const studioId = (studioRaw as { id: string }[] | null)?.[0]?.id ?? null;
  if (!studioId) return <ErrorCard message="Studio not found for your account." />;

  // Fetch booking — studio_id filter enforces ownership
  // Consent forms fetched separately: PostgREST can silently fail on reverse-FK joins
  const { data: bookingRaw, error: bookingError } = await supabase
    .from("bookings")
    .select("id, date, time, style, description, status, deposit_amount, deposit_paid, deposit_kept, clients(full_name, email, phone), artists(name)")
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

  // Separate query for consent form to avoid join ambiguity
  const { data: consentRaw } = await supabase
    .from("consent_forms")
    .select("id")
    .eq("booking_id", params.bookingId)
    .maybeSingle();

  const hasConsent = !!consentRaw;
  const statusInfo = STATUS_LABELS[b.status] ?? { label: b.status, className: "bg-zinc-800 text-zinc-400 border-zinc-700" };

  const fields: { label: string; value: string; wide?: boolean }[] = [
    { label: "Client",        value: b.clients?.full_name ?? "—" },
    { label: "Artist",        value: b.artists?.name ?? "—" },
    { label: "Date",          value: fmtDate(b.date) },
    { label: "Time",          value: fmt12h(b.time) },
    { label: "Style",         value: b.style },
    { label: "Deposit",       value: `$${b.deposit_amount} — ${b.deposit_paid ? "✓ Paid" : "Unpaid"}` },
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
        hasConsent={hasConsent}
      />
    </div>
  );
}
