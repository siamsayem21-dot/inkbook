"use client";

import { useState, useEffect, useRef } from "react";

const STEPS = [
  {
    n: "01",
    stage: "Inquiry",
    label: "Lead captured instantly",
    body: "Client submits through your white-label booking page. Style, placement, budget, and references collected in a single structured intake — no DMs, no emails, no spreadsheets.",
  },
  {
    n: "02",
    stage: "AI Consultation",
    label: "AI qualifies every lead",
    body: "AI conducts a conversational intake and builds a complete project brief with a quality score. Artists receive a structured summary — not a pile of unread messages.",
  },
  {
    n: "03",
    stage: "AI Follow-Up",
    label: "No lead goes cold",
    body: "Client goes quiet after a quote? AI follows up at 24h, 48h, and 72h automatically. Leads that would have gone to a competitor are recovered without any manual effort.",
  },
  {
    n: "04",
    stage: "Quote",
    label: "Professional quote in one click",
    body: "Artist reviews the AI-prepared brief and sends an itemized quote in one click. No negotiating over minimum rates. No back-and-forth on scope.",
  },
  {
    n: "05",
    stage: "Deposit",
    label: "Revenue protected by design",
    body: "Stripe deposit collected on every booking. Non-refundable. Auto-kept on no-shows. Booking cannot proceed without payment — this cannot be turned off.",
  },
  {
    n: "06",
    stage: "Booking",
    label: "Everything locked before they arrive",
    body: "Consent form signed digitally. Calendar blocked. SMS reminders scheduled for 48h and day-of. The booking is complete before anyone picks up a needle.",
  },
  {
    n: "07",
    stage: "Aftercare",
    label: "AI keeps the relationship warm",
    body: "Personalized aftercare sent after every session. Healing reminders. A rebooking prompt at the right moment. Clients return because InkBook keeps the conversation going.",
  },
  {
    n: "08",
    stage: "CRM",
    label: "Every client, remembered",
    body: "Full client history, preferred styles, lifetime spend, session notes, and rebooking status — all searchable. Your best clients get the experience they deserve.",
  },
];

function CardShell({
  title,
  badge,
  badgeGreen,
  children,
  footer,
}: {
  title: string;
  badge?: string;
  badgeGreen?: boolean;
  children: React.ReactNode;
  footer?: string;
}) {
  return (
    <div
      style={{
        background: "#161616",
        border: "1px solid #272727",
        borderRadius: "12px",
        overflow: "hidden",
        boxShadow: "0 8px 32px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.05)",
      }}
    >
      <div
        style={{
          background: "#0F0F0F",
          borderBottom: "1px solid #1E1E1E",
          padding: "10px 18px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", gap: "5px" }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              aria-hidden
              style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#2C2C2C" }}
            />
          ))}
        </div>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "10px",
            color: "#484848",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          {title}
        </span>
        {badge ? (
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "10px",
              color: badgeGreen ? "#86EFAC" : "#808080",
              background: badgeGreen ? "rgba(134,239,172,0.10)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${badgeGreen ? "rgba(134,239,172,0.25)" : "#282828"}`,
              padding: "2px 8px",
              borderRadius: "100px",
            }}
          >
            {badge}
          </span>
        ) : (
          <div style={{ width: "48px" }} />
        )}
      </div>
      <div style={{ padding: "18px" }}>{children}</div>
      {footer && (
        <div
          style={{
            background: "#0D0D0D",
            borderTop: "1px solid #1A1A1A",
            padding: "10px 18px",
            display: "flex",
            alignItems: "center",
            gap: "7px",
          }}
        >
          <span
            className="animate-pulse-dot"
            aria-hidden
            style={{
              display: "inline-block",
              width: "5px",
              height: "5px",
              borderRadius: "50%",
              background: "#E8E0D0",
              flexShrink: 0,
            }}
          />
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "#484848" }}>
            {footer}
          </span>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "8px 0",
        borderBottom: "1px solid #1C1C1C",
      }}
    >
      <span style={{ fontFamily: "var(--font-sans)", fontSize: "12px", color: "#585858" }}>{label}</span>
      <span
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: "12px",
          color: accent ? "#86EFAC" : "#C8C8C8",
          fontWeight: accent ? 500 : 400,
        }}
      >
        {value}
      </span>
    </div>
  );
}

