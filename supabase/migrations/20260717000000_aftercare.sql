-- =============================================================
-- InkBook — Aftercare (Phase C, Feature 4)
--
-- completed_at gives a timestamp for the booking's terminal transition
-- (mirroring deposit_paid_at / remainder_collected_at's own pattern),
-- purely for display ("session completed / aftercare sent on <date>").
--
-- No other schema change needed — status = 'completed' already exists
-- (booking_status enum) and its write is already single-fire (the only
-- UPDATE ... status = 'completed' in the codebase is markCompleted(),
-- guarded by .eq("status","confirmed")), so no new dedupe flag is required
-- the way Feature 3's cron needed one.
--
-- Idempotent — safe to re-run.
-- =============================================================

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
