"use client";

import { useEffect, useRef } from "react";

const TESTIMONIALS = [
  {
    quote: "Before InkBook, I was losing 2 or 3 deposits a month to no-shows. Now the deposit is collected automatically when they book. I haven't had an unpaid cancellation in four months.",
    name: "Maria Chen",
    role: "Owner",
    studio: "Black Tide Tattoo",
    location: "Portland, OR",
    initials: "MC",
  },
  {
    quote: "We have six artists. Managing inquiries across Instagram, email, and text was a mess. Now every inquiry goes through the same system, gets qualified by AI, and lands with the right artist — complete with a brief.",
    name: "James Rourke",
    role: "Studio Manager",
    studio: "Iron & Ink Collective",
    location: "Austin, TX",
    initials: "JR",
  },
  {
    quote: "My clients think I built my own booking system. They see my logo, my domain, my colors. It took twenty minutes to set up. That's the professional image I always wanted but couldn't afford to build.",
    name: "Sofia Vega",
    role: "Artist & Owner",
    studio: "Velvet Needle Studio",
    location: "Miami, FL",
    initials: "SV",
  },
];

export default function TestimonialsSection() {
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
        background: "#0A0A0A",
        borderTop: "1px solid rgba(255,255,255,0.04)",
      }}
    >
      <div className="mx-auto" style={{ maxWidth: "1120px", padding: "0 40px" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "64px" }}>
          <p
            className="reveal stagger-1"
            style={{ fontFamily: "var(--font-mono)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#525252", marginBottom: "20px" }}
          >
            From studio owners
          </p>
          <h2
            className="reveal stagger-2"
            style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(32px, 4vw, 52px)", color: "#F5F5F5", lineHeight: "1.1", letterSpacing: "-0.02em" }}
          >
            Studios that made the switch.
          </h2>
        </div>

        {/* Cards */}
        <div className="grid md:grid-cols-3 gap-5 reveal stagger-3">
          {TESTIMONIALS.map((t) => (
            <div
              key={t.name}
              style={{
                background: "#1A1A1A",
                border: "1px solid #2A2A2A",
                borderRadius: "14px",
                padding: "28px",
                display: "flex",
                flexDirection: "column",
                boxShadow: "0 4px 16px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)",
              }}
            >
              {/* Opening mark */}
              <div
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: "32px",
                  color: "#2E2E2E",
                  lineHeight: "1",
                  marginBottom: "16px",
                  userSelect: "none",
                }}
                aria-hidden
              >
                &ldquo;
              </div>

              {/* Quote */}
              <p
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "15px",
                  color: "#B8B8B8",
                  lineHeight: "1.75",
                  flex: 1,
                  marginBottom: "28px",
                }}
              >
                {t.quote}
              </p>

              {/* Author */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  paddingTop: "20px",
                  borderTop: "1px solid #242424",
                }}
              >
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "50%",
                    background: "#222222",
                    border: "1px solid #343434",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "#525252" }}>{t.initials}</span>
                </div>
                <div>
                  <div style={{ fontFamily: "var(--font-sans)", fontSize: "13px", color: "#E0E0E0", fontWeight: 500 }}>{t.name}</div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "#484848", marginTop: "2px" }}>{t.role} · {t.studio}</div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "#363636", marginTop: "1px" }}>{t.location}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
