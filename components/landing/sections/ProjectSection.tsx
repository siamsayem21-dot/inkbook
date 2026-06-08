"use client";

import { useEffect, useRef } from "react";

export default function ProjectSection() {
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
      { threshold: 0.15 }
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
      <div
        className="mx-auto"
        style={{ maxWidth: "1120px", padding: "0 40px" }}
      >
        {/* Header */}
        <div className="text-center mb-16">
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
            Project Management
          </p>
          <h2
            className="reveal stagger-2 mx-auto"
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "clamp(32px, 4vw, 56px)",
              color: "#F5F5F5",
              lineHeight: "1.1",
              maxWidth: "640px",
              marginBottom: "24px",
            }}
          >
            Every tattoo. One dedicated workspace.
          </h2>
          <p
            className="reveal stagger-3 mx-auto"
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "18px",
              color: "#A0A0A0",
              lineHeight: "1.6",
              maxWidth: "480px",
            }}
          >
            References, designs, approvals, revisions, session history — all tracked in one project. Nothing lost. Everything connected.
          </p>
        </div>

        {/* Project card */}
        <div
          className="reveal stagger-4 mx-auto"
          style={{
            maxWidth: "720px",
            background: "#252525",
            border: "1px solid #2E2E2E",
            borderRadius: "16px",
            padding: "40px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.5), 0 1px 3px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.07)",
          }}
        >
          {/* Card header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <div
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "16px",
                  fontWeight: 500,
                  color: "#F5F5F5",
                  marginBottom: "4px",
                }}
              >
                Jordan M. — Blackwork Sleeve
              </div>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "11px",
                  color: "#525252",
                }}
              >
                Project #P-1047 · Sarah M.
              </div>
            </div>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "11px",
                color: "#A0A0A0",
                border: "1px solid #383838",
                padding: "4px 10px",
                borderRadius: "6px",
              }}
            >
              Session 1 of 2
            </span>
          </div>

          {/* 2×2 grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
            {/* References */}
            <div>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "11px",
                  color: "#525252",
                  marginBottom: "12px",
                }}
              >
                References
              </div>
              <div className="flex gap-2">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    style={{
                      width: "56px",
                      height: "56px",
                      background: "#252525",
                      borderRadius: "6px",
                    }}
                    aria-label={`Reference image ${i + 1}`}
                  />
                ))}
              </div>
            </div>

            {/* Design Status */}
            <div>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "11px",
                  color: "#525252",
                  marginBottom: "12px",
                }}
              >
                Design Status
              </div>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "11px",
                  color: "#A0A0A0",
                  border: "1px solid #383838",
                  padding: "6px 12px",
                  borderRadius: "6px",
                  display: "inline-block",
                }}
              >
                Awaiting Approval
              </span>
            </div>

            {/* Next Session */}
            <div>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "11px",
                  color: "#525252",
                  marginBottom: "8px",
                }}
              >
                Next Session
              </div>
              <div
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "14px",
                  color: "#A0A0A0",
                }}
              >
                Tue, Feb 12 · 2:00 PM
              </div>
              <div
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "12px",
                  color: "#525252",
                  marginTop: "2px",
                }}
              >
                with Sarah M.
              </div>
            </div>

            {/* Notes */}
            <div>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "11px",
                  color: "#525252",
                  marginBottom: "8px",
                }}
              >
                Notes
              </div>
              <div
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "13px",
                  color: "#525252",
                  lineHeight: "1.5",
                }}
              >
                Client prefers more negative space. Avoid heavy fill on forearm.
              </div>
            </div>
          </div>

          {/* Actions */}
          <div
            style={{
              borderTop: "1px solid #282828",
              paddingTop: "24px",
              display: "flex",
              gap: "16px",
              alignItems: "center",
            }}
          >
            <button
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "14px",
                color: "#F5F5F5",
                border: "1px solid #F5F5F5",
                background: "transparent",
                padding: "10px 20px",
                borderRadius: "8px",
                cursor: "pointer",
              }}
            >
              Approve Design
            </button>
            <button
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "14px",
                color: "#525252",
                background: "none",
                border: "none",
                cursor: "pointer",
              }}
            >
              Request Revision
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
