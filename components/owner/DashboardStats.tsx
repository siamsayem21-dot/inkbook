interface Stat {
  label: string;
  value: string;
  sub?: string;
}

export default function DashboardStats({ stats }: { stats: Stat[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-px bg-white/[0.05]">
      {stats.map((s) => (
        <div key={s.label} className="bg-ink p-6">
          <p className="label-xs text-zinc-600 mb-2">{s.label}</p>
          <p className="font-cinzel text-2xl font-bold text-gold">{s.value}</p>
          {s.sub && <p className="text-zinc-600 text-xs mt-1">{s.sub}</p>}
        </div>
      ))}
    </div>
  );
}
