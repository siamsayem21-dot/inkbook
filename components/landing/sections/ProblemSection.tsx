"use client";

import { useEffect, useRef } from "react";

const LOSSES = [
  { amount: "$600", label: "average no-show cost", sub: "A full half-day blocked. No deposit held. No cancellation fee collected." },
  { amount: "3 hrs", label: "per artist per week on DMs", sub: "Screening 'what's your minimum?' messages instead of tattooing." },
  { amount: "40%", label: "of inquiries never replied to", sub: "2 in every 5 serious leads — gone to competitors or forgotten." },
  { amount: "$26k", label: "lost per studio per year", sub: "This is what running a tattoo studio on the wrong tools actually costs." },
];

const TOOLS = [
  { name: "Instagram DMs", note: "4 unread", urgent: true },
  { name: "WhatsApp", note: "Follow-up overdue", urgent: true },
  { name: "Calendly", note: "No deposit collected", urgent: false },
  { name: "Google Sheets", note: "Out of sync", urgent: false },
  { name: "Venmo", note: "Manually requested", urgent: false },
  { name: "Paper Forms", note: "Not backed up", urgent: false },
];

export default function ProblemSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.querySelectorAll<HTMLElement>(".reveal").forEach((node, i) => {
            setTimeout(() => node.classList.add("in-view"), i * 70);
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
      style={{ padding: "128px 0", background: "#0A0A0A" }}
    >
      <div className="mx-auto" style={{ maxWidth: "1120px", padding: "0 40px" }}>

        {/* Header */}
        <div className="reveal stagger-1" style={{ marginBottom: "64px" }}>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#525252", marginBottom: "20px" }}>
            The real cost
          </p>
          <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(36px, 5vw, 64px)", color: "#F5F5F5", lineHeight: "1.05", letterSpacing: "-0.02em", maxWidth: "680px", marginBottom: "24px" }}>
            That no-show wasn&apos;t bad luck. It was a system failure.
          </h2>
          <p style={{ fontFamily: "var(--font-sans)", fontSize: "17px", color: "#707070", lineHeight: "1.65", maxWidth: "520px" }}>
            The deposit never collected. The DM never answered. The lead that went cold because you were tattooing. Every week without the right system, these losses repeat. Studios that actually track the numbers are shocked by what adds up.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-12 items-start">

          {/* Left — Loss breakdown */}
          <div>
            <div
              className="reveal stagger-2"
              style={{ background: "#111111", border: "1px solid #1E1E1E", borderRadius: "14px", overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)" }}
            >
              <div style={{ padding: "14px 20px", borderBottom: "1px solid #1A1A1A", background: "#0D0D0D" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "#484848", textTransform: "uppercase", letterSpacing: "0.07em" }}>Revenue leaking right now</span>
              </div>
              {LOSSES.map((item, i) => (
                <div
                  key={item.label}
                  style={{
                    padding: "20px",
                    borderBottom: i < LOSSES.length - 1 ? "1px solid #161616" : "none",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "20px",
                  }}
                >
                  <div style={{ flexShrink: 0, minWidth: "64px" }}>
                    <div style={{ fontFamily: "var(--font-serif)", fontSize: "28px", color: i === 3 ? "#E8E0D0" : "#D0D0D0", lineHeight: "1", fontVariantNumeric: "tabular-nums" }}>
                      {item.amount}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontFamily: "var(--font-sans)", fontSize: "14px", color: "#909090", fontWeight: 500, marginBottom: "4px" }}>
                      {item.label}
                    </div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "#484848" }}>
                      {item.sub}
                    </div>
                  </div>
                </div>
              ))}
              <div style={{ padding: "14px 20px", background: "#0D0D0D", borderTop: "1px solid #1A1A1A" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "#363636" }}>Based on 50-studio analysis · USA/Canada market</span>
              </div>
            </div>
          </div>

          {/* Right — Tool chaos */}
          <div className="reveal stagger-3">
            <p style={{ fontFamily: "var(--font-sans)", fontSize: "15px", color: "#606060", lineHeight: "1.7", marginBottom: "28px" }}>
              The average tattoo studio manages client relationships across six different tools — none of which talk to each other. A client who DMs on Instagram, books through Calendly, pays via Venmo, and signs a paper form exists in four separate systems. Or none.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {TOOLS.map((tool) => (
                <div
                  key={tool.name}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "11px 16px",
                    background: "#111111",
                    border: `1px solid ${tool.urgent ? "#2A2A2A" : "#1A1A1A"}`,
                    borderRadius: "8px",
                    gap: "12px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ fontFamily: "var(--font-sans)", fontSize: "13px", color: "#666666" }}>
                      {tool.name}
                    </span>
                  </div>
                  <span style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "10px",
                    color: tool.urgent ? "#E05555" : "#404040",
                    background: tool.urgent ? "rgba(224,85,85,0.08)" : "transparent",
                    border: tool.urgent ? "1px solid rgba(224,85,85,0.2)" : "none",
                    padding: tool.urgent ? "2px 7px" : "0",
                    borderRadius: "4px",
                    whiteSpace: "nowrap",
                  }}>
                    {tool.note}
                  </span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: "20px", padding: "14px 16px", background: "#0D0D0D", border: "1px solid #1A1A1A", borderRadius: "8px" }}>
              <span style={{ fontFamily: "var(--font-sans)", fontSize: "13px", color: "#505050", lineHeight: "1.5" }}>
                None of these tools were built for tattoo studios. They were built for everyone — which means they were built for no one in particular.
              </span>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
