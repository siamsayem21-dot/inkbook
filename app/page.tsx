import Link from "next/link";

const features = [
  {
    icon: "💳",
    title: "Mandatory deposits, enforced automatically",
    body: "Every booking requires a deposit before it's confirmed. Artists stop feeling guilty — the platform says no for them.",
  },
  {
    icon: "📋",
    title: "Digital consent forms, state-specific",
    body: "Auto-generated forms for each state. Minor age verification built in. Signed before every single session.",
  },
  {
    icon: "📱",
    title: "SMS reminders that actually work",
    body: "Automatic texts at 48 hours and day-of. No-show rate drops from 20% industry average to under 4%.",
  },
  {
    icon: "🏷️",
    title: "Your brand. Your URL.",
    body: "bookings.yourstudio.com — clients never see InkBook. Looks like you built it yourself.",
  },
  {
    icon: "🚫",
    title: "Client blacklist",
    body: "Block problem clients studio-wide. Add by email or phone. They can't book anyone on your roster.",
  },
  {
    icon: "📝",
    title: "Session scope agreements",
    body: "Lock in the design before the needle touches skin. Kills scope creep and last-minute change demands.",
  },
];

const steps = [
  { n: "01", title: "Set up your studio", body: "Studio name, subdomain, logo — 10 minutes. Artists get an invite link." },
  { n: "02", title: "Clients book online", body: "They pick artist, date, style. No deposit = no booking. Simple." },
  { n: "03", title: "Platform handles the rest", body: "SMS reminders, consent forms, deposit enforcement. Automatic." },
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
  { value: "21,000+", label: "tattoo studios in USA & Canada" },
  { value: "$400/mo", label: "average lost to no-shows per artist" },
  { value: "1 no-show", label: "covers a full month of InkBook" },
  { value: "4%", label: "no-show rate on InkBook vs 20% industry avg" },
];

