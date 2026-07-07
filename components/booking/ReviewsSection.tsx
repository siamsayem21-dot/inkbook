export type Review = {
  id: string;
  author_name: string;
  rating: number;
  quote: string;
};

interface Props {
  reviews: Review[];
  brandColor: string;
}

function Stars({ rating, brandColor }: { rating: number; brandColor: string }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          viewBox="0 0 20 20"
          width="14"
          height="14"
          fill={i < rating ? brandColor : "none"}
          stroke={i < rating ? brandColor : "#3f3f46"}
          strokeWidth={1.2}
        >
          <path d="M10 1.5l2.6 5.4 5.9.8-4.3 4.2 1 5.9L10 15l-5.2 2.8 1-5.9L1.5 7.7l5.9-.8L10 1.5z" />
        </svg>
      ))}
    </div>
  );
}

export default function ReviewsSection({ reviews, brandColor }: Props) {
  if (reviews.length === 0) return null;

  const average = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

  return (
    <section id="reviews" className="mt-20 scroll-mt-24">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-2">Client Reviews</p>
          <h2 className="font-serif text-2xl md:text-3xl tracking-wide">What Clients Say</h2>
        </div>
        <div className="flex items-center gap-2">
          <Stars rating={Math.round(average)} brandColor={brandColor} />
          <span className="text-sm text-zinc-400">
            {average.toFixed(1)} / 5 · {reviews.length} review{reviews.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {reviews.map((r) => (
          <div
            key={r.id}
            className="bg-zinc-900/50 border border-white/[0.08] p-6 flex flex-col"
          >
            <Stars rating={r.rating} brandColor={brandColor} />
            <p className="text-zinc-300 text-sm leading-relaxed mt-4 flex-1">&ldquo;{r.quote}&rdquo;</p>
            <p className="text-zinc-500 text-xs font-semibold mt-5 pt-4 border-t border-white/[0.06]">
              {r.author_name}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
