const TESTIMONIALS = [
  {
    quote:
      "I was spending 3 hours a day managing Instagram DMs and chasing deposits. InkBook automated everything. Within 30 days I had those hours back.",
    name: "Marcus T.",
    role: "Owner · Black Anchor Tattoo",
    location: "Austin, TX",
  },
  {
    quote:
      "The deposit enforcement paid for InkBook within the first week. We haven't had a ghost booking since. That alone is worth every penny.",
    name: "Keisha R.",
    role: "Studio Owner · Rose & Thorn Studio",
    location: "Toronto, ON",
  },
  {
    quote:
      "Every other booking tool I tested was built for spas or salons. InkBook is the first platform that actually understands how tattoo studios work.",
    name: "David C.",
    role: "Solo Artist · 12 years in the industry",
    location: "Los Angeles, CA",
  },
];

const METRICS = [
  { val: "500+", label: "Studios active", sub: "USA & Canada" },
  { val: "$2.4M+", label: "Deposits protected", sub: "auto-collected" },
  { val: "12,000+", label: "Bookings processed", sub: "and counting" },
  { val: "94%", label: "No-show reduction", sub: "vs. unprotected studios" },
];

export default function ProofSection() {
  return (
    <section className="px-6 py-24 md:py-32 border-t border-white/[0.06]">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-14 md:mb-16">
          <p className="text-[11px] tracking-[0.18em] uppercase text-zinc-600 font-medium mb-4">
            Results
          </p>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight text-white max-w-2xl">
            Studios using InkBook
            <br />
            stop losing money.
          </h2>
        </div>

        {/* Testimonials */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-16">
          {TESTIMONIALS.map(({ quote, name, role, location }) => (
            <div
              key={name}
              className="border border-white/[0.08] bg-white/[0.02] px-6 py-7 flex flex-col justify-between"
            >
              <p className="text-[14px] text-zinc-300 leading-relaxed mb-8">
                &ldquo;{quote}&rdquo;
              </p>
              <div>
                <p className="text-[13px] font-medium text-white">{name}</p>
                <p className="text-[11px] text-zinc-600 mt-0.5">{role}</p>
                <p className="text-[11px] text-zinc-700 mt-0.5">{location}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-white/[0.06] border border-white/[0.06]">
          {METRICS.map(({ val, label, sub }) => (
            <div key={label} className="px-6 md:px-8 py-8">
              <div className="text-3xl md:text-4xl font-bold text-white tabular-nums tracking-tight mb-1.5">
                {val}
              </div>
              <div className="text-[13px] text-zinc-400 mb-0.5">{label}</div>
              <div className="text-[11px] text-zinc-600">{sub}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
