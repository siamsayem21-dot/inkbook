"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getStudioId } from "@/lib/auth/config";
import { revalidatePath } from "next/cache";

export type ReviewEntry = {
  id: string;
  author_name: string;
  rating: number;
  quote: string;
  is_public: boolean;
  booking_id: string | null;
  created_at: string;
};

export async function getReviews(): Promise<ReviewEntry[]> {
  const studioId = await getStudioId();
  if (!studioId) return [];

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("reviews")
    .select("id, author_name, rating, quote, is_public, booking_id, created_at")
    .eq("studio_id", studioId)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  return (data ?? []) as ReviewEntry[];
}

// Manually adds a testimonial — booking_id/client_account_id stay null,
// distinguishing it from a genuine client submission (see submitReview() in
// app/portal/[studio]/projects/[id]/actions.ts). Reuses the same `reviews`
// table and is_public/is_active columns already defined for the public
// studio page — no new schema for this path.
export async function addReview(data: {
  authorName: string;
  rating: number;
  quote: string;
}): Promise<{ error?: string }> {
  const studioId = await getStudioId();
  if (!studioId) return { error: "Unauthorized" };

  const authorName = data.authorName.trim();
  const quote = data.quote.trim();
  if (!authorName) return { error: "Client name is required" };
  if (!quote) return { error: "Review text is required" };
  if (!Number.isInteger(data.rating) || data.rating < 1 || data.rating > 5) {
    return { error: "Rating must be between 1 and 5 stars" };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("reviews")
    .insert({
      studio_id: studioId,
      author_name: authorName,
      rating: data.rating,
      quote,
    } as never);

  if (error) {
    console.error("[addReview]", error.message);
    return { error: "Failed to add review — please try again" };
  }

  revalidatePath("/owner/reviews");
  return {};
}

// Approve (is_public: true) / hide (is_public: false) a review for the
// public studio page. Client-submitted reviews (Phase C Feature 5) default
// to is_public: false, so this is how they ever go live.
export async function setReviewVisibility(id: string, isPublic: boolean): Promise<{ error?: string }> {
  const studioId = await getStudioId();
  if (!studioId) return { error: "Unauthorized" };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("reviews")
    .update({ is_public: isPublic } as never)
    .eq("id", id)
    .eq("studio_id", studioId);

  if (error) {
    console.error("[setReviewVisibility]", error.message);
    return { error: "Failed to update — please try again" };
  }

  revalidatePath("/owner/reviews");
  return {};
}

export async function deleteReview(id: string): Promise<{ error?: string }> {
  const studioId = await getStudioId();
  if (!studioId) return { error: "Unauthorized" };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("reviews")
    .delete()
    .eq("id", id)
    .eq("studio_id", studioId);

  if (error) {
    console.error("[deleteReview]", error.message);
    return { error: "Failed to delete — please try again" };
  }

  revalidatePath("/owner/reviews");
  return {};
}
