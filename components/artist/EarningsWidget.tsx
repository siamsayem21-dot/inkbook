const weeks = [
  { label: "Wk 1", amount: 620 },
  { label: "Wk 2", amount: 840 },
  { label: "Wk 3", amount: 700 },
  { label: "Wk 4", amount: 640 },
];

export default function EarningsWidget() {
  const max = Math.max(...weeks.map((w) => w.amount));

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
      <h2 className="font-semibold mb-1">Earnings this month</h2>
      <p className="text-3xl font-bold mb-6">$2,800</p>
      <div className="flex items-end gap-4 h-20">
        {weeks.map((w) => (
          <div key={w.label} className="flex flex-col items-center gap-1 flex-1">
            <div
              className="w-full bg-zinc-600 rounded-t"
              style={{ height: `${(w.amount / max) * 100}%` }}
            />
            <span className="text-xs text-zinc-500">{w.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
