-- Migration: Enforce one deposit record per Stripe checkout session.
-- Prevents duplicate deposit rows when Stripe retries the
-- checkout.session.completed webhook event (which it may do even after a 200
-- response, and always does on any non-2xx response).
--
-- PostgreSQL UNIQUE allows multiple NULLs — pre-existing rows where
-- stripe_checkout_session_id is NULL (regular bookings created before this
-- migration) are unaffected.
--
-- Pre-condition: verify no duplicate non-null values exist before applying:
--   SELECT stripe_checkout_session_id, COUNT(*)
--   FROM deposits
--   WHERE stripe_checkout_session_id IS NOT NULL
--   GROUP BY 1 HAVING COUNT(*) > 1;
-- Expected result: zero rows.

ALTER TABLE deposits
  ADD CONSTRAINT deposits_stripe_checkout_session_id_key
  UNIQUE (stripe_checkout_session_id);
