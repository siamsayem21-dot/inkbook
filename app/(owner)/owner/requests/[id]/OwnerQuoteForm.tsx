"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  requestId: string;
  currentStatus: string;
  currentArtistId: string | null;
  artists: { id: string; name: string }[];
}

const spinnerSvg = (
  <svg className="animate-spin h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);

export default function OwnerQuoteForm({ requestId, currentStatus, currentArtistId, artists }: Props) {
  const router = useRouter();
  const [artistId, setArtistId] = useState("");
  const [quoteAmount, setQuoteAmount] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [artistNote, setArtistNote] = useState("");
  const [declineReason, setDeclineReason] = useState("");
  const [view, setView] = useState<"approve" | "decline" | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!["pending", "quoted"].includes(currentStatus)) return null;

  // Client submission leaves artist_id null when submitted with no preferred
  // artist (app/book/[studio]/custom/actions.ts) — the /quote API requires
  // one to be resolved before a quote can be sent, so this form must be able
  // to assign one, not just re-send the same quote.
  const needsArtist = !currentArtistId;

  const inputCls =
    "w-full bg-zinc-50 border border-zinc-200 text-zinc-800 text-sm rounded-xl px-4 py-3 placeholder-zinc-400 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-colors";

  async function handleApprove(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (needsArtist && !artistId) { setError("Select an artist for this request"); return; }
    const quote = parseFloat(quoteAmount);
    const deposit = parseFloat(depositAmount);
    if (isNaN(quote) || quote <= 0) { setError("Enter a valid total quote amount"); return; }
    if (isNaN(deposit) || deposit <= 0) { setError("Enter a valid deposit amount"); return; }
    if (deposit >= quote) { setError("Deposit must be less than the total quote"); return; }

    setLoading(true);
    try {
      const res = await fetch(`/api/custom-requests/${requestId}/quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quote_amount: quote,
          deposit_amount: deposit,
          quote_message: artistNote.trim() || undefined,
          ...(needsArtist ? { artist_id: artistId } : {}),
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
    <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6 space-y-4">
      <h2 className="text-base font-semibold text-zinc-900">Actions</h2>

      {view === null && (
        <div className="flex gap-3">
          <button onClick={() => { setView("approve"); setError(null); }}
            className="flex-1 bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm py-3 rounded-xl transition-colors"
          >
            Approve
          </button>
          <button onClick={() => { setView("decline"); setError(null); }}
            className="flex-1 border border-zinc-200 hover:border-red-300 text-zinc-500 hover:text-red-600 text-sm font-semibold py-3 rounded-xl transition-colors"
          >
            Decline
          </button>
        </div>
      )}

      {view === "approve" && (
        <form onSubmit={handleApprove} className="space-y-4">
          {needsArtist && (
            <div>
              <label htmlFor="owner-quote-artist" className="block text-xs text-zinc-400 mb-1.5">Assign Artist *</label>
              <select
                id="owner-quote-artist"
                required value={artistId} onChange={(e) => setArtistId(e.target.value)}
                className={inputCls}
              >
                <option value="">Select an artist…</option>
                {artists.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
              <p className="text-[11px] text-zinc-400 mt-1">This request was submitted without a preferred artist.</p>
            </div>
          )}
          <div>
            <label htmlFor="owner-quote-total" className="block text-xs text-zinc-400 mb-1.5">Total Quote ($) *</label>
            <input id="owner-quote-total" required type="number" min="1" step="0.01" className={inputCls}
              placeholder="e.g. 500.00" value={quoteAmount}
              onChange={(e) => setQuoteAmount(e.target.value)}
            />
            <p className="text-[11px] text-zinc-400 mt-1">Full session price shown to the client</p>
          </div>
          <div>
            <label htmlFor="owner-quote-deposit" className="block text-xs text-zinc-400 mb-1.5">Deposit Amount ($) *</label>
            <input id="owner-quote-deposit" required type="number" min="1" step="0.01" className={inputCls}
              placeholder="e.g. 150.00" value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
            />
            <p className="text-[11px] text-zinc-400 mt-1">Collected now to secure the appointment — must be less than the total quote</p>
          </div>
          <div>
            <label htmlFor="owner-quote-note" className="block text-xs text-zinc-400 mb-1.5">Note to Client (optional)</label>
            <textarea id="owner-quote-note" rows={3} className={`${inputCls} resize-none`}
              placeholder="Any details about the session…"
              value={artistNote} onChange={(e) => setArtistNote(e.target.value)}
            />
          </div>
          {error && <p className="text-red-600 text-xs">{error}</p>}
          <div className="flex gap-3">
            <button type="submit" disabled={loading}
              className="flex-1 bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm py-3 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <>{spinnerSvg} Approving…</> : "Confirm Approval"}
            </button>
            <button type="button" onClick={() => setView(null)}
              className="px-5 py-3 border border-zinc-200 text-zinc-600 hover:text-zinc-900 text-sm rounded-xl transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {view === "decline" && (
        <form onSubmit={handleDecline} className="space-y-4">
          <div>
            <label htmlFor="owner-decline-reason" className="block text-xs text-zinc-400 mb-1.5">Reason *</label>
            <textarea id="owner-decline-reason" required rows={4} className={`${inputCls} resize-none`}
              placeholder="Let the client know why — schedule full, style not in range, etc."
              value={declineReason} onChange={(e) => setDeclineReason(e.target.value)}
            />
          </div>
          {error && <p className="text-red-600 text-xs">{error}</p>}
          <div className="flex gap-3">
            <button type="submit" disabled={loading}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold text-sm py-3 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <>{spinnerSvg} Declining…</> : "Confirm Decline"}
            </button>
            <button type="button" onClick={() => setView(null)}
              className="px-5 py-3 border border-zinc-200 text-zinc-600 hover:text-zinc-900 text-sm rounded-xl transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
