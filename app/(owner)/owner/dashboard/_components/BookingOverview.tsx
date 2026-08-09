interface BookingCounts {
  confirmed: number;
  pending_deposit: number;
  completed: number;
  cancelled: number;
}

export default function BookingOverview({ counts }: { counts: BookingCounts }) {
  const statuses = [
    { label: "Confirmed",       count: counts.confirmed,       color: "bg-green-500" },
    { label: "Deposit pending", count: counts.pending_deposit, color: "bg-amber-500" },
    { label: "Completed",       count: counts.completed,       color: "bg-zinc-400" },
    { label: "Cancelled",       count: counts.cancelled,       color: "bg-red-500" },
  ];

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6">
      <h2 className="text-base font-semibold text-zinc-900 mb-5">Bookings overview</h2>
      <div className="space-y-3.5">
        {statuses.map((s) => (
          <div key={s.label} className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${s.color}`} />
            <span className="text-sm text-zinc-600 flex-1">{s.label}</span>
            <span className="text-sm font-semibold text-zinc-900">{s.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
