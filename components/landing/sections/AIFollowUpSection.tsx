"use client";

import { useEffect, useRef } from "react";

const TIMELINE = [
  { day: "Day 0", label: "Session ends", sub: "Aftercare instructions sent automatically via SMS", done: true, time: "Feb 12 · 6:04 PM" },
  { day: "Day 3", label: "Healing check", sub: '"How\'s your tattoo healing?" — automated follow-up', done: true, time: "Feb 15 · 10:00 AM" },
  { day: "Day 7", label: "Photo check-in", sub: "Client asked to share a healing photo", done: false, time: "Feb 19 · 10:00 AM" },
  { day: "Day 14", label: "Review request", sub: "Google review request sent — high completion rate", done: false, time: "Feb 26 · 10:00 AM" },
];

const POINTS = [
  "Clients who hear from you after their tattoo come back for more work",
  "Automated healing check-ins build loyalty without requiring your time",
  "Review requests at Day 14 convert satisfied clients into Google ratings",
  "Rebooking prompts at Day 30 turn one-time visits into long-term clients",
];

export default function AIFollowUpSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.querySelectorAll<HTMLElement>(".reveal").forEach((node, i) => {
            setTimeout(() => node.classList.add("in-view"), i * 80);
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
        background: "#0A0A0A",
        borderTop: "1px solid rgba(255,255,255,0.04)",
      }}
    >
      <div className="mx-auto" style={{ maxWidth: "1120px", padding: "0 40px" }}>
        <div className="grid md:grid-cols-2 gap-16 items-center">

          {/* Left — copy */}
          <div>
            <p
              className="reveal stagger-1"
              style={{ fontFamily: "var(--font-mono)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#525252", marginBottom: "24px" }}
            >
              Client Retention
            </p>
            <h2
              className="reveal stagger-2"
              style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(32px, 4vw, 52px)", color: "#F5F5F5", lineHeight: "1.1", letterSpacing: "-0.02em", marginBottom: "24px" }}
            >
              Clients who feel cared for come back. Clients who feel forgotten don&apos;t.
            </h2>
            <p
              className="reveal stagger-3"
              style={{ fontFamily: "var(--font-sans)", fontSize: "17px", color: "#A0A0A0", lineHeight: "1.65", marginBottom: "36px", maxWidth: "420px" }}
            >
              The session ends. InkBook takes over. Aftercare, healing check-ins, review requests, and rebooking prompts run on a 30-day automated schedule. Your clients feel looked after. You spend zero time making it happen.
            </p>
            <ul
              className="reveal stagger-4"
              style={{ display: "flex", flexDirection: "column", gap: "14px" }}
            >
              {POINTS.map((point) => (
                <li key={point} style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                  <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#E8E0D0", flexShrink: 0, marginTop: "7px" }} />
                  <span style={{ fontFamily: "var(--font-sans)", fontSize: "14px", color: "#A0A0A0", lineHeight: "1.5" }}>{point}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Right — aftercare timeline panel */}
          <div
            className="reveal stagger-2"
            style={{
              background: "#1A1A1A",
              border: "1px solid #2E2E2E",
              borderRadius: "16px",
              overflow: "hidden",
              boxShadow: "0 1px 3px rgba(0,0,0,0.9), 0 8px 24px rgba(0,0,0,0.65), 0 24px 64px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)",
            }}
          >
            {/* Header */}
            <div style={{ background: "#111111", borderBottom: "1px solid #242424", padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "#A0A0A0" }}>Aftercare Protocol · Jordan M.</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "#525252" }}>Auto-scheduled</span>
            </div>

            {/* Client + session */}
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #242424", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "#252525", border: "1px solid #383838", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "9px", color: "#525252" }}>JM</span>
                </div>
                <div>
                  <div style={{ fontFamily: "var(--font-sans)", fontSize: "13px", color: "#F5F5F5" }}>Jordan Martinez</div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "#525252" }}>Blackwork sleeve · Feb 12, 2026</div>
                </div>
              </div>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "#4ADE80", background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)", padding: "2px 8px", borderRadius: "100px" }}>Active</span>
            </div>

            {/* Timeline */}
            <div style={{ padding: "20px" }}>
              {TIMELINE.map((item, i) => (
                <div key={item.day} style={{ display: "flex", alignItems: "flex-start", gap: "14px", marginBottom: i < TIMELINE.length - 1 ? "0" : "0" }}>
                  {/* Dot + line */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0, width: "20px" }}>
                    <div
                      style={{
                        width: "18px", height: "18px", borderRadius: "50%",
                        background: item.done ? "rgba(74,222,128,0.15)" : "#1E1E1E",
                        border: `1px solid ${item.done ? "rgba(74,222,128,0.4)" : "#2E2E2E"}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {item.done && (
                        <span style={{ fontSize: "9px", color: "#4ADE80" }}>✓</span>
                      )}
                    </div>
                    {i < TIMELINE.length - 1 && (
                      <div style={{ width: "1px", height: "32px", background: item.done ? "rgba(74,222,128,0.2)" : "#222222" }} />
                    )}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, paddingBottom: i < TIMELINE.length - 1 ? "0" : "0", paddingTop: "0" }}>
                    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "4px" }}>
                      <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "#525252" }}>{item.day}</span>
                        <span style={{ fontFamily: "var(--font-sans)", fontSize: "13px", color: item.done ? "#F5F5F5" : "#A0A0A0", fontWeight: item.done ? 500 : 400 }}>
                          {item.label}
                        </span>
                      </div>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "9px", color: item.done ? "#4ADE80" : "#525252" }}>
                        {item.done ? "Sent" : "Scheduled"}
                      </span>
                    </div>
                    <div style={{ fontFamily: "var(--font-sans)", fontSize: "12px", color: "#525252", lineHeight: "1.5", marginBottom: "8px" }}>{item.sub}</div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "#3A3A3A", marginBottom: i < TIMELINE.length - 1 ? "12px" : "0" }}>{item.time}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div style={{ padding: "14px 20px", borderTop: "1px solid #242424", background: "#141414" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "#525252" }}>
                Zero artist action required · All messages automated
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
