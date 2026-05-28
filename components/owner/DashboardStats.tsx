const stats = [
  { label: "Total bookings", value: "142", change: "+12% this month" },
  { label: "Active artists", value: "4", change: "" },
  { label: "Monthly revenue", value: "$8,400", change: "+16% vs last month" },
  { label: "No-show rate", value: "3.2%", change: "Industry avg: 20%" },
];

export default function DashboardStats() {
  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
      {stats.map((s) => (
        <div key={s.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <p className="text-zinc-400 text-sm mb-1">{s.label}</p>
          <p className="text-2xl font-bold">{s.value}</p>
          {s.change && <p className="text-zinc-500 text-xs mt-1">{s.change}</p>}
        </div>
      ))}
    </div>
  );
}
