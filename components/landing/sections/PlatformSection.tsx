const MODULES = [
  {
    name: "AI Consultation",
    desc: "Qualifies every inquiry — style, placement, size, budget — before you see it.",
    tag: "AI-powered",
  },
  {
    name: "Artist Matching",
    desc: "Routes leads to the right artist based on style, availability, and portfolio match.",
    tag: "Automated",
  },
  {
    name: "Quotes & Estimates",
    desc: "Professional quotes generated from the AI lead brief. One-click delivery.",
    tag: "Automated",
  },
  {
    name: "Deposit Collection",
    desc: "Mandatory Stripe deposits on every booking. Auto-kept on no-shows. No exceptions.",
    tag: "Enforced",
  },
  {
    name: "Booking Management",
    desc: "Calendar, availability, capacity, waitlist, and rescheduling — all in one place.",
    tag: "Full control",
  },
  {
    name: "Digital Consent Forms",
    desc: "State-compliant forms signed in under 60 seconds. IP logged. Timestamp verified.",
    tag: "Compliant",
  },
  {
    name: "Client CRM",
    desc: "Full client history, session notes, flags, and blacklist across all artists.",
    tag: "Connected",
  },
  {
    name: "SMS Reminders",
    desc: "48-hour and day-of reminders sent automatically. Customizable per studio.",
    tag: "Automated",
  },
  {
    name: "Session Agreements",
    desc: "Digital scope-creep protection signed before every session. Covers design changes.",
    tag: "Protection",
  },
  {
    name: "Owner Dashboard",
    desc: "Full revenue visibility, per-artist performance, and deposit collection rates.",
    tag: "Intelligence",
  },
  {
    name: "Aftercare Automation",
    desc: "Post-session instructions delivered automatically via SMS. Photo check-ins included.",
    tag: "Automated",
  },
  {
    name: "Review Requests",
    desc: "Automated review asks sent via SMS after sessions. Directs to Google and InkBook.",
    tag: "Automated",
  },
];

export default function PlatformSection() {
  return (
    <section id="platform" className="px-6 py-24 md:py-32 border-t border-white/[0.06]">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-14 md:mb-16 max-w-2xl">
          <p className="text-[11px] tracking-[0.18em] uppercase text-zinc-600 font-medium mb-4">
            The platform
          </p>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight text-white mb-5">
            One system.
            <br />
            Every part of your studio.
          </h2>
          <p className="text-zinc-500 text-base leading-relaxed">
            Twelve interconnected modules. Each one built for how tattoo studios actually work — not adapted from a generic booking tool.
          </p>
        </div>

        {/* Module grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-px bg-white/[0.06]">
          {MODULES.map(({ name, desc, tag }) => (
            <div
              key={name}
              className="bg-[#090909] px-5 py-6 group hover:bg-white/[0.025] transition-colors duration-200"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-[13px] font-semibold text-white leading-snug">
                  {name}
                </h3>
              </div>
              <p className="text-[12px] text-zinc-600 leading-relaxed mb-4">
                {desc}
              </p>
              <span className="text-[10px] tracking-[0.1em] uppercase text-zinc-700 font-medium">
                {tag}
              </span>
            </div>
          ))}
        </div>

        <p className="text-[12px] text-zinc-700 mt-6 text-center">
          All modules included on every plan. No add-ons. No feature gating.
        </p>
      </div>
    </section>
  );
}
