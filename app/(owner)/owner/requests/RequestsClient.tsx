"use client";

import { useState, useTransition } from "react";
import Link from "next/link";

export type OwnerRequest = {
  id: string;
  artist_id: string | null;
  client_name: string;
  client_email: string;
  client_phone: string;
  style: string | null;
  placement: string;
  size: string;
  budget_range: string;
  preferred_dates: string;
  design_description: string;
  reference_photos: string[];
  status: string;
  quote_amount: number | null;
  deposit_amount: number | null;
  artist_note: string | null;
  declined_reason: string | null;
  created_at: string;
};

type Status = "pending" | "quoted" | "accepted" | "scheduled" | "completed" | "declined";

// Real status vocabulary (custom_requests_status_check) in chronological
// order — pending -> quoted -> accepted (deposit paid) -> scheduled ->
// completed, with declined as the exit state. Matches the same
// filter/count-strip pattern already used by Consultations/Bookings.
const FILTER_ORDER: Status[] = ["pending", "quoted", "accepted", "scheduled", "completed", "declined"];

const STATUS_META: Record<Status, { label: string; badge: string }> = {
  pending:   { label: "Pending",      badge: "bg-amber-50 text-amber-700" },
  quoted:    { label: "Quoted",       badge: "bg-violet-50 text-violet-700" },
  accepted:  { label: "Deposit Paid", badge: "bg-emerald-50 text-emerald-700" },
  scheduled: { label: "Scheduled",    badge: "bg-sky-50 text-sky-700" },
  completed: { label: "Completed",    badge: "bg-green-50 text-green-700" },
  declined:  { label: "Declined",     badge: "bg-zinc-100 text-zinc-500" },
};

function statusMeta(s: string) {
  return STATUS_META[s as Status] ?? { label: s, badge: "bg-zinc-100 text-zinc-500" };
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const spinnerSvg = (
  <svg className="animate-spin h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-widest text-zinc-400 mb-0.5">{label}</p>
      <p className="text-zinc-700 text-xs truncate">{value}</p>
    </div>
  );
}

// ─── Request Card ───────────────────────────────────────────────

