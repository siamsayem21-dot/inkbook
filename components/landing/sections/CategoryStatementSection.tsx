"use client";

import { useEffect, useRef } from "react";

export default function CategoryStatementSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.querySelectorAll<HTMLElement>(".reveal").forEach((node, i) => {
            setTimeout(() => node.classList.add("in-view"), i * 110);
          });
          observer.disconnect();
        }
      },
      { threshold: 0.25 }
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

        {/* Contrast — dim then bright */}
        <div className="reveal stagger-2" style={{ marginBottom: "52px" }}>
          <p
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "clamp(30px, 4.5vw, 58px)",
              color: "#2E2E2E",
              lineHeight: "1.15",
              letterSpacing: "-0.025em",
              marginBottom: "6px",
            }}
          >
            Most software manages appointments.
          </p>
          <p
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "clamp(30px, 4.5vw, 58px)",
              color: "#F0EDE8",
              lineHeight: "1.15",
              letterSpacing: "-0.025em",
            }}
          >
            InkBook manages the entire tattoo client journey.
          </p>
        </div>

        {/* Divider */}
        <div
          className="reveal stagger-3"
          style={{
            width: "40px",
            height: "1px",
            background: "#282828",
            margin: "0 auto 52px",
          }}
        />

        {/* Supporting copy */}
        <p
          className="reveal stagger-4"
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "18px",
            color: "#565656",
            lineHeight: "1.75",
            maxWidth: "560px",
            margin: "0 auto 60px",
          }}
        >
          From inquiry to deposit collection, AI handles the admin work so artists can focus on what they do best — tattooing.
        </p>

        {/* OS pill */}
        <div
          className="reveal stagger-5"
          style={{ display: "flex", justifyContent: "center" }}
        >
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              letterSpacing: "0.06em",
              color: "#E8E0D0",
              background: "rgba(232,224,208,0.05)",
              border: "1px solid rgba(232,224,208,0.11)",
              padding: "9px 22px",
              borderRadius: "100px",
              display: "inline-block",
            }}
          >
            The operating system for tattoo businesses
          </span>
        </div>

      </div>
    </section>
  );
}
