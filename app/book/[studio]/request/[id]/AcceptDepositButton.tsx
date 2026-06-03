"use client";

import { useState } from "react";

interface Props {
  requestId: string;
  studioSlug: string;
  depositAmount: number;
}

export default function AcceptDepositButton({ requestId, studioSlug, depositAmount }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAccept() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/custom-requests/${requestId}/deposit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studioSlug }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Payment setup failed");
      if (data.url) window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}
      <button
        onClick={handleAccept}
        disabled={loading}
        className="w-full bg-gold text-black font-bold text-sm py-3.5 rounded-lg hover:bg-gold-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Redirecting to payment…" : `Accept Quote & Pay $${depositAmount.toFixed(2)} Deposit`}
      </button>
      <p className="text-xs text-zinc-600 text-center">
        Deposit is applied toward your total session cost. Non-refundable on no-show or late cancellation.
      </p>
    </div>
  );
}
