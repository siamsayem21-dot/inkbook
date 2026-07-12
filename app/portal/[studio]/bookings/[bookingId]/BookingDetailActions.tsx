"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { continueToDeposit, askQuoteQuestion } from "../../projects/[id]/actions";

interface Props {
  consultationId: string;
  studioSlug: string;
  status: string;
  brandColor: string;
  textOnBrand: string;
}

// Both actions here are 100% reused from the Projects feature, unchanged —
// see the "My Bookings" plan's §2/§8. continueToDeposit()'s Stripe success/
// cancel redirect always lands back on the Project page (not this one, since
// that action's return URL wasn't changed), so after paying the client next
// sees this booking's updated status on their next visit here rather than an
// immediate redirect back — consistent with this feature's no-realtime scope.
export default function BookingDetailActions({ consultationId, studioSlug, status, brandColor, textOnBrand }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [notice, setNotice] = useState<string | null>(null);

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
    <div className="mt-5 pt-5 border-t border-white/[0.06]">
      <div className="flex flex-wrap gap-3">
        {status === "pending_deposit" && (
          <button
            type="button"
            onClick={handlePayDeposit}
            disabled={isPending}
            className="text-[10px] uppercase tracking-widest font-semibold px-5 py-2.5 transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: brandColor, color: textOnBrand }}
          >
            {isPending ? "Working…" : "Pay Deposit Now"}
          </button>
        )}

        <button
          type="button"
          onClick={handleMessage}
          disabled={isPending}
          className="text-[10px] uppercase tracking-widest font-semibold px-5 py-2.5 border border-white/[0.15] text-zinc-300 hover:border-white/30 hover:text-white transition-colors disabled:opacity-50"
        >
          Message About This Booking
        </button>
      </div>

      {notice && <p className="text-xs text-zinc-500 mt-3">{notice}</p>}
    </div>
  );
}
