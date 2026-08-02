-- =============================================================
-- InkBook — Client Feedback Rating on Bookings
--
-- Adds a lightweight, private 1-5 star rating clients can leave on a
-- completed booking, separate from the existing public `reviews` table
-- (20260718000000_reviews.sql). Reviews are a moderated public testimonial
-- (text quote + rating, goes live on the studio page once approved).
-- feedback_rating is the opposite: a quick, mandatory-adjacent quality
-- signal for the owner/artist only, never shown publicly, no moderation
-- step, no text.
--
-- feedback_submitted_at is a one-shot dedupe flag (same pattern as
-- bookings.review_requested_at / remainder_reminder_sent): once set, the
-- client-facing action refuses to overwrite the rating, matching the plan's
-- "submitted once, cannot be changed" rule.
--
-- No new RLS policy is added. This codebase's client portal has no
-- Supabase-auth-backed session for clients (see
-- lib/client-portal/bookings.ts's header comment — "bookings/clients have
-- no client_account_id column and no client-facing RLS policy"); every
-- client-portal write goes through a server action using the service role
-- key with ownership proven in application code via the ai_chats ->
-- consultations.booking_id chain (see submitReview / payRemainderBalance in
-- app/portal/[studio]/projects/[id]/actions.ts). submitFeedbackRating()
-- follows the same convention. The existing "bookings: owner can update" /
-- "bookings: artist can update own" policies already cover authenticated
-- owner/artist reads of this new column; no client-side Supabase role ever
-- touches this table directly.
--
-- Idempotent — safe to re-run.
-- =============================================================

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS feedback_rating INTEGER,
  ADD COLUMN IF NOT EXISTS feedback_submitted_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bookings_feedback_rating_range'
  ) THEN
    ALTER TABLE bookings
      ADD CONSTRAINT bookings_feedback_rating_range
      CHECK (feedback_rating IS NULL OR (feedback_rating BETWEEN 1 AND 5));
  END IF;
END $$;
