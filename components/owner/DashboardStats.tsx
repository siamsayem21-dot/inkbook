interface Stat {
  label: string;
  value: string;
  sub?: string;
}

export default function DashboardStats({ stats }: { stats: Stat[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {stats.map((s) => (
        <div key={s.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <p className="text-zinc-400 text-sm mb-1">{s.label}</p>
          <p className="text-2xl font-bold">{s.value}</p>
          {s.sub && <p className="text-zinc-500 text-xs mt-1">{s.sub}</p>}
        </div>
      ))}
    </div>
  );
}
