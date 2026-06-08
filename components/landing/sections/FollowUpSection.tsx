"use client";

import { useEffect, useRef } from "react";

const QUEUE = [
  {
    initials: "JM",
    name: "Jordan M.",
    context: "Quote opened · No reply in 48 hours",
    action: "Follow-up sent",
    actionColor: "#86EFAC",
    actionBg: "rgba(134,239,172,0.08)",
    actionBorder: "rgba(134,239,172,0.22)",
    time: "Auto · 2 min ago",
    done: true,
  },
  {
    initials: "MR",
    name: "Maya R.",
    context: "Inquiry received · Not yet replied",
    action: "24h reminder queued",
    actionColor: "#93C5FD",
    actionBg: "rgba(147,197,253,0.08)",
    actionBorder: "rgba(147,197,253,0.2)",
    time: "Scheduled · Tonight",
    done: false,
  },
  {
    initials: "CT",
    name: "Carlos T.",
    context: "Deposit link sent · Unpaid after 12h",
    action: "Payment nudge sent",
    actionColor: "#86EFAC",
    actionBg: "rgba(134,239,172,0.08)",
    actionBorder: "rgba(134,239,172,0.22)",
    time: "Auto · 1 hr ago",
    done: true,
  },
  {
    initials: "AK",
    name: "Alex K.",
    context: "Consultation complete · Quote pending",
    action: "3-day reminder set",
    actionColor: "#909090",
    actionBg: "rgba(255,255,255,0.04)",
    actionBorder: "#2A2A2A",
    time: "Scheduled · Thu",
    done: false,
  },
];

const POINTS = [
  "Every unanswered inquiry gets a follow-up — automatically",
  "Every unseen quote gets a nudge at 48 hours — no matter how busy you are",
  "Every unpaid deposit gets a reminder before the booking expires",
  "You tattoo. InkBook handles client communication.",
];

export default function FollowUpSection() {
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
        background: "linear-gradient(180deg, rgba(255,255,255,0.018) 0px, rgba(255,255,255,0) 60px), #111111",
        borderTop: "1px solid rgba(255,255,255,0.07)",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
      }}
    >
      <div className="mx-auto" style={{ maxWidth: "1120px", padding: "0 40px" }}>

        {/* Full-width statement strip */}
        <div
          className="reveal stagger-1"
          style={{
            background: "#111111",
            border: "1px solid #1C1C1C",
            borderRadius: "10px",
            padding: "20px 28px",
            marginBottom: "48px",
          }}
        >
          <p
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "clamp(24px, 3vw, 36px)",
              color: "#E8E0D0",
              lineHeight: "1.2",
              letterSpacing: "-0.02em",
              marginBottom: "8px",
            }}
          >
            More time tattooing. Zero time on follow-ups.
          </p>
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "12px",
              color: "#525252",
            }}
          >
            InkBook follows up on every inquiry, quote, and deposit — automatically, while you work.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-16 items-center">

          {/* Left — follow-up queue */}
          <div className="reveal stagger-2">
            <div
              style={{
                background: "#1A1A1A",
                border: "1px solid #2E2E2E",
                borderRadius: "16px",
                overflow: "hidden",
                boxShadow: "0 1px 3px rgba(0,0,0,0.9), 0 8px 24px rgba(0,0,0,0.65), 0 24px 64px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)",
              }}
            >
              {/* Chrome */}
              <div style={{ background: "#111111", borderBottom: "1px solid #242424", padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "#909090" }}>AI Follow-Up Queue</span>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span className="animate-pulse-dot" aria-hidden style={{ display: "inline-block", width: "6px", height: "6px", borderRadius: "50%", background: "#4ADE80" }} />
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "#525252" }}>Running · 14 sequences</span>
                </div>
              </div>

              {/* Queue rows */}
              <div>
                {QUEUE.map((item, i) => (
                  <div
                    key={item.name}
                    style={{
                      padding: "16px 20px",
                      borderBottom: i < QUEUE.length - 1 ? "1px solid #1E1E1E" : "none",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "12px",
                      background: item.done ? "rgba(134,239,172,0.025)" : "transparent",
                    }}
                  >
                    {/* Avatar */}
                    <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: item.done ? "rgba(134,239,172,0.10)" : "#1E1E1E", border: `1px solid ${item.done ? "rgba(134,239,172,0.25)" : "#2A2A2A"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "1px" }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "8px", color: item.done ? "#86EFAC" : "#484848" }}>{item.initials}</span>
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "5px", gap: "8px" }}>
                        <span style={{ fontFamily: "var(--font-sans)", fontSize: "13px", color: "#D0D0D0", fontWeight: 500 }}>{item.name}</span>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: "9px", color: "#3A3A3A", flexShrink: 0 }}>{item.time}</span>
                      </div>
                      <div style={{ fontFamily: "var(--font-sans)", fontSize: "12px", color: "#585858", marginBottom: "8px" }}>
                        {item.context}
                      </div>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: item.actionColor, background: item.actionBg, border: `1px solid ${item.actionBorder}`, padding: "2px 8px", borderRadius: "4px" }}>
                        {item.done ? "✓ " : ""}{item.action}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div style={{ padding: "12px 20px", borderTop: "1px solid #1E1E1E", background: "#141414" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "#404040" }}>
                  All follow-ups automated · Zero artist action required
                </span>
              </div>
            </div>
          </div>

          {/* Right — copy */}
          <div>
            <p
              className="reveal stagger-2"
              style={{ fontFamily: "var(--font-mono)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#525252", marginBottom: "24px" }}
            >
              AI Follow-Up
            </p>
            <h2
              className="reveal stagger-3"
              style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(32px, 4vw, 52px)", color: "#F5F5F5", lineHeight: "1.1", letterSpacing: "-0.02em", marginBottom: "24px" }}
            >
              Most studios don&apos;t lose leads. They stop following up.
            </h2>
            <p
              className="reveal stagger-4"
              style={{ fontFamily: "var(--font-sans)", fontSize: "17px", color: "#909090", lineHeight: "1.65", marginBottom: "36px", maxWidth: "420px" }}
            >
              While you&apos;re tattooing, InkBook is following up on every inquiry that went quiet, every quote that was opened but not answered, every deposit that hasn&apos;t been paid. Automatically. Every time. Whether you run a solo practice or manage a team, the follow-up runs without you.
            </p>
            <ul
              className="reveal stagger-5"
              style={{ display: "flex", flexDirection: "column", gap: "14px" }}
            >
              {POINTS.map((point) => (
                <li key={point} style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                  <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#E8E0D0", flexShrink: 0, marginTop: "7px" }} />
                  <span style={{ fontFamily: "var(--font-sans)", fontSize: "14px", color: "#909090", lineHeight: "1.5" }}>{point}</span>
                </li>
              ))}
            </ul>

            {/* Stat callout */}
            <div
              className="reveal stagger-6"
              style={{ marginTop: "36px", padding: "18px 20px", background: "#141414", border: "1px solid #222222", borderRadius: "10px" }}
            >
              <div style={{ fontFamily: "var(--font-serif)", fontSize: "32px", color: "#E8E0D0", lineHeight: "1", marginBottom: "6px" }}>40%</div>
              <div style={{ fontFamily: "var(--font-sans)", fontSize: "13px", color: "#606060", lineHeight: "1.5" }}>
                of tattoo studio inquiries never receive a reply. InkBook closes that gap automatically.
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
