// Shared star-rating display formatter for the owner/artist booking-detail
// pages — the client review-submission flow (reviews table, Phase C
// Feature 5) already exists, but nothing ever surfaced the submitted
// reviews.rating value back to the owner/artist dashboards.
export function formatRatingStars(rating: number): string {
  const filled = Math.max(Math.min(rating, 5), 0);
  const stars = "★".repeat(filled) + "☆".repeat(5 - filled);
  return `${stars} (${rating}/5)`;
}
