"use client";

import { useEffect, useRef } from "react";

const QUOTE_ROWS = [
  { label: "Session 1 — Blackwork base (4hr @ $175/hr)", total: "$700.00" },
  { label: "Session 2 — Detail & shading (4hr @ $175/hr)", total: "$700.00" },
];

const DEPOSIT_ROWS = [
  ["From", "Jordan M."],
  ["To artist", "Sarah M."],
  ["Collected", "Jan 15 · 2:47 PM"],
  ["Via", "Stripe · Visa ···· 4242"],
  ["Booking", "#BK-9201 · Feb 12, 2:00 PM"],
];

const RULES = [
  "Auto-kept if client no-shows — no artist action required",
  "Non-refundable per your studio cancellation policy",
  "Cannot be disabled by artist or studio — enforced by platform",
];

export default function QuotesDepositsSection() {
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
        <div className="mb-16">
          <p
            className="reveal stagger-1"
            style={{ fontFamily: "var(--font-mono)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#525252", marginBottom: "24px" }}
          >
            Quote & Deposit
          </p>
          <h2
            className="reveal stagger-2"
            style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(32px, 4vw, 56px)", color: "#F5F5F5", lineHeight: "1.1", letterSpacing: "-0.02em", maxWidth: "640px", marginBottom: "20px" }}
          >
            Your revenue is protected before you pick up a needle.
          </h2>
          <p
            className="reveal stagger-3"
            style={{ fontFamily: "var(--font-sans)", fontSize: "17px", color: "#A0A0A0", lineHeight: "1.65", maxWidth: "520px" }}
          >
            AI collects the brief. Artists set the price. InkBook collects the deposit before anyone shows up. One prevented no-show pays for an entire month of InkBook.
          </p>
        </div>

        {/* Two cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 reveal stagger-4">

          {/* Quote card */}
          <div
            style={{
              background: "#1A1A1A",
              border: "1px solid #2E2E2E",
              borderRadius: "14px",
              overflow: "hidden",
              boxShadow: "0 8px 32px rgba(0,0,0,0.5), 0 1px 3px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.07)",
            }}
          >
            <div style={{ background: "#111111", borderBottom: "1px solid #242424", padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontFamily: "var(--font-sans)", fontSize: "13px", color: "#F5F5F5", fontWeight: 500 }}>Quote #Q-2847</span>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "#525252" }}>Jan 15, 2026</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "#E8E0D0", background: "rgba(232,224,208,0.10)", border: "1px solid rgba(232,224,208,0.25)", padding: "2px 8px", borderRadius: "100px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Sent</span>
              </div>
            </div>

            <div style={{ padding: "20px" }}>
              {/* Client */}
              <div style={{ paddingBottom: "16px", marginBottom: "16px", borderBottom: "1px solid #242424", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontFamily: "var(--font-sans)", fontSize: "14px", color: "#F5F5F5", fontWeight: 500, marginBottom: "4px" }}>Jordan M.</div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "#525252" }}>Blackwork Sleeve · Artist: Sarah M.</div>
                </div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "#525252", textAlign: "right" }}>
                  <div>From AI lead brief</div>
                </div>
              </div>

              {/* Line items */}
              {QUOTE_ROWS.map((row) => (
                <div key={row.label} style={{ padding: "12px 0", borderBottom: "1px solid #1E1E1E", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontFamily: "var(--font-sans)", fontSize: "13px", color: "#A0A0A0" }}>{row.label}</span>
                  <span style={{ fontFamily: "var(--font-sans)", fontSize: "13px", color: "#F5F5F5", fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>{row.total}</span>
                </div>
              ))}

              {/* Totals */}
              <div style={{ background: "#141414", border: "1px solid #242424", borderRadius: "8px", padding: "16px", marginTop: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                  <span style={{ fontFamily: "var(--font-sans)", fontSize: "13px", color: "#A0A0A0" }}>Total</span>
                  <span style={{ fontFamily: "var(--font-sans)", fontSize: "13px", color: "#F5F5F5", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>$1,400.00</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                  <span style={{ fontFamily: "var(--font-sans)", fontSize: "13px", color: "#A0A0A0" }}>Deposit required (20%)</span>
                  <span style={{ fontFamily: "var(--font-sans)", fontSize: "13px", color: "#E8E0D0", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>$280.00</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "10px", borderTop: "1px solid #2A2A2A" }}>
                  <span style={{ fontFamily: "var(--font-sans)", fontSize: "13px", color: "#525252" }}>Balance at session</span>
                  <span style={{ fontFamily: "var(--font-sans)", fontSize: "13px", color: "#525252", fontVariantNumeric: "tabular-nums" }}>$1,120.00</span>
                </div>
              </div>

              {/* Send button */}
              <div style={{ marginTop: "16px", display: "flex", gap: "8px" }}>
                <button
                  style={{ flex: 1, background: "#F5F5F5", color: "#0A0A0A", border: "none", padding: "11px", borderRadius: "8px", fontFamily: "var(--font-sans)", fontSize: "13px", fontWeight: 500, cursor: "default" }}
                >
                  Send quote
                </button>
                <button
                  style={{ padding: "11px 16px", background: "transparent", color: "#525252", border: "1px solid #2E2E2E", borderRadius: "8px", fontFamily: "var(--font-sans)", fontSize: "13px", cursor: "default" }}
                >
                  Preview
                </button>
              </div>
            </div>
          </div>

          {/* Deposit card */}
          <div
            style={{
              background: "#1A1A1A",
              border: "1px solid #2E2E2E",
              borderRadius: "14px",
              overflow: "hidden",
              boxShadow: "0 8px 32px rgba(0,0,0,0.5), 0 1px 3px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.07)",
            }}
          >
            <div style={{ background: "#111111", borderBottom: "1px solid #242424", padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontFamily: "var(--font-sans)", fontSize: "13px", color: "#F5F5F5", fontWeight: 500 }}>Payment received</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "#4ADE80", background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)", padding: "2px 8px", borderRadius: "100px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                ✓ Collected
              </span>
            </div>

            <div style={{ padding: "20px" }}>
              {/* Amount */}
              <div style={{ textAlign: "center", padding: "24px 0", marginBottom: "16px", borderBottom: "1px solid #242424" }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "#525252", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "10px" }}>
                  Deposit collected
                </div>
                <div style={{ fontFamily: "var(--font-serif)", fontSize: "56px", color: "#F5F5F5", lineHeight: "1", marginBottom: "8px", fontVariantNumeric: "tabular-nums" }}>
                  $280
                </div>
                <div style={{ fontFamily: "var(--font-sans)", fontSize: "13px", color: "#525252" }}>
                  Blackwork Sleeve — Non-refundable
                </div>
              </div>

              {/* Receipt rows */}
              {DEPOSIT_ROWS.map(([label, value]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #1E1E1E" }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "#525252" }}>{label}</span>
                  <span style={{ fontFamily: "var(--font-sans)", fontSize: "12px", color: "#A0A0A0" }}>{value}</span>
                </div>
              ))}

              {/* Rules */}
              <div style={{ background: "#141414", border: "1px solid #1F1F1F", borderRadius: "8px", padding: "14px 16px", marginTop: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
                {RULES.map((rule) => (
                  <div key={rule} style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                    <span style={{ color: "#4ADE80", fontSize: "12px", flexShrink: 0, marginTop: "1px" }}>✓</span>
                    <span style={{ fontFamily: "var(--font-sans)", fontSize: "12px", color: "#525252", lineHeight: "1.5" }}>{rule}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>

        {/* Bottom stat */}
        <div
          className="reveal stagger-5"
          style={{ marginTop: "24px", padding: "20px 28px", background: "#111111", border: "1px solid #222222", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "24px", flexWrap: "wrap" }}
        >
          <div>
            <div style={{ fontFamily: "var(--font-sans)", fontSize: "15px", color: "#F5F5F5", fontWeight: 500, marginBottom: "4px" }}>
              Studios recover an average of $2,400 in the first 30 days.
            </div>
            <div style={{ fontFamily: "var(--font-sans)", fontSize: "13px", color: "#525252" }}>
              94% reduction in no-shows. Every deposit auto-collected. Zero manual follow-up.
            </div>
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "#525252", whiteSpace: "nowrap" }}>
            One prevented no-show pays for one month →
          </div>
        </div>

      </div>
    </section>
  );
}
