"use client";

import { useState, useTransition } from "react";
import { addReview, deleteReview, setReviewVisibility, type ReviewEntry } from "@/app/(owner)/owner/reviews/actions";

const inputCls =
  "w-full bg-zinc-900 border border-zinc-800 text-white text-sm rounded-lg px-4 py-2.5 " +
  "placeholder-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          viewBox="0 0 20 20"
          width="12"
          height="12"
          fill={i < rating ? "#c9a84c" : "none"}
          stroke={i < rating ? "#c9a84c" : "#3f3f46"}
          strokeWidth={1.2}
        >
          <path d="M10 1.5l2.6 5.4 5.9.8-4.3 4.2 1 5.9L10 15l-5.2 2.8 1-5.9L1.5 7.7l5.9-.8L10 1.5z" />
        </svg>
      ))}
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
          className="bg-[#c9a84c]/10 border border-[#c9a84c]/20 text-[#c9a84c] text-sm px-4 py-2 rounded-full hover:bg-[#c9a84c]/20 transition-colors"
        >
          + Add testimonial
        </button>
      )}

      {showForm && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 max-w-md space-y-4">
          <p className="text-sm font-semibold text-zinc-200">Add a testimonial</p>

          <div>
            <label className="text-xs uppercase tracking-widest text-zinc-500 block mb-1.5">Client name</label>
            <input
              type="text"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="e.g. Sarah M."
              className={inputCls}
            />
          </div>

          <div>
            <label className="text-xs uppercase tracking-widest text-zinc-500 block mb-1.5">Rating</label>
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
                    fill={star <= rating ? "#c9a84c" : "none"}
                    stroke={star <= rating ? "#c9a84c" : "#3f3f46"}
                    strokeWidth={1.2}
                  >
                    <path d="M10 1.5l2.6 5.4 5.9.8-4.3 4.2 1 5.9L10 15l-5.2 2.8 1-5.9L1.5 7.7l5.9-.8L10 1.5z" />
                  </svg>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs uppercase tracking-widest text-zinc-500 block mb-1.5">Review text</label>
            <textarea
              value={quote}
              onChange={(e) => setQuote(e.target.value)}
              rows={4}
              placeholder="What did the client say?"
              className={inputCls}
            />
          </div>

          {formError && <p className="text-red-400 text-xs">{formError}</p>}

          <div className="flex gap-3">
            <button
              onClick={handleAdd}
              disabled={isPending || !authorName.trim() || !quote.trim()}
              className="bg-[#c9a84c] hover:bg-[#b8973b] disabled:opacity-40 text-black text-sm px-5 py-2 rounded-full font-semibold transition-colors"
            >
              {isPending ? "Adding…" : "Add testimonial"}
            </button>
            <button
              onClick={() => { resetForm(); setShowForm(false); }}
              className="text-sm text-zinc-400 hover:text-white px-4 py-2 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {rowError && <p className="text-red-400 text-xs">{rowError}</p>}

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        {reviews.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-zinc-500 text-sm">No reviews yet.</p>
            <p className="text-zinc-700 text-xs mt-1">
              Client-submitted reviews will appear here once your first sessions are completed.
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                {["Client", "Rating", "Review", "Status", "Date", ""].map((h) => (
                  <th
                    key={h}
                    className="text-left text-zinc-500 text-[10px] uppercase tracking-widest font-medium px-6 py-3.5"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reviews.map((entry, i) => (
                <tr
                  key={entry.id}
                  className={i < reviews.length - 1 ? "border-b border-zinc-800/60" : ""}
                >
                  <td className="px-6 py-4 text-zinc-200">
                    {entry.author_name}
                    {entry.booking_id && (
                      <span className="ml-2 text-[9px] uppercase tracking-widest text-emerald-500/70">Verified</span>
                    )}
                  </td>
                  <td className="px-6 py-4"><Stars rating={entry.rating} /></td>
                  <td className="px-6 py-4 text-zinc-400 text-xs max-w-xs truncate">{entry.quote}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full border ${
                        entry.is_public
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                      }`}
                    >
                      {entry.is_public ? "Public" : "Pending"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-zinc-500 text-xs whitespace-nowrap">{fmtDate(entry.created_at)}</td>
                  <td className="px-6 py-4 text-right whitespace-nowrap">
                    <button
                      onClick={() => handleToggleVisibility(entry)}
                      disabled={isPending}
                      className="text-xs text-zinc-400 hover:text-white transition-colors disabled:opacity-40 mr-4"
                    >
                      {entry.is_public ? "Hide" : "Approve"}
                    </button>
                    <button
                      onClick={() => handleRemove(entry.id)}
                      disabled={isPending}
                      className={`text-xs transition-colors disabled:opacity-40 ${
                        removing === entry.id ? "text-red-400 font-semibold" : "text-zinc-600 hover:text-red-400"
                      }`}
                    >
                      {removing === entry.id ? "Confirm delete" : "Delete"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
