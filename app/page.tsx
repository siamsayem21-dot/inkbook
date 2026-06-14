"use client";

import { useState, useEffect } from "react";

/* ─── Inline SVG icons ─── */
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
const IconCheck = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
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
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={highlight ? "#0A0A0A" : "#6B7280"} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

/* ─── Pain cards data ─── */
const PAIN_CARDS = [
  {
    icon: <IconMsg />,
    title: "Inquiries go unanswered for days",
    desc: "DMs pile up while you're tattooing. By the time you reply, the client has booked elsewhere.",
  },
  {
    icon: <IconAlert />,
    title: "No system to follow up lost leads",
    desc: "Interested clients disappear after a quote. There's no way to track who's still considering.",
  },
  {
    icon: <IconDollar />,
    title: "Deposits never collected upfront",
    desc: "Artists feel awkward asking for money. New clients ghost when the deposit conversation comes up.",
  },
  {
    icon: <IconShield />,
    title: "No-shows with no protection",
    desc: "A blocked day costs $300–$800. Without a deposit policy in place, there is no recourse.",
  },
];

/* ─── Workflow steps data ─── */
const WORKFLOW_STEPS = [
  { step: "01", label: "Instagram Inquiry", desc: "Client sends a DM. InkBook captures it instantly." },
  { step: "02", label: "AI Consultation", desc: "AI qualifies the client and collects style details." },
  { step: "03", label: "Quote & Deposit", desc: "Artist approves. Quote sent. Deposit collected." },
  { step: "04", label: "Booking & Consent", desc: "Appointment locked. Consent form signed." },
  { step: "05", label: "Aftercare & Review", desc: "Auto aftercare tips sent. Review request follows." },
];

/* ─── Timeline data ─── */
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

/* ─── Nav links ─── */
const NAV_LINKS = ["Features", "Book Demo"] as const;

