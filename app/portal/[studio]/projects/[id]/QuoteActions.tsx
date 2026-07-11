"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { acceptQuote, continueToDeposit, askQuoteQuestion } from "./actions";

interface Props {
  projectId: string;
  brandColor: string;
  textOnBrand: string;
  initialAcceptedAt: string | null;
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function QuoteActions({ projectId, brandColor, textOnBrand, initialAcceptedAt }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [notice, setNotice] = useState<string | null>(null);
  const [acceptedAt, setAcceptedAt] = useState(initialAcceptedAt);

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
      setNotice(result.error ?? null);
    });
  }

  function handleAsk() {
    setNotice(null);
    startTransition(async () => {
      const result = await askQuoteQuestion(projectId);
      setNotice(result.error ?? "Message sent.");
    });
  }

  return (
    <div className="mt-5 pt-5 border-t border-white/[0.06]">
      {acceptedAt && (
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400 mb-3">
          ✓ Quote Accepted <span className="text-zinc-600 normal-case font-normal">on {fmtDateTime(acceptedAt)}</span>
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        {acceptedAt ? (
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
