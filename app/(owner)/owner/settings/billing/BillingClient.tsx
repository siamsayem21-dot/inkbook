"use client";

import { useState } from "react";
import Link from "next/link";

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  active:   { label: "Active",   className: "bg-green-50 text-green-700" },
  trialing: { label: "Free trial", className: "bg-blue-50 text-blue-700" },
  past_due: { label: "Past due", className: "bg-amber-50 text-amber-700" },
  canceled: { label: "Canceled", className: "bg-red-50 text-red-700" },
  unpaid:   { label: "Unpaid",   className: "bg-red-50 text-red-700" },
};

export default function BillingClient({
  planLabel,
  planPrice,
  planArtists,
  subscriptionStatus,
  hasStripeCustomer,
}: {
  planLabel: string;
  planPrice: string;
  planArtists: string;
  subscriptionStatus: string;
  hasStripeCustomer: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const badge = STATUS_BADGE[subscriptionStatus] ?? STATUS_BADGE.trialing;

  async function openPortal() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setError(data.error ?? "Could not open billing portal. Please try again.");
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6 space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold text-zinc-900">{planLabel} plan</p>
          <p className="text-zinc-500 text-sm">
            {planPrice} · {planArtists}
          </p>
        </div>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${badge.className}`}>
          {badge.label}
        </span>
      </div>

      <hr className="border-zinc-100" />

      {subscriptionStatus === "trialing" && (
        <p className="text-sm text-zinc-500">
          You&apos;re on a free trial.{" "}
          <Link href="/pricing" className="text-violet-600 hover:underline">
            Choose a plan
          </Link>{" "}
          to keep access after your trial ends.
        </p>
      )}

      {subscriptionStatus === "past_due" && (
        <p className="text-sm text-amber-600">
          Your payment is past due. Update your payment method to keep your subscription active.
        </p>
      )}

      {(subscriptionStatus === "canceled" || subscriptionStatus === "unpaid") && (
        <p className="text-sm text-red-600">
          Your subscription is inactive.{" "}
          <Link href="/pricing" className="text-violet-600 hover:underline">
            Resubscribe
          </Link>{" "}
          to restore access.
        </p>
      )}

      {hasStripeCustomer && (
        <div className="flex gap-3 pt-2">
          <button
            onClick={openPortal}
            disabled={loading}
            className="text-sm bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 hover:border-zinc-300 px-4 py-2 rounded-full transition-colors disabled:opacity-50"
          >
            {loading ? "Opening…" : "Manage subscription"}
          </button>
          <button
            onClick={openPortal}
            disabled={loading}
            className="text-sm bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 hover:border-zinc-300 px-4 py-2 rounded-full transition-colors disabled:opacity-50"
          >
            Update payment method
          </button>
        </div>
      )}

      {!hasStripeCustomer && (
        <div className="pt-2">
          <Link
            href="/pricing"
            className="inline-block text-sm bg-violet-600 text-white font-semibold px-5 py-2 rounded-full hover:bg-violet-700 transition-colors"
          >
            Subscribe now
          </Link>
        </div>
      )}
    </div>
  );
}
