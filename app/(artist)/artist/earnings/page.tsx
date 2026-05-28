import EarningsWidget from "@/components/artist/EarningsWidget";

export default function EarningsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">My Earnings</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "This month", value: "$2,800" },
          { label: "Last month", value: "$3,100" },
          { label: "All time", value: "$41,200" },
        ].map((s) => (
          <div key={s.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <p className="text-zinc-400 text-sm mb-1">{s.label}</p>
            <p className="text-2xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>
      <EarningsWidget />
    </div>
  );
}
