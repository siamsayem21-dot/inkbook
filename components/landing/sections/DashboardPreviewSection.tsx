"use client";

import { useState } from "react";
import { TrendingUp, Users, BarChart2, MessageSquare, CreditCard, Clock } from "lucide-react";

const REVENUE_BARS = [42, 56, 50, 74, 68, 90, 96];
const DAYS = ["M", "T", "W", "T", "F", "S", "S"];

function OwnerDashboard() {
  const metrics = [
    { label: "Revenue", value: "$48,320", sub: "this quarter", Icon: TrendingUp, color: "text-green-400", trend: "+22% vs last qtr" },
    { label: "Active Leads", value: "23", sub: "in pipeline", Icon: Users, color: "text-blue-400", trend: "↑ 8 new this week" },
    { label: "Booking Rate", value: "78%", sub: "inquiry → booking", Icon: BarChart2, color: "text-gold", trend: "+5% vs last month" },
    { label: "Consultations", value: "47", sub: "this month", Icon: MessageSquare, color: "text-purple-400", trend: "42 handled by AI" },
    { label: "Deposits", value: "$6,240", sub: "auto-collected", Icon: CreditCard, color: "text-red-400", trend: "100% collection rate" },
  ];

  const artists = [
    { name: "Sarah M.", sessions: 18, revenue: "$4,200", dot: "bg-green-400" },
    { name: "Jake R.", sessions: 14, revenue: "$3,100", dot: "bg-green-400" },
    { name: "Mia C.", sessions: 15, revenue: "$3,840", dot: "bg-gold" },
  ];

  return (
    <div className="bg-zinc-900/60 border border-white/[0.08] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.07] bg-zinc-950/70">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400" />
          <span className="text-xs text-zinc-400">Ink & Iron Studio — Owner View</span>
        </div>
        <span className="text-[10px] text-zinc-600 uppercase tracking-widest">Q2 2026</span>
      </div>

      {/* Metrics — scrollable on mobile */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-px bg-white/[0.05]">
        {metrics.map((m) => (
          <div key={m.label} className="bg-zinc-900/80 px-4 py-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] text-zinc-600 uppercase tracking-widest">{m.label}</p>
              <m.Icon className={`w-3 h-3 ${m.color}`} />
            </div>
            <p className="font-cinzel text-xl font-bold text-white">{m.value}</p>
            <p className="text-[10px] text-zinc-600 mt-0.5">{m.sub}</p>
            <p className={`text-[10px] mt-1 ${m.color}`}>{m.trend}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-white/[0.05] mt-px">
        {/* Revenue chart */}
        <div className="bg-zinc-900/80 px-5 py-5">
          <p className="text-[10px] text-zinc-600 uppercase tracking-widest mb-4">Revenue Trend (7 days)</p>
          <div className="flex items-end gap-1.5 h-14">
            {REVENUE_BARS.map((h, i) => (
              <div key={i} className="flex-1 flex flex-col justify-end">
                <div
                  className={`w-full ${i === REVENUE_BARS.length - 1 ? "bg-red-500/70" : "bg-zinc-700/60"} transition-all`}
                  style={{ height: `${h}%` }}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2">
            {DAYS.map((d, i) => (
              <span key={i} className="text-[9px] text-zinc-700 flex-1 text-center">{d}</span>
            ))}
          </div>
        </div>

        {/* Artist roster */}
        <div className="bg-zinc-900/80 px-5 py-5">
          <p className="text-[10px] text-zinc-600 uppercase tracking-widest mb-4">Artist Performance</p>
          <div className="space-y-3">
            {artists.map((a) => (
              <div key={a.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${a.dot}`} />
                  <span className="text-xs text-zinc-400">{a.name}</span>
                </div>
                <div className="flex items-center gap-5">
                  <span className="text-[10px] text-zinc-600">{a.sessions} sessions</span>
                  <span className="text-xs text-white font-medium">{a.revenue}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-white/[0.06]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-zinc-600">Studio total</span>
              <span className="text-xs font-cinzel font-bold text-gold">$11,140</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ArtistDashboard() {
  const upcoming = [
    { time: "9:00 AM", client: "Jordan M.", detail: "Blackwork sleeve — 4hr session", deposit: "$200 paid", status: "confirmed" },
    { time: "2:00 PM", client: "Alex R.", detail: "Fine line botanical — 2hr", deposit: "$100 paid", status: "confirmed" },
    { time: "4:30 PM", client: "Casey T.", detail: "Portrait consult — 30min", deposit: "—", status: "consult" },
  ];

  const requests = [
    { initials: "PL", name: "Parker L.", style: "Blackwork geometric", budget: "$350–500", badge: "Review" },
    { initials: "MN", name: "Morgan N.", style: "Dotwork mandala", budget: "$500+", badge: "New" },
    { initials: "DS", name: "Dev S.", style: "Neo-trad snake", budget: "$280–400", badge: "New" },
  ];

  return (
    <div className="bg-zinc-900/60 border border-white/[0.08] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.07] bg-zinc-950/70">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400" />
          <span className="text-xs text-zinc-400">Sarah M. — Artist View</span>
        </div>
        <span className="text-[10px] text-zinc-600 uppercase tracking-widest">Today, Jun 7</span>
      </div>

      {/* Artist metrics */}
      <div className="grid grid-cols-3 gap-px bg-white/[0.05]">
        <div className="bg-zinc-900/80 px-4 py-4">
          <p className="text-[10px] text-zinc-600 uppercase tracking-widest mb-1">Earnings</p>
          <p className="font-cinzel text-xl font-bold text-white">$1,840</p>
          <p className="text-[10px] text-zinc-600 mt-0.5">this week</p>
        </div>
        <div className="bg-zinc-900/80 px-4 py-4">
          <p className="text-[10px] text-zinc-600 uppercase tracking-widest mb-1">Sessions</p>
          <p className="font-cinzel text-xl font-bold text-white">8</p>
          <p className="text-[10px] text-zinc-600 mt-0.5">this week</p>
        </div>
        <div className="bg-zinc-900/80 px-4 py-4">
          <p className="text-[10px] text-zinc-600 uppercase tracking-widest mb-1">Requests</p>
          <p className="font-cinzel text-xl font-bold text-red-400">3</p>
          <p className="text-[10px] text-zinc-600 mt-0.5">need review</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-white/[0.05] mt-px">
        {/* Today's schedule */}
        <div className="bg-zinc-900/80 px-5 py-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-3 h-3 text-zinc-600" />
            <p className="text-[10px] text-zinc-600 uppercase tracking-widest">Today&apos;s Schedule</p>
          </div>
          <div className="space-y-3">
            {upcoming.map((s, i) => (
              <div key={i} className="flex items-start justify-between gap-3 pb-2.5 border-b border-white/[0.05] last:border-0 last:pb-0">
                <div className="flex items-start gap-2.5">
                  <span className="text-[10px] text-zinc-700 w-14 shrink-0 mt-0.5">{s.time}</span>
                  <div>
                    <p className="text-xs text-zinc-300 font-medium">{s.client}</p>
                    <p className="text-[10px] text-zinc-600">{s.detail}</p>
                    <p className="text-[10px] text-green-400 mt-0.5">{s.deposit}</p>
                  </div>
                </div>
                <span className={`text-[9px] px-2 py-0.5 uppercase tracking-widest shrink-0 ${
                  s.status === "confirmed"
                    ? "bg-green-500/10 border border-green-500/20 text-green-400"
                    : "bg-blue-500/10 border border-blue-500/20 text-blue-400"
                }`}>
                  {s.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* AI-qualified requests */}
        <div className="bg-zinc-900/80 px-5 py-5">
          <p className="text-[10px] text-zinc-600 uppercase tracking-widest mb-4">AI-Qualified Requests</p>
          <div className="space-y-3">
            {requests.map((r, i) => (
              <div key={i} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 bg-zinc-800 border border-white/[0.07] flex items-center justify-center shrink-0">
                    <span className="text-[9px] text-zinc-500 font-bold">{r.initials}</span>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-300">{r.name}</p>
                    <p className="text-[10px] text-zinc-600">{r.style} · {r.budget}</p>
                  </div>
                </div>
                <span className="text-[9px] bg-gold/10 border border-gold/20 text-gold px-2 py-0.5 uppercase tracking-widest shrink-0">
                  {r.badge}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPreviewSection() {
  const [active, setActive] = useState<"owner" | "artist">("owner");

  return (
    <section id="dashboard" className="px-6 py-24">
      <div className="max-w-6xl mx-auto">

        <div className="text-center mb-12">
          <p className="label-xs text-gold/70 mb-4">Studio Intelligence</p>
          <h2 className="font-cinzel text-3xl md:text-4xl font-bold tracking-wide mb-4">
            One dashboard. Zero spreadsheets.
          </h2>
          <p className="text-zinc-500 text-sm max-w-lg mx-auto">
            Full revenue visibility for owners. Clean daily workflow for artists. Everyone has exactly what they need — nothing they don&apos;t.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex justify-center mb-8">
          <div className="flex border border-white/[0.08] bg-zinc-950/60">
            {(["owner", "artist"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActive(tab)}
                className={`label-xs px-6 py-3 transition-all ${
                  active === tab
                    ? "bg-zinc-800 text-white"
                    : "text-zinc-600 hover:text-zinc-400"
                }`}
              >
                {tab === "owner" ? "Owner Dashboard" : "Artist Dashboard"}
              </button>
            ))}
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-8 bg-[radial-gradient(ellipse_55%_45%_at_50%_50%,rgba(220,38,38,0.04),transparent)] pointer-events-none" />
          <div className="relative">
            {active === "owner" ? <OwnerDashboard /> : <ArtistDashboard />}
          </div>
        </div>

      </div>
    </section>
  );
}
