"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const STAGES = ["New Inquiry", "Consultation", "Quote Sent", "Deposit Paid", "Booked"];

const LEADS = [
  { initials: "JM", name: "Jordan M.", style: "Blackwork Sleeve", placement: "Full forearm", budget: "$400–600", stage: "Consultation", stageColor: "#E8E0D0", stageBorder: "rgba(232,224,208,0.25)" },
  { initials: "MR", name: "Maya R.", style: "Fine Line Floral", placement: "Inner wrist", budget: "$200–300", stage: "Quote Sent", stageColor: "#A0A0A0", stageBorder: "#2A2A2A" },
  { initials: "CT", name: "Carlos T.", style: "Neo-Trad Phoenix", placement: "Full back", budget: "$800–1,200", stage: "Deposit Paid", stageColor: "#86EFAC", stageBorder: "rgba(134,239,172,0.2)" },
  { initials: "AK", name: "Alex K.", style: "Geometric Mandala", placement: "Chest piece", budget: "$300–500", stage: "New Inquiry", stageColor: "#525252", stageBorder: "#2A2A2A" },
  { initials: "SL", name: "Sam L.", style: "Japanese Koi", placement: "Leg sleeve", budget: "$1,500–2,000", stage: "Booked", stageColor: "#A0A0A0", stageBorder: "#2A2A2A" },
];

