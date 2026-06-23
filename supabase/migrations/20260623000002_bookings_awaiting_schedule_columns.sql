-- Migration: Allow bookings to exist without a scheduled date/time.
-- date and time become nullable so a booking can be created at deposit
-- payment time (awaiting_schedule) before the owner assigns the session slot.
--
-- total_amount_cents: the pre-agreed full session price from the custom quote.
-- Nullable because regular self-serve bookings do not have a pre-agreed total —
-- only custom-request-sourced bookings populate this field.
--
-- Guard requirement: any query that uses bookings.date in a date comparison
-- (sms-reminders cron, no-show cron) MUST add AND date IS NOT NULL after
-- this migration to avoid matching awaiting_schedule bookings.

ALTER TABLE bookings ALTER COLUMN date DROP NOT NULL;
ALTER TABLE bookings ALTER COLUMN time DROP NOT NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS total_amount_cents INTEGER;
