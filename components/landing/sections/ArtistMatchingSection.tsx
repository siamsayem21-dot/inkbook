"use client";

import { useEffect, useRef } from "react";

const ARTISTS = [
  {
    initials: "SM", name: "Sarah M.",
    styles: ["Blackwork", "Dotwork", "Geometric"],
    match: 98, util: 90, next: "Tue 2:00 PM", available: true, top: true,
  },
  {
    initials: "JR", name: "Jake R.",
    styles: ["Neo-Traditional", "Color", "Illustrative"],
    match: 34, util: 68, next: "Thu 10:00 AM", available: true, top: false,
  },
  {
    initials: "MC", name: "Mia C.",
    styles: ["Fine Line", "Minimal", "Botanical"],
    match: 18, util: 100, next: null, available: false, top: false,
  },
];

const CRITERIA = [
  "Blackwork leads route only to Blackwork artists — no mismatches",
  "Portfolio compatibility scored before the artist is notified",
  "Only artists with open availability receive the lead",
  "Fully-booked artists capture demand via the waitlist — no lost clients",
];

export default function ArtistMatchingSection() {
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

          {/* Left — match cards */}
          <div className="reveal stagger-1" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {ARTISTS.map((artist) => (
              <div
                key={artist.name}
                style={{
                  background: artist.top ? "#1E1E1E" : "#171717",
                  border: `1px solid ${artist.top ? "#383838" : "#242424"}`,
                  borderRadius: "12px",
                  padding: "16px",
                  boxShadow: artist.top
                    ? "0 8px 32px rgba(0,0,0,0.5), 0 1px 3px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.08)"
                    : "inset 0 1px 0 rgba(255,255,255,0.03)",
                  opacity: artist.available ? 1 : 0.5,
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                  {/* Avatar */}
                  <div
                    style={{
                      width: "36px", height: "36px", borderRadius: "50%",
                      background: artist.top ? "rgba(232,224,208,0.12)" : "#252525",
                      border: `1px solid ${artist.top ? "rgba(232,224,208,0.35)" : "#363636"}`,
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    }}
                  >
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: artist.top ? "#E8E0D0" : "#525252" }}>
                      {artist.initials}
                    </span>
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                      <span style={{ fontFamily: "var(--font-sans)", fontSize: "14px", color: "#F5F5F5", fontWeight: 500 }}>
                        {artist.name}
                      </span>
                      {artist.top && (
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: "9px", color: "#E8E0D0", background: "rgba(232,224,208,0.10)", border: "1px solid rgba(232,224,208,0.25)", padding: "2px 7px", borderRadius: "100px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                          Top match
                        </span>
                      )}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginBottom: "10px" }}>
                      {artist.styles.map((s) => (
                        <span key={s} style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "#525252", background: "#1A1A1A", border: "1px solid #2A2A2A", padding: "2px 7px", borderRadius: "4px" }}>
                          {s}
                        </span>
                      ))}
                    </div>
                    {/* Utilization bar */}
                    <div style={{ height: "2px", background: "#222222", borderRadius: "1px", marginBottom: "6px" }}>
                      <div
                        style={{
                          height: "100%",
                          width: `${artist.util}%`,
                          background: artist.util >= 95 ? "#F59E0B" : artist.top ? "#E8E0D0" : "#3A3A3A",
                          borderRadius: "1px",
                          boxShadow: artist.top ? "0 0 6px rgba(232,224,208,0.3)" : "none",
                        }}
                      />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span
                        aria-hidden
                        style={{ display: "inline-block", width: "5px", height: "5px", borderRadius: "50%", background: artist.available ? "#4ADE80" : "#3A3A3A", flexShrink: 0 }}
                      />
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "#525252" }}>
                        {artist.available ? `Next: ${artist.next} · ${artist.util}% booked` : "Fully booked — Waitlist open"}
                      </span>
                    </div>
                  </div>

                  {/* Match score */}
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{
                      fontFamily: "var(--font-serif)",
                      fontSize: "28px",
                      lineHeight: "1",
                      color: artist.match >= 90 ? "#4ADE80" : artist.match >= 50 ? "#A0A0A0" : "#3A3A3A",
                    }}>
                      {artist.match}
                    </div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: "9px", color: "#525252", textTransform: "uppercase", letterSpacing: "0.06em" }}>match</div>
                  </div>
                </div>
              </div>
            ))}

            {/* Routing confirmation */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "12px 16px", background: "#141414", border: "1px solid #222222", borderRadius: "8px" }}>
              <span className="animate-pulse-dot" aria-hidden style={{ display: "inline-block", width: "5px", height: "5px", borderRadius: "50%", background: "#4ADE80", flexShrink: 0 }} />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "#525252" }}>
                Notification sent to Sarah M. · Lead brief delivered
              </span>
            </div>
          </div>

          {/* Right — copy */}
          <div>
            <p
              className="reveal stagger-1"
              style={{ fontFamily: "var(--font-mono)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#525252", marginBottom: "24px" }}
            >
              Step 2 — Artist Matching
            </p>
            <h2
              className="reveal stagger-2"
              style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(32px, 4vw, 52px)", color: "#F5F5F5", lineHeight: "1.1", letterSpacing: "-0.02em", marginBottom: "24px" }}
            >
              Every lead routed to the right artist. Automatically.
            </h2>
            <p
              className="reveal stagger-3"
              style={{ fontFamily: "var(--font-sans)", fontSize: "17px", color: "#A0A0A0", lineHeight: "1.65", marginBottom: "36px", maxWidth: "420px" }}
            >
              InkBook matches clients to artists based on style compatibility, portfolio alignment, and real-time availability. The right artist gets the right client — with a complete brief — before they even reply.
            </p>
            <ul
              className="reveal stagger-4"
              style={{ display: "flex", flexDirection: "column", gap: "14px" }}
            >
              {CRITERIA.map((item) => (
                <li key={item} style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                  <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#E8E0D0", flexShrink: 0, marginTop: "7px" }} />
                  <span style={{ fontFamily: "var(--font-sans)", fontSize: "14px", color: "#A0A0A0", lineHeight: "1.5" }}>{item}</span>
                </li>
              ))}
            </ul>
          </div>

        </div>
      </div>
    </section>
  );
}
