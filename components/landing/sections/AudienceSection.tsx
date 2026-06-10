"use client";

import { useEffect, useRef } from "react";

const SOLO_POINTS = [
  "Stop spending hours on DMs and intake messages",
  "Deposits collected automatically — no awkward conversations",
  "Automated follow-up on every unanswered inquiry",
  "More time tattooing. Less time managing clients.",
  "Professional client experience from day one",
];

const STUDIO_POINTS = [
  "Route the right client to the right artist automatically",
  "Full revenue visibility across every artist in your studio",
  "Automated follow-up and reminders for every artist",
  "Client blacklist, waitlist, and session agreements included",
  "Scale to any number of artists without operational chaos",
];

export default function AudienceSection() {
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
        background: "#FFFFFF",
        borderTop: "1px solid #EEECEA",
      }}
    >
      <div className="mx-auto" style={{ maxWidth: "1120px", padding: "0 40px" }}>

        {/* Centered header */}
        <div style={{ textAlign: "center", marginBottom: "64px" }}>
          <p
            className="reveal stagger-1"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "#525252",
              marginBottom: "20px",
            }}
          >
            Built for the way you work
          </p>
          <h2
            className="reveal stagger-2"
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "clamp(32px, 4vw, 52px)",
              color: "#111111",
              lineHeight: "1.1",
              letterSpacing: "-0.02em",
              marginBottom: "16px",
            }}
          >
            Whether you have one chair or ten.
          </h2>
          <p
            className="reveal stagger-3"
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "17px",
              color: "#525252",
              lineHeight: "1.65",
              maxWidth: "480px",
              margin: "0 auto",
            }}
          >
            InkBook runs the full client journey for solo artists and multi-artist studios alike.
          </p>
        </div>

        {/* Two-column audience cards */}
        <div className="grid md:grid-cols-2 gap-6 reveal stagger-4" style={{ marginBottom: "48px" }}>

          {/* LEFT — Solo Artist */}
          <div
            style={{
              background: "#FFFFFF",
              border: "1px solid #E8E8E6",
              borderRadius: "16px",
              padding: "36px 36px 32px",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)",
            }}
          >
            {/* Badge */}
            <div style={{ marginBottom: "24px" }}>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "11px",
                  color: "#5A5A5A",
                  background: "#F2F2F0",
                  border: "1px solid #E0E0DE",
                  padding: "4px 12px",
                  borderRadius: "100px",
                  display: "inline-block",
                  letterSpacing: "0.04em",
                }}
              >
                Solo Artist
              </span>
            </div>

            <h3
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: "clamp(24px, 2.8vw, 32px)",
                color: "#111111",
                lineHeight: "1.15",
                letterSpacing: "-0.02em",
                marginBottom: "14px",
              }}
            >
              You tattoo. InkBook handles the rest.
            </h3>
            <p
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "14px",
                color: "#525252",
                lineHeight: "1.65",
                marginBottom: "28px",
              }}
            >
              For independent artists and private studios ready to stop losing time and revenue to admin work.
            </p>

            <ul style={{ display: "flex", flexDirection: "column", gap: "12px", flex: 1 }}>
              {SOLO_POINTS.map((point) => (
                <li key={point} style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                  <span style={{ color: "#16A34A", fontSize: "13px", flexShrink: 0, marginTop: "1px" }}>✓</span>
                  <span style={{ fontFamily: "var(--font-sans)", fontSize: "14px", color: "#525252", lineHeight: "1.5" }}>{point}</span>
                </li>
              ))}
            </ul>

            <div
              style={{
                marginTop: "28px",
                paddingTop: "20px",
                borderTop: "1px solid #E8E8E6",
              }}
            >
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "#A0A0A0" }}>
                Independent Artist Plan · $49/mo · No booking fees
              </span>
            </div>
          </div>

          {/* RIGHT — Growing Studio */}
          <div
            style={{
              background: "#FFFFFF",
              border: "1px solid #E8E8E6",
              borderRadius: "16px",
              padding: "36px 36px 32px",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)",
            }}
          >
            {/* Badge */}
            <div style={{ marginBottom: "24px" }}>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "11px",
                  color: "#2563EB",
                  background: "rgba(37,99,235,0.06)",
                  border: "1px solid rgba(37,99,235,0.16)",
                  padding: "4px 12px",
                  borderRadius: "100px",
                  display: "inline-block",
                  letterSpacing: "0.04em",
                }}
              >
                Growing Studio
              </span>
            </div>

            <h3
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: "clamp(24px, 2.8vw, 32px)",
                color: "#111111",
                lineHeight: "1.15",
                letterSpacing: "-0.02em",
                marginBottom: "14px",
              }}
            >
              Scale revenue without losing control.
            </h3>
            <p
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "14px",
                color: "#525252",
                lineHeight: "1.65",
                marginBottom: "28px",
              }}
            >
              For studio owners managing multiple artists who need revenue visibility, routing, and full operational control.
            </p>

            <ul style={{ display: "flex", flexDirection: "column", gap: "12px", flex: 1 }}>
              {STUDIO_POINTS.map((point) => (
                <li key={point} style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                  <span style={{ color: "#2563EB", fontSize: "13px", flexShrink: 0, marginTop: "1px" }}>✓</span>
                  <span style={{ fontFamily: "var(--font-sans)", fontSize: "14px", color: "#525252", lineHeight: "1.5" }}>{point}</span>
                </li>
              ))}
            </ul>

            <div
              style={{
                marginTop: "28px",
                paddingTop: "20px",
                borderTop: "1px solid #E8E8E6",
              }}
            >
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "#A0A0A0" }}>
                Studio &amp; Growing Studio Plans · From $79/mo · No booking fees
              </span>
            </div>
          </div>

        </div>

        {/* Closing line */}
        <div className="reveal stagger-5" style={{ textAlign: "center" }}>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "12px",
              color: "#A0A0A0",
              letterSpacing: "0.03em",
            }}
          >
            One operating system. Built around the tattoo business — not around tools.
          </span>
        </div>

      </div>
    </section>
  );
}
