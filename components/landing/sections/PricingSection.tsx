"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

const TIERS = [
  {
    name: "Independent Artist",
    price: 49,
    artists: "1 artist",
    desc: "Everything you need to run your bookings professionally — without the admin.",
    featured: false,
    features: [
      "AI inquiry consultation (24/7)",
      "Automated follow-up sequences",
      "Stripe deposit enforcement",
      "White-label booking page",
      "Digital consent forms",
      "Aftercare & review automation",
      "Client CRM",
    ],
  },
  {
    name: "Studio",
    price: 79,
    artists: "2–5 artists",
    desc: "The full operating system for multi-artist studios ready to stop losing revenue.",
    featured: true,
    features: [
      "Everything in Independent, plus:",
      "Multi-artist pipeline dashboard",
      "Owner revenue intelligence",
      "Artist utilization tracking",
      "Booking cap & waitlist management",
      "Session agreements",
      "Client blacklist",
    ],
  },
  {
    name: "Growing Studio",
    price: 179,
    artists: "6+ artists",
    desc: "For established studios scaling revenue and managing high inquiry volume.",
    featured: false,
    features: [
      "Everything in Studio, plus:",
      "Priority onboarding & setup",
      "Advanced revenue analytics",
      "Custom intake workflows",
      "Multi-location support",
      "Dedicated account setup",
      "Early access to new features",
    ],
  },
] as const;

