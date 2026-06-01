"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cancelBooking } from "./actions";

interface Props {
  bookingId: string;
  status: string;
  hasConsent: boolean;
}

export default function BookingActions({ bookingId, status, hasConsent }: Props) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const isCancellable = status !== "cancelled" && status !== "completed";

  function handleCancel() {
    startTransition(async () => {
      const result = await cancelBooking(bookingId);
      if (result.error) {
        setError(result.error);
        setShowConfirm(false);
      } else {
        router.push("/owner/bookings");
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        {hasConsent ? (
          <Link
            href="/dashboard/consent-forms"
            className="text-sm bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-full transition-colors"
          >
            View consent form
          </Link>
        ) : (
          <span className="text-sm text-zinc-500 bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-full">
            No consent form submitted
          </span>
        )}

        {isCancellable && !showConfirm && (
          <button
            onClick={() => setShowConfirm(true)}
            className="text-sm text-red-400 hover:text-red-300 transition-colors"
          >
            Cancel booking
          </button>
        )}

        {isCancellable && showConfirm && (
          <div className="flex items-center gap-3 bg-red-950 border border-red-800 rounded-xl px-4 py-2.5">
            <span className="text-sm text-red-300">Cancel this booking?</span>
            <button
              onClick={handleCancel}
              disabled={isPending}
              className="text-sm font-semibold text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
            >
              {isPending ? "Cancelling…" : "Yes, cancel"}
            </button>
            <button
              onClick={() => setShowConfirm(false)}
              className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Keep it
            </button>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
