import MotionCard from "@/components/ui/MotionCard";

interface BookingCounts {
  confirmed: number;
  pending_deposit: number;
  completed: number;
  cancelled: number;
}

export default function BookingOverview({ counts }: { counts: BookingCounts }) {
  const total = counts.confirmed + counts.pending_deposit + counts.completed + counts.cancelled;
  const statuses = [
    { label: "Confirmed",       count: counts.confirmed,       dot: "bg-green-500", bar: "bg-green-500" },
    { label: "Deposit pending", count: counts.pending_deposit, dot: "bg-amber-500", bar: "bg-amber-500" },
    { label: "Completed",       count: counts.completed,       dot: "bg-zinc-400",  bar: "bg-zinc-400" },
    { label: "Cancelled",       count: counts.cancelled,       dot: "bg-red-500",   bar: "bg-red-500" },
  ];

  return (
    <MotionCard className="premium-card hover:shadow-elevation-4 transition-shadow duration-200 p-6" maxTiltDeg={2}>
      <h2 className="text-base font-semibold text-zinc-900 mb-5">Bookings overview</h2>
      <div className="space-y-4">
        {statuses.map((s) => (
          <div key={s.label} className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full shrink-0 ${s.dot}`} />
            <span className="text-sm text-zinc-600 w-28 shrink-0">{s.label}</span>
            <div className="flex-1 h-1.5 rounded-full bg-zinc-100 overflow-hidden">
              <div
                className={`h-full rounded-full ${s.bar} transition-[width] duration-500`}
                style={{ width: total > 0 ? `${Math.max((s.count / total) * 100, s.count > 0 ? 4 : 0)}%` : "0%" }}
              />
            </div>
            <span className="text-sm font-semibold text-zinc-900 w-6 text-right shrink-0">{s.count}</span>
          </div>
        ))}
      </div>
    </MotionCard>
  );
}
