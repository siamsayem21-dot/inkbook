const STATS = [
  { val: "500+", label: "Studios active", sub: "USA & Canada" },
  { val: "$2.4M+", label: "Deposits protected", sub: "auto-collected" },
  { val: "12,000+", label: "Bookings processed", sub: "and counting" },
  { val: "94%", label: "No-show reduction", sub: "vs. industry avg." },
];

export default function StatsSection() {
  return (
    <section className="border-y border-white/[0.06]">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-white/[0.06]">
          {STATS.map(({ val, label, sub }) => (
            <div key={label} className="px-6 md:px-10 py-10 md:py-12">
              <div className="text-3xl md:text-4xl font-bold text-white tabular-nums tracking-tight mb-1.5">
                {val}
              </div>
              <div className="text-[13px] text-zinc-300 mb-0.5">{label}</div>
              <div className="text-[11px] text-zinc-600">{sub}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
