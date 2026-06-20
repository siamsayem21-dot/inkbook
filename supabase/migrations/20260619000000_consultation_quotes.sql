-- =============================================================
-- InkBook — AI Quote Assistant columns
-- Run this in: Supabase Dashboard → SQL Editor
-- =============================================================

ALTER TABLE consultations
  ADD COLUMN IF NOT EXISTS ai_recommended_price_min INT,
  ADD COLUMN IF NOT EXISTS ai_recommended_price_max INT,
  ADD COLUMN IF NOT EXISTS ai_estimated_sessions    INT,
  ADD COLUMN IF NOT EXISTS ai_estimated_hours       TEXT,
  ADD COLUMN IF NOT EXISTS ai_difficulty            TEXT,
  ADD COLUMN IF NOT EXISTS ai_quote_reasoning       TEXT,
  ADD COLUMN IF NOT EXISTS final_price              INT,
  ADD COLUMN IF NOT EXISTS final_sessions           INT,
  ADD COLUMN IF NOT EXISTS quote_notes              TEXT,
  ADD COLUMN IF NOT EXISTS quote_status             TEXT NOT NULL DEFAULT 'none';
