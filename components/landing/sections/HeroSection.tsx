import Link from "next/link";
import { ArrowRight, TrendingUp, Zap, CheckCircle, Calendar } from "lucide-react";

const consultations = [
  {
    initials: "JM",
    name: "Jordan M.",
    detail: "Blackwork sleeve — wolf geometric",
    badge: "AI Ready",
    badgeClass: "bg-gold/10 text-gold border border-gold/25",
  },
  {
    initials: "AT",
    name: "Ash T.",
    detail: "Fine line portrait — shoulder piece",
    badge: "Quote Sent",
    badgeClass: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
  },
  {
    initials: "SK",
    name: "Sam K.",
    detail: "Neo-traditional — $200 deposit paid",
    badge: "Confirmed",
    badgeClass: "bg-green-500/10 text-green-400 border border-green-500/20",
  },
];

function DashboardMockup() {
  return (
    <div className="relative w-full max-w-[500px] mx-auto lg:mx-0">
      <div className="absolute -inset-6 bg-[radial-gradient(ellipse_70%_60%_at_50%_50%,rgba(220,38,38,0.07),transparent)] pointer-events-none" />

      {/* Main card */}
      <div className="relative bg-zinc-900/80 border border-white/[0.09] backdrop-blur-sm overflow-hidden shadow-2xl">

        {/* Header bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.07] bg-zinc-950/70">
          <div className="flex items-center gap-2.5">
            <div className="w-5 h-5 border border-gold/40 flex items-center justify-center">
              <span className="font-cinzel text-gold text-[7px] font-bold">IB</span>
            </div>
            <span className="text-xs text-zinc-400 font-medium">Ink & Iron Studio</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[10px] text-zinc-500 uppercase tracking-widest">Live</span>
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-3 divide-x divide-white/[0.06] border-b border-white/[0.07]">
          <div className="px-4 py-4">
            <p className="text-[10px] text-zinc-600 uppercase tracking-widest mb-1">Revenue</p>
            <p className="font-cinzel text-white text-lg font-bold">$12,840</p>
            <div className="flex items-center gap-1 mt-0.5">
              <TrendingUp className="w-2.5 h-2.5 text-green-400" />
              <span className="text-[9px] text-green-400">+18% this mo.</span>
            </div>
          </div>
          <div className="px-4 py-4">
            <p className="text-[10px] text-zinc-600 uppercase tracking-widest mb-1">Bookings</p>
            <p className="font-cinzel text-white text-lg font-bold">47</p>
            <span className="text-[9px] text-zinc-600">this month</span>
          </div>
          <div className="px-4 py-4">
            <p className="text-[10px] text-zinc-600 uppercase tracking-widest mb-1">Dep. Rate</p>
            <p className="font-cinzel text-white text-lg font-bold">94%</p>
            <span className="text-[9px] text-zinc-600">auto-collected</span>
          </div>
        </div>

        {/* AI Consultations */}
        <div className="px-5 py-4 border-b border-white/[0.07]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Zap className="w-3 h-3 text-gold" />
              <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-medium">AI Consultations</span>
            </div>
            <span className="text-[10px] text-red-400 font-medium">3 new tonight</span>
          </div>
          <div className="space-y-2.5">
            {consultations.map((c) => (
              <div key={c.initials} className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 bg-zinc-800 border border-white/[0.08] flex items-center justify-center shrink-0">
                    <span className="text-[9px] text-zinc-400 font-bold">{c.initials}</span>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-300 font-medium leading-none mb-0.5">{c.name}</p>
                    <p className="text-[10px] text-zinc-600 leading-none">{c.detail}</p>
                  </div>
                </div>
                <span className={`text-[9px] px-2 py-0.5 uppercase tracking-widest whitespace-nowrap ${c.badgeClass}`}>
                  {c.badge}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer row */}
        <div className="flex items-center justify-between px-5 py-3 bg-zinc-950/50">
          <div className="flex items-center gap-1.5">
            <CheckCircle className="w-3 h-3 text-green-400" />
            <span className="text-[10px] text-zinc-500">All deposits auto-collected</span>
          </div>
          <span className="text-[10px] text-zinc-600">View all →</span>
        </div>
      </div>

      {/* Floating notification */}
      <div className="absolute -bottom-5 -left-5 bg-zinc-900 border border-white/[0.10] px-4 py-3 flex items-center gap-3 shadow-xl">
        <div className="w-7 h-7 bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
          <Calendar className="w-3.5 h-3.5 text-red-400" />
        </div>
        <div>
          <p className="text-[10px] text-zinc-300 font-medium">New booking via AI</p>
          <p className="text-[10px] text-zinc-600">Deposit $150 · Forms signed</p>
        </div>
        <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
      </div>
    </div>
  );
}

export default function HeroSection() {
  return (
    <section className="relative px-6 pt-20 pb-28 overflow-hidden">
      <div className="absolute inset-0 bg-grid" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_55%_50%_at_0%_0%,rgba(220,38,38,0.06),transparent)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_45%_40%_at_100%_100%,rgba(201,168,76,0.05),transparent)]" />

      <div className="relative z-10 max-w-6xl mx-auto">
        <div className="flex flex-col lg:flex-row items-center gap-14 lg:gap-16">

          {/* Left: copy */}
          <div className="flex-1 max-w-xl text-center lg:text-left">
            <div className="inline-flex items-center gap-2.5 border border-gold/25 bg-gold/[0.04] px-4 py-2 mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse shrink-0" />
              <span className="label-xs text-gold/80">AI-Powered · Built for USA & Canada</span>
            </div>

            <h1 className="font-cinzel text-4xl sm:text-5xl lg:text-[3.5rem] font-bold leading-[1.08] tracking-wide mb-6 text-balance">
              Turn Instagram inquiries into qualified tattoo bookings.
            </h1>

            <p className="text-zinc-400 text-lg leading-relaxed mb-10 max-w-lg mx-auto lg:mx-0">
              AI consultation, artist matching, deposits, booking, consent forms, CRM, and studio management — all in one platform.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start mb-8">
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2 label-sm bg-[#DC2626] text-white px-8 py-4 hover:bg-[#b91c1c] transition-colors group"
              >
                Start Free Trial
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link
                href="/book/demo-studio"
                className="inline-flex items-center justify-center label-sm border border-white/20 text-zinc-300 px-8 py-4 hover:border-white/40 hover:text-white transition-all"
              >
                Book Demo
              </Link>
            </div>

            <p className="label-xs text-zinc-700">
              14-day free trial · No credit card required · Cancel anytime
            </p>
          </div>

          {/* Right: dashboard mockup */}
          <div className="flex-1 w-full flex justify-center lg:justify-end pt-6 lg:pt-0">
            <DashboardMockup />
          </div>
        </div>
      </div>
    </section>
  );
}
