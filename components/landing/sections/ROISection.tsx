"use client";

import { useEffect, useRef } from "react";

const VALUE_BLOCKS = [
  {
    scenario: "One no-show prevented",
    body: "Deposits are collected automatically and kept if a client cancels. A single protected appointment typically covers weeks of InkBook.",
    metric: "$49/mo",
    versus: "vs. one tattoo session",
    accent: "#86EFAC",
    accentBg: "rgba(134,239,172,0.06)",
    accentBorder: "rgba(134,239,172,0.15)",
  },
  {
    scenario: "One cold lead recovered",
    body: "A lead that went quiet is not a lost lead. AI follow-up reactivates conversations that would have gone to a competitor — automatically.",
    metric: "1 inquiry",
    versus: "= months of InkBook",
    accent: "#93C5FD",
    accentBg: "rgba(147,197,253,0.06)",
    accentBorder: "rgba(147,197,253,0.15)",
  },
  {
    scenario: "One hour back per day",
    body: "Every hour not spent on DMs, intake messages, and follow-ups is an hour available for paid work. At any studio rate, that math writes itself.",
    metric: "3 hrs/wk",
    versus: "= 1 extra session",
    accent: "#E8E0D0",
    accentBg: "rgba(232,224,208,0.05)",
    accentBorder: "rgba(232,224,208,0.12)",
  },
];

export default function ROISection() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.querySelectorAll<HTMLElement>(".reveal").forEach((node, i) => {
            setTimeout(() => node.classList.add("in-view"), i * 90);
          });
          observer.disconnect();
        }
      },
      { threshold: 0.12 }
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
        <div style={{ marginBottom: "64px" }}>
          <p
            className="reveal stagger-1"
            style={{ fontFamily: "var(--font-mono)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#525252", marginBottom: "20px" }}
          >
            Simple math
          </p>
          <h2
            className="reveal stagger-2"
            style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(36px, 5vw, 62px)", color: "#F5F5F5", lineHeight: "1.05", letterSpacing: "-0.02em", maxWidth: "640px", marginBottom: "20px" }}
          >
            What is one missed booking worth?
          </h2>
          <p
            className="reveal stagger-3"
            style={{ fontFamily: "var(--font-sans)", fontSize: "17px", color: "#707070", lineHeight: "1.65", maxWidth: "520px" }}
          >
            A missed booking is a deposit not collected, a lead that went to a competitor, and a time slot you can&apos;t recover. InkBook starts at $49/mo. A single recovered booking covers your entire month.
          </p>
        </div>

        {/* Value blocks */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 reveal stagger-4" style={{ marginBottom: "32px" }}>
          {VALUE_BLOCKS.map((block) => (
            <div
              key={block.scenario}
              style={{
                background: "#181818",
                border: "1px solid #2A2A2A",
                borderRadius: "14px",
                padding: "28px 28px 24px",
                display: "flex",
                flexDirection: "column",
                boxShadow: "0 4px 16px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Accent top line */}
              <div
                aria-hidden
                style={{
                  position: "absolute",
                  top: 0, left: "20px", right: "20px",
                  height: "1px",
                  background: `linear-gradient(90deg, transparent, ${block.accent}44, transparent)`,
                }}
              />

              {/* Scenario label */}
              <p
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "10px",
                  textTransform: "uppercase",
                  letterSpacing: "0.07em",
                  color: "#484848",
                  marginBottom: "16px",
                }}
              >
                {block.scenario}
              </p>

              {/* Body */}
              <p
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "14px",
                  color: "#707070",
                  lineHeight: "1.65",
                  flex: 1,
                  marginBottom: "24px",
                }}
              >
                {block.body}
              </p>

              {/* Metric pill */}
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "8px 14px",
                  background: block.accentBg,
                  border: `1px solid ${block.accentBorder}`,
                  borderRadius: "8px",
                  alignSelf: "flex-start",
                }}
              >
                <span style={{ fontFamily: "var(--font-serif)", fontSize: "20px", color: block.accent, lineHeight: "1" }}>
                  {block.metric}
                </span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: block.accent, opacity: 0.6 }}>
                  {block.versus}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Closing conviction line */}
        <div
          className="reveal stagger-5"
          style={{
            padding: "20px 28px",
            background: "#0E0E0E",
            border: "1px solid #1A1A1A",
            borderRadius: "10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "16px",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "clamp(16px, 2vw, 20px)",
              color: "#C0C0C0",
              lineHeight: "1.4",
              letterSpacing: "-0.01em",
            }}
          >
            The question isn&apos;t whether InkBook pays for itself. It&apos;s how quickly.
          </span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "#363636", whiteSpace: "nowrap" }}>
            Starts at $49/mo · No booking fees · Cancel anytime
          </span>
        </div>

      </div>
    </section>
  );
}
