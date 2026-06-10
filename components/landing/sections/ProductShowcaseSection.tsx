"use client";

import { useState, useEffect, useRef } from "react";

function Spark({ values, color = "#E8E0D0" }: { values: number[]; color?: string }) {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const W = 48;
  const H = 20;
  const pts = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * W;
      const y = H - ((v - min) / range) * (H - 2) - 1;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      fill="none"
      style={{ opacity: 0.55, flexShrink: 0 }}
    >
      <polyline
        points={pts}
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function OwnerView() {
  const metrics = [
    {
      label: "Monthly Revenue",
      value: "$18,240",
      delta: "↑ 23%",
      spark: [62, 74, 68, 88, 82, 96, 100],
      color: "#86EFAC",
    },
    {
      label: "Active Leads",
      value: "23",
      delta: "↑ 8 new",
      spark: [44, 52, 48, 62, 58, 74, 85],
      color: "#93C5FD",
    },
    {
      label: "Booking Rate",
      value: "73%",
      delta: "↑ 8 pts",
      spark: [58, 61, 65, 63, 68, 71, 73],
      color: "#E8E0D0",
    },
    {
      label: "AI Consultations",
      value: "47",
      delta: "42 by AI",
      spark: [18, 24, 21, 32, 28, 39, 47],
      color: "#C4B5FD",
    },
    {
      label: "Deposit Rate",
      value: "94%",
      delta: "Automated",
      spark: [80, 84, 81, 88, 87, 92, 94],
      color: "#86EFAC",
    },
  ];

  const artists = [
    { name: "Sarah M.", sessions: 18, revenue: "$4,200", util: 90, online: true },
    { name: "Jake R.", sessions: 14, revenue: "$3,100", util: 68, online: true },
    { name: "Mia C.", sessions: 15, revenue: "$3,840", util: 100, online: false },
  ];

  const activity = [
    { dot: "#86EFAC", label: "Deposit collected", detail: "Jordan M. · $280", time: "2:34 PM" },
    { dot: "#93C5FD", label: "Lead qualified by AI", detail: "Sam T. · Neo-trad", time: "1:15 PM" },
    { dot: "#C4B5FD", label: "Booking confirmed", detail: "Alex R. · Feb 18", time: "11:42 AM" },
    { dot: "#E8E0D0", label: "AI follow-up sent", detail: "Priya D. · 48h nudge", time: "9:08 AM" },
  ];

  return (
    <div
      style={{
        background: "#161616",
        border: "1px solid #2A2A2A",
        borderRadius: "14px",
        overflow: "hidden",
        boxShadow: "0 8px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)",
      }}
    >
      {/* Chrome */}
      <div
        style={{
          background: "#0F0F0F",
          borderBottom: "1px solid #1E1E1E",
          padding: "11px 20px",
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
              style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#2A2A2A" }}
            />
          ))}
        </div>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "#484848" }}>
          Owner Dashboard · Ink & Iron Studio
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span
            className="animate-pulse-dot"
            aria-hidden
            style={{
              display: "inline-block",
              width: "5px",
              height: "5px",
              borderRadius: "50%",
              background: "#4ADE80",
            }}
          />
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "#4A4A4A" }}>
            Live
          </span>
        </div>
      </div>

      {/* Metrics strip */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          borderBottom: "1px solid #1E1E1E",
        }}
      >
        {metrics.map((m, i) => (
          <div
            key={m.label}
            style={{
              padding: "16px 18px",
              borderRight: i < 4 ? "1px solid #1E1E1E" : "none",
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "9px",
                color: "#404040",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: "8px",
              }}
            >
              {m.label}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "space-between",
                marginBottom: "4px",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: "20px",
                  color: "#E8E0D0",
                  lineHeight: "1",
                }}
              >
                {m.value}
              </div>
              <Spark values={m.spark} color={m.color} />
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "9px", color: "#525252" }}>
              {m.delta}
            </div>
          </div>
        ))}
      </div>

      {/* Body */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
        }}
      >
        {/* Artist performance */}
        <div style={{ padding: "20px", borderRight: "1px solid #1E1E1E" }}>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "9px",
              color: "#404040",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: "16px",
            }}
          >
            Artist Performance
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {artists.map((a) => (
              <div key={a.name}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "6px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span
                      className={a.online ? "animate-pulse-dot" : ""}
                      style={{
                        display: "inline-block",
                        width: "5px",
                        height: "5px",
                        borderRadius: "50%",
                        background: a.online ? "#4ADE80" : "#2A2A2A",
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        fontFamily: "var(--font-sans)",
                        fontSize: "13px",
                        color: "#C8C8C8",
                      }}
                    >
                      {a.name}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "10px",
                        color: "#525252",
                      }}
                    >
                      {a.sessions} sessions
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--font-sans)",
                        fontSize: "13px",
                        color: "#E8E0D0",
                        fontWeight: 500,
                      }}
                    >
                      {a.revenue}
                    </span>
                  </div>
                </div>
                <div
                  style={{
                    height: "2px",
                    background: "#1C1C1C",
                    borderRadius: "1px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      background: a.util >= 95 ? "#F59E0B" : "#E8E0D0",
                      width: `${a.util}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: "16px",
              paddingTop: "12px",
              borderTop: "1px solid #1C1C1C",
            }}
          >
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "#404040" }}>
              Studio total
            </span>
            <span
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "14px",
                color: "#E8E0D0",
                fontWeight: 600,
              }}
            >
              $11,140
            </span>
          </div>
        </div>

        {/* Live activity */}
        <div style={{ padding: "20px" }}>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "9px",
              color: "#404040",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: "16px",
            }}
          >
            Live Activity
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {activity.map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span
                  style={{
                    display: "inline-block",
                    width: "5px",
                    height: "5px",
                    borderRadius: "50%",
                    background: item.dot,
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span
                    style={{ fontFamily: "var(--font-sans)", fontSize: "12px", color: "#909090" }}
                  >
                    {item.label}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "10px",
                      color: "#484848",
                      marginLeft: "6px",
                    }}
                  >
                    {item.detail}
                  </span>
                </div>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "9px",
                    color: "#363636",
                    flexShrink: 0,
                  }}
                >
                  {item.time}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ArtistView() {
  const schedule = [
    {
      time: "9:00 AM",
      client: "Jordan M.",
      detail: "Blackwork sleeve · 4hr",
      deposit: "$280 paid",
      status: "confirmed",
    },
    {
      time: "2:00 PM",
      client: "Alex R.",
      detail: "Fine line botanical · 2hr",
      deposit: "$120 paid",
      status: "confirmed",
    },
    {
      time: "4:30 PM",
      client: "Casey T.",
      detail: "Portrait consult · 30min",
      deposit: "—",
      status: "consult",
    },
  ];

  const requests = [
    { initials: "PL", name: "Parker L.", style: "Blackwork geometric", budget: "$350–500", score: 91 },
    { initials: "MN", name: "Morgan N.", style: "Dotwork mandala", budget: "$500+", score: 88 },
    { initials: "DS", name: "Dev S.", style: "Neo-trad snake", budget: "$280–400", score: 76 },
  ];

  return (
    <div
      style={{
        background: "#161616",
        border: "1px solid #2A2A2A",
        borderRadius: "14px",
        overflow: "hidden",
        boxShadow: "0 8px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)",
      }}
    >
      {/* Chrome */}
      <div
        style={{
          background: "#0F0F0F",
          borderBottom: "1px solid #1E1E1E",
          padding: "11px 20px",
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
              style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#2A2A2A" }}
            />
          ))}
        </div>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "#484848" }}>
          Sarah M. — Artist Dashboard
        </span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "#4A4A4A" }}>
          Today, Jun 10
        </span>
      </div>

      {/* Earnings strip */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          borderBottom: "1px solid #1E1E1E",
        }}
      >
        {[
          {
            label: "Earnings this week",
            value: "$1,840",
            delta: "↑ 12% vs last",
            spark: [900, 1100, 980, 1400, 1200, 1600, 1840],
            color: "#86EFAC",
          },
          {
            label: "Sessions booked",
            value: "8",
            delta: "2 remaining today",
            spark: [4, 5, 4, 6, 5, 7, 8],
            color: "#E8E0D0",
          },
          {
            label: "AI-qualified requests",
            value: "3",
            delta: "Need review",
            spark: [1, 2, 1, 3, 2, 2, 3],
            color: "#93C5FD",
          },
        ].map((m, i) => (
          <div
            key={m.label}
            style={{
              padding: "16px 18px",
              borderRight: i < 2 ? "1px solid #1E1E1E" : "none",
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "9px",
                color: "#404040",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: "8px",
              }}
            >
              {m.label}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "space-between",
                marginBottom: "4px",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: "20px",
                  color: "#E8E0D0",
                  lineHeight: "1",
                }}
              >
                {m.value}
              </div>
              <Spark values={m.spark} color={m.color} />
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "9px", color: "#525252" }}>
              {m.delta}
            </div>
          </div>
        ))}
      </div>

      {/* Schedule + requests */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
        {/* Today's schedule */}
        <div style={{ padding: "20px", borderRight: "1px solid #1E1E1E" }}>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "9px",
              color: "#404040",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: "14px",
            }}
          >
            Today&apos;s Schedule
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {schedule.map((s, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  padding: "10px 0",
                  borderBottom:
                    i < schedule.length - 1 ? "1px solid #1C1C1C" : "none",
                }}
              >
                <div style={{ display: "flex", gap: "10px" }}>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "10px",
                      color: "#484848",
                      width: "52px",
                      flexShrink: 0,
                      paddingTop: "1px",
                    }}
                  >
                    {s.time}
                  </span>
                  <div>
                    <div
                      style={{
                        fontFamily: "var(--font-sans)",
                        fontSize: "12px",
                        color: "#C0C0C0",
                        fontWeight: 500,
                        marginBottom: "1px",
                      }}
                    >
                      {s.client}
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "10px",
                        color: "#505050",
                      }}
                    >
                      {s.detail}
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "10px",
                        color: "#86EFAC",
                        marginTop: "2px",
                      }}
                    >
                      {s.deposit}
                    </div>
                  </div>
                </div>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "9px",
                    color: s.status === "confirmed" ? "#86EFAC" : "#93C5FD",
                    background:
                      s.status === "confirmed"
                        ? "rgba(134,239,172,0.08)"
                        : "rgba(147,197,253,0.08)",
                    border: `1px solid ${
                      s.status === "confirmed"
                        ? "rgba(134,239,172,0.2)"
                        : "rgba(147,197,253,0.2)"
                    }`,
                    padding: "2px 6px",
                    borderRadius: "4px",
                    flexShrink: 0,
                  }}
                >
                  {s.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* AI-qualified requests */}
        <div style={{ padding: "20px" }}>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "9px",
              color: "#404040",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: "14px",
            }}
          >
            AI-Qualified Requests
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {requests.map((r, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "10px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "50%",
                      background: "#1E1E1E",
                      border: "1px solid #2A2A2A",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "8px",
                        color: "#686868",
                      }}
                    >
                      {r.initials}
                    </span>
                  </div>
                  <div>
                    <div
                      style={{
                        fontFamily: "var(--font-sans)",
                        fontSize: "12px",
                        color: "#C0C0C0",
                        marginBottom: "1px",
                      }}
                    >
                      {r.name}
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "10px",
                        color: "#505050",
                      }}
                    >
                      {r.style} · {r.budget}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "13px",
                      color: r.score >= 90 ? "#86EFAC" : "#E8E0D0",
                    }}
                  >
                    {r.score}
                  </div>
                  <div
                    style={{ fontFamily: "var(--font-mono)", fontSize: "9px", color: "#404040" }}
                  >
                    AI score
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div
            style={{
              marginTop: "16px",
              padding: "10px 14px",
              background: "rgba(232,224,208,0.04)",
              border: "1px solid rgba(232,224,208,0.10)",
              borderRadius: "8px",
            }}
          >
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "#525252" }}>
              All leads pre-qualified by AI · Review when ready
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProductShowcaseSection() {
  const [active, setActive] = useState<"owner" | "artist">("owner");
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
        background: "#F8F8F6",
        borderTop: "1px solid #E4E2DC",
        borderBottom: "1px solid #E4E2DC",
      }}
    >
      <div className="mx-auto" style={{ maxWidth: "1120px", padding: "0 40px" }}>

        {/* Header */}
        <div style={{ marginBottom: "48px" }}>
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
            The Product
          </p>
          <h2
            className="reveal stagger-2"
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "clamp(36px, 5vw, 62px)",
              color: "#0F0F0F",
              lineHeight: "1.05",
              letterSpacing: "-0.02em",
              maxWidth: "640px",
              marginBottom: "20px",
            }}
          >
            Every inquiry, quote, deposit, and booking. In one place.
          </h2>
          <p
            className="reveal stagger-3"
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "17px",
              color: "#525252",
              lineHeight: "1.65",
              maxWidth: "480px",
            }}
          >
            Know exactly where every client stands. Revenue, AI activity, artist performance — all live. No exports, no spreadsheets.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="reveal stagger-4" style={{ marginBottom: "32px" }}>
          <div
            style={{
              display: "inline-flex",
              background: "#EBEBEA",
              border: "1px solid #D4D2CC",
              borderRadius: "10px",
              padding: "4px",
              gap: "2px",
            }}
          >
            {(
              [
                ["owner", "Owner Dashboard"],
                ["artist", "Artist Dashboard"],
              ] as const
            ).map(([tab, label]) => (
              <button
                key={tab}
                onClick={() => setActive(tab)}
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "13px",
                  padding: "8px 20px",
                  borderRadius: "7px",
                  cursor: "pointer",
                  transition: "all 150ms",
                  background: active === tab ? "#1A1A1A" : "transparent",
                  color: active === tab ? "#F5F5F5" : "#707070",
                  fontWeight: active === tab ? 500 : 400,
                  border: "none",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Dashboard */}
        <div className="reveal stagger-5">
          {active === "owner" ? <OwnerView /> : <ArtistView />}
        </div>

      </div>
    </section>
  );
}
