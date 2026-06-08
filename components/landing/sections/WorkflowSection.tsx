"use client";

import { useEffect, useRef } from "react";

const STAGES = [
  {
    n: "01",
    name: "Inquiry",
    desc: "AI consults the client. Collects style, placement, size, budget, references.",
    artifact: (
      <div
        style={{
          background: "#1A1A1A",
          border: "1px solid #2E2E2E",
          borderRadius: "8px",
          padding: "10px 14px",
          minWidth: "160px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)",
        }}
      >
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "#525252", marginBottom: "6px" }}>
          New inquiry
        </div>
        <div style={{ fontFamily: "var(--font-sans)", fontSize: "12px", color: "#A0A0A0" }}>
          Jordan M. · Blackwork
        </div>
      </div>
    ),
  },
  {
    n: "02",
    name: "Artist Match",
    desc: "Structured brief delivered to the right artist automatically.",
    artifact: (
      <div
        style={{
          background: "#1A1A1A",
          border: "1px solid #2E2E2E",
          borderRadius: "8px",
          padding: "10px 14px",
          minWidth: "160px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)",
        }}
      >
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "#525252", marginBottom: "6px" }}>
          Match · 98%
        </div>
        <div style={{ fontFamily: "var(--font-sans)", fontSize: "12px", color: "#A0A0A0" }}>
          Sarah M. · Routed
        </div>
      </div>
    ),
  },
  {
    n: "03",
    name: "Quote",
    desc: "Artist reviews, sets price, sends professional quote.",
    artifact: (
      <div
        style={{
          background: "#1A1A1A",
          border: "1px solid #2E2E2E",
          borderRadius: "8px",
          padding: "10px 14px",
          minWidth: "160px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)",
        }}
      >
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "#525252", marginBottom: "6px" }}>
          Quote #Q-2847
        </div>
        <div style={{ fontFamily: "var(--font-sans)", fontSize: "12px", color: "#A0A0A0" }}>
          $1,400 · 2 sessions
        </div>
      </div>
    ),
  },
  {
    n: "04",
    name: "Deposit",
    desc: "Client pays online. Booking confirmed automatically.",
    artifact: (
      <div
        style={{
          background: "#1A1A1A",
          border: "1px solid #2E2E2E",
          borderRadius: "8px",
          padding: "10px 14px",
          minWidth: "160px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)",
        }}
      >
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "#525252", marginBottom: "6px" }}>
          Collected
        </div>
        <div style={{ fontFamily: "var(--font-sans)", fontSize: "12px", color: "#E8E0D0" }}>
          $280.00 · Non-refundable
        </div>
      </div>
    ),
  },
  {
    n: "05",
    name: "Project",
    desc: "Design uploaded, reviewed, approved. Sessions tracked.",
    artifact: (
      <div
        style={{
          background: "#1A1A1A",
          border: "1px solid #2E2E2E",
          borderRadius: "8px",
          padding: "10px 14px",
          minWidth: "160px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)",
        }}
      >
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "#525252", marginBottom: "6px" }}>
          Design status
        </div>
        <div style={{ fontFamily: "var(--font-sans)", fontSize: "12px", color: "#A0A0A0" }}>
          Awaiting Approval
        </div>
      </div>
    ),
  },
  {
    n: "06",
    name: "Complete",
    desc: "Aftercare sent. Review requested. CRM updated.",
    artifact: (
      <div
        style={{
          background: "#1A1A1A",
          border: "1px solid #2E2E2E",
          borderRadius: "8px",
          padding: "10px 14px",
          minWidth: "160px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)",
        }}
      >
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "#525252", marginBottom: "6px" }}>
          Session complete
        </div>
        <div style={{ fontFamily: "var(--font-sans)", fontSize: "12px", color: "#A0A0A0" }}>
          Aftercare + review sent
        </div>
      </div>
    ),
  },
];

export default function WorkflowSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.querySelectorAll<HTMLElement>(".reveal").forEach((node, i) => {
            setTimeout(() => node.classList.add("in-view"), i * 60);
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
      id="workflow"
      ref={sectionRef}
      style={{ padding: "128px 0", background: "#0A0A0A", borderTop: "1px solid rgba(255,255,255,0.04)" }}
    >
      <div
        className="mx-auto"
        style={{ maxWidth: "1120px", padding: "0 40px" }}
      >
        {/* Header */}
        <div className="mb-16">
          <p
            className="reveal stagger-1"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "#525252",
              marginBottom: "24px",
            }}
          >
            The Operating System
          </p>
          <h2
            className="reveal stagger-2"
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "clamp(32px, 4vw, 56px)",
              color: "#F5F5F5",
              lineHeight: "1.1",
            }}
          >
            From first inquiry to final review.
          </h2>
        </div>

        {/* Stage rows */}
        <div style={{ borderTop: "1px solid #222222" }}>
          {STAGES.map((stage, i) => (
            <div
              key={stage.n}
              className={`reveal stagger-${Math.min(i + 1, 6)} flex flex-col md:flex-row md:items-center gap-4 md:gap-0`}
              style={{
                borderBottom: "1px solid #222222",
                padding: "24px 0",
                transition: "background 200ms",
                cursor: "default",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "#141414")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              {/* Stage number */}
              <div style={{ minWidth: "80px" }}>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "12px",
                    color: "#3A3A3A",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  {stage.n}
                </span>
              </div>

              {/* Stage name */}
              <div style={{ minWidth: "160px" }}>
                <span
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: "18px",
                    color: "#F5F5F5",
                    fontWeight: 500,
                  }}
                >
                  {stage.name}
                </span>
              </div>

              {/* Description */}
              <div style={{ flex: 1, maxWidth: "320px" }}>
                <span
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: "15px",
                    color: "#525252",
                    lineHeight: "1.5",
                  }}
                >
                  {stage.desc}
                </span>
              </div>

              {/* UI Artifact */}
              <div className="md:ml-auto">{stage.artifact}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
