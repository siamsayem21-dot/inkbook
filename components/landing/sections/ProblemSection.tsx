"use client";

import { useEffect, useRef } from "react";

const TOOLS = [
  "Instagram DMs",
  "WhatsApp",
  "Calendly",
  "Google Sheets",
  "Venmo",
  "Paper Forms",
];

const ROTATIONS = [-3, 2, -2, 3, -1.5, 2.5];
const OFFSETS: [number, number][] = [
  [0, 0],
  [24, 28],
  [12, 56],
  [32, 84],
  [8, 112],
  [28, 140],
];

export default function ProblemSection() {
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
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      style={{ padding: "128px 0", background: "#0A0A0A" }}
    >
      <div
        className="mx-auto"
        style={{ maxWidth: "1120px", padding: "0 40px" }}
      >
        <div className="grid md:grid-cols-2 gap-16 items-center">
          {/* Left */}
          <div>
            <p
              className="reveal stagger-1"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "11px",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "#525252",
                marginBottom: "24px",
              }}
            >
              The Reality
            </p>
            <h2
              className="reveal stagger-2"
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: "clamp(40px, 5vw, 64px)",
                color: "#F5F5F5",
                lineHeight: "1.05",
                letterSpacing: "-0.02em",
                maxWidth: "560px",
                marginBottom: "24px",
              }}
            >
              Most studios run on chaos.
            </h2>
            <p
              className="reveal stagger-3"
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "18px",
                color: "#A0A0A0",
                lineHeight: "1.7",
                maxWidth: "420px",
              }}
            >
              Every inquiry is a different conversation in a different app. Leads get lost. Clients go cold. Artists waste hours on admin instead of tattooing.
            </p>
          </div>

          {/* Right — Chaos visualization */}
          <div
            className="reveal stagger-4"
            style={{ position: "relative", height: "300px" }}
          >
            {TOOLS.map((tool, i) => (
              <div
                key={tool}
                style={{
                  position: "absolute",
                  top: `${OFFSETS[i][1]}px`,
                  left: `${OFFSETS[i][0]}px`,
                  transform: `rotate(${ROTATIONS[i]}deg)`,
                  background: "#1A1A1A",
                  border: "1px solid #2E2E2E",
                  borderRadius: "10px",
                  padding: "16px 20px",
                  minWidth: "220px",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)",
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "12px",
                    color: "#525252",
                    marginBottom: "8px",
                  }}
                >
                  {tool}
                </div>
                <div
                  style={{
                    height: "8px",
                    background: "#383838",
                    borderRadius: "4px",
                    width: `${60 + (i % 3) * 15}%`,
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
