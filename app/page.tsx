import Link from "next/link";

const features = [
  {
    symbol: "▣",
    title: "Mandatory Deposits, Enforced Automatically",
    body: "Every booking requires a deposit before it's confirmed. Artists stop feeling guilty — the platform says no for them.",
  },
  {
    symbol: "◈",
    title: "Digital Consent Forms, State-Specific",
    body: "Auto-generated forms for each state. Minor age verification built in. Signed before every single session.",
  },
  {
    symbol: "◉",
    title: "SMS Reminders That Actually Work",
    body: "Automatic texts at 48 hours and day-of. No-show rate drops from 20% industry average to under 4%.",
  },
  {
    symbol: "◎",
    title: "Your Brand. Your URL.",
    body: "bookings.yourstudio.com — clients never see InkBook. Looks like you built it yourself.",
  },
  {
    symbol: "✕",
    title: "Client Blacklist",
    body: "Block problem clients studio-wide. Add by email or phone. They can't book anyone on your roster.",
  },
  {
    symbol: "◆",
    title: "Session Scope Agreements",
    body: "Lock in the design before the needle touches skin. Kills scope creep and last-minute change demands.",
  },
];

const steps = [
  { n: "01", title: "Set Up Your Studio", body: "Studio name, subdomain, logo — 10 minutes. Artists get an invite link." },
  { n: "02", title: "Clients Book Online", body: "They pick artist, date, style. No deposit = no booking. Simple." },
  { n: "03", title: "Platform Handles the Rest", body: "SMS reminders, consent forms, deposit enforcement. Automatic." },
];

const plans = [
  { name: "Solo", price: "$49", artists: "1 artist", highlight: false },
  { name: "Studio", price: "$79", artists: "2–5 artists", highlight: true },
  { name: "Pro", price: "$129", artists: "6+ artists", highlight: false },
];

const testimonials = [
  {
    quote: "I used to lose $400 a month to no-shows. Last month I lost zero.",
    name: "Marcus T.",
    studio: "Black Anchor Tattoo, Austin TX",
  },
  {
    quote: "Clients stopped texting my personal number the day I switched. That alone was worth it.",
    name: "Priya S.",
    studio: "Lotus Ink, Vancouver BC",
  },
  {
    quote: "My consent forms were on paper. Now they're signed digitally before anyone walks in.",
    name: "Dave K.",
    studio: "Iron & Ash Studio, Chicago IL",
  },
];

const stats = [
  { value: "21,000+", label: "Tattoo Studios in USA & Canada" },
  { value: "$400/mo", label: "Average Lost to No-Shows Per Artist" },
  { value: "1 No-Show", label: "Covers a Full Month of InkBook" },
  { value: "4%", label: "No-Show Rate vs 20% Industry Avg" },
];

