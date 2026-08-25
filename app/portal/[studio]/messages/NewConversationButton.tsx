"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { startGeneralThread } from "./actions";

interface Props {
  studioId: string;
  studioSlug: string;
  brandColor: string;
  textOnBrand: string;
}

export default function NewConversationButton({ studioId, studioSlug, brandColor, textOnBrand }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await startGeneralThread(studioId);
      if (result.error || !result.threadId) {
        setError(result.error ?? "Failed to start conversation.");
        return;
      }
      router.push(`/portal/${studioSlug}/messages/${result.threadId}`);
    });
  }

  return (
    <div className="shrink-0">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="text-[10px] uppercase tracking-widest font-semibold px-5 py-2.5 rounded-lg transition-opacity hover:opacity-90 disabled:opacity-50"
        style={{ backgroundColor: brandColor, color: textOnBrand }}
      >
        {isPending ? "Starting…" : "New Conversation"}
      </button>
      {error && <p className="text-xs text-red-600 mt-1.5">{error}</p>}
    </div>
  );
}
