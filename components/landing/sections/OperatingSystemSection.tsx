"use client";

import { useEffect, useRef } from "react";

const TOOLS = [
  {
    name: "Calendly",
    type: "Scheduling Tool",
    does: "Schedules appointments.",
    doesnt:
      "Doesn't qualify tattoo leads. Doesn't collect deposits. Doesn't follow up. Has no concept of a tattoo client.",
  },
  {
    name: "HubSpot",
    type: "General CRM",
    does: "Manages contacts.",
    doesnt:
      "Doesn't book clients. Doesn't collect deposits. Requires months of customization for a tattoo workflow.",
  },
  {
    name: "Booksy",
    type: "Booking Platform",
    does: "Handles online bookings.",
    doesnt:
      "Doesn't consult, doesn't follow up automatically, doesn't manage multi-session projects. Not built for tattoo.",
  },
  {
    name: "GlossGenius",
    type: "Beauty Software",
    does: "Processes payments for salons and spas.",
    doesnt:
      "Built for single-service beauty appointments — not for tattoo projects, multi-session work, or consultation.",
  },
];

export default function OperatingSystemSection() {
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
        <div style={{ marginBottom: "72px" }}>
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
            A new category
          </p>
          <h2
            className="reveal stagger-2"
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "clamp(32px, 4vw, 52px)",
              color: "#F5F5F5",
              lineHeight: "1.1",
              letterSpacing: "-0.02em",
              maxWidth: "680px",
              marginBottom: "20px",
            }}
          >
            One tool solves one step. InkBook runs the whole journey.
          </h2>
          <p
            className="reveal stagger-3"
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "17px",
              color: "#606060",
              lineHeight: "1.65",
              maxWidth: "560px",
            }}
          >
            Every tool tattoo studios use today was built for someone else. They solve one step — and leave the rest to you.
          </p>
        </div>

        {/* Tool comparison rows */}
        <div className="reveal stagger-4" style={{ marginBottom: "48px" }}>
          {/* Column headers — desktop only */}
          <div
            className="hidden md:grid"
            style={{
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: "0 32px",
              padding: "0 0 12px",
              borderBottom: "1px solid #1C1C1C",
              marginBottom: "0",
            }}
          >
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.07em", color: "#404040" }}>Tool</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.07em", color: "#404040" }}>What it does</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.07em", color: "#404040" }}>What it doesn&apos;t</span>
          </div>

          {TOOLS.map((tool, i) => (
            <div
              key={tool.name}
              className="reveal"
              style={{
                borderBottom: i < TOOLS.length - 1 ? "1px solid #1C1C1C" : "none",
              }}
            >
              {/* Desktop: 3-col grid */}
              <div
                className="hidden md:grid"
                style={{
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: "0 32px",
                  padding: "24px 0",
                  alignItems: "start",
                }}
              >
                {/* Col 1: Tool name + type tag */}
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <span
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: "15px",
                      color: "#787878",
                      fontWeight: 500,
                    }}
                  >
                    {tool.name}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "10px",
                      color: "#404040",
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid #282828",
                      padding: "2px 8px",
                      borderRadius: "100px",
                      display: "inline-block",
                      width: "fit-content",
                    }}
                  >
                    {tool.type}
                  </span>
                </div>

                {/* Col 2: What it does */}
                <span
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: "14px",
                    color: "#C0C0C0",
                    lineHeight: "1.6",
                    paddingTop: "2px",
                  }}
                >
                  {tool.does}
                </span>

                {/* Col 3: What it doesn't */}
                <span
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: "13px",
                    color: "#464646",
                    lineHeight: "1.65",
                    paddingTop: "2px",
                  }}
                >
                  {tool.doesnt}
                </span>
              </div>

              {/* Mobile: stacked */}
              <div className="md:hidden" style={{ padding: "20px 0" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                  <span style={{ fontFamily: "var(--font-sans)", fontSize: "15px", color: "#787878", fontWeight: 500 }}>
                    {tool.name}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "10px",
                      color: "#404040",
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid #282828",
                      padding: "2px 8px",
                      borderRadius: "100px",
                    }}
                  >
                    {tool.type}
                  </span>
                </div>
                <p style={{ fontFamily: "var(--font-sans)", fontSize: "14px", color: "#C0C0C0", lineHeight: "1.6", marginBottom: "6px" }}>
                  {tool.does}
                </p>
                <p style={{ fontFamily: "var(--font-sans)", fontSize: "13px", color: "#464646", lineHeight: "1.65" }}>
                  {tool.doesnt}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Closing conviction box */}
        <div
          className="reveal stagger-5"
          style={{
            background: "#141414",
            border: "1px solid #2A2A2A",
            borderRadius: "14px",
            padding: "48px 48px 44px",
            position: "relative",
            overflow: "hidden",
            boxShadow: "0 4px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.07)",
          }}
        >
          {/* Top edge inset highlight */}
          <div
            aria-hidden
            style={{
              position: "absolute",
              top: 0,
              left: "40px",
              right: "40px",
              height: "1px",
              background: "linear-gradient(90deg, transparent, rgba(232,224,208,0.25), transparent)",
            }}
          />

          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "#525252",
              marginBottom: "20px",
            }}
          >
            InkBook · Tattoo Studio Operating System
          </p>

          <h3
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "clamp(28px, 3.5vw, 44px)",
              color: "#F5F5F5",
              lineHeight: "1.15",
              letterSpacing: "-0.02em",
              marginBottom: "28px",
              maxWidth: "600px",
            }}
          >
            Manages the entire client journey. Not one step of it.
          </h3>

          {/* Workflow line */}
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(11px, 1.4vw, 13px)",
              color: "#E8E0D0",
              background: "rgba(232,224,208,0.04)",
              border: "1px solid rgba(232,224,208,0.10)",
              borderRadius: "8px",
              padding: "14px 20px",
              marginBottom: "28px",
              overflowX: "auto",
              whiteSpace: "nowrap",
              letterSpacing: "0.02em",
            }}
          >
            Inquiry → AI Consultation → AI Follow-Up → Quote → Deposit → Booking → Aftercare
          </div>

          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "15px",
              color: "#606060",
              lineHeight: "1.7",
              maxWidth: "560px",
            }}
          >
            Not adapted from beauty software. Not repurposed from a general CRM. Built from the ground up for the way tattoo businesses actually operate.
          </p>
        </div>

      </div>
    </section>
  );
}
