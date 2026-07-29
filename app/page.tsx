"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import CapabilityActivationCard from "@/components/landing/CapabilityActivationCard";

/* ─── Base Icons ─── */
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

/* ─── OS Sidebar Icons (14px) ─── */
const IcoDash = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
    <rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>
  </svg>
);
const IcoPipe = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="7" width="6" height="14" rx="1"/><rect x="9" y="3" width="6" height="18" rx="1"/><rect x="16" y="10" width="6" height="11" rx="1"/>
  </svg>
);
const IcoInbox = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);
const IcoFile = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
    <line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="12" y2="17"/>
  </svg>
);
const IcoPeople = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);
const IcoCal = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);
const IcoTrend = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
  </svg>
);

/* ─── Data ─── */
const PAIN_CARDS = [
  { icon: <IconMsg />, title: "Inquiries go unanswered for days", desc: "DMs pile up. Clients book elsewhere." },
  { icon: <IconAlert />, title: "No system to follow up lost leads", desc: "Interested clients vanish after the quote." },
  { icon: <IconDollar />, title: "Deposits never collected upfront", desc: "Artists feel awkward. New clients ghost." },
  { icon: <IconShield />, title: "No-shows with no protection", desc: "A blocked day costs $300–$800 minimum." },
];

type OsSidebarItem = { label: string; icon: JSX.Element; active?: boolean; badge?: string };
const OS_SIDEBAR: OsSidebarItem[] = [
  { label: "Dashboard", icon: <IcoDash />, active: true },
  { label: "Pipeline",  icon: <IcoPipe /> },
  { label: "AI Inbox",  icon: <IcoInbox />, badge: "3" },
  { label: "Quotes",    icon: <IcoFile /> },
  { label: "Clients",   icon: <IcoPeople /> },
  { label: "Calendar",  icon: <IcoCal /> },
  { label: "Revenue",   icon: <IcoTrend /> },
];


const AI_ACTIVITY = [
  "Maria Santos replied — \"I want a full sleeve, black and grey roses\"",
  "Jake Thompson deposit $200 collected",
  "Alex Rivera consultation complete — matched to @inkmaster_alex",
];

const OS_TODAY = [
  { time: "2:00 PM", client: "Sarah M.", service: "Sleeve outline · 4hr", color: "#D4A853" },
  { time: "6:00 PM", client: "Jake T.",  service: "Neo-trad arm · 3hr",   color: "#7C3AED" },
];

const OS_MINI_PIPELINE = [
  {
    col: "New", count: 3, ai: false,
    cards: [
      { name: "Maya L.", tag: "Floral sleeve", sub: "2m ago" },
      { name: "Chris P.", tag: "Geometric", sub: "14m ago" },
    ],
  },
  {
    col: "AI Chat", count: 2, ai: true,
    cards: [
      { name: "Sam K.", tag: "Neo-trad", sub: "Qualifying…" },
      { name: "Dana T.", tag: "Mandala", sub: "Style det." },
    ],
  },
  {
    col: "Deposit Paid", count: 2, ai: false,
    cards: [
      { name: "Jordan H.", tag: "Panther", sub: "Ready ✓" },
      { name: "Priya S.",  tag: "Script",  sub: "Booked Fri" },
    ],
  },
];

const JOURNEY_STAGES = [
  { num: "01", label: "New Inquiry",      sub: "Maya L. — Floral sleeve · Black & Grey",             time: "just now", ai: false, done: false },
  { num: "02", label: "AI Consultation",  sub: "9 questions answered · Style detected · Budget OK",  time: "2 min",    ai: true,  done: true  },
  { num: "03", label: "Quote Generated",  sub: "$700 total · $150 deposit · AI draft ready",         time: "3 min",    ai: true,  done: true  },
  { num: "04", label: "Artist Approved",  sub: "Alex R. approved in 1 tap",                          time: "8 min",    ai: false, done: true  },
  { num: "05", label: "Deposit Paid",     sub: "$150 via Stripe · Card ending 4242",                 time: "12 min",   ai: false, done: true  },
  { num: "06", label: "Booking Confirmed", sub: "June 22 · 2:00 PM · Ink & Iron Studio",            time: "12 min",   ai: false, done: true  },
  { num: "07", label: "Consent Signed",   sub: "Digital form completed · ID verified",               time: "June 21",  ai: false, done: true  },
  { num: "08", label: "Session Complete", sub: "4 hours · Outline done · Remainder collected",       time: "June 22",  ai: false, done: true  },
  { num: "09", label: "Aftercare Sent",   sub: "3-day SMS sequence triggered automatically",         time: "June 22",  ai: true,  done: true  },
  { num: "10", label: "5-Star Review",    sub: '"Alex is incredible. Best tattoo experience ever."', time: "June 29",  ai: true,  done: true  },
];

const AI_MSGS = [
  { ai: true,  text: "Hi! I'm InkBook AI. Tell me about the tattoo you're looking for 🎨" },
  { ai: false, text: "I want a full black and grey floral sleeve on my left arm. I'm thinking roses and peonies." },
  { ai: true,  text: "Beautiful choice. I've detected: Floral Botanical · Black & Grey. Our artist Alex R. specializes in exactly this style. What's your timeline and budget?" },
  { ai: false, text: "I'd like to start within the next month. Budget around $800." },
  { ai: true,  text: "Perfect — that works well for a phased approach. 3 sessions would cover a full sleeve. Have you been tattooed before?" },
  { ai: false, text: "Yes, I have a small piece on my ribs." },
  { ai: true,  text: "Great. Any medical conditions or allergies I should note for your consent form?" },
  { ai: false, text: "No, I'm all good!" },
  { ai: true,  text: "Style: Floral Botanical · Artist Match: Alex R. (98%) · Available Mon Jun 22. Generating quote now…" },
];

