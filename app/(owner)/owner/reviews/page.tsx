export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getStudioId } from "@/lib/auth/config";
import ReviewsManager from "@/components/owner/ReviewsManager";
import { getReviews } from "./actions";

export default async function ReviewsPage() {
  const studioId = await getStudioId();
  if (!studioId) redirect("/login");

  const reviews = await getReviews();
  const pendingCount = reviews.filter((r) => !r.is_public).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reviews</h1>
        <p className="text-zinc-400 text-sm mt-1">
          Manage client reviews and testimonials shown on your public booking page.
          {pendingCount > 0 && (
            <span className="ml-2 text-[#c9a84c]">
              {pendingCount} awaiting approval.
            </span>
          )}
        </p>
      </div>
      <ReviewsManager initialReviews={reviews} />
    </div>
  );
}
