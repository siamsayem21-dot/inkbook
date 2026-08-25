import MotionCard from "@/components/ui/MotionCard";

export interface MonthRevenue {
  label: string; // e.g. "Jan"
  amount: number; // dollars
}

function fmtMoney(n: number) {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${n}`;
}

export default function RevenueChart({ months }: { months: MonthRevenue[] }) {
  const max = Math.max(...months.map((m) => m.amount), 1);
  const empty = months.every((m) => m.amount === 0);

  return (
    <MotionCard className="premium-card hover:shadow-elevation-4 transition-shadow duration-200 p-6" maxTiltDeg={2}>
      <h2 className="text-base font-semibold text-zinc-900 mb-6">Monthly revenue</h2>
      {empty ? (
        <div data-parallax data-parallax-strength="4" className="rounded-xl bg-violet-50/50 border border-violet-100/70 py-10 text-center">
          <p className="text-sm text-zinc-400">No revenue data yet</p>
        </div>
      ) : (
        <div className="flex items-end gap-3 h-32">
          {months.map((m) => (
            <div key={m.label} className="flex flex-col items-center gap-1 flex-1">
              <span className="text-[10px] text-zinc-400 mb-0.5">
                {m.amount > 0 ? fmtMoney(m.amount) : ""}
              </span>
              <div
                className="w-full bg-gradient-to-t from-violet-600 to-violet-400 rounded-t-md shadow-[0_2px_8px_-2px_rgba(124,58,237,0.4)]"
                style={{ height: `${(m.amount / max) * 100}%`, minHeight: m.amount > 0 ? "4px" : "0" }}
              />
              <span className="text-xs text-zinc-400">{m.label}</span>
            </div>
          ))}
        </div>
      )}
    </MotionCard>
  );
}
