"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { continueToDeposit, askQuoteQuestion, payRemainderBalance } from "../../projects/[id]/actions";

interface Props {
  bookingId: string;
  consultationId: string;
  studioSlug: string;
  status: string;
  depositPaid: boolean;
  hasConsentForm: boolean;
  balanceDueCents: number | null;
  remainderCollected: boolean;
  hasReview: boolean;
  brandColor: string;
  textOnBrand: string;
}

// Both actions here are 100% reused from the Projects feature, unchanged —
// see the "My Bookings" plan's §2/§8. continueToDeposit()'s Stripe success/
// cancel redirect always lands back on the Project page (not this one, since
// that action's return URL wasn't changed), so after paying the client next
// sees this booking's updated status on their next visit here rather than an
// immediate redirect back — consistent with this feature's no-realtime scope.
export default function BookingDetailActions({
  bookingId,
  consultationId,
  studioSlug,
  status,
  depositPaid,
  hasConsentForm,
  balanceDueCents,
  remainderCollected,
  hasReview,
  brandColor,
  textOnBrand,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [notice, setNotice] = useState<string | null>(null);

  const canPayRemainder =
    (status === "confirmed" || status === "completed") &&
    balanceDueCents !== null && balanceDueCents > 0 && !remainderCollected;

  function handlePayDeposit() {
    setNotice(null);
    startTransition(async () => {
      const result = await continueToDeposit(consultationId);
      if (result.error || !result.checkoutUrl) {
        setNotice(result.error ?? "Failed to start checkout.");
        return;
      }
      window.location.href = result.checkoutUrl;
    });
  }

  function handlePayRemainder() {
    setNotice(null);
    startTransition(async () => {
      const result = await payRemainderBalance(bookingId);
      if (result.error || !result.checkoutUrl) {
        setNotice(result.error ?? "Failed to start checkout.");
        return;
      }
      window.location.href = result.checkoutUrl;
    });
  }

  function handleMessage() {
    setNotice(null);
    startTransition(async () => {
      const result = await askQuoteQuestion(consultationId);
      if (result.error || !result.threadId) {
        setNotice(result.error ?? "Failed to open conversation.");
        return;
      }
      router.push(`/portal/${studioSlug}/messages/${result.threadId}`);
    });
  }

  return (
    <div className="mt-5 pt-5 border-t border-zinc-100">
      <div className="flex flex-wrap gap-3">
        {status === "pending_deposit" && (
          <button
            type="button"
            onClick={handlePayDeposit}
            disabled={isPending}
            className="text-[10px] uppercase tracking-widest font-semibold px-5 py-2.5 rounded-lg transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: brandColor, color: textOnBrand }}
          >
            {isPending ? "Working…" : "Pay Deposit Now"}
          </button>
        )}

        {depositPaid && !hasConsentForm && (status === "awaiting_schedule" || status === "confirmed") && (
          <Link
            href={`/portal/${studioSlug}/projects/${consultationId}/consent`}
            className="text-[10px] uppercase tracking-widest font-semibold px-5 py-2.5 rounded-lg transition-opacity hover:opacity-90"
            style={{ backgroundColor: brandColor, color: textOnBrand }}
          >
            Sign Consent Form
          </Link>
        )}

        {canPayRemainder && (
          <button
            type="button"
            onClick={handlePayRemainder}
            disabled={isPending}
            className="text-[10px] uppercase tracking-widest font-semibold px-5 py-2.5 rounded-lg transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: brandColor, color: textOnBrand }}
          >
            {isPending ? "Working…" : "Pay Remaining Balance"}
          </button>
        )}

        {status === "completed" && !hasReview && (
          <Link
            href={`/portal/${studioSlug}/bookings/${bookingId}/review`}
            className="text-[10px] uppercase tracking-widest font-semibold px-5 py-2.5 rounded-lg transition-opacity hover:opacity-90"
            style={{ backgroundColor: brandColor, color: textOnBrand }}
          >
            Leave a Review
          </Link>
        )}

        <button
          type="button"
          onClick={handleMessage}
          disabled={isPending}
          className="text-[10px] uppercase tracking-widest font-semibold px-5 py-2.5 rounded-lg border border-zinc-300 text-zinc-600 hover:border-zinc-400 hover:text-zinc-900 hover:bg-zinc-50 transition-colors disabled:opacity-50"
        >
          Message About This Booking
        </button>
      </div>

      {notice && <p className="text-xs text-zinc-500 mt-3">{notice}</p>}
    </div>
  );
}
