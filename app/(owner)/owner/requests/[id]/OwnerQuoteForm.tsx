"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  requestId: string;
  currentStatus: string;
}

export default function OwnerQuoteForm({ requestId, currentStatus }: Props) {
  const router = useRouter();
  const [quoteAmount, setQuoteAmount] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [quoteMessage, setQuoteMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!["pending", "quoted"].includes(currentStatus)) return null;

  async function handleQuote(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const amount = parseFloat(quoteAmount);
    const deposit = parseFloat(depositAmount);

    if (isNaN(amount) || amount <= 0) {
      setError("Enter a valid quote amount.");
      return;
    }
    if (isNaN(deposit) || deposit <= 0 || deposit > amount) {
      setError("Enter a valid deposit amount (must be ≤ quote total).");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/custom-requests/${requestId}/quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quote_amount: amount,
          deposit_amount: deposit,
          quote_message: quoteMessage.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to send quote");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleDecline() {
    if (!confirm("Decline this request? The client will be notified.")) return;
    setDeclining(true);
    try {
      const res = await fetch(`/api/custom-requests/${requestId}/decline`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to decline");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setDeclining(false);
    }
  }

  const inputCls =
    "w-full bg-zinc-900 border border-zinc-800 text-white text-sm rounded-lg px-4 py-3 placeholder-zinc-600 focus:outline-none focus:border-gold/50 transition-colors";

  return (
    <div className="bg-[#111] border border-[#1E1E1E] rounded-xl p-6 space-y-5">
      <h2 className="font-cinzel text-lg font-bold">
        {currentStatus === "quoted" ? "Update Quote" : "Send a Quote"}
      </h2>

      <form onSubmit={handleQuote} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs uppercase tracking-widest text-zinc-500 mb-1.5">
              Total Session Price ($) *
            </label>
            <input
              required
              type="number"
              min="1"
              step="0.01"
              className={inputCls}
              placeholder="e.g. 600.00"
              value={quoteAmount}
              onChange={(e) => setQuoteAmount(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest text-zinc-500 mb-1.5">
              Deposit to Confirm ($) *
            </label>
            <input
              required
              type="number"
              min="1"
              step="0.01"
              className={inputCls}
              placeholder="e.g. 150.00"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs uppercase tracking-widest text-zinc-500 mb-1.5">
            Message to Client (optional)
          </label>
          <textarea
            rows={3}
            className={`${inputCls} resize-none`}
            placeholder="Any notes, questions, or details about the session…"
            value={quoteMessage}
            onChange={(e) => setQuoteMessage(e.target.value)}
          />
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <button
            type="submit"
            disabled={loading || declining}
            className="flex-1 bg-gold text-black font-bold text-sm py-3 rounded-lg hover:bg-gold-light transition-colors disabled:opacity-50"
          >
            {loading ? "Sending…" : "Send Quote to Client"}
          </button>
          <button
            type="button"
            onClick={handleDecline}
            disabled={loading || declining}
            className="px-4 py-3 border border-white/10 text-zinc-400 hover:text-white text-sm rounded-lg transition-colors disabled:opacity-50"
          >
            {declining ? "Declining…" : "Decline"}
          </button>
        </div>
      </form>
    </div>
  );
}
