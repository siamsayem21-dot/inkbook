const stats = [
  { value: "500+", label: "Studios running on InkBook" },
  { value: "$2.4M+", label: "In deposits auto-collected" },
  { value: "12,000+", label: "Bookings processed" },
  { value: "94%", label: "Reduction in no-shows" },
];

export default function TrustStrip() {
  return (
    <div className="border-y border-[#E5E7EB] bg-[#F8FAFC]">
      <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 divide-x divide-[#E5E7EB]">
        {stats.map((stat) => (
          <div key={stat.label} className="px-8 py-7 text-center">
            <p className="text-[#0F172A] text-2xl font-bold tabular-nums tracking-[-0.02em] mb-1">
              {stat.value}
            </p>
            <p className="text-[#64748B] text-xs">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