export default function HomePage() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [revenue, setRevenue] = useState(0);
  const [bookings, setBookings] = useState(0);
  const [deposits, setDeposits] = useState(0);

  /* Count-up animation on mount */
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

  /* Scroll reveal via IntersectionObserver */
  useEffect(() => {
    const els = document.querySelectorAll<Element>(".reveal, .reveal-up, .reveal-scale");
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            io.unobserve(entry.target);
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
    <div style={{ background: "#FFFFFF", color: "#0A0A0A", isolation: "isolate" }}>

      {/* ══════════════════════════════════════════
          1. NAV
      ══════════════════════════════════════════ */}
      <header
        className="sticky top-0 z-50"
        style={{
          background: "rgba(255,255,255,0.96)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderBottom: "1px solid #E5E7EB",
        }}
      >
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between h-16">
          <a href="/" className="text-xl font-semibold tracking-tight" style={{ color: "#0A0A0A" }}>
            InkBook
          </a>

          <nav className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((link) => (
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
              href="#demo"
              className="btn-secondary px-4 py-2 text-sm font-medium rounded-lg border transition-colors"
              style={{ borderColor: "#D1D5DB", color: "#0A0A0A" }}
            >
              Book Demo
            </a>
            <a
              href="#trial"
              className="btn-primary px-4 py-2 text-sm font-medium rounded-lg text-white"
            >
              Start Free Trial
            </a>
          </div>

          <button
            className="md:hidden p-1.5 rounded-md"
            style={{ color: "#0A0A0A" }}
            onClick={() => setMobileOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <IconClose /> : <IconMenu />}
          </button>
        </div>

        {mobileOpen && (
          <div
            className="md:hidden px-6 pt-2 pb-6 flex flex-col gap-1"
            style={{ borderTop: "1px solid #F3F4F6" }}
          >
            {NAV_LINKS.map((link) => (
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
                href="#demo"
                className="py-2.5 text-sm font-medium rounded-lg border text-center"
                style={{ borderColor: "#D1D5DB", color: "#0A0A0A" }}
              >
                Book Demo
              </a>
              <a
                href="#trial"
                className="btn-primary py-2.5 text-sm font-medium rounded-lg text-center text-white"
              >
                Start Free Trial
              </a>
            </div>
          </div>
        )}
      </header>

      {/* ══════════════════════════════════════════
          2. HERO
      ══════════════════════════════════════════ */}
      <section className="pt-24 pb-32 px-6" style={{ background: "#FFFFFF" }}>
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-[2fr_3fr] gap-16 items-start">

            <div>
              <span
                className="inline-block text-xs font-semibold tracking-widest uppercase mb-5"
                style={{ color: "#D4A853" }}
              >
                The Tattoo Business Operating System
              </span>

              <h1
                className="text-4xl sm:text-5xl lg:text-[3.5rem] font-semibold tracking-tight leading-[1.1] mb-6 text-balance"
                style={{ color: "#0A0A0A" }}
              >
                Stop chasing inquiries.<br />Start tattooing.
              </h1>

              <p className="text-xl leading-relaxed mb-10" style={{ color: "#6B7280", maxWidth: "46ch" }}>
                The Tattoo Business Operating System. AI handles consultations, follow-ups, quotes, deposits, bookings, and aftercare — so you can focus on tattooing.
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-5">
                <a
                  href="#trial"
                  className="btn-primary px-6 py-3 text-sm font-semibold rounded-lg text-white text-center"
                >
                  Start Free Trial
                </a>
                <a
                  href="#demo"
                  className="btn-secondary px-6 py-3 text-sm font-semibold rounded-lg border text-center"
                  style={{ borderColor: "#D1D5DB", color: "#0A0A0A" }}
                >
                  Book Demo
                </a>
              </div>

              <p className="text-xs" style={{ color: "#9CA3AF" }}>
                14-day free trial · No credit card required
              </p>
            </div>

            {/* Right: dashboard mockup */}
            <div className="relative">
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: "radial-gradient(ellipse at center, rgba(212,168,83,0.08) 0%, transparent 70%)",
                  transform: "scale(1.1)",
                  filter: "blur(24px)",
                }}
              />
              <div
                className="rounded-2xl overflow-hidden shadow-2xl"
                style={{
                  background: "#0F0F0F",
                  border: "1px solid #1F1F1F",
                  boxShadow: "0 32px 80px rgba(0,0,0,0.20), 0 8px 24px rgba(0,0,0,0.10)",
                }}
              >
                <div
                  className="flex items-center gap-2 px-4 py-3"
                  style={{ borderBottom: "1px solid #1F1F1F" }}
                >
                  <span className="w-3.5 h-3.5 rounded-full" style={{ background: "#FF5F57" }} />
                  <span className="w-3.5 h-3.5 rounded-full" style={{ background: "#FEBC2E" }} />
                  <span className="w-3.5 h-3.5 rounded-full" style={{ background: "#28C840" }} />
                  <span className="ml-3 text-xs font-medium" style={{ color: "#4B5563" }}>InkBook — Dashboard</span>
                </div>

                <div className="p-8">
                  {/* Animated stat row */}
                  <div className="grid grid-cols-3 gap-3 mb-5">
                    {heroStats.map((s) => (
                      <div
                        key={s.label}
                        className="rounded-xl p-4"
                        style={{ background: "#1A1A1A", border: "1px solid #282828" }}
                      >
                        <p className="text-xs mb-1.5" style={{ color: "#6B7280" }}>{s.label}</p>
                        <p className="text-4xl font-semibold" style={{ color: "#F5F5F5" }}>{s.value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #1F1F1F" }}>
                    <div
                      className="px-4 py-2.5 flex items-center justify-between"
                      style={{ background: "#141414", borderBottom: "1px solid #1F1F1F" }}
                    >
                      <span className="text-xs font-medium" style={{ color: "#6B7280" }}>Recent Bookings</span>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ background: "rgba(212,168,83,0.12)", color: "#D4A853" }}
                      >
                        Live
                      </span>
                    </div>

                    {[
                      { name: "Sarah M.", service: "Floral sleeve · 4hr", status: "Deposit paid", amount: "$150" },
                      { name: "Jake T.", service: "Neo-trad arm · 3hr", status: "Confirmed", amount: "$200" },
                      { name: "Alex R.", service: "Blackwork back · 6hr", status: "Consent signed", amount: "$300" },
                    ].map((row, i) => (
                      <div
                        key={i}
                        className="px-4 py-3 flex items-center justify-between"
                        style={{
                          background: "#0F0F0F",
                          borderBottom: i < 2 ? "1px solid #1A1A1A" : undefined,
                        }}
                      >
                        <div>
                          <p className="text-sm font-medium" style={{ color: "#F5F5F5" }}>{row.name}</p>
                          <p className="text-xs mt-0.5" style={{ color: "#4B5563" }}>{row.service}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold" style={{ color: "#D4A853" }}>{row.amount}</p>
                          <p className="text-xs mt-0.5" style={{ color: "#6B7280" }}>{row.status}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-xl mt-4 overflow-hidden" style={{ border: "1px solid #1F1F1F" }}>
                    <div
                      className="px-4 py-2.5 flex items-center justify-between"
                      style={{ background: "#141414", borderBottom: "1px solid #1F1F1F" }}
                    >
                      <span className="text-xs font-medium" style={{ color: "#6B7280" }}>AI Activity</span>
                      <span className="w-1.5 h-1.5 rounded-full animate-pulse-dot" style={{ background: "#22C55E" }} />
                    </div>
                    {[
                      { action: "Following up with Maria L.", time: "Just now" },
                      { action: "Sent quote to Devon K.", time: "4 min ago" },
                      { action: "Deposit collected — James R.", time: "11 min ago" },
                    ].map((row, i) => (
                      <div
                        key={i}
                        className="px-4 py-2.5 flex items-center justify-between"
                        style={{
                          background: "#0F0F0F",
                          borderBottom: i < 2 ? "1px solid #1A1A1A" : undefined,
                        }}
                      >
                        <p className="text-xs" style={{ color: "#9CA3AF" }}>{row.action}</p>
                        <p className="text-xs font-mono flex-shrink-0 ml-4" style={{ color: "#374151" }}>{row.time}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div
                className="hidden sm:flex absolute -bottom-5 -left-4 rounded-xl px-4 py-3 items-center gap-2.5"
                style={{
                  background: "#FFFFFF",
                  border: "1px solid #F3F4F6",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.10)",
                }}
              >
                <span className="w-2 h-2 rounded-full animate-pulse-dot" style={{ background: "#22C55E" }} />
                <span className="text-sm font-medium" style={{ color: "#0A0A0A" }}>3 new bookings today</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          CATEGORY STATEMENT
      ══════════════════════════════════════════ */}
      <section className="py-32 px-6" style={{ background: "#FFFFFF", borderTop: "1px solid #F3F4F6", borderBottom: "1px solid #F3F4F6" }}>
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-start">

            <div className="reveal">
              <span
                className="inline-block text-xs font-semibold tracking-widest uppercase mb-10"
                style={{ color: "#9CA3AF" }}
              >
                Why InkBook Exists
              </span>
              <p className="text-5xl lg:text-6xl font-light leading-tight" style={{ color: "#9CA3AF" }}>
                Most software manages appointments.
              </p>
              <p className="text-5xl lg:text-6xl font-bold leading-tight mt-4" style={{ color: "#0A0A0A" }}>
                InkBook manages the entire tattoo client journey.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-10 pt-14 lg:pt-0 reveal stagger-2">
              <div>
                <p className="text-xs font-semibold tracking-widest uppercase mb-5" style={{ color: "#9CA3AF" }}>
                  Other booking tools
                </p>
                <ul className="space-y-3">
                  {["Manages calendar", "Tracks appointments", "Sends reminders"].map((item) => (
                    <li key={item} className="text-sm" style={{ color: "#9CA3AF" }}>{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold tracking-widest uppercase mb-5" style={{ color: "#0A0A0A" }}>
                  InkBook
                </p>
                <ul className="space-y-3">
                  {[
                    "Manages the full client journey",
                    "Handles AI consultation",
                    "Follows up automatically",
                    "Collects deposits",
                    "Tracks every project",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm font-medium" style={{ color: "#0A0A0A" }}>
                      <span className="mt-px font-bold flex-shrink-0" style={{ color: "#D4A853" }}>✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          3. PAIN
      ══════════════════════════════════════════ */}
      <section id="features" className="py-16 px-6" style={{ background: "#F5F5F5" }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <span
              className="inline-block text-xs font-semibold tracking-widest uppercase mb-4"
              style={{ color: "#D4A853" }}
            >
              The Problem
            </span>
            <h2
              className="text-4xl font-semibold tracking-tight mb-4"
              style={{ color: "#0A0A0A" }}
            >
              Most bookings aren&apos;t lost to competitors.
            </h2>
            <p className="text-lg mx-auto" style={{ color: "#6B7280", maxWidth: "42ch" }}>
              They&apos;re lost to slow responses, forgotten follow-ups, and broken workflows.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {PAIN_CARDS.map((card, i) => (
              <div
                key={i}
                className={`rounded-2xl p-7 flex gap-5 hover:shadow-md hover:-translate-y-1 transition-all duration-200 reveal stagger-${i + 1}`}
                style={{
                  background: "#FFFFFF",
                  border: "1px solid #E5E7EB",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                }}
              >
                <div
                  className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: "#F5F5F5", color: "#6B7280", border: "1px solid #E5E7EB" }}
                >
                  {card.icon}
                </div>
                <div>
                  <h3 className="text-base font-semibold mb-2" style={{ color: "#0A0A0A" }}>{card.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: "#6B7280" }}>{card.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          4. HOW IT WORKS
      ══════════════════════════════════════════ */}
      <section className="py-16 px-6" style={{ background: "#FFFFFF" }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <span
              className="inline-block text-xs font-semibold tracking-widest uppercase mb-4"
              style={{ color: "#D4A853" }}
            >
              The Workflow
            </span>
            <h2 className="text-4xl font-semibold tracking-tight" style={{ color: "#0A0A0A" }}>
              One system. The entire client journey.
            </h2>
          </div>

          {/* Desktop: horizontal scrollable flow diagram */}
          <div className="hidden lg:block">
            <div className="overflow-x-auto -mx-6 px-6 pb-4">
              <div className="flex items-center min-w-max py-2">
                {(() => {
                  const AI_IDX = new Set([1, 4]);
                  const ICONS = [
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,
                  ];
                  return WORKFLOW_STEPS.map((s, i) => {
                    const isAI = AI_IDX.has(i);
                    return (
                      <div key={i} className="flex items-center">
                        <div
                          className="rounded-xl flex flex-col items-center text-center mx-1.5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                          style={{
                            background: "#FFFFFF",
                            border: `1.5px solid ${isAI ? "rgba(212,168,83,0.4)" : "#E5E7EB"}`,
                            boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                            minWidth: "144px",
                            width: "144px",
                            padding: "18px 14px",
                          }}
                        >
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center mb-3"
                            style={{
                              background: isAI ? "rgba(212,168,83,0.12)" : "#F3F4F6",
                              border: `1.5px solid ${isAI ? "#D4A853" : "#D1D5DB"}`,
                              color: isAI ? "#D4A853" : "#6B7280",
                            }}
                          >
                            {ICONS[i]}
                          </div>
                          <p className="text-[10px] font-mono font-medium mb-1.5" style={{ color: "#9CA3AF" }}>{s.step}</p>
                          <h3 className="text-xs font-bold mb-1.5 leading-snug" style={{ color: "#0A0A0A" }}>{s.label}</h3>
                          <p className="text-[11px] leading-snug" style={{ color: "#6B7280" }}>{s.desc}</p>
                        </div>
                        {i < WORKFLOW_STEPS.length - 1 && (
                          <span className="text-lg font-bold flex-shrink-0 mx-0.5" style={{ color: "#D4A853" }}>→</span>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            <div className="mt-10">
              <div
                className="rounded-2xl px-8 py-8 text-center"
                style={{
                  background: "rgba(212,168,83,0.05)",
                  border: "1px solid rgba(212,168,83,0.18)",
                }}
              >
                <p
                  className="text-xs font-semibold tracking-widest uppercase mb-4"
                  style={{ color: "#D4A853" }}
                >
                  The Complete Workflow
                </p>
                <p
                  className="text-base font-semibold font-mono leading-loose tracking-wide"
                  style={{ color: "#D4A853" }}
                >
                  Instagram Inquiry → AI Consultation → AI Follow-Up → Quote → Deposit → Booking → Consent → Aftercare → Review → CRM
                </p>
              </div>
            </div>
          </div>

          {/* Mobile: vertical stack flow diagram */}
          <div className="lg:hidden">
            <div className="flex flex-col items-center">
              {(() => {
                const AI_IDX = new Set([1, 4]);
                const ICONS = [
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,
                ];
                return WORKFLOW_STEPS.map((s, i) => {
                  const isAI = AI_IDX.has(i);
                  return (
                    <div key={i} className="flex flex-col items-center w-full">
                      <div
                        className="rounded-xl w-full flex items-start gap-4"
                        style={{
                          background: "#FFFFFF",
                          border: `1.5px solid ${isAI ? "rgba(212,168,83,0.4)" : "#E5E7EB"}`,
                          boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                          padding: "14px 16px",
                        }}
                      >
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{
                            background: isAI ? "rgba(212,168,83,0.12)" : "#F3F4F6",
                            border: `1.5px solid ${isAI ? "#D4A853" : "#D1D5DB"}`,
                            color: isAI ? "#D4A853" : "#6B7280",
                          }}
                        >
                          {ICONS[i]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-mono font-medium mb-0.5" style={{ color: "#9CA3AF" }}>{s.step}</p>
                          <h3 className="text-sm font-bold mb-1" style={{ color: "#0A0A0A" }}>{s.label}</h3>
                          <p className="text-sm leading-snug" style={{ color: "#6B7280" }}>{s.desc}</p>
                        </div>
                      </div>
                      {i < WORKFLOW_STEPS.length - 1 && (
                        <span className="text-xl my-2" style={{ color: "#D4A853" }}>↓</span>
                      )}
                    </div>
                  );
                });
              })()}
            </div>
            <div className="mt-8">
              <div
                className="rounded-2xl px-5 py-6 text-center overflow-hidden"
                style={{
                  background: "rgba(212,168,83,0.05)",
                  border: "1px solid rgba(212,168,83,0.18)",
                }}
              >
                <p
                  className="text-xs font-semibold tracking-widest uppercase mb-3"
                  style={{ color: "#D4A853" }}
                >
                  The Complete Workflow
                </p>
                <p
                  className="text-xs font-semibold font-mono leading-loose"
                  style={{ color: "#D4A853", wordBreak: "break-word" }}
                >
                  Instagram Inquiry → AI Consultation → AI Follow-Up → Quote → Deposit → Booking → Consent → Aftercare → Review → CRM
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          5. WORKFLOW CENTREPIECE
      ══════════════════════════════════════════ */}
      <section className="py-32 px-6" style={{ background: "#111111", borderTop: "1px solid #2A2A2A" }}>
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-20 items-start">

            <div className="lg:sticky lg:top-32">
              <h2
                className="text-4xl lg:text-5xl font-semibold tracking-tight leading-[1.1] mb-6 text-balance"
                style={{ color: "#F5F5F5" }}
              >
                Artist did nothing except approve the quote and show up to tattoo.
              </h2>
              <p className="text-lg leading-relaxed mt-6" style={{ color: "#6B7280" }}>
                AI handled the inquiry, consultation, follow-up, quote, deposit, consent, and aftercare. Automatically.
              </p>
            </div>

            <div className="space-y-1">
              {TIMELINE.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 px-4 py-3 rounded-xl transition-colors"
                  style={{
                    background: item.highlight ? "#1A1A1A" : "transparent",
                    border: item.highlight ? "1px solid #2A2A2A" : "1px solid transparent",
                  }}
                >
                  <div
                    className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center"
                    style={{
                      background: item.done
                        ? item.highlight ? "#D4A853" : "#1F2937"
                        : "#111111",
                      border: item.done ? "none" : "1px solid #2A2A2A",
                    }}
                  >
                    {item.done && <IconCheckSmall highlight={item.highlight} />}
                  </div>

                  <span
                    className="flex-1 text-sm"
                    style={{
                      color: item.done ? (item.highlight ? "#F5F5F5" : "#D1D5DB") : "#374151",
                      fontWeight: item.highlight ? 500 : 400,
                    }}
                  >
                    {item.label}
                  </span>

                  <span
                    className="text-xs font-mono flex-shrink-0"
                    style={{ color: item.done ? "#4B5563" : "#1F2937" }}
                  >
                    {item.time}
                  </span>
                </div>
              ))}
              <p
                className="mt-6 pt-5 text-sm font-semibold text-center"
                style={{ color: "#F5F5F5", borderTop: "1px solid #1F1F1F" }}
              >
                That is what InkBook does. Every single booking.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          6. WHITE LABEL
      ══════════════════════════════════════════ */}
      <section className="py-16 px-6" style={{ background: "#F5F5F5" }}>
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-20 items-center">

            <div>
              <span
                className="inline-block text-xs font-semibold tracking-widest uppercase mb-4"
                style={{ color: "#D4A853" }}
              >
                White Label
              </span>
              <h2 className="text-4xl font-semibold tracking-tight mb-4" style={{ color: "#0A0A0A" }}>
                Your studio. Your brand. Your clients.
              </h2>
              <p className="text-lg mb-8" style={{ color: "#6B7280" }}>
                Clients never see InkBook. They book your studio, experience your brand, and trust your business. Not a software company.
              </p>
              <ul className="space-y-4">
                {[
                  "Clients think they're booking directly with you",
                  "Your logo, your colors, your domain",
                  "book.yourstudio.com — not inkbook.com",
                  "Your reputation grows. Not ours.",
                ].map((feat, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <span
                      className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center"
                      style={{ background: "#0A0A0A" }}
                    >
                      <IconCheck />
                    </span>
                    <span className="text-sm font-medium text-[#374151] hover:text-[#0A0A0A] transition-colors duration-150">
                      {feat}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div
              className="rounded-2xl overflow-hidden"
              style={{
                background: "#FFFFFF",
                border: "1px solid #E5E7EB",
                boxShadow: "0 8px 32px rgba(0,0,0,0.07)",
              }}
            >
              <div
                className="px-5 py-4 flex items-center justify-between"
                style={{ borderBottom: "1px solid #F3F4F6" }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                    style={{ background: "#1A1A1A" }}
                  >
                    AI
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "#0A0A0A" }}>Ash & Iron Studio</p>
                    <p className="text-xs" style={{ color: "#9CA3AF" }}>book.ashandiron.com</p>
                  </div>
                </div>
                <span
                  className="text-xs px-2 py-1 rounded-full font-medium"
                  style={{ background: "#F0FDF4", color: "#16A34A" }}
                >
                  Open
                </span>
              </div>

              <div className="p-5">
                <h3 className="text-base font-semibold mb-1" style={{ color: "#0A0A0A" }}>Book Your Session</h3>
                <p className="text-sm mb-5" style={{ color: "#6B7280" }}>Choose a style to get started</p>

                <div className="flex flex-wrap gap-2 mb-5">
                  {["Blackwork", "Traditional", "Neo-trad", "Watercolor", "Fine line"].map((style, i) => (
                    <span
                      key={style}
                      className="px-3 py-1 rounded-full text-xs font-medium border"
                      style={{
                        background: i === 0 ? "#0A0A0A" : "#F9FAFB",
                        color: i === 0 ? "#FFFFFF" : "#374151",
                        borderColor: i === 0 ? "#0A0A0A" : "#E5E7EB",
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
                  <div
                    key={i}
                    className="flex items-center gap-3 p-3.5 rounded-xl mb-3 last:mb-0"
                    style={{
                      background: "#F9FAFB",
                      border: "1px solid #F3F4F6",
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                      style={{ background: "#374151" }}
                    >
                      {a.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium" style={{ color: "#0A0A0A" }}>{a.name}</p>
                      <p className="text-xs" style={{ color: "#6B7280" }}>{a.style}</p>
                    </div>
                    <p className="text-xs flex-shrink-0" style={{ color: "#9CA3AF" }}>Next: {a.avail}</p>
                  </div>
                ))}

                <button
                  className="w-full py-3 rounded-xl text-sm font-semibold text-white mt-4 transition-opacity hover:opacity-90"
                  style={{ background: "#0A0A0A" }}
                >
                  Continue →
                </button>
                <p className="text-center text-xs mt-3" style={{ color: "#D1D5DB" }}>
                  Powered by InkBook
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          ROI LOGIC
      ══════════════════════════════════════════ */}
      <section className="py-16 px-6" style={{ background: "#F5F5F5" }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <span
              className="inline-block text-xs font-semibold tracking-widest uppercase mb-4"
              style={{ color: "#D4A853" }}
            >
              The Math Is Simple
            </span>
            <h2 className="text-4xl font-semibold tracking-tight" style={{ color: "#0A0A0A" }}>
              What is one missed booking worth?
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-10">
            {[
              { value: "$200–$800", label: "Average tattoo session value" },
              { value: "3–5x", label: "Inquiries lost per week without follow-up" },
              { value: "1 booking", label: "Often enough to cover a month of InkBook" },
            ].map((stat, i) => (
              <div
                key={i}
                className={`rounded-2xl p-8 text-center hover:shadow-lg transition-all duration-200 reveal stagger-${i + 1}`}
                style={{
                  background: "#FFFFFF",
                  border: "1px solid #E5E7EB",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                }}
              >
                <p className="text-3xl font-semibold mb-2" style={{ color: "#0A0A0A" }}>{stat.value}</p>
                <p className="text-sm leading-relaxed" style={{ color: "#6B7280" }}>{stat.label}</p>
              </div>
            ))}
          </div>

          <p className="text-sm text-center max-w-2xl mx-auto leading-relaxed" style={{ color: "#6B7280" }}>
            InkBook does not guarantee bookings. But it makes sure no inquiry is forgotten, no follow-up is missed, and no deposit slips through the cracks.
          </p>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          PRICING
      ══════════════════════════════════════════ */}
      <section id="pricing" className="py-28 px-6" style={{ background: "#FFFFFF" }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <span
              className="inline-block text-xs font-semibold tracking-widest uppercase mb-4"
              style={{ color: "#D4A853" }}
            >
              Pricing
            </span>
            <h2 className="text-4xl font-semibold tracking-tight mb-3" style={{ color: "#0A0A0A" }}>
              Simple, transparent pricing.
            </h2>
            <p className="text-base" style={{ color: "#6B7280" }}>
              14-day free trial. No credit card required. No transaction fees.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-center py-6">

            {/* Solo Artist */}
            <div
              className="rounded-xl p-8 hover:shadow-lg transition-all duration-200 reveal stagger-1"
              style={{
                background: "#FFFFFF",
                border: "1px solid #E5E7EB",
                boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
              }}
            >
              <p className="text-sm font-semibold mb-3" style={{ color: "#6B7280" }}>Solo Artist</p>
              <div className="flex items-end gap-1 mb-1">
                <span className="text-4xl font-semibold tracking-tight" style={{ color: "#0A0A0A" }}>$49</span>
                <span className="text-sm mb-1.5" style={{ color: "#9CA3AF" }}>/mo</span>
              </div>
              <p className="text-sm mb-8" style={{ color: "#6B7280" }}>For individual tattoo artists.</p>
              <a
                href="#trial"
                className="block w-full py-2.5 text-center text-sm font-semibold rounded-lg border transition-all duration-200 hover:bg-gray-50"
                style={{ borderColor: "#D1D5DB", color: "#0A0A0A" }}
              >
                Start Free Trial
              </a>
            </div>

            {/* Studio — highlighted */}
            <div
              className="rounded-xl p-8 hover:shadow-xl transition-all duration-200 relative reveal stagger-2"
              style={{
                background: "#FFFDF5",
                border: "2px solid #D4A853",
                boxShadow: "0 8px 32px rgba(212,168,83,0.16), 0 2px 8px rgba(0,0,0,0.06)",
                transform: "scale(1.08)",
                zIndex: 10,
              }}
            >
              <span
                className="absolute -top-4 left-1/2 -translate-x-1/2 text-sm font-semibold tracking-widest uppercase px-4 py-1.5 rounded-full whitespace-nowrap"
                style={{ background: "#D4A853", color: "#0A0A0A" }}
              >
                Most Popular
              </span>
              <p className="text-sm font-semibold mb-3" style={{ color: "#6B7280" }}>Studio</p>
              <div className="flex items-end gap-1 mb-1">
                <span className="text-4xl font-semibold tracking-tight" style={{ color: "#0A0A0A" }}>$79</span>
                <span className="text-sm mb-1.5" style={{ color: "#9CA3AF" }}>/mo</span>
              </div>
              <p className="text-sm mb-8" style={{ color: "#6B7280" }}>For small studios and growing teams.</p>
              <a
                href="#trial"
                className="block w-full py-2.5 text-center text-sm font-semibold rounded-lg transition-all duration-200 hover:opacity-90 hover:scale-[1.02]"
                style={{ background: "#D4A853", color: "#0A0A0A" }}
              >
                Start Free Trial
              </a>
            </div>

            {/* Studio Pro */}
            <div
              className="rounded-xl p-8 hover:shadow-lg transition-all duration-200 reveal stagger-3"
              style={{
                background: "#FFFFFF",
                border: "1px solid #E5E7EB",
                boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
              }}
            >
              <p className="text-sm font-semibold mb-3" style={{ color: "#6B7280" }}>Studio Pro</p>
              <div className="flex items-end gap-1 mb-1">
                <span className="text-4xl font-semibold tracking-tight" style={{ color: "#0A0A0A" }}>$169</span>
                <span className="text-sm mb-1.5" style={{ color: "#9CA3AF" }}>/mo</span>
              </div>
              <p className="text-sm mb-8" style={{ color: "#6B7280" }}>For larger studios with advanced needs.</p>
              <a
                href="#trial"
                className="block w-full py-2.5 text-center text-sm font-semibold rounded-lg border transition-all duration-200 hover:bg-gray-50"
                style={{ borderColor: "#D1D5DB", color: "#0A0A0A" }}
              >
                Start Free Trial
              </a>
            </div>

          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          7. FINAL CTA
      ══════════════════════════════════════════ */}
      <section id="trial" className="py-32 px-6" style={{ background: "#111111", borderTop: "1px solid #2A2A2A", borderBottom: "1px solid #2A2A2A" }}>
        <div className="max-w-2xl mx-auto text-center">
          <h2
            className="text-4xl lg:text-5xl font-semibold tracking-tight mb-4 text-balance"
            style={{ color: "#F5F5F5" }}
          >
            Stop chasing inquiries.<br />Start tattooing.
          </h2>
          <p className="text-base mb-3" style={{ color: "#D4A853" }}>
            AI handles clients. Artists focus on tattooing.
          </p>
          <p className="text-xs font-semibold tracking-widest uppercase mb-10" style={{ color: "#4B5563" }}>
            The Tattoo Business Operating System.
          </p>
          <p className="text-base mb-10" style={{ color: "#6B7280" }}>
            Start your 14-day free trial. No credit card required.
          </p>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-4 mb-8">
            <a
              href="#signup"
              className="px-8 py-3.5 rounded-lg text-sm font-semibold transition-all duration-200 hover:opacity-90 hover:scale-[1.02] text-center"
              style={{ background: "#D4A853", color: "#0A0A0A" }}
            >
              Start Free Trial
            </a>
            <a
              href="#demo"
              className="px-8 py-3.5 rounded-lg text-sm font-semibold border transition-colors hover:border-gray-500 text-center"
              style={{ borderColor: "#2D2D2D", color: "#F5F5F5" }}
            >
              Book Demo
            </a>
          </div>
          <p className="text-sm" style={{ color: "#4B5563" }}>
            Join tattoo artists and studios already automating their client journey.
          </p>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          8. FOOTER
      ══════════════════════════════════════════ */}
      <footer className="px-6 py-10" style={{ background: "#0A0A0A", borderTop: "1px solid #1A1A1A" }}>
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <span className="text-lg font-semibold" style={{ color: "#F5F5F5" }}>InkBook</span>

          <nav className="flex flex-wrap items-center justify-center gap-6">
            {["Features", "Book Demo", "Privacy", "Terms"].map((link) => (
              <a
                key={link}
                href={`#${link.toLowerCase().replace(" ", "-")}`}
                className="text-sm transition-colors hover:text-gray-300"
                style={{ color: "#6B7280" }}
              >
                {link}
              </a>
            ))}
          </nav>

          <p className="text-sm" style={{ color: "#374151" }}>
            © 2025 InkBook. All rights reserved.
          </p>
        </div>
      </footer>

    </div>
  );
}
