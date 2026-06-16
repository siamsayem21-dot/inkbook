"use client";

import { useEffect, useRef, useState } from "react";

const WORKFLOW = [
  { label: "AI Consultation", running: "Matching artist (98%)", done: "Artist matched · Alex R." },
  { label: "Automated Follow-Up", running: "Sending 24h nudge", done: "Follow-up sent" },
  { label: "Quote Builder", running: "Drafting itemized quote", done: "$1,200 quote generated" },
  { label: "Deposit Collection", running: "Awaiting payment", done: "$240 deposit collected" },
  { label: "Booking & Consent", running: "Waiting for signature", done: "Booking confirmed · consent signed" },
  { label: "Aftercare Automation", running: "Sending care guide", done: "Aftercare sequence sent" },
  { label: "Review Collection", running: "Requesting review", done: "5-star review received" },
  { label: "Full CRM", running: "Updating client profile", done: "Client profile updated" },
];

const STAGGER_MS = 150;
const ACTIVE_INTERVAL_MS = 3400;

type RowState = "queued" | "running" | "done";

export default function CapabilityActivationCard() {
  const [revealedCount, setRevealedCount] = useState(0);
  const [tick, setTick] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);

  const allRevealed = revealedCount >= WORKFLOW.length;
  const activeIndex = tick % WORKFLOW.length;

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          WORKFLOW.forEach((_, i) => {
            setTimeout(() => setRevealedCount((c) => Math.max(c, i + 1)), i * STAGGER_MS);
          });
          io.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!allRevealed) return;
    const iv = setInterval(() => setTick((t) => t + 1), ACTIVE_INTERVAL_MS);
    return () => clearInterval(iv);
  }, [allRevealed]);

  return (
    <div
      ref={cardRef}
      className="capability-card relative rounded-2xl p-5 border border-[#111111] overflow-hidden"
      style={{ background: "#111111" }}
    >
      <div className="capability-ambient-glow" aria-hidden />

      <div className="relative flex items-start justify-between mb-4" style={{ zIndex: 1 }}>
        <div>
          <p className="text-sm font-semibold text-white">InkBook</p>
          <p className="mt-1.5 flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-[#D4A853]">
            <span className="capability-status-dot" aria-hidden />
            AI running studio workflow
          </p>
        </div>
        <span className="capability-counter">{WORKFLOW.length} systems active</span>
      </div>

      <div className="relative" style={{ zIndex: 1 }}>
        {WORKFLOW.map((item, i) => {
          const isRevealed = i < revealedCount;
          const isActive = allRevealed && i === activeIndex;
          const state: RowState = !allRevealed
            ? "queued"
            : i < activeIndex
            ? "done"
            : i === activeIndex
            ? "running"
            : "queued";

          return (
            <div
              key={item.label}
              className={`ai-feed-row is-${state}${isRevealed ? " is-revealed" : ""}${isActive ? " is-active" : ""}`}
            >
              <span className={`ai-feed-dot is-${state}`} aria-hidden />
              <div className="ai-feed-body">
                <div className="ai-feed-top">
                  <span className="ai-feed-label">{item.label}</span>
                  <span className={`ai-feed-status status-${state}`}>
                    {state === "running" ? "Running" : state === "done" ? "Completed" : "Waiting"}
                  </span>
                </div>
                {state !== "queued" && (
                  <p className="ai-feed-detail">{state === "running" ? item.running : item.done}</p>
                )}
                {isActive && (
                  <div className="ai-feed-progress-track">
                    <div
                      key={`bar-${tick}`}
                      className="ai-feed-progress-fill"
                      style={{ animationDuration: `${ACTIVE_INTERVAL_MS}ms` }}
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="relative ai-feed-footer" style={{ zIndex: 1 }}>
        <span className="ai-feed-footer-dot" aria-hidden />
        <div>
          <p className="ai-feed-footer-label">Now running</p>
          <p key={`footer-${activeIndex}-${allRevealed}`} className="ai-feed-footer-value">
            {allRevealed ? WORKFLOW[activeIndex].label : "Initializing workflow…"}
          </p>
        </div>
      </div>
    </div>
  );
}
