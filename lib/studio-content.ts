import { createAdminClient } from "@/lib/supabase/admin";

export type PublicReview = {
  id: string;
  author_name: string;
  rating: number;
  quote: string;
};

export type PortfolioImage = {
  id: string;
  artist_id: string;
  image_url: string;
  style: string | null;
};

/**
 * Fetch public, active reviews for a studio (shown on the public studio page).
 * Returns empty array if the table doesn't exist yet (migration pending).
 */
export async function getPublicReviews(studioId: string): Promise<PublicReview[]> {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("reviews")
      .select("id, author_name, rating, quote")
      .eq("studio_id", studioId)
      .eq("is_public", true)
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    return (data ?? []) as PublicReview[];
  } catch {
    return [];
  }
}

/**
 * Fetch active portfolio images for a studio (shown on the public studio page).
 * Returns empty array if the table doesn't exist yet (migration pending).
 */
export async function getPortfolioImages(studioId: string): Promise<PortfolioImage[]> {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("portfolio_images")
      .select("id, artist_id, image_url, style")
      .eq("studio_id", studioId)
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    return (data ?? []) as PortfolioImage[];
  } catch {
    return [];
  }
}
