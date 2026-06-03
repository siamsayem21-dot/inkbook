"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  requestId: string;
  currentStatus: string;
}

export default function QuoteForm({ requestId, currentStatus }: Props) {
  const router = useRouter();
  const [depositAmount, setDepositAmount] = useState("");
  const [artistNote,    setArtistNote]    = useState("");
  const [declineReason, setDeclineReason] = useState("");
  const [view,    setView]   = useState<"approve" | "decline" | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  if (!["pending", "quoted"].includes(currentStatus)) return null;

  const inputCls =
    "w-full bg-zinc-900 border border-zinc-800 text-white text-sm rounded-lg px-4 py-3 placeholder-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors";

  async function handleApprove(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const deposit = parseFloat(depositAmount);
    if (isNaN(deposit) || deposit <= 0) { setError("Enter a valid deposit amount"); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/custom-requests/${requestId}/quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quote_amount:  deposit,
          deposit_amount: deposit,
          quote_message: artistNote.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to approve");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally { setLoading(false); }
  }

  async function handleDecline(e: React.FormEvent) {
    e.preventDefault();
    if (!declineReason.trim()) { setError("Please provide a reason"); return; }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/custom-requests/${requestId}/decline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ declined_reason: declineReason.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to decline");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally { setLoading(false); }
  }

  return (
    <div className="bg-[#111] border border-[#1E1E1E] rounded-xl p-6 space-y-4">
      <h2 className="font-cinzel text-lg font-bold">Actions</h2>

      {view === null && (
        <div className="flex gap-3">
          <button
            onClick={() => { setView("approve"); setError(null); }}
            className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold text-sm py-3 rounded-lg transition-colors"
          >
            Approve Request ✓
          </button>
          <button
            onClick={() => { setView("decline"); setError(null); }}
            className="flex-1 border border-white/10 hover:border-red-500/40 text-zinc-400 hover:text-red-400 text-sm font-semibold py-3 rounded-lg transition-colors"
          >
            Decline ✗
          </button>
        </div>
      )}

      {view === "approve" && (
        <form onSubmit={handleApprove} className="space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-widest text-zinc-500 mb-1.5">
              Deposit Amount ($) *
            </label>
            <input
              required type="number" min="1" step="0.01"
              className={inputCls} placeholder="e.g. 150.00"
              value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest text-zinc-500 mb-1.5">
              Note to Client (optional)
            </label>
            <textarea
              rows={3} className={`${inputCls} resize-none`}
              placeholder="Any details about the session, next steps…"
              value={artistNote} onChange={(e) => setArtistNote(e.target.value)}
            />
          </div>
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <div className="flex gap-3">
            <button
              type="submit" disabled={loading}
              className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold text-sm py-3 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? "Approving…" : "Confirm Approval"}
            </button>
            <button type="button" onClick={() => setView(null)}
              className="px-5 py-3 border border-white/10 text-zinc-400 hover:text-white text-sm rounded-lg"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {view === "decline" && (
        <form onSubmit={handleDecline} className="space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-widest text-zinc-500 mb-1.5">
              Reason *
            </label>
            <textarea
              required rows={4} className={`${inputCls} resize-none`}
              placeholder="Let the client know why — schedule full, style not in your range, etc."
              value={declineReason} onChange={(e) => setDeclineReason(e.target.value)}
            />
          </div>
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <div className="flex gap-3">
            <button
              type="submit" disabled={loading}
              className="flex-1 bg-red-700 hover:bg-red-600 text-white font-bold text-sm py-3 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? "Declining…" : "Confirm Decline"}
            </button>
            <button type="button" onClick={() => setView(null)}
              className="px-5 py-3 border border-white/10 text-zinc-400 hover:text-white text-sm rounded-lg"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
