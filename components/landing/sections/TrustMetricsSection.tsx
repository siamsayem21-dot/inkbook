"use client";

import { useEffect, useRef } from "react";

const METRICS = [
  {
    value: "94%",
    label: "Deposits collected automatically",
    sub: "No manual follow-up required",
  },
  {
    value: "73%",
    label: "Inquiry-to-booking conversion",
    sub: "↑ from 41% industry average",
  },
  {
    value: "0",
    label: "Lost inquiries",
    sub: "Every lead tracked to resolution",
  },
  {
    value: "80%",
    label: "Less admin work per artist",
    sub: "Hours returned to tattooing",
  },
];

export default function TrustMetricsSection() {
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

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "64px" }}>
          <p
            className="reveal stagger-1"
            style={{ fontFamily: "var(--font-mono)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#525252", marginBottom: "20px" }}
          >
            Trusted by modern tattoo studios
          </p>
          <h2
            className="reveal stagger-2"
            style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(32px, 4vw, 52px)", color: "#F5F5F5", lineHeight: "1.1", letterSpacing: "-0.02em", maxWidth: "520px", margin: "0 auto" }}
          >
            Results studios see in the first 30 days.
          </h2>
        </div>

        {/* Metrics grid */}
        <div
          className="reveal stagger-3"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: "1px",
            background: "#222222",
            border: "1px solid #222222",
            borderRadius: "16px",
            overflow: "hidden",
          }}
        >
          {METRICS.map((m) => (
            <div
              key={m.label}
              style={{
                background: "#181818",
                padding: "44px 36px",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: "clamp(52px, 6vw, 72px)",
                  color: "#F5F5F5",
                  lineHeight: "1",
                  marginBottom: "14px",
                  fontVariantNumeric: "tabular-nums",
                  letterSpacing: "-0.02em",
                }}
              >
                {m.value}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "15px",
                  color: "#A0A0A0",
                  lineHeight: "1.4",
                  marginBottom: "8px",
                  fontWeight: 500,
                }}
              >
                {m.label}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "10px",
                  color: "#484848",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                {m.sub}
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
