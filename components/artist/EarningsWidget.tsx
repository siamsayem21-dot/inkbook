export interface WeekEarning {
  label: string;
  amount: number;
}

function fmtMoney(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

export default function EarningsWidget({
  monthTotal,
  weeks,
}: {
  monthTotal: number;
  weeks: WeekEarning[];
}) {
  const max = Math.max(...weeks.map((w) => w.amount), 1);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
      <h2 className="font-semibold mb-1">Earnings this month</h2>
      <p className="text-3xl font-bold mb-6">{fmtMoney(monthTotal)}</p>
      {weeks.every((w) => w.amount === 0) ? (
        <p className="text-sm text-zinc-500 text-center py-4">No earnings this month yet</p>
      ) : (
        <div className="flex items-end gap-4 h-20">
          {weeks.map((w) => (
            <div key={w.label} className="flex flex-col items-center gap-1 flex-1">
              <div
                className="w-full bg-zinc-600 rounded-t"
                style={{ height: `${(w.amount / max) * 100}%`, minHeight: w.amount > 0 ? "4px" : "0" }}
              />
              <span className="text-xs text-zinc-500">{w.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
