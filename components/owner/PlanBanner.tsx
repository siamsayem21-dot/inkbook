"use client";

import { useState } from "react";

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  active: { label: "Active", className: "bg-green-500/10 text-green-400 border-green-500/20" },
  trialing: { label: "Trial", className: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  past_due: { label: "Past due", className: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" },
  canceled: { label: "Canceled", className: "bg-red-500/10 text-red-400 border-red-500/20" },
  unpaid: { label: "Unpaid", className: "bg-red-500/10 text-red-400 border-red-500/20" },
};

export default function PlanBanner({
  planLabel,
  subscriptionStatus,
}: {
  planLabel: string;
  subscriptionStatus: string;
}) {
  const [loading, setLoading] = useState(false);
  const badge = STATUS_BADGE[subscriptionStatus] ?? STATUS_BADGE.trialing;

  async function handleManagePlan() {
    setLoading(true);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error ?? "Could not open billing portal. Please try again.");
      }
    } catch {
      alert("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-xl px-5 py-4">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-zinc-300">{planLabel}</span>
        <span
          className={`text-xs border px-2.5 py-0.5 rounded-full ${badge.className}`}
        >
          {badge.label}
        </span>
      </div>
      <button
        onClick={handleManagePlan}
        disabled={loading}
        className="text-sm text-zinc-400 hover:text-[#D4A853] transition-colors disabled:opacity-50"
      >
        {loading ? "Opening…" : "Manage Plan →"}
      </button>
    </div>
  );
}
