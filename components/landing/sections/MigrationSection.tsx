"use client";

import { useEffect, useRef } from "react";

const BEFORE_TOOLS = [
  { name: "Instagram DMs", note: "3 unread DMs", tag: "Design requests" },
  { name: "Facebook Messenger", note: "1 inquiry", tag: "Scheduling" },
  { name: "WhatsApp", note: "2 follow-ups", tag: "Client comms" },
  { name: "Calendly", note: "No deposit", tag: "Bookings" },
  { name: "Google Sheets", note: "Not synced", tag: "Client tracking" },
  { name: "Venmo / Square", note: "Manual", tag: "Payments" },
  { name: "Paper Consent Forms", note: "Not backed up", tag: "Legal" },
  { name: "Manual Follow-Ups", note: "3 overdue", tag: "Outreach" },
];

const FLOW_NODES = [
  { label: "Inquiry", sub: "AI qualifies" },
  { label: "Quote", sub: "Auto-sent" },
  { label: "Deposit", sub: "Stripe" },
  { label: "Booking", sub: "Confirmed" },
  { label: "Complete", sub: "CRM updated" },
];

export default function MigrationSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.querySelectorAll<HTMLElement>(".reveal").forEach((node, i) => {
            setTimeout(() => node.classList.add("in-view"), i * 100);
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
      style={{ padding: "128px 0", background: "linear-gradient(180deg, rgba(255,255,255,0.018) 0px, rgba(255,255,255,0) 60px), #111111", borderTop: "1px solid rgba(255,255,255,0.07)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}
    >
      <div className="mx-auto" style={{ maxWidth: "1120px", padding: "0 40px" }}>
        {/* Header */}
        <div className="mb-16">
          <p className="reveal stagger-1" style={{ fontFamily: "var(--font-mono)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#525252", marginBottom: "24px" }}>
            The Shift
          </p>
          <h2 className="reveal stagger-2" style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(32px, 4vw, 56px)", color: "#F5F5F5", lineHeight: "1.1", maxWidth: "560px" }}>
            Everything you use today. Replaced by one system.
          </h2>
        </div>

        {/* Two-column comparison */}
        <div className="grid md:grid-cols-[1fr_64px_1fr] gap-0 items-start">

          {/* LEFT — Before InkBook */}
          <div className="reveal stagger-1">
            <div style={{ background: "#0D0D0D", border: "1px solid #272727", borderRadius: "12px", overflow: "hidden", boxShadow: "0 4px 16px rgba(0,0,0,0.4)" }}>
              {/* Column header */}
              <div style={{ padding: "12px 16px", borderBottom: "1px solid #222222", background: "#171717" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.06em", color: "#525252" }}>
                  Before InkBook
                </span>
              </div>
              {/* Tool rows */}
              {BEFORE_TOOLS.map(({ name, note, tag }, i) => (
                <div
                  key={name}
                  style={{ padding: "12px 16px", borderBottom: i < BEFORE_TOOLS.length - 1 ? "1px solid #1F1F1F" : "none", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                    <span style={{ fontFamily: "var(--font-sans)", fontSize: "14px", color: "#525252" }}>×</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontFamily: "var(--font-sans)", fontSize: "13px", color: "#525252", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</div>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "#3A3A3A", marginTop: "1px" }}>{note}</div>
                    </div>
                  </div>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "#3A3A3A", border: "1px solid #2C2C2C", padding: "2px 6px", borderRadius: "4px", whiteSpace: "nowrap", flexShrink: 0 }}>
                    {tag}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Center arrow */}
          <div className="reveal stagger-2 hidden md:flex flex-col items-center justify-center" style={{ paddingTop: "40px", alignSelf: "stretch" }}>
            <div style={{ width: "1px", flex: 1, background: "linear-gradient(to bottom, transparent, #3A3A3A 40%, #3A3A3A 60%, transparent)" }} />
            <div style={{ width: "28px", height: "28px", border: "1px solid #3A3A3A", borderRadius: "50%", background: "#1A1A1A", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, margin: "12px 0" }}>
              <span style={{ color: "#525252", fontSize: "12px" }}>→</span>
            </div>
            <div style={{ width: "1px", flex: 1, background: "linear-gradient(to bottom, transparent, #3A3A3A 40%, #3A3A3A 60%, transparent)" }} />
          </div>

          {/* RIGHT — After InkBook */}
          <div className="reveal stagger-3 mt-6 md:mt-0">
            <div style={{ background: "#191919", border: "1px solid #383838", borderRadius: "12px", overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.5), 0 1px 3px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.07)" }}>
              {/* Column header */}
              <div style={{ padding: "12px 16px", borderBottom: "1px solid #282828", background: "#1E1E1E", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.06em", color: "#A0A0A0" }}>
                  After InkBook
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#4ADE80", display: "inline-block" }} />
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "#525252" }}>Live</span>
                </div>
              </div>

              {/* Single system statement */}
              <div style={{ padding: "28px 24px", borderBottom: "1px solid #282828" }}>
                <p style={{ fontFamily: "var(--font-sans)", fontSize: "20px", fontWeight: 500, color: "#F5F5F5", lineHeight: "1.4", marginBottom: "8px" }}>
                  One connected operating system.
                </p>
                <p style={{ fontFamily: "var(--font-sans)", fontSize: "14px", color: "#525252" }}>
                  Every tool replaced. Every workflow connected.
                </p>
              </div>

              {/* Connected flow chain */}
              <div style={{ padding: "20px 24px", borderBottom: "1px solid #282828" }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "#525252", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "14px" }}>
                  Unified workflow
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
                  {FLOW_NODES.map(({ label, sub }, i) => (
                    <div key={label} style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                      {/* Line + dot */}
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0, width: "16px" }}>
                        {i > 0 && <div style={{ width: "1px", height: "8px", background: "#3A3A3A" }} />}
                        <div style={{ width: "8px", height: "8px", borderRadius: "50%", border: "1px solid", borderColor: i === 2 ? "#E8E0D0" : "#3A3A3A", background: i === 2 ? "rgba(232,224,208,0.10)" : "#1A1A1A", flexShrink: 0 }} />
                        {i < FLOW_NODES.length - 1 && <div style={{ width: "1px", height: "8px", background: "#3A3A3A" }} />}
                      </div>
                      {/* Label */}
                      <div style={{ paddingTop: i === 0 ? "0" : "1px", paddingBottom: i < FLOW_NODES.length - 1 ? "6px" : "0" }}>
                        <div style={{ fontFamily: "var(--font-sans)", fontSize: "13px", color: i === 2 ? "#F5F5F5" : "#A0A0A0" }}>{label}</div>
                        <div style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "#525252" }}>{sub}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* What's replaced */}
              <div style={{ padding: "16px 24px" }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "#525252", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "10px" }}>
                  Replaces all of this
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {["DMs", "Calendly", "Venmo", "JotForm", "Spreadsheets", "Paper forms"].map((t) => (
                    <span key={t} style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "#525252", border: "1px solid #2C2C2C", padding: "3px 8px", borderRadius: "100px" }}>
                      {t}
                    </span>
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
