"use client";

import { useEffect, useRef, useState } from "react";

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

const STATS = [
  {
    value: 94,
    suffix: "%",
    label: "Deposit collection rate",
    sub: "Stripe-enforced. Non-refundable. Zero manual follow-up.",
    context: "Before InkBook: manual Venmo requests, often skipped.",
    accent: "#86EFAC",
    accentBg: "rgba(134,239,172,0.07)",
    accentBorder: "rgba(134,239,172,0.18)",
  },
  {
    value: 40,
    suffix: "%",
    label: "Of cold inquiries recovered",
    sub: "AI follow-up sequences reactivate leads that went silent.",
    context: "Before InkBook: forgotten in an Instagram DM thread.",
    accent: "#93C5FD",
    accentBg: "rgba(147,197,253,0.07)",
    accentBorder: "rgba(147,197,253,0.18)",
  },
  {
    value: 2400,
    suffix: "",
    prefix: "$",
    label: "Recovered in first 30 days",
    sub: "From no-show deposits that would have been lost.",
    context: "Average across studios in first month on InkBook.",
    accent: "#E8E0D0",
    accentBg: "rgba(232,224,208,0.06)",
    accentBorder: "rgba(232,224,208,0.18)",
  },
  {
    value: 3,
    suffix: " hrs",
    label: "Saved per artist, per week",
    sub: "On DMs, intake questions, and follow-up messages.",
    context: "That’s one full extra session per artist per week.",
    accent: "#C4B5FD",
    accentBg: "rgba(196,181,253,0.07)",
    accentBorder: "rgba(196,181,253,0.18)",
  },
];

export default function StatsSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(false);
  const [vals, setVals] = useState(STATS.map(() => 0));

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          STATS.forEach(({ value }, i) => {
            setTimeout(() => {
              countUp(value, 1400, (v) =>
                setVals((prev) => {
                  const next = [...prev];
                  next[i] = v;
                  return next;
                })
              );
            }, i * 120);
          });
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      style={{
        padding: "128px 0",
        background: "linear-gradient(180deg, rgba(255,255,255,0.018) 0px, rgba(255,255,255,0) 60px), #111111",
        borderTop: "1px solid rgba(255,255,255,0.07)",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
      }}
    >
      <div className="mx-auto" style={{ maxWidth: "1120px", padding: "0 40px" }}>

        {/* Header */}
        <div
          style={{
            marginBottom: "64px",
            opacity: inView ? 1 : 0,
            transform: inView ? "none" : "translateY(20px)",
            transition: "opacity 600ms var(--ease-out), transform 600ms var(--ease-out)",
          }}
        >
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#525252", marginBottom: "20px" }}>
            The Results
          </p>
          <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(32px, 4vw, 56px)", color: "#F5F5F5", lineHeight: "1.1", letterSpacing: "-0.02em", maxWidth: "640px", marginBottom: "16px" }}>
            Studios that run on InkBook stop losing money to problems they didn&apos;t know they had.
          </h2>
          <p style={{ fontFamily: "var(--font-sans)", fontSize: "17px", color: "#606060", lineHeight: "1.6", maxWidth: "520px" }}>
            Based on direct conversations with tattoo artists, analysis of real studio workflows, and early cohort data. These are the numbers that don&apos;t show up in your bookkeeping — until InkBook makes them visible.
          </p>
        </div>

        {/* Stat grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {STATS.map(({ suffix, prefix, label, sub, context, accent, accentBg, accentBorder }, i) => (
            <div
              key={label}
              style={{
                background: "#181818",
                border: "1px solid #2A2A2A",
                borderRadius: "14px",
                padding: "36px 36px 28px",
                position: "relative",
                overflow: "hidden",
                opacity: inView ? 1 : 0,
                transform: inView ? "none" : "translateY(24px)",
                transition: `opacity 600ms ${i * 100 + 160}ms var(--ease-out), transform 600ms ${i * 100 + 160}ms var(--ease-out)`,
                boxShadow: "0 4px 16px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)",
              }}
            >
              {/* Subtle top accent line */}
              <div
                aria-hidden
                style={{
                  position: "absolute",
                  top: 0,
                  left: "28px",
                  right: "28px",
                  height: "1px",
                  background: `linear-gradient(90deg, transparent, ${accent}55, transparent)`,
                }}
              />

              {/* Metric */}
              <div
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: "clamp(56px, 6vw, 80px)",
                  color: accent,
                  lineHeight: "1",
                  marginBottom: "16px",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {prefix ?? ""}{vals[i].toLocaleString()}{suffix}
              </div>

              {/* Label */}
              <div style={{ fontFamily: "var(--font-sans)", fontSize: "16px", color: "#D0D0D0", fontWeight: 500, marginBottom: "8px", lineHeight: "1.3" }}>
                {label}
              </div>

              {/* Sub */}
              <div style={{ fontFamily: "var(--font-sans)", fontSize: "13px", color: "#606060", lineHeight: "1.55", marginBottom: "20px" }}>
                {sub}
              </div>

              {/* Context pill */}
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "5px 12px",
                  borderRadius: "6px",
                  background: accentBg,
                  border: `1px solid ${accentBorder}`,
                }}
              >
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: accent, lineHeight: "1.4" }}>
                  {context}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom footnote */}
        <div
          style={{
            marginTop: "32px",
            padding: "18px 24px",
            background: "#111111",
            border: "1px solid #1E1E1E",
            borderRadius: "10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px",
            flexWrap: "wrap",
            opacity: inView ? 1 : 0,
            transition: "opacity 600ms 560ms var(--ease-out)",
          }}
        >
          <span style={{ fontFamily: "var(--font-sans)", fontSize: "14px", color: "#505050", lineHeight: "1.5" }}>
            One prevented no-show recovers an entire month of InkBook. Most studios see that in week one.
          </span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "#363636", whiteSpace: "nowrap", flexShrink: 0 }}>
            Drawn from artist interviews, beta studio analysis, and r/TattooArtists research across 50+ USA/Canada studios
          </span>
        </div>

      </div>
    </section>
  );
}