export default function HomePage() {
  return (
    <div className="bg-zinc-950 text-white min-h-screen">

      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-zinc-800/60 bg-zinc-950/90 backdrop-blur-sm px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center">
            <span className="text-black text-xs font-black">IB</span>
          </div>
          <span className="font-bold text-lg tracking-tight">InkBook</span>
        </div>
        <div className="hidden md:flex items-center gap-6 text-sm text-zinc-400">
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#how-it-works" className="hover:text-white transition-colors">How it works</a>
          <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-zinc-400 hover:text-white transition-colors hidden md:block">
            Log in
          </Link>
          <Link
            href="/register"
            className="bg-white text-black text-sm px-4 py-2 rounded-full font-semibold hover:bg-zinc-100 transition-colors"
          >
            Start free trial
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="text-center px-6 pt-24 pb-20 max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 bg-zinc-800/60 border border-zinc-700/50 rounded-full px-4 py-1.5 text-xs text-zinc-300 mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          Built for USA & Canada tattoo studios
        </div>
        <h1 className="text-5xl md:text-6xl font-bold leading-[1.1] tracking-tight mb-6">
          Stop losing money to<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-zinc-200 to-zinc-500">
            no-shows and chaos
          </span>
        </h1>
        <p className="text-zinc-400 text-lg md:text-xl mb-10 max-w-2xl mx-auto leading-relaxed">
          White-label booking pages, mandatory deposits, digital consent forms,
          and SMS reminders — all under your studio&apos;s brand.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/register"
            className="bg-white text-black px-7 py-3.5 rounded-full font-semibold text-sm hover:bg-zinc-100 transition-colors"
          >
            Start 14-day free trial →
          </Link>
          <Link
            href="/book/demo-studio"
            className="border border-zinc-700 px-7 py-3.5 rounded-full text-zinc-300 text-sm hover:border-zinc-500 hover:text-white transition-colors"
          >
            See a live booking page
          </Link>
        </div>
        <p className="text-zinc-600 text-xs mt-5">No credit card required · Cancel anytime</p>
      </section>

      {/* Stats bar */}
      <section className="border-y border-zinc-800 py-10 px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-2xl font-bold text-white mb-1">{s.value}</div>
              <div className="text-xs text-zinc-500">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Booking page mockup */}
      <section className="px-6 py-20 max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <p className="text-zinc-500 text-sm mb-2">White-label client experience</p>
          <h2 className="text-3xl font-bold">Looks like your studio. Runs on InkBook.</h2>
        </div>
        <div className="bg-white rounded-2xl overflow-hidden shadow-2xl shadow-black/50 border border-zinc-700">
          {/* Mock browser bar */}
          <div className="bg-zinc-100 px-4 py-3 flex items-center gap-3 border-b border-zinc-200">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-yellow-400" />
              <div className="w-3 h-3 rounded-full bg-green-400" />
            </div>
            <div className="flex-1 bg-white rounded-md px-3 py-1 text-xs text-zinc-400 text-center">
              bookings.blackanchortattoo.com
            </div>
          </div>
          {/* Mock booking page content */}
          <div className="bg-white text-zinc-900 p-8">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center">
                <span className="text-white text-xs font-bold">BA</span>
              </div>
              <div>
                <h3 className="font-bold">Black Anchor Tattoo</h3>
                <p className="text-zinc-500 text-xs">Austin, TX · Est. 2018</p>
              </div>
            </div>
            <h2 className="text-2xl font-bold mb-1">Book an appointment</h2>
            <p className="text-zinc-500 text-sm mb-6">Choose an artist to get started.</p>
            <div className="grid grid-cols-3 gap-4">
              {[
                { name: "Marcus", styles: ["Traditional", "Neo-trad"], rate: "$180" },
                { name: "Leila", styles: ["Fine line", "Minimalist"], rate: "$150" },
                { name: "Jonah", styles: ["Japanese", "Blackwork"], rate: "$200" },
              ].map((a) => (
                <div key={a.name} className="border border-zinc-200 rounded-xl p-4 hover:border-zinc-400 cursor-pointer transition-colors">
                  <div className="w-12 h-12 rounded-full bg-zinc-100 mb-3" />
                  <p className="font-semibold text-sm">{a.name}</p>
                  <p className="text-zinc-400 text-xs">From {a.rate}/hr</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {a.styles.map((s) => (
                      <span key={s} className="text-xs bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-full">{s}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-center text-xs text-zinc-300 mt-6">A deposit is required to confirm your booking</p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="px-6 py-20 max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-zinc-500 text-sm mb-2">Everything you need</p>
          <h2 className="text-3xl font-bold">Built around the real problems artists face</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f) => (
            <div
              key={f.title}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 hover:border-zinc-700 transition-colors"
            >
              <div className="text-2xl mb-4">{f.icon}</div>
              <h3 className="font-semibold mb-2 leading-snug">{f.title}</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="px-6 py-20 border-y border-zinc-800">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-zinc-500 text-sm mb-2">Simple by design</p>
            <h2 className="text-3xl font-bold">Up and running in one afternoon</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((s) => (
              <div key={s.n} className="text-center">
                <div className="text-5xl font-black text-zinc-800 mb-4">{s.n}</div>
                <h3 className="font-semibold text-lg mb-2">{s.title}</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="px-6 py-20 max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold">What studios need from a booking tool</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {testimonials.map((t) => (
            <div key={t.name} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <p className="text-zinc-200 text-sm leading-relaxed mb-5">&ldquo;{t.quote}&rdquo;</p>
              <div>
                <p className="font-semibold text-sm">{t.name}</p>
                <p className="text-zinc-500 text-xs">{t.studio}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="px-6 py-20 border-t border-zinc-800">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-zinc-500 text-sm mb-2">Transparent pricing</p>
            <h2 className="text-3xl font-bold">One prevented no-show pays for the month</h2>
            <p className="text-zinc-500 text-sm mt-3">+ 1% transaction fee on all bookings</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {plans.map((p) => (
              <div
                key={p.name}
                className={`rounded-2xl border p-8 flex flex-col items-center text-center ${
                  p.highlight
                    ? "border-white bg-zinc-900"
                    : "border-zinc-800 bg-zinc-900/40"
                }`}
              >
                {p.highlight && (
                  <span className="text-xs bg-white text-black px-3 py-1 rounded-full font-semibold mb-4">
                    Most popular
                  </span>
                )}
                <h3 className="text-xl font-bold mb-1">{p.name}</h3>
                <p className="text-zinc-400 text-sm mb-4">{p.artists}</p>
                <div className="flex items-end gap-1 mb-8">
                  <span className="text-4xl font-black">{p.price}</span>
                  <span className="text-zinc-400 mb-1">/mo</span>
                </div>
                <Link
                  href="/register"
                  className={`w-full py-3 rounded-full font-semibold text-sm transition-colors ${
                    p.highlight
                      ? "bg-white text-black hover:bg-zinc-100"
                      : "border border-zinc-700 text-zinc-300 hover:border-zinc-500"
                  }`}
                >
                  Get started
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-24 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-4xl font-bold mb-4">Ready to stop losing money?</h2>
          <p className="text-zinc-400 mb-10">
            Join studios already running on InkBook. 14-day free trial, no credit card required.
          </p>
          <Link
            href="/register"
            className="inline-block bg-white text-black px-8 py-4 rounded-full font-bold text-sm hover:bg-zinc-100 transition-colors"
          >
            Create your studio for free →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800 px-6 py-8 text-center text-zinc-600 text-xs max-w-5xl mx-auto">
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="w-5 h-5 rounded bg-white flex items-center justify-center">
            <span className="text-black text-[9px] font-black">IB</span>
          </div>
          <span className="text-zinc-400 font-semibold">InkBook</span>
        </div>
        <p>White-label tattoo studio management · USA & Canada</p>
        <p className="mt-1">© 2026 InkBook. All rights reserved.</p>
      </footer>

    </div>
  );
}
