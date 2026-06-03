"use client";

import { useState, useTransition } from "react";

export type CRequest = {
  id: string;
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

const TABS = ["All", "Pending", "Approved", "Declined"] as const;
type Tab = typeof TABS[number];

function displayStatus(s: string) {
  switch (s) {
    case "pending":   return "Pending";
    case "quoted":    return "Approved";
    case "accepted":  return "Deposit Paid";
    case "declined":  return "Declined";
    case "completed": return "Completed";
    default:          return s;
  }
}

function statusClass(s: string) {
  switch (s) {
    case "pending":   return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
    case "quoted":    return "bg-green-500/10 text-green-400 border-green-500/20";
    case "accepted":  return "bg-gold/10 text-gold border-gold/20";
    case "declined":  return "bg-red-500/10 text-red-400 border-red-500/20";
    case "completed": return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    default:          return "bg-zinc-800 text-zinc-400 border-zinc-700";
  }
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ── Single request card ────────────────────────────────────────────────────
function RequestCard({
  req,
  onApprove,
  onDecline,
}: {
  req: CRequest;
  onApprove: (id: string) => void;
  onDecline: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isLong = req.design_description.length > 180;

  return (
    <div className="bg-[#111] border border-[#1E1E1E] rounded-xl overflow-hidden">
      {/* Header row */}
      <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-[#1A1A1A]">
        <div>
          <p className="font-semibold text-[#E8E8E8]">{req.client_name}</p>
          <p className="text-xs text-zinc-500 mt-0.5">
            {req.client_email}
            {req.client_phone && (
              <span className="text-zinc-700"> · {req.client_phone}</span>
            )}
          </p>
          <p className="text-xs text-zinc-700 mt-0.5">Submitted {fmtDate(req.created_at)}</p>
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full border shrink-0 ${statusClass(req.status)}`}>
          {displayStatus(req.status)}
        </span>
      </div>

      {/* Details grid */}
      <div className="px-5 py-4 border-b border-[#1A1A1A]">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm mb-4">
          {req.style     && <Detail label="Style"     value={req.style} />}
          {req.placement && <Detail label="Placement" value={req.placement} />}
          {req.size      && <Detail label="Size"      value={req.size} />}
          {req.budget_range && <Detail label="Budget" value={req.budget_range} />}
          {req.preferred_dates && <Detail label="Available" value={req.preferred_dates} />}
        </div>

        <div>
          <p className="text-xs uppercase tracking-widest text-zinc-600 mb-1.5">Description</p>
          <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
            {isLong && !expanded
              ? req.design_description.slice(0, 180) + "…"
              : req.design_description}
          </p>
          {isLong && (
            <button
              onClick={() => setExpanded((e) => !e)}
              className="text-xs text-zinc-500 hover:text-zinc-300 mt-1 transition-colors"
            >
              {expanded ? "Show less ↑" : "Read more ↓"}
            </button>
          )}
        </div>
      </div>

      {/* Photos + availability */}
      {(req.reference_photos.length > 0 || req.preferred_dates) && (
        <div className="px-5 py-4 border-b border-[#1A1A1A] grid grid-cols-1 sm:grid-cols-2 gap-4">
          {req.reference_photos.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-widest text-zinc-600 mb-2">Reference Photos</p>
              <div className="flex flex-wrap gap-2">
                {req.reference_photos.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={`Ref ${i + 1}`}
                      className="w-16 h-16 object-cover rounded-lg border border-zinc-700 hover:border-zinc-500 transition-colors"
                    />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Artist note / declined reason */}
      {req.status === "quoted" && req.artist_note && (
        <div className="px-5 py-3 border-b border-[#1A1A1A] bg-green-500/[0.04]">
          <p className="text-xs uppercase tracking-widest text-green-400/70 mb-1">Your Note to Client</p>
          <p className="text-sm text-zinc-300 leading-relaxed">{req.artist_note}</p>
        </div>
      )}
      {req.status === "declined" && req.declined_reason && (
        <div className="px-5 py-3 border-b border-[#1A1A1A] bg-red-500/[0.04]">
          <p className="text-xs uppercase tracking-widest text-red-400/70 mb-1">Reason Given</p>
          <p className="text-sm text-zinc-300 leading-relaxed">{req.declined_reason}</p>
        </div>
      )}

      {/* Actions */}
      {req.status === "pending" && (
        <div className="px-5 py-4 flex gap-3">
          <button
            onClick={() => onApprove(req.id)}
            className="flex-1 bg-green-600 hover:bg-green-500 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors"
          >
            Approve ✓
          </button>
          <button
            onClick={() => onDecline(req.id)}
            className="flex-1 border border-white/10 hover:border-red-500/40 text-zinc-400 hover:text-red-400 text-sm font-semibold py-2.5 rounded-lg transition-colors"
          >
            Decline ✗
          </button>
        </div>
      )}

      {req.status === "quoted" && req.deposit_amount != null && (
        <div className="px-5 py-4">
          <p className="text-xs text-zinc-600">
            Deposit amount sent: <span className="text-gold">${req.deposit_amount.toFixed(2)}</span>
            {" "}· Awaiting client payment
          </p>
        </div>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-widest text-zinc-600 mb-0.5">{label}</p>
      <p className="text-white/80 text-sm truncate">{value}</p>
    </div>
  );
}

// ── Main client component ──────────────────────────────────────────────────
export default function RequestsClient({ requests: initial }: { requests: CRequest[] }) {
  const [requests, setRequests]   = useState<CRequest[]>(initial);
  const [activeTab, setActiveTab] = useState<Tab>("All");

  // Modal state (one at a time)
  const [modal, setModal]           = useState<{ type: "approve" | "decline"; id: string } | null>(null);
  const [modalDeposit, setModalDeposit] = useState("");
  const [modalNote, setModalNote]       = useState("");
  const [modalReason, setModalReason]   = useState("");
  const [modalError, setModalError]     = useState<string | null>(null);
  const [isPending, startTransition]    = useTransition();

  const counts: Record<Tab, number> = {
    All:      requests.length,
    Pending:  requests.filter((r) => r.status === "pending").length,
    Approved: requests.filter((r) => r.status === "quoted" || r.status === "accepted").length,
    Declined: requests.filter((r) => r.status === "declined").length,
  };

  const filtered = requests.filter((r) => {
    if (activeTab === "Pending")  return r.status === "pending";
    if (activeTab === "Approved") return r.status === "quoted" || r.status === "accepted";
    if (activeTab === "Declined") return r.status === "declined";
    return true;
  });

  function openApprove(id: string) {
    setModal({ type: "approve", id });
    setModalDeposit("");
    setModalNote("");
    setModalError(null);
  }
  function openDecline(id: string) {
    setModal({ type: "decline", id });
    setModalReason("");
    setModalError(null);
  }
  function closeModal() {
    setModal(null);
    setModalError(null);
  }

  function handleApprove() {
    const deposit = parseFloat(modalDeposit);
    if (isNaN(deposit) || deposit <= 0) {
      setModalError("Enter a valid deposit amount");
      return;
    }
    startTransition(async () => {
      const res = await fetch(`/api/custom-requests/${modal!.id}/quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quote_amount:  deposit,
          deposit_amount: deposit,
          quote_message: modalNote.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setModalError(data.error ?? "Failed to approve"); return; }
      setRequests((prev) =>
        prev.map((r) =>
          r.id === modal!.id
            ? { ...r, status: "quoted", deposit_amount: deposit, artist_note: modalNote.trim() || null }
            : r
        )
      );
      closeModal();
    });
  }

  function handleDecline() {
    if (!modalReason.trim()) { setModalError("Please provide a reason"); return; }
    startTransition(async () => {
      const res = await fetch(`/api/custom-requests/${modal!.id}/decline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ declined_reason: modalReason.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setModalError(data.error ?? "Failed to decline"); return; }
      setRequests((prev) =>
        prev.map((r) =>
          r.id === modal!.id
            ? { ...r, status: "declined", declined_reason: modalReason.trim() }
            : r
        )
      );
      closeModal();
    });
  }

  const inputCls = "w-full bg-zinc-900 border border-zinc-800 text-white text-sm rounded-lg px-4 py-3 placeholder-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors";

  return (
    <div className="space-y-5">
      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`text-xs px-3.5 py-1.5 rounded-full border transition-colors ${
              activeTab === tab
                ? "bg-white/10 text-white border-white/20"
                : "text-zinc-500 border-zinc-800 hover:border-zinc-600 hover:text-zinc-300"
            }`}
          >
            {tab}
            {counts[tab] > 0 && (
              <span className="ml-1.5 text-zinc-600">{counts[tab]}</span>
            )}
          </button>
        ))}
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <div className="bg-[#111] border border-[#1E1E1E] rounded-xl px-6 py-16 text-center">
          <p className="text-zinc-500 text-sm">No requests yet.</p>
          <p className="text-zinc-700 text-xs mt-1">
            Requests submitted through your booking page appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((req) => (
            <RequestCard
              key={req.id}
              req={req}
              onApprove={openApprove}
              onDecline={openDecline}
            />
          ))}
        </div>
      )}

      {/* ── Modals ─────────────────────────────────────────────────────────── */}
      {modal && (
        <>
          <div
            className="fixed inset-0 bg-black/70 z-50"
            onClick={closeModal}
          />
          <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 max-w-md mx-auto bg-[#111] border border-[#1E1E1E] rounded-2xl p-6 shadow-2xl space-y-4">
            {modal.type === "approve" ? (
              <>
                <h3 className="font-cinzel text-lg font-bold">Approve Request</h3>
                <div>
                  <label className="block text-xs uppercase tracking-widest text-zinc-500 mb-1.5">
                    Deposit Amount ($) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    value={modalDeposit}
                    onChange={(e) => setModalDeposit(e.target.value)}
                    className={inputCls}
                    placeholder="e.g. 150.00"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest text-zinc-500 mb-1.5">
                    Note to Client (optional)
                  </label>
                  <textarea
                    rows={3}
                    value={modalNote}
                    onChange={(e) => setModalNote(e.target.value)}
                    className={`${inputCls} resize-none`}
                    placeholder="Any details about the session, scheduling, next steps…"
                  />
                </div>
                {modalError && (
                  <p className="text-red-400 text-xs">{modalError}</p>
                )}
                <div className="flex gap-3 pt-1">
                  <button
                    onClick={handleApprove}
                    disabled={isPending}
                    className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold text-sm py-3 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {isPending ? "Approving…" : "Approve Request"}
                  </button>
                  <button
                    onClick={closeModal}
                    className="px-5 py-3 border border-white/10 text-zinc-400 hover:text-white text-sm rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="font-cinzel text-lg font-bold">Decline Request</h3>
                <div>
                  <label className="block text-xs uppercase tracking-widest text-zinc-500 mb-1.5">
                    Reason *
                  </label>
                  <textarea
                    rows={4}
                    value={modalReason}
                    onChange={(e) => setModalReason(e.target.value)}
                    className={`${inputCls} resize-none`}
                    placeholder="Let the client know why — e.g. schedule is full, style not in my range…"
                    autoFocus
                  />
                </div>
                {modalError && (
                  <p className="text-red-400 text-xs">{modalError}</p>
                )}
                <div className="flex gap-3 pt-1">
                  <button
                    onClick={handleDecline}
                    disabled={isPending}
                    className="flex-1 bg-red-700 hover:bg-red-600 text-white font-bold text-sm py-3 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {isPending ? "Declining…" : "Decline Request"}
                  </button>
                  <button
                    onClick={closeModal}
                    className="px-5 py-3 border border-white/10 text-zinc-400 hover:text-white text-sm rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
