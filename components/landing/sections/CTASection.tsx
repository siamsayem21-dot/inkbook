"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";

export default function CTASection() {
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
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative"
      style={{ padding: "160px 24px", background: "#0A0A0A", borderTop: "1px solid rgba(255,255,255,0.04)" }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{ background: "radial-gradient(ellipse 80% 60% at 50% 100%, rgba(232,224,208,0.11) 0%, rgba(232,224,208,0.02) 55%, transparent 80%)" }}
      />

      <div className="mx-auto" style={{ maxWidth: "1120px" }}>

        <div className="grid md:grid-cols-2 gap-16 items-center">

          {/* Left — conviction statement */}
          <div>
            <p
              className="reveal stagger-1"
              style={{ fontFamily: "var(--font-mono)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#484848", marginBottom: "24px" }}
            >
              Tattoo Business Operating System
            </p>
            <h2
              className="reveal stagger-2"
              style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(40px, 5vw, 68px)", color: "#F5F5F5", letterSpacing: "-0.03em", lineHeight: "1.05", marginBottom: "20px" }}
            >
              The studios that move first will be hardest to displace.
            </h2>
            <p
              className="reveal stagger-3"
              style={{ fontFamily: "var(--font-sans)", fontSize: "17px", color: "#707070", lineHeight: "1.65", maxWidth: "440px" }}
            >
              Studios on InkBook spend more time tattooing and less time on admin. Fewer no-shows, fewer unanswered inquiries, fewer lost deposits. The first studios in will shape the product, receive white-glove onboarding, and lock founding pricing permanently.
            </p>
          </div>

          {/* Right — demo card */}
          <div className="reveal stagger-3">
            <div
              style={{
                background: "#161616",
                border: "1px solid #2A2A2A",
                borderRadius: "16px",
                overflow: "hidden",
                boxShadow: "0 8px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)",
              }}
            >
              <div style={{ padding: "28px 28px 24px" }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "#484848", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "16px" }}>
                  Book a demo
                </div>
                <div style={{ fontFamily: "var(--font-serif)", fontSize: "22px", color: "#E8E0D0", lineHeight: "1.2", marginBottom: "12px" }}>
                  20 minutes. Your full pipeline, live.
                </div>
                <p style={{ fontFamily: "var(--font-sans)", fontSize: "14px", color: "#606060", lineHeight: "1.6", marginBottom: "24px" }}>
                  We&apos;ll show you how InkBook handles your studio&apos;s specific workflow — from first inquiry to paid deposit — on your branded booking page.
                </p>

                <Link
                  href="#"
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "center",
                    fontFamily: "var(--font-sans)",
                    fontSize: "14px",
                    fontWeight: 500,
                    background: "#F5F5F5",
                    color: "#0A0A0A",
                    padding: "14px 28px",
                    borderRadius: "8px",
                    textDecoration: "none",
                    marginBottom: "12px",
                  }}
                >
                  Book your demo
                </Link>
                <Link
                  href="#pricing"
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "center",
                    fontFamily: "var(--font-sans)",
                    fontSize: "14px",
                    color: "#525252",
                    border: "1px solid #222222",
                    padding: "13px 28px",
                    borderRadius: "8px",
                    textDecoration: "none",
                  }}
                >
                  View pricing first
                </Link>
              </div>

              <div style={{ padding: "16px 28px", borderTop: "1px solid #1C1C1C", background: "#0E0E0E" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {[
                    "No credit card required to book",
                    "Founding pricing locked for your studio",
                    "White-glove setup included for early cohort",
                  ].map((item) => (
                    <div key={item} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ color: "#4ADE80", fontSize: "10px", flexShrink: 0 }}>✓</span>
                      <span style={{ fontFamily: "var(--font-sans)", fontSize: "12px", color: "#484848" }}>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
