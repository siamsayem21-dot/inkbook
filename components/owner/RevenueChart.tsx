// Placeholder chart — replace with Recharts or Chart.js once installed
export default function RevenueChart() {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
  const values = [3200, 4100, 5800, 6300, 7200, 8400];
  const max = Math.max(...values);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
      <h2 className="font-semibold mb-6">Monthly revenue</h2>
      <div className="flex items-end gap-3 h-32">
        {months.map((month, i) => (
          <div key={month} className="flex flex-col items-center gap-1 flex-1">
            <div
              className="w-full bg-zinc-600 rounded-t"
              style={{ height: `${(values[i] / max) * 100}%` }}
            />
            <span className="text-xs text-zinc-500">{month}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
