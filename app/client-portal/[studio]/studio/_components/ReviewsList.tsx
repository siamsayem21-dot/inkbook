import { Star } from "lucide-react";
import SectionShell from "./SectionShell";
import EmptyState from "./EmptyState";

export interface StudioReview {
  id: string;
  authorName: string;
  rating: number;
  quote: string;
}

interface Props {
  reviews: StudioReview[];
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={13} className={i <= rating ? "fill-amber-400 text-amber-400" : "text-zinc-200"} />
      ))}
    </div>
  );
}

// Only real, studio-approved public reviews (reviews.is_public && is_active)
// — never fabricated ratings.
export default function ReviewsList({ reviews }: Props) {
  return (
    <SectionShell id="reviews" icon={Star} eyebrow="What Clients Say" title="Reviews">
      {reviews.length === 0 ? (
        <EmptyState message="No reviews yet." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {reviews.map((review) => (
            <div key={review.id} className="rounded-2xl border border-zinc-100 p-5">
              <Stars rating={review.rating} />
              <p className="text-sm text-zinc-600 leading-relaxed mt-3">&ldquo;{review.quote}&rdquo;</p>
              <p className="text-xs font-medium text-zinc-800 mt-3">{review.authorName}</p>
            </div>
          ))}
        </div>
      )}
    </SectionShell>
  );
}
