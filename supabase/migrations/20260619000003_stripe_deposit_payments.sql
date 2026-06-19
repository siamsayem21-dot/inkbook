-- =============================================================
-- InkBook — Stripe Deposit Collection Schema
-- Adds quote_amount_cents to bookings and creates
-- deposit_payments for tracking individual Stripe transactions.
--
-- Notes on existing columns (already present — no changes needed):
--   bookings.status           → booking_status (booking_status enum)
--   bookings.deposit_amount_cents → deposit_amount
-- =============================================================

-- ──────────────────────────────────────────────────────────────
-- bookings: add quote_amount_cents
-- The artist's total price quote for the tattoo session.
-- Separate from the deposit — deposit is the upfront hold,
-- quote is the full agreed price.
-- ──────────────────────────────────────────────────────────────
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS quote_amount_cents INTEGER;

-- ──────────────────────────────────────────────────────────────
-- TABLE: deposit_payments
-- Tracks individual Stripe Checkout sessions / payment attempts
-- per booking. Unlike deposits (one-to-one), this allows multiple
-- attempts (e.g. client abandons checkout, retries with new session).
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS deposit_payments (
  id                         UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id                 UUID           NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  stripe_checkout_session_id TEXT,
  stripe_payment_intent_id   TEXT           UNIQUE,
  amount_cents               INTEGER        NOT NULL,
  payment_status             deposit_status NOT NULL DEFAULT 'pending',
  paid_at                    TIMESTAMPTZ,
  created_at                 TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deposit_payments_booking_id
  ON deposit_payments(booking_id);

CREATE INDEX IF NOT EXISTS idx_deposit_payments_checkout_session_id
  ON deposit_payments(stripe_checkout_session_id);

CREATE INDEX IF NOT EXISTS idx_deposit_payments_payment_intent_id
  ON deposit_payments(stripe_payment_intent_id);