export default function PricingSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); observer.disconnect(); } },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section id="pricing" ref={sectionRef} style={{ padding: "128px 0", background: "#0A0A0A" }}>
      <div className="mx-auto" style={{ maxWidth: "1120px", padding: "0 40px" }}>

        {/* Header */}
        <div className="text-center mb-20">
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "#525252",
              marginBottom: "24px",
              opacity: inView ? 1 : 0,
              transform: inView ? "none" : "translateY(16px)",
              transition: "opacity 600ms var(--ease-out), transform 600ms var(--ease-out)",
            }}
          >
            Pricing
          </p>
          <h2
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "clamp(28px, 3.5vw, 48px)",
              color: "#F5F5F5",
              lineHeight: "1.1",
              maxWidth: "540px",
              margin: "0 auto 16px",
              opacity: inView ? 1 : 0,
              transform: inView ? "none" : "translateY(20px)",
              transition: "opacity 700ms 80ms var(--ease-out), transform 700ms 80ms var(--ease-out)",
            }}
          >
            Replace six tools with one. Pay less than you already do.
          </h2>
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "16px",
              color: "#525252",
              opacity: inView ? 1 : 0,
              transition: "opacity 600ms 160ms var(--ease-out)",
            }}
          >
            No contracts. Cancel anytime. Founding pricing locked for early cohort.
          </p>
        </div>

        {/* Cards */}
        <div
          className="grid grid-cols-1 md:grid-cols-3 items-end gap-4"
          style={{
            opacity: inView ? 1 : 0,
            transform: inView ? "none" : "translateY(24px)",
            transition: "opacity 700ms 240ms var(--ease-out), transform 700ms 240ms var(--ease-out)",
          }}
        >
          {TIERS.map(({ name, price, artists, desc, featured, features }) => (
            <div
              key={name}
              className={featured ? "pricing-card-featured animate-glow-breathe" : "pricing-card"}
              style={{
                background: featured ? "#1C1C1C" : "#181818",
                border: `1px solid ${featured ? "#3A3A3A" : "#282828"}`,
                borderRadius: "14px",
                padding: featured ? "48px 32px 36px" : "32px",
                position: "relative",
                transform: featured ? "translateY(-14px)" : "none",
                boxShadow: featured
                  ? "0 0 0 1px #3A3A3A, 0 32px 64px rgba(0,0,0,0.65), 0 8px 24px rgba(0,0,0,0.75), inset 0 1px 0 rgba(255,255,255,0.09)"
                  : "0 4px 16px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {/* Featured badge */}
              {featured && (
                <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", background: "#E8E0D0", borderRadius: "0 0 8px 8px", padding: "4px 16px" }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "#0A0A0A", textTransform: "uppercase", letterSpacing: "0.1em", whiteSpace: "nowrap" }}>Most Popular</span>
                </div>
              )}
              {featured && (
                <div aria-hidden style={{ position: "absolute", top: 0, left: 0, right: 0, height: "1px", borderRadius: "14px 14px 0 0", background: "linear-gradient(90deg, transparent, rgba(232,224,208,0.45), transparent)", pointerEvents: "none" }} />
              )}

              {/* Artist count */}
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "10px",
                  color: featured ? "#E8E0D0" : "#484848",
                  background: featured ? "rgba(232,224,208,0.08)" : "#161616",
                  border: `1px solid ${featured ? "rgba(232,224,208,0.2)" : "#242424"}`,
                  padding: "3px 10px",
                  borderRadius: "100px",
                  display: "inline-block",
                  marginBottom: "20px",
                  marginTop: featured ? "12px" : "0",
                }}
              >
                {artists}
              </div>

              {/* Tier name */}
              <div style={{ fontFamily: "var(--font-sans)", fontSize: "12px", color: featured ? "#A0A0A0" : "#525252", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "16px" }}>
                {name}
              </div>

              {/* Price */}
              <div style={{ display: "flex", alignItems: "flex-end", gap: "2px", marginBottom: "14px" }}>
                <span style={{ fontFamily: "var(--font-serif)", fontSize: featured ? "64px" : "52px", color: "#F5F5F5", lineHeight: "1" }}>
                  ${price}
                </span>
                <span style={{ fontFamily: "var(--font-sans)", fontSize: "18px", color: "#525252", marginBottom: "8px" }}>/mo</span>
              </div>

              {/* No fees */}
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "#484848", marginBottom: "16px" }}>
                No booking fees · No setup fees · Cancel anytime
              </div>

              {/* Desc */}
              <p style={{ fontFamily: "var(--font-sans)", fontSize: "13px", color: "#707070", lineHeight: "1.55", marginBottom: "24px" }}>
                {desc}
              </p>

              {/* Divider */}
              <div style={{ height: "1px", background: featured ? "#3A3A3A" : "#282828", marginBottom: "20px" }} />

              {/* Feature list */}
              <ul style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "28px", flex: 1 }}>
                {features.map((f, fi) => (
                  <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                    {fi === 0 && f.endsWith(":") ? (
                      <span style={{ fontFamily: "var(--font-sans)", fontSize: "12px", color: "#404040", lineHeight: "1.4" }}>{f}</span>
                    ) : (
                      <>
                        <span style={{ color: featured ? "#86EFAC" : "#4ADE80", fontSize: "11px", flexShrink: 0, marginTop: "1px" }}>✓</span>
                        <span style={{ fontFamily: "var(--font-sans)", fontSize: "13px", color: featured ? "#A0A0A0" : "#686868", lineHeight: "1.4" }}>{f}</span>
                      </>
                    )}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Link
                href="#"
                style={{
                  display: "block",
                  textAlign: "center",
                  textDecoration: "none",
                  fontFamily: "var(--font-sans)",
                  fontSize: "14px",
                  fontWeight: featured ? 500 : 400,
                  color: featured ? "#0A0A0A" : "#A0A0A0",
                  background: featured ? "#F5F5F5" : "transparent",
                  border: featured ? "none" : "1px solid #363636",
                  padding: featured ? "14px" : "13px",
                  borderRadius: "8px",
                  transition: "background 150ms, color 150ms, border-color 150ms",
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget;
                  if (featured) el.style.background = "#E8E0D0";
                  else { el.style.borderColor = "#3A3A3A"; el.style.color = "#F5F5F5"; }
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget;
                  if (featured) el.style.background = "#F5F5F5";
                  else { el.style.borderColor = "#363636"; el.style.color = "#A0A0A0"; }
                }}
              >
                Get Started
              </Link>
            </div>
          ))}
        </div>

        {/* Bottom note */}
        <div
          style={{
            marginTop: "40px",
            padding: "18px 24px",
            background: "#111111",
            border: "1px solid #1E1E1E",
            borderRadius: "10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px",
            flexWrap: "wrap",
            opacity: inView ? 1 : 0,
            transition: "opacity 600ms 400ms var(--ease-out)",
          }}
        >
          <span style={{ fontFamily: "var(--font-sans)", fontSize: "13px", color: "#505050", lineHeight: "1.5" }}>
            Not sure which plan fits your studio? Book a 20-minute demo — we&apos;ll show you the full system live and recommend a plan based on your volume.
          </span>
          <Link
            href="#"
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "13px",
              color: "#E8E0D0",
              textDecoration: "none",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            Book a demo →
          </Link>
        </div>

      </div>
    </section>
  );
}