export default function HomePage() {
  return (
    <div className="bg-ink text-white min-h-screen font-inter">

      {/* ── Nav ── */}
      <nav className="sticky top-0 z-50 border-b border-white/[0.06] bg-ink/90 backdrop-blur-sm px-6 py-4">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 border border-gold/50 flex items-center justify-center shrink-0">
              <span className="font-cinzel text-gold text-[10px] font-bold tracking-wider">IB</span>
            </div>
            <span className="font-cinzel text-base tracking-wider text-white">InkBook</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="label-xs text-zinc-500 hover:text-gold transition-colors">Features</a>
            <a href="#how-it-works" className="label-xs text-zinc-500 hover:text-gold transition-colors">How It Works</a>
            <a href="#pricing" className="label-xs text-zinc-500 hover:text-gold transition-colors">Pricing</a>
          </div>
          <div className="flex items-center gap-5">
            <Link href="/login" className="label-xs text-zinc-500 hover:text-white transition-colors hidden md:block">
              Sign In
            </Link>
            <Link
              href="/register"
              className="label-xs border border-gold text-gold px-5 py-2.5 hover:bg-gold hover:text-black transition-all duration-200"
            >
              Start Free Trial
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="grain relative text-center px-6 pt-28 pb-24 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(201,168,76,0.07),transparent)] pointer-events-none" />
        <div className="relative z-10 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2.5 border border-gold/25 px-5 py-2 mb-10">
            <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse shrink-0" />
            <span className="label-xs text-gold/80">Built for USA & Canada Tattoo Studios</span>
          </div>

          <h1 className="font-cinzel text-5xl md:text-7xl font-bold leading-[1.08] tracking-wide mb-8 text-balance">
            Stop Losing Money to<br />
            <span className="text-gold">No-Shows</span> and Chaos
          </h1>

          <p className="text-zinc-400 text-lg md:text-xl mb-12 max-w-2xl mx-auto leading-relaxed font-light">
            White-label booking pages, mandatory deposits, digital consent forms,
            and SMS reminders — all under your studio&apos;s brand.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="label-sm bg-gold text-black px-8 py-3.5 hover:bg-gold-light transition-colors"
            >
              Start 14-Day Free Trial →
            </Link>
            <Link
              href="/book/demo-studio"
              className="label-sm border border-white/20 text-zinc-400 px-8 py-3.5 hover:border-gold/40 hover:text-gold transition-all"
            >
              See a Live Booking Page
            </Link>
          </div>
          <p className="label-xs text-zinc-700 mt-6">No Credit Card Required · Cancel Anytime</p>
        </div>
      </section>

      <div className="gold-divider" />

      {/* ── Stats ── */}
      <section className="py-14 px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <div className="font-cinzel text-2xl md:text-3xl font-bold text-gold mb-2">{s.value}</div>
              <div className="label-xs text-zinc-600">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="gold-divider" />

      {/* ── Booking page mockup ── */}
      <section className="px-6 py-24 max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <p className="label-xs text-gold/70 mb-4">White-Label Client Experience</p>
          <h2 className="font-cinzel text-3xl md:text-4xl font-bold tracking-wide">
            Looks Like Your Studio.<br />Runs on InkBook.
          </h2>
        </div>
        <div className="border border-white/10 overflow-hidden shadow-2xl shadow-black/80">
          {/* Mock browser bar */}
          <div className="bg-zinc-900 px-4 py-3 flex items-center gap-3 border-b border-white/[0.08]">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
              <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
              <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
            </div>
            <div className="flex-1 bg-zinc-800 border border-white/[0.07] px-3 py-1 text-[11px] text-zinc-500 text-center font-mono">
              bookings.blackanchortattoo.com
            </div>
          </div>
          {/* Mock content — dark tattoo studio theme */}
          <div className="bg-[#0d0d0d] text-white p-8">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-9 h-9 border border-gold/35 flex items-center justify-center shrink-0">
                <span className="font-cinzel text-gold text-[10px] font-bold">BA</span>
              </div>
              <div>
                <h3 className="font-cinzel font-bold tracking-wide text-sm">Black Anchor Tattoo</h3>
                <p className="label-xs text-zinc-600 mt-0.5">Austin, TX · Est. 2018</p>
              </div>
            </div>
            <h2 className="font-cinzel text-2xl font-bold mb-1.5 tracking-wide">Book an Appointment</h2>
            <p className="text-zinc-500 text-sm mb-6">Choose an artist to get started.</p>
            <div className="grid grid-cols-3 gap-4">
              {[
                { name: "Marcus", styles: ["Traditional", "Neo-Trad"], rate: "$180" },
                { name: "Leila", styles: ["Fine Line", "Minimalist"], rate: "$150" },
                { name: "Jonah", styles: ["Japanese", "Blackwork"], rate: "$200" },
              ].map((a) => (
                <div key={a.name} className="bg-zinc-900/80 border border-white/[0.08] p-4 hover:border-gold/35 cursor-pointer transition-colors">
                  <div className="w-12 h-12 bg-zinc-800 mb-3 ring-1 ring-white/[0.06]" />
                  <p className="font-cinzel font-semibold text-xs tracking-wide">{a.name}</p>
                  <p className="text-gold text-xs font-medium mt-0.5">From {a.rate}/hr</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {a.styles.map((s) => (
                      <span key={s} className="text-[9px] uppercase tracking-[0.07em] bg-white/[0.04] text-zinc-500 px-1.5 py-0.5 border border-white/[0.06]">{s}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-center label-xs text-zinc-700 mt-6">A Deposit Is Required to Confirm Your Booking</p>
          </div>
        </div>
      </section>

      <div className="gold-divider" />

      {/* ── Features ── */}
      <section id="features" className="px-6 py-24 max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <p className="label-xs text-gold/70 mb-4">Everything You Need</p>
          <h2 className="font-cinzel text-3xl md:text-4xl font-bold tracking-wide">
            Built Around the Real Problems<br />Artists Face
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-white/[0.05]">
          {features.map((f) => (
            <div
              key={f.title}
              className="bg-ink p-8 hover:bg-zinc-900/60 transition-colors group"
            >
              <div className="text-gold/40 text-2xl mb-5 font-mono group-hover:text-gold/70 transition-colors">{f.symbol}</div>
              <h3 className="font-cinzel font-semibold text-xs tracking-wide mb-3 leading-snug">{f.title}</h3>
              <p className="text-zinc-500 text-sm leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="gold-divider" />

      {/* ── How it works ── */}
      <section id="how-it-works" className="px-6 py-24">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <p className="label-xs text-gold/70 mb-4">Simple by Design</p>
            <h2 className="font-cinzel text-3xl md:text-4xl font-bold tracking-wide">
              Up and Running in One Afternoon
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8">
            {steps.map((s) => (
              <div key={s.n} className="text-center">
                <div className="font-cinzel text-6xl font-black text-gold/12 mb-5 tracking-tighter leading-none">{s.n}</div>
                <h3 className="font-cinzel font-semibold text-sm tracking-wide mb-3">{s.title}</h3>
                <p className="text-zinc-500 text-sm leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="gold-divider" />

      {/* ── Testimonials ── */}
      <section className="px-6 py-24 max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <p className="label-xs text-gold/70 mb-4">Studio Owners</p>
          <h2 className="font-cinzel text-3xl md:text-4xl font-bold tracking-wide">
            What Studios Need from a Booking Tool
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {testimonials.map((t) => (
            <div key={t.name} className="bg-zinc-900/50 border border-white/[0.07] p-8">
              <div className="font-cinzel text-5xl text-gold/20 leading-none mb-4 select-none">&ldquo;</div>
              <p className="text-zinc-300 text-sm leading-relaxed italic mb-6">{t.quote}</p>
              <div className="border-t border-white/[0.07] pt-4">
                <p className="font-cinzel font-semibold text-xs tracking-wide">{t.name}</p>
                <p className="label-xs text-zinc-600 mt-1">{t.studio}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="gold-divider" />

      {/* ── Pricing ── */}
      <section id="pricing" className="px-6 py-24">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <p className="label-xs text-gold/70 mb-4">Transparent Pricing</p>
            <h2 className="font-cinzel text-3xl md:text-4xl font-bold tracking-wide">
              One Prevented No-Show Pays for the Month
            </h2>
            <p className="label-xs text-zinc-600 mt-4">+ 1% Transaction Fee on All Bookings</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {plans.map((p) => (
              <div
                key={p.name}
                className={`border p-10 flex flex-col items-center text-center transition-all relative ${
                  p.highlight
                    ? "border-gold/45 bg-zinc-900/60"
                    : "border-white/[0.08] bg-zinc-900/25"
                }`}
              >
                {p.highlight && (
                  <span className="label-xs text-black bg-gold px-4 py-1.5 absolute -top-3.5">
                    Most Popular
                  </span>
                )}
                <h3 className="font-cinzel text-xl font-bold tracking-wide mb-1 mt-3">{p.name}</h3>
                <p className="label-xs text-zinc-600 mb-6">{p.artists}</p>
                <div className="flex items-end gap-1 mb-10">
                  <span className="font-cinzel text-4xl font-black text-gold">{p.price}</span>
                  <span className="text-zinc-500 mb-1 text-sm">/mo</span>
                </div>
                <Link
                  href="/register"
                  className={`w-full py-3 label-sm transition-all ${
                    p.highlight
                      ? "bg-gold text-black hover:bg-gold-light"
                      : "border border-white/20 text-zinc-400 hover:border-gold/40 hover:text-gold"
                  }`}
                >
                  Get Started
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="gold-divider" />

      {/* ── CTA ── */}
      <section className="grain relative px-6 py-28 text-center overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_80%_at_50%_50%,rgba(201,168,76,0.06),transparent)] pointer-events-none" />
        <div className="relative z-10 max-w-2xl mx-auto">
          <p className="label-xs text-gold/70 mb-5">Join InkBook</p>
          <h2 className="font-cinzel text-4xl md:text-5xl font-bold tracking-wide mb-6">
            Ready to Stop Losing Money?
          </h2>
          <p className="text-zinc-500 mb-12 leading-relaxed">
            Join studios already running on InkBook. 14-day free trial, no credit card required.
          </p>
          <Link
            href="/register"
            className="label-sm inline-block bg-gold text-black px-10 py-4 hover:bg-gold-light transition-colors"
          >
            Create Your Studio for Free →
          </Link>
        </div>
      </section>

      <div className="gold-divider" />

      {/* ── Footer ── */}
      <footer className="px-6 py-10 max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 border border-gold/35 flex items-center justify-center">
              <span className="font-cinzel text-gold text-[9px] font-bold">IB</span>
            </div>
            <span className="font-cinzel text-sm tracking-wider text-zinc-500">InkBook</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="label-xs text-zinc-700 hover:text-zinc-400 transition-colors">Privacy</Link>
            <Link href="/terms" className="label-xs text-zinc-700 hover:text-zinc-400 transition-colors">Terms</Link>
          </div>
          <p className="label-xs text-zinc-700">© 2026 InkBook · USA & Canada</p>
        </div>
      </footer>

    </div>
  );
}
