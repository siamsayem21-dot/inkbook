"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { submitFeedbackRating } from "../../projects/[id]/actions";

interface Props {
  bookingId: string;
  initialRating: number | null;
}

// Private, star-only "how was your session" rating — distinct from the
// public, moderated Review flow (ReviewForm.tsx) which collects a text
// testimonial. This is a quick quality signal for the owner/artist only,
// submitted once and never editable (see submitFeedbackRating's
// is("feedback_rating", null) lock).
export default function FeedbackRating({ bookingId, initialRating }: Props) {
  const router = useRouter();
  const [rating, setRating] = useState(initialRating);
  const [hoverRating, setHoverRating] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (rating !== null) {
    return (
      <div>
        <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-1">Your Feedback</p>
        <div className="flex items-center gap-0.5" aria-label={`You rated this session ${rating} out of 5 stars`}>
          {[1, 2, 3, 4, 5].map((star) => (
            <svg
              key={star}
              viewBox="0 0 20 20"
              width="16"
              height="16"
              fill={star <= rating ? "#c9a84c" : "none"}
              stroke={star <= rating ? "#c9a84c" : "#52525b"}
              strokeWidth={1.2}
            >
              <path d="M10 1.5l2.6 5.4 5.9.8-4.3 4.2 1 5.9L10 15l-5.2 2.8 1-5.9L1.5 7.7l5.9-.8L10 1.5z" />
            </svg>
          ))}
        </div>
      </div>
    );
  }

  const displayRating = hoverRating || 0;

  async function handleRate(star: number) {
    if (loading) return;
    setError(null);
    setLoading(true);
    const result = await submitFeedbackRating(bookingId, star);
    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }
    setRating(star);
    setLoading(false);
    router.refresh();
  }

  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-1.5">Rate Your Experience</p>
      <div className="flex items-center gap-1" role="radiogroup" aria-label="Rate your session">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={false}
            aria-label={`${star} star${star > 1 ? "s" : ""}`}
            disabled={loading}
            onClick={() => handleRate(star)}
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            className="p-0.5 disabled:opacity-50"
          >
            <svg
              viewBox="0 0 20 20"
              width="20"
              height="20"
              fill={star <= displayRating ? "#c9a84c" : "none"}
              stroke={star <= displayRating ? "#c9a84c" : "#a1a1aa"}
              strokeWidth={1.2}
            >
              <path d="M10 1.5l2.6 5.4 5.9.8-4.3 4.2 1 5.9L10 15l-5.2 2.8 1-5.9L1.5 7.7l5.9-.8L10 1.5z" />
            </svg>
          </button>
        ))}
      </div>
      {error && <p className="text-xs text-red-400 mt-1.5">{error}</p>}
    </div>
  );
}
