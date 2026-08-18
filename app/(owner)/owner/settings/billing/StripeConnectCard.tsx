"use client";

import { useState } from "react";

type ConnectStatus = {
  accountId: string | null;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
};

// Client Payments card — separate from the subscription card above it on
// purpose (Section 6 of the payment architecture plan): this is entirely
// about the studio's OWN Stripe account receiving its clients' tattoo
// deposit/remainder payments directly, with InkBook taking 0%. It never
// touches, reads, or writes anything related to the studio's own InkBook
// subscription.
export default function StripeConnectCard({ status }: { status: ConnectStatus }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startOnboarding() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/connect/onboard", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setError(data.error ?? "Could not start Stripe setup. Please try again.");
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const isFullyConnected = status.accountId && status.chargesEnabled;
  const isIncomplete = status.accountId && !status.chargesEnabled;

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6 space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      <div>
        <p className="font-semibold text-zinc-900">Client payments</p>
        <p className="text-zinc-500 text-sm">
          Deposits and balance payments from your own clients go straight to your own Stripe account — InkBook takes 0%.
        </p>
      </div>

      <hr className="border-zinc-100" />

      {isFullyConnected && (
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-green-700 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500" /> Connected
          </span>
          <a
            href="/api/stripe/connect/login-link"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-violet-600 hover:underline"
          >
            Manage on Stripe →
          </a>
        </div>
      )}

      {isIncomplete && (
        <div className="space-y-3">
          <p className="text-sm text-amber-600">
            {status.detailsSubmitted
              ? "Stripe needs a bit more information before you can accept payments."
              : "You started Stripe setup but haven't finished it yet."}
          </p>
          <button
            onClick={startOnboarding}
            disabled={loading}
            className="text-sm bg-violet-600 text-white font-semibold px-5 py-2 rounded-full hover:bg-violet-700 transition-colors disabled:opacity-50"
          >
            {loading ? "Opening…" : "Finish Stripe setup"}
          </button>
        </div>
      )}

      {!status.accountId && (
        <div className="space-y-3">
          <p className="text-sm text-zinc-500">
            Connect your own Stripe account to start accepting client deposits and balance payments.
          </p>
          <button
            onClick={startOnboarding}
            disabled={loading}
            className="text-sm bg-violet-600 text-white font-semibold px-5 py-2 rounded-full hover:bg-violet-700 transition-colors disabled:opacity-50"
          >
            {loading ? "Opening…" : "Connect Stripe"}
          </button>
        </div>
      )}
    </div>
  );
}
