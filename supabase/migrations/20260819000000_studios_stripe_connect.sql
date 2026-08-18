-- =============================================================
-- InkBook — Stripe Connect (studio payment recipient) columns
-- Run this in: Supabase Dashboard → SQL Editor
-- =============================================================
--
-- PREPARED BUT NOT YET APPLIED. Part of the subscription-only payment
-- architecture Siam approved (see MASTER_PLAN.md / DEFERRED_ISSUES.md #3):
-- InkBook takes 0% of client deposit/remainder payments — those go
-- directly to the studio's own Stripe connected account (Standard,
-- Direct Charges). InkBook's only revenue is the existing studio
-- subscription, which is completely untouched by this migration.
--
-- All application code that reads these columns is gated behind the
-- STRIPE_CONNECT_ENABLED env var (unset/false by default — see
-- lib/stripe/connect.ts), which is NOT set in production yet. That means
-- this migration is safe to apply at any time relative to the code deploy
-- in either order: if applied before the code, nothing reads the new
-- columns yet; if the code deploys before this runs, the flag-gated code
-- never queries these columns because the flag is off. The flag is only
-- ever turned on by Siam, after this migration is confirmed applied AND
-- the matching Stripe Dashboard Connect setup is done (see the
-- NEEDS_SIAM activation checklist).
--
-- Every column is nullable or has a safe default — every existing studio
-- row is valid immediately after this runs, with
-- stripe_connect_charges_enabled = false (correctly means "can't accept
-- client Stripe payments yet" for every studio until they connect).
--
-- Rollback: `ALTER TABLE studios DROP COLUMN IF EXISTS <each column>` is
-- trivially safe — these columns hold no client/booking data, only
-- Connect status mirrored from Stripe (Stripe remains the source of
-- truth; a rollback loses nothing that can't be re-synced by re-fetching
-- the account from Stripe).
--
-- Idempotent — safe to re-run.
-- =============================================================

ALTER TABLE studios
  ADD COLUMN IF NOT EXISTS stripe_connected_account_id      TEXT,
  ADD COLUMN IF NOT EXISTS stripe_connect_charges_enabled   BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS stripe_connect_payouts_enabled   BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS stripe_connect_details_submitted BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS stripe_connect_updated_at        TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_studios_stripe_connected_account_id
  ON studios(stripe_connected_account_id);
