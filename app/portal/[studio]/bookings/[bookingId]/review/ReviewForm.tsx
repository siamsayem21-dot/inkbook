"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { submitReview } from "../../../projects/[id]/actions";

interface Props {
  bookingId: string;
  redirectTo: string;
}

export default function ReviewForm({ bookingId, redirectTo }: Props) {
  const router = useRouter();

  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [quote, setQuote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (rating < 1) {
      setError("Please select a star rating.");
      return;
    }
    if (!quote.trim()) {
      setError("Please write a short review.");
      return;
    }

    setLoading(true);
    setError(null);

    const result = await submitReview(bookingId, rating, quote);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    router.push(redirectTo);
    router.refresh();
  };

  const displayRating = hoverRating || rating;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="text-sm text-gray-700 block mb-2">Your rating</label>
        <div className="flex items-center gap-1" role="radiogroup" aria-label="Star rating">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              role="radio"
              aria-checked={rating === star}
              aria-label={`${star} star${star > 1 ? "s" : ""}`}
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              className="p-0.5"
            >
              <svg
                viewBox="0 0 20 20"
                width="28"
                height="28"
                fill={star <= displayRating ? "#c9a84c" : "none"}
                stroke={star <= displayRating ? "#c9a84c" : "#a1a1aa"}
                strokeWidth={1.2}
              >
                <path d="M10 1.5l2.6 5.4 5.9.8-4.3 4.2 1 5.9L10 15l-5.2 2.8 1-5.9L1.5 7.7l5.9-.8L10 1.5z" />
              </svg>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-sm text-gray-700 block mb-1.5">Your review</label>
        <textarea
          required
          value={quote}
          onChange={(e) => setQuote(e.target.value)}
          rows={5}
          placeholder="What was your experience like?"
          className="w-full border border-zinc-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:border-zinc-500"
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-zinc-900 text-white font-semibold py-3 rounded-full hover:bg-zinc-700 disabled:opacity-50 transition-colors"
      >
        {loading ? "Submitting…" : "Submit Review"}
      </button>
      <p className="text-xs text-gray-500 text-center">
        Your review will be shown publicly once approved by the studio.
      </p>
    </form>
  );
}