function RequestCard({
  req,
  artistName,
  onApprove,
  onDecline,
}: {
  req: OwnerRequest;
  artistName: string;
  onApprove: (id: string) => void;
  onDecline: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isLong = req.design_description.length > 180;
  const meta = statusMeta(req.status);
  const needsAction = req.status === "pending";

  return (
    <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${needsAction ? "border-amber-200" : "border-zinc-200"}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-zinc-100">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-zinc-900">{req.client_name}</p>
            {needsAction && (
              <span className="text-[10px] px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                Needs action
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-500 mt-0.5 truncate">{req.client_email} · {req.client_phone}</p>
          <p className="text-xs text-zinc-400 mt-0.5">{fmtDate(req.created_at)} · {artistName}</p>
        </div>
        <span className={`text-[10px] px-2.5 py-1 rounded-full font-medium shrink-0 ${meta.badge}`}>
          {meta.label}
        </span>
      </div>

      {/* Details */}
      <div className="px-5 py-4 border-b border-zinc-100">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          {req.style          && <Detail label="Style"     value={req.style} />}
          {req.placement      && <Detail label="Placement" value={req.placement} />}
          {req.size           && <Detail label="Size"      value={req.size} />}
          {req.budget_range   && <Detail label="Budget"    value={req.budget_range} />}
          {req.preferred_dates && <Detail label="Available" value={req.preferred_dates} />}
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-widest text-zinc-400 mb-1.5">Description</p>
          <p className="text-sm text-zinc-600 leading-relaxed whitespace-pre-wrap">
            {isLong && !expanded ? req.design_description.slice(0, 180) + "…" : req.design_description}
          </p>
          {isLong && (
            <button
              onClick={() => setExpanded((e) => !e)}
              className="text-xs text-violet-600 hover:text-violet-700 mt-1 transition-colors"
            >
              {expanded ? "Show less ↑" : "Read more ↓"}
            </button>
          )}
        </div>
      </div>

      {/* Photos */}
      {req.reference_photos.length > 0 && (
        <div className="px-5 py-4 border-b border-zinc-100">
          <p className="text-[10px] uppercase tracking-widest text-zinc-400 mb-2">Reference Photos</p>
          <div className="flex flex-wrap gap-2">
            {req.reference_photos.map((url, i) => (
              <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`Ref ${i + 1}`}
                  className="w-16 h-16 object-cover rounded-lg border border-zinc-200 hover:border-violet-300 transition-colors"
                />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Approved / Declined notes */}
      {(req.status === "quoted" || req.status === "accepted" || req.status === "scheduled") && req.artist_note && (
        <div className="px-5 py-3 border-b border-zinc-100 bg-violet-50/50">
          <p className="text-[10px] uppercase tracking-widest text-violet-600 mb-1">Note to Client</p>
          <p className="text-sm text-zinc-700">{req.artist_note}</p>
        </div>
      )}
      {req.status === "declined" && req.declined_reason && (
        <div className="px-5 py-3 border-b border-zinc-100 bg-red-50/50">
          <p className="text-[10px] uppercase tracking-widest text-red-600 mb-1">Reason Given</p>
          <p className="text-sm text-zinc-700">{req.declined_reason}</p>
        </div>
      )}

      {/* Actions */}
      {needsAction ? (
        // Approve/Decline need to read as the clear primary actions on their
        // own full-width row — "Full details" sits on its own row underneath
        // instead of being squeezed into the same row, where it would either
        // overlap or crowd the two buttons.
        <div className="px-5 py-4 border-t border-zinc-100 space-y-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => onApprove(req.id)}
              className="flex-1 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
            >
              Approve
            </button>
            <button
              onClick={() => onDecline(req.id)}
              className="flex-1 border border-zinc-200 hover:border-red-300 text-zinc-500 hover:text-red-600 text-sm font-semibold py-2.5 rounded-xl transition-colors"
            >
              Decline
            </button>
          </div>
          <div className="flex justify-end">
            <Link
              href={`/owner/requests/${req.id}`}
              className="text-xs text-violet-600 hover:text-violet-700 transition-colors font-medium"
            >
              Full details →
            </Link>
          </div>
        </div>
      ) : (
        <div className="px-5 py-4 flex items-center gap-3">
          {req.status === "quoted" && req.deposit_amount != null && (
            <p className="text-xs text-zinc-400 flex-1">
              Deposit: <span className="text-violet-700 font-medium">${req.deposit_amount.toFixed(2)}</span>
              {" "}· Awaiting client payment
            </p>
          )}
          <Link
            href={`/owner/requests/${req.id}`}
            className="text-xs text-violet-600 hover:text-violet-700 transition-colors shrink-0 font-medium"
          >
            Full details →
          </Link>
        </div>
      )}
    </div>
  );
}

// ─── Approve Modal ──────────────────────────────────────────────

function ApproveModal({
  req,
  artists,
  onClose,
  onSuccess,
}: {
  req: OwnerRequest;
  artists: { id: string; name: string }[];
  onClose: () => void;
  onSuccess: (data: { quote_amount: number; deposit_amount: number; artist_note: string | null; artist_id: string | null }) => void;
}) {
  const [artistId, setArtistId] = useState("");
  const [quote, setQuote] = useState("");
  const [deposit, setDeposit] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // artist_id is only missing when the client submitted without a
  // preference (app/book/[studio]/custom/actions.ts leaves it null) — the
  // API requires one to be resolved before a quote can be sent.
  const needsArtist = !req.artist_id;

  const inputCls =
    "w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2.5 text-sm text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-colors";

  function handleSubmit() {
    setError(null);
    const quoteAmount = parseFloat(quote);
    const depositAmount = parseFloat(deposit);
    if (needsArtist && !artistId) { setError("Select an artist for this request"); return; }
    if (isNaN(quoteAmount) || quoteAmount <= 0) { setError("Enter a valid total quote amount"); return; }
    if (isNaN(depositAmount) || depositAmount <= 0) { setError("Enter a valid deposit amount"); return; }
    if (depositAmount >= quoteAmount) { setError("Deposit must be less than the total quote"); return; }

    startTransition(async () => {
      const res = await fetch(`/api/custom-requests/${req.id}/quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quote_amount: quoteAmount,
          deposit_amount: depositAmount,
          quote_message: note.trim() || undefined,
          ...(needsArtist ? { artist_id: artistId } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to approve"); return; }
      onSuccess({
        quote_amount: quoteAmount,
        deposit_amount: depositAmount,
        artist_note: note.trim() || null,
        artist_id: needsArtist ? artistId : null,
      });
    });
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div
        className="bg-white border border-zinc-200 shadow-xl rounded-2xl p-6 w-full max-w-md space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-semibold text-zinc-900">Approve Request</h2>

        {needsArtist && (
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">Assign Artist *</label>
            <select
              value={artistId}
              onChange={(e) => setArtistId(e.target.value)}
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
          <label className="block text-xs text-zinc-400 mb-1.5">Total Quote ($) *</label>
          <input
            type="number" min="1" step="0.01" autoFocus
            value={quote} onChange={(e) => setQuote(e.target.value)}
            className={inputCls} placeholder="e.g. 500.00"
          />
          <p className="text-[11px] text-zinc-400 mt-1">Full session price shown to the client</p>
        </div>

        <div>
          <label className="block text-xs text-zinc-400 mb-1.5">Deposit Amount ($) *</label>
          <input
            type="number" min="1" step="0.01"
            value={deposit} onChange={(e) => setDeposit(e.target.value)}
            className={inputCls} placeholder="e.g. 150.00"
          />
          <p className="text-[11px] text-zinc-400 mt-1">Collected now to secure the appointment</p>
        </div>

        <div>
          <label className="block text-xs text-zinc-400 mb-1.5">Note to Client (optional)</label>
          <textarea
            rows={3} value={note} onChange={(e) => setNote(e.target.value)}
            className={`${inputCls} resize-none`}
            placeholder="Any details about the session, next steps…"
          />
        </div>

        {error && <p className="text-red-600 text-xs">{error}</p>}

        <div className="flex gap-3">
          <button
            onClick={handleSubmit}
            disabled={isPending}
            className="flex-1 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isPending ? <>{spinnerSvg} Approving…</> : "Approve Request"}
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2.5 border border-zinc-200 text-zinc-600 hover:text-zinc-900 text-sm rounded-xl transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Decline Modal ──────────────────────────────────────────────

function DeclineModal({
  onClose,
  onConfirm,
}: {
  onClose: () => void;
  onConfirm: (reason: string) => Promise<string | undefined>;
}) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    if (!reason.trim()) { setError("Please provide a reason"); return; }
    setError(null);
    startTransition(async () => {
      const err = await onConfirm(reason.trim());
      if (err) setError(err);
    });
  }

  const inputCls =
    "w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2.5 text-sm text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-colors";

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div
        className="bg-white border border-zinc-200 shadow-xl rounded-2xl p-6 w-full max-w-md space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-semibold text-zinc-900">Decline Request</h2>
        <div>
          <label className="block text-xs text-zinc-400 mb-1.5">Reason *</label>
          <textarea
            rows={4} autoFocus value={reason} onChange={(e) => setReason(e.target.value)}
            className={`${inputCls} resize-none`}
            placeholder="Let the client know why…"
          />
        </div>
        {error && <p className="text-red-600 text-xs">{error}</p>}
        <div className="flex gap-3">
          <button
            onClick={handleSubmit}
            disabled={isPending}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isPending ? <>{spinnerSvg} Declining…</> : "Decline Request"}
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2.5 border border-zinc-200 text-zinc-600 hover:text-zinc-900 text-sm rounded-xl transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────

export default function OwnerRequestsClient({
  requests: initial,
  artistMap,
  artists,
}: {
  requests: OwnerRequest[];
  artistMap: Record<string, string>;
  artists: { id: string; name: string }[];
}) {
  const [requests, setRequests] = useState<OwnerRequest[]>(initial);
  const [activeStatus, setActiveStatus] = useState<string>("all");
  const [artistFilter, setArtistFilter] = useState("");
  const [approveTarget, setApproveTarget] = useState<OwnerRequest | null>(null);
  const [declineTargetId, setDeclineTargetId] = useState<string | null>(null);

  const stageCounts = Object.fromEntries(
    FILTER_ORDER.map((s) => [s, requests.filter((r) => r.status === s).length])
  );

  const filtered = requests
    .filter((r) => !artistFilter || r.artist_id === artistFilter)
    .filter((r) => activeStatus === "all" || r.status === activeStatus);

  // Lifecycle/action priority, not creation date — a request needing action
  // (pending) must never sit below an already-closed-out one (completed/
  // declined), regardless of when either was submitted. Reuses FILTER_ORDER
  // as the single source of truth for lifecycle order (same order already
  // driving the filter strip above). Array.prototype.sort is stable, so
  // requests sharing a status keep their existing created_at-desc order.
  const statusRank = Object.fromEntries(FILTER_ORDER.map((s, i) => [s, i]));
  const sorted = [...filtered].sort(
    (a, b) => (statusRank[a.status] ?? FILTER_ORDER.length) - (statusRank[b.status] ?? FILTER_ORDER.length)
  );

  const needsActionCount = requests.filter((r) => r.status === "pending").length;

  async function handleDecline(id: string, reason: string): Promise<string | undefined> {
    const res = await fetch(`/api/custom-requests/${id}/decline`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ declined_reason: reason }),
    });
    const data = await res.json();
    if (!res.ok) return data.error ?? "Failed to decline";
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "declined", declined_reason: reason } : r))
    );
    setDeclineTargetId(null);
    return undefined;
  }

  return (
    <div className="-m-4 -mt-16 md:-m-8 min-h-[calc(100vh-3rem)] md:min-h-screen" style={{ background: "#FAF9FC" }}>
      <div className="p-4 pt-16 md:p-8 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-zinc-900">Requests</h1>
            <p className="text-sm text-zinc-500 mt-1">
              {activeStatus === "all" ? `${requests.length} total` : `${filtered.length} ${statusMeta(activeStatus).label}`}
              {needsActionCount > 0 && (
                <span className="text-amber-600 font-medium"> · {needsActionCount} need{needsActionCount === 1 ? "s" : ""} action</span>
              )}
            </p>
          </div>
          {artists.length > 0 && (
            <select
              value={artistFilter}
              onChange={(e) => setArtistFilter(e.target.value)}
              className="bg-white border border-zinc-200 text-sm text-zinc-600 rounded-xl px-3.5 py-2 focus:outline-none focus:border-violet-300"
            >
              <option value="">All Artists</option>
              {artists.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          )}
        </div>

        {/* Filter / status overview strip */}
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-4 sm:p-5">
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            <button
              onClick={() => setActiveStatus("all")}
              className={`shrink-0 rounded-xl border px-3.5 py-2.5 text-center min-w-[76px] transition-colors ${
                activeStatus === "all" ? "border-violet-200 bg-violet-50" : "border-zinc-100 hover:border-zinc-200"
              }`}
            >
              <p className={`text-lg font-bold tabular-nums ${activeStatus === "all" ? "text-violet-700" : "text-zinc-900"}`}>{requests.length}</p>
              <p className="text-[9px] uppercase tracking-widest text-zinc-400 mt-0.5">All</p>
            </button>
            {FILTER_ORDER.map((s) => (
              <button
                key={s}
                onClick={() => setActiveStatus(s)}
                className={`shrink-0 rounded-xl border px-3.5 py-2.5 text-center min-w-[88px] transition-colors ${
                  activeStatus === s ? "border-violet-200 bg-violet-50" : "border-zinc-100 hover:border-zinc-200"
                }`}
              >
                <p className={`text-lg font-bold tabular-nums ${activeStatus === s ? "text-violet-700" : "text-zinc-900"}`}>
                  {stageCounts[s] ?? 0}
                </p>
                <p className="text-[9px] uppercase tracking-widest text-zinc-400 mt-0.5 truncate">{STATUS_META[s].label}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Empty state */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm px-6 py-16 text-center">
            {activeStatus === "all" && !artistFilter ? (
              <>
                <p className="text-base font-semibold text-zinc-900 mb-2">No Requests Yet</p>
                <p className="text-zinc-500 text-sm">Custom tattoo requests submitted through your studio&apos;s public page will appear here.</p>
              </>
            ) : (
              <>
                <p className="text-base font-semibold text-zinc-900 mb-2">No Matching Requests</p>
                <p className="text-zinc-500 text-sm">Nothing matches the selected filters.</p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {sorted.map((req) => (
              <RequestCard
                key={req.id}
                req={req}
                artistName={req.artist_id ? (artistMap[req.artist_id] ?? "Unknown") : "Any Artist"}
                onApprove={() => setApproveTarget(req)}
                onDecline={() => setDeclineTargetId(req.id)}
              />
            ))}
          </div>
        )}

        {/* Modals */}
        {approveTarget && (
          <ApproveModal
            req={approveTarget}
            artists={artists}
            onClose={() => setApproveTarget(null)}
            onSuccess={({ quote_amount, deposit_amount, artist_note, artist_id }) => {
              setRequests((prev) =>
                prev.map((r) =>
                  r.id === approveTarget.id
                    ? { ...r, status: "quoted", quote_amount, deposit_amount, artist_note, artist_id: artist_id ?? r.artist_id }
                    : r
                )
              );
              setApproveTarget(null);
            }}
          />
        )}

        {declineTargetId && (
          <DeclineModal
            onClose={() => setDeclineTargetId(null)}
            onConfirm={(reason) => handleDecline(declineTargetId, reason)}
          />
        )}
      </div>
    </div>
  );
}
