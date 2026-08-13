"use client";

import { useState, useTransition } from "react";
import {
  updateMonthlyCap,
  removeFromWaitlist,
  type ArtistCapRow,
  type WaitlistEntry,
} from "@/app/(owner)/owner/waitlist/actions";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function ArtistCapRowView({ artist }: { artist: ArtistCapRow }) {
  const [cap, setCap] = useState(String(artist.monthlyBookingCap));
  const [isPending, startTrans] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = cap !== String(artist.monthlyBookingCap);
  const atCap = artist.bookingsThisMonth >= artist.monthlyBookingCap;

  function handleSave() {
    setError(null);
    const parsed = parseInt(cap, 10);
    startTrans(async () => {
      const result = await updateMonthlyCap(artist.id, parsed);
      if (result.error) { setError(result.error); return; }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  return (
    <tr className="border-b border-zinc-50 last:border-0">
      <td className="py-3 pr-4 text-sm font-medium text-zinc-900">{artist.name}</td>
      <td className="py-3 px-4">
        <span className={`text-sm tabular-nums ${atCap ? "text-red-600 font-semibold" : "text-zinc-500"}`}>
          {artist.bookingsThisMonth} / {artist.monthlyBookingCap}
        </span>
        {atCap && (
          <span className="ml-2 text-[10px] font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">At capacity</span>
        )}
      </td>
      <td className="py-3 pl-4">
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            value={cap}
            onChange={(e) => setCap(e.target.value)}
            className="w-20 bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-1.5 text-sm text-zinc-800 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-colors"
          />
          {dirty && (
            <button
              onClick={handleSave}
              disabled={isPending}
              className="text-xs font-medium text-violet-600 hover:text-violet-700 transition-colors disabled:opacity-40"
            >
              {isPending ? "Saving…" : "Save"}
            </button>
          )}
          {saved && <span className="text-xs text-emerald-600">✓ Saved</span>}
        </div>
        {error && <p className="text-red-600 text-xs mt-1">{error}</p>}
      </td>
    </tr>
  );
}

function WaitlistCard({
  entry, isPending, removing, onRemove,
}: {
  entry: WaitlistEntry;
  isPending: boolean;
  removing: boolean;
  onRemove: () => void;
}) {
  return (
    <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-zinc-900">{entry.clientName}</p>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                entry.notified ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-500"
              }`}
            >
              {entry.notified ? "Notified" : "Waiting"}
            </span>
          </div>
          <p className="text-sm text-zinc-500 mt-0.5">
            {entry.artistName}
            {entry.preferredStyle && ` · ${entry.preferredStyle}`}
          </p>
        </div>
        <p className="text-[11px] text-zinc-400 shrink-0">Added {fmtDate(entry.addedAt)}</p>
      </div>

      {entry.notes && (
        <p className="text-sm text-zinc-500 mt-3 pt-3 border-t border-zinc-100 leading-relaxed">
          {entry.notes}
        </p>
      )}

      <div className="flex items-center justify-end mt-3">
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

export default function WaitlistManager({
  initialArtists,
  initialEntries,
}: {
  initialArtists: ArtistCapRow[];
  initialEntries: WaitlistEntry[];
}) {
  const [entries, setEntries] = useState<WaitlistEntry[]>(initialEntries);
  const [isPending, startTrans] = useTransition();
  const [removing, setRemoving] = useState<string | null>(null);

  function handleRemove(id: string) {
    if (removing !== id) { setRemoving(id); return; }
    startTrans(async () => {
      const result = await removeFromWaitlist(id);
      if (result.error) { setRemoving(null); return; }
      setEntries((prev) => prev.filter((e) => e.id !== id));
      setRemoving(null);
    });
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-zinc-900">Monthly booking cap per artist</h2>
        </div>
        {initialArtists.length === 0 ? (
          <p className="text-sm text-zinc-500 text-center py-4">No active artists yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 text-zinc-400 text-xs uppercase tracking-wider">
                  <th className="text-left font-medium py-2.5 pr-4">Artist</th>
                  <th className="text-left font-medium py-2.5 px-4">Booked this month</th>
                  <th className="text-left font-medium py-2.5 pl-4">Cap</th>
                </tr>
              </thead>
              <tbody>
                {initialArtists.map((artist) => (
                  <ArtistCapRowView key={artist.id} artist={artist} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div>
        <p className="text-sm text-zinc-500 mb-3">
          Waitlist entries {entries.length > 0 && `(${entries.length})`}
        </p>
        {entries.length === 0 ? (
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm px-6 py-16 text-center">
            <p className="text-base font-semibold text-zinc-900 mb-2">No Clients on the Waitlist</p>
            <p className="text-zinc-500 text-sm">Clients are added here automatically when they hit an artist&apos;s monthly cap while booking.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {entries.map((entry) => (
              <WaitlistCard
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
    </div>
  );
}
