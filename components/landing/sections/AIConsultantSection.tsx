"use client";

import { useEffect, useRef } from "react";

const FEATURES = [
  "Artists spend zero time on unqualified or incomplete inquiries",
  "Style, placement, size, budget — collected before anyone sees the inquiry",
  "Reference images accepted and analyzed automatically",
  "Lead scored and qualified — no human intake required",
  "Structured brief ready for quoting within minutes",
];

const MSGS = [
  { role: "ai", text: "Welcome to Ink & Iron Studio. I'll help get your inquiry to the right artist. What style are you thinking?" },
  { role: "client", text: "Blackwork wolf on my forearm. Geometric style. About 6 inches." },
  { role: "ai", text: "Got it — Blackwork, Geometric, forearm, 6 inches. What budget are you working with? I'll prepare a brief for your quote." },
  { role: "client", text: "Around $400–600." },
];

const TAGS = [
  { label: "Blackwork", accent: true },
  { label: "Geometric", accent: false },
  { label: "Forearm", accent: false },
  { label: '6"', accent: false },
  { label: "$400–600", accent: false },
  { label: "✓ Qualified", green: true },
];

export default function AIConsultantSection() {
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
              AI Consultation
            </p>
            <h2
              className="reveal stagger-2"
              style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(32px, 4vw, 52px)", color: "#F5F5F5", lineHeight: "1.1", letterSpacing: "-0.02em", marginBottom: "24px" }}
            >
              Every inquiry qualified before it reaches your artists.
            </h2>
            <p
              className="reveal stagger-3"
              style={{ fontFamily: "var(--font-sans)", fontSize: "17px", color: "#A0A0A0", lineHeight: "1.65", marginBottom: "36px", maxWidth: "420px" }}
            >
              InkBook AI handles the first conversation — 24 hours a day, seven days a week. Style, placement, size, budget, references — collected, structured, and ready to quote. No artist sees an inquiry until it&apos;s worth their time.
            </p>
            <ul
              className="reveal stagger-4"
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              {FEATURES.map((f) => (
                <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                  <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#E8E0D0", flexShrink: 0, marginTop: "7px" }} />
                  <span style={{ fontFamily: "var(--font-sans)", fontSize: "14px", color: "#A0A0A0", lineHeight: "1.5" }}>{f}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Right — AI chat UI */}
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
            {/* Chrome */}
            <div style={{ background: "#111111", borderBottom: "1px solid #242424", padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "22px", height: "22px", background: "#E8E0D0", borderRadius: "5px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ fontFamily: "var(--font-serif)", fontSize: "10px", color: "#0A0A0A", fontWeight: 600 }}>IB</span>
                </div>
                <div>
                  <div style={{ fontFamily: "var(--font-sans)", fontSize: "12px", color: "#F5F5F5" }}>InkBook AI</div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "#525252" }}>Ink & Iron Studio · Booking assistant</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span className="animate-pulse-dot" aria-hidden style={{ display: "inline-block", width: "6px", height: "6px", borderRadius: "50%", background: "#4ADE80" }} />
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "#525252" }}>Online</span>
              </div>
            </div>

            {/* Messages */}
            <div style={{ padding: "20px 16px", display: "flex", flexDirection: "column", gap: "12px" }}>
              {MSGS.map((msg, i) => (
                <div
                  key={i}
                  style={{ display: "flex", justifyContent: msg.role === "client" ? "flex-end" : "flex-start", gap: "8px", alignItems: "flex-start" }}
                >
                  {msg.role === "ai" && (
                    <div aria-hidden style={{ width: "20px", height: "20px", background: "#252525", border: "1px solid #363636", borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "1px" }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "8px", color: "#525252" }}>AI</span>
                    </div>
                  )}
                  <div
                    style={{
                      maxWidth: "78%",
                      padding: "10px 14px",
                      borderRadius: msg.role === "client" ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                      background: msg.role === "client" ? "#E8E0D0" : "#242424",
                      border: msg.role === "client" ? "none" : "1px solid #2E2E2E",
                    }}
                  >
                    <span style={{ fontFamily: "var(--font-sans)", fontSize: "12px", color: msg.role === "client" ? "#0A0A0A" : "#C0C0C0", lineHeight: "1.55" }}>
                      {msg.text}
                    </span>
                  </div>
                </div>
              ))}

              {/* AI lead summary */}
              <div
                style={{ background: "#141414", border: "1px solid #272727", borderRadius: "10px", padding: "14px 16px", marginTop: "4px", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "#525252", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    AI Lead Summary
                  </span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "#4ADE80" }}>94 / 100</span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "12px" }}>
                  {TAGS.map(({ label, accent, green }) => (
                    <span
                      key={label}
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "10px",
                        padding: "3px 9px",
                        borderRadius: "100px",
                        background: green ? "rgba(74,222,128,0.08)" : accent ? "rgba(232,224,208,0.10)" : "#1E1E1E",
                        border: `1px solid ${green ? "rgba(74,222,128,0.25)" : accent ? "rgba(232,224,208,0.28)" : "#2C2C2C"}`,
                        color: green ? "#4ADE80" : accent ? "#E8E0D0" : "#A0A0A0",
                      }}
                    >
                      {label}
                    </span>
                  ))}
                </div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "#525252" }}>
                  Lead brief ready · Quote workflow triggered · Artist notified
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
