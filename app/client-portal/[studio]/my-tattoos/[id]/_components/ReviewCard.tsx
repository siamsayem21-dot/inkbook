import Link from "next/link";
import { Star } from "lucide-react";
import SectionCard from "./SectionCard";
import type { ProjectDetailData } from "../types";

interface Props {
  review: ProjectDetailData["review"];
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={14} className={i <= rating ? "fill-amber-400 text-amber-400" : "text-zinc-200"} />
      ))}
    </div>
  );
}

export default function ReviewCard({ review }: Props) {
  if (!review.active) {
    return (
      <SectionCard id="review" icon={Star} title="Review & Rating" muted>
        <p className="text-sm text-zinc-500">This section unlocks once your project is completed.</p>
      </SectionCard>
    );
  }

  if (review.hasReview) {
    return (
      <SectionCard id="review" icon={Star} title="Review & Rating">
        {review.rating != null && <Stars rating={review.rating} />}
        {review.quote && <p className="text-sm text-zinc-600 leading-relaxed mt-3">&ldquo;{review.quote}&rdquo;</p>}
        {review.leaveHref && (
          <Link href={review.leaveHref} className="inline-block text-xs font-semibold text-violet-600 hover:text-violet-700 transition-colors mt-4">
            Edit Review →
          </Link>
        )}
      </SectionCard>
    );
  }

  return (
    <SectionCard id="review" icon={Star} title="Review & Rating">
      <p className="text-sm text-zinc-600 mb-4">How was your experience? Let the studio and future clients know.</p>
      {review.leaveHref ? (
        <Link
          href={review.leaveHref}
          className="inline-flex items-center justify-center bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl px-5 py-3 transition-colors"
        >
          Leave a Review →
        </Link>
      ) : (
        <button type="button" disabled title="Demo data — not connected" className="text-sm font-semibold rounded-xl py-3 px-5 bg-zinc-100 text-zinc-400 cursor-not-allowed">
          Leave a Review
        </button>
      )}
    </SectionCard>
  );
}
