"use client";

import { useEffect, useRef } from "react";

const POINTS = [
  "Your domain, your name, your logo — clients never see InkBook",
  "Every booking, confirmation, and aftercare message reinforces your reputation",
  "Clients remember you as the studio that had everything right from the first message",
  "InkBook runs the system invisibly — your clients never know we exist",
];

const FORM_FIELDS = [
  { label: "Full name", value: "Jordan Martinez" },
  { label: "Phone", value: "(512) 555-0182" },
  { label: "Style requested", value: "Blackwork" },
];

export default function WhiteLabelSection() {
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
        background: "linear-gradient(180deg, rgba(255,255,255,0.018) 0px, rgba(255,255,255,0) 60px), #111111",
        borderTop: "1px solid rgba(255,255,255,0.07)",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
      }}
    >
      <div className="mx-auto" style={{ maxWidth: "1120px", padding: "0 40px" }}>
        <div className="grid md:grid-cols-2 gap-16 items-center">

          {/* Left — branded booking page mockup */}
          <div className="reveal stagger-1">
            {/* Browser frame */}
            <div
              style={{
                background: "#1A1A1A",
                border: "1px solid #2E2E2E",
                borderRadius: "14px",
                overflow: "hidden",
                boxShadow: "0 1px 3px rgba(0,0,0,0.9), 0 8px 24px rgba(0,0,0,0.65), 0 24px 64px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)",
              }}
            >
              {/* Browser chrome */}
              <div style={{ background: "#141414", borderBottom: "1px solid #242424", padding: "10px 16px", display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ display: "flex", gap: "5px" }}>
                  {["#505050", "#505050", "#505050"].map((c, i) => (
                    <div key={i} aria-hidden style={{ width: "8px", height: "8px", borderRadius: "50%", background: c }} />
                  ))}
                </div>
                <div style={{ flex: 1, background: "#1E1E1E", border: "1px solid #2A2A2A", borderRadius: "6px", padding: "4px 10px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <span aria-hidden style={{ color: "#3A3A3A", fontSize: "10px" }}>🔒</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "#525252" }}>bookings.inkandironstudio.com</span>
                </div>
              </div>

              {/* Page content — client-facing white label */}
              <div style={{ background: "#F8F8F7", padding: "0" }}>
                {/* Studio header */}
                <div style={{ background: "#0A0A0A", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{ width: "28px", height: "28px", background: "#E8E0D0", borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontFamily: "var(--font-serif)", fontSize: "12px", color: "#0A0A0A", fontWeight: 600 }}>II</span>
                    </div>
                    <div>
                      <div style={{ fontFamily: "var(--font-serif)", fontSize: "13px", color: "#F5F5F5" }}>Ink & Iron Studio</div>
                      <div style={{ fontFamily: "var(--font-sans)", fontSize: "10px", color: "#525252" }}>Phoenix, AZ · Accepting new clients</div>
                    </div>
                  </div>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "#4ADE80", background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)", padding: "2px 8px", borderRadius: "100px" }}>Open</span>
                </div>

                {/* Booking form */}
                <div style={{ padding: "20px", background: "#FAFAF9" }}>
                  <div style={{ fontFamily: "var(--font-sans)", fontSize: "12px", color: "#3A3A3A", fontWeight: 600, marginBottom: "16px" }}>
                    Request a Tattoo Appointment
                  </div>
                  {FORM_FIELDS.map((field) => (
                    <div key={field.label} style={{ marginBottom: "12px" }}>
                      <div style={{ fontFamily: "var(--font-sans)", fontSize: "10px", color: "#6B6B6B", fontWeight: 500, marginBottom: "4px" }}>{field.label}</div>
                      <div style={{ background: "#FFFFFF", border: "1px solid #E0E0E0", borderRadius: "6px", padding: "8px 12px", fontFamily: "var(--font-sans)", fontSize: "12px", color: "#1A1A1A" }}>
                        {field.value}
                      </div>
                    </div>
                  ))}
                  <div style={{ marginBottom: "16px" }}>
                    <div style={{ fontFamily: "var(--font-sans)", fontSize: "10px", color: "#6B6B6B", fontWeight: 500, marginBottom: "4px" }}>Reference images</div>
                    <div style={{ background: "#FFFFFF", border: "1px dashed #C0C0C0", borderRadius: "6px", padding: "16px", textAlign: "center" }}>
                      <div style={{ fontFamily: "var(--font-sans)", fontSize: "10px", color: "#A0A0A0" }}>Drop images or click to upload</div>
                    </div>
                  </div>
                  <button style={{ width: "100%", background: "#0A0A0A", color: "#F5F5F5", border: "none", padding: "11px", borderRadius: "6px", fontFamily: "var(--font-sans)", fontSize: "12px", fontWeight: 500, cursor: "default" }}>
                    Request Appointment
                  </button>
                  <div style={{ fontFamily: "var(--font-sans)", fontSize: "10px", color: "#A0A0A0", textAlign: "center", marginTop: "10px" }}>
                    Secured by InkBook · No account required
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right — copy */}
          <div>
            <p
              className="reveal stagger-1"
              style={{ fontFamily: "var(--font-mono)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#525252", marginBottom: "24px" }}
            >
              Your Brand. Your Experience.
            </p>
            <h2
              className="reveal stagger-2"
              style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(32px, 4vw, 52px)", color: "#F5F5F5", lineHeight: "1.1", letterSpacing: "-0.02em", marginBottom: "24px" }}
            >
              Clients experience your studio. Not a software company.
            </h2>
            <p
              className="reveal stagger-3"
              style={{ fontFamily: "var(--font-sans)", fontSize: "17px", color: "#A0A0A0", lineHeight: "1.65", marginBottom: "36px", maxWidth: "420px" }}
            >
              Your reputation took years to build. Clients don&apos;t book InkBook — they book you. Every page, every message, every aftercare follow-up carries your studio&apos;s name and brand. InkBook powers everything invisibly. Your clients never know we exist.
            </p>
            <ul
              className="reveal stagger-4"
              style={{ display: "flex", flexDirection: "column", gap: "14px" }}
            >
              {POINTS.map((point) => (
                <li key={point} style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                  <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#E8E0D0", flexShrink: 0, marginTop: "7px" }} />
                  <span style={{ fontFamily: "var(--font-sans)", fontSize: "14px", color: "#A0A0A0", lineHeight: "1.5" }}>{point}</span>
                </li>
              ))}
            </ul>

            {/* Domain example */}
            <div
              className="reveal stagger-5"
              style={{ marginTop: "36px", background: "#141414", border: "1px solid #242424", borderRadius: "10px", padding: "16px 18px", display: "flex", alignItems: "center", gap: "12px" }}
            >
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "#3A3A3A" }}>🔒</span>
              <div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "#E8E0D0" }}>bookings.inkandironstudio.com</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "#525252", marginTop: "2px" }}>Your custom domain · Powered by InkBook</div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
