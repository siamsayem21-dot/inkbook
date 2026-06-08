"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const NAV = ["Pipeline", "Clients", "Artists", "Revenue", "Settings"];

const PIPELINE = [
  {
    stage: "New Inquiry",
    count: 2,
    initials: "AK",
    name: "Alex K.",
    style: "Geometric Mandala",
    detail: "Chest piece · $300–500",
    badge: null,
    highlight: false,
  },
  {
    stage: "AI Consultation",
    count: 4,
    initials: "JM",
    name: "Jordan M.",
    style: "Blackwork Sleeve",
    detail: "Forearm · $400–600",
    badge: { label: "AI · 94 / 100", color: "#E8E0D0", bg: "rgba(232,224,208,0.10)", border: "rgba(232,224,208,0.28)" },
    highlight: true,
  },
  {
    stage: "Follow-Up",
    count: 5,
    initials: "PD",
    name: "Priya D.",
    style: "Fine Line Floral",
    detail: "Quote sent · 48h no reply",
    badge: { label: "Nudge sent", color: "#93C5FD", bg: "rgba(147,197,253,0.08)", border: "rgba(147,197,253,0.22)" },
    highlight: true,
  },
  {
    stage: "Quote",
    count: 2,
    initials: "MR",
    name: "Maya R.",
    style: "Watercolor Portrait",
    detail: "Shoulder · $200–300",
    badge: { label: "$850 quoted", color: "#909090", bg: "rgba(255,255,255,0.04)", border: "#2A2A2A" },
    highlight: false,
  },
  {
    stage: "Deposit Paid",
    count: 3,
    initials: "CT",
    name: "Carlos T.",
    style: "Neo-Trad Phoenix",
    detail: "Full back · $800–1,200",
    badge: { label: "$280 collected", color: "#86EFAC", bg: "rgba(134,239,172,0.10)", border: "rgba(134,239,172,0.28)" },
    highlight: true,
  },
  {
    stage: "Booked",
    count: 4,
    initials: "SL",
    name: "Sam L.",
    style: "Japanese Koi",
    detail: "Leg sleeve · $1,500–2,000",
    badge: { label: "Feb 12 · 2:00 PM", color: "#C4B5FD", bg: "rgba(196,181,253,0.09)", border: "rgba(196,181,253,0.24)" },
    highlight: true,
  },
];

