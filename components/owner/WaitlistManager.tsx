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
    <tr className="border-b border-zinc-800/60 last:border-0">
      <td className="px-6 py-4 text-zinc-200">{artist.name}</td>
      <td className="px-6 py-4">
        <span className={`text-sm ${atCap ? "text-red-400 font-semibold" : "text-zinc-400"}`}>
          {artist.bookingsThisMonth} / {artist.monthlyBookingCap}
        </span>
        {atCap && (
          <span className="ml-2 text-[9px] uppercase tracking-widest text-red-500/70">At capacity</span>
        )}
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            value={cap}
            onChange={(e) => setCap(e.target.value)}
            className="w-20 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-zinc-600"
          />
          {dirty && (
            <button
              onClick={handleSave}
              disabled={isPending}
              className="text-xs text-[#c9a84c] hover:text-[#e0bd63] transition-colors disabled:opacity-40"
            >
              {isPending ? "Saving…" : "Save"}
            </button>
          )}
          {saved && <span className="text-xs text-emerald-400">✓ Saved</span>}
        </div>
        {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
      </td>
    </tr>
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
      <div>
        <p className="text-xs uppercase tracking-widest text-zinc-500 mb-3">Monthly booking cap per artist</p>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          {initialArtists.length === 0 ? (
            <p className="px-6 py-8 text-sm text-zinc-500 text-center">No active artists yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  {["Artist", "Booked this month", "Cap", ""].map((h) => (
                    <th key={h} className="text-left text-zinc-500 text-[10px] uppercase tracking-widest font-medium px-6 py-3.5">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {initialArtists.map((artist) => (
                  <ArtistCapRowView key={artist.id} artist={artist} />
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div>
        <p className="text-xs uppercase tracking-widest text-zinc-500 mb-3">Waitlist entries</p>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          {entries.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-zinc-500 text-sm">No clients on the waitlist.</p>
              <p className="text-zinc-700 text-xs mt-1">
                Clients are added here automatically when they hit an artist&apos;s monthly cap while booking.
              </p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  {["Client", "Artist", "Style", "Notes", "Status", "Added", ""].map((h) => (
                    <th key={h} className="text-left text-zinc-500 text-[10px] uppercase tracking-widest font-medium px-6 py-3.5">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, i) => (
                  <tr key={entry.id} className={i < entries.length - 1 ? "border-b border-zinc-800/60" : ""}>
                    <td className="px-6 py-4 text-zinc-200">{entry.clientName}</td>
                    <td className="px-6 py-4 text-zinc-400">{entry.artistName}</td>
                    <td className="px-6 py-4 text-zinc-400 text-xs">{entry.preferredStyle ?? "—"}</td>
                    <td className="px-6 py-4 text-zinc-500 text-xs max-w-xs truncate">{entry.notes ?? "—"}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full border ${
                          entry.notified
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "bg-zinc-800 text-zinc-500 border-zinc-700"
                        }`}
                      >
                        {entry.notified ? "Notified" : "Waiting"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-zinc-500 text-xs whitespace-nowrap">{fmtDate(entry.addedAt)}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleRemove(entry.id)}
                        disabled={isPending}
                        className={`text-xs transition-colors disabled:opacity-40 ${
                          removing === entry.id ? "text-red-400 font-semibold" : "text-zinc-600 hover:text-red-400"
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
    </div>
  );
}
