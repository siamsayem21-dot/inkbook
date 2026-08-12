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
    <div className="-m-4 -mt-16 md:-m-8 min-h-[calc(100vh-3rem)] md:min-h-screen" style={{ background: "#FAF9FC" }}>
      <div className="p-4 pt-16 md:p-8 space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-zinc-900">Reviews</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Manage client reviews and testimonials shown on your public booking page.
            {pendingCount > 0 && (
              <span className="ml-2 text-violet-600 font-medium">
                {pendingCount} awaiting approval.
              </span>
            )}
          </p>
        </div>
        <ReviewsManager initialReviews={reviews} />
      </div>
    </div>
  );
}
