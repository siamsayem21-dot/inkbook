import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/config";
import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";

type BookingDetail = {
  id: string;
  date: string;
  time: string;
  style: string;
  description: string | null;
  status: string;
  deposit_paid: boolean;
  deposit_kept: boolean;
  deposit_amount: number;
  clients: { full_name: string; email: string; phone: string } | null;
  consent_forms: { id: string }[] | null;
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

  const { data: bookingRaw } = await supabase
    .from("bookings")
    .select("id, date, time, style, description, status, deposit_paid, deposit_kept, deposit_amount, clients(full_name, email, phone), consent_forms(id)")
    .eq("id", params.bookingId)
    .eq("artist_id", artist.id)
    .maybeSingle();

  if (!bookingRaw) notFound();

  const b = bookingRaw as unknown as BookingDetail;
  const statusInfo = STATUS_LABELS[b.status] ?? { label: b.status, className: "bg-zinc-800 text-zinc-400 border-zinc-700" };
  const hasConsent = Array.isArray(b.consent_forms) ? b.consent_forms.length > 0 : !!b.consent_forms;

  const fields = [
    { label: "Client name",   value: b.clients?.full_name ?? "—" },
    { label: "Date",          value: fmtDate(b.date) },
    { label: "Time",          value: fmt12h(b.time) },
    { label: "Style",         value: b.style },
    { label: "Deposit",       value: `$${b.deposit_amount} ${b.deposit_paid ? "✓ Paid" : "— Unpaid"}` },
    { label: "Consent form",  value: hasConsent ? "✓ Signed" : "Not submitted" },
    { label: "Description",   value: b.description ?? "—" },
    { label: "Client email",  value: b.clients?.email ?? "—" },
    { label: "Client phone",  value: b.clients?.phone ?? "—" },
  ];

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/artist/bookings" className="text-zinc-500 hover:text-white text-sm transition-colors">
          ← Bookings
        </Link>
      </div>

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
