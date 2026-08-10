"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Image as ImageIcon, Zap, CalendarClock, Clock, UserPlus, X } from "lucide-react";
import { inviteArtist, resendInvite, cancelInvite, removeArtist, getUpcomingBookingsCount } from "./actions";

export type Artist = {
  id: string;
  user_id: string | null;
  name: string;
  email: string;
  avatar_url: string | null;
  bio: string | null;
  styles: string[];
  minimum_rate_cents: number;
  created_at: string;
  is_active: boolean;
  /** Set only for pending invites (not yet accepted). Used to call cancelInvite/resendInvite correctly. */
  invite_id?: string;
  portfolioCount: number;
  flashCount: number;
  upcomingCount: number;
  activeConsultCount: number;
  availabilitySlots: number;
};

type Status = "active" | "invited" | "removed";

// ─── Helpers ────────────────────────────────────────────────

function artistStatus(a: Artist): Status {
  if (a.invite_id) return "invited";
  if (!a.user_id) return "removed";
  return "active";
}

function sortArtists(list: Artist[]): Artist[] {
  const rank: Record<Status, number> = { active: 0, invited: 1, removed: 2 };
  return [...list].sort((a, b) => {
    const r = rank[artistStatus(a)] - rank[artistStatus(b)];
    if (r !== 0) return r;
    return a.name.localeCompare(b.name);
  });
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// minimum_rate_cents is a floor the owner sets — the artist cannot charge
// below it — not the artist's actual/average rate. The label must say that
// explicitly rather than reading as if it were their rate.
function fmtRate(cents: number) {
  return `$${Math.round(cents / 100)}/hr studio minimum`;
}

const spinnerSvg = (
  <svg className="animate-spin h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);

// ─── Sub-components ──────────────────────────────────────────

function Avatar({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  if (avatarUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={avatarUrl} alt={name} className="w-11 h-11 rounded-full object-cover shrink-0" />;
  }
  return (
    <span className="w-11 h-11 rounded-full bg-gradient-to-br from-violet-500 to-violet-700 text-white text-sm font-semibold flex items-center justify-center shrink-0">
      {initials(name)}
    </span>
  );
}

function StatusBadge({ status }: { status: Status }) {
  if (status === "active") {
    return (
      <span className="text-[11px] font-medium bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full whitespace-nowrap">
        Active
      </span>
    );
  }
  if (status === "invited") {
    return (
      <span className="text-[11px] font-medium bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full whitespace-nowrap">
        Invited
      </span>
    );
  }
  return (
    <span className="text-[11px] font-medium bg-zinc-100 text-zinc-500 px-2.5 py-1 rounded-full whitespace-nowrap">
      Removed
    </span>
  );
}

// Label is always visible text, not just an icon + number — an icon-only
// count is ambiguous (what does "0" next to a camera icon mean?). Each cell
// reads as "<Label> <value>", e.g. "Portfolio 3".
function StatCell({ icon: Icon, value, label }: { icon: typeof ImageIcon; value: number; label: string }) {
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <Icon size={12} className="text-zinc-400 shrink-0" />
      <span className="text-[11px] text-zinc-500 truncate">{label}</span>
      <span className="text-xs font-semibold text-zinc-700 tabular-nums ml-auto">{value}</span>
    </div>
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

  const inputClass = (hasError?: string) =>
    `w-full bg-zinc-50 border rounded-xl px-3.5 py-2.5 text-sm text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-violet-100 transition-colors ${
      hasError ? "border-red-300" : "border-zinc-200 focus:border-violet-400"
    }`;

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div
        className="bg-white border border-zinc-200 shadow-xl rounded-2xl p-6 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-zinc-900">Invite Artist</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 transition-colors">
            <X size={18} />
          </button>
        </div>

        {successEmail ? (
          <div className="py-8 text-center">
            <p className="text-emerald-600 text-sm font-medium">Invite sent to {successEmail} ✓</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
            {errors.form && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
                {errors.form}
              </div>
            )}

            <div>
              <label htmlFor="invite-artist-name" className="text-xs text-zinc-400 block mb-1.5">
                Full Name
              </label>
              <input
                id="invite-artist-name"
                type="text"
                value={name}
                onChange={(e) => { setName(e.target.value); setErrors((v) => ({ ...v, name: undefined })); }}
                placeholder="Jane Smith"
                className={inputClass(errors.name)}
              />
              {errors.name && <p className="text-red-600 text-xs mt-1.5">{errors.name}</p>}
            </div>

            <div>
              <label htmlFor="invite-artist-email" className="text-xs text-zinc-400 block mb-1.5">
                Email
              </label>
              <input
                id="invite-artist-email"
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setErrors((v) => ({ ...v, email: undefined })); }}
                placeholder="jane@studio.com"
                className={inputClass(errors.email)}
              />
              {errors.email && <p className="text-red-600 text-xs mt-1.5">{errors.email}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-1"
            >
              {loading ? <>{spinnerSvg} Sending…</> : "Send Invite"}
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
  const isInvite = !!artist.invite_id;
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div
        className="bg-white border border-zinc-200 shadow-xl rounded-2xl p-6 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-semibold text-zinc-900 mb-4">
          {isInvite ? `Cancel invite for ${artist.name}?` : `Remove ${artist.name}?`}
        </h2>

        {bookingCount === null ? (
          <p className="text-sm text-zinc-500 mb-6">Checking upcoming bookings…</p>
        ) : (
          <>
            {bookingCount > 0 && (
              <div className="bg-amber-50 border border-amber-200 text-amber-700 text-sm rounded-xl px-4 py-3 mb-4">
                This artist has {bookingCount} upcoming booking{bookingCount !== 1 ? "s" : ""}.
              </div>
            )}
            <p className="text-sm text-zinc-500 mb-6">
              {isInvite ? (
                <>Cancel the pending invite to <span className="text-zinc-800 font-medium">{artist.email}</span>?</>
              ) : (
                <>Remove <span className="text-zinc-800 font-medium">{artist.name}</span> from the studio? This revokes their login but keeps their booking history.</>
              )}
            </p>
          </>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 border border-zinc-200 text-zinc-600 text-sm font-medium py-2.5 rounded-xl hover:border-zinc-300 hover:text-zinc-900 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={confirming || bookingCount === null}
            className="flex-1 bg-red-600 text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {confirming ? spinnerSvg : isInvite ? "Cancel Invite" : "Remove"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Artist Card ────────────────────────────────────────────

function ArtistCard({
  artist,
  rowMsg,
  rowLoading,
  onResend,
  onRemove,
}: {
  artist: Artist;
  rowMsg?: string;
  rowLoading?: boolean;
  onResend: (a: Artist) => void;
  onRemove: (a: Artist) => void;
}) {
  const status = artistStatus(artist);

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-5 flex flex-col">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar name={artist.name} avatarUrl={artist.avatar_url} />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-zinc-900 truncate">{artist.name}</p>
            <p className="text-xs text-zinc-400 flex items-center gap-1 truncate">
              <Mail size={11} className="shrink-0" />
              <span className="truncate">{artist.email}</span>
            </p>
          </div>
        </div>
        <StatusBadge status={status} />
      </div>

      {artist.styles.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {artist.styles.slice(0, 4).map((s) => (
            <span key={s} className="text-[11px] font-medium text-violet-700 bg-violet-50 px-2 py-0.5 rounded-full">
              {s}
            </span>
          ))}
        </div>
      )}

      {artist.bio && <p className="text-xs text-zinc-500 leading-relaxed line-clamp-2 mb-3">{artist.bio}</p>}

      {status === "active" && (
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 py-3 border-t border-zinc-100 mb-3">
          <StatCell icon={ImageIcon} value={artist.portfolioCount} label="Portfolio" />
          <StatCell icon={Zap} value={artist.flashCount} label="Flash" />
          <StatCell icon={CalendarClock} value={artist.upcomingCount} label="Upcoming" />
          <StatCell icon={Clock} value={artist.availabilitySlots} label="Availability" />
        </div>
      )}

      <div className="flex items-center justify-between mt-auto pt-3 border-t border-zinc-100">
        <span className="text-[11px] text-zinc-400">
          {status === "invited" ? `Invited ${fmtDate(artist.created_at)}` : status === "removed" ? `Joined ${fmtDate(artist.created_at)}` : fmtRate(artist.minimum_rate_cents)}
        </span>
        <div className="flex items-center gap-3">
          {rowMsg && (
            <span className={`text-[11px] ${rowMsg.includes("✓") ? "text-emerald-600" : "text-amber-600"}`}>
              {rowMsg}
            </span>
          )}
          {status === "invited" && (
            <button
              onClick={() => onResend(artist)}
              disabled={rowLoading}
              className="text-[11px] font-medium text-violet-600 hover:text-violet-700 transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              {rowLoading ? "Sending…" : "Resend"}
            </button>
          )}
          {status !== "removed" && (
            <button
              onClick={() => onRemove(artist)}
              className="text-[11px] font-medium text-zinc-400 hover:text-red-600 transition-colors"
            >
              {status === "invited" ? "Cancel" : "Remove"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────

export default function ArtistsClient({
  artists,
  studioId,
  seatsUsed,
  seatLimit,
}: {
  artists: Artist[];
  studioId: string;
  seatsUsed: number;
  seatLimit: number | null;
}) {
  const router = useRouter();
  const sorted = sortArtists(artists);
  const activeCount = artists.filter((a) => artistStatus(a) === "active").length;

  const [inviteOpen, setInviteOpen] = useState(false);

  const [removeTarget, setRemoveTarget] = useState<Artist | null>(null);
  const [removeBookingCount, setRemoveBookingCount] = useState<number | null>(null);
  const [removeConfirming, setRemoveConfirming] = useState(false);

  const [rowMsg, setRowMsg] = useState<Record<string, string>>({});
  const [rowLoading, setRowLoading] = useState<Record<string, boolean>>({});

  const atSeatLimit = seatLimit !== null && seatsUsed >= seatLimit;

  async function openRemove(artist: Artist) {
    setRemoveTarget(artist);
    setRemoveBookingCount(null);
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

  return (
    <div className="-m-4 -mt-16 md:-m-8 min-h-[calc(100vh-3rem)] md:min-h-screen" style={{ background: "#FAF9FC" }}>
      <div className="p-4 pt-16 md:p-8 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-zinc-900">Artists</h1>
            <p className="text-sm text-zinc-500 mt-1">
              {artists.length} total · {activeCount} active
              {seatLimit !== null && (
                <span className={atSeatLimit ? "text-amber-600 font-medium" : ""}> · {seatsUsed} of {seatLimit} seats used</span>
              )}
            </p>
          </div>
          <button
            onClick={() => setInviteOpen(true)}
            disabled={atSeatLimit}
            title={atSeatLimit ? "Upgrade your plan to invite more artists" : undefined}
            className="bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 shrink-0"
          >
            <UserPlus size={15} />
            Invite Artist
          </button>
        </div>

        {/* Empty state */}
        {artists.length === 0 ? (
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm px-6 py-16 text-center">
            <p className="text-base font-semibold text-zinc-900 mb-2">No Artists Yet</p>
            <p className="text-zinc-500 text-sm mb-6">Invite your first artist to start building your team on InkBook.</p>
            <button
              onClick={() => setInviteOpen(true)}
              className="bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors inline-flex items-center gap-2"
            >
              <UserPlus size={15} />
              Invite Your First Artist
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {sorted.map((artist) => (
              <ArtistCard
                key={artist.id}
                artist={artist}
                rowMsg={rowMsg[artist.id]}
                rowLoading={rowLoading[artist.id]}
                onResend={handleResend}
                onRemove={openRemove}
              />
            ))}
          </div>
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
      </div>
    </div>
  );
}
