-- Add columns to track whether SMS reminders have been sent for each booking.
-- Safe to run on existing tables (uses IF NOT EXISTS).

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS sms_48hr_sent   BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS sms_day_of_sent BOOLEAN NOT NULL DEFAULT FALSE;

-- Speeds up the hourly cron query
CREATE INDEX IF NOT EXISTS idx_bookings_sms_reminders
  ON bookings(date, status)
  WHERE status = 'confirmed';
