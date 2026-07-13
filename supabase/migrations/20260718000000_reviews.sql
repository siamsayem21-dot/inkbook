-- =============================================================
-- InkBook — Reviews (Phase C, Feature 5)
--
-- The `reviews` table, its RLS, and the public display path
-- (components/booking/ReviewsSection.tsx + lib/studio-content.ts) already
-- existed (20260708000000_public_studio_page.sql) but nothing ever wrote to
-- it — no owner UI, no client submission flow. This migration only adds the
-- linkage needed for a real client-submitted review tied to a specific
-- completed booking; the moderation mechanism (is_public/is_active) already
-- exists and is reused as-is, not duplicated.
--
-- booking_id / client_account_id are nullable so existing (currently
-- nonexistent, but schema-anticipated) owner-entered testimonials — which
-- have no booking or client account — remain unaffected.
--
-- reviews_booking_id_unique: one review per booking. Postgres UNIQUE treats
-- multiple NULLs as distinct, so owner-entered testimonials (booking_id
-- NULL) are never restricted by this — only real per-booking reviews are
-- capped at one, same shape as consent_forms.booking_id's existing UNIQUE.
--
-- bookings.review_requested_at: one-shot dedupe timestamp for the new
-- review-requests cron, mirroring deposit_reminder_sent/
-- remainder_reminder_sent's pattern from Phase C Feature 3.
--
-- Idempotent — safe to re-run.
-- =============================================================

ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS booking_id        UUID REFERENCES bookings(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS client_account_id UUID REFERENCES client_accounts(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'reviews_booking_id_unique'
  ) THEN
    ALTER TABLE reviews ADD CONSTRAINT reviews_booking_id_unique UNIQUE (booking_id);
  END IF;
END $$;

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS review_requested_at TIMESTAMPTZ;
