"use client";

import { useState, useTransition } from "react";
import { addToBlacklist, removeFromBlacklist, type BlacklistEntry } from "@/app/(owner)/owner/blacklist/actions";

const inputCls =
  "w-full bg-zinc-900 border border-zinc-800 text-white text-sm rounded-lg px-4 py-2.5 " +
  "placeholder-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
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
          className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-2 rounded-full hover:bg-red-500/20 transition-colors"
        >
          + Block client
        </button>
      )}

      {/* Add form */}
      {showForm && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 max-w-md space-y-4">
          <p className="text-sm font-semibold text-zinc-200">Block a client</p>

          <div>
            <label className="text-xs uppercase tracking-widest text-zinc-500 block mb-1.5">
              Email address
            </label>
            <input
              type="email"
              value={clientEmail}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="client@example.com"
              className={inputCls}
            />
          </div>

          <div>
            <label className="text-xs uppercase tracking-widest text-zinc-500 block mb-1.5">
              Phone number
            </label>
            <input
              type="tel"
              value={clientPhone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 (555) 000-0000"
              className={inputCls}
            />
            <p className="text-[10px] text-zinc-600 mt-1">
              Provide at least one. Booking is blocked if either matches.
            </p>
          </div>

          <div>
            <label className="text-xs uppercase tracking-widest text-zinc-500 block mb-1.5">
              Reason <span className="normal-case text-zinc-600">(internal only)</span>
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. No-show twice, aggressive behaviour"
              className={inputCls}
            />
          </div>

          {formError && (
            <p className="text-red-400 text-xs">{formError}</p>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleAdd}
              disabled={isPending || (!clientEmail.trim() && !clientPhone.trim())}
              className="bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white text-sm px-5 py-2 rounded-full font-semibold transition-colors"
            >
              {isPending ? "Blocking…" : "Block client"}
            </button>
            <button
              onClick={() => { resetForm(); setShowForm(false); }}
              className="text-sm text-zinc-400 hover:text-white px-4 py-2 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        {entries.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-zinc-500 text-sm">No clients blocked.</p>
            <p className="text-zinc-700 text-xs mt-1">
              Blocked clients are prevented from booking any artist at this studio.
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                {["Client", "Blocked by", "Date", "Reason", ""].map((h) => (
                  <th
                    key={h}
                    className="text-left text-zinc-500 text-[10px] uppercase tracking-widest font-medium px-6 py-3.5"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, i) => (
                <tr
                  key={entry.id}
                  className={i < entries.length - 1 ? "border-b border-zinc-800/60" : ""}
                >
                  <td className="px-6 py-4">
                    <div className="space-y-0.5">
                      {entry.client_email && (
                        <p className="text-zinc-200 text-sm">{entry.client_email}</p>
                      )}
                      {entry.client_phone && (
                        <p className="text-zinc-400 text-xs">{entry.client_phone}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-zinc-500 text-xs">
                    {entry.blocked_by_email ?? "—"}
                  </td>
                  <td className="px-6 py-4 text-zinc-500 text-xs whitespace-nowrap">
                    {fmtDate(entry.created_at)}
                  </td>
                  <td className="px-6 py-4 text-zinc-400 text-xs max-w-xs truncate">
                    {entry.reason ?? <span className="text-zinc-700">No reason given</span>}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleRemove(entry.id)}
                      disabled={isPending}
                      className={`text-xs transition-colors disabled:opacity-40 ${
                        removing === entry.id
                          ? "text-red-400 font-semibold"
                          : "text-zinc-600 hover:text-red-400"
                      }`}
                    >
                      {removing === entry.id ? "Confirm remove" : "Remove"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
