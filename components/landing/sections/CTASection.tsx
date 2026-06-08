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
      {/* Background radial — bottom */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% 100%, rgba(232,224,208,0.09) 0%, rgba(232,224,208,0.02) 60%, transparent 80%)",
        }}
      />

      <div className="mx-auto" style={{ maxWidth: "800px" }}>
        <h2
          className="reveal stagger-1"
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: "clamp(40px, 6vw, 80px)",
            color: "#F5F5F5",
            letterSpacing: "-0.03em",
            lineHeight: "1.05",
            marginBottom: "16px",
          }}
        >
          Your studio. One system.
        </h2>

        <p
          className="reveal stagger-2"
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "18px",
            color: "#A0A0A0",
            marginBottom: "40px",
          }}
        >
          Join studios already building on InkBook.
        </p>

        <div className="reveal stagger-3" style={{ marginBottom: "20px" }}>
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
            Get Early Access
          </Link>
        </div>

        <p
          className="reveal stagger-4"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "12px",
            color: "#525252",
            letterSpacing: "0.06em",
          }}
        >
          No credit card required · Setup in minutes
        </p>
      </div>
    </section>
  );
}