function countUp(target: number, duration: number, onTick: (v: number) => void) {
  const start = performance.now();
  function tick(now: number) {
    const p = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    onTick(Math.round(target * eased));
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

export default function HeroSection() {
  const [mounted, setMounted] = useState(false);
  const [cardsVisible, setCardsVisible] = useState(false);
  const [revenue, setRevenue] = useState(0);
  const [conversion, setConversion] = useState(0);
  const [depRate, setDepRate] = useState(0);

  useEffect(() => {
    setMounted(true);
    setTimeout(() => setCardsVisible(true), 600);
    setTimeout(() => {
      countUp(18240, 1600, setRevenue);
      countUp(73, 1200, setConversion);
      countUp(94, 1000, setDepRate);
    }, 800);
  }, []);

  return (
    <section
      className="relative flex flex-col items-center justify-center text-center"
      style={{
        minHeight: "100vh",
        paddingTop: "calc(64px + 80px)",
        paddingBottom: "80px",
        paddingLeft: "24px",
        paddingRight: "24px",
        background: "#0A0A0A",
        overflow: "hidden",
      }}
    >
      {/* Ambient glow */}
      <div
        aria-hidden
        className="animate-ambient-drift pointer-events-none absolute -top-1/4 left-1/2 -translate-x-1/2 -z-10"
        style={{
          width: "1200px",
          height: "800px",
          borderRadius: "50%",
          background: "radial-gradient(ellipse, rgba(232,224,208,0.13) 0%, rgba(232,224,208,0.04) 50%, transparent 70%)",
          filter: "blur(2px)",
        }}
      />

      {/* ── Background atmosphere: AI × Tattoo ── */}

      {/* Top-right: mandala fragment */}
      <svg
        aria-hidden
        viewBox="0 0 520 520"
        style={{ position: "absolute", top: 0, right: 0, width: "520px", height: "520px", opacity: 0.055, pointerEvents: "none" }}
      >
        <g transform="translate(520,0)">
          {[88, 148, 212, 280, 356, 432].map(r => (
            <circle key={r} cx={0} cy={0} r={r} fill="none" stroke="#BDB3A0" strokeWidth="0.55" />
          ))}
          {Array.from({ length: 23 }, (_, i) => {
            const a = (108 + i * 3) * Math.PI / 180;
            return (
              <line key={i} x1={0} y1={0} x2={Math.cos(a) * 440} y2={Math.sin(a) * 440}
                stroke="#BDB3A0" strokeWidth={i % 4 === 0 ? "0.5" : "0.2"} />
            );
          })}
          {([148, 280] as const).flatMap(r =>
            Array.from({ length: 10 }, (_, i) => {
              const a = (112 + i * 7) * Math.PI / 180;
              return <circle key={`d-${r}-${i}`} cx={Math.cos(a) * r} cy={Math.sin(a) * r} r={1.8} fill="#BDB3A0" />;
            })
          )}
        </g>
      </svg>

      {/* Top-left: overlapping circles (organic / ornamental) */}
      <svg
        aria-hidden
        viewBox="0 0 500 500"
        style={{ position: "absolute", top: 0, left: 0, width: "500px", height: "500px", opacity: 0.048, pointerEvents: "none" }}
      >
        <circle cx={0} cy={0} r={82} fill="none" stroke="#BDB3A0" strokeWidth="0.55" />
        {Array.from({ length: 6 }, (_, i) => {
          const a = i * 60 * Math.PI / 180;
          return (
            <circle key={i} cx={Math.cos(a) * 82} cy={Math.sin(a) * 82} r={82}
              fill="none" stroke="#BDB3A0" strokeWidth="0.55" />
          );
        })}
        {[164, 246, 328, 410].map(r => (
          <circle key={r} cx={0} cy={0} r={r} fill="none" stroke="#BDB3A0" strokeWidth={r > 246 ? "0.3" : "0.42"} />
        ))}
        {Array.from({ length: 12 }, (_, i) => {
          const a = i * 30 * Math.PI / 180;
          return (
            <line key={i} x1={0} y1={0} x2={Math.cos(a) * 420} y2={Math.sin(a) * 420}
              stroke="#BDB3A0" strokeWidth="0.25" opacity="0.55" />
          );
        })}
      </svg>

      {/* Left edge: AI network nodes */}
      <svg
        aria-hidden
        viewBox="0 0 80 700"
        style={{ position: "absolute", top: "8%", left: 0, width: "80px", height: "700px", opacity: 0.04, pointerEvents: "none" }}
      >
        {([[8,55],[44,145],[10,250],[50,340],[14,430],[46,520],[8,605]] as [number,number][]).map(([x,y],i) => (
          <circle key={i} cx={x} cy={y} r={2} fill="#BDB3A0" />
        ))}
        {([[8,55,44,145],[44,145,10,250],[10,250,50,340],[50,340,14,430],[14,430,46,520],[46,520,8,605]] as [number,number,number,number][]).map(([x1,y1,x2,y2],i) => (
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#BDB3A0" strokeWidth="0.5" />
        ))}
      </svg>

      {/* Right edge: AI network nodes */}
      <svg
        aria-hidden
        viewBox="0 0 80 700"
        style={{ position: "absolute", top: "14%", right: 0, width: "80px", height: "700px", opacity: 0.036, pointerEvents: "none" }}
      >
        {([[72,70],[36,160],[68,265],[30,355],[66,445],[36,535],[72,615]] as [number,number][]).map(([x,y],i) => (
          <circle key={i} cx={x} cy={y} r={2} fill="#BDB3A0" />
        ))}
        {([[72,70,36,160],[36,160,68,265],[68,265,30,355],[30,355,66,445],[66,445,36,535],[36,535,72,615]] as [number,number,number,number][]).map(([x1,y1,x2,y2],i) => (
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#BDB3A0" strokeWidth="0.5" />
        ))}
      </svg>

      {/* Content — z-index: 1 paints above background SVGs */}
      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", width: "100%", textAlign: "center" }}>

      {/* Eyebrow */}
      <div className={`mb-8 transition-all duration-500 ${mounted ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}>
        <span
          style={{ fontFamily: "var(--font-mono)", fontSize: "11px", letterSpacing: "0.1em", color: "#525252", border: "1px solid #2A2A2A", background: "#161616", padding: "6px 14px", borderRadius: "100px", display: "inline-block", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)", textTransform: "uppercase" }}
        >
          Tattoo Business Operating System
        </span>
      </div>

      {/* Headline */}
      <h1
        className={`text-center max-w-[720px] mb-6 transition-all duration-700 delay-100 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
        style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(52px, 7vw, 88px)", lineHeight: "1.05", letterSpacing: "-0.03em", color: "#F5F5F5" }}
      >
        Turn tattoo inquiries into paid bookings.
      </h1>

      {/* Workflow rail */}
      <div
        className={`mb-8 transition-all duration-500 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}
        style={{ transitionDelay: "160ms", overflowX: "auto", display: "flex", justifyContent: "center" }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            background: "#131313",
            border: "1px solid #212121",
            borderRadius: "10px",
            padding: "11px 22px",
            whiteSpace: "nowrap",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)",
          }}
        >
          {(["Inquiry", "AI Consultation", "AI Follow-Up", "Quote", "Deposit", "Booking", "Aftercare", "CRM"] as const).map((step, i, arr) => (
            <span key={step} style={{ display: "inline-flex", alignItems: "center" }}>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "11px",
                  letterSpacing: "0.04em",
                  color: step === "AI Consultation" || step === "AI Follow-Up" ? "#787878" : "#505050",
                }}
              >
                {step}
              </span>
              {i < arr.length - 1 && (
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "11px",
                    color: "#242424",
                    margin: "0 10px",
                  }}
                >
                  →
                </span>
              )}
            </span>
          ))}
        </div>
      </div>

      {/* Sub */}
      <p
        className={`max-w-[480px] mb-10 transition-all duration-500 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}
        style={{ transitionDelay: "220ms", fontFamily: "var(--font-sans)", fontSize: "17px", lineHeight: "1.7", color: "#606060" }}
      >
        AI handles client communication at every step — from first inquiry to aftercare. Artists spend less time managing leads and more time tattooing.
      </p>

      {/* CTAs */}
      <div className={`flex flex-col sm:flex-row items-center gap-3 mb-12 transition-all duration-500 delay-300 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}>
        <Link href="#" className="btn-primary" style={{ fontFamily: "var(--font-sans)", fontSize: "14px", fontWeight: 500, padding: "13px 28px", borderRadius: "8px", textDecoration: "none", display: "inline-block" }}>
          Book a Demo
        </Link>
        <Link href="#workflow" className="btn-secondary" style={{ fontFamily: "var(--font-sans)", fontSize: "14px", color: "#909090", border: "1px solid #222222", padding: "13px 28px", borderRadius: "8px", textDecoration: "none", display: "inline-block" }}>
          See How It Works
        </Link>
      </div>

      {/* Dashboard shell */}
      <div
        className={`w-full mx-auto transition-all duration-700 delay-500 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
        style={{ maxWidth: "1120px" }}
      >
        <div
          className="surface-floating"
          style={{ background: "#161616", border: "1px solid #2E2E2E", borderRadius: "16px", overflow: "hidden" }}
        >
          {/* Window chrome */}
          <div style={{ background: "#0F0F0F", borderBottom: "1px solid #202020", padding: "11px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", gap: "6px" }}>
              {[0,1,2].map(i => <div key={i} aria-hidden style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#323232" }} />)}
            </div>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "#484848" }}>Studio Pipeline · Ink & Iron Studio</span>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span className="animate-pulse-dot" aria-hidden style={{ display: "inline-block", width: "6px", height: "6px", borderRadius: "50%", background: "#4ADE80" }} />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "#4A4A4A" }}>Live · 14 active leads</span>
            </div>
          </div>

          {/* App body */}
          <div style={{ display: "flex" }}>

            {/* Sidebar */}
            <div className="hidden lg:flex flex-col" style={{ width: "172px", borderRight: "1px solid #1C1C1C", background: "#0C0C0C", flexShrink: 0 }}>
              <div style={{ padding: "16px", borderBottom: "1px solid #1C1C1C" }}>
                <div style={{ fontFamily: "var(--font-serif)", fontSize: "14px", color: "#E8E0D0", marginBottom: "3px" }}>Ink & Iron</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "#404040" }}>Studio Plan · 6 artists</div>
              </div>
              <nav style={{ padding: "8px 0", flex: 1 }}>
                {NAV.map((item, i) => (
                  <div
                    key={item}
                    style={{
                      padding: "9px 16px",
                      background: i === 0 ? "rgba(232,224,208,0.08)" : "transparent",
                      borderLeft: i === 0 ? "2px solid rgba(232,224,208,0.55)" : "2px solid transparent",
                      fontFamily: "var(--font-sans)",
                      fontSize: "13px",
                      color: i === 0 ? "#D8D0C0" : "#424242",
                    }}
                  >
                    {item}
                  </div>
                ))}
              </nav>
              <div style={{ padding: "12px 16px", borderTop: "1px solid #1C1C1C" }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "#323232", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>Online now</div>
                {[["Sarah M.", true], ["Jake R.", true], ["Mia C.", false]].map(([name, on]) => (
                  <div key={String(name)} style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "6px" }}>
                    <span className={on ? "animate-pulse-dot" : ""} style={{ display: "inline-block", width: "5px", height: "5px", borderRadius: "50%", background: on ? "#4ADE80" : "#282828", flexShrink: 0 }} />
                    <span style={{ fontFamily: "var(--font-sans)", fontSize: "12px", color: on ? "#7A7A7A" : "#383838" }}>{String(name)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Pipeline board */}
            <div style={{ flex: 1, minWidth: 0, background: "#111111" }}>

              {/* Flow rail header */}
              <div style={{ padding: "10px 16px", borderBottom: "1px solid #1A1A1A", background: "#0D0D0D", display: "flex", alignItems: "center", gap: "4px", overflowX: "auto" }}>
                {PIPELINE.map((col, i) => (
                  <div key={col.stage} style={{ display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "4px 10px",
                      borderRadius: "5px",
                      background: col.highlight ? "rgba(255,255,255,0.04)" : "transparent",
                      border: col.highlight ? "1px solid #252525" : "1px solid transparent",
                    }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: col.highlight ? "#909090" : "#484848", textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>
                        {col.stage}
                      </span>
                      <span style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "9px",
                        color: col.highlight ? "#606060" : "#363636",
                        background: "#1C1C1C",
                        padding: "0 5px",
                        borderRadius: "100px",
                      }}>
                        {col.count}
                      </span>
                    </div>
                    {i < PIPELINE.length - 1 && (
                      <span aria-hidden style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "#282828", flexShrink: 0 }}>›</span>
                    )}
                  </div>
                ))}
              </div>

              {/* Kanban columns */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(6, 1fr)",
                  minHeight: "220px",
                }}
              >
                {PIPELINE.map((col, i) => (
                  <div
                    key={col.stage}
                    style={{
                      borderRight: i < PIPELINE.length - 1 ? "1px solid #181818" : "none",
                      padding: "14px 12px",
                      opacity: cardsVisible ? 1 : 0,
                      transform: cardsVisible ? "none" : "translateY(8px)",
                      transition: `opacity 500ms ${i * 60}ms cubic-bezier(0.16,1,0.3,1), transform 500ms ${i * 60}ms cubic-bezier(0.16,1,0.3,1)`,
                    }}
                  >
                    {/* Card */}
                    <div
                      style={{
                        background: col.highlight ? "#1C1C1C" : "#161616",
                        border: `1px solid ${col.highlight ? "#2A2A2A" : "#1E1E1E"}`,
                        borderRadius: "9px",
                        padding: "12px",
                        boxShadow: col.highlight
                          ? "0 4px 16px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)"
                          : "inset 0 1px 0 rgba(255,255,255,0.03)",
                      }}
                    >
                      {/* Avatar + name */}
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                        <div style={{
                          width: "24px", height: "24px", borderRadius: "50%", flexShrink: 0,
                          background: col.badge?.color === "#86EFAC"
                            ? "rgba(134,239,172,0.10)"
                            : col.badge?.color === "#E8E0D0"
                            ? "rgba(232,224,208,0.10)"
                            : "#1E1E1E",
                          border: `1px solid ${col.badge?.color === "#86EFAC"
                            ? "rgba(134,239,172,0.25)"
                            : col.badge?.color === "#E8E0D0"
                            ? "rgba(232,224,208,0.22)"
                            : "#282828"}`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          <span style={{
                            fontFamily: "var(--font-mono)", fontSize: "8px",
                            color: col.badge?.color === "#86EFAC"
                              ? "#86EFAC"
                              : col.badge?.color === "#E8E0D0"
                              ? "#E8E0D0"
                              : "#484848",
                          }}>{col.initials}</span>
                        </div>
                        <span style={{ fontFamily: "var(--font-sans)", fontSize: "13px", fontWeight: 500, color: "#D4D4D4", lineHeight: "1.2" }}>
                          {col.name}
                        </span>
                      </div>

                      {/* Style */}
                      <div style={{ fontFamily: "var(--font-sans)", fontSize: "12px", color: "#787878", marginBottom: "4px", lineHeight: "1.3" }}>
                        {col.style}
                      </div>

                      {/* Detail */}
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "#484848", marginBottom: col.badge ? "10px" : "0" }}>
                        {col.detail}
                      </div>

                      {/* Badge */}
                      {col.badge && (
                        <div style={{
                          display: "inline-flex",
                          alignItems: "center",
                          padding: "3px 8px",
                          borderRadius: "5px",
                          background: col.badge.bg,
                          border: `1px solid ${col.badge.border}`,
                        }}>
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: col.badge.color, whiteSpace: "nowrap" }}>
                            {col.badge.label}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Ghost card — extra lead indicator */}
                    {col.count > 1 && (
                      <div style={{
                        marginTop: "6px",
                        height: "28px",
                        background: "#131313",
                        border: "1px solid #1C1C1C",
                        borderRadius: "9px",
                        display: "flex",
                        alignItems: "center",
                        paddingLeft: "10px",
                        gap: "6px",
                      }}>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: "9px", color: "#363636" }}>
                          +{col.count - 1} more
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Stats strip */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", borderTop: "1px solid #1C1C1C", background: "#0D0D0D" }}>
            {[
              { label: "Monthly Revenue", value: `$${revenue.toLocaleString()}`, sub: "↑ 23% this month", accent: false },
              { label: "Booking Conversion", value: `${conversion}%`, sub: "↑ 8pts vs. last month", accent: false },
              { label: "Deposit Collection", value: `${depRate}%`, sub: "Fully automated", accent: true },
            ].map(({ label, value, sub, accent }, i) => (
              <div key={label} style={{ padding: "20px 24px", borderRight: i < 2 ? "1px solid #1C1C1C" : "none" }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "#404040", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "6px" }}>{label}</div>
                <div style={{ fontFamily: "var(--font-serif)", fontSize: "28px", color: accent ? "#86EFAC" : "#E8E0D0", lineHeight: "1", marginBottom: "4px", fontVariantNumeric: "tabular-nums" }}>{value}</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "#606060" }}>{sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      </div>{/* /content wrapper */}
    </section>
  );
}
