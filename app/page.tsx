"use client";

import { useState, useEffect } from "react";

/* ─── Icons ─── */
const IconMsg = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);
const IconAlert = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);
const IconDollar = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
);
const IconShield = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);
const IconMenu = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);
const IconClose = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const IconCheckSmall = ({ highlight }: { highlight?: boolean }) => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={highlight ? "#D4A853" : "#6B7280"} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

/* ─── Data ─── */
const PAIN_CARDS = [
  { icon: <IconMsg />, title: "Inquiries go unanswered for days", desc: "DMs pile up while you're tattooing. By the time you reply, the client has booked elsewhere." },
  { icon: <IconAlert />, title: "No system to follow up lost leads", desc: "Interested clients disappear after a quote. There's no way to track who's still considering." },
  { icon: <IconDollar />, title: "Deposits never collected upfront", desc: "Artists feel awkward asking for money. New clients ghost when the deposit conversation comes up." },
  { icon: <IconShield />, title: "No-shows with no protection", desc: "A blocked day costs $300–$800. Without a deposit policy in place, there is no recourse." },
];

const WORKFLOW_STEPS = [
  { num: "01", label: "Instagram Inquiry", desc: "Client DMs. Captured instantly.", ai: false },
  { num: "02", label: "AI Consultation", desc: "AI qualifies client and collects details.", ai: true },
  { num: "03", label: "AI Follow-Up", desc: "Follows up on cold leads automatically.", ai: true },
  { num: "04", label: "Quote", desc: "AI generates quote. Artist approves.", ai: true },
  { num: "05", label: "Deposit", desc: "Deposit link sent and collected.", ai: false },
  { num: "06", label: "Booking", desc: "Appointment locked in calendar.", ai: false },
  { num: "07", label: "Consent", desc: "Digital consent form signed.", ai: false },
  { num: "08", label: "Aftercare", desc: "Auto aftercare tips sent post-session.", ai: true },
  { num: "09", label: "Review", desc: "Review request sent automatically.", ai: false },
  { num: "10", label: "CRM", desc: "Client stored in studio CRM.", ai: false },
];

const TIMELINE = [
  { label: "Inquiry received via Instagram", time: "9:14 AM", done: true },
  { label: "AI sent consultation questions", time: "9:14 AM", done: true },
  { label: "Client replied with style details", time: "9:31 AM", done: true },
  { label: "Quote generated and sent", time: "9:32 AM", done: true },
  { label: "Artist approved quote", time: "10:05 AM", done: true, highlight: true },
  { label: "Deposit of $150 collected", time: "10:07 AM", done: true },
  { label: "Booking confirmed + calendar blocked", time: "10:07 AM", done: true },
  { label: "Digital consent form signed", time: "10:09 AM", done: true },
  { label: "48hr reminder queued", time: "Scheduled", done: false },
  { label: "Aftercare guide sends post-session", time: "Scheduled", done: false },
];