function Check({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "7px 0" }}>
      <span style={{ color: "#86EFAC", fontSize: "11px", flexShrink: 0 }}>✓</span>
      <span style={{ fontFamily: "var(--font-sans)", fontSize: "12px", color: "#A0A0A0", flex: 1 }}>{label}</span>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "#585858" }}>{value}</span>
    </div>
  );
}

function CardInquiry() {
  return (
    <CardShell title="New Inquiry" badge="Just now" footer="Routing to AI consultation...">
      <Row label="Client" value="Jordan M." />
      <Row label="Style" value="Blackwork" />
      <Row label="Placement" value="Full forearm" />
      <Row label="Budget" value="$400 – $600" />
      <Row label="References" value="2 images uploaded" />
    </CardShell>
  );
}

function CardConsultation() {
  return (
    <CardShell
      title="AI Consultation · Jordan M."
      badge="Qualified"
      badgeGreen
      footer="Quality score: 94 / 100 · Brief sent to artist"
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <div style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
          <div
            style={{
              width: "20px",
              height: "20px",
              borderRadius: "50%",
              background: "rgba(232,224,208,0.08)",
              border: "1px solid rgba(232,224,208,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "8px", color: "#E8E0D0" }}>AI</span>
          </div>
          <div
            style={{
              background: "#1E1E1E",
              border: "1px solid #2A2A2A",
              borderRadius: "8px 8px 8px 2px",
              padding: "8px 12px",
              maxWidth: "85%",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "12px",
                color: "#909090",
                lineHeight: "1.5",
              }}
            >
              What tattoo style are you looking for, and do you have any reference images?
            </span>
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "flex-start", flexDirection: "row-reverse" }}>
          <div
            style={{
              width: "20px",
              height: "20px",
              borderRadius: "50%",
              background: "#232323",
              border: "1px solid #2E2E2E",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "8px", color: "#686868" }}>JM</span>
          </div>
          <div
            style={{
              background: "#1A1A1A",
              border: "1px solid #252525",
              borderRadius: "8px 8px 2px 8px",
              padding: "8px 12px",
              maxWidth: "85%",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "12px",
                color: "#808080",
                lineHeight: "1.5",
              }}
            >
              Blackwork geometric, full forearm. Here are my references.
            </span>
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
          <div
            style={{
              width: "20px",
              height: "20px",
              borderRadius: "50%",
              background: "rgba(232,224,208,0.08)",
              border: "1px solid rgba(232,224,208,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "8px", color: "#E8E0D0" }}>AI</span>
          </div>
          <div
            style={{
              background: "#1E1E1E",
              border: "1px solid #2A2A2A",
              borderRadius: "8px 8px 8px 2px",
              padding: "8px 12px",
              maxWidth: "85%",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "12px",
                color: "#909090",
                lineHeight: "1.5",
              }}
            >
              Great choice. What&apos;s your budget range? Our minimum for blackwork sleeves is $150/hr.
            </span>
          </div>
        </div>
      </div>
    </CardShell>
  );
}

function CardFollowUp() {
  return (
    <CardShell title="AI Follow-Up" badge="48h · No response" footer="Sent automatically · Jan 16, 2:15 PM">
      <div style={{ display: "flex", flexDirection: "column", gap: "0", marginBottom: "14px" }}>
        {[
          { time: "Jan 15, 9:42 AM", label: "Quote sent to Jordan M.", active: false, done: true },
          { time: "Jan 16, 9:42 AM", label: "24h · No response · Nudge sent", active: false, done: true },
          { time: "Jan 17, 9:42 AM", label: "48h · Nudge sent ← now", active: true, done: true },
          { time: "Jan 18, 9:42 AM", label: "72h · Final follow-up scheduled", active: false, done: false },
        ].map((item, i) => (
          <div key={i} style={{ display: "flex", gap: "12px", paddingBottom: "10px" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div
                style={{
                  width: "7px",
                  height: "7px",
                  borderRadius: "50%",
                  background: item.active ? "#E8E0D0" : item.done ? "#484848" : "#282828",
                  flexShrink: 0,
                  marginTop: "2px",
                }}
              />
              {i < 3 && (
                <div style={{ width: "1px", background: "#282828", flex: 1, marginTop: "3px" }} />
              )}
            </div>
            <div>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "10px",
                  color: item.active ? "#E8E0D0" : item.done ? "#484848" : "#333333",
                  marginBottom: "1px",
                }}
              >
                {item.time}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "12px",
                  color: item.active ? "#C0C0C0" : item.done ? "#606060" : "#404040",
                }}
              >
                {item.label}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div
        style={{
          background: "#1A1A1A",
          border: "1px solid #252525",
          borderRadius: "8px",
          padding: "12px 14px",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "10px",
            color: "#404040",
            marginBottom: "6px",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          Message sent
        </div>
        <span
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "12px",
            color: "#808080",
            lineHeight: "1.6",
          }}
        >
          &ldquo;Hey Jordan! Just checking in on your blackwork forearm quote. Still interested in booking?&rdquo;
        </span>
      </div>
    </CardShell>
  );
}

function CardQuote() {
  return (
    <CardShell title="Quote #Q-2847" badge="Sent" footer="Client notified via email + SMS · Jan 15, 9:42 AM">
      <div style={{ marginBottom: "12px" }}>
        <div
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "13px",
            color: "#C0C0C0",
            fontWeight: 500,
            marginBottom: "2px",
          }}
        >
          Jordan M. → Sarah M.
        </div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "#525252" }}>
          Blackwork Full Sleeve · 2 sessions
        </div>
      </div>
      <div style={{ borderTop: "1px solid #1E1E1E", paddingTop: "12px" }}>
        <Row label="Session 1 (4hr @ $175/hr)" value="$700.00" />
        <Row label="Session 2 (4hr @ $175/hr)" value="$700.00" />
      </div>
      <div
        style={{
          background: "#1A1A1A",
          border: "1px solid #252525",
          borderRadius: "8px",
          padding: "12px 14px",
          marginTop: "12px",
          display: "flex",
          flexDirection: "column",
          gap: "6px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontFamily: "var(--font-sans)", fontSize: "12px", color: "#606060" }}>Total</span>
          <span style={{ fontFamily: "var(--font-serif)", fontSize: "20px", color: "#E8E0D0", lineHeight: "1" }}>
            $1,400.00
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontFamily: "var(--font-sans)", fontSize: "12px", color: "#606060" }}>
            Deposit required (20%)
          </span>
          <span style={{ fontFamily: "var(--font-sans)", fontSize: "13px", color: "#93C5FD", fontWeight: 500 }}>
            $280.00
          </span>
        </div>
      </div>
    </CardShell>
  );
}

