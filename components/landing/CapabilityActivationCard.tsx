"use client";

import { useEffect, useRef, useState } from "react";

const WORKFLOW: { label: string; running: string; done: string | string[]; success: string }[] = [
  {
    label: "AI Consultation",
    running: "Analyzing sleeve style, matching artist",
    done: ["Sleeve style analyzed", "Artist matched: Alex R."],
    success: "Artist matched",
  },
  {
    label: "Automated Follow-Up",
    running: "Sending 24h nudge",
    done: "Follow-up sent",
    success: "Follow-up sent",
  },
  {
    label: "Quote Builder",
    running: "Drafting itemized quote",
    done: ["$1,200 quote generated", "3 sessions estimated"],
    success: "Quote generated",
  },
  {
    label: "Deposit Collection",
    running: "Awaiting payment",
    done: "$240 deposit paid",
    success: "Deposit collected",
  },
  {
    label: "Booking & Consent",
    running: "Waiting for signature",
    done: ["Jun 22 booked", "Consent signed"],
    success: "Booking confirmed",
  },
  {
    label: "Aftercare Automation",
    running: "Sending care guide",
    done: "Day 1 instructions sent",
    success: "Aftercare sent",
  },
  {
    label: "Review Collection",
    running: "Requesting review",
    done: "Review request sent",
    success: "Review requested",
  },
  {
    label: "Full CRM",
    running: "Updating client profile",
    done: "Client profile updated",
    success: "Profile updated",
  },
];

const STAGGER_MS = 150;
const RUNNING_DURATION_MS = 2200;
const SUCCESS_DURATION_MS = 500;

type RowState = "queued" | "running" | "done";
type Phase = "running" | "success";

export default function CapabilityActivationCard() {
  const [revealedCount, setRevealedCount] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("running");
  const cardRef = useRef<HTMLDivElement>(null);

  const allRevealed = revealedCount >= WORKFLOW.length;

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
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const scheduleRunning = () => {
      setPhase("running");
      timer = setTimeout(() => {
        if (cancelled) return;
        setPhase("success");
        timer = setTimeout(() => {
          if (cancelled) return;
          setActiveIndex((i) => (i + 1) % WORKFLOW.length);
          scheduleRunning();
        }, SUCCESS_DURATION_MS);
      }, RUNNING_DURATION_MS);
    };

    scheduleRunning();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [allRevealed]);

  const isCelebrating = allRevealed && phase === "success";

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
          const isRowCelebrating = isActive && isCelebrating;
          const state: RowState = !allRevealed
            ? "queued"
            : i < activeIndex
            ? "done"
            : i === activeIndex
            ? isCelebrating
              ? "done"
              : "running"
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
                {state === "running" && (
                  <>
                    <p className="ai-feed-detail">{item.running}</p>
                    <div className="ai-feed-progress-track">
                      <div
                        key={`bar-${activeIndex}`}
                        className="ai-feed-progress-fill"
                        style={{ animationDuration: `${RUNNING_DURATION_MS}ms` }}
                      />
                    </div>
                  </>
                )}
                {isRowCelebrating && <p className="ai-feed-success">✓ {item.success}</p>}
                {state === "done" &&
                  !isRowCelebrating &&
                  (Array.isArray(item.done) ? item.done : [item.done]).map((line) => (
                    <p key={line} className="ai-feed-detail ai-feed-detail-arrow">
                      {line}
                    </p>
                  ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="relative ai-feed-footer" style={{ zIndex: 1 }}>
        <span className="ai-feed-footer-dot" aria-hidden />
        <div>
          <p className="ai-feed-footer-label">Now running</p>
          <p key={`footer-${activeIndex}-${phase}-${allRevealed}`} className="ai-feed-footer-value">
            {!allRevealed
              ? "Initializing workflow…"
              : isCelebrating
              ? `✓ ${WORKFLOW[activeIndex].success}`
              : WORKFLOW[activeIndex].label}
          </p>
        </div>
      </div>
    </div>
  );
}
