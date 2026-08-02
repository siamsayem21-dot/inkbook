-- =============================================================
-- InkBook — Appointment Reminder Emails
--
-- Adds an email channel alongside the existing SMS 48hr/day-of
-- reminders (sms_48hr_sent / sms_day_of_sent, from
-- 20260529000000_sms_tracking.sql). Same dedupe-flag pattern, but
-- tracked independently per channel so an SMS failure/success never
-- blocks or double-fires the email side (and vice versa).
--
-- Idempotent — safe to re-run (ADD COLUMN IF NOT EXISTS).
-- =============================================================

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS email_48hr_sent   BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS email_day_of_sent BOOLEAN NOT NULL DEFAULT FALSE;
