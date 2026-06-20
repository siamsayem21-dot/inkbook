-- =============================================================
-- InkBook — Lead Pipeline: expand status values
-- Run in: Supabase Dashboard → SQL Editor
-- =============================================================

-- Drop old 5-value CHECK and replace with full 8-value pipeline
ALTER TABLE consultations DROP CONSTRAINT IF EXISTS consultations_status_check;

ALTER TABLE consultations
  ADD CONSTRAINT consultations_status_check
  CHECK (status IN (
    'new',
    'reviewed',
    'quoted',
    'deposit_paid',
    'booked',
    'completed',
    'lost',
    'converted'   -- legacy alias kept for backward compat
  ));
