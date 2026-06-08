const stats = [
  { value: "500+", label: "Studios active" },
  { value: "$2.4M+", label: "In deposits protected" },
  { value: "12,000+", label: "Bookings processed" },
  { value: "94%", label: "No-show reduction" },
];

const testimonials = [
  {
    quote: "I was spending 3 hours a day managing Instagram DMs and chasing deposits. InkBook automated my entire intake. I show up and tattoo now.",
    name: "Marcus T.",
    title: "Owner",
    studio: "Black Anchor Tattoo",
    location: "Austin, TX",
    initials: "MT",
    outcome: "3 hrs/day",
    outcomeLabel: "saved on client intake",
  },
  {
    quote: "The deposit enforcement paid for InkBook within the first week. We haven't had a ghost booking in four months. The math is obvious.",
    name: "Keisha R.",
    title: "Studio Owner",
    studio: "Rose & Thorn Studio",
    location: "Toronto, ON",
    initials: "KR",
    outcome: "Zero",
    outcomeLabel: "ghost bookings in 4 months",
  },
  {
    quote: "Every other booking tool I tested was built for spas or salons. InkBook is the first platform that actually understands how tattoo studios operate.",
    name: "David C.",
    title: "Solo Artist",
    studio: "12 years in the industry",
    location: "Los Angeles, CA",
    initials: "DC",
    outcome: "94%",
    outcomeLabel: "fewer no-shows, month one",
  },
];

export default function SocialProofSection() {
  return (
    <section className="px-6 py-28 bg-white border-t border-[#E5E7EB]">
      <div className="max-w-6xl mx-auto">

        {/* Section header */}
        <div className="mb-14">
          <p className="label-xs text-[#64748B] mb-4">Results</p>
          <h2 className="text-4xl md:text-5xl font-bold tracking-[-0.02em] text-[#0F172A]">
            Studios using InkBook stop losing money.
          </h2>
        </div>

        {/* Stats */}
        <div
          className="grid grid-cols-2 md:grid-cols-4 border border-[#E5E7EB] divide-x divide-[#E5E7EB] mb-12"
          style={{ boxShadow: "0 0 0 1px rgba(0,0,0,0.03), 0 4px 16px rgba(0,0,0,0.05)" }}
        >
          {stats.map((stat) => (
            <div key={stat.label} className="px-6 py-10 text-center bg-[#F8FAFC]">
              <p className="text-[#0F172A] text-4xl font-bold tabular-nums tracking-[-0.02em] mb-2">
                {stat.value}
              </p>
              <p className="text-[#64748B] text-sm">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Testimonials — outcome-first layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="bg-white border border-[#E5E7EB] p-6 flex flex-col"
              style={{ boxShadow: "0 0 0 1px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.07), 0 16px 40px rgba(0,0,0,0.05)" }}
            >
              {/* Outcome metric */}
              <div className="mb-5 pb-5 border-b border-[#F3F4F6]">
                <p className="text-[#0F172A] text-2xl font-bold tabular-nums tracking-tight">{t.outcome}</p>
                <p className="text-[#94A3B8] text-xs mt-0.5">{t.outcomeLabel}</p>
              </div>
              {/* Quote */}
              <p className="text-[#374151] text-sm leading-relaxed flex-1 mb-6">
                &ldquo;{t.quote}&rdquo;
              </p>
              {/* Author */}
              <div className="flex items-center gap-3 pt-4 border-t border-[#F3F4F6]">
                <div className="w-8 h-8 bg-[#F3F4F6] border border-[#E5E7EB] flex items-center justify-center shrink-0">
                  <span className="text-[9px] text-[#64748B] font-bold">{t.initials}</span>
                </div>
                <div>
                  <p className="text-[#0F172A] text-sm font-semibold">{t.name} — {t.title}</p>
                  <p className="text-[#94A3B8] text-xs">{t.studio} · {t.location}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