function CardDeposit() {
  return (
    <CardShell
      title="Payment Received"
      badge="Collected"
      badgeGreen
      footer="Auto-kept if client no-shows · Cannot be disabled"
    >
      <div style={{ textAlign: "center", padding: "16px 0 20px" }}>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "10px",
            color: "#404040",
            textTransform: "uppercase",
            letterSpacing: "0.07em",
            marginBottom: "8px",
          }}
        >
          Amount collected
        </div>
        <div
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: "40px",
            color: "#86EFAC",
            lineHeight: "1",
            marginBottom: "4px",
          }}
        >
          $280.00
        </div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "#525252" }}>
          Blackwork Sleeve — Deposit
        </div>
      </div>
      <div style={{ borderTop: "1px solid #1E1E1E", paddingTop: "12px" }}>
        <Row label="Client" value="Jordan M." />
        <Row label="Artist" value="Sarah M." />
        <Row label="Method" value="Visa ···· 4242 via Stripe" />
        <Row label="Status" value="Non-refundable" accent />
      </div>
    </CardShell>
  );
}

function CardBooking() {
  return (
    <CardShell title="Booking Confirmed" badge="✓ Confirmed" badgeGreen>
      <div style={{ marginBottom: "12px" }}>
        <div
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "13px",
            color: "#C0C0C0",
            fontWeight: 500,
            marginBottom: "2px",
          }}
        >
          Jordan M. with Sarah M.
        </div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "#525252" }}>
          Feb 12, 2026 · 2:00 PM – 6:00 PM
        </div>
      </div>
      <div style={{ borderTop: "1px solid #1E1E1E", paddingTop: "12px" }}>
        <Check label="Deposit collected" value="$280.00" />
        <Check label="Consent form signed" value="Digitally" />
        <Check label="SMS reminders scheduled" value="48hr + day-of" />
        <Check label="Calendar blocked" value="Sarah M." />
        <Check label="Confirmation sent to client" value="Email + SMS" />
      </div>
    </CardShell>
  );
}

