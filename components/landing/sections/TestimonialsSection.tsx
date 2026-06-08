"use client";

import { useEffect, useRef } from "react";

const PAIN_QUOTES = [
  {
    quote: "I quoted a sleeve, client agreed, came in for session one, then wanted to add a full hand piece at session two for the same price. I had no written agreement. Ended up doing $600 of extra work for free because I was afraid of conflict.",
    source: "r/TattooArtists · 847 upvotes",
    context: "On scope creep and verbal agreements",
    solve: "InkBook generates a session agreement before every appointment — scope is locked in writing before anyone picks up a needle.",
  },
  {
    quote: "I've started requiring a non-refundable deposit but I lose clients over it. Meanwhile I had four no-shows last month. Four. That's an entire day of my life gone.",
    source: "r/TattooArtists · 1,204 upvotes",
    context: "On deposits and no-shows",
    solve: "InkBook enforces deposits automatically via Stripe on every booking. It cannot be turned off — by the artist or the studio.",
  },
  {
    quote: "Between Instagram DMs, texts, emails, and my booking app — I have no idea who's a serious client and who's just browsing. I replied to 60 inquiries last month and booked 7.",
    source: "r/TattooArtists · 612 upvotes",
    context: "On inquiry management",
    solve: "InkBook AI qualifies every inquiry before an artist sees it. Unqualified leads never reach your schedule.",
  },
];

const WAITLIST = [
  { label: "Studios on early access waitlist", value: "400+" },
  { label: "Average studio size", value: "3 artists" },
  { label: "Top requested feature", value: "Deposit enforcement" },
];

export default function TestimonialsSection() {
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
        <div style={{ marginBottom: "64px" }}>
          <p
            className="reveal stagger-1"
            style={{ fontFamily: "var(--font-mono)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#525252", marginBottom: "20px" }}
          >
            Why InkBook exists
          </p>
          <h2
            className="reveal stagger-2"
            style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(32px, 4vw, 52px)", color: "#F5F5F5", lineHeight: "1.1", letterSpacing: "-0.02em", maxWidth: "640px", marginBottom: "16px" }}
          >
            Built from 3 years of listening to tattoo artists.
          </h2>
          <p
            className="reveal stagger-3"
            style={{ fontFamily: "var(--font-sans)", fontSize: "16px", color: "#606060", lineHeight: "1.65", maxWidth: "540px" }}
          >
            These are real artists. Real complaints. Shared publicly. InkBook exists because every one of these problems is solvable with the right software — software that nobody had built yet.
          </p>
        </div>

        {/* Pain quotes */}
        <div className="grid md:grid-cols-3 gap-5 reveal stagger-4" style={{ marginBottom: "48px" }}>
          {PAIN_QUOTES.map((q) => (
            <div
              key={q.source}
              style={{
                background: "#111111",
                border: "1px solid #1E1E1E",
                borderRadius: "12px",
                padding: "24px",
                display: "flex",
                flexDirection: "column",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
              }}
            >
              <div
                style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "#404040", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "14px" }}
              >
                {q.context}
              </div>
              <p
                style={{ fontFamily: "var(--font-sans)", fontSize: "14px", color: "#808080", lineHeight: "1.7", flex: 1, marginBottom: "16px" }}
              >
                &ldquo;{q.quote}&rdquo;
              </p>
              <div style={{ paddingTop: "14px", borderTop: "1px solid #1A1A1A", marginBottom: "14px" }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "#484848" }}>{q.source}</div>
              </div>
              <div style={{ background: "rgba(232,224,208,0.04)", border: "1px solid rgba(232,224,208,0.10)", borderRadius: "7px", padding: "10px 12px" }}>
                <div style={{ fontFamily: "var(--font-sans)", fontSize: "12px", color: "#707070", lineHeight: "1.55" }}>
                  {q.solve}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Early access strip */}
        <div
          className="reveal stagger-5"
          style={{
            background: "#111111",
            border: "1px solid #1E1E1E",
            borderRadius: "12px",
            padding: "28px 32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "24px",
          }}
        >
          <div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "#484848", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "6px" }}>
              Early access program
            </div>
            <div style={{ fontFamily: "var(--font-sans)", fontSize: "15px", color: "#C0C0C0", fontWeight: 500 }}>
              InkBook is accepting its first studio cohort.
            </div>
          </div>
          <div style={{ display: "flex", gap: "32px", flexWrap: "wrap" }}>
            {WAITLIST.map((item) => (
              <div key={item.label} style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "var(--font-serif)", fontSize: "28px", color: "#E8E0D0", lineHeight: "1", marginBottom: "4px" }}>
                  {item.value}
                </div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "#484848" }}>
                  {item.label}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