export default function HomePage() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [revenue, setRevenue] = useState(0);
  const [bookings, setBookings] = useState(0);
  const [deposits, setDeposits] = useState(0);

  useEffect(() => {
    const countUp = (
      setter: React.Dispatch<React.SetStateAction<number>>,
      target: number,
      duration: number
    ) => {
      const start = performance.now();
      const tick = (now: number) => {
        const p = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        setter(Math.round(eased * target));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    countUp(setRevenue, 12480, 1500);
    countUp(setBookings, 47, 1200);
    countUp(setDeposits, 100, 1000);
  }, []);

  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>("[data-animate], .reveal, .reveal-up, .reveal-scale");
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLElement;
            const delay = el.dataset.delay ? parseInt(el.dataset.delay) : 0;
            setTimeout(() => el.classList.add("in-view"), delay);
            io.unobserve(el);
          }
        });
      },
      { threshold: 0.12 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const heroStats = [
    { label: "Revenue", value: `$${revenue.toLocaleString()}` },
    { label: "Bookings", value: String(bookings) },
    { label: "Deposits", value: `${deposits}%` },
  ];

  return (
    <div style={{ background: "#F8F8F6", color: "#111111" }}>

      {/* ══ NAV ══ */}
      <header className="sticky top-0 z-50 bg-white border-b border-[#E5E5E3]">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between h-16">
          <a href="/" className="text-xl font-semibold tracking-tight text-[#111111]">
            InkBook
          </a>

          <nav className="hidden md:flex items-center gap-8">
            {(["Features", "Book Demo"] as const).map((link) => (
              <a
                key={link}
                href={`#${link.toLowerCase().replace(" ", "-")}`}
                className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
              >
                {link}
              </a>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <a
              href="#book-demo"
              className="border border-gray-300 rounded-full px-5 py-2 text-sm font-medium text-[#111111] hover:border-gray-400 transition-colors"
            >
              Book Demo
            </a>
            <a
              href="#trial"
              className="bg-black text-white rounded-full px-5 py-2 text-sm font-medium hover:bg-[#2A2A2A] transition-colors"
            >
              Start Free Trial
            </a>
          </div>

          <button
            className="md:hidden p-1.5 rounded-md text-[#111111]"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <IconClose /> : <IconMenu />}
          </button>
        </div>

        {mobileOpen && (
          <div className="md:hidden px-6 pt-2 pb-6 flex flex-col gap-1 border-t border-[#F3F4F6]">
            {(["Features", "Book Demo"] as const).map((link) => (
              <a
                key={link}
                href={`#${link.toLowerCase().replace(" ", "-")}`}
                className="py-2.5 text-sm font-medium text-gray-500"
                onClick={() => setMobileOpen(false)}
              >
                {link}
              </a>
            ))}
            <div className="flex flex-col gap-2 pt-3">
              <a
                href="#book-demo"
                className="py-2.5 text-sm font-medium rounded-full border border-gray-300 text-center text-[#111111]"
              >
                Book Demo
              </a>
              <a
                href="#trial"
                className="py-2.5 text-sm font-medium rounded-full bg-black text-white text-center"
              >
                Start Free Trial
              </a>
            </div>
          </div>
        )}
      </header>

      {/* ══ HERO ══ */}
      <section className="py-24 lg:py-32 px-6" style={{ background: "#F8F8F6" }}>
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">

            {/* Left */}
            <div>
              <span className="text-xs font-semibold tracking-widest uppercase text-[#D4A853]">
                Tattoo Business Operating System
              </span>
              <h1 className="text-5xl lg:text-6xl xl:text-7xl font-bold leading-[1.1] mt-4 text-[#111111]">
                Stop chasing inquiries.<br />Start tattooing.
              </h1>
              <p className="text-lg text-gray-500 mt-6 max-w-md">
                AI handles consultations, follow-ups, quotes, deposits, bookings, and aftercare — so you can focus on tattooing.
              </p>
              <div className="mt-10 flex flex-wrap gap-4">
                <a
                  href="#trial"
                  className="bg-black text-white rounded-full px-8 py-4 text-base font-medium hover:bg-[#2A2A2A] transition-colors"
                >
                  Start Free Trial
                </a>
                <a
                  href="#book-demo"
                  className="border border-gray-300 rounded-full px-8 py-4 text-base text-[#111111] hover:border-gray-400 transition-colors"
                >
                  Book Demo
                </a>
              </div>
              <p className="mt-4 text-sm text-gray-400">14-day free trial · No credit card required</p>
            </div>

            {/* Right: dashboard */}
            <div className="relative">
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: "radial-gradient(ellipse at center, rgba(212,168,83,0.07) 0%, transparent 70%)",
                  filter: "blur(24px)",
                  transform: "scale(1.1)",
                }}
              />
              <div
                className="relative rounded-2xl shadow-2xl overflow-hidden"
                style={{ background: "#0F0F0F", border: "1px solid #1F1F1F" }}
              >
                {/* Browser chrome */}
                <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: "1px solid #1F1F1F" }}>
                  <span className="w-3 h-3 rounded-full bg-red-400" />
                  <span className="w-3 h-3 rounded-full bg-yellow-400" />
                  <span className="w-3 h-3 rounded-full bg-green-400" />
                  <span className="flex-1 text-center text-xs text-gray-500">InkBook — Dashboard</span>
                </div>

                <div className="p-6 pb-14">
                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-3 mt-4">
                    {heroStats.map((s) => (
                      <div key={s.label} className="bg-[#1A1A1A] rounded-xl p-4">
                        <p className="text-xs text-gray-500">{s.label}</p>
                        <p className="text-3xl font-bold text-white mt-1">{s.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Recent Bookings */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-gray-500 uppercase tracking-wider">Recent Bookings</span>
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "rgba(34,197,94,0.12)", color: "#4ADE80" }}>Live</span>
                    </div>
                    {[
                      { name: "Sarah M.", status: "Deposit paid", amount: "$150" },
                      { name: "Jake T.", status: "Confirmed", amount: "$200" },
                      { name: "Alex R.", status: "Consent signed", amount: "$300" },
                    ].map((row, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between py-2.5"
                        style={{ borderBottom: i < 2 ? "1px solid #1A1A1A" : undefined }}
                      >
                        <p className="text-sm text-white">{row.name}</p>
                        <p className="text-xs text-gray-500 flex-1 text-center">{row.status}</p>
                        <p className="text-sm text-[#D4A853] font-medium">{row.amount}</p>
                      </div>
                    ))}
                  </div>

                  {/* AI Activity */}
                  <div className="mt-4">
                    <span className="text-xs text-gray-500 uppercase tracking-wider">AI Activity</span>
                    <div className="mt-2 space-y-2">
                      {[
                        "Following up with Maria S.",
                        "Sent quote to Jake T.",
                        "Deposit collected — Alex R.",
                      ].map((item, i) => (
                        <p key={i} className="text-xs text-gray-400">{item}</p>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Floating badge */}
                <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-full px-3 py-1.5" style={{ background: "#1A1A1A", border: "1px solid #2A2A2A" }}>
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse-dot" />
                  <span className="text-xs text-white">3 new bookings today</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ══ CATEGORY STATEMENT ══ */}
      <section className="py-28 px-6" style={{ background: "#FFFFFF" }}>
        <div className="max-w-5xl mx-auto text-center" data-animate="fade-up">
          <span className="text-xs uppercase tracking-widest text-[#D4A853] font-semibold">Why InkBook Exists</span>
          <div className="mt-8">
            <p className="text-5xl lg:text-6xl font-light text-gray-300 leading-tight">
              Most software manages appointments.
            </p>
            <p className="text-5xl lg:text-6xl font-bold text-[#111111] leading-tight mt-2">
              InkBook manages the entire tattoo client journey.
            </p>
          </div>
          <div className="mt-16 grid grid-cols-2 max-w-2xl mx-auto gap-8 text-left">
            <div>
              <p className="text-sm font-semibold text-gray-400 mb-4">Other booking tools</p>
              <ul className="space-y-3">
                {["Manages calendar", "Tracks appointments", "Sends reminders"].map((item) => (
                  <li key={item} className="text-sm text-gray-400">{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-sm font-semibold text-[#111111] mb-4">InkBook</p>
              <ul className="space-y-3">
                {[
                  "Manages the full client journey",
                  "Handles AI consultation",
                  "Follows up automatically",
                  "Collects deposits",
                  "Tracks every project",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-[#111111]">
                    <span className="text-[#D4A853] font-bold flex-shrink-0 mt-px">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ══ PAIN ══ */}
      <section id="features" className="py-20 px-6" style={{ background: "#F8F8F6" }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center">
            <span className="text-xs uppercase tracking-widest text-[#D4A853] font-semibold">The Problem</span>
            <h2 className="text-3xl lg:text-4xl font-bold text-[#111111] mt-4">
              Most bookings aren&apos;t lost to competitors.
            </h2>
            <p className="text-base text-gray-500 mt-4 max-w-md mx-auto">
              They&apos;re lost to slow responses, forgotten follow-ups, and broken workflows.
            </p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-16 max-w-4xl mx-auto">
            {PAIN_CARDS.map((card, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl p-8 shadow-sm border border-[#E5E5E3] hover:-translate-y-1 hover:shadow-md transition-all duration-200"
                data-animate="fade-up"
                data-delay={String(i * 100)}
              >
                <div className="text-gray-400 mb-4">{card.icon}</div>
                <h3 className="text-base font-semibold text-[#111111]">{card.title}</h3>
                <p className="text-sm text-gray-500 mt-2">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ WORKFLOW ══ */}
      <section className="py-24 px-6" style={{ background: "#FFFFFF" }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center">
            <span className="text-xs uppercase tracking-widest text-[#D4A853] font-semibold">The Workflow</span>
            <h2 className="text-3xl lg:text-4xl font-bold text-[#111111] mt-4">
              One system. The entire client journey.
            </h2>
          </div>

          {/* Desktop cards — horizontal scroll */}
          <div className="hidden md:flex flex-row overflow-x-auto gap-3 pb-4 mt-16">
            {WORKFLOW_STEPS.map((s, i) => (
              <div key={i} className="flex items-center flex-shrink-0">
                <div className="bg-white border border-[#E5E5E3] rounded-xl p-4 min-w-[130px] flex-shrink-0 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-200 text-center">
                  <div
                    className="w-3 h-3 rounded-full mx-auto mb-2"
                    style={{ background: s.ai ? "#D4A853" : "#D1D5DB" }}
                  />
                  <p className="text-xs text-gray-400">{s.num}</p>
                  <p className="text-xs font-bold text-[#111111] mt-1">{s.label}</p>
                  <p className="text-[10px] text-gray-400 mt-1">{s.desc}</p>
                </div>
                {i < WORKFLOW_STEPS.length - 1 && (
                  <span className="text-[#D4A853] text-sm mx-1 flex-shrink-0 self-center">→</span>
                )}
              </div>
            ))}
          </div>

          {/* Pipeline — always visible */}
          <div
            className="mt-8 rounded-xl p-5 max-w-4xl mx-auto"
            style={{ background: "rgba(212,168,83,0.05)", border: "1px solid rgba(212,168,83,0.2)" }}
            data-animate="fade-up"
          >
            <p className="text-xs uppercase tracking-widest text-[#D4A853] text-center mb-3 font-semibold">
              The Complete Workflow
            </p>
            <p className="text-sm text-[#D4A853] text-center leading-relaxed">
              Instagram Inquiry → AI Consultation → AI Follow-Up → Quote → Deposit → Booking → Consent → Aftercare → Review → CRM
            </p>
          </div>
        </div>
      </section>

      {/* ══ ARTIST DID NOTHING ══ */}
      <section className="py-24 px-6" style={{ background: "#1A1A1A", borderTop: "1px solid #2A2A2A" }}>
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl lg:text-4xl font-bold text-white leading-tight">
                Artist did nothing except approve the quote and show up to tattoo.
              </h2>
              <p className="mt-6 text-base text-gray-400 max-w-sm">
                AI handled the inquiry, consultation, follow-up, quote, deposit, consent, and aftercare. Automatically.
              </p>
              <p className="mt-8 text-white font-semibold">
                That is what InkBook does. Every single booking.
              </p>
            </div>

            <div className="space-y-1">
              {TIMELINE.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 px-4 py-3 rounded-xl"
                  style={{
                    background: item.highlight ? "#222222" : "transparent",
                    border: item.highlight ? "1px solid #2A2A2A" : "1px solid transparent",
                  }}
                >
                  <div
                    className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center"
                    style={{
                      background: item.done ? (item.highlight ? "#D4A853" : "#2A2A2A") : "#111111",
                      border: item.done ? "none" : "1px solid #2A2A2A",
                    }}
                  >
                    {item.done && <IconCheckSmall highlight={item.highlight} />}
                  </div>
                  <span
                    className="flex-1 text-sm"
                    style={{
                      color: item.done ? (item.highlight ? "#FFFFFF" : "#D1D5DB") : "#374151",
                      fontWeight: item.highlight ? 500 : 400,
                    }}
                  >
                    {item.label}
                  </span>
                  <span className="text-xs font-mono flex-shrink-0" style={{ color: item.done ? "#4B5563" : "#2A2A2A" }}>
                    {item.time}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══ WHITE LABEL ══ */}
      <section className="py-24 px-6" style={{ background: "#F8F8F6" }}>
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <span className="text-xs uppercase tracking-widest text-[#D4A853] font-semibold">White Label</span>
              <h2 className="text-3xl lg:text-4xl font-bold text-[#111111] mt-4">
                Your studio. Your brand. Your clients.
              </h2>
              <p className="text-base text-gray-500 mt-4 max-w-md">
                Clients never see InkBook. They book your studio, experience your brand, and trust your business. Not a software company.
              </p>
              <ul className="mt-8 space-y-3">
                {[
                  "Clients think they're booking directly with you",
                  "Your logo, your colors, your domain",
                  "book.yourstudio.com — not inkbook.com",
                  "Your reputation grows. Not ours.",
                ].map((feat, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-[#D4A853] flex-shrink-0" />
                    <span className="text-sm text-[#111111]">{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Booking mockup */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <div className="flex items-center justify-between pb-4" style={{ borderBottom: "1px solid #F3F4F6" }}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#1A1A1A] flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                    AI
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#111111]">Ash & Iron Studio</p>
                    <p className="text-xs text-gray-400">book.ashandiron.com</p>
                  </div>
                </div>
                <span className="text-xs px-2 py-1 rounded-full font-medium bg-green-50 text-green-600">Open</span>
              </div>

              <div className="mt-5">
                <h3 className="text-base font-semibold text-[#111111]">Book Your Session</h3>
                <p className="text-sm text-gray-500 mt-1 mb-5">Choose a style to get started</p>
                <div className="flex flex-wrap gap-2 mb-5">
                  {["Blackwork", "Traditional", "Neo-trad", "Watercolor", "Fine line"].map((style, i) => (
                    <span
                      key={style}
                      className="px-3 py-1 rounded-full text-xs font-medium border"
                      style={{
                        background: i === 0 ? "#111111" : "#F9FAFB",
                        color: i === 0 ? "#FFFFFF" : "#374151",
                        borderColor: i === 0 ? "#111111" : "#E5E7EB",
                      }}
                    >
                      {style}
                    </span>
                  ))}
                </div>
                {[
                  { initials: "AR", name: "Alex Reeves", style: "Blackwork · Geometric", avail: "Mon" },
                  { initials: "JH", name: "Jordan Holt", style: "Traditional · Neo-trad", avail: "Thu" },
                ].map((a, i) => (
                  <div key={i} className="flex items-center gap-3 p-3.5 rounded-xl mb-3 last:mb-0 bg-[#F9FAFB] border border-[#F3F4F6]">
                    <div className="w-10 h-10 rounded-full bg-[#374151] flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                      {a.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#111111]">{a.name}</p>
                      <p className="text-xs text-gray-500">{a.style}</p>
                    </div>
                    <p className="text-xs text-gray-400 flex-shrink-0">Next: {a.avail}</p>
                  </div>
                ))}
                <button className="w-full py-3 rounded-xl text-sm font-semibold text-white mt-4 bg-[#111111] hover:bg-[#2A2A2A] transition-colors">
                  Continue →
                </button>
                <p className="text-center text-xs mt-3 text-[#D1D5DB]">Powered by InkBook</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ ROI ══ */}
      <section className="py-20 px-6" style={{ background: "#FFFFFF" }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center">
            <span className="text-xs uppercase tracking-widest text-[#D4A853] font-semibold">The Math Is Simple</span>
            <h2 className="text-3xl lg:text-4xl font-bold text-[#111111] mt-4">
              What is one missed booking worth?
            </h2>
          </div>
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
            {[
              { value: "$200–$800", label: "Average tattoo session value" },
              { value: "3–5x", label: "Inquiries lost per week without follow-up" },
              { value: "1 booking", label: "Often enough to cover a month of InkBook" },
            ].map((stat, i) => (
              <div
                key={i}
                className="bg-[#F8F8F6] rounded-2xl p-8 text-center hover:shadow-md transition-all duration-200"
                data-animate="fade-up"
                data-delay={String(i * 100)}
              >
                <p className="text-4xl font-bold text-[#111111]">{stat.value}</p>
                <p className="text-sm text-gray-500 mt-2">{stat.label}</p>
              </div>
            ))}
          </div>
          <p className="mt-10 text-sm text-gray-500 text-center max-w-2xl mx-auto">
            InkBook does not guarantee bookings. But it makes sure no inquiry is forgotten, no follow-up is missed, and no deposit slips through the cracks.
          </p>
        </div>
      </section>

      {/* ══ PRICING ══ */}
      <section id="pricing" className="py-24 px-6" style={{ background: "#F8F8F6" }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center">
            <span className="text-xs uppercase tracking-widest text-[#D4A853] font-semibold">Pricing</span>
            <h2 className="text-3xl lg:text-4xl font-bold text-[#111111] mt-4">
              Simple, transparent pricing.
            </h2>
            <p className="text-base text-gray-500 mt-4">
              14-day free trial. No credit card required. No transaction fees.
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
            {/* Solo */}
            <div
              className="bg-white rounded-2xl p-8 shadow-sm border border-[#E5E5E3]"
              data-animate="fade-up"
              data-delay="0"
            >
              <p className="text-sm font-semibold text-gray-500">Solo Artist</p>
              <div className="flex items-end gap-1 mt-3 mb-1">
                <span className="text-5xl font-bold text-[#111111]">$49</span>
                <span className="text-sm text-gray-400 mb-2">/mo</span>
              </div>
              <p className="text-sm text-gray-500 mb-8">For individual tattoo artists.</p>
              <a
                href="#trial"
                className="block w-full py-3 text-center text-sm font-semibold rounded-full border border-gray-300 text-[#111111] hover:border-gray-400 transition-colors"
              >
                Start Free Trial
              </a>
            </div>

            {/* Studio — featured */}
            <div
              className="bg-white rounded-2xl p-8 shadow-xl border-2 border-[#D4A853] scale-[1.05] relative"
              data-animate="fade-up"
              data-delay="100"
            >
              <span className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#D4A853] text-black text-xs font-semibold px-4 py-1 rounded-full whitespace-nowrap">
                MOST POPULAR
              </span>
              <p className="text-sm font-semibold text-gray-500">Studio</p>
              <div className="flex items-end gap-1 mt-3 mb-1">
                <span className="text-5xl font-bold text-[#111111]">$79</span>
                <span className="text-sm text-gray-400 mb-2">/mo</span>
              </div>
              <p className="text-sm text-gray-500 mb-8">For small studios and growing teams.</p>
              <a
                href="#trial"
                className="block w-full py-3 text-center text-sm font-semibold rounded-full bg-black text-white hover:bg-[#2A2A2A] transition-colors"
              >
                Start Free Trial
              </a>
            </div>

            {/* Studio Pro */}
            <div
              className="bg-white rounded-2xl p-8 shadow-sm border border-[#E5E5E3]"
              data-animate="fade-up"
              data-delay="200"
            >
              <p className="text-sm font-semibold text-gray-500">Studio Pro</p>
              <div className="flex items-end gap-1 mt-3 mb-1">
                <span className="text-5xl font-bold text-[#111111]">$169</span>
                <span className="text-sm text-gray-400 mb-2">/mo</span>
              </div>
              <p className="text-sm text-gray-500 mb-8">For larger studios with advanced needs.</p>
              <a
                href="#trial"
                className="block w-full py-3 text-center text-sm font-semibold rounded-full border border-gray-300 text-[#111111] hover:border-gray-400 transition-colors"
              >
                Start Free Trial
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ══ FINAL CTA ══ */}
      <section id="trial" className="py-28 px-6" style={{ background: "#111111", borderTop: "1px solid #222" }}>
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-4xl lg:text-5xl font-bold text-white">Stop chasing inquiries.</h2>
          <h2 className="text-4xl lg:text-5xl font-bold text-white">Start tattooing.</h2>
          <p className="text-base text-[#D4A853] mt-8">AI handles clients. Artists focus on tattooing.</p>
          <p className="text-xs uppercase tracking-widest text-gray-500 mt-3">The Tattoo Business Operating System</p>
          <p className="text-sm text-gray-400 mt-6">Start your 14-day free trial. No credit card required.</p>
          <div className="mt-10 flex flex-wrap gap-4 justify-center">
            <a
              href="#signup"
              className="bg-[#D4A853] text-black font-semibold rounded-full px-8 py-4 text-sm hover:opacity-90 transition-opacity"
            >
              Start Free Trial
            </a>
            <a
              href="#book-demo"
              className="border border-gray-600 text-white rounded-full px-8 py-4 text-sm hover:border-gray-400 transition-colors"
            >
              Book Demo
            </a>
          </div>
          <p className="text-xs text-gray-500 mt-8">
            Join tattoo artists and studios already automating their client journey.
          </p>
        </div>
      </section>

      {/* ══ FOOTER ══ */}
      <footer className="px-6 py-12" style={{ background: "#111111", borderTop: "1px solid #222" }}>
        <div className="max-w-6xl mx-auto flex flex-wrap justify-between items-center gap-4">
          <span className="text-white font-semibold">InkBook</span>
          <nav className="flex flex-wrap gap-6">
            {["Features", "Book Demo", "Privacy", "Terms"].map((link) => (
              <a
                key={link}
                href={`#${link.toLowerCase().replace(" ", "-")}`}
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                {link}
              </a>
            ))}
          </nav>
          <p className="text-sm text-gray-500">© 2025 InkBook. All rights reserved.</p>
        </div>
      </footer>

    </div>
  );
}
