"use client";

import { useEffect, useRef } from "react";

const TOOLS_VS = [
  {
    name: "Booksy",
    type: "Booking tool",
    does: "Online booking + calendar",
    missing: "Books single appointments — not 6-month sleeve projects. No consultation, no multi-session workflow, no deposit enforcement, no aftercare.",
  },
  {
    name: "Calendly",
    type: "Scheduling tool",
    does: "Link-based appointment scheduling",
    missing: "Built for 30-minute meetings. No deposits, no lead qualification, no tattoo-specific workflow. Treats a sleeve like a coffee chat.",
  },
  {
    name: "GlossGenius",
    type: "Beauty salon software",
    does: "Booking + payments for hair and beauty",
    missing: "Built for single-service beauty appointments. Has no concept of multi-session projects, consultation briefs, or deposit protection.",
  },
  {
    name: "HubSpot",
    type: "General CRM",
    does: "Sales pipeline + contact management",
    missing: "No booking layer. No deposit collection. Requires months of setup. Designed for B2B sales cycles — not tattoo projects.",
  },
];

const OS_MODULES = [
  "AI Client Qualification",
  "Automated Follow-Up Sequences",
  "Project Quote & Pricing",
  "Mandatory Deposit Collection",
  "State-Specific Consent Forms",
  "Multi-Session Project Tracking",
  "Aftercare & Review Automation",
  "Client History & CRM",
  "Revenue Intelligence",
  "White-Label Booking Experience",
];

export default function CategorySection() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.querySelectorAll<HTMLElement>(".reveal").forEach((node, i) => {
            setTimeout(() => node.classList.add("in-view"), i * 70);
          });
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      style={{
        padding: "128px 0",
        background: "linear-gradient(180deg, rgba(255,255,255,0.018) 0px, rgba(255,255,255,0) 60px), #111111",
        borderTop: "1px solid rgba(255,255,255,0.07)",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
      }}
    >
      <div className="mx-auto" style={{ maxWidth: "1120px", padding: "0 40px" }}>

        {/* Header */}
        <div className="reveal stagger-1" style={{ marginBottom: "64px", maxWidth: "720px" }}>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#525252", marginBottom: "20px" }}>
            A new category
          </p>
          <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(36px, 5vw, 64px)", color: "#F5F5F5", lineHeight: "1.05", letterSpacing: "-0.02em", marginBottom: "24px" }}>
            A tattoo sleeve isn&apos;t an appointment. It&apos;s a 6-month project.
          </h2>
          <p style={{ fontFamily: "var(--font-sans)", fontSize: "17px", color: "#707070", lineHeight: "1.65" }}>
            Every tool the industry uses was built for 30-minute meetings and single-service bookings. Tattoo work doesn&apos;t fit that model — it involves consultation, design approval, deposits, multiple sessions across months, consent documentation, and aftercare. InkBook is the first software built around how tattoo work actually happens.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-10 items-start reveal stagger-2">

          {/* Left — Competitor comparison */}
          <div>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.07em", color: "#404040", marginBottom: "16px" }}>
              What you&apos;re currently using
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              {TOOLS_VS.map((tool) => (
                <div
                  key={tool.name}
                  style={{
                    background: "#0E0E0E",
                    border: "1px solid #1C1C1C",
                    borderRadius: "10px",
                    padding: "16px 18px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                    <span style={{ fontFamily: "var(--font-sans)", fontSize: "13px", color: "#787878", fontWeight: 500 }}>{tool.name}</span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "9px", color: "#404040", background: "#181818", border: "1px solid #252525", padding: "2px 7px", borderRadius: "4px" }}>
                      {tool.type}
                    </span>
                  </div>
                  <div style={{ fontFamily: "var(--font-sans)", fontSize: "12px", color: "#505050", marginBottom: "6px" }}>
                    Does: {tool.does}
                  </div>
                  <div style={{ fontFamily: "var(--font-sans)", fontSize: "12px", color: "#363636", lineHeight: "1.5" }}>
                    {tool.missing}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right — InkBook as OS */}
          <div>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.07em", color: "#404040", marginBottom: "16px" }}>
              InkBook — Tattoo Business Operating System
            </p>
            <div
              style={{
                background: "#181818",
                border: "1px solid #2A2A2A",
                borderRadius: "12px",
                overflow: "hidden",
                boxShadow: "0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)",
              }}
            >
              <div style={{ padding: "14px 18px", borderBottom: "1px solid #222222", background: "#131313" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "#525252", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                  10 systems. One platform. Built for tattoo businesses.
                </span>
              </div>
              <div style={{ padding: "8px" }}>
                {OS_MODULES.map((mod, i) => (
                  <div
                    key={mod}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "11px 12px",
                      borderRadius: "7px",
                      borderBottom: i < OS_MODULES.length - 1 ? "1px solid #1A1A1A" : "none",
                    }}
                  >
                    <span style={{ color: "#4ADE80", fontSize: "11px", flexShrink: 0 }}>✓</span>
                    <span style={{ fontFamily: "var(--font-sans)", fontSize: "13px", color: "#909090" }}>{mod}</span>
                  </div>
                ))}
              </div>
              <div style={{ padding: "14px 18px", borderTop: "1px solid #1C1C1C", background: "#0E0E0E" }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "#484848" }}>
                  Replacing: Instagram · WhatsApp · Calendly · Sheets · Venmo · JotForm
                </div>
              </div>
            </div>

            <div style={{ marginTop: "16px", padding: "16px 18px", background: "#0E0E0E", border: "1px solid #1C1C1C", borderRadius: "10px" }}>
              <p style={{ fontFamily: "var(--font-sans)", fontSize: "13px", color: "#505050", lineHeight: "1.6", margin: 0 }}>
                Not adapted from beauty salon software. Not repurposed from a general CRM. Built from the ground up around the tattoo studio workflow — because no one else was going to do it.
              </p>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
