"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { acceptQuote, continueToDeposit, askQuoteQuestion } from "./actions";

interface Props {
  projectId: string;
  studioSlug: string;
  brandColor: string;
  textOnBrand: string;
  initialAcceptedAt: string | null;
  initialDepositPaidAt: string | null;
  initialBookingStatus: string | null;
  initialNotice: string | null;
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function QuoteActions({
  projectId,
  studioSlug,
  brandColor,
  textOnBrand,
  initialAcceptedAt,
  initialDepositPaidAt,
  initialBookingStatus,
  initialNotice,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [notice, setNotice] = useState<string | null>(initialNotice);
  const [acceptedAt, setAcceptedAt] = useState(initialAcceptedAt);

  const depositPaid = Boolean(initialDepositPaidAt);
  const bookingConfirmed = initialBookingStatus === "confirmed" || initialBookingStatus === "completed";

  function handleAccept() {
    setNotice(null);
    startTransition(async () => {
      const result = await acceptQuote(projectId);
      if (result.error) { setNotice(result.error); return; }
      if (result.acceptedAt) {
        setAcceptedAt(result.acceptedAt);
        // Re-fetch server data so the Timeline above (a separate server
        // component fed by lib/client-portal/projects.ts) picks up the new
        // quote_accepted_at without a full page reload.
        router.refresh();
      }
    });
  }

  function handleContinue() {
    setNotice(null);
    startTransition(async () => {
      const result = await continueToDeposit(projectId);
      if (result.error) { setNotice(result.error); return; }
      if (result.checkoutUrl) window.location.href = result.checkoutUrl;
    });
  }

  function handleAsk() {
    setNotice(null);
    startTransition(async () => {
      const result = await askQuoteQuestion(projectId);
      if (result.error || !result.threadId) {
        setNotice(result.error ?? "Failed to open conversation.");
        return;
      }
      router.push(`/portal/${studioSlug}/messages/${result.threadId}`);
    });
  }

  return (
    <div className="mt-5 pt-5 border-t border-white/[0.06]">
      {bookingConfirmed ? (
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400 mb-3">✓ Booking Confirmed</p>
      ) : depositPaid ? (
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400 mb-3">
          ✓ Deposit Paid{" "}
          <span className="text-zinc-600 normal-case font-normal">on {fmtDateTime(initialDepositPaidAt!)}</span>
        </p>
      ) : acceptedAt ? (
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400 mb-3">
          ✓ Quote Accepted <span className="text-zinc-600 normal-case font-normal">on {fmtDateTime(acceptedAt)}</span>
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        {depositPaid ? (
          !bookingConfirmed && (
            <span
              aria-disabled="true"
              className="text-[10px] uppercase tracking-widest font-semibold px-5 py-2.5 border border-white/[0.15] text-zinc-500 cursor-default"
            >
              Waiting for Booking Confirmation
            </span>
          )
        ) : acceptedAt ? (
          <button
            type="button"
            onClick={handleContinue}
            disabled={isPending}
            className="text-[10px] uppercase tracking-widest font-semibold px-5 py-2.5 transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: brandColor, color: textOnBrand }}
          >
            {isPending ? "Working…" : "Continue to Deposit"}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleAccept}
            disabled={isPending}
            className="text-[10px] uppercase tracking-widest font-semibold px-5 py-2.5 transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: brandColor, color: textOnBrand }}
          >
            {isPending ? "Working…" : "Accept Quote"}
          </button>
        )}

        <button
          type="button"
          onClick={handleAsk}
          disabled={isPending}
          className="text-[10px] uppercase tracking-widest font-semibold px-5 py-2.5 border border-white/[0.15] text-zinc-300 hover:border-white/30 hover:text-white transition-colors disabled:opacity-50"
        >
          Ask a Question
        </button>
      </div>

      {notice && <p className="text-xs text-zinc-500 mt-3">{notice}</p>}
    </div>
  );
}
