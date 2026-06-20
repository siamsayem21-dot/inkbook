-- =============================================================
-- InkBook — AI Consultation Module
-- Run this in: Supabase Dashboard → SQL Editor
-- =============================================================

CREATE TABLE consultations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,

  -- Client identity (Step 1)
  client_name  TEXT NOT NULL,
  client_email TEXT NOT NULL,
  client_phone TEXT NOT NULL,

  -- Tattoo project (Step 2)
  tattoo_description TEXT NOT NULL,
  placement          TEXT NOT NULL,
  estimated_size     TEXT NOT NULL,
  color_preference   TEXT NOT NULL,
  budget_range       TEXT NOT NULL,
  reference_photos   TEXT[] NOT NULL DEFAULT '{}',

  -- AI follow-up Q&A (Step 3)
  followup_questions JSONB NOT NULL DEFAULT '[]',
  followup_answers   JSONB NOT NULL DEFAULT '{}',

  -- Style detection (Step 4)
  detected_style    TEXT,
  style_confidence  NUMERIC(5,1),
  style_reasoning   TEXT,

  -- AI notes for artist
  ai_notes TEXT,

  -- Lead pipeline status
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'reviewed', 'quoted', 'converted', 'lost')),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER consultations_updated_at
  BEFORE UPDATE ON consultations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;

-- Studio owner full access
CREATE POLICY "owners_manage_consultations" ON consultations
  FOR ALL USING (
    studio_id IN (SELECT id FROM studios WHERE owner_id = auth.uid())
  );

-- Public insert (client-facing form, no auth required)
CREATE POLICY "public_submit_consultation" ON consultations
  FOR INSERT WITH CHECK (true);