type PipelineCard = { name: string; tag: string; sub: string; subClass: string; border: string; readyBadge?: boolean };
const PIPELINE_COLS: { title: string; titleClass: string; countClass: string; ai?: boolean; cards: PipelineCard[] }[] = [
  {
    title: "New Inquiry", titleClass: "text-gray-500", countClass: "bg-gray-100 text-gray-600",
    cards: [
      { name: "Maya L.",  tag: "Floral sleeve",    sub: "2m ago",  subClass: "text-gray-400", border: "" },
      { name: "Chris P.", tag: "Geometric back",   sub: "14m ago", subClass: "text-gray-400", border: "" },
      { name: "Jess W.",  tag: "Fine line script", sub: "1h ago",  subClass: "text-gray-400", border: "" },
    ],
  },
  {
    title: "AI Consultation", titleClass: "text-[#D4A853]", countClass: "bg-gray-100 text-gray-600", ai: true,
    cards: [
      { name: "Sam K.",  tag: "Neo-trad eagle",    sub: "Qualifying…",    subClass: "text-[#D4A853]", border: "border border-[rgba(212,168,83,0.25)]" },
      { name: "Dana T.", tag: "Blackwork mandala", sub: "Style detected", subClass: "text-[#D4A853]", border: "border border-[rgba(212,168,83,0.25)]" },
    ],
  },
  {
    title: "Quote Sent", titleClass: "text-blue-600", countClass: "bg-blue-50 text-blue-600",
    cards: [
      { name: "Maria S.", tag: "Full sleeve",  sub: "$1,200", subClass: "font-bold text-[#111111]", border: "border border-blue-100" },
      { name: "Sam W.",   tag: "Back piece",   sub: "$850",   subClass: "font-bold text-[#111111]", border: "border border-blue-100" },
    ],
  },
  {
    title: "Deposit Paid", titleClass: "text-green-600", countClass: "bg-green-100 text-green-600",
    cards: [
      { name: "Jordan H.", tag: "Traditional panther", sub: "Ready to book",  subClass: "text-green-600 font-medium", border: "border border-green-200", readyBadge: true },
      { name: "Priya S.",  tag: "Script lettering",   sub: "Booked: Friday", subClass: "text-green-600 font-medium", border: "border border-green-200", readyBadge: true },
    ],
  },
  {
    title: "Booked", titleClass: "text-purple-600", countClass: "bg-purple-50 text-purple-600",
    cards: [
      { name: "Sarah M.", tag: "Sleeve outline", sub: "Jun 22 · 2pm",  subClass: "text-purple-600 font-medium", border: "border border-purple-100" },
      { name: "Jake T.",  tag: "Neo-trad arm",   sub: "Jun 23 · 11am", subClass: "text-purple-600 font-medium", border: "border border-purple-100" },
    ],
  },
  {
    title: "Completed", titleClass: "text-gray-400", countClass: "bg-gray-100 text-gray-500",
    cards: [
      { name: "Maya L.",  tag: "Floral sleeve", sub: "★★★★★",      subClass: "text-yellow-500 font-medium", border: "" },
      { name: "Chris M.", tag: "Cover-up",       sub: "Review sent", subClass: "text-gray-400", border: "" },
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
    bg: "bg-[#FFFDF5]", border: "border border-[#D4A853]/30",
    badgeClass: "bg-[#D4A853]/10 text-[#D4A853]", badge: "New Consultation",
    time: "2m ago", name: "Maria S.", detail: "Floral sleeve · Black & Grey · Budget $800",
    btnClass: "bg-[#111111] text-white", btn: "Review & Quote",
  },
  {
    bg: "bg-white", border: "border border-[#E5E5E3]",
    badgeClass: "bg-yellow-50 text-yellow-600", badge: "Quote Awaiting Approval",
    time: "1h ago", name: "Jake T.", detail: "Neo-trad arm · $650",
    btnClass: "bg-[#111111] text-white", btn: "Approve & Send",
  },
  {
    bg: "bg-white", border: "border border-[#E5E5E3]",
    badgeClass: "bg-blue-50 text-blue-600", badge: "Follow-Up Required",
    time: "3d ago", name: "Chris M.", detail: "Cover-up · No response 3 days",
    btnClass: "bg-[#D4A853] text-black", btn: "Send Follow-Up",
  },
] as const;

const CRM_STATS = [
  { value: "3",      label: "Sessions"     },
  { value: "$1,200", label: "Total spent"  },
  { value: "3",      label: "Referrals"    },
  { value: "100%",   label: "Deposit rate" },
] as const;

const CRM_TIMELINE = [
  { date: "Feb 14 2023", event: "Instagram inquiry",       detail: "Maria S. — Full sleeve, black & grey roses",          gold: false },
  { date: "Feb 16 2023", event: "AI consultation",         detail: "9 questions completed · Alex R. matched (98%)",       gold: true  },
  { date: "Feb 18 2023", event: "Deposit paid · $240",     detail: "Session 1 of 3 confirmed — Jun 2",                    gold: true  },
  { date: "Jun 2 2023",  event: "Session 1 complete",      detail: "Outline — 5 hours · Remainder collected",             gold: true  },
  { date: "Aug 10 2023", event: "Session 2 complete",      detail: "Shading — 4 hours · Client loves it",                 gold: true  },
  { date: "Oct 5 2023",  event: "Session 3 complete",      detail: "Detail & finishing — 3 hours",                        gold: true  },
  { date: "Oct 12 2023", event: "5-star review ★★★★★", detail: "“Alex is incredible. Best tattoo experience ever.”", gold: true },
  { date: "May 2024",    event: "Touch-up booked",         detail: "Upcoming · June 20 · 2:00 PM",                        gold: false },
] as const;

type CalAppt = { top: number; height: number; client: string; service: string; color: string; time: string };
type CalDay   = { day: string; date: string; appts: CalAppt[] };
const CALENDAR_DAYS: CalDay[] = [
  { day: "MON", date: "16", appts: [] },
  { day: "TUE", date: "17", appts: [
    { top: 35,  height: 105, client: "Jake T.",  service: "Neo-trad",  color: "#7C3AED", time: "11am–2pm" },
  ]},
  { day: "WED", date: "18", appts: [] },
  { day: "THU", date: "19", appts: [
    { top: 70,  height: 70,  client: "Chris M.", service: "Cover-up",  color: "#2563EB", time: "12–2pm" },
  ]},
  { day: "FRI", date: "20", appts: [
    { top: 140, height: 140, client: "Sarah M.", service: "Sleeve",    color: "#D4A853", time: "2–6pm" },
  ]},
  { day: "SAT", date: "21", appts: [
    { top: 0,   height: 70,  client: "Dana T.",  service: "Mandala",   color: "#059669", time: "10am–12pm" },
    { top: 105, height: 105, client: "Riley M.", service: "Back piece", color: "#7C3AED", time: "1–4pm" },
  ]},
];

const AFTERCARE_MSGS = [
  { day: "Jun 22 · 4:05 PM", text: "Hey Maya! Session complete 🎨 Day 1 tips: keep covered 2 hrs, wash with unscented soap, apply thin aquaphor layer." },
  { day: "Jun 25 · 10:00 AM", text: "Day 3 check-in! Peeling is totally normal — keep moisturizing and stay out of direct sun. Looking amazing! 🌿" },
  { day: "Jun 29 · 10:00 AM", text: "One week down! Your ink has settled beautifully. Ready to book your next session? → Book now" },
];

const REVENUE_BARS = [
  { month: "Jan", val: "$5.2k", pct: 42 },
  { month: "Feb", val: "$6.1k", pct: 49 },
  { month: "Mar", val: "$7.8k", pct: 63 },
  { month: "Apr", val: "$9.2k", pct: 74 },
  { month: "May", val: "$10.5k", pct: 84 },
  { month: "Jun", val: "$12.4k", pct: 100 },
];

export default function HomePage() {
  const [mobileOpen,    setMobileOpen]    = useState(false);
  const [revenue,       setRevenue]       = useState(0);
  const [bookings,      setBookings]      = useState(0);
  const [deposits,      setDeposits]      = useState(0);
  const [quoteSession1, setQuoteSession1] = useState(0);
  const [quoteSession2, setQuoteSession2] = useState(0);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [quoteSession3, setQuoteSession3] = useState(0);
  const [quoteTotal,    setQuoteTotal]    = useState(0);
  const [quoteDeposit,  setQuoteDeposit]  = useState(0);
  const [visibleMessages, setVisibleMessages] = useState(0);
  const [scrollY, setScrollY] = useState(0);
  const [aiActivityIdx, setAiActivityIdx] = useState(0);
  const [aiActivityOpacity, setAiActivityOpacity] = useState(1);
  const [bookingsFlash, setBookingsFlash] = useState(false);
  const [twIdx, setTwIdx] = useState(-1);
  const [twChar, setTwChar] = useState(0);
  const [showTypingIndicator, setShowTypingIndicator] = useState(false);

  const [heroVisible, setHeroVisible] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  /* ── Refs ── */
  const chatCardRef       = useRef<HTMLDivElement>(null);
  const pipelineRef       = useRef<HTMLDivElement>(null);
  const quoteCardRef      = useRef<HTMLDivElement>(null);
  const heroDashRef       = useRef<HTMLDivElement>(null);
  const quoteTiltRef      = useRef<HTMLDivElement>(null);
  const aiChatTiltRef     = useRef<HTMLDivElement>(null);
  const whiteLabelTiltRef = useRef<HTMLDivElement>(null);
  const revenueStatRef    = useRef<HTMLParagraphElement>(null);
  const bookingsStatRef   = useRef<HTMLParagraphElement>(null);
  const depositsStatRef   = useRef<HTMLParagraphElement>(null);
  const crmTimelineRef    = useRef<HTMLDivElement>(null);
  const journeyRef        = useRef<HTMLDivElement>(null);
  const journeyLineRef    = useRef<HTMLDivElement>(null);
  const journeyResultRef  = useRef<HTMLDivElement>(null);

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

  /* ── Hero entrance ── */
  useEffect(() => {
    const t = setTimeout(() => setHeroVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  /* ── Scroll-triggered reveals ── */
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>(
      "[data-animate], .reveal, .reveal-up, .reveal-scale, .scale-reveal, .word-reveal, .slide-left"
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
          if (entry.isIntersecting) { entry.target.classList.add("in-view"); io.unobserve(entry.target); }
        });
      },
      { threshold: 0.15 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  /* ── CRM timeline stagger ── */
  useEffect(() => {
    const container = crmTimelineRef.current;
    if (!container) return;
    let triggered = false;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !triggered) {
        triggered = true;
        Array.from(container.querySelectorAll<HTMLElement>(".timeline-item"))
          .forEach((item, i) => setTimeout(() => item.classList.add("revealed"), i * 150));
        io.disconnect();
      }
    }, { threshold: 0.2 });
    io.observe(container);
    return () => io.disconnect();
  }, []);

  /* ── Journey signature section: line draw + stage stagger + result reveal ── */
  useEffect(() => {
    const container = journeyRef.current;
    if (!container) return;
    let triggered = false;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !triggered) {
        triggered = true;
        // Draw the gold connecting line
        const line = journeyLineRef.current;
        if (line) setTimeout(() => line.classList.add("drawn"), 100);
        // Stagger stage reveals (offset to sync with line start)
        Array.from(container.querySelectorAll<HTMLElement>(".journey-stage"))
          .forEach((item, i) => setTimeout(() => item.classList.add("revealed"), 200 + i * 100));
        // Reveal the 12-minute result after line finishes drawing
        const result = journeyResultRef.current;
        if (result) setTimeout(() => result.classList.add("revealed"), 2700);
        io.disconnect();
      }
    }, { threshold: 0.1 });
    io.observe(container);
    return () => io.disconnect();
  }, []);

  /* ── AI chat loop ── */
  useEffect(() => {
    const card = chatCardRef.current;
    if (!card) return;
    let loopTimer: ReturnType<typeof setTimeout>;
    const runSequence = () => {
      setVisibleMessages(0);
      [1,2,3,4,5,6,7,8,9].forEach((n, i) => {
        setTimeout(() => setVisibleMessages(n), i * 700 + 200);
      });
      loopTimer = setTimeout(runSequence, 9 * 700 + 2400);
    };
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { runSequence(); io.disconnect(); }
    }, { threshold: 0.2 });
    io.observe(card);
    return () => { io.disconnect(); clearTimeout(loopTimer); };
  }, []);

  /* ── Pipeline cards drop-in ── */
  useEffect(() => {
    const container = pipelineRef.current;
    if (!container) return;
    const cols = Array.from(container.querySelectorAll<HTMLElement>(".pipeline-col"));
    let triggered = false;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !triggered) {
        triggered = true;
        cols.forEach((col, colIdx) => {
          Array.from(col.querySelectorAll<HTMLElement>(".pipeline-item")).forEach((card, cardIdx) => {
            setTimeout(() => card.classList.replace("pipeline-card-hidden", "pipeline-card-visible"), colIdx * 120 + cardIdx * 80);
          });
        });
        io.disconnect();
      }
    }, { threshold: 0.05 });
    io.observe(container);
    return () => io.disconnect();
  }, []);

  /* ── Quote count-up ── */
  useEffect(() => {
    const card = quoteCardRef.current;
    if (!card) return;
    let triggered = false;
    const countUp = (setter: React.Dispatch<React.SetStateAction<number>>, target: number, duration: number, delayMs: number) => {
      setTimeout(() => {
        const start = performance.now();
        const tick = (now: number) => {
          const p = Math.min((now - start) / duration, 1);
          setter(Math.round((1 - Math.pow(1 - p, 3)) * target));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }, delayMs);
    };
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !triggered) {
        triggered = true;
        countUp(setQuoteSession1, 500, 800, 0);
        countUp(setQuoteSession2, 400, 700, 150);
        countUp(setQuoteSession3, 300, 600, 300);
        countUp(setQuoteTotal,    1200, 1000, 0);
        countUp(setQuoteDeposit,  240, 500, 0);
        io.disconnect();
      }
    }, { threshold: 0.3 });
    io.observe(card);
    return () => io.disconnect();
  }, []);

  /* ── Scroll parallax ── */
  useEffect(() => {
    let rafId: number;
    const onScroll = () => { rafId = requestAnimationFrame(() => setScrollY(window.scrollY)); };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); cancelAnimationFrame(rafId); };
  }, []);

  /* ── AI Activity rotation ── */
  useEffect(() => {
    const iv = setInterval(() => {
      setAiActivityOpacity(0);
      setTimeout(() => { setAiActivityIdx((i) => (i + 1) % AI_ACTIVITY.length); setAiActivityOpacity(1); }, 300);
    }, 3000);
    return () => clearInterval(iv);
  }, []);

  /* ── Live bookings flash ── */
  useEffect(() => {
    const iv = setInterval(() => {
      setBookingsFlash(true);
      setTimeout(() => setBookingsFlash(false), 700);
    }, 8000);
    return () => clearInterval(iv);
  }, []);

  /* ── Typewriter: trigger on each new visible AI message ── */
  useEffect(() => {
    if (visibleMessages <= 0) { setTwIdx(-1); setTwChar(0); setShowTypingIndicator(false); return; }
    const msgIdx = visibleMessages - 1;
    if (!AI_MSGS[msgIdx]) return;
    if (AI_MSGS[msgIdx].ai) {
      setShowTypingIndicator(true);
      const t = setTimeout(() => { setShowTypingIndicator(false); setTwIdx(msgIdx); setTwChar(0); }, 400);
      return () => clearTimeout(t);
    } else {
      setShowTypingIndicator(false);
    }
  }, [visibleMessages]);

  /* ── Typewriter: advance characters ── */
  useEffect(() => {
    if (twIdx < 0) return;
    const target = AI_MSGS[twIdx].text.length;
    if (twChar >= target) return;
    const t = setTimeout(() => setTwChar((c) => c + 1), 28);
    return () => clearTimeout(t);
  }, [twIdx, twChar]);

  /* ── Tilt ── */
  const handleTilt = useCallback((ref: React.RefObject<HTMLDivElement>) => ({
    onMouseMove: (e: React.MouseEvent<HTMLDivElement>) => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const rx = -((e.clientY - rect.top  - rect.height / 2) / rect.height) * 6;
      const ry =  ((e.clientX - rect.left - rect.width  / 2) / rect.width)  * 6;
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

  /* ── Pain magnetic hover ── */
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

  /* ── Pricing spotlight ── */
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

  const heroStats: { label: string; value: string; ref: React.RefObject<HTMLParagraphElement> | null; flash?: boolean }[] = [
    { label: "Revenue",  value: `$${revenue.toLocaleString()}`,                      ref: revenueStatRef  },
    { label: "Bookings", value: String(bookingsFlash ? bookings + 1 : bookings),     ref: bookingsStatRef, flash: bookingsFlash },
    { label: "Deposits", value: `${deposits}%`,                                      ref: depositsStatRef },
    { label: "Leads",    value: "12",                                                ref: null            },
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
                className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">{link}</a>
            ))}
          </nav>
          <div className="hidden md:flex items-center gap-3">
            <a href="#book-demo" className="border border-gray-300 rounded-full px-5 py-2 text-sm font-medium text-[#111111] hover:border-gray-400 transition-colors">Book Demo</a>
            <a href="/register" className="bg-black text-white rounded-full px-5 py-2 text-sm font-medium hover:bg-[#2A2A2A] transition-colors">Start Free Trial</a>
          </div>
          <button className="md:hidden p-1.5 rounded-md text-[#111111]" onClick={() => setMobileOpen((o) => !o)} aria-label="Toggle menu">
            {mobileOpen ? <IconClose /> : <IconMenu />}
          </button>
        </div>
        {mobileOpen && (
          <div className="md:hidden px-6 pt-2 pb-6 flex flex-col gap-1 border-t border-[#F3F4F6]">
            {(["Features", "Book Demo"] as const).map((link) => (
              <a key={link} href={`#${link.toLowerCase().replace(" ", "-")}`}
                className="py-2.5 text-sm font-medium text-gray-500" onClick={() => setMobileOpen(false)}>{link}</a>
            ))}
            <div className="flex flex-col gap-2 pt-3">
              <a href="#book-demo" className="py-2.5 text-sm font-medium rounded-full border border-gray-300 text-center text-[#111111]">Book Demo</a>
              <a href="/register" className="py-2.5 text-sm font-medium rounded-full bg-black text-white text-center">Start Free Trial</a>
            </div>
          </div>
        )}
      </header>

      {/* ══ HERO ══ */}
      <section className="hero-bg py-10 lg:py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-[30%_70%] gap-8 items-start">

            {/* Left — copy */}
            <div>
              <span className="hero-item text-xs font-semibold tracking-widest uppercase text-[#D4A853]"
                style={heroItemStyle(0, "translateY(-10px)")}>
                Tattoo Business Operating System
              </span>
              <h1 className="font-bold leading-[1.1] mt-4 text-[#111111]">
                <span className="hero-item block text-4xl sm:text-5xl lg:text-6xl xl:text-7xl" style={heroItemStyle(150, "translateY(20px)")}>
                  Stop chasing inquiries.
                </span>
                <span className="hero-item block text-3xl sm:text-4xl lg:text-5xl xl:text-6xl" style={heroItemStyle(300, "translateY(20px)")}>
                  Start tattooing.
                </span>
              </h1>
              <p className="hero-item text-lg text-gray-500 mt-6 max-w-md" style={heroItemStyle(450)}>
                AI handles consultations, follow-ups, quotes, deposits, bookings, and aftercare — so you can focus on tattooing.
              </p>
              <div className="hero-item mt-10" style={heroItemStyle(600, "translateY(10px)")}>
                <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center" }}>
                  <div className="flex flex-wrap gap-4">
                    <a href="/register" className="bg-black text-white rounded-full px-8 py-4 text-base font-medium hover:bg-[#2A2A2A] transition-colors">Start Free Trial</a>
                    <a href="#book-demo" className="border border-gray-300 rounded-full px-8 py-4 text-base text-[#111111] hover:border-gray-400 transition-colors">Book Demo</a>
                  </div>
                  <p className="mt-4 text-sm text-gray-400">14-day free trial · No credit card required</p>
                </div>
              </div>
            {/* Mobile hero — compact dashboard preview */}
            <div className="lg:hidden mt-8 rounded-2xl overflow-hidden" style={{ background: "#111111", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="flex items-center gap-2 px-4 py-2.5" style={{ background: "#141414", borderBottom: "1px solid #1A1A1A" }}>
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse-dot flex-shrink-0" />
                <span className="text-xs text-gray-400 font-medium">InkBook — Studio OS · Live</span>
              </div>
              <div className="grid grid-cols-2 gap-px" style={{ background: "#1A1A1A" }}>
                {heroStats.map((s) => (
                  <div key={s.label} className="px-4 py-4" style={{ background: "#111111" }}>
                    <p className="text-[10px] text-gray-600 uppercase tracking-wider">{s.label}</p>
                    <p className={`text-2xl font-bold text-white mt-0.5${s.flash ? " stat-flash" : ""}`}>{s.value}</p>
                  </div>
                ))}
              </div>
              <div className="px-4 py-2.5" style={{ background: "#141414", borderTop: "1px solid #1A1A1A" }}>
                <p className="text-[10px] text-[#D4A853] font-medium truncate" style={{ opacity: aiActivityOpacity, transition: "opacity 0.3s ease" }}>{AI_ACTIVITY[aiActivityIdx]}</p>
              </div>
            </div>
            </div>

            {/* Right — Multi-surface layered composition — desktop only */}
            <div className="hero-item hidden lg:block" style={heroItemStyle(200, "translateX(30px) scale(0.97)")}>
              <div className="relative" style={{ minHeight: "640px" }}>

                {/* Layer 5 — Primary gold glow */}
                <div className="absolute pointer-events-none glow-pulse" style={{
                  inset: "-40px", zIndex: 0,
                  background: "radial-gradient(ellipse at 60% 38%, rgba(212,168,83,0.14) 0%, transparent 58%)",
                }} />
                {/* Secondary gold ring, upper-right */}
                <div className="absolute pointer-events-none" style={{
                  top: "-80px", right: "-80px", bottom: "0", left: "10%", zIndex: 0,
                  background: "radial-gradient(ellipse at 80% 20%, rgba(212,168,83,0.06) 0%, transparent 48%)",
                }} />
                {/* Dark depth — grounds the dashboard */}
                <div className="absolute pointer-events-none" style={{
                  inset: "-80px", zIndex: 0,
                  background: "radial-gradient(ellipse at 55% 55%, rgba(0,0,0,0.28) 0%, transparent 52%)",
                }} />

                {/* Layer 1 — Main dashboard */}
                <div className="relative" style={{ zIndex: 1, transform: `translateY(${Math.max(-30, -(scrollY * 0.1))}px)`, willChange: "transform" }}>
                  <div ref={heroDashRef} className="tilt-card surface-premium-dark rounded-2xl overflow-hidden flex flex-col w-full"
                    style={{ background: "#080808", border: "1px solid rgba(255,255,255,0.07)", minHeight: "800px", zoom: 0.78 }}
                    onMouseMove={heroTilt.onMouseMove} onMouseLeave={heroTilt.onMouseLeave}>

                    {/* Title bar */}
                    <div className="flex-shrink-0 flex items-center gap-2 px-4 py-3" style={{ background: "#141414", borderBottom: "1px solid #1A1A1A" }}>
                      <span className="w-3 h-3 rounded-full bg-red-400/80" />
                      <span className="w-3 h-3 rounded-full bg-yellow-400/80" />
                      <span className="w-3 h-3 rounded-full bg-green-400/80" />
                      <span className="flex-1 text-center text-xs text-gray-600 font-medium tracking-wide">InkBook — Studio OS</span>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse-dot" />
                        <span className="text-[10px] text-gray-500">Live</span>
                      </div>
                    </div>

                    <div className="flex flex-1 overflow-hidden">

                      {/* Sidebar */}
                      <div className="flex-shrink-0 w-44 bg-[#0E0E0E] p-3" style={{ borderRight: "1px solid #1A1A1A" }}>
                        <p className="text-xs font-bold text-white mb-5 px-2 tracking-wide">InkBook</p>
                        <nav className="space-y-0.5">
                          {OS_SIDEBAR.map((item) => (
                            <div key={item.label} className={`flex items-center justify-between px-2.5 py-2 rounded-lg text-xs cursor-default ${
                              item.active ? "bg-[#D4A853] text-black font-semibold" : "text-gray-500"
                            }`}>
                              <div className="flex items-center gap-2">
                                {item.icon}
                                {item.label}
                              </div>
                              {item.badge && (
                                <span className={`text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold ${
                                  item.active ? "bg-black/20 text-black" : "bg-[#D4A853] text-black"
                                }`}>{item.badge}</span>
                              )}
                            </div>
                          ))}
                        </nav>
                      </div>

                      {/* Main */}
                      <div className="flex-1 p-4 bg-[#0A0A0A] overflow-auto">

                        {/* 4 stats */}
                        <div className="grid grid-cols-4 gap-2 mb-4">
                          {heroStats.map((s) => (
                            <div key={s.label} className="rounded-xl p-3" style={{ background: "#141414", border: "1px solid #1E1E1E" }}>
                              <p className="text-[10px] text-gray-600 uppercase tracking-wide">{s.label}</p>
                              <p ref={s.ref ?? undefined} className={`text-lg font-bold text-white mt-0.5${s.flash ? " stat-flash" : ""}`}>{s.value}</p>
                            </div>
                          ))}
                        </div>

                        {/* Pipeline + Today two-col */}
                        <div className="grid grid-cols-[55%_45%] gap-3">

                          {/* Mini pipeline */}
                          <div className="rounded-xl p-3" style={{ background: "#111111", border: "1px solid #1A1A1A" }}>
                            <div className="flex items-center justify-between mb-2.5">
                              <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Pipeline</span>
                              <span className="text-[10px] text-[#D4A853]">12 active</span>
                            </div>
                            <div className="grid grid-cols-3 gap-1.5">
                              {OS_MINI_PIPELINE.map((col) => (
                                <div key={col.col}>
                                  <div className="flex items-center gap-1 mb-1.5">
                                    <span className={`text-[10px] font-semibold ${col.ai ? "text-[#D4A853]" : "text-gray-500"}`}>{col.col}</span>
                                    {col.ai && <span className="w-1 h-1 rounded-full bg-[#D4A853] animate-pulse-dot" />}
                                    <span className="text-[10px] text-gray-700 ml-auto">{col.count}</span>
                                  </div>
                                  <div className="space-y-1">
                                    {col.cards.map((card) => (
                                      <div key={card.name} className="rounded-md p-1.5"
                                        style={{ background: col.ai ? "rgba(212,168,83,0.06)" : "#1A1A1A", border: col.ai ? "1px solid rgba(212,168,83,0.15)" : "1px solid #222" }}>
                                        <p className="text-[10px] font-semibold text-white truncate">{card.name}</p>
                                        <p className="text-[9px] text-gray-600 truncate">{card.tag}</p>
                                        <p className={`text-[9px] mt-0.5 ${col.ai ? "text-[#D4A853]" : "text-gray-600"}`}>{card.sub}</p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Today + AI */}
                          <div className="flex flex-col gap-2">
                            <div className="rounded-xl p-3" style={{ background: "#111111", border: "1px solid #1A1A1A" }}>
                              <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-2">Today · Jun 20</p>
                              <div className="space-y-2">
                                {OS_TODAY.map((appt) => (
                                  <div key={appt.client} className="flex items-start gap-2">
                                    <span className="w-2 h-2 rounded-full flex-shrink-0 mt-1" style={{ background: appt.color }} />
                                    <div>
                                      <p className="text-[10px] font-semibold text-white">{appt.client}</p>
                                      <p className="text-[9px] text-gray-600">{appt.time} · {appt.service}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div className="rounded-xl p-3" style={{ background: "#111111", border: "1px solid #1A1A1A" }}>
                              <div className="flex items-center gap-1.5 mb-2">
                                <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">AI Activity</p>
                                <span className="text-[10px] text-[#D4A853]">🤖</span>
                                <span className="w-1.5 h-1.5 rounded-full bg-green-400 blink ml-auto flex-shrink-0" />
                              </div>
                              <div className="space-y-1.5" style={{ opacity: aiActivityOpacity, transition: "opacity 0.3s ease" }}>
                                {AI_ACTIVITY.map((item, idx) => (
                                  <div key={item} className="flex items-start gap-1.5" style={{ opacity: idx === aiActivityIdx ? 1 : 0.4, transition: "opacity 0.3s ease" }}>
                                    <span className="w-1 h-1 rounded-full bg-[#D4A853] mt-1 flex-shrink-0" />
                                    <p className="text-[9px] text-gray-500 leading-relaxed">{item}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>

                        </div>
                      </div>
                    </div>

                    <div className="absolute bottom-4 left-[188px] flex items-center gap-2 rounded-full px-3 py-1.5 glass-dark">
                      <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse-dot" />
                      <span className="text-xs text-white">3 new inquiries today</span>
                    </div>
                  </div>
                </div>

                {/* Card A — New Inquiry (top-left, outside dashboard) */}
                <div className="hero-item absolute" style={{
                  top: "-20px", left: "-40px", zIndex: 20, width: "224px",
                  ...heroItemStyle(600, "translateX(-10px)"),
                }}>
                  {/* Badge lives on the outer wrapper — never clipped */}
                  <div className="absolute w-7 h-7 rounded-full bg-[#D4A853] flex items-center justify-center text-xs font-bold text-black" style={{ top: "4px", left: "4px", zIndex: 10, boxShadow: "0 0 0 2.5px #fff, 0 4px 14px rgba(0,0,0,0.4)" }}>1</div>
                  <div className="relative float-up glass-light rounded-2xl p-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#ECFDF5] flex items-center justify-center text-green-600 text-sm flex-shrink-0">✉</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] text-gray-400 uppercase tracking-wide font-semibold">New Inquiry</p>
                      <p className="text-xs font-semibold text-[#111111] truncate">Maya L. — Floral sleeve</p>
                      <p className="text-[9px] text-gray-400">Just now</p>
                    </div>
                    <span className="w-2 h-2 rounded-full bg-green-400 blink flex-shrink-0" />
                  </div>
                </div>

                {/* Card B — AI Consultation (top-right) */}
                <div className="hero-item absolute" style={{
                  top: "-16px", right: "-32px", zIndex: 20, width: "260px",
                  ...heroItemStyle(800, "translateY(-10px)"),
                }}>
                  {/* Badge lives on the outer wrapper — never clipped by overflow-hidden on card */}
                  <div className="absolute w-7 h-7 rounded-full bg-[#D4A853] flex items-center justify-center text-xs font-bold text-black" style={{ top: "4px", left: "4px", zIndex: 10, boxShadow: "0 0 0 2.5px #fff, 0 4px 14px rgba(0,0,0,0.4)" }}>2</div>
                  <div className="relative float-up glass-light rounded-2xl p-4 overflow-hidden" style={{ animationDelay: "0.8s" }}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold text-[#111111]">AI Consultation</span>
                      <span className="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded-full font-medium">Live</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-end">
                        <div className="bg-[#111111] text-white text-[10px] rounded-xl rounded-tr-none px-3 py-2 max-w-[160px] leading-relaxed">
                          I want a full black &amp; grey floral sleeve
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-5 h-5 bg-[#D4A853] rounded-full flex items-center justify-center text-[8px] text-black font-bold flex-shrink-0 mt-0.5">AI</div>
                        <div className="bg-[#F8F8F6] text-[10px] text-[#111111] rounded-xl rounded-tl-none px-3 py-2 max-w-[160px] leading-relaxed">
                          Style detected: Floral · Black &amp; Grey. Matching artist now...
                        </div>
                      </div>
                    </div>
                    <div className="bg-[#FFFDF5] border-t border-[#E5E5E3] -mx-4 -mb-4 mt-3 px-3 py-2 text-[9px] text-[#D4A853] font-medium">
                      ✓ Style detected · ✓ Artist matched (98%)
                    </div>
                  </div>
                </div>

                {/* Card C — Quote Generated (right side, 22% from top) */}
                <div className="hero-item absolute" style={{
                  top: "22%", right: "-44px", zIndex: 20, width: "192px",
                  ...heroItemStyle(1000, "translateX(10px)"),
                }}>
                  <div className="absolute w-7 h-7 rounded-full bg-[#D4A853] flex items-center justify-center text-xs font-bold text-black" style={{ top: "4px", left: "4px", zIndex: 10, boxShadow: "0 0 0 2.5px #fff, 0 4px 14px rgba(0,0,0,0.4)" }}>3</div>
                  <div className="relative float-badge glass-light rounded-2xl p-3.5" style={{ animationDelay: "0.6s" }}>
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="text-[9px] bg-[#D4A853] text-black px-2 py-0.5 rounded-full font-bold">AI Draft</span>
                      <span className="text-[9px] text-gray-400 ml-auto">3 min</span>
                    </div>
                    <p className="text-base font-bold text-[#111111]">$1,200</p>
                    <p className="text-[9px] text-gray-400">Full sleeve · 3 sessions</p>
                    <div className="mt-2 pt-2 border-t border-[#F0F0EE] flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#D4A853]" />
                      <span className="text-[9px] text-gray-500">Quote ready to send</span>
                    </div>
                  </div>
                </div>

                {/* Card D — Deposit Paid (right side, 50% from top) */}
                <div className="absolute" style={{
                  top: "50%", right: "-44px", zIndex: 20,
                  opacity: heroVisible ? 1 : 0,
                  transition: "opacity 0.5s ease-out 1200ms",
                }}>
                  <div className="absolute w-7 h-7 rounded-full bg-[#D4A853] flex items-center justify-center text-xs font-bold text-black" style={{ top: "4px", left: "4px", zIndex: 10, boxShadow: "0 0 0 2.5px #fff, 0 4px 14px rgba(0,0,0,0.4)" }}>4</div>
                  <div className="relative float-up glass-light rounded-full px-4 py-2.5 flex items-center gap-2.5" style={{ animationDelay: "1s" }}>
                    <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-[9px] font-bold">✓</span>
                    </div>
                    <span className="text-[10px] font-semibold text-[#111111] whitespace-nowrap">$240 deposit paid</span>
                  </div>
                </div>

                {/* Card E — Booking Confirmed (bottom-right) */}
                <div className="hero-item absolute" style={{
                  bottom: "-16px", right: "-32px", zIndex: 20, width: "224px",
                  ...heroItemStyle(1400, "translateY(10px)"),
                }}>
                  <div className="absolute w-7 h-7 rounded-full bg-[#D4A853] flex items-center justify-center text-xs font-bold text-black" style={{ top: "4px", left: "4px", zIndex: 10, boxShadow: "0 0 0 2.5px #fff, 0 4px 14px rgba(0,0,0,0.4)" }}>5</div>
                  <div className="relative float-down glass-light rounded-2xl p-3.5" style={{ animationDelay: "0.4s" }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-[9px] font-bold">✓</span>
                      </div>
                      <span className="text-xs font-semibold text-[#111111]">Booking Confirmed</span>
                    </div>
                    <div className="flex items-center gap-2 bg-[#F8F8F6] rounded-lg px-2.5 py-2">
                      <div className="w-6 h-6 rounded-full bg-[#D4A853] flex items-center justify-center text-[9px] font-bold text-black flex-shrink-0">AR</div>
                      <div>
                        <p className="text-[9px] font-semibold text-[#111111]">Jun 22 · 2:00 PM</p>
                        <p className="text-[9px] text-gray-400">Alex R. · Ink &amp; Iron Studio</p>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ══ CATEGORY STATEMENT ══ */}
      <section className="py-5 px-6" style={{ background: "#FFFFFF" }}>
        <div className="max-w-5xl mx-auto">
          <p className="text-xs uppercase tracking-widest text-[#D4A853] font-semibold text-center">Why InkBook Exists</p>
          <div className="mt-3 text-center">
            <p className="text-3xl lg:text-4xl font-light text-gray-400">Other tools manage appointments.</p>
            <p className="text-3xl lg:text-4xl font-bold text-[#111111] mt-1">InkBook manages the entire client journey.</p>
          </div>
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl mx-auto">
            <div className="bg-[#F8F8F6] rounded-2xl p-5 border border-[#E5E5E3]">
              <p className="text-sm font-semibold text-gray-400 mb-4">Other Booking Tools</p>
              <div className="space-y-2">
                {[
                  "Calendar management",
                  "Appointment tracking",
                  "Basic reminders",
                  "Manual quote creation",
                  "Manual follow-up",
                  "No deposit automation",
                  "No consent workflow",
                  "No aftercare automation",
                  "No review collection",
                  "No client CRM",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-red-100 text-red-400 flex items-center justify-center text-xs flex-shrink-0">✗</div>
                    <span className="text-sm text-gray-400">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <CapabilityActivationCard />
          </div>
        </div>
      </section>

      {/* ══ PAIN ══ */}
      <section id="features" className="relative py-8 px-6 overflow-hidden" style={{ background: "#111111" }}>
        <div className="ambient-top" />
        <div className="max-w-6xl mx-auto relative" style={{ zIndex: 1 }}>
          <div className="text-center">
            <span className="text-xs uppercase tracking-widest text-[#D4A853] font-semibold">The Problem</span>
            <h2 className="text-3xl lg:text-4xl font-bold text-white mt-4">
              Most bookings aren&apos;t lost to competitors.
            </h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6 max-w-4xl mx-auto">
            {PAIN_CARDS.map((card, i) => (
              <div key={i}
                className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#2A2A2A] hover:border-[#3A3A3A] transition-all duration-200"
                data-animate="fade-up" data-delay={String(i * 100)}
                onMouseMove={handlePainMove} onMouseLeave={handlePainLeave}>
                <div className="text-[#D4A853] mb-3">{card.icon}</div>
                <h3 className="text-base font-semibold text-white">{card.title}</h3>
                <p className="text-sm text-gray-400 mt-1.5">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ JOURNEY — SIGNATURE MOMENT ══ */}
      <section className="relative py-16 px-6 overflow-hidden" style={{ background: "#0A0A0A" }}>
        {/* Ambient top glow */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: "radial-gradient(ellipse at 50% 0%, rgba(212,168,83,0.1) 0%, transparent 50%)"
        }} />
        {/* Mid ambient glow — surrounds the 0:12 moment */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: "radial-gradient(ellipse at 50% 58%, rgba(212,168,83,0.05) 0%, transparent 40%)"
        }} />

        <div className="max-w-6xl mx-auto relative" ref={journeyRef}>

          {/* Header */}
          <div className="text-center mb-10">
            <span className="text-xs uppercase tracking-widest text-[#D4A853] font-semibold">The Complete Journey</span>
            <div className="mt-4">
              <span className="block text-5xl lg:text-7xl font-bold text-white leading-[1.05]">Inquiry to booked.</span>
              <span className="block text-5xl lg:text-7xl font-bold text-gradient-gold leading-[1.05]">12 minutes.</span>
            </div>
            <p className="text-lg text-gray-600 mt-3">AI handled every single step.</p>
          </div>

          {/* ── BOOKING LOOP: stages 01–05 ── */}
          <div className="relative mb-10">
            {/* Desktop: horizontal track */}
            <div className="hidden lg:block absolute" style={{ top: "31px", left: "10%", right: "10%", height: "2px", background: "#1A1A1A" }} />
            <div className="hidden lg:block absolute" style={{ top: "31px", left: "10%", right: "10%", height: "2px", overflow: "hidden" }}>
              <div ref={journeyLineRef} className="journey-line" />
            </div>
            {/* Mobile: vertical line */}
            <div className="lg:hidden absolute" style={{ top: "28px", left: "27px", bottom: "12px", width: "2px", background: "#1A1A1A" }} />

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-0 lg:gap-2">
              {JOURNEY_STAGES.slice(0, 5).map((stage, i) => (
                <div key={i} className="journey-stage flex lg:flex-col items-start lg:items-center text-left lg:text-center gap-4 lg:gap-0 px-0 lg:px-1 py-3 lg:py-0">
                  <div className={`relative z-10 flex-shrink-0 w-14 h-14 lg:w-20 lg:h-20 rounded-full flex items-center justify-center font-bold lg:mb-4 ${
                    stage.ai
                      ? "bg-[#D4A853] text-black text-sm journey-node-ai"
                      : "text-white text-xs"
                  }`} style={stage.ai ? {} : { background: "#1A1A1A", border: "1px solid rgba(255,255,255,0.08)" }}>
                    {stage.ai ? "AI" : stage.done ? "✓" : stage.num}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-white leading-tight mb-1">{stage.label}</p>
                    {stage.ai && (
                      <span className="text-[8px] bg-[#D4A853]/12 text-[#D4A853] px-1.5 py-0.5 rounded font-bold mb-1 inline-block">Automated</span>
                    )}
                    <p className="text-[10px] font-mono text-[#D4A853] font-medium">{stage.time}</p>
                    <p className="text-[10px] text-gray-600 mt-1 leading-relaxed">{stage.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── 12-MINUTE MOMENT ── */}
          <div ref={journeyResultRef} className="journey-result text-center py-8 mb-10"
            style={{ borderTop: "1px solid #1A1A1A", borderBottom: "1px solid #1A1A1A" }}>
            <p className="text-[10px] uppercase tracking-[0.2em] text-gray-700 mb-5">Booking confirmed · Deposit collected</p>
            <p className="text-6xl sm:text-8xl lg:text-[128px] font-bold font-mono leading-none text-gradient-gold">0:12</p>
            <p className="text-xl lg:text-2xl text-white font-semibold mt-6">
              From first message to fully booked appointment.
            </p>
            <div className="mt-5 flex justify-center items-center gap-3 text-sm text-gray-700">
              <span>0 emails written</span>
              <span className="text-gray-800">·</span>
              <span>0 follow-ups missed</span>
              <span className="text-gray-800">·</span>
              <span>0 deposits forgotten</span>
            </div>
          </div>

          {/* ── DIVIDER ── */}
          <div className="flex items-center gap-6 mb-10">
            <div className="flex-1 h-px bg-[#1A1A1A]" />
            <span className="text-[10px] text-gray-700 uppercase tracking-[0.2em] whitespace-nowrap">Then automatically, for weeks</span>
            <div className="flex-1 h-px bg-[#1A1A1A]" />
          </div>

          {/* ── FOLLOW-THROUGH: stages 06–10 ── */}
          <div className="relative">
            <div className="hidden lg:block absolute" style={{ top: "23px", left: "10%", right: "10%", height: "1px", background: "#1A1A1A" }} />
            {/* Mobile: vertical line */}
            <div className="lg:hidden absolute" style={{ top: "20px", left: "19px", bottom: "8px", width: "1px", background: "#1A1A1A" }} />
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-0 lg:gap-2">
              {JOURNEY_STAGES.slice(5).map((stage, i) => (
                <div key={i} className="journey-stage flex lg:flex-col items-start lg:items-center text-left lg:text-center gap-3 lg:gap-0 py-2.5 lg:py-0">
                  <div className={`relative z-10 flex-shrink-0 w-10 h-10 lg:w-12 lg:h-12 rounded-full flex items-center justify-center text-xs font-bold lg:mb-3 ${
                    stage.ai
                      ? "bg-[#D4A853]/10 text-[#D4A853] border border-[#D4A853]/25"
                      : "bg-[#141414] border border-[#222] text-gray-700"
                  }`}>
                    {stage.ai ? "AI" : "✓"}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-gray-500 leading-tight">{stage.label}</p>
                    {stage.ai && <span className="text-[8px] text-[#D4A853]/60 mt-0.5 block">Auto</span>}
                    <p className="text-[10px] font-mono text-gray-700 mt-1">{stage.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* ══ AI CONSULTATION (expanded) ══ */}
      <section className="relative py-10 px-6 overflow-hidden" style={{ background: "#F8F8F6" }}>
        <div className="absolute inset-0 pointer-events-none" style={{
          background: "radial-gradient(ellipse at 50% 0%, rgba(212,168,83,0.07) 0%, transparent 60%)"
        }} />
        <div className="max-w-6xl mx-auto relative" style={{ zIndex: 1 }}>
          <div className="text-center mb-5">
            <span className="text-xs uppercase tracking-widest text-[#D4A853] font-semibold">AI Consultation</span>
            <h2 className="text-3xl lg:text-4xl font-bold text-[#111111] mt-4">
              AI qualifies every client before you ever see them.
            </h2>
          </div>

          <div ref={aiChatTiltRef} onMouseMove={aiChatTilt.onMouseMove} onMouseLeave={aiChatTilt.onMouseLeave}>
            <div ref={chatCardRef} className="tilt-card bg-white rounded-2xl shadow-xl border border-[#E5E5E3] overflow-hidden">

              <div className="bg-[#F8F8F6] px-6 py-4 border-b border-[#E5E5E3] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#D4A853] flex items-center justify-center text-xs font-bold text-black">AI</div>
                  <div>
                    <p className="text-sm font-semibold text-[#111111]">InkBook AI Consultation</p>
                    <p className="text-xs text-gray-400">Ink &amp; Iron Studio</p>
                  </div>
                </div>
                <div className="hidden sm:flex items-center gap-4">
                  <span className="text-xs text-gray-400">Step <span className="text-[#111111] font-semibold">{Math.min(visibleMessages, 9)}</span> / 9</span>
                  <div className="flex gap-0.5">
                    {Array.from({ length: 9 }, (_, i) => (
                      <div key={i} className={`h-1.5 w-5 rounded-full transition-colors duration-300 ${i < visibleMessages ? "bg-[#D4A853]" : "bg-gray-200"}`} />
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid lg:grid-cols-[3fr_2fr]">

                {/* Chat */}
                <div className="p-6 space-y-3 border-r border-[#E5E5E3] min-h-[340px] max-h-[340px] overflow-y-auto">
                  {AI_MSGS.map((msg, i) => (
                    <div key={i} className={`flex gap-3 ${msg.ai ? "" : "justify-end"} ${visibleMessages > i ? "msg-visible" : "msg-hidden"}`}>
                      {msg.ai && (
                        <div className="w-7 h-7 rounded-full bg-[#D4A853] flex items-center justify-center text-[10px] font-bold text-black flex-shrink-0 mt-0.5">AI</div>
                      )}
                      <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm ${
                        msg.ai
                          ? "bg-[#F8F8F6] text-[#111111] rounded-tl-none"
                          : "bg-[#111111] text-white rounded-tr-none"
                      }`}>
                        {msg.ai && i === twIdx ? AI_MSGS[twIdx].text.slice(0, twChar) : msg.text}
                      </div>
                    </div>
                  ))}
                  {showTypingIndicator && (
                    <div className="flex gap-3 msg-visible">
                      <div className="w-7 h-7 rounded-full bg-[#D4A853] flex items-center justify-center text-[10px] font-bold text-black flex-shrink-0 mt-0.5">AI</div>
                      <div className="bg-[#F8F8F6] rounded-2xl rounded-tl-none px-4 py-3 flex items-center gap-1.5">
                        <span className="typing-dot" />
                        <span className="typing-dot" />
                        <span className="typing-dot" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Analysis panel */}
                <div className="p-6 bg-[#F8F8F6] space-y-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">AI Analysis</p>

                  <div className="bg-white rounded-xl p-4 border border-[#E5E5E3]">
                    <p className="text-xs text-gray-500 mb-2">Style detected</p>
                    <div className="flex flex-wrap gap-1.5">
                      {["Floral / Botanical", "Black & Grey", "Fine line"].map((tag) => (
                        <span key={tag} className="text-xs bg-[#D4A853]/10 text-[#D4A853] px-2 py-0.5 rounded-full font-medium">{tag}</span>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white rounded-xl p-4 border border-[#E5E5E3]">
                    <p className="text-xs text-gray-500 mb-2">Budget qualification</p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-[#111111]">$800 budget</span>
                      <span className="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full font-medium">✓ Qualified</span>
                    </div>
                    <div className="mt-2 h-1.5 bg-gray-100 rounded-full">
                      <div className="h-1.5 bg-green-400 rounded-full" style={{ width: "72%" }} />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">Fits phased full sleeve approach</p>
                  </div>

                  <div className="bg-white rounded-xl p-4 border border-[#E5E5E3]">
                    <p className="text-xs text-gray-500 mb-2">Artist matched</p>
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-[#D4A853] flex items-center justify-center text-xs font-bold text-black">AR</div>
                      <div>
                        <p className="text-sm font-semibold text-[#111111]">Alex R.</p>
                        <p className="text-xs text-gray-500">Floral · Black & Grey · Next: Mon</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#111111] rounded-xl p-4">
                    <p className="text-xs text-[#D4A853] font-semibold mb-1">Ready to quote</p>
                    <p className="text-xs text-gray-400">All 9 questions complete. AI draft generating…</p>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ QUOTE BUILDER ══ */}
      <section className="relative py-10 px-6 overflow-hidden" style={{ background: "#1A1A1A", borderTop: "1px solid #2A2A2A" }}>
        <div className="ambient-top" />
        <div className="max-w-6xl mx-auto relative" style={{ zIndex: 1 }}>
          <div className="text-center mb-5">
            <span className="text-xs uppercase tracking-widest text-[#D4A853] font-semibold">Quote Builder</span>
            <h2 className="slide-left text-3xl lg:text-4xl font-bold text-white mt-4">
              Artist did nothing except approve the quote and show up to tattoo.
            </h2>
          </div>

          <div className="grid lg:grid-cols-3 gap-5">

            {/* Panel 1: Client brief */}
            <div className="bg-[#111111] rounded-2xl overflow-hidden border border-[#2A2A2A]">
              <div className="px-5 py-4 border-b border-[#2A2A2A] flex items-center justify-between">
                <span className="text-sm font-semibold text-white">Client Brief</span>
                <span className="text-xs text-[#D4A853] bg-[#D4A853]/10 px-2 py-0.5 rounded-full">AI Generated</span>
              </div>
              <div className="p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#D4A853] flex items-center justify-center text-sm font-bold text-black">SM</div>
                  <div>
                    <p className="text-sm font-semibold text-white">Sarah M.</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      {[1,2,3,4,5].map(n => <span key={n} className="text-[#D4A853] text-xs">★</span>)}
                      <span className="text-xs text-gray-500 ml-1">VIP · Returning</span>
                    </div>
                  </div>
                </div>
                {[
                  { label: "Style",     value: "Floral / Botanical" },
                  { label: "Color",     value: "Black & Grey" },
                  { label: "Placement", value: "Left arm · Full sleeve" },
                  { label: "Sessions",  value: "2 sessions est." },
                  { label: "Budget",    value: "$800 stated" },
                ].map((row) => (
                  <div key={row.label} className="flex justify-between items-center py-2 border-b border-[#2A2A2A]">
                    <span className="text-xs text-gray-500">{row.label}</span>
                    <span className="text-xs text-white font-medium">{row.value}</span>
                  </div>
                ))}
                <div className="flex gap-2 mt-2">
                  {["Reference photo 1", "Reference photo 2"].map((img) => (
                    <div key={img} className="flex-1 h-16 rounded-lg bg-[#1A1A1A] border border-[#2A2A2A] flex items-center justify-center">
                      <span className="text-[10px] text-gray-600">{img}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Panel 2: Quote */}
            <div ref={quoteTiltRef} className="tilt-card" onMouseMove={quoteTilt.onMouseMove} onMouseLeave={quoteTilt.onMouseLeave}>
              <div ref={quoteCardRef} className="bg-white rounded-2xl overflow-hidden h-full" style={{ boxShadow: "0 0 0 1px rgba(255,255,255,0.06), 0 24px 64px rgba(0,0,0,0.6)" }}>
                <div className="px-5 py-4 bg-[#F8F8F6] border-b border-[#E5E5E3] flex items-center justify-between">
                  <span className="text-base font-semibold text-[#111111]">Quote Builder</span>
                  <span className="bg-[#D4A853] text-black text-xs px-2.5 py-1 rounded-full font-medium">AI Draft Ready</span>
                </div>
                <div className="px-5 py-4 space-y-3 border-b border-[#E5E5E3]">
                  {[
                    { label: "Consultation",             value: "$0"              },
                    { label: "Session 1 — Outline (4hr)", value: `$${quoteSession1}` },
                    { label: "Session 2 — Shading (3hr)", value: `$${quoteSession2}` },
                    { label: "Touch-up (included)",       value: "$0"              },
                  ].map((row) => (
                    <div key={row.label} className="flex justify-between text-sm">
                      <span className="text-gray-600">{row.label}</span>
                      <span className="text-[#111111] font-medium">{row.value}</span>
                    </div>
                  ))}
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
                  <button className="border border-gray-300 rounded-lg px-4 py-2 text-sm text-[#111111]">Edit</button>
                  <button className="flex-1 bg-[#111111] text-white rounded-lg px-4 py-2 text-sm font-medium">Approve &amp; Send</button>
                </div>
                <div className="px-5 py-3">
                  <p className="text-xs text-gray-400">AI generated draft · Artist approval required before sending</p>
                </div>
              </div>
            </div>

            {/* Panel 3: Status flow */}
            <div className="bg-[#111111] rounded-2xl overflow-hidden border border-[#2A2A2A]">
              <div className="px-5 py-4 border-b border-[#2A2A2A]">
                <span className="text-sm font-semibold text-white">Booking Flow</span>
              </div>
              <div className="p-5 space-y-3">
                {[
                  { status: "Quote sent", detail: "Sarah M. received quote link",           done: true,  gold: false },
                  { status: "Client viewed", detail: "Opened 2 minutes later",             done: true,  gold: false },
                  { status: "Quote accepted", detail: "Sarah M. approved $700",            done: true,  gold: false },
                  { status: "Deposit paid", detail: "$150 via Stripe · Card ending 4242",  done: true,  gold: true  },
                  { status: "Booking confirmed", detail: "Jun 22 · 2:00 PM · Alex R.",     done: true,  gold: true  },
                  { status: "SMS confirmation", detail: "Sent to +1 (555) 234-5678",       done: true,  gold: false },
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      step.gold ? "bg-[#D4A853]" : step.done ? "bg-green-500" : "bg-[#2A2A2A]"
                    }`}>
                      {step.done && <span className="text-[10px] text-black font-bold">✓</span>}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{step.status}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{step.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mx-5 mb-5 bg-green-900/30 border border-green-800/40 rounded-xl p-3">
                <p className="text-xs font-semibold text-green-400">That is what InkBook does. Every single booking.</p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ══ PIPELINE ══ */}
      <section className="py-10 px-6" style={{ background: "#FFFFFF" }}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-5">
            <span className="text-xs uppercase tracking-widest text-[#D4A853] font-semibold">Lead Pipeline</span>
            <h2 className="text-3xl lg:text-4xl font-bold text-[#111111] mt-4">
              Every lead. Every stage. Always visible.
            </h2>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-[#E5E5E3] overflow-hidden" data-animate="fade-up">
            <div className="px-6 py-4 border-b border-[#E5E5E3] flex items-center justify-between bg-[#F8F8F6]">
              <span className="text-sm font-semibold text-[#111111]">Lead Pipeline</span>
              <div className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-[#D4A853] animate-pulse-dot" />
                <span className="text-xs text-gray-500">14 active leads</span>
              </div>
            </div>

            {/* Mobile pipeline — stacked stages */}
            <div className="lg:hidden p-4 space-y-3">
              {PIPELINE_COLS.map((col) => (
                <div key={col.title} className="rounded-xl border border-[#E5E5E3] overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2.5 bg-[#F8F8F6]">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs font-bold uppercase tracking-wide ${col.titleClass}`}>{col.title}</span>
                      {col.ai && <span className="w-1.5 h-1.5 rounded-full bg-[#D4A853] animate-pulse-dot" />}
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${col.countClass}`}>{col.cards.length}</span>
                  </div>
                  <div className="px-4 py-3 space-y-2 bg-white">
                    {col.cards.map((card) => (
                      <div key={card.name} className={`rounded-lg p-3 bg-[#F8F8F6] ${card.border}`}>
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-[#111111]">{card.name}</p>
                          <span className="text-xs px-1.5 py-0.5 rounded-md flex-shrink-0"
                            style={{ background: col.ai ? "rgba(212,168,83,0.1)" : "#EFEFED", color: col.ai ? "#D4A853" : "#6B7280" }}>
                            {card.tag}
                          </span>
                        </div>
                        <p className={`text-xs mt-1 ${card.subClass}`}>{card.sub}</p>
                        {card.readyBadge && (
                          <span className="inline-block mt-1.5 text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700">Ready to book</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop pipeline — kanban */}
            <div ref={pipelineRef} className="hidden lg:flex gap-4 p-5 overflow-x-auto">
              {PIPELINE_COLS.map((col) => (
                <div key={col.title} className="pipeline-col w-52 flex-shrink-0">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs font-bold uppercase tracking-wide ${col.titleClass}`}>{col.title}</span>
                      {col.ai && <span className="w-1.5 h-1.5 rounded-full bg-[#D4A853] animate-pulse-dot" />}
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${col.countClass}`}>{col.cards.length}</span>
                  </div>
                  <div className="space-y-2.5 min-h-[200px]">
                    {col.cards.map((card) => (
                      <div key={card.name} className={`pipeline-item pipeline-card-hidden bg-[#F8F8F6] rounded-xl p-3 ${card.border}`}>
                        <p className="text-sm font-semibold text-[#111111]">{card.name}</p>
                        <span className="inline-block mt-1 text-xs px-1.5 py-0.5 rounded-md"
                          style={{ background: col.ai ? "rgba(212,168,83,0.1)" : "#EFEFED", color: col.ai ? "#D4A853" : "#6B7280" }}>
                          {card.tag}
                        </span>
                        <p className={`text-xs mt-1.5 ${card.subClass}`}>{card.sub}</p>
                        {card.readyBadge && (
                          <span className="inline-block mt-1.5 text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700">Ready to book</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Multi-surface product panel */}
            <div className="border-t border-[#E5E5E3] grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-[#E5E5E3]">

              {/* Surface 1: Selected lead profile */}
              <div className="p-5">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold mb-3">Selected Lead</p>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-full bg-[#D4A853] flex items-center justify-center text-sm font-bold text-black flex-shrink-0">SK</div>
                  <div>
                    <p className="text-sm font-semibold text-[#111111]">Sam K.</p>
                    <p className="text-xs text-gray-500">Neo-trad eagle · $650 est.</p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {[
                    { k: "Style", v: "Neo-Traditional" },
                    { k: "Placement", v: "Upper arm" },
                    { k: "Budget", v: "$650 confirmed" },
                    { k: "Artist match", v: "Alex R. (94%)" },
                  ].map((r) => (
                    <div key={r.k} className="flex justify-between items-center">
                      <span className="text-[10px] text-gray-400">{r.k}</span>
                      <span className="text-[10px] font-medium text-[#111111]">{r.v}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 text-[10px] text-[#D4A853] font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#D4A853] animate-pulse-dot" />
                  AI consultation in progress
                </div>
              </div>

              {/* Surface 2: Next appointment */}
              <div className="p-5">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold mb-3">Next Appointment</p>
                <div className="bg-[#F8F8F6] rounded-xl p-3 mb-3 border border-[#E5E5E3]">
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#D4A853] flex-shrink-0 mt-1" />
                    <div>
                      <p className="text-xs font-semibold text-[#111111]">Sarah M. — Sleeve outline</p>
                      <p className="text-[10px] text-gray-500">Today · Jun 20 · 2:00–6:00 PM</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">Alex R. · Room 2 · 4 hours</p>
                    </div>
                  </div>
                </div>
                <div className="bg-[#F8F8F6] rounded-xl p-3 border border-[#E5E5E3]">
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#7C3AED] flex-shrink-0 mt-1" />
                    <div>
                      <p className="text-xs font-semibold text-[#111111]">Jake T. — Neo-trad arm</p>
                      <p className="text-[10px] text-gray-500">Tomorrow · Jun 21 · 11:00 AM</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">Jordan H. · Room 1 · 3 hours</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Surface 3: AI activity summary */}
              <div className="p-5">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold mb-3">AI Working Now</p>
                <div className="space-y-2.5">
                  {[
                    { name: "Sam K.", action: "Completing consultation · Q7/9", gold: true },
                    { name: "Dana T.", action: "Style analysis complete · Blackwork", gold: true },
                    { name: "Maya L.", action: "Follow-up sent · Day 3", gold: false },
                    { name: "Chris P.", action: "Quote draft generating…", gold: true },
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full mt-1 flex-shrink-0 ${item.gold ? "bg-[#D4A853]" : "bg-gray-300"}`} />
                      <div>
                        <p className="text-[10px] font-semibold text-[#111111]">{item.name}</p>
                        <p className="text-[9px] text-gray-400">{item.action}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-[#E5E5E3] flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 blink" />
                  <span className="text-[10px] text-gray-500">4 active AI threads</span>
                </div>
              </div>

            </div>

          </div>
        </div>
      </section>

      {/* ══ CLIENT PROFILE ══ */}
      <section className="relative section-slide py-8 px-6 overflow-hidden" style={{ background: "#0A0A0A" }}>
        <div className="ambient-top" />
        <div className="max-w-6xl mx-auto relative" style={{ zIndex: 1 }}>
          <div className="text-center mb-5">
            <span className="text-xs uppercase tracking-widest text-[#D4A853] font-semibold">Client CRM</span>
            <h2 className="text-3xl lg:text-4xl font-bold text-white mt-4">
              Every client. Their entire journey.
            </h2>
          </div>

          <div className="rounded-2xl overflow-hidden surface-premium-dark" style={{ background: "#111111", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="px-6 py-4 border-b border-[#1A1A1A] flex items-center justify-between gap-3" style={{ background: "#141414" }}>
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full bg-[#D4A853] flex items-center justify-center text-sm font-bold text-black flex-shrink-0">SM</div>
                <span className="text-sm font-semibold text-white truncate">Sarah M. — Client Profile</span>
              </div>
              <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
                {["Floral", "Black & Grey", "VIP", "Returning"].map((tag) => (
                  <span key={tag} className="text-xs px-2 py-0.5 rounded-full text-gray-400" style={{ background: "#1A1A1A", border: "1px solid #2A2A2A" }}>{tag}</span>
                ))}
              </div>
            </div>

            <div className="block lg:grid" style={{ gridTemplateColumns: "280px 1fr" }}>

              <div className="p-6 lg:border-r border-b lg:border-b-0 border-[#1A1A1A]">
                <div className="flex flex-col items-center">
                  <div className="gentle-pulse w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold"
                    style={{ background: "linear-gradient(135deg, #D4A853 0%, #B8923E 100%)" }}>SM</div>
                  <p className="text-lg font-bold mt-3 text-white">Sarah M.</p>
                  <p className="text-xs text-gray-500">Client since March 2023</p>
                  <div className="flex items-center gap-0.5 mt-1">
                    {[1,2,3,4,5].map(n => <span key={n} className="text-[#D4A853] text-sm">★</span>)}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-5">
                  {CRM_STATS.map((s) => (
                    <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: "#1A1A1A" }}>
                      <p className="text-lg font-bold text-white">{s.value}</p>
                      <p className="text-xs text-gray-500">{s.label}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 space-y-2">
                  {[
                    { k: "Artist", v: "Alex R.", vClass: "text-white" },
                    { k: "Risk level", v: "Low ✓", vClass: "text-green-400" },
                    { k: "Next session", v: "Jun 20 · 2:00 PM", vClass: "text-white" },
                    { k: "Consent signed", v: "✓ All forms", vClass: "text-green-400" },
                  ].map((r) => (
                    <div key={r.k} className="rounded-xl p-3 flex justify-between items-center" style={{ background: "#1A1A1A" }}>
                      <span className="text-xs text-gray-500">{r.k}</span>
                      <span className={`text-xs font-semibold ${r.vClass}`}>{r.v}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-6">
                <div className="flex flex-wrap gap-1.5 mb-5">
                  {["Timeline", "Quotes", "Payments", "Consent", "Notes", "Aftercare"].map((tab, i) => (
                    <button key={tab} className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                      i === 0 ? "bg-[#D4A853] text-black" : "text-gray-600 hover:text-gray-300"
                    }`}>{tab}</button>
                  ))}
                </div>
                <div ref={crmTimelineRef} className="relative space-y-2">
                  <div className="absolute left-[14px] top-4 bottom-4 w-[2px]" style={{ background: "#2A2A2A" }} />
                  {CRM_TIMELINE.map((item, i) => (
                    <div key={i} className="timeline-item flex gap-4 items-start relative">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 z-10 text-[10px] font-bold ${
                        item.gold
                          ? "bg-[#D4A853] text-black"
                          : "border-2 border-[#D4A853] text-[#D4A853]"
                      }`} style={item.gold ? {} : { background: "#111111" }}>
                        {item.gold ? "✓" : "○"}
                      </div>
                      <div className="flex-1 rounded-xl p-3" style={{
                        background: item.gold ? "#1A1A1A" : "#141414",
                        border: `1px solid ${item.gold ? "rgba(212,168,83,0.2)" : "#2A2A2A"}`,
                      }}>
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-white">{item.event}</p>
                          <p className="text-[10px] text-gray-500 flex-shrink-0">{item.date}</p>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">{item.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* ══ ARTIST DASHBOARD ══ */}
      <section className="section-slide py-8 px-6" style={{ background: "#F8F8F6" }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-5">
            <span className="text-xs uppercase tracking-widest text-[#D4A853] font-semibold">Artist Dashboard</span>
            <h2 className="text-3xl lg:text-4xl font-bold text-[#111111] mt-4">
              Everything an artist needs. Nothing they don&apos;t.
            </h2>
          </div>

          <div className="max-w-4xl mx-auto">
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

              <div className="block lg:grid lg:h-[400px]" style={{ gridTemplateColumns: "240px 1fr" }}>
                <div className="hidden lg:flex bg-[#F8F8F6] border-r border-[#E5E5E3] p-4 flex-col">
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
                          <span className="bg-[#111111] text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-medium">{item.badge}</span>
                        )}
                      </div>
                    ))}
                  </nav>
                </div>

                <div className="p-5 lg:p-6 overflow-auto">
                  {/* Mobile artist header */}
                  <div className="lg:hidden flex items-center gap-3 mb-4 pb-4 border-b border-[#E5E5E3]">
                    <div className="w-10 h-10 bg-[#D4A853] rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">AR</div>
                    <div>
                      <p className="text-sm font-semibold text-[#111111]">Alex R.</p>
                      <p className="text-xs text-gray-500">Neo-Traditional · Online</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-semibold text-[#111111]">AI Inbox</span>
                    <span className="text-xs text-[#D4A853]">3 items need attention</span>
                  </div>
                  <div className="space-y-3">
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

      {/* ══ CALENDAR ══ */}
      <section className="section-slide py-8 px-6" style={{ background: "#FFFFFF" }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-5">
            <span className="text-xs uppercase tracking-widest text-[#D4A853] font-semibold">Calendar</span>
            <h2 className="text-3xl lg:text-4xl font-bold text-[#111111] mt-4">
              Every artist&apos;s schedule. No double-bookings. Ever.
            </h2>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-[#E5E5E3] overflow-hidden">
            <div className="px-6 py-4 bg-[#F8F8F6] border-b border-[#E5E5E3] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-[#111111]">Studio Calendar</span>
                <span className="text-xs bg-[#D4A853]/10 text-[#D4A853] px-2 py-0.5 rounded-full font-medium">Week of Jun 16–21</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ background: "#D4A853" }} />
                  <span className="text-xs text-gray-500">Alex R.</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ background: "#7C3AED" }} />
                  <span className="text-xs text-gray-500">Jordan H.</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ background: "#2563EB" }} />
                  <span className="text-xs text-gray-500">Sam K.</span>
                </div>
              </div>
            </div>

            {/* Mobile calendar — appointments list */}
            <div className="lg:hidden p-4 space-y-4">
              {CALENDAR_DAYS.filter(d => d.appts.length > 0).map((day) => (
                <div key={day.day}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-sm font-bold ${day.date === "20" ? "text-[#D4A853]" : "text-[#111111]"}`}>{day.day} {day.date}</span>
                    {day.date === "20" && <span className="text-xs text-gray-400 bg-[#F8F8F6] px-2 py-0.5 rounded-full border border-[#E5E5E3]">Today</span>}
                  </div>
                  <div className="space-y-2">
                    {day.appts.map((appt, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-[#E5E5E3] bg-[#F8F8F6]">
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: appt.color }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-[#111111]">{appt.client}</p>
                          <p className="text-xs text-gray-500 truncate">{appt.time} · {appt.service}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <div className="pt-2 border-t border-[#E5E5E3] flex flex-wrap gap-4">
                {[{ color: "#D4A853", label: "Sarah M. · Sleeve outline · Jun 20" }, { color: "#7C3AED", label: "Jake T. · Neo-trad · Jun 17" }, { color: "#2563EB", label: "Chris M. · Cover-up · Jun 19" }].map(l => (
                  <div key={l.label} className="flex items-center gap-1.5 text-xs text-gray-500">
                    <span className="w-2.5 h-2.5 rounded flex-shrink-0" style={{ background: l.color }} />{l.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Desktop calendar — full grid */}
            <div className="hidden lg:block p-5 overflow-x-auto">
              {/* Day headers */}
              <div className="grid mb-2" style={{ gridTemplateColumns: "40px repeat(6, 1fr)", gap: "8px" }}>
                <div />
                {CALENDAR_DAYS.map((d) => (
                  <div key={d.day} className={`text-center rounded-lg py-1.5 ${d.date === "20" ? "bg-[#111111]" : ""}`}>
                    <p className={`text-[10px] font-semibold uppercase tracking-wide ${d.date === "20" ? "text-[#D4A853]" : "text-gray-400"}`}>{d.day}</p>
                    <p className={`text-sm font-bold mt-0.5 ${d.date === "20" ? "text-white" : "text-[#111111]"}`}>{d.date}</p>
                  </div>
                ))}
              </div>

              {/* Time grid */}
              <div className="grid" style={{ gridTemplateColumns: "40px repeat(6, 1fr)", gap: "8px" }}>
                {/* Time labels */}
                <div className="relative" style={{ height: "280px" }}>
                  {["10am", "12pm", "2pm", "4pm", "6pm"].map((t, i) => (
                    <span key={t} className="absolute text-[10px] text-gray-400 right-1" style={{ top: `${i * 70}px`, transform: "translateY(-50%)" }}>
                      {t}
                    </span>
                  ))}
                </div>

                {/* Day columns */}
                {CALENDAR_DAYS.map((day) => (
                  <div key={day.day} className="relative rounded-lg" style={{ height: "280px", background: day.date === "20" ? "rgba(17,17,17,0.02)" : "#F8F8F6", border: "1px solid #E5E5E3" }}>
                    {/* Hour lines */}
                    {[0,1,2,3,4,5,6,7].map((h) => (
                      <div key={h} className="absolute left-0 right-0" style={{ top: `${h * 35}px`, height: "1px", background: "#F0F0EE" }} />
                    ))}
                    {/* Appointments */}
                    {day.appts.map((appt, i) => (
                      <div key={i} className="absolute left-1 right-1 rounded-lg px-2 py-1.5 overflow-hidden"
                        style={{ top: `${appt.top}px`, height: `${appt.height}px`, background: appt.color, opacity: 0.9 }}>
                        <p className="text-[10px] font-bold text-white leading-tight truncate">{appt.client}</p>
                        <p className="text-[9px] text-white/80 truncate">{appt.service}</p>
                        <p className="text-[9px] text-white/70">{appt.time}</p>
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              {/* Legend row */}
              <div className="mt-4 flex items-center gap-6">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="w-3 h-3 rounded" style={{ background: "#D4A853" }} />
                  Sarah M. · Sleeve outline · Jun 20 · 2–6pm
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="w-3 h-3 rounded" style={{ background: "#7C3AED" }} />
                  Jake T. · Neo-trad arm · Jun 17 · 11am–2pm
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="w-3 h-3 rounded" style={{ background: "#2563EB" }} />
                  Chris M. · Cover-up · Jun 19 · 12–2pm
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ AFTERCARE + REVIEWS ══ */}
      <section className="py-10 px-6" style={{ background: "#111111", borderTop: "1px solid #1A1A1A" }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-5">
            <span className="text-xs uppercase tracking-widest text-[#D4A853] font-semibold">Aftercare &amp; Reviews</span>
            <h2 className="text-3xl lg:text-4xl font-bold text-white mt-4">
              The session ends. InkBook keeps working.
            </h2>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">

            {/* SMS thread */}
            <div className="bg-[#1A1A1A] rounded-2xl overflow-hidden border border-[#2A2A2A]">
              <div className="px-5 py-4 border-b border-[#2A2A2A] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-400" />
                  <span className="text-sm font-semibold text-white">Automated Aftercare — Maya L.</span>
                </div>
                <span className="text-xs text-[#D4A853] bg-[#D4A853]/10 px-2 py-0.5 rounded-full font-medium">AI</span>
              </div>
              <div className="p-5 space-y-4">
                {AFTERCARE_MSGS.map((msg, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#D4A853] flex items-center justify-center text-[10px] font-bold text-black flex-shrink-0 mt-0.5">IB</div>
                    <div className="flex-1">
                      <div className="bg-[#252525] rounded-2xl rounded-tl-none px-4 py-3">
                        <p className="text-xs text-white leading-relaxed">{msg.text}</p>
                      </div>
                      <p className="text-[10px] text-gray-600 mt-1.5 ml-1">{msg.day}</p>
                    </div>
                  </div>
                ))}
                <div className="rounded-xl p-3 mt-2" style={{ background: "rgba(212,168,83,0.06)", border: "1px solid rgba(212,168,83,0.15)" }}>
                  <p className="text-xs text-[#D4A853]">3-message sequence sent automatically · No manual action needed</p>
                </div>
              </div>
            </div>

            {/* Review flow */}
            <div className="flex flex-col gap-4">
              <div className="bg-[#1A1A1A] rounded-2xl p-5 border border-[#2A2A2A]">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-semibold text-white">Review Request</span>
                  <span className="text-xs text-[#D4A853]">Sent Jun 29</span>
                </div>
                <div className="bg-[#252525] rounded-xl p-4 border border-[#2A2A2A]">
                  <p className="text-xs text-gray-400 mb-1">Message to Maya L.</p>
                  <p className="text-sm text-white">&ldquo;How was your experience at Ink &amp; Iron? Tap to leave a quick review — it means the world to us! ⭐&rdquo;</p>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-xs text-gray-500">Sent via SMS</span>
                    <span className="text-xs text-green-400 ml-auto">Delivered ✓</span>
                  </div>
                </div>
              </div>

              <div className="bg-[#1A1A1A] rounded-2xl p-5 border border-[#2A2A2A] flex-1">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-semibold text-white">Review Received</span>
                  <span className="text-xs text-green-400">Jun 29 · 7 days after</span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#D4A853] flex items-center justify-center text-sm font-bold text-black flex-shrink-0">ML</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-1 mb-1">
                      {[1,2,3,4,5].map(n => <span key={n} className="text-[#D4A853]">★</span>)}
                    </div>
                    <p className="text-sm text-white">&ldquo;Alex is incredible. Best tattoo experience ever. The whole process was so smooth and professional.&rdquo;</p>
                    <p className="text-xs text-gray-500 mt-2">— Maya L. · Google Review</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <span className="text-xs px-2 py-1 rounded-full bg-green-900/40 text-green-400 font-medium">Posted to Google ✓</span>
                  <span className="text-xs px-2 py-1 rounded-full bg-blue-900/40 text-blue-400 font-medium">Added to Portfolio ✓</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ══ REVENUE DASHBOARD ══ */}
      <section className="relative py-8 px-6 overflow-hidden" style={{ background: "#0A0A0A" }}>
        <div className="ambient-top" />
        <div className="max-w-7xl mx-auto relative" style={{ zIndex: 1 }}>
          <div className="text-center mb-5">
            <span className="text-xs uppercase tracking-widest text-[#D4A853] font-semibold">Revenue &amp; Analytics</span>
            <h2 className="text-3xl lg:text-4xl font-bold text-white mt-4">
              Run your business from here.
            </h2>
          </div>

          <div className="rounded-2xl overflow-hidden surface-premium-dark" style={{ background: "#111111", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="px-6 py-4 border-b border-[#1A1A1A] flex items-center justify-between" style={{ background: "#141414" }}>
              <span className="text-sm font-semibold text-white">Revenue Dashboard</span>
              <span className="text-xs text-gray-500">Ink &amp; Iron Studio · Jun 2025</span>
            </div>

            <div className="p-6">
              {/* Stat cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-8">
                {[
                  { label: "Monthly Revenue", value: "$12,480", sub: "+18% vs last month", green: true },
                  { label: "MRR Growth",       value: "$8,240",  sub: "Recurring subscriptions", green: false },
                  { label: "YTD Total",        value: "$82,400", sub: "Through Jun 2025", green: false },
                  { label: "Avg Session",      value: "$465",    sub: "Per booking", green: false },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-xl p-4 lg:p-5" style={{ background: "#141414", border: "1px solid #1A1A1A" }}>
                    <p className="text-xs text-gray-500">{stat.label}</p>
                    <p className="text-2xl lg:text-4xl xl:text-5xl font-bold text-white mt-1">{stat.value}</p>
                    <p className={`text-xs mt-1 ${stat.green ? "text-green-400" : "text-gray-600"}`}>{stat.sub}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">

                {/* Bar chart */}
                <div>
                  <p className="text-sm font-semibold text-white mb-4">Monthly Revenue</p>
                  <div className="flex items-end gap-3" style={{ height: "180px" }}>
                    {REVENUE_BARS.map((bar) => (
                      <div key={bar.month} className="flex-1 flex flex-col items-center">
                        <span className="text-xs text-gray-500 mb-2">{bar.val}</span>
                        <div className="w-full rounded-t-lg" style={{
                          height: `${bar.pct * 1.4}px`,
                          background: bar.pct === 100 ? "#D4A853" : `rgba(212,168,83,${0.15 + bar.pct / 150})`,
                        }} />
                        <span className="text-xs text-gray-500 mt-2">{bar.month}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top services */}
                <div>
                  <p className="text-sm font-semibold text-white mb-4">Top Services</p>
                  <div className="space-y-3">
                    {[
                      { name: "Full sleeve",   avg: "$1,800", pct: 100 },
                      { name: "Half sleeve",   avg: "$900",   pct: 50  },
                      { name: "Arm piece",     avg: "$450",   pct: 25  },
                      { name: "Consultation",  avg: "$0",     pct: 0   },
                    ].map((svc) => (
                      <div key={svc.name}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-white font-medium">{svc.name}</span>
                          <span className="text-gray-500">{svc.avg} avg</span>
                        </div>
                        <div className="h-1.5 rounded-full" style={{ background: "#2A2A2A" }}>
                          <div className="h-1.5 bg-[#D4A853] rounded-full" style={{ width: `${svc.pct}%` }} />
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

      {/* ══ WHITE LABEL ══ */}
      <section className="py-10 px-6" style={{ background: "#F8F8F6" }}>
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <span className="text-xs uppercase tracking-widest text-[#D4A853] font-semibold">White Label</span>
              <h2 className="text-3xl lg:text-4xl font-bold text-[#111111] mt-4">
                Your studio. Your brand. Your clients.
              </h2>
              <ul className="mt-5 space-y-2">
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
                  { initials: "JH", name: "Jordan Holt",  style: "Traditional · Neo-trad", avail: "Thu" },
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
        </div>
      </section>

      {/* ══ PRICING ══ */}
      <section id="pricing" className="relative py-12 px-6 overflow-hidden" style={{ background: "#111111" }}>
        <div className="ambient-top" />
        <div className="max-w-5xl mx-auto relative" style={{ zIndex: 1 }}>
          <div className="text-center">
            <span className="text-xs uppercase tracking-widest text-[#D4A853] font-semibold">Pricing</span>
            <h2 className="text-3xl lg:text-4xl font-bold text-white mt-4">Simple, transparent pricing.</h2>
            <p className="text-base text-gray-400 mt-3">14-day free trial. No credit card required. No transaction fees.</p>
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            <div className="scale-reveal rounded-2xl p-8" data-delay="0"
              style={{ background: "#1A1A1A", border: "1px solid #2A2A2A" }}
              onMouseMove={handlePricingMove} onMouseLeave={handlePricingLeave}>
              <p className="text-sm font-semibold text-gray-400">Solo Artist</p>
              <div className="flex items-end gap-1 mt-3 mb-1">
                <span className="text-5xl font-bold text-white">$49</span>
                <span className="text-sm text-gray-500 mb-2">/mo</span>
              </div>
              <p className="text-sm text-gray-500 mb-8">For individual tattoo artists.</p>
              <a href="/register" className="block w-full py-3 text-center text-sm font-semibold rounded-full text-white transition-colors"
                style={{ border: "1px solid #333" }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = "#555")}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "#333")}>
                Start Free Trial
              </a>
            </div>

            <div className="rounded-2xl p-8 relative scale-[1.05]"
              data-animate="fade-up" data-delay="200"
              style={{ background: "#1A1A1A", border: "2px solid #D4A853" }}
              onMouseMove={handlePricingMove} onMouseLeave={handlePricingLeave}>
              <span className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#D4A853] text-black text-xs font-semibold px-4 py-1 rounded-full whitespace-nowrap">
                MOST POPULAR
              </span>
              <p className="text-sm font-semibold text-gray-400">Studio</p>
              <div className="flex items-end gap-1 mt-3 mb-1">
                <span className="text-5xl font-bold text-white">$79</span>
                <span className="text-sm text-gray-500 mb-2">/mo</span>
              </div>
              <p className="text-sm text-gray-500 mb-8">For small studios and growing teams.</p>
              <a href="/register" className="block w-full py-3 text-center text-sm font-semibold rounded-full bg-[#D4A853] text-black hover:opacity-90 transition-opacity">
                Start Free Trial
              </a>
            </div>

            <div className="scale-reveal rounded-2xl p-8" data-delay="400"
              style={{ background: "#1A1A1A", border: "1px solid #2A2A2A" }}
              onMouseMove={handlePricingMove} onMouseLeave={handlePricingLeave}>
              <p className="text-sm font-semibold text-gray-400">Studio Pro</p>
              <div className="flex items-end gap-1 mt-3 mb-1">
                <span className="text-5xl font-bold text-white">$169</span>
                <span className="text-sm text-gray-500 mb-2">/mo</span>
              </div>
              <p className="text-sm text-gray-500 mb-8">For larger studios with advanced needs.</p>
              <a href="/register" className="block w-full py-3 text-center text-sm font-semibold rounded-full text-white transition-colors"
                style={{ border: "1px solid #333" }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = "#555")}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "#333")}>
                Start Free Trial
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ══ FINAL CTA ══ */}
      <section id="trial" className="relative cta-bg py-14 px-6 overflow-hidden" style={{ borderTop: "1px solid #222" }}>
        <div className="absolute inset-0 pointer-events-none" style={{
          background: "radial-gradient(ellipse at 50% 100%, rgba(212,168,83,0.1) 0%, transparent 55%)"
        }} />
        <div className="max-w-2xl mx-auto text-center relative" style={{ zIndex: 1 }}>
          <h2 className="text-4xl lg:text-5xl font-bold text-white">Stop chasing inquiries.</h2>
          <h2 className="text-4xl lg:text-5xl font-bold text-white">Start tattooing.</h2>
          <p className="text-base text-[#D4A853] mt-5">AI handles clients. Artists focus on tattooing.</p>
          <p className="text-xs uppercase tracking-widest text-gray-500 mt-2">The Tattoo Business Operating System</p>
          <p className="text-sm text-gray-400 mt-4">Start your 14-day free trial. No credit card required.</p>
          <div className="mt-8 flex flex-wrap gap-4 justify-center">
            <a href="/register" className="bg-[#D4A853] text-black font-semibold rounded-full px-8 py-4 text-sm hover:opacity-90 transition-opacity">Start Free Trial</a>
            <a href="#book-demo" className="border border-gray-600 text-white rounded-full px-8 py-4 text-sm hover:border-gray-400 transition-colors">Book Demo</a>
          </div>
          <p className="text-xs text-gray-500 mt-8">Join tattoo artists and studios already automating their client journey.</p>
        </div>
      </section>

      {/* ══ FOOTER ══ */}
      <footer className="px-6 py-12" style={{ background: "#111111", borderTop: "1px solid #222" }}>
        <div className="max-w-6xl mx-auto flex flex-wrap justify-between items-center gap-4">
          <span className="text-white font-semibold">InkBook</span>
          <nav className="flex flex-wrap gap-6">
            {["Features", "Book Demo", "Privacy", "Terms"].map((link) => (
              <a key={link} href={`#${link.toLowerCase().replace(" ", "-")}`}
                className="text-sm text-gray-400 hover:text-white transition-colors">{link}</a>
            ))}
          </nav>
          <p className="text-sm text-gray-500">Copyright © 2026 InkBook</p>
        </div>
      </footer>

    </div>
  );
}
