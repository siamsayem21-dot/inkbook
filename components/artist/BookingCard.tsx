import Link from "next/link";

const STATUS_META: Record<string, { label: string; badge: string }> = {
  pending_deposit:   { label: "Awaiting Deposit",  badge: "bg-amber-50 text-amber-700" },
  awaiting_schedule: { label: "Awaiting Schedule", badge: "bg-violet-50 text-violet-700" },
  confirmed:         { label: "Confirmed",         badge: "bg-emerald-50 text-emerald-700" },
  completed:         { label: "Completed",         badge: "bg-green-50 text-green-700" },
  cancelled:         { label: "Cancelled",         badge: "bg-zinc-100 text-zinc-500" },
  no_show:           { label: "No-show",           badge: "bg-red-50 text-red-700" },
};

interface Props {
  bookingId?: string;
  clientName?: string;
  date?: string;
  time?: string;
  style?: string;
  status?: string;
  depositPaid?: boolean;
  consentSigned?: boolean;
}

export default function BookingCard({
  bookingId = "—",
  clientName = "Client name",
  date = "Jun 15, 2026",
  time = "2:00 PM",
  style = "Traditional",
  status = "confirmed",
  depositPaid = true,
  consentSigned = false,
}: Props) {
  const meta = STATUS_META[status] ?? { label: status, badge: "bg-zinc-100 text-zinc-500" };

  return (
    <Link
      href={`/artist/bookings/${bookingId}`}
      className="block bg-white rounded-2xl border border-zinc-200 shadow-sm p-4 hover:border-violet-200 transition-colors"
    >
      <div className="flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <p className="font-semibold text-sm text-zinc-900 truncate">{clientName}</p>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${meta.badge}`}>
              {meta.label}
            </span>
          </div>
          <p className="text-zinc-500 text-xs">{date} at {time} · {style}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
              depositPaid ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
            }`}
          >
            {depositPaid ? "Deposit paid" : "Deposit pending"}
          </span>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
              consentSigned ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-500"
            }`}
          >
            {consentSigned ? "Consent signed" : "No consent"}
          </span>
          <span className="text-xs text-violet-600 font-medium">View →</span>
        </div>
      </div>
    </Link>
  );
}
