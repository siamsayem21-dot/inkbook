const TOOLS = [
  { name: "Instagram DMs", role: "Taking requests", cost: "Free" },
  { name: "Calendly", role: "Scheduling", cost: "$16/mo" },
  { name: "Square", role: "Payments", cost: "2.6% fee" },
  { name: "JotForm", role: "Consent forms", cost: "$39/mo" },
  { name: "Venmo", role: "Deposits", cost: "1.9% fee" },
  { name: "Google Sheets", role: "Client tracking", cost: "Free" },
];

export default function ProblemSection() {
  return (
    <section className="px-6 py-24 md:py-32">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <div className="mb-16 md:mb-20">
          <p className="text-[11px] tracking-[0.18em] uppercase text-zinc-600 font-medium mb-4">
            The status quo
          </p>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.0] text-white text-balance max-w-2xl mb-6">
            Six apps.
            <br />
            Zero integration.
          </h2>
          <p className="text-zinc-500 text-base md:text-lg max-w-xl leading-relaxed">
            The average tattoo studio stitches together six different tools — none built for the industry, none talking to each other, all requiring manual copy-paste between them.
          </p>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Left: Current stack */}
          <div>
            <div className="border border-white/[0.08] bg-white/[0.02] overflow-hidden">
              <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
                <span className="text-[11px] tracking-[0.14em] uppercase text-zinc-600 font-medium">
                  Your current stack
                </span>
                <span className="text-[11px] text-zinc-700">
                  6 tools · 0 integration
                </span>
              </div>

              <div className="divide-y divide-white/[0.04]">
                {TOOLS.map(({ name, role, cost }) => (
                  <div
                    key={name}
                    className="flex items-center justify-between px-5 py-4"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-700 shrink-0" />
                      <span className="text-sm text-zinc-300">{name}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-[11px] text-zinc-600">{role}</span>
                      <span className="text-[11px] text-zinc-500 border border-white/[0.06] bg-white/[0.02] px-2 py-0.5">
                        {cost}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="px-5 py-4 border-t border-white/[0.06] bg-white/[0.015]">
                <p className="text-[11px] text-zinc-600">
                  ~$340/yr in subscriptions · Manual copy-paste · Constant context switching
                </p>
              </div>
            </div>
          </div>

          {/* Right: The pain points */}
          <div className="space-y-4">
            {[
              {
                title: "No-shows cost you thousands",
                body: "Without mandatory deposits, clients can ghost. Studios lose an average $1,200/month to no-shows and last-minute cancellations.",
                badge: "Revenue loss",
                color: "text-red-400 bg-red-500/10 border-red-500/20",
              },
              {
                title: "Inquiries fall through the cracks",
                body: "DMs across Instagram, email, and text mean leads get lost. No tracking, no follow-up, no system. You're manually chasing every booking.",
                badge: "Operational chaos",
                color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
              },
              {
                title: "Paper forms aren't protection",
                body: "Handwritten consent forms have no timestamp, no IP address, no state compliance. They won't protect you if something goes wrong.",
                badge: "Legal risk",
                color: "text-orange-400 bg-orange-500/10 border-orange-500/20",
              },
            ].map(({ title, body, badge, color }) => (
              <div
                key={title}
                className="border border-white/[0.08] bg-white/[0.02] px-5 py-5"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span
                        className={`text-[10px] font-medium tracking-[0.1em] uppercase px-2 py-0.5 border ${color}`}
                      >
                        {badge}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-white mb-1.5">
                      {title}
                    </h3>
                    <p className="text-[13px] text-zinc-500 leading-relaxed">
                      {body}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Resolution statement */}
        <div className="mt-16 pt-12 border-t border-white/[0.06] flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <h3 className="text-2xl md:text-3xl font-bold text-white tracking-tight mb-2">
              InkBook replaces all of it.
            </h3>
            <p className="text-zinc-500 text-sm max-w-md">
              One platform built specifically for tattoo studios. Every module connected. Zero manual copy-paste.
            </p>
          </div>
          <a
            href="#platform"
            className="flex items-center gap-2 text-[13px] text-zinc-400 border border-white/[0.08] px-5 py-2.5 hover:border-white/20 hover:text-white transition-all duration-200 whitespace-nowrap shrink-0"
          >
            See the platform
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              aria-hidden
            >
              <path
                d="M2.5 6h7M6.5 3l3 3-3 3"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}
