import RevenueChart from "@/components/owner/RevenueChart";

export default function RevenuePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Revenue</h1>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "This month", value: "$8,400" },
          { label: "Last month", value: "$7,200" },
          { label: "Transaction fees (1%)", value: "$84" },
          { label: "Deposits kept (no-shows)", value: "$450" },
        ].map((s) => (
          <div key={s.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <p className="text-zinc-400 text-xs mb-1">{s.label}</p>
            <p className="text-2xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>
      <RevenueChart />
    </div>
  );
}
