"use client";

import { useEffect, useRef, useState } from "react";

const NODES = [
  "Inquiry",
  "Consultation",
  "Quote",
  "Deposit",
  "Booking",
  "Project",
  "Completion",
];

export default function PlatformSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(false);
  const [inkActive, setInkActive] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          // Start ink travel after nodes have drawn in
          setTimeout(() => setInkActive(true), NODES.length * 80 + 400);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="product"
      ref={sectionRef}
      style={{
        padding: "128px 0",
        background: "linear-gradient(180deg, rgba(255,255,255,0.018) 0px, rgba(255,255,255,0) 60px), #111111",
        borderTop: "1px solid rgba(255,255,255,0.07)",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Centered ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background: "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(232,224,208,0.07) 0%, rgba(232,224,208,0.02) 50%, transparent 70%)",
        }}
      />

      <div className="mx-auto text-center" style={{ maxWidth: "1120px", padding: "0 40px" }}>

        <p
          style={{
            fontFamily: "var(--font-mono)", fontSize: "11px", textTransform: "uppercase",
            letterSpacing: "0.08em", color: "#525252", marginBottom: "24px",
            opacity: inView ? 1 : 0, transform: inView ? "none" : "translateY(16px)",
            transition: "opacity 600ms var(--ease-out), transform 600ms var(--ease-out)",
          }}
        >
          The Platform
        </p>

        <h2
          style={{
            fontFamily: "var(--font-serif)", fontSize: "clamp(40px, 5vw, 72px)",
            color: "#F5F5F5", letterSpacing: "-0.03em", lineHeight: "1.05", marginBottom: "24px",
            opacity: inView ? 1 : 0, transform: inView ? "none" : "translateY(20px)",
            transition: "opacity 700ms 80ms var(--ease-out), transform 700ms 80ms var(--ease-out)",
          }}
        >
          One operating system. Every workflow.
        </h2>

        <p
          style={{
            fontFamily: "var(--font-sans)", fontSize: "18px", color: "#A0A0A0",
            maxWidth: "560px", margin: "0 auto 80px", lineHeight: "1.6",
            opacity: inView ? 1 : 0, transform: inView ? "none" : "translateY(16px)",
            transition: "opacity 600ms 160ms var(--ease-out), transform 600ms 160ms var(--ease-out)",
          }}
        >
          Not a booking app. Not a CRM. Not scheduling software. InkBook connects every part of your studio — from the first inquiry to the final review — in one connected system.
        </p>

        {/* ── SIGNATURE MOMENT: Ink travels through the pipeline ── */}
        <div
          style={{
            opacity: inView ? 1 : 0,
            transition: "opacity 600ms 240ms var(--ease-out)",
          }}
        >
          <div
            className="overflow-x-auto"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {/* Outer container — ink dot travels within this */}
            <div
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minWidth: "max-content",
                margin: "0 auto",
                padding: "24px 0",
                overflow: "hidden",
              }}
            >
              {/* ── Ink dot — signature animation ── */}
              {inkActive && (
                <span
                  aria-hidden
                  className="animate-ink-travel"
                  style={{
                    position: "absolute",
                    top: "50%",
                    marginTop: "-4px",
                    left: 0,
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: "#E8E0D0",
                    boxShadow: "0 0 12px 4px rgba(232,224,208,0.35), 0 0 24px 8px rgba(232,224,208,0.12)",
                    zIndex: 20,
                    pointerEvents: "none",
                  }}
                />
              )}

              {/* Nodes + connectors */}
              {NODES.map((node, i) => {
                const isHighlight = i === 3;
                const delay = `${i * 80}ms`;
                return (
                  <div key={node} style={{ display: "flex", alignItems: "center" }}>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "10px",
                        opacity: inView ? 1 : 0,
                        transform: inView ? "none" : "translateY(12px)",
                        transition: `opacity 500ms ${delay} var(--ease-out), transform 500ms ${delay} var(--ease-out)`,
                      }}
                    >
                      <div
                        style={{
                          width: "40px",
                          height: "40px",
                          borderRadius: "50%",
                          border: `1px solid ${isHighlight ? "rgba(232,224,208,0.7)" : "#363636"}`,
                          background: isHighlight ? "rgba(232,224,208,0.08)" : "#1A1A1A",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          boxShadow: isHighlight ? "0 0 16px rgba(232,224,208,0.1)" : "none",
                          transition: "border-color 400ms, box-shadow 400ms",
                        }}
                      >
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: isHighlight ? "#E8E0D0" : "#525252" }}>
                          {i + 1}
                        </span>
                      </div>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: isHighlight ? "#A0A0A0" : "#525252", whiteSpace: "nowrap" }}>
                        {node}
                      </span>
                    </div>

                    {i < NODES.length - 1 && (
                      <div
                        style={{
                          width: "56px",
                          height: "1px",
                          background: "#2E2E2E",
                          marginBottom: "22px",
                          flexShrink: 0,
                          opacity: inView ? 1 : 0,
                          transition: `opacity 400ms ${i * 80 + 200}ms`,
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Caption below diagram */}
          <p
            style={{
              fontFamily: "var(--font-mono)", fontSize: "11px", color: "#525252",
              letterSpacing: "0.04em", marginTop: "32px",
              opacity: inView ? 1 : 0,
              transition: "opacity 600ms 700ms var(--ease-out)",
            }}
          >
            AI assists · Artists decide · Humans control
          </p>
        </div>

      </div>
    </section>
  );
}
