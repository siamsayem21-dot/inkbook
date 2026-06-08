"use client";

import { useEffect, useRef } from "react";

const WORKFLOW = [
  { label: "Inquiry", ai: false },
  { label: "AI Consultation", ai: true },
  { label: "AI Follow-Up", ai: true },
  { label: "Quote", ai: false },
  { label: "Deposit", ai: false },
  { label: "Booking", ai: false },
  { label: "Aftercare", ai: false },
  { label: "CRM", ai: false },
];

const AI_MOAT = [
  {
    label: "AI talks to every client",
    body: "Every inquiry gets an immediate response — 24/7. Style, budget, placement, references — all collected before you see anything.",
  },
  {
    label: "AI qualifies every lead",
    body: "Unstructured messages become scored, structured briefs. Unqualified inquiries never reach your calendar.",
  },
  {
    label: "AI follows up automatically",
    body: "Cold leads, unseen quotes, unpaid deposits. InkBook keeps every conversation moving — without you lifting a finger.",
  },
];

export default function CategoryStatementSection() {
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
      { threshold: 0.12 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      style={{
        padding: "160px 40px",
        background: "#0A0A0A",
        borderTop: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      <div style={{ maxWidth: "860px", margin: "0 auto", textAlign: "center" }}>

        {/* Category label */}
        <p
          className="reveal stagger-1"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "11px",
            textTransform: "uppercase",
            letterSpacing: "0.10em",
            color: "#3A3A3A",
            marginBottom: "56px",
          }}
        >
          A new category of software
        </p>

        {/* Contrast statement */}
        <div className="reveal stagger-2" style={{ marginBottom: "56px" }}>
          <p
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "clamp(28px, 4.5vw, 56px)",
              color: "#2A2A2A",
              lineHeight: "1.15",
              letterSpacing: "-0.025em",
              marginBottom: "8px",
            }}
          >
            Most software manages appointments.
          </p>
          <p
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "clamp(28px, 4.5vw, 56px)",
              color: "#F0EDE8",
              lineHeight: "1.15",
              letterSpacing: "-0.025em",
            }}
          >
            InkBook manages the entire tattoo client journey.
          </p>
        </div>

        {/* Workflow rail — proves the OS claim */}
        <div
          className="reveal stagger-3"
          style={{
            overflowX: "auto",
            marginBottom: "56px",
            paddingBottom: "2px",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "16px 0",
              borderTop: "1px solid #161616",
              borderBottom: "1px solid #161616",
              minWidth: "100%",
              justifyContent: "center",
              flexWrap: "wrap",
              gap: "0",
            }}
          >
            {WORKFLOW.map((step, i) => (
              <div key={step.label} style={{ display: "flex", alignItems: "center" }}>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "11px",
                    letterSpacing: "0.02em",
                    whiteSpace: "nowrap",
                    color: step.ai ? "#C0B8AE" : "#404040",
                    background: step.ai ? "rgba(232,224,208,0.06)" : "transparent",
                    border: step.ai ? "1px solid rgba(232,224,208,0.10)" : "none",
                    padding: step.ai ? "3px 10px" : "3px 2px",
                    borderRadius: step.ai ? "100px" : "0",
                  }}
                >
                  {step.label}
                </span>
                {i < WORKFLOW.length - 1 && (
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "10px",
                      color: "#252525",
                      padding: "0 8px",
                      flexShrink: 0,
                    }}
                  >
                    →
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* AI moat — 3-column typographic blocks */}
        <div
          className="reveal stagger-4 grid grid-cols-1 md:grid-cols-3"
          style={{
            textAlign: "left",
            marginBottom: "64px",
            borderTop: "1px solid #161616",
          }}
        >
          {AI_MOAT.map((item, i) => (
            <div
              key={item.label}
              style={{
                padding: "28px 24px 24px",
                borderLeft: i > 0 ? "1px solid #161616" : "none",
              }}
            >
              <p
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "13px",
                  color: "#C8C8C8",
                  fontWeight: 500,
                  marginBottom: "10px",
                  lineHeight: "1.4",
                }}
              >
                {item.label}
              </p>
              <p
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "13px",
                  color: "#484848",
                  lineHeight: "1.7",
                  margin: 0,
                }}
              >
                {item.body}
              </p>
            </div>
          ))}
        </div>

        {/* Supporting copy */}
        <p
          className="reveal stagger-5"
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "17px",
            color: "#525252",
            lineHeight: "1.75",
            maxWidth: "520px",
            margin: "0 auto 14px",
          }}
        >
          From first inquiry to final session — AI handles the admin work so artists can focus on tattooing.
        </p>

        {/* Solo artist line */}
        <p
          className="reveal stagger-6"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "11px",
            color: "#363636",
            letterSpacing: "0.05em",
            marginBottom: "56px",
          }}
        >
          Built for solo artists and multi-artist studios alike.
        </p>

        {/* Closing punch line */}
        <p
          className="reveal stagger-7"
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: "clamp(24px, 3.2vw, 38px)",
            color: "#E8E0D0",
            letterSpacing: "-0.02em",
            lineHeight: "1.2",
            marginBottom: "36px",
          }}
        >
          Less admin. More tattooing.
        </p>

        {/* OS pill */}
        <div className="reveal stagger-8" style={{ display: "flex", justifyContent: "center" }}>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              letterSpacing: "0.06em",
              color: "#484848",
              background: "transparent",
              border: "1px solid #1E1E1E",
              padding: "9px 22px",
              borderRadius: "100px",
              display: "inline-block",
            }}
          >
            Tattoo Business Operating System
          </span>
        </div>

      </div>
    </section>
  );
}
