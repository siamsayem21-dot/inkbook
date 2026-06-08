"use client";

import { useEffect, useRef, useState } from "react";

const FEATURES = ["Revenue tracking", "Lead conversion rates", "Artist utilization"];

const BAR_DATA = [
  { mo: "Aug", target: 38 },
  { mo: "Sep", target: 50 },
  { mo: "Oct", target: 42 },
  { mo: "Nov", target: 58 },
  { mo: "Dec", target: 52 },
  { mo: "Jan", target: 72 },
];

const PIPELINE = [
  { stage: "New Inquiry",  count: 18, pct: 100 },
  { stage: "Consultation", count: 13, pct: 72 },
  { stage: "Quote Sent",   count: 8,  pct: 44 },
  { stage: "Deposit Paid", count: 6,  pct: 33 },
];

const ARTISTS = [
  { name: "Sarah M.", util: 92 },
  { name: "Jake R.",  util: 78 },
  { name: "Mia C.",   util: 65 },
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

export default function OwnerSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(false);
  const [revenue, setRevenue] = useState(0);
  const [conv, setConv] = useState(0);
  const [barHeights, setBarHeights] = useState(BAR_DATA.map(() => 0));
  const [pipelinePcts, setPipelinePcts] = useState(PIPELINE.map(() => 0));
  const [artistUtils, setArtistUtils] = useState(ARTISTS.map(() => 0));

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          setTimeout(() => {
            // Counters
            countUp(18240, 1600, setRevenue);
            countUp(73, 1200, setConv);
            // Bars: stagger each bar
            BAR_DATA.forEach(({ target }, i) => {
              setTimeout(() => {
                const start = performance.now();
                function tick(now: number) {
                  const p = Math.min((now - start) / 700, 1);
                  const eased = 1 - Math.pow(1 - p, 2);
                  setBarHeights(prev => {
                    const next = [...prev];
                    next[i] = Math.round(target * eased);
                    return next;
                  });
                  if (p < 1) requestAnimationFrame(tick);
                }
                requestAnimationFrame(tick);
              }, i * 60);
            });
            // Pipeline bars
            setTimeout(() => {
              const start = performance.now();
              function tick(now: number) {
                const p = Math.min((now - start) / 800, 1);
                const eased = 1 - Math.pow(1 - p, 3);
                setPipelinePcts(PIPELINE.map(({ pct }) => Math.round(pct * eased)));
                if (p < 1) requestAnimationFrame(tick);
              }
              requestAnimationFrame(tick);
            }, 300);
            // Artist bars
            setTimeout(() => {
              const start = performance.now();
              function tick(now: number) {
                const p = Math.min((now - start) / 900, 1);
                const eased = 1 - Math.pow(1 - p, 3);
                setArtistUtils(ARTISTS.map(({ util }) => Math.round(util * eased)));
                if (p < 1) requestAnimationFrame(tick);
              }
              requestAnimationFrame(tick);
            }, 400);
          }, 200);
          observer.disconnect();
        }
      },
      { threshold: 0.12 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const fmtRev = `$${revenue.toLocaleString()}`;

  return (
    <section
      id="studio"
      ref={sectionRef}
      style={{ padding: "128px 0", background: "linear-gradient(180deg, rgba(255,255,255,0.018) 0px, rgba(255,255,255,0) 60px), #111111", borderTop: "1px solid rgba(255,255,255,0.07)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}
    >
      <div className="mx-auto" style={{ maxWidth: "1120px", padding: "0 40px" }}>
        <div className="grid md:grid-cols-[1fr_1.6fr] gap-16 items-start">

          {/* Left — copy */}
          <div className="md:pt-6">
            <p
              style={{ fontFamily: "var(--font-mono)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#525252", marginBottom: "24px", opacity: inView ? 1 : 0, transform: inView ? "none" : "translateY(16px)", transition: "opacity 600ms var(--ease-out), transform 600ms var(--ease-out)" }}
            >
              Studio Intelligence
            </p>
            <h2
              style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(28px, 3.5vw, 48px)", color: "#F5F5F5", lineHeight: "1.12", maxWidth: "440px", marginBottom: "24px", opacity: inView ? 1 : 0, transform: inView ? "none" : "translateY(20px)", transition: "opacity 700ms 80ms var(--ease-out), transform 700ms 80ms var(--ease-out)" }}
            >
              Know exactly how your studio is performing.
            </h2>
            <p
              style={{ fontFamily: "var(--font-sans)", fontSize: "17px", color: "#A0A0A0", lineHeight: "1.6", marginBottom: "32px", opacity: inView ? 1 : 0, transform: inView ? "none" : "translateY(16px)", transition: "opacity 600ms 160ms var(--ease-out), transform 600ms 160ms var(--ease-out)" }}
            >
              Revenue, lead conversion, artist utilization, booking trends. All in one place. No spreadsheets. No guesswork.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", opacity: inView ? 1 : 0, transition: "opacity 600ms 240ms var(--ease-out)" }}>
              {FEATURES.map(f => (
                <div key={f} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#525252", flexShrink: 0 }} />
                  <span style={{ fontFamily: "var(--font-sans)", fontSize: "15px", color: "#A0A0A0" }}>{f}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right — analytics panel */}
          <div style={{ opacity: inView ? 1 : 0, transform: inView ? "none" : "translateY(24px)", transition: "opacity 700ms 160ms var(--ease-out), transform 700ms 160ms var(--ease-out)" }}>
            <div
              className="surface-floating"
              style={{ background: "#1A1A1A", border: "1px solid #2E2E2E", borderRadius: "16px", overflow: "hidden" }}
            >
              {/* Header */}
              <div style={{ padding: "14px 20px", borderBottom: "1px solid #242424", background: "#111111", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "#525252" }}>Owner Dashboard · Ink & Iron Studio</span>
                <div style={{ display: "flex", gap: "4px" }}>
                  {["7D", "30D", "90D"].map((p, i) => (
                    <span key={p} style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: i === 1 ? "#F5F5F5" : "#525252", background: i === 1 ? "#252525" : "transparent", border: `1px solid ${i === 1 ? "#383838" : "transparent"}`, padding: "2px 8px", borderRadius: "4px" }}>
                      {p}
                    </span>
                  ))}
                </div>
              </div>

              {/* Revenue + bar chart */}
              <div style={{ padding: "24px", borderBottom: "1px solid #242424" }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "#525252", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>Monthly Revenue</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: "12px", marginBottom: "4px" }}>
                  <span style={{ fontFamily: "var(--font-serif)", fontSize: "48px", color: "#F5F5F5", lineHeight: "1", fontVariantNumeric: "tabular-nums" }}>{fmtRev}</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "#4ADE80" }}>↑ 23%</span>
                </div>
                <div style={{ fontFamily: "var(--font-sans)", fontSize: "12px", color: "#525252", marginBottom: "24px" }}>vs. $14,830 last month</div>

                {/* Bar chart — animated */}
                <div style={{ display: "flex", alignItems: "flex-end", gap: "6px", height: "80px" }}>
                  {BAR_DATA.map(({ mo }, i) => (
                    <div key={mo} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
                      <div
                        style={{
                          width: "100%",
                          height: `${barHeights[i]}px`,
                          background: i === BAR_DATA.length - 1 ? "#E8E0D0" : "#2C2C2C",
                          borderRadius: "3px 3px 0 0",
                          transition: "height 0ms", // height is set by JS
                          boxShadow: i === BAR_DATA.length - 1 ? "0 0 12px rgba(232,224,208,0.15)" : "none",
                        }}
                      />
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "9px", color: i === BAR_DATA.length - 1 ? "#525252" : "#2A2A2A" }}>{mo}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Metrics row */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", borderBottom: "1px solid #242424" }}>
                {[
                  { label: "Conversion", value: `${conv}%`, sub: "↑ 8pts" },
                  { label: "Active Projects", value: "24" },
                  { label: "Artists Booked", value: "6 / 6" },
                ].map(({ label, value, sub }, i) => (
                  <div key={label} style={{ padding: "16px", borderRight: i < 2 ? "1px solid #242424" : "none" }}>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "#525252", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "6px" }}>{label}</div>
                    <div style={{ fontFamily: "var(--font-serif)", fontSize: "28px", color: "#F5F5F5", lineHeight: "1", fontVariantNumeric: "tabular-nums" }}>{value}</div>
                    {sub && <div style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "#A0A0A0", marginTop: "3px" }}>{sub}</div>}
                  </div>
                ))}
              </div>

              {/* Pipeline + Artist utilization */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
                <div style={{ padding: "16px 20px", borderRight: "1px solid #242424" }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "#525252", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "14px" }}>Pipeline</div>
                  {PIPELINE.map(({ stage, count }, i) => (
                    <div key={stage} style={{ marginBottom: "11px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                        <span style={{ fontFamily: "var(--font-sans)", fontSize: "11px", color: "#A0A0A0" }}>{stage}</span>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "#525252" }}>{count}</span>
                      </div>
                      <div style={{ height: "2px", background: "#222222", borderRadius: "1px" }}>
                        <div style={{ height: "100%", width: `${pipelinePcts[i]}%`, background: "#3A3A3A", borderRadius: "1px", transition: "width 0ms" }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ padding: "16px 20px" }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "#525252", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "14px" }}>Artist Utilization</div>
                  {ARTISTS.map(({ name }, i) => (
                    <div key={name} style={{ marginBottom: "11px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                        <span style={{ fontFamily: "var(--font-sans)", fontSize: "11px", color: "#A0A0A0" }}>{name}</span>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "#525252" }}>{artistUtils[i]}%</span>
                      </div>
                      <div style={{ height: "2px", background: "#222222", borderRadius: "1px" }}>
                        <div style={{ height: "100%", width: `${artistUtils[i]}%`, background: artistUtils[i] > 85 ? "#E8E0D0" : "#3A3A3A", borderRadius: "1px", boxShadow: artistUtils[i] > 85 ? "0 0 8px rgba(232,224,208,0.3)" : "none", transition: "width 0ms" }} />
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
  );
}
