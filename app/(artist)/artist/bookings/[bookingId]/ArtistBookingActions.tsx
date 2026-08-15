"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { markArtistBookingCompleted } from "./actions";

interface Props {
  bookingId: string;
  status: string;
  hasConsent: boolean;
}

// Product rule (2026-08-16): artists may mark an eligible session completed,
// but may NOT cancel a booking from the Artist Portal — cancellation stays
// Owner-Portal-only. This component only ever shows for "confirmed" bookings
// (the only status a Mark Completed action or its consent-blocked notice is
// relevant for) — every other status renders nothing.
export default function ArtistBookingActions({ bookingId, status, hasConsent }: Props) {
  const [isPending, startTransition] = useTransition();
  const [completeError, setCompleteError] = useState<string | null>(null);
  const router = useRouter();

  // Mirrors markCompleted()'s own server-side guard (app/(owner)/owner/bookings/[bookingId]/actions.ts).
  const canMarkCompleted = status === "confirmed" && hasConsent;

  function handleMarkCompleted() {
    setCompleteError(null);
    startTransition(async () => {
      const result = await markArtistBookingCompleted(bookingId);
      if (result.error) { setCompleteError(result.error); return; }
      router.refresh();
    });
  }

  if (status !== "confirmed") return null;

  return (
    <div className="bg-white border border-zinc-200 shadow-sm rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-zinc-100">
        <p className="text-[10px] uppercase tracking-widest text-zinc-400">Actions</p>
      </div>
      <div className="px-5 py-4 space-y-3">
        {!hasConsent && (
          <p className="text-xs text-amber-700">
            Consent form must be signed before this session can be marked completed.
          </p>
        )}

        {canMarkCompleted && (
          <div className="space-y-1.5">
            <button
              onClick={handleMarkCompleted}
              disabled={isPending}
              className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isPending ? "Saving…" : "Mark Session Completed"}
            </button>
            {completeError && <p className="text-red-600 text-xs">{completeError}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
