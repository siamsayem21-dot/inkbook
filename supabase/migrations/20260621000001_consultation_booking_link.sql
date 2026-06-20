-- =============================================================
-- InkBook — Consultation → Booking pipeline fixes
-- Run in: Supabase Dashboard → SQL Editor
-- =============================================================

-- ──────────────────────────────────────────────────────────────
-- Fix 1: Expand status CHECK constraint
-- The original migration (20260618000000_consultations.sql) only
-- allowed 5 values. 20260619000002_pipeline_stages.sql was written
-- to fix this but was never applied. Applying it here.
-- ──────────────────────────────────────────────────────────────
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
    'converted'
  ));

-- ──────────────────────────────────────────────────────────────
-- Fix 2: Link consultations to artists and bookings
-- artist_id: set when the owner assigns an artist at booking time
-- booking_id: set when bookConsultation() creates the booking row
-- ──────────────────────────────────────────────────────────────
ALTER TABLE consultations
  ADD COLUMN IF NOT EXISTS artist_id  UUID REFERENCES artists(id),
  ADD COLUMN IF NOT EXISTS booking_id UUID REFERENCES bookings(id);

CREATE INDEX IF NOT EXISTS idx_consultations_artist_id  ON consultations(artist_id);
CREATE INDEX IF NOT EXISTS idx_consultations_booking_id ON consultations(booking_id);
