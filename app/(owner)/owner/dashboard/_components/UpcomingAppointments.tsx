import Link from "next/link";
import MotionCard from "@/components/ui/MotionCard";

export interface UpcomingAppointment {
  id: string;
  clientName: string;
  artistName: string;
  dateTimeLabel: string;
  status: string;
  statusLabel: string;
}

export default function UpcomingAppointments({ appointments }: { appointments: UpcomingAppointment[] }) {
  return (
    <MotionCard className="premium-card hover:shadow-elevation-4 transition-shadow duration-200 p-6 h-full flex flex-col" maxTiltDeg={2}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-zinc-900">Upcoming appointments</h2>
        <Link href="/owner/bookings" className="text-xs font-medium text-violet-600 hover:text-violet-700">
          All bookings →
        </Link>
      </div>

      {appointments.length === 0 ? (
        <div data-parallax data-parallax-strength="4" className="flex-1 flex items-center justify-center rounded-xl bg-violet-50/50 border border-violet-100/70">
          <p className="text-sm text-zinc-400 py-10 text-center px-6">No confirmed appointments scheduled yet.</p>
        </div>
      ) : (
        <div className="flex-1 divide-y divide-zinc-100">
          {appointments.map((a) => (
            <Link
              key={a.id}
              href={`/owner/bookings/${a.id}`}
              className="flex items-center gap-3 py-2.5 hover:bg-zinc-50 transition-colors -mx-1 px-1 rounded-lg"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-900 truncate">{a.clientName}</p>
                <p className="text-xs text-zinc-500 truncate">{a.artistName}</p>
              </div>
              <span className="text-xs text-zinc-500 shrink-0">{a.dateTimeLabel}</span>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 shrink-0">
                {a.statusLabel}
              </span>
            </Link>
          ))}
        </div>
      )}
    </MotionCard>
  );
}