function CardAftercare() {
  return (
    <CardShell title="Aftercare · Sarah M." badge="Sent" footer="Sent automatically · 2 days post-session">
      <div
        style={{
          background: "#1A1A1A",
          border: "1px solid #252525",
          borderRadius: "8px",
          padding: "14px 16px",
          marginBottom: "12px",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "10px",
            color: "#404040",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            marginBottom: "8px",
          }}
        >
          Message to Jordan M.
        </div>
        <div
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "12px",
            color: "#808080",
            lineHeight: "1.75",
          }}
        >
          &ldquo;Hey Jordan! Your tattoo is healing well. Here&apos;s your care guide:
          <br />
          · Week 1: Keep wrapped &amp; moisturized daily.
          <br />
          · Week 2: Light peeling is completely normal.
          <br />
          <br />
          Ready to book Session 2? Use the link below.&rdquo;
        </div>
      </div>
      <div
        style={{
          padding: "10px 14px",
          background: "rgba(147,197,253,0.06)",
          border: "1px solid rgba(147,197,253,0.14)",
          borderRadius: "8px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span style={{ fontFamily: "var(--font-sans)", fontSize: "12px", color: "#93C5FD" }}>
          Book Session 2 →
        </span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "#404040" }}>
          Reply rate: 64%
        </span>
      </div>
    </CardShell>
  );
}

function CardCRM() {
  return (
    <CardShell title="Client Profile" badge="Returning" footer="Artist: Sarah M. · Ink & Iron Studio">
      <div style={{ marginBottom: "14px" }}>
        <div
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "16px",
            color: "#D0D0D0",
            fontWeight: 500,
            marginBottom: "2px",
          }}
        >
          Jordan M.
        </div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "#525252" }}>
          Client since Jan 2026
        </div>
      </div>
      <div style={{ borderTop: "1px solid #1E1E1E", paddingTop: "12px" }}>
        <Row label="Preferred styles" value="Blackwork · Geometric" />
        <Row label="Sessions completed" value="2" />
        <Row label="Lifetime value" value="$1,400" />
        <Row label="Last session" value="Feb 12, 2026" />
        <Row label="Status" value="Ready to rebook" accent />
      </div>
    </CardShell>
  );
}

const CARDS = [
  CardInquiry,
  CardConsultation,
  CardFollowUp,
  CardQuote,
  CardDeposit,
  CardBooking,
  CardAftercare,
  CardCRM,
];

