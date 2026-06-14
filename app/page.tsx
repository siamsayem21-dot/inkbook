"use client";

import { useState, useEffect, useRef, useCallback } from "react";

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

/* ─── Data ─── */
const PAIN_CARDS = [
  { icon: <IconMsg />, title: "Inquiries go unanswered for days", desc: "DMs pile up. Clients book elsewhere." },
  { icon: <IconAlert />, title: "No system to follow up lost leads", desc: "Interested clients vanish after the quote." },
  { icon: <IconDollar />, title: "Deposits never collected upfront", desc: "Artists feel awkward. New clients ghost." },
  { icon: <IconShield />, title: "No-shows with no protection", desc: "A blocked day costs $300–$800 minimum." },
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

const SIDEBAR_NAV = ["Dashboard", "Consultations", "Quotes", "Bookings", "Clients", "Pipeline", "Earnings"] as const;

const BOOKING_ROWS = [
  { name: "Sarah M.", service: "Tattoo sleeve · 4h", amount: "$150 deposit", badge: "Deposit paid",   badgeClass: "bg-green-900 text-green-400" },
  { name: "Jake T.",  service: "Neo-trad arm · 3h", amount: "$200",          badge: "Confirmed",      badgeClass: "bg-yellow-900 text-yellow-400" },
  { name: "Alex R.",  service: "Cover-up · 2h",     amount: "$300",          badge: "Consent signed", badgeClass: "bg-blue-900 text-blue-400" },
];

const AI_ACTIVITY = [
  "Following up with Maria S. — Sent consultation reminder",
  "Sent quote to Jake T. — $650 for neo-trad sleeve",
  "Deposit collected — Alex R. paid $300",
];

type PipelineCard = {
  name: string;
  tag: string;
  sub: string;
  subClass: string;
  border: string;
  readyBadge?: boolean;
};

const PIPELINE_COLS: {
  title: string;
  titleClass: string;
  countClass: string;
  ai?: boolean;
  cards: PipelineCard[];
}[] = [
  {
    title: "New Inquiry",
    titleClass: "text-gray-500",
    countClass: "bg-gray-100 text-gray-600",
    cards: [
      { name: "Maya L.",  tag: "Floral sleeve",    sub: "2m ago",  subClass: "text-gray-400", border: "" },
      { name: "Chris P.", tag: "Geometric back",   sub: "14m ago", subClass: "text-gray-400", border: "" },
      { name: "Jess W.",  tag: "Fine line script", sub: "1h ago",  subClass: "text-gray-400", border: "" },
    ],
  },
  {
    title: "AI Consultation",
    titleClass: "text-[#D4A853]",
    countClass: "bg-gray-100 text-gray-600",
    ai: true,
    cards: [
      { name: "Sam K.",  tag: "Neo-trad eagle",    sub: "Qualifying…",    subClass: "text-[#D4A853]", border: "border border-[rgba(212,168,83,0.25)]" },
      { name: "Dana T.", tag: "Blackwork mandala", sub: "Style detected", subClass: "text-[#D4A853]", border: "border border-[rgba(212,168,83,0.25)]" },
    ],
  },
  {
    title: "Quote Sent",
    titleClass: "text-gray-500",
    countClass: "bg-gray-100 text-gray-600",
    cards: [
      { name: "Riley M.", tag: "Full back piece", sub: "$850", subClass: "font-bold text-[#111111]", border: "" },
      { name: "Alex J.",  tag: "Watercolor koi",  sub: "$450", subClass: "font-bold text-[#111111]", border: "" },
    ],
  },
  {
    title: "Deposit Paid",
    titleClass: "text-green-600",
    countClass: "bg-green-100 text-green-600",
    cards: [
      { name: "Jordan H.", tag: "Traditional panther", sub: "Ready to book", subClass: "text-green-600 font-medium", border: "border border-green-200", readyBadge: true },
      { name: "Priya S.",  tag: "Script lettering",   sub: "Booked: Friday", subClass: "text-green-600 font-medium", border: "border border-green-200", readyBadge: true },
    ],
  },
];

type ArtistNavItem = { label: string; active?: true; badge?: string };
const ARTIST_NAV_ITEMS: ArtistNavItem[] = [
  { label: "AI Inbox", active: true, badge: "3" },
  { label: "Consultations" },
  { label: "Quotes" },
  { label: "Calendar" },
  { label: "Portfolio" },
  { label: "Earnings" },
];

const ARTIST_INBOX = [
  {
    bg: "bg-[#FFFDF5]",
    border: "border border-[#D4A853]/30",
    badgeClass: "bg-[#D4A853]/10 text-[#D4A853]",
    badge: "New Consultation",
    time: "2m ago",
    name: "Maria S.",
    detail: "Floral sleeve · Black & Grey · Budget $800",
    btnClass: "bg-[#111111] text-white",
    btn: "Review & Quote",
  },
  {
    bg: "bg-white",
    border: "border border-[#E5E5E3]",
    badgeClass: "bg-yellow-50 text-yellow-600",
    badge: "Quote Awaiting Approval",
    time: "1h ago",
    name: "Jake T.",
    detail: "Neo-trad arm · $650",
    btnClass: "bg-[#111111] text-white",
    btn: "Approve & Send",
  },
  {
    bg: "bg-white",
    border: "border border-[#E5E5E3]",
    badgeClass: "bg-blue-50 text-blue-600",
    badge: "Follow-Up Required",
    time: "3d ago",
    name: "Chris M.",
    detail: "Cover-up · No response 3 days",
    btnClass: "bg-[#D4A853] text-black",
    btn: "Send Follow-Up",
  },
] as const;

const CRM_STATS = [
  { value: "4",      label: "Sessions"     },
  { value: "$2,840", label: "Total spent"  },
  { value: "3",      label: "Referrals"    },
  { value: "100%",   label: "Deposit rate" },
] as const;

const CRM_TIMELINE = [
  { date: "Mar 2023", event: "First consultation",  detail: "Floral sleeve inquiry via Instagram",              gold: true  },
  { date: "Apr 2023", event: "Deposit paid · $150", detail: "Session 1 confirmed",                             gold: true  },
  { date: "Apr 2023", event: "Session 1 complete",  detail: "Outline — 4 hours",                               gold: true  },
  { date: "Jun 2023", event: "Session 2 complete",  detail: "Shading — 3 hours",                               gold: true  },
  { date: "Aug 2023", event: "5-star review",       detail: "“Alex is incredible. Best tattoo experience ever.”", gold: true  },
  { date: "Jun 2024", event: "Touch-up booked",     detail: "Upcoming · June 20",                              gold: false },
] as const;

export default function HomePage() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [revenue,   setRevenue]   = useState(0);
  const [bookings,  setBookings]  = useState(0);
  const [deposits,  setDeposits]  = useState(0);

  const [quoteSession1, setQuoteSession1] = useState(0);
  const [quoteSession2, setQuoteSession2] = useState(0);
  const [quoteTotal,    setQuoteTotal]    = useState(0);
  const [quoteDeposit,  setQuoteDeposit]  = useState(0);

  const [visibleMessages, setVisibleMessages] = useState(0);

  /* ── Hero entrance: start invisible unless reduced-motion preferred ── */
  const [heroVisible, setHeroVisible] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  /* ── Existing refs ── */
  const chatCardRef      = useRef<HTMLDivElement>(null);
  const workflowRowRef   = useRef<HTMLDivElement>(null);
  const pipelineRef      = useRef<HTMLDivElement>(null);
  const quoteCardRef     = useRef<HTMLDivElement>(null);
  const heroDashRef      = useRef<HTMLDivElement>(null);
  const quoteTiltRef     = useRef<HTMLDivElement>(null);
  const aiChatTiltRef    = useRef<HTMLDivElement>(null);
  const whiteLabelTiltRef = useRef<HTMLDivElement>(null);

  /* ── New refs ── */
  const revenueStatRef  = useRef<HTMLParagraphElement>(null);
  const bookingsStatRef = useRef<HTMLParagraphElement>(null);
  const depositsStatRef = useRef<HTMLParagraphElement>(null);
  const crmTimelineRef  = useRef<HTMLDivElement>(null);

  /* ── Hero item inline-style helper ── */
  const heroItemStyle = (delayMs: number, initTransform = "translateY(20px)"): React.CSSProperties => ({
    opacity:    heroVisible ? 1 : 0,
    transform:  heroVisible ? "none" : initTransform,
    transition: `opacity 0.5s ease-out ${delayMs}ms, transform 0.5s ease-out ${delayMs}ms`,
  });

  /* ── Hero count-up + stat flash ── */
  useEffect(() => {
    const flashStat = (ref: React.RefObject<HTMLParagraphElement>) => {
      const el = ref.current;
      if (!el) return;
      el.classList.add("stat-flash");
      setTimeout(() => el.classList.remove("stat-flash"), 700);
    };
    const countUp = (
      setter: React.Dispatch<React.SetStateAction<number>>,
      target: number,
      duration: number,
      onDone?: () => void
    ) => {
      const start = performance.now();
      const tick = (now: number) => {
        const p = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        setter(Math.round(eased * target));
        if (p < 1) requestAnimationFrame(tick);
        else if (onDone) onDone();
      };
      requestAnimationFrame(tick);
    };
    countUp(setRevenue,  12480, 1500, () => flashStat(revenueStatRef));
    countUp(setBookings,    47, 1200, () => flashStat(bookingsStatRef));
    countUp(setDeposits,   100, 1000, () => flashStat(depositsStatRef));
  }, []);

  /* ── Hero entrance trigger ── */
  useEffect(() => {
    const t = setTimeout(() => setHeroVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  /* ── Scroll-triggered data-animate / reveal / word-reveal ── */
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>(
      "[data-animate], .reveal, .reveal-up, .reveal-scale, .scale-reveal, .word-reveal"
    );
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

  /* ── Section slide-up ── */
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>(".section-slide");
    if (!els.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.2 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  /* ── CRM timeline sequential reveal ── */
  useEffect(() => {
    const container = crmTimelineRef.current;
    if (!container) return;
    let triggered = false;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !triggered) {
          triggered = true;
          const items = Array.from(container.querySelectorAll<HTMLElement>(".timeline-item"));
          items.forEach((item, i) => {
            setTimeout(() => item.classList.add("revealed"), i * 150);
          });
          io.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    io.observe(container);
    return () => io.disconnect();
  }, []);

  /* ── AI chat message loop ── */
  useEffect(() => {
    const card = chatCardRef.current;
    if (!card) return;
    let loopTimer: ReturnType<typeof setTimeout>;
    const runSequence = () => {
      setVisibleMessages(0);
      setTimeout(() => setVisibleMessages(1), 0);
      setTimeout(() => setVisibleMessages(2), 800);
      setTimeout(() => setVisibleMessages(3), 1600);
      loopTimer = setTimeout(runSequence, 5600);
    };
    const io = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { runSequence(); io.disconnect(); } },
      { threshold: 0.3 }
    );
    io.observe(card);
    return () => { io.disconnect(); clearTimeout(loopTimer); };
  }, []);

  /* ── Workflow cards left-to-right reveal ── */
  useEffect(() => {
    const row = workflowRowRef.current;
    if (!row) return;
    const cards = Array.from(row.querySelectorAll<HTMLElement>(".wf-item"));
    let triggered = false;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !triggered) {
          triggered = true;
          cards.forEach((card, i) => {
            setTimeout(() => card.classList.replace("workflow-card-hidden", "workflow-card-visible"), i * 80);
          });
          io.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    io.observe(row);
    return () => io.disconnect();
  }, []);

  /* ── Pipeline cards drop-in by column ── */
  useEffect(() => {
    const container = pipelineRef.current;
    if (!container) return;
    const cols = Array.from(container.querySelectorAll<HTMLElement>(".pipeline-col"));
    let triggered = false;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !triggered) {
          triggered = true;
          cols.forEach((col, colIdx) => {
            const cards = Array.from(col.querySelectorAll<HTMLElement>(".pipeline-item"));
            cards.forEach((card, cardIdx) => {
              setTimeout(
                () => card.classList.replace("pipeline-card-hidden", "pipeline-card-visible"),
                colIdx * 200 + cardIdx * 100
              );
            });
          });
          io.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    io.observe(container);
    return () => io.disconnect();
  }, []);

  /* ── Quote Builder price count-up ── */
  useEffect(() => {
    const card = quoteCardRef.current;
    if (!card) return;
    let triggered = false;
    const countUp = (
      setter: React.Dispatch<React.SetStateAction<number>>,
      target: number,
      duration: number,
      delayMs: number
    ) => {
      setTimeout(() => {
        const start = performance.now();
        const tick = (now: number) => {
          const p = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          setter(Math.round(eased * target));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }, delayMs);
    };
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !triggered) {
          triggered = true;
          countUp(setQuoteSession1, 400, 800, 0);
          countUp(setQuoteSession2, 300, 600, 200);
          countUp(setQuoteTotal,    700, 1000, 0);
          countUp(setQuoteDeposit,  150, 500, 0);
          io.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    io.observe(card);
    return () => io.disconnect();
  }, []);

  /* ── Tilt effect ── */
  const handleTilt = useCallback((ref: React.RefObject<HTMLDivElement>) => ({
    onMouseMove: (e: React.MouseEvent<HTMLDivElement>) => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      const rx = -(y / rect.height) * 6;
      const ry =  (x / rect.width)  * 6;
      el.style.transform = `perspective(1000px) rotateX(${rx}deg) rotateY(${ry}deg)`;
    },
    onMouseLeave: () => {
      const el = ref.current;
      if (el) el.style.transform = "perspective(1000px) rotateX(0deg) rotateY(0deg)";
    },
  }), []);

  const heroTilt       = handleTilt(heroDashRef);
  const quoteTilt      = handleTilt(quoteTiltRef);
  const aiChatTilt     = handleTilt(aiChatTiltRef);
  const whiteLabelTilt = handleTilt(whiteLabelTiltRef);

  /* ── Pain card magnetic hover ── */
  const handlePainMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width  - 0.5) * 12;
    const y = ((e.clientY - rect.top)  / rect.height - 0.5) * 12;
    el.style.transition = "transform 100ms ease-out";
    el.style.transform  = `translateX(${x}px) translateY(${y}px)`;
  };
  const handlePainLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    el.style.transition = "transform 400ms ease-out";
    el.style.transform  = "";
  };

  /* ── Pricing card spotlight ── */
  const handlePricingMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width  * 100).toFixed(1);
    const y = ((e.clientY - rect.top)  / rect.height * 100).toFixed(1);
    el.style.backgroundImage = `radial-gradient(circle at ${x}% ${y}%, rgba(212,168,83,0.08) 0%, transparent 60%)`;
  };
  const handlePricingLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.backgroundImage = "";
  };

  const heroStats = [
    { label: "Revenue",  value: `$${revenue.toLocaleString()}`, ref: revenueStatRef  },
    { label: "Bookings", value: String(bookings),               ref: bookingsStatRef },
    { label: "Deposits", value: `${deposits}%`,                 ref: depositsStatRef },
  ];

  return (
    <div style={{ background: "#F8F8F6", color: "#111111" }}>

      {/* ══ NAV ══ */}
      <header className="sticky top-0 z-50 bg-white border-b border-[#E5E5E3]">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between h-16">
          <a href="/" className="text-xl font-semibold tracking-tight text-[#111111]">InkBook</a>

          <nav className="hidden md:flex items-center gap-8">
            {(["Features", "Book Demo"] as const).map((link) => (
              <a key={link} href={`#${link.toLowerCase().replace(" ", "-")}`}
                className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">
                {link}
              </a>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <a href="#book-demo" className="border border-gray-300 rounded-full px-5 py-2 text-sm font-medium text-[#111111] hover:border-gray-400 transition-colors">
              Book Demo
            </a>
            <a href="#trial" className="bg-black text-white rounded-full px-5 py-2 text-sm font-medium hover:bg-[#2A2A2A] transition-colors">
              Start Free Trial
            </a>
          </div>

          <button className="md:hidden p-1.5 rounded-md text-[#111111]" onClick={() => setMobileOpen((o) => !o)} aria-label="Toggle menu">
            {mobileOpen ? <IconClose /> : <IconMenu />}
          </button>
        </div>

        {mobileOpen && (
          <div className="md:hidden px-6 pt-2 pb-6 flex flex-col gap-1 border-t border-[#F3F4F6]">
            {(["Features", "Book Demo"] as const).map((link) => (
              <a key={link} href={`#${link.toLowerCase().replace(" ", "-")}`}
                className="py-2.5 text-sm font-medium text-gray-500" onClick={() => setMobileOpen(false)}>
                {link}
              </a>
            ))}
            <div className="flex flex-col gap-2 pt-3">
              <a href="#book-demo" className="py-2.5 text-sm font-medium rounded-full border border-gray-300 text-center text-[#111111]">Book Demo</a>
              <a href="#trial" className="py-2.5 text-sm font-medium rounded-full bg-black text-white text-center">Start Free Trial</a>
            </div>
          </div>
        )}
      </header>

      {/* ══ HERO ══ */}
      <section className="py-24 lg:py-32 px-6" style={{ background: "#F8F8F6" }}>
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-[45%_55%] gap-16 items-center">

            {/* Left — copy */}
            <div>
              {/* FIX 2 + ANIM 1: label */}
              <span
                className="hero-item text-xs font-semibold tracking-widest uppercase text-[#D4A853]"
                style={heroItemStyle(0, "translateY(-10px)")}
              >
                Tattoo Business Operating System
              </span>

              {/* FIX 2: H1 split into two sized lines */}
              <h1 className="font-bold leading-[1.1] mt-4 text-[#111111]">
                <span
                  className="hero-item block text-5xl lg:text-6xl xl:text-7xl"
                  style={heroItemStyle(150, "translateY(20px)")}
                >
                  Stop chasing inquiries.
                </span>
                <span
                  className="hero-item block text-4xl lg:text-5xl xl:text-6xl"
                  style={heroItemStyle(300, "translateY(20px)")}
                >
                  Start tattooing.
                </span>
              </h1>

              <p
                className="hero-item text-lg text-gray-500 mt-6 max-w-md"
                style={heroItemStyle(450)}
              >
                AI handles consultations, follow-ups, quotes, deposits, bookings, and aftercare — so you can focus on tattooing.
              </p>

              <div
                className="hero-item mt-10 flex flex-wrap gap-4"
                style={heroItemStyle(600, "translateY(10px)")}
              >
                <a href="#trial" className="bg-black text-white rounded-full px-8 py-4 text-base font-medium hover:bg-[#2A2A2A] transition-colors">
                  Start Free Trial
                </a>
                <a href="#book-demo" className="border border-gray-300 rounded-full px-8 py-4 text-base text-[#111111] hover:border-gray-400 transition-colors">
                  Book Demo
                </a>
              </div>
              <p className="mt-4 text-sm text-gray-400">14-day free trial · No credit card required</p>
            </div>

            {/* Right — MOCKUP 1: rich dashboard */}
            {/* ANIM 1: outer wrapper gets hero-item with translateX+scale start */}
            <div
              className="hero-item relative"
              style={heroItemStyle(200, "translateX(30px) scale(0.97)")}
            >
              <div className="absolute inset-0 pointer-events-none" style={{
                background: "radial-gradient(ellipse at center, rgba(212,168,83,0.07) 0%, transparent 70%)",
                filter: "blur(24px)", transform: "scale(1.1)",
              }} />

              <div ref={heroDashRef} className="tilt-card relative rounded-2xl shadow-2xl overflow-hidden flex flex-col"
                style={{ background: "#0F0F0F", border: "1px solid #1F1F1F", minHeight: "580px" }}
                onMouseMove={heroTilt.onMouseMove} onMouseLeave={heroTilt.onMouseLeave}>

                <div className="flex-shrink-0 flex items-center gap-2 px-4 py-3 bg-[#1A1A1A]"
                  style={{ borderBottom: "1px solid #1F1F1F" }}>
                  <span className="w-3 h-3 rounded-full bg-red-400" />
                  <span className="w-3 h-3 rounded-full bg-yellow-400" />
                  <span className="w-3 h-3 rounded-full bg-green-400" />
                  <span className="flex-1 text-center text-sm text-gray-500">InkBook — Dashboard</span>
                </div>

                <div className="flex flex-1">

                  <div className="flex-shrink-0 w-52 bg-[#111111] p-4" style={{ borderRight: "1px solid #1F1F1F" }}>
                    <p className="text-base font-bold text-white mb-6">InkBook</p>
                    <nav className="space-y-1">
                      {SIDEBAR_NAV.map((item) => (
                        <div key={item} className={`px-3 py-2 rounded-lg text-sm cursor-default ${
                          item === "Dashboard"
                            ? "bg-[#D4A853] text-black font-medium"
                            : "text-gray-500 hover:text-gray-300"
                        }`}>
                          {item}
                        </div>
                      ))}
                    </nav>
                  </div>

                  <div className="flex-1 p-4 bg-[#0F0F0F] overflow-auto pb-14">

                    {/* FIX 1: text-4xl → text-2xl, add refs for stat flash */}
                    <div className="grid grid-cols-3 gap-3">
                      {heroStats.map((s) => (
                        <div key={s.label} className="bg-[#1A1A1A] rounded-xl p-4">
                          <p className="text-xs text-gray-500">{s.label}</p>
                          <p ref={s.ref} className="text-2xl font-bold text-white mt-1">{s.value}</p>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-500 uppercase tracking-wider">Recent Bookings</span>
                        <span className="text-xs text-green-400 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse-dot inline-block" />
                          Live
                        </span>
                      </div>
                      <div className="space-y-2">
                        {BOOKING_ROWS.map((row) => (
                          <div key={row.name} className="bg-[#1A1A1A] rounded-lg px-3 py-2 flex items-center justify-between">
                            <div>
                              <p className="text-sm text-white font-medium">{row.name}</p>
                              <p className="text-xs text-gray-500 mt-0.5">{row.service}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-[#D4A853] font-medium">{row.amount}</span>
                              <span className={`text-xs rounded-full px-2 py-0.5 ${row.badgeClass}`}>{row.badge}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-500 uppercase tracking-wider">AI Activity</span>
                        <span className="text-xs text-[#D4A853]">🤖 AI</span>
                      </div>
                      <div className="space-y-2">
                        {AI_ACTIVITY.map((item) => (
                          <div key={item} className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#D4A853] mt-1.5 flex-shrink-0" />
                            <p className="text-xs text-gray-400">{item}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>
                </div>

                <div className="absolute bottom-4 left-[220px] flex items-center gap-2 rounded-full px-3 py-1.5"
                  style={{ background: "#1A1A1A", border: "1px solid #2A2A2A" }}>
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
        <div className="max-w-5xl mx-auto text-center">
          <span className="text-xs uppercase tracking-widest text-[#D4A853] font-semibold" data-animate="fade-up">Why InkBook Exists</span>
          <div className="mt-8">
            {/* FIX 3: flex flex-wrap gap-x so inline-block words have visible spaces */}
            <div className="flex flex-wrap gap-x-[0.3em] justify-center text-5xl lg:text-6xl font-light text-gray-300 leading-tight">
              {"Most software manages appointments.".split(" ").map((word, i) => (
                <span key={i} className="word-reveal" data-animate="word" data-delay={String(i * 50)}>{word}</span>
              ))}
            </div>
            <div className="flex flex-wrap gap-x-[0.3em] justify-center text-5xl lg:text-6xl font-bold text-[#111111] leading-tight mt-2">
              {"InkBook manages the entire tattoo client journey.".split(" ").map((word, i) => (
                <span key={i} className="word-reveal" data-animate="word" data-delay={String(300 + i * 50)}>{word}</span>
              ))}
            </div>
          </div>
          <div className="mt-16 max-w-xs mx-auto text-left">
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
      </section>

      {/* ══ PAIN ══ */}
      <section id="features" className="py-20 px-6" style={{ background: "#F8F8F6" }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center">
            <span className="text-xs uppercase tracking-widest text-[#D4A853] font-semibold">The Problem</span>
            <h2 className="text-3xl lg:text-4xl font-bold text-[#111111] mt-4">
              Most bookings aren&apos;t lost to competitors.
            </h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-16 max-w-4xl mx-auto">
            {/* ANIM 2: magnetic hover on each pain card */}
            {PAIN_CARDS.map((card, i) => (
              <div key={i}
                className="bg-white rounded-2xl p-8 shadow-sm border border-[#E5E5E3] hover:shadow-md transition-shadow duration-200"
                data-animate="fade-up" data-delay={String(i * 100)}
                onMouseMove={handlePainMove}
                onMouseLeave={handlePainLeave}>
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

          <div className="mt-12 -mx-6 px-6 overflow-x-auto">
            <div ref={workflowRowRef} className="flex items-start pb-4" style={{ minWidth: "max-content" }}>
              {WORKFLOW_STEPS.map((s, i) => (
                <div key={i} className="wf-item workflow-card-hidden flex items-center flex-shrink-0">
                  <div className="min-w-[160px] p-5 rounded-2xl bg-white border border-[#E5E5E3] shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-200 text-center">
                    <div className="w-4 h-4 rounded-full mx-auto" style={{ background: s.ai ? "#D4A853" : "#D1D5DB" }} />
                    <p className="text-sm font-bold text-[#111111] mt-3">{s.label}</p>
                    <p className="text-xs text-gray-500 mt-1">{s.desc}</p>
                  </div>
                  {i < WORKFLOW_STEPS.length - 1 && (
                    <span className="text-[#D4A853] text-xl mx-2 flex-shrink-0 self-center">→</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 rounded-xl p-5"
            style={{ background: "rgba(212,168,83,0.05)", border: "1px solid rgba(212,168,83,0.2)" }}
            data-animate="fade-up">
            <p className="text-xs uppercase tracking-widest text-[#D4A853] text-center mb-3 font-semibold">
              The Complete Workflow
            </p>
            <p className="text-sm text-[#D4A853] text-center leading-relaxed">
              Instagram Inquiry → AI Consultation → AI Follow-Up → Quote → Deposit → Booking → Consent → Aftercare → Review → CRM
            </p>
          </div>

          {/* AI Consultation chat */}
          <div className="max-w-3xl mx-auto mt-12" ref={aiChatTiltRef}
            onMouseMove={aiChatTilt.onMouseMove} onMouseLeave={aiChatTilt.onMouseLeave}>
            <div ref={chatCardRef} className="tilt-card bg-white rounded-2xl shadow-xl border border-[#E5E5E3] overflow-hidden min-h-[360px]">

              <div className="bg-[#F8F8F6] px-5 py-4 border-b border-[#E5E5E3] flex items-center justify-between">
                <span className="text-sm font-semibold text-[#111111]">AI Consultation</span>
                <span className="text-xs text-gray-400">Powered by InkBook</span>
              </div>

              <div className="p-5 space-y-4 min-h-[160px]">
                <div className={`flex gap-3 ${visibleMessages >= 1 ? "msg-visible" : "msg-hidden"}`}>
                  <div className="w-8 h-8 rounded-full bg-[#D4A853] flex items-center justify-center text-xs text-black font-bold flex-shrink-0">AI</div>
                  <div className="bg-[#F8F8F6] rounded-xl rounded-tl-none px-4 py-3 text-sm text-[#111111] max-w-sm">
                    Hi! I&apos;m InkBook AI. Tell me about the tattoo you&apos;re looking for 🎨
                  </div>
                </div>
                <div className={`flex gap-3 justify-end ${visibleMessages >= 2 ? "msg-visible" : "msg-hidden"}`}>
                  <div className="bg-[#111111] rounded-xl rounded-tr-none px-4 py-3 text-sm text-white max-w-xs">
                    I want a floral sleeve on my left arm, black and grey
                  </div>
                </div>
                <div className={`flex gap-3 ${visibleMessages >= 3 ? "msg-visible" : "msg-hidden"}`}>
                  <div className="w-8 h-8 rounded-full bg-[#D4A853] flex items-center justify-center text-xs text-black font-bold flex-shrink-0">AI</div>
                  <div className="bg-[#F8F8F6] rounded-xl rounded-tl-none px-4 py-3 text-sm text-[#111111] max-w-sm">
                    Great choice! I&apos;ve detected: Floral / Botanical style, Black &amp; Grey. What size are you thinking — half sleeve or full?
                  </div>
                </div>
              </div>

              <div className={`px-5 py-4 bg-[#F8F8F6] border-t border-[#E5E5E3] ${visibleMessages >= 3 ? "msg-visible" : "msg-hidden"}`}>
                <p className="text-sm text-[#D4A853]">Style detected: Floral · Black &amp; Grey</p>
                <div className="flex gap-1.5 mt-3">
                  {Array.from({ length: 9 }, (_, i) => (
                    <div key={i} className={`h-2 flex-1 rounded-full ${i < 3 ? "bg-[#D4A853]" : "bg-gray-200"}`} />
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-2">Currently at step 3 of 9</p>
              </div>

            </div>
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
              <p className="mt-8 text-white font-semibold">
                That is what InkBook does. Every single booking.
              </p>
            </div>

            {/* MOCKUP 3: Quote Builder */}
            <div className="flex justify-center lg:justify-end">
              <div ref={quoteTiltRef} className="tilt-card w-full max-w-lg"
                onMouseMove={quoteTilt.onMouseMove} onMouseLeave={quoteTilt.onMouseLeave}>
                <div ref={quoteCardRef} className="bg-white rounded-2xl overflow-hidden"
                  style={{ boxShadow: "0 0 0 1px rgba(255,255,255,0.06), 0 24px 64px rgba(0,0,0,0.6), 0 8px 24px rgba(0,0,0,0.4)" }}>

                  <div className="px-5 py-4 bg-[#F8F8F6] border-b border-[#E5E5E3] flex items-center justify-between">
                    <span className="text-base font-semibold text-[#111111]">Quote Builder</span>
                    <span className="bg-[#D4A853] text-black text-xs px-2.5 py-1 rounded-full font-medium">AI Draft Ready</span>
                  </div>

                  <div className="px-5 py-4 border-b border-[#E5E5E3]">
                    <p className="text-base font-semibold text-[#111111]">Sarah M.</p>
                    <p className="text-sm text-gray-500 mt-0.5">Floral sleeve · Left arm · Full</p>
                  </div>

                  <div className="px-5 py-4 space-y-3 border-b border-[#E5E5E3]">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Consultation</span>
                      <span className="text-[#111111] font-medium">$0</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Session 1 — Outline (4hr)</span>
                      <span className="text-[#111111] font-medium">${quoteSession1}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Session 2 — Shading (3hr)</span>
                      <span className="text-[#111111] font-medium">${quoteSession2}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Touch-up (included)</span>
                      <span className="text-[#111111] font-medium">$0</span>
                    </div>
                  </div>

                  <div className="px-5 py-4 border-b border-[#E5E5E3]">
                    <div className="flex justify-between">
                      <span className="text-base font-semibold text-[#111111]">Total Project</span>
                      <span className="text-base font-bold text-[#111111]">${quoteTotal}</span>
                    </div>
                    <div className="flex justify-between mt-2">
                      <span className="text-sm text-gray-500">Deposit Required</span>
                      <span className="text-sm text-[#D4A853] font-medium">${quoteDeposit} (21%)</span>
                    </div>
                  </div>

                  <div className="px-5 py-4 flex gap-2 bg-[#F8F8F6] border-b border-[#E5E5E3]">
                    <button className="border border-gray-300 rounded-lg px-4 py-2 text-sm text-[#111111] hover:bg-gray-100 transition-colors">
                      Edit
                    </button>
                    <button className="flex-1 bg-[#111111] text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-[#2A2A2A] transition-colors">
                      Approve &amp; Send
                    </button>
                  </div>

                  <div className="px-5 py-3">
                    <p className="text-xs text-gray-400">AI generated draft · Artist approval required before sending</p>
                  </div>

                </div>

                <div className="mt-3 bg-green-50 border border-green-200 rounded-xl p-4">
                  <div className="flex items-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                    <span className="text-sm font-semibold text-green-800">Deposit Request Sent ✓</span>
                  </div>
                  <p className="text-sm text-green-700 mt-1.5">Sarah M. · $150 deposit · Paid via Stripe</p>
                </div>

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ══ ARTIST DASHBOARD ══ — ANIM 4: section-slide */}
      <section className="section-slide py-24 px-6" style={{ background: "#F8F8F6" }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center">
            <span className="text-xs uppercase tracking-widest text-[#D4A853] font-semibold">Artist Dashboard</span>
            <h2 className="text-3xl lg:text-4xl font-bold text-[#111111] mt-4">
              Everything an artist needs. Nothing they don&apos;t.
            </h2>
          </div>

          <div className="max-w-4xl mx-auto mt-12">
            <div className="bg-white rounded-2xl shadow-xl border border-[#E5E5E3] overflow-hidden">

              <div className="bg-[#F8F8F6] px-6 py-4 border-b border-[#E5E5E3] flex items-center gap-3">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
                <span className="text-sm font-semibold text-[#111111]">Artist Dashboard — Alex R.</span>
                <div className="ml-auto flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-green-400" />
                  <span className="text-xs text-gray-500">Online</span>
                </div>
              </div>

              <div className="grid h-[400px]" style={{ gridTemplateColumns: "240px 1fr" }}>

                <div className="bg-[#F8F8F6] border-r border-[#E5E5E3] p-4 flex flex-col">
                  <div className="flex flex-col items-center pt-2">
                    <div className="w-12 h-12 bg-[#D4A853] rounded-full flex items-center justify-center text-white font-bold">AR</div>
                    <p className="text-sm font-semibold mt-2 text-[#111111]">Alex R.</p>
                    <p className="text-xs text-gray-500">Neo-Traditional</p>
                  </div>
                  <nav className="mt-6 space-y-1">
                    {ARTIST_NAV_ITEMS.map((item) => (
                      <div key={item.label} className={`flex items-center justify-between text-xs rounded-lg px-3 py-2 ${
                        item.active ? "bg-[#D4A853] text-black font-medium" : "text-gray-500"
                      }`}>
                        {item.label}
                        {item.badge && (
                          <span className="bg-[#111111] text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-medium">
                            {item.badge}
                          </span>
                        )}
                      </div>
                    ))}
                  </nav>
                </div>

                <div className="p-6 overflow-auto">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-[#111111]">AI Inbox</span>
                    <span className="text-xs text-[#D4A853]">3 items need attention</span>
                  </div>
                  <div className="space-y-3 mt-4">
                    {ARTIST_INBOX.map((card) => (
                      <div key={card.name} className={`${card.bg} ${card.border} rounded-xl p-4`}>
                        <div className="flex items-center justify-between">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${card.badgeClass}`}>{card.badge}</span>
                          <span className="text-xs text-gray-400">{card.time}</span>
                        </div>
                        <p className="text-sm font-semibold mt-2 text-[#111111]">{card.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{card.detail}</p>
                        <button className={`mt-3 text-xs rounded-lg px-3 py-1.5 ${card.btnClass}`}>{card.btn}</button>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
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

            <div ref={whiteLabelTiltRef} className="tilt-card bg-white rounded-2xl shadow-2xl p-6"
              onMouseMove={whiteLabelTilt.onMouseMove} onMouseLeave={whiteLabelTilt.onMouseLeave}>
              <div className="flex items-center justify-between pb-4" style={{ borderBottom: "1px solid #F3F4F6" }}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#1A1A1A] flex items-center justify-center text-xs font-bold text-white flex-shrink-0">AI</div>
                  <div>
                    <p className="text-sm font-semibold text-[#111111]">Ash &amp; Iron Studio</p>
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
                    <span key={style} className="px-3 py-1 rounded-full text-xs font-medium border"
                      style={{ background: i === 0 ? "#111111" : "#F9FAFB", color: i === 0 ? "#FFFFFF" : "#374151", borderColor: i === 0 ? "#111111" : "#E5E7EB" }}>
                      {style}
                    </span>
                  ))}
                </div>
                {[
                  { initials: "AR", name: "Alex Reeves", style: "Blackwork · Geometric", avail: "Mon" },
                  { initials: "JH", name: "Jordan Holt", style: "Traditional · Neo-trad", avail: "Thu" },
                ].map((a, i) => (
                  <div key={i} className="flex items-center gap-3 p-3.5 rounded-xl mb-3 last:mb-0 bg-[#F9FAFB] border border-[#F3F4F6]">
                    <div className="w-10 h-10 rounded-full bg-[#374151] flex items-center justify-center text-xs font-bold text-white flex-shrink-0">{a.initials}</div>
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

          {/* MOCKUP 4: Lead Pipeline Kanban */}
          <div className="mt-16 bg-white rounded-2xl shadow-sm border border-[#E5E5E3] overflow-hidden" data-animate="fade-up">

            <div className="px-6 py-4 border-b border-[#E5E5E3] flex items-center justify-between">
              <span className="text-sm font-semibold text-[#111111]">Lead Pipeline</span>
              <span className="text-xs text-gray-500">12 active leads</span>
            </div>

            <div ref={pipelineRef} className="flex gap-4 p-4 overflow-x-auto">
              {PIPELINE_COLS.map((col) => (
                <div key={col.title} className="pipeline-col w-56 flex-shrink-0 min-h-48">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-sm font-semibold uppercase ${col.titleClass}`}>{col.title}</span>
                      {col.ai && <span className="w-1.5 h-1.5 rounded-full bg-[#D4A853] animate-pulse-dot" />}
                    </div>
                    <span className={`rounded-full px-2 text-xs font-medium ${col.countClass}`}>{col.cards.length}</span>
                  </div>
                  <div className="space-y-2 min-h-48">
                    {col.cards.map((card) => (
                      <div key={card.name} className={`pipeline-item pipeline-card-hidden bg-[#F8F8F6] rounded-lg p-3 ${card.border}`}>
                        <p className="text-sm font-medium text-[#111111]">{card.name}</p>
                        <span className="inline-block mt-1 text-xs px-1.5 py-0.5 rounded"
                          style={{ background: col.ai ? "rgba(212,168,83,0.1)" : "#F3F4F6", color: col.ai ? "#D4A853" : "#6B7280" }}>
                          {card.tag}
                        </span>
                        <p className={`text-xs mt-1.5 ${card.subClass}`}>{card.sub}</p>
                        {card.readyBadge && (
                          <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700">
                            Ready to book
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

          </div>

        </div>
      </section>

      {/* ══ CLIENT CRM ══ — ANIM 4: section-slide */}
      <section className="section-slide py-24 px-6" style={{ background: "#FFFFFF" }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center">
            <span className="text-xs uppercase tracking-widest text-[#D4A853] font-semibold">Client CRM</span>
            <h2 className="text-3xl lg:text-4xl font-bold text-[#111111] mt-4">
              Every client. Their entire journey.
            </h2>
          </div>

          <div className="max-w-4xl mx-auto mt-12">
            <div className="bg-white rounded-2xl shadow-xl border border-[#E5E5E3] overflow-hidden">

              <div className="px-6 py-4 bg-[#F8F8F6] border-b border-[#E5E5E3] flex items-center justify-between">
                <span className="text-sm font-semibold text-[#111111]">Sarah M. — Client Profile</span>
                <div className="flex items-center gap-2">
                  {["Floral", "Black & Grey", "VIP"].map((tag) => (
                    <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-white border border-[#E5E5E3] text-gray-600">{tag}</span>
                  ))}
                </div>
              </div>

              <div className="grid" style={{ gridTemplateColumns: "280px 1fr" }}>

                <div className="p-6 border-r border-[#E5E5E3]">
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold"
                      style={{ background: "linear-gradient(135deg, #D4A853 0%, #B8923E 100%)" }}>
                      SM
                    </div>
                    <p className="text-lg font-bold mt-3 text-[#111111]">Sarah M.</p>
                    <p className="text-xs text-gray-500">Client since March 2023</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-4">
                    {CRM_STATS.map((s) => (
                      <div key={s.label} className="bg-[#F8F8F6] rounded-xl p-3 text-center">
                        <p className="text-lg font-bold text-[#111111]">{s.value}</p>
                        <p className="text-xs text-gray-500">{s.label}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 bg-[#F8F8F6] rounded-xl p-3">
                    <p className="text-xs text-gray-500">Next Session</p>
                    <p className="text-sm font-semibold text-[#111111] mt-0.5">June 20 · 2:00 PM · Shading</p>
                  </div>
                </div>

                {/* ANIM 5: timeline container ref + timeline-item class on rows */}
                <div className="p-6">
                  <p className="text-sm font-semibold text-[#111111]">Client Timeline</p>
                  <div ref={crmTimelineRef} className="mt-4 space-y-4 relative">
                    <div className="absolute left-[5px] top-2 bottom-2 w-[2px] bg-[#E5E5E3]" />
                    {CRM_TIMELINE.map((item, i) => (
                      <div key={i} className="timeline-item flex gap-4 items-start relative">
                        <div className={`w-3 h-3 rounded-full mt-1 flex-shrink-0 z-10 ${
                          item.gold ? "bg-[#D4A853]" : "bg-white border-2 border-[#D4A853]"
                        }`} />
                        <div>
                          <p className="text-xs text-gray-400">{item.date}</p>
                          <p className="text-sm font-medium text-[#111111]">{item.event}</p>
                          <p className="text-xs text-gray-500">{item.detail}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ ROI ══ — ANIM 4: section-slide */}
      <section className="section-slide py-20 px-6" style={{ background: "#FFFFFF" }}>
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
              <div key={i} className="scale-reveal bg-[#F8F8F6] rounded-2xl p-8 text-center hover:shadow-md transition-all duration-200"
                data-delay={String(i * 150)}>
                <p className="text-4xl font-bold text-[#111111]">{stat.value}</p>
                <p className="text-sm text-gray-500 mt-2">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ PRICING ══ */}
      <section id="pricing" className="py-24 px-6" style={{ background: "#F8F8F6" }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center">
            <span className="text-xs uppercase tracking-widest text-[#D4A853] font-semibold">Pricing</span>
            <h2 className="text-3xl lg:text-4xl font-bold text-[#111111] mt-4">Simple, transparent pricing.</h2>
            <p className="text-base text-gray-500 mt-4">14-day free trial. No credit card required. No transaction fees.</p>
          </div>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
            {/* ANIM 3: spotlight on each card */}
            <div
              className="scale-reveal bg-white rounded-2xl p-8 shadow-sm border border-[#E5E5E3]"
              data-delay="0"
              onMouseMove={handlePricingMove}
              onMouseLeave={handlePricingLeave}
            >
              <p className="text-sm font-semibold text-gray-500">Solo Artist</p>
              <div className="flex items-end gap-1 mt-3 mb-1">
                <span className="text-5xl font-bold text-[#111111]">$49</span>
                <span className="text-sm text-gray-400 mb-2">/mo</span>
              </div>
              <p className="text-sm text-gray-500 mb-8">For individual tattoo artists.</p>
              <a href="#trial" className="block w-full py-3 text-center text-sm font-semibold rounded-full border border-gray-300 text-[#111111] hover:border-gray-400 transition-colors">
                Start Free Trial
              </a>
            </div>

            <div
              className="bg-white rounded-2xl p-8 shadow-xl border-2 border-[#D4A853] scale-[1.05] relative"
              data-animate="fade-up" data-delay="200"
              onMouseMove={handlePricingMove}
              onMouseLeave={handlePricingLeave}
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
              <a href="#trial" className="block w-full py-3 text-center text-sm font-semibold rounded-full bg-black text-white hover:bg-[#2A2A2A] transition-colors">
                Start Free Trial
              </a>
            </div>

            <div
              className="scale-reveal bg-white rounded-2xl p-8 shadow-sm border border-[#E5E5E3]"
              data-delay="400"
              onMouseMove={handlePricingMove}
              onMouseLeave={handlePricingLeave}
            >
              <p className="text-sm font-semibold text-gray-500">Studio Pro</p>
              <div className="flex items-end gap-1 mt-3 mb-1">
                <span className="text-5xl font-bold text-[#111111]">$169</span>
                <span className="text-sm text-gray-400 mb-2">/mo</span>
              </div>
              <p className="text-sm text-gray-500 mb-8">For larger studios with advanced needs.</p>
              <a href="#trial" className="block w-full py-3 text-center text-sm font-semibold rounded-full border border-gray-300 text-[#111111] hover:border-gray-400 transition-colors">
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
            <a href="#signup" className="bg-[#D4A853] text-black font-semibold rounded-full px-8 py-4 text-sm hover:opacity-90 transition-opacity">
              Start Free Trial
            </a>
            <a href="#book-demo" className="border border-gray-600 text-white rounded-full px-8 py-4 text-sm hover:border-gray-400 transition-colors">
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
              <a key={link} href={`#${link.toLowerCase().replace(" ", "-")}`}
                className="text-sm text-gray-400 hover:text-white transition-colors">
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