const NAV = ["Pipeline", "Clients", "Artists", "Revenue", "Settings"];

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
  const [rowsVisible, setRowsVisible] = useState(false);
  const [activeStage, setActiveStage] = useState(1);
  const [revenue, setRevenue] = useState(0);
  const [conversion, setConversion] = useState(0);
  const [depRate, setDepRate] = useState(0);

  useEffect(() => {
    setMounted(true);
    // Stagger: rows appear after chrome loads
    setTimeout(() => setRowsVisible(true), 700);
    // Counters fire after rows settle
    setTimeout(() => {
      countUp(18240, 1600, setRevenue);
      countUp(73, 1200, setConversion);
      countUp(94, 1000, setDepRate);
    }, 900);
    // Cycling pipeline stage highlight
    const cycle = setInterval(() => {
      setActiveStage(p => (p + 1) % STAGES.length);
    }, 2200);
    return () => clearInterval(cycle);
  }, []);

  const fmtRevenue = `$${revenue.toLocaleString()}`;

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
      {/* Ambient top glow */}
      <div
        aria-hidden
        className="animate-ambient-drift pointer-events-none absolute -top-1/4 left-1/2 -translate-x-1/2 -z-10"
        style={{
          width: "1100px",
          height: "700px",
          borderRadius: "50%",
          background: "radial-gradient(ellipse, rgba(232,224,208,0.11) 0%, rgba(232,224,208,0.03) 50%, transparent 70%)",
          filter: "blur(2px)",
        }}
      />

      {/* Eyebrow */}
      <div className={`mb-8 transition-all duration-500 ${mounted ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}>
        <span
          className="inline-block text-[#525252] uppercase"
          style={{ fontFamily: "var(--font-mono)", fontSize: "11px", letterSpacing: "0.1em", border: "1px solid #2A2A2A", background: "#161616", padding: "6px 14px", borderRadius: "100px", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)" }}
        >
          AI-Powered Tattoo Studio Operating System
        </span>
      </div>

      {/* Headline */}
      <h1
        className={`text-[#F5F5F5] text-center max-w-[720px] mb-6 transition-all duration-700 delay-100 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
        style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(52px, 7vw, 88px)", lineHeight: "1.05", letterSpacing: "-0.03em" }}
      >
        Turn tattoo inquiries into paid bookings.
      </h1>

      {/* Sub */}
      <p
        className={`text-[#A0A0A0] max-w-[520px] mb-10 transition-all duration-500 delay-200 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}
        style={{ fontFamily: "var(--font-sans)", fontSize: "18px", lineHeight: "1.65" }}
      >
        InkBook is the operating system for modern tattoo studios. One platform from first inquiry to completed tattoo.
      </p>

      {/* CTAs */}
      <div
        className={`flex flex-col sm:flex-row items-center gap-3 mb-12 transition-all duration-500 delay-300 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}
      >
        <Link href="#" className="btn-primary" style={{ fontFamily: "var(--font-sans)", fontSize: "14px", fontWeight: 500, padding: "13px 28px", borderRadius: "8px", textDecoration: "none", display: "inline-block" }}>
          Get Early Access
        </Link>
        <Link href="#workflow" className="btn-secondary" style={{ fontFamily: "var(--font-sans)", fontSize: "14px", color: "#A0A0A0", border: "1px solid #1F1F1F", padding: "13px 28px", borderRadius: "8px", textDecoration: "none", display: "inline-block" }}>
          See How It Works
        </Link>
      </div>

      {/* Hero visual — full-width living app shell */}
      <div
        className={`w-full mx-auto transition-all duration-700 delay-500 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
        style={{ maxWidth: "1120px" }}
      >
        <div
          className="surface-floating"
          style={{ background: "#1A1A1A", border: "1px solid #2E2E2E", borderRadius: "16px", overflow: "hidden" }}
        >
          {/* Window chrome */}
          <div style={{ background: "#111111", borderBottom: "1px solid #242424", padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", gap: "6px" }}>
              {["#505050", "#505050", "#505050"].map((c, i) => (
                <div key={i} aria-hidden style={{ width: "10px", height: "10px", borderRadius: "50%", background: c }} />
              ))}
            </div>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "#525252" }}>Studio Portal · Ink & Iron Studio</span>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span className="animate-pulse-dot" aria-hidden style={{ display: "inline-block", width: "6px", height: "6px", borderRadius: "50%", background: "#4ADE80" }} />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "#525252" }}>Live</span>
            </div>
          </div>

          {/* App body */}
          <div style={{ display: "flex" }}>
            {/* Sidebar */}
            <div className="hidden md:flex flex-col" style={{ width: "180px", borderRight: "1px solid #242424", background: "#111111", flexShrink: 0 }}>
              <div style={{ padding: "16px", borderBottom: "1px solid #242424" }}>
                <div style={{ fontFamily: "var(--font-serif)", fontSize: "14px", color: "#F5F5F5" }}>Ink & Iron</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "#525252", marginTop: "2px" }}>Studio Plan · 6 artists</div>
              </div>
              <nav style={{ padding: "8px 0", flex: 1 }}>
                {NAV.map((item, i) => (
                  <div key={item} style={{ padding: "9px 16px", background: i === 0 ? "rgba(232,224,208,0.08)" : "transparent", borderLeft: i === 0 ? "2px solid #E8E0D0" : "2px solid transparent", fontFamily: "var(--font-sans)", fontSize: "13px", color: i === 0 ? "#F5F5F5" : "#525252", transition: "color 150ms" }}>
                    {item}
                  </div>
                ))}
              </nav>
              <div style={{ padding: "12px 16px", borderTop: "1px solid #242424" }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "#525252", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>Online now</div>
                {[["Sarah M.", true], ["Jake R.", true], ["Mia C.", false]].map(([name, on]) => (
                  <div key={String(name)} style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "5px" }}>
                    <span className={on ? "animate-pulse-dot" : ""} style={{ display: "inline-block", width: "5px", height: "5px", borderRadius: "50%", background: on ? "#4ADE80" : "#3A3A3A", flexShrink: 0 }} />
                    <span style={{ fontFamily: "var(--font-sans)", fontSize: "11px", color: on ? "#A0A0A0" : "#525252" }}>{String(name)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Main content */}
            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Stage tabs — cycling active state */}
              <div style={{ padding: "14px 20px", borderBottom: "1px solid #242424", overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
                <div style={{ display: "flex", gap: "4px", minWidth: "max-content" }}>
                  {STAGES.map((stage, i) => {
                    const isActive = i === activeStage;
                    return (
                      <div
                        key={stage}
                        style={{
                          padding: "6px 12px",
                          background: isActive ? "rgba(232,224,208,0.12)" : "transparent",
                          border: `1px solid ${isActive ? "rgba(232,224,208,0.35)" : "#2A2A2A"}`,
                          borderRadius: "6px",
                          fontFamily: "var(--font-mono)",
                          fontSize: "11px",
                          color: isActive ? "#E8E0D0" : "#525252",
                          whiteSpace: "nowrap",
                          transition: "all 400ms cubic-bezier(0.16,1,0.3,1)",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        {stage}
                        {i === 1 && <span style={{ background: isActive ? "rgba(232,224,208,0.22)" : "#252525", borderRadius: "100px", padding: "0 6px", fontSize: "10px", color: isActive ? "#E8E0D0" : "#525252", transition: "all 400ms" }}>4</span>}
                        {i === 2 && <span style={{ background: "#252525", borderRadius: "100px", padding: "0 6px", fontSize: "10px", color: "#525252" }}>2</span>}
                        {i === 3 && <span style={{ background: "#252525", borderRadius: "100px", padding: "0 6px", fontSize: "10px", color: "#525252" }}>1</span>}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Lead table — rows stagger in */}
              <div>
                {/* Desktop header */}
                <div className="hidden sm:grid" style={{ gridTemplateColumns: "1fr 150px 90px 130px", padding: "8px 20px", background: "#111111", borderBottom: "1px solid #202020" }}>
                  {["Client", "Style · Placement", "Budget", "Status"].map(h => (
                    <span key={h} style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "#525252", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</span>
                  ))}
                </div>

                {LEADS.map((lead, i) => (
                  <div
                    key={lead.name}
                    style={{
                      opacity: rowsVisible ? 1 : 0,
                      transform: rowsVisible ? "none" : "translateY(6px)",
                      transition: `opacity 450ms ${i * 55}ms var(--ease-out), transform 450ms ${i * 55}ms var(--ease-out)`,
                      borderBottom: i < LEADS.length - 1 ? "1px solid #202020" : "none",
                      background: i === 0 ? "rgba(232,224,208,0.04)" : "transparent",
                    }}
                  >
                    {/* Desktop row */}
                    <div className="hidden sm:grid" style={{ gridTemplateColumns: "1fr 150px 90px 130px", padding: "12px 20px", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "#252525", border: "1px solid #383838", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: "9px", color: "#525252" }}>{lead.initials}</span>
                        </div>
                        <span style={{ fontFamily: "var(--font-sans)", fontSize: "13px", color: "#F5F5F5" }}>{lead.name}</span>
                      </div>
                      <div>
                        <div style={{ fontFamily: "var(--font-sans)", fontSize: "12px", color: "#A0A0A0" }}>{lead.style}</div>
                        <div style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "#525252", marginTop: "1px" }}>{lead.placement}</div>
                      </div>
                      <span style={{ fontFamily: "var(--font-sans)", fontSize: "12px", color: "#A0A0A0" }}>{lead.budget}</span>
                      <div>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: lead.stageColor, border: `1px solid ${lead.stageBorder}`, padding: "3px 9px", borderRadius: "100px" }}>
                          {lead.stage}
                        </span>
                      </div>
                    </div>
                    {/* Mobile row */}
                    {i < 3 && (
                      <div className="sm:hidden" style={{ padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div>
                          <div style={{ fontFamily: "var(--font-sans)", fontSize: "13px", color: "#F5F5F5" }}>{lead.name}</div>
                          <div style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "#525252", marginTop: "2px" }}>{lead.style}</div>
                        </div>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: lead.stageColor, border: `1px solid ${lead.stageBorder}`, padding: "3px 8px", borderRadius: "100px" }}>
                          {lead.stage}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Stats strip — animated counters */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", borderTop: "1px solid #242424", background: "#111111" }}>
            {[
              { label: "Monthly Revenue", value: fmtRevenue, sub: "↑ 23% this month" },
              { label: "Conversion Rate", value: `${conversion}%`, sub: "↑ 8pts vs. last month" },
              { label: "Deposit Rate", value: `${depRate}%`, sub: "Auto-collected" },
            ].map(({ label, value, sub }, i) => (
              <div key={label} style={{ padding: "16px 24px", borderRight: i < 2 ? "1px solid #242424" : "none" }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "#525252", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>{label}</div>
                <div style={{ fontFamily: "var(--font-serif)", fontSize: "22px", color: "#F5F5F5", lineHeight: "1", marginBottom: "2px", fontVariantNumeric: "tabular-nums" }}>{value}</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "#A0A0A0" }}>{sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
