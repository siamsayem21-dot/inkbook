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

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-5 sm:p-6">
      <h2 className="font-semibold text-zinc-900 mb-6">Monthly revenue</h2>
      {months.every((m) => m.amount === 0) ? (
        <p className="text-sm text-zinc-400 text-center py-8">No revenue data yet</p>
      ) : (
        <div className="flex items-end gap-3 h-32">
          {months.map((m) => (
            <div key={m.label} className="flex flex-col items-center gap-1 flex-1">
              <span className="text-[10px] text-zinc-500 mb-0.5 tabular-nums">
                {m.amount > 0 ? fmtMoney(m.amount) : ""}
              </span>
              {/* Fixed-height track so the bar's percentage height has something
                  real to resolve against — a bar's own flex-column parent has no
                  defined height, so height:"N%" on it silently computes to 0/auto
                  and every bar renders at minHeight regardless of amount. */}
              <div className="w-full h-20 flex items-end">
                <div
                  className="w-full bg-violet-500 rounded-t"
                  style={{ height: `${(m.amount / max) * 100}%`, minHeight: m.amount > 0 ? "4px" : "0" }}
                />
              </div>
              <span className="text-xs text-zinc-500">{m.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
