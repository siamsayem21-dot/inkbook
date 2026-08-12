"use client";

import { useState, useTransition } from "react";
import { addReview, deleteReview, setReviewVisibility, type ReviewEntry } from "@/app/(owner)/owner/reviews/actions";

const inputCls =
  "w-full bg-zinc-50 border border-zinc-200 text-zinc-800 text-sm rounded-xl px-3.5 py-2.5 " +
  "placeholder-zinc-400 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-colors";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function Stars({ rating, size = 12 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          viewBox="0 0 20 20"
          width={size}
          height={size}
          fill={i < rating ? "#7c3aed" : "none"}
          stroke={i < rating ? "#7c3aed" : "#d4d4d8"}
          strokeWidth={1.2}
        >
          <path d="M10 1.5l2.6 5.4 5.9.8-4.3 4.2 1 5.9L10 15l-5.2 2.8 1-5.9L1.5 7.7l5.9-.8L10 1.5z" />
        </svg>
      ))}
    </div>
  );
}

function ReviewCard({
  entry, isPending, removing, onToggle, onRemove,
}: {
  entry: ReviewEntry;
  isPending: boolean;
  removing: boolean;
  onToggle: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-zinc-900">{entry.author_name}</p>
            {entry.booking_id && (
              <span className="text-[10px] px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full font-medium">
                Verified
              </span>
            )}
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                entry.is_public ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
              }`}
            >
              {entry.is_public ? "Public" : "Pending"}
            </span>
          </div>
          <div className="mt-1.5"><Stars rating={entry.rating} /></div>
        </div>
        <p className="text-[11px] text-zinc-400 shrink-0">{fmtDate(entry.created_at)}</p>
      </div>

      <p className="text-sm text-zinc-600 mt-3 pt-3 border-t border-zinc-100 leading-relaxed">
        {entry.quote}
      </p>

      <div className="flex items-center gap-4 mt-3">
        <button
          onClick={onToggle}
          disabled={isPending}
          className="text-xs font-medium text-violet-600 hover:text-violet-700 transition-colors disabled:opacity-40"
        >
          {entry.is_public ? "Hide" : "Approve"}
        </button>
        <button
          onClick={onRemove}
          disabled={isPending}
          className={`text-xs font-medium transition-colors disabled:opacity-40 ${
            removing ? "text-red-600" : "text-zinc-400 hover:text-red-600"
          }`}
        >
          {removing ? "Confirm delete" : "Delete"}
        </button>
      </div>
    </div>
  );
}

export default function ReviewsManager({
  initialReviews,
}: {
  initialReviews: ReviewEntry[];
}) {
  const [reviews, setReviews] = useState<ReviewEntry[]>(initialReviews);
  const [showForm, setShowForm]   = useState(false);
  const [authorName, setAuthorName] = useState("");
  const [rating, setRating]       = useState(5);
  const [quote, setQuote]         = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTrans]   = useTransition();
  const [removing, setRemoving]   = useState<string | null>(null);
  const [rowError, setRowError]   = useState<string | null>(null);

  function resetForm() {
    setAuthorName(""); setRating(5); setQuote(""); setFormError(null);
  }

  function handleAdd() {
    setFormError(null);
    startTrans(async () => {
      const result = await addReview({ authorName, rating, quote });
      if (result.error) { setFormError(result.error); return; }
      setReviews((prev) => [
        {
          id: crypto.randomUUID(),
          author_name: authorName.trim(),
          rating,
          quote: quote.trim(),
          is_public: true,
          booking_id: null,
          created_at: new Date().toISOString(),
        },
        ...prev,
      ]);
      resetForm();
      setShowForm(false);
    });
  }

  function handleToggleVisibility(entry: ReviewEntry) {
    setRowError(null);
    startTrans(async () => {
      const result = await setReviewVisibility(entry.id, !entry.is_public);
      if (result.error) { setRowError(result.error); return; }
      setReviews((prev) =>
        prev.map((r) => (r.id === entry.id ? { ...r, is_public: !r.is_public } : r))
      );
    });
  }

  function handleRemove(id: string) {
    if (removing !== id) { setRemoving(id); return; }
    startTrans(async () => {
      const result = await deleteReview(id);
      if (result.error) { setRemoving(null); return; }
      setReviews((prev) => prev.filter((r) => r.id !== id));
      setRemoving(null);
    });
  }

  return (
    <div className="space-y-5">
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="text-sm font-semibold px-4 py-2.5 rounded-xl border border-zinc-200 bg-white text-zinc-600 hover:border-violet-300 hover:text-violet-700 transition-colors"
        >
          + Add testimonial
        </button>
      )}

      {showForm && (
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-5 max-w-md space-y-4">
          <p className="text-sm font-semibold text-zinc-900">Add a testimonial</p>

          <div>
            <label className="text-xs text-zinc-500 block mb-1.5">Client name</label>
            <input
              type="text"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="e.g. Sarah M."
              className={inputCls}
            />
          </div>

          <div>
            <label className="text-xs text-zinc-500 block mb-1.5">Rating</label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="p-0.5"
                  aria-label={`${star} stars`}
                >
                  <svg
                    viewBox="0 0 20 20"
                    width="22"
                    height="22"
                    fill={star <= rating ? "#7c3aed" : "none"}
                    stroke={star <= rating ? "#7c3aed" : "#d4d4d8"}
                    strokeWidth={1.2}
                  >
                    <path d="M10 1.5l2.6 5.4 5.9.8-4.3 4.2 1 5.9L10 15l-5.2 2.8 1-5.9L1.5 7.7l5.9-.8L10 1.5z" />
                  </svg>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-zinc-500 block mb-1.5">Review text</label>
            <textarea
              value={quote}
              onChange={(e) => setQuote(e.target.value)}
              rows={4}
              placeholder="What did the client say?"
              className={inputCls}
            />
          </div>

          {formError && <p className="text-red-600 text-xs">{formError}</p>}

          <div className="flex gap-3">
            <button
              onClick={handleAdd}
              disabled={isPending || !authorName.trim() || !quote.trim()}
              className="bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white text-sm px-5 py-2.5 rounded-xl font-semibold transition-colors"
            >
              {isPending ? "Adding…" : "Add testimonial"}
            </button>
            <button
              onClick={() => { resetForm(); setShowForm(false); }}
              className="text-sm text-zinc-500 hover:text-zinc-700 px-4 py-2.5 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {rowError && <p className="text-red-600 text-xs">{rowError}</p>}

      {reviews.length === 0 ? (
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm px-6 py-16 text-center">
          <p className="text-base font-semibold text-zinc-900 mb-2">No Reviews Yet</p>
          <p className="text-zinc-500 text-sm">Client-submitted reviews will appear here once your first sessions are completed.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {reviews.map((entry) => (
            <ReviewCard
              key={entry.id}
              entry={entry}
              isPending={isPending}
              removing={removing === entry.id}
              onToggle={() => handleToggleVisibility(entry)}
              onRemove={() => handleRemove(entry.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
