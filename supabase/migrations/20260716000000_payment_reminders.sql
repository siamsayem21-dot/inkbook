-- =============================================================
-- InkBook — Payment Reminders (Phase C, Feature 3)
--
-- Same exact pattern as 20260529000000_sms_tracking.sql's sms_48hr_sent /
-- sms_day_of_sent columns: a plain boolean dedupe flag per reminder type,
-- flipped true the first (and only) time each automated reminder fires for
-- a given booking, so a more-frequent cron can never send the same
-- reminder twice.
--
-- deposit_reminder_sent   — cron/payment-reminders' deposit-pending pass
-- remainder_reminder_sent — cron/payment-reminders' remainder-balance pass
--
-- Idempotent — safe to re-run (ADD COLUMN IF NOT EXISTS).
-- =============================================================

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS deposit_reminder_sent   BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS remainder_reminder_sent BOOLEAN NOT NULL DEFAULT FALSE;
