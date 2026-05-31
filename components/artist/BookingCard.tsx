import Link from "next/link";

interface Props {
  bookingId?: string;
  clientName?: string;
  date?: string;
  time?: string;
  style?: string;
  depositPaid?: boolean;
}

export default function BookingCard({
  bookingId = "—",
  clientName = "Client name",
  date = "Jun 15, 2026",
  time = "2:00 PM",
  style = "Traditional",
  depositPaid = true,
}: Props) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center gap-4">
      <div className="flex-1">
        <p className="font-medium text-sm">{clientName}</p>
        <p className="text-zinc-400 text-xs mt-0.5">{date} at {time} · {style}</p>
      </div>
      <div className="flex items-center gap-3">
        <span
          className={`text-xs px-2 py-0.5 rounded-full border ${
            depositPaid
              ? "bg-green-500/10 text-green-400 border-green-500/20"
              : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
          }`}
        >
          {depositPaid ? "Deposit paid" : "Pending deposit"}
        </span>
        <Link href={`/artist/bookings/${bookingId}`} className="text-xs text-zinc-400 hover:text-white">
          View →
        </Link>
      </div>
    </div>
  );
}
