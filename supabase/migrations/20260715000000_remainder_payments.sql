-- =============================================================
-- InkBook — Remaining Balance Payment (Phase C, Feature 2)
--
-- deposit_payments already tracks "individual Stripe payment attempts per
-- booking" (see 20260619000003_stripe_deposit_payments.sql's own comment).
-- A remainder payment is exactly that — another Stripe payment attempt for
-- the same booking — so it's tracked in the same table rather than a
-- duplicate one. payment_type distinguishes the two so existing
-- deposit-status queries (owner bookings list/detail, sendDepositRequest(),
-- getOrCreateDepositCheckoutSession(), /api/consent-forms) keep resolving
-- only deposit rows once remainder rows start appearing alongside them.
--
-- DEFAULT 'deposit' backfills every pre-existing row for free — no data
-- migration needed, no behavior change for rows written before this column
-- existed.
--
-- bookings.remainder_collected already exists (initial schema) but has no
-- timestamp counterpart; remainder_collected_at is added for display parity
-- with deposit_paid_at.
--
-- Idempotent — safe to re-run (ADD COLUMN IF NOT EXISTS, CREATE INDEX IF NOT
-- EXISTS), matching every other migration's own convention.
-- =============================================================

ALTER TABLE deposit_payments
  ADD COLUMN IF NOT EXISTS payment_type TEXT NOT NULL DEFAULT 'deposit'
    CHECK (payment_type IN ('deposit', 'remainder'));

CREATE INDEX IF NOT EXISTS idx_deposit_payments_booking_type
  ON deposit_payments(booking_id, payment_type);

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS remainder_collected_at TIMESTAMPTZ;
