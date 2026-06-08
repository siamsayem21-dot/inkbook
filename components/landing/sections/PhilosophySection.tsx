"use client";

import { useEffect, useRef } from "react";

export default function PhilosophySection() {
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
      style={{ padding: "128px 0", background: "#0A0A0A", borderTop: "1px solid rgba(255,255,255,0.04)" }}
    >
      <div
        className="mx-auto text-center"
        style={{ maxWidth: "640px", padding: "0 40px" }}
      >
        <p
          className="reveal stagger-1"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "11px",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "#525252",
            marginBottom: "32px",
          }}
        >
          Our Approach
        </p>

        <h2
          className="reveal stagger-2"
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: "clamp(32px, 4vw, 56px)",
            color: "#F5F5F5",
            lineHeight: "1.15",
            marginBottom: "32px",
          }}
        >
          AI handles the operations.
          <br />
          Artists control the art.
        </h2>

        <p
          className="reveal stagger-3"
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "18px",
            color: "#A0A0A0",
            lineHeight: "1.7",
            marginBottom: "40px",
          }}
        >
          InkBook never sets your pricing. Never overrides your decisions. AI qualifies leads, manages workflows, and keeps your studio organized — so your artists spend more time tattooing.
        </p>

        <p
          className="reveal stagger-4"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "12px",
            color: "#525252",
            letterSpacing: "0.06em",
          }}
        >
          AI assists · Artists decide · Humans control
        </p>
      </div>
    </section>
  );
}
