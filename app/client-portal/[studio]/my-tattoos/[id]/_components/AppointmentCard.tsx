import Link from "next/link";
import { CalendarClock } from "lucide-react";
import SectionCard from "./SectionCard";
import type { ProjectDetailData } from "../types";

interface Props {
  appointment: ProjectDetailData["appointment"];
}

export default function AppointmentCard({ appointment }: Props) {
  if (!appointment || !appointment.dateLabel) {
    return (
      <SectionCard id="appointment" icon={CalendarClock} title="Appointment / Booking" muted>
        <p className="text-sm text-zinc-500">Not scheduled yet.</p>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      id="appointment"
      icon={CalendarClock}
      title="Appointment / Booking"
      badge={
        <span className="text-[11px] font-medium text-violet-700 bg-violet-50 px-2.5 py-1 rounded-full whitespace-nowrap">
          {appointment.statusLabel}
        </span>
      }
    >
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3.5">
        <div>
          <p className="text-xs text-zinc-400">Date</p>
          <p className="text-sm font-medium text-zinc-800 mt-0.5">{appointment.dateLabel}</p>
        </div>
        <div>
          <p className="text-xs text-zinc-400">Time</p>
          <p className="text-sm font-medium text-zinc-800 mt-0.5">{appointment.timeLabel ?? "—"}</p>
        </div>
        <div>
          <p className="text-xs text-zinc-400">Artist</p>
          <p className="text-sm font-medium text-zinc-800 mt-0.5">{appointment.artistName ?? "—"}</p>
        </div>
        <div>
          <p className="text-xs text-zinc-400">Studio</p>
          <p className="text-sm font-medium text-zinc-800 mt-0.5">{appointment.studioName}</p>
        </div>
        {appointment.durationLabel && (
          <div className="col-span-2 sm:col-span-4">
            <p className="text-xs text-zinc-400">Session Duration</p>
            <p className="text-sm font-medium text-zinc-800 mt-0.5">{appointment.durationLabel}</p>
          </div>
        )}
      </div>

      {appointment.viewHref && (
        <div className="mt-4 pt-4 border-t border-zinc-100">
          <Link href={appointment.viewHref} className="text-sm font-semibold text-violet-600 hover:text-violet-700 transition-colors">
            View Appointment →
          </Link>
        </div>
      )}
    </SectionCard>
  );
}
