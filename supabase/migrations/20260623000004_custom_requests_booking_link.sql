-- Migration: Link custom_requests to the booking created at deposit payment.
--
-- booking_id: nullable FK — NULL until the client pays the deposit and the
-- webhook atomically creates the booking. ON DELETE SET NULL preserves the
-- custom_request intake record if a booking is ever deleted.
--
-- Partial unique index: enforces one booking per custom_request while allowing
-- multiple rows where booking_id IS NULL (pending/quoted requests waiting for
-- client payment). A full UNIQUE column constraint would reject multiple NULLs.
--
-- 'scheduled' status: represents the state after the owner assigns a date/time
-- and the booking advances from awaiting_schedule to confirmed.
--
-- idx_custom_requests_accepted: partial index powers the owner's "Needs
-- Scheduling" dashboard queue — accepted requests ordered by deposit timestamp.

ALTER TABLE custom_requests
  ADD COLUMN IF NOT EXISTS booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS custom_requests_booking_id_unique
  ON custom_requests(booking_id)
  WHERE booking_id IS NOT NULL;

ALTER TABLE custom_requests DROP CONSTRAINT IF EXISTS custom_requests_status_check;
ALTER TABLE custom_requests ADD CONSTRAINT custom_requests_status_check
  CHECK (status IN ('pending', 'quoted', 'accepted', 'declined', 'completed', 'scheduled'));

CREATE INDEX IF NOT EXISTS idx_custom_requests_accepted
  ON custom_requests(studio_id, deposit_paid_at DESC)
  WHERE status = 'accepted';
