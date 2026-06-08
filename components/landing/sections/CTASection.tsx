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
      className="relative text-center"
      style={{ padding: "160px 24px", background: "#0A0A0A", borderTop: "1px solid rgba(255,255,255,0.04)" }}
    >
      {/* Background radial */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background: "radial-gradient(ellipse 80% 60% at 50% 100%, rgba(232,224,208,0.12) 0%, rgba(232,224,208,0.03) 55%, transparent 80%)",
        }}
      />

      <div className="mx-auto" style={{ maxWidth: "680px" }}>

        <p
          className="reveal stagger-1"
          style={{ fontFamily: "var(--font-mono)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#484848", marginBottom: "28px" }}
        >
          AI-Powered Tattoo Studio Operating System
        </p>

        <h2
          className="reveal stagger-2"
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: "clamp(40px, 6vw, 72px)",
            color: "#F5F5F5",
            letterSpacing: "-0.03em",
            lineHeight: "1.05",
            marginBottom: "20px",
          }}
        >
          See how InkBook works for your studio.
        </h2>

        <p
          className="reveal stagger-3"
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "17px",
            color: "#808080",
            lineHeight: "1.65",
            maxWidth: "480px",
            margin: "0 auto 40px",
          }}
        >
          Book a 20-minute walkthrough. We&apos;ll show you the full workflow — from first inquiry to paid deposit — on your studio&apos;s branded page.
        </p>

        <div
          className="reveal stagger-4"
          style={{ display: "flex", flexDirection: "row", gap: "12px", flexWrap: "wrap", justifyContent: "center", marginBottom: "28px" }}
        >
          <Link
            href="#"
            className="inline-flex items-center hover:bg-[#E8E0D0] transition-colors duration-150"
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "14px",
              fontWeight: 500,
              background: "#F5F5F5",
              color: "#0A0A0A",
              padding: "13px 28px",
              borderRadius: "8px",
              textDecoration: "none",
            }}
          >
            Book a Demo
          </Link>
          <Link
            href="#pricing"
            className="btn-secondary"
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "14px",
              color: "#808080",
              border: "1px solid #242424",
              padding: "13px 28px",
              borderRadius: "8px",
              textDecoration: "none",
              display: "inline-block",
            }}
          >
            View Pricing
          </Link>
        </div>

        <p
          className="reveal stagger-5"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "11px",
            color: "#363636",
            letterSpacing: "0.06em",
          }}
        >
          No credit card required · Your brand · Setup in minutes
        </p>

      </div>
    </section>
  );
}