export default function WorkflowSection() {
  const [active, setActive] = useState(0);
  const sectionRef = useRef<HTMLElement>(null);
  const ActiveCard = CARDS[active];

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.querySelectorAll<HTMLElement>(".reveal").forEach((node, i) => {
            setTimeout(() => node.classList.add("in-view"), i * 60);
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
      id="workflow"
      ref={sectionRef}
      style={{
        padding: "128px 0",
        background: "#F8F8F6",
        borderTop: "1px solid #E4E2DC",
      }}
    >
      <div className="mx-auto" style={{ maxWidth: "1120px", padding: "0 40px" }}>

        {/* Header */}
        <div style={{ marginBottom: "64px" }}>
          <p
            className="reveal stagger-1"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "#787878",
              marginBottom: "20px",
            }}
          >
            How It Works
          </p>
          <h2
            className="reveal stagger-2"
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "clamp(36px, 5vw, 64px)",
              color: "#0F0F0F",
              lineHeight: "1.05",
              letterSpacing: "-0.02em",
              maxWidth: "640px",
              marginBottom: "20px",
            }}
          >
            AI manages the entire client journey.
          </h2>
          <p
            className="reveal stagger-3"
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "17px",
              color: "#525252",
              lineHeight: "1.65",
              maxWidth: "500px",
            }}
          >
            From first inquiry to aftercare, InkBook handles every step. Artists approve quotes and pricing. AI handles everything else.
          </p>
        </div>

        {/* Desktop layout */}
        <div
          className="hidden lg:grid reveal stagger-4"
          style={{ gridTemplateColumns: "320px 1fr", gap: "56px", alignItems: "start" }}
        >
          {/* Step list */}
          <div
            style={{
              border: "1px solid #D8D6D0",
              borderRadius: "12px",
              overflow: "hidden",
              background: "#EEECEA",
            }}
          >
            {STEPS.map((step, i) => (
              <button
                key={step.n}
                onClick={() => setActive(i)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "14px 20px",
                  background: active === i ? "rgba(0,0,0,0.06)" : "transparent",
                  borderLeft: `2px solid ${active === i ? "rgba(0,0,0,0.22)" : "transparent"}`,
                  borderBottom: i < STEPS.length - 1 ? "1px solid #DDDBD5" : "none",
                  cursor: "pointer",
                  transition: "background 150ms, border-color 150ms",
                }}
                onMouseEnter={(e) => {
                  if (active !== i) e.currentTarget.style.background = "rgba(0,0,0,0.03)";
                }}
                onMouseLeave={(e) => {
                  if (active !== i) e.currentTarget.style.background = "transparent";
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    marginBottom: active === i ? "4px" : "0",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "10px",
                      color: active === i ? "#686868" : "#B8B5AF",
                      letterSpacing: "0.04em",
                      flexShrink: 0,
                    }}
                  >
                    {step.n}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: "14px",
                      color: active === i ? "#0F0F0F" : "#888888",
                      fontWeight: active === i ? 500 : 400,
                      transition: "color 150ms",
                    }}
                  >
                    {step.stage}
                  </span>
                </div>
                {active === i && (
                  <div style={{ paddingLeft: "30px" }}>
                    <div
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "10px",
                        color: "#787878",
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                      }}
                    >
                      {step.label}
                    </div>
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Active card */}
          <div style={{ position: "sticky", top: "88px" }}>
            <p
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "15px",
                color: "#525252",
                lineHeight: "1.7",
                marginBottom: "24px",
              }}
            >
              {STEPS[active].body}
            </p>
            <ActiveCard />
          </div>
        </div>

        {/* Mobile accordion */}
        <div
          className="lg:hidden reveal stagger-4"
          style={{
            display: "flex",
            flexDirection: "column",
            border: "1px solid #D8D6D0",
            borderRadius: "12px",
            overflow: "hidden",
          }}
        >
          {STEPS.map((step, i) => {
            const Card = CARDS[i];
            const isActive = active === i;
            return (
              <div
                key={step.n}
                style={{ borderBottom: i < STEPS.length - 1 ? "1px solid #DDDBD5" : "none" }}
              >
                <button
                  onClick={() => setActive(isActive ? -1 : i)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    width: "100%",
                    textAlign: "left",
                    padding: "16px 20px",
                    background: isActive ? "rgba(0,0,0,0.06)" : "transparent",
                    borderLeft: `2px solid ${isActive ? "rgba(0,0,0,0.22)" : "transparent"}`,
                    cursor: "pointer",
                  }}
                >
                  <span
                    style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "#B8B5AF" }}
                  >
                    {step.n}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: "14px",
                      color: isActive ? "#0F0F0F" : "#888888",
                      flex: 1,
                    }}
                  >
                    {step.stage}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "14px",
                      color: "#AAAAAA",
                      transform: isActive ? "rotate(180deg)" : "none",
                      transition: "transform 200ms",
                      display: "inline-block",
                    }}
                  >
                    ↓
                  </span>
                </button>
                {isActive && (
                  <div style={{ padding: "0 20px 20px" }}>
                    <p
                      style={{
                        fontFamily: "var(--font-sans)",
                        fontSize: "14px",
                        color: "#525252",
                        lineHeight: "1.65",
                        marginBottom: "16px",
                      }}
                    >
                      {step.body}
                    </p>
                    <Card />
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
