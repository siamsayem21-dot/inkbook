"use client";

import { useState, useTransition } from "react";
import { addToBlacklist, removeFromBlacklist, type BlacklistEntry } from "@/app/(owner)/owner/blacklist/actions";

const inputCls =
  "w-full bg-zinc-50 border border-zinc-200 text-zinc-800 text-sm rounded-xl px-3.5 py-2.5 " +
  "placeholder-zinc-400 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-colors";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function BlacklistCard({
  entry, isPending, removing, onRemove,
}: {
  entry: BlacklistEntry;
  isPending: boolean;
  removing: boolean;
  onRemove: () => void;
}) {
  return (
    <div className="bg-white rounded-2xl border border-red-200 shadow-sm p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0 space-y-0.5">
          {entry.client_email && (
            <p className="font-semibold text-zinc-900 truncate">{entry.client_email}</p>
          )}
          {entry.client_phone && (
            <p className="text-sm text-zinc-500">{entry.client_phone}</p>
          )}
        </div>
        <p className="text-[11px] text-zinc-400 shrink-0">{fmtDate(entry.created_at)}</p>
      </div>

      <p className="text-sm text-zinc-600 mt-3 pt-3 border-t border-zinc-100 leading-relaxed">
        {entry.reason ?? <span className="text-zinc-400">No reason given</span>}
      </p>

      <div className="flex items-center justify-between mt-3">
        <p className="text-xs text-zinc-400">
          Blocked by {entry.blocked_by_email ?? "—"}
        </p>
        <button
          onClick={onRemove}
          disabled={isPending}
          className={`text-xs font-medium transition-colors disabled:opacity-40 ${
            removing ? "text-red-600" : "text-zinc-400 hover:text-red-600"
          }`}
        >
          {removing ? "Confirm remove" : "Remove"}
        </button>
      </div>
    </div>
  );
}

export default function BlacklistManager({
  initialEntries,
}: {
  initialEntries: BlacklistEntry[];
}) {
  const [entries, setEntries]     = useState<BlacklistEntry[]>(initialEntries);
  const [showForm, setShowForm]   = useState(false);
  const [clientEmail, setEmail]   = useState("");
  const [clientPhone, setPhone]   = useState("");
  const [reason, setReason]       = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTrans]   = useTransition();
  const [removing, setRemoving]   = useState<string | null>(null);

  function resetForm() {
    setEmail(""); setPhone(""); setReason(""); setFormError(null);
  }

  function handleAdd() {
    setFormError(null);
    startTrans(async () => {
      const result = await addToBlacklist({ clientEmail, clientPhone, reason });
      if (result.error) { setFormError(result.error); return; }
      // Optimistically show the new entry; server revalidates on next load
      const now = new Date().toISOString();
      setEntries((prev) => [
        {
          id:              crypto.randomUUID(),
          client_email:    clientEmail.trim() || null,
          client_phone:    clientPhone.trim() || null,
          reason:          reason.trim() || null,
          created_at:      now,
          blocked_by_email: null,
        },
        ...prev,
      ]);
      resetForm();
      setShowForm(false);
    });
  }

  function handleRemove(id: string) {
    if (removing !== id) { setRemoving(id); return; }
    startTrans(async () => {
      const result = await removeFromBlacklist(id);
      if (result.error) { setRemoving(null); return; }
      setEntries((prev) => prev.filter((e) => e.id !== id));
      setRemoving(null);
    });
  }

  return (
    <div className="space-y-5">
      {/* Add button */}
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="text-sm font-semibold px-4 py-2.5 rounded-xl border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
        >
          + Block client
        </button>
      )}

      {/* Add form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-5 max-w-md space-y-4">
          <p className="text-sm font-semibold text-zinc-900">Block a client</p>

          <div>
            <label className="text-xs text-zinc-500 block mb-1.5">Email address</label>
            <input
              type="email"
              value={clientEmail}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="client@example.com"
              className={inputCls}
            />
          </div>

          <div>
            <label className="text-xs text-zinc-500 block mb-1.5">Phone number</label>
            <input
              type="tel"
              value={clientPhone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 (555) 000-0000"
              className={inputCls}
            />
            <p className="text-[11px] text-zinc-400 mt-1">
              Provide at least one. Booking is blocked if either matches.
            </p>
          </div>

          <div>
            <label className="text-xs text-zinc-500 block mb-1.5">
              Reason <span className="text-zinc-400">(internal only)</span>
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. No-show twice, aggressive behaviour"
              className={inputCls}
            />
          </div>

          {formError && <p className="text-red-600 text-xs">{formError}</p>}

          <div className="flex gap-3">
            <button
              onClick={handleAdd}
              disabled={isPending || (!clientEmail.trim() && !clientPhone.trim())}
              className="bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white text-sm px-5 py-2.5 rounded-xl font-semibold transition-colors"
            >
              {isPending ? "Blocking…" : "Block client"}
            </button>
            <button
              onClick={() => { resetForm(); setShowForm(false); }}
              className="text-sm text-zinc-500 hover:text-zinc-700 px-4 py-2.5 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {entries.length === 0 ? (
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm px-6 py-16 text-center">
          <p className="text-base font-semibold text-zinc-900 mb-2">No Clients Blocked</p>
          <p className="text-zinc-500 text-sm">Blocked clients are prevented from booking any artist at this studio.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {entries.map((entry) => (
            <BlacklistCard
              key={entry.id}
              entry={entry}
              isPending={isPending}
              removing={removing === entry.id}
              onRemove={() => handleRemove(entry.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
