"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { inviteArtist, resendInvite, cancelInvite, removeArtist, getUpcomingBookingsCount } from "./actions";

export type Artist = {
  id: string;
  user_id: string | null;
  name: string;
  email: string;
  created_at: string;
  is_active: boolean;
  /** Set only for pending invites (not yet accepted). Used to call cancelInvite/resendInvite correctly. */
  invite_id?: string;
};

// ─── Helpers ────────────────────────────────────────────────

function sortArtists(list: Artist[]): Artist[] {
  return [...list].sort((a, b) => {
    if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const spinnerSvg = (
  <svg className="animate-spin h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);

// ─── Sub-components ──────────────────────────────────────────

function Avatar({ name }: { name: string }) {
  return (
    <div className="w-9 h-9 rounded-full bg-[#c9a84c]/15 border border-[#c9a84c]/25 flex items-center justify-center shrink-0">
      <span className="text-[#c9a84c] text-sm font-semibold">
        {name.trim()[0]?.toUpperCase() ?? "?"}
      </span>
    </div>
  );
}

function StatusBadge({ artist }: { artist: Artist }) {
  return artist.is_active ? (
    <span className="text-xs bg-green-500/10 text-green-400 border border-green-500/20 px-2.5 py-1 rounded-full whitespace-nowrap">
      Active
    </span>
  ) : (
    <span className="text-xs bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-2.5 py-1 rounded-full whitespace-nowrap">
      Invited
    </span>
  );
}

// ─── Invite Modal ─────────────────────────────────────────────

type InviteModalProps = {
  studioId: string;
  onClose: () => void;
  onSuccess: () => void;
};

function InviteModal({ studioId, onClose, onSuccess }: InviteModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<{ name?: string; email?: string; form?: string }>({});
  const [loading, setLoading] = useState(false);
  const [successEmail, setSuccessEmail] = useState<string | null>(null);

  function validate() {
    const errs: typeof errors = {};
    if (name.trim().length < 2) errs.name = "Name must be at least 2 characters.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      errs.email = "Enter a valid email address.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setErrors({});

    const result = await inviteArtist({ name: name.trim(), email: email.trim(), studioId });

    if (result.error) {
      const isEmailMsg =
        result.error.includes("invited") ||
        result.error.includes("active") ||
        result.error.includes("Email");
      setErrors(isEmailMsg ? { email: result.error } : { form: result.error });
      setLoading(false);
      return;
    }

    setSuccessEmail(email.trim());
    onSuccess();
    setTimeout(onClose, 2000);
  }

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4"
      onClick={onClose}
    >
      <div
        className="bg-[#111] border border-[#1E1E1E] rounded-2xl p-8 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-[#E8E8E8]">Invite Artist</h2>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {successEmail ? (
          <div className="py-8 text-center">
            <p className="text-green-400 text-sm">Invite sent to {successEmail} ✓</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
            {errors.form && (
              <div className="bg-red-950 border border-red-800 text-red-300 text-sm rounded-lg px-4 py-3">
                {errors.form}
              </div>
            )}

            <div>
              <label htmlFor="invite-artist-name" className="text-sm text-zinc-400 block mb-1.5">
                Full Name <span className="text-[#c9a84c]">*</span>
              </label>
              <input
                id="invite-artist-name"
                type="text"
                value={name}
                onChange={(e) => { setName(e.target.value); setErrors((v) => ({ ...v, name: undefined })); }}
                placeholder="Jane Smith"
                className={`w-full bg-[#0A0A0A] border rounded-lg px-4 py-2.5 text-sm text-[#E8E8E8] focus:outline-none transition-colors placeholder:text-zinc-600 ${errors.name ? "border-red-700" : "border-[#2A2A2A] focus:border-[#c9a84c]"}`}
              />
              {errors.name && <p className="text-red-400 text-xs mt-1.5">{errors.name}</p>}
            </div>

            <div>
              <label htmlFor="invite-artist-email" className="text-sm text-zinc-400 block mb-1.5">
                Email <span className="text-[#c9a84c]">*</span>
              </label>
              <input
                id="invite-artist-email"
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setErrors((v) => ({ ...v, email: undefined })); }}
                placeholder="jane@studio.com"
                className={`w-full bg-[#0A0A0A] border rounded-lg px-4 py-2.5 text-sm text-[#E8E8E8] focus:outline-none transition-colors placeholder:text-zinc-600 ${errors.email ? "border-red-700" : "border-[#2A2A2A] focus:border-[#c9a84c]"}`}
              />
              {errors.email && <p className="text-red-400 text-xs mt-1.5">{errors.email}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#c9a84c] text-black font-bold py-2.5 rounded-lg hover:bg-[#a8832e] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-1"
            >
              {loading ? <>{spinnerSvg} Sending…</> : "Send Invite →"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── Remove Confirmation Modal ────────────────────────────────

type RemoveModalProps = {
  artist: Artist;
  bookingCount: number | null;
  confirming: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

function RemoveModal({ artist, bookingCount, confirming, onClose, onConfirm }: RemoveModalProps) {
  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4"
      onClick={onClose}
    >
      <div
        className="bg-[#111] border border-[#1E1E1E] rounded-2xl p-8 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-[#E8E8E8] mb-4">
          Remove {artist.name}?
        </h2>

        {bookingCount === null ? (
          <p className="text-sm text-zinc-500 mb-6">Checking upcoming bookings…</p>
        ) : (
          <>
            {bookingCount > 0 && (
              <div className="bg-yellow-950 border border-yellow-800 text-yellow-300 text-sm rounded-lg px-4 py-3 mb-4">
                This artist has {bookingCount} upcoming booking
                {bookingCount !== 1 ? "s" : ""}.
              </div>
            )}
            <p className="text-sm text-zinc-400 mb-6">
              Remove <span className="text-[#E8E8E8]">{artist.name}</span> from studio? This
              cannot be undone.
            </p>
          </>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 border border-[#2A2A2A] text-zinc-300 text-sm py-2.5 rounded-lg hover:border-zinc-600 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={confirming || bookingCount === null}
            className="flex-1 bg-red-600 text-white text-sm font-semibold py-2.5 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {confirming ? spinnerSvg : "Remove"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────

export default function ArtistsClient({
  artists,
  studioId,
}: {
  artists: Artist[];
  studioId: string;
}) {
  const router = useRouter();
  const sorted = sortArtists(artists);

  const [inviteOpen, setInviteOpen] = useState(false);

  // Remove flow
  const [removeTarget, setRemoveTarget] = useState<Artist | null>(null);
  const [removeBookingCount, setRemoveBookingCount] = useState<number | null>(null);
  const [removeConfirming, setRemoveConfirming] = useState(false);

  // Per-row feedback (resend)
  const [rowMsg, setRowMsg] = useState<Record<string, string>>({});
  const [rowLoading, setRowLoading] = useState<Record<string, boolean>>({});

  async function openRemove(artist: Artist) {
    setRemoveTarget(artist);
    setRemoveBookingCount(null);
    // Pending invites have no bookings — skip the async check
    if (artist.invite_id) {
      setRemoveBookingCount(0);
    } else {
      const count = await getUpcomingBookingsCount(artist.id);
      setRemoveBookingCount(count);
    }
  }

  async function confirmRemove() {
    if (!removeTarget) return;
    setRemoveConfirming(true);
    // Pending invite → cancel the invite row; active artist → deactivate
    const result = removeTarget.invite_id
      ? await cancelInvite(removeTarget.invite_id)
      : await removeArtist(removeTarget.id);
    setRemoveConfirming(false);
    if (!result.error) {
      setRemoveTarget(null);
      router.refresh();
    }
  }

  async function handleResend(artist: Artist) {
    setRowLoading((p) => ({ ...p, [artist.id]: true }));
    const result = await resendInvite({
      inviteId: artist.invite_id ?? artist.id,
      email: artist.email,
    });
    setRowLoading((p) => ({ ...p, [artist.id]: false }));
    const msg = result.error ?? "Invite resent ✓";
    setRowMsg((p) => ({ ...p, [artist.id]: msg }));
    setTimeout(
      () => setRowMsg((p) => { const n = { ...p }; delete n[artist.id]; return n; }),
      3000
    );
    if (!result.error) router.refresh();
  }

  const rowActions = (artist: Artist) => (
    <div className="flex items-center gap-3 justify-end">
      {rowMsg[artist.id] && (
        <span
          className={`text-xs ${rowMsg[artist.id].includes("✓") ? "text-green-400" : "text-yellow-400"}`}
        >
          {rowMsg[artist.id]}
        </span>
      )}
      {!artist.is_active && (
        <button
          onClick={() => handleResend(artist)}
          disabled={!!rowLoading[artist.id]}
          className="text-xs text-zinc-400 hover:text-[#c9a84c] transition-colors disabled:opacity-50 whitespace-nowrap"
        >
          {rowLoading[artist.id] ? "Sending…" : "Resend Invite"}
        </button>
      )}
      <button
        onClick={() => openRemove(artist)}
        className="text-xs text-zinc-500 hover:text-red-400 transition-colors"
      >
        Remove
      </button>
    </div>
  );

  return (
    <>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-[#E8E8E8]">Your Artists</h1>
          <span className="text-xs bg-[#c9a84c]/10 text-[#c9a84c] border border-[#c9a84c]/20 rounded-full px-2.5 py-1">
            {artists.length}
          </span>
        </div>
        <button
          onClick={() => setInviteOpen(true)}
          className="bg-[#c9a84c] text-black text-sm font-bold px-4 py-2 rounded-lg hover:bg-[#a8832e] transition-colors"
        >
          + Invite Artist
        </button>
      </div>

      {/* Empty state */}
      {artists.length === 0 ? (
        <div className="bg-[#111] border border-[#1E1E1E] rounded-xl px-6 py-16 text-center">
          <p className="text-zinc-500 text-sm mb-3">No artists yet.</p>
          <button
            onClick={() => setInviteOpen(true)}
            className="text-[#c9a84c] text-sm hover:underline"
          >
            Invite your first artist →
          </button>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-[#111] border border-[#1E1E1E] rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1E1E1E] text-zinc-500 text-xs uppercase tracking-wider">
                  <th className="text-left px-5 py-3.5 font-medium">Artist</th>
                  <th className="text-left px-5 py-3.5 font-medium">Email</th>
                  <th className="text-left px-5 py-3.5 font-medium">Status</th>
                  <th className="text-left px-5 py-3.5 font-medium">Joined</th>
                  <th className="px-5 py-3.5" />
                </tr>
              </thead>
              <tbody>
                {sorted.map((artist) => (
                  <tr
                    key={artist.id}
                    className="border-b border-[#161616] last:border-0 hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={artist.name} />
                        <span className="font-medium text-[#E8E8E8]">{artist.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-zinc-400">{artist.email}</td>
                    <td className="px-5 py-4">
                      <StatusBadge artist={artist} />
                    </td>
                    <td className="px-5 py-4 text-zinc-500 text-xs">{fmtDate(artist.created_at)}</td>
                    <td className="px-5 py-4">{rowActions(artist)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile card stack */}
          <div className="flex flex-col gap-3 md:hidden">
            {sorted.map((artist) => (
              <div key={artist.id} className="bg-[#111] border border-[#1E1E1E] rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Avatar name={artist.name} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[#E8E8E8] text-sm truncate">{artist.name}</p>
                    <p className="text-xs text-zinc-500 truncate">{artist.email}</p>
                  </div>
                  <StatusBadge artist={artist} />
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-[#1A1A1A]">
                  <span className="text-xs text-zinc-600">{fmtDate(artist.created_at)}</span>
                  {rowActions(artist)}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Modals */}
      {inviteOpen && (
        <InviteModal
          studioId={studioId}
          onClose={() => setInviteOpen(false)}
          onSuccess={() => router.refresh()}
        />
      )}

      {removeTarget && (
        <RemoveModal
          artist={removeTarget}
          bookingCount={removeBookingCount}
          confirming={removeConfirming}
          onClose={() => setRemoveTarget(null)}
          onConfirm={confirmRemove}
        />
      )}
    </>
  );
}
