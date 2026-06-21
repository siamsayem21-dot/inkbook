-- =============================================================
-- InkBook — Studio Knowledge Base (safe / idempotent version)
--
-- Safe to run on any database state:
--   - Re-declares dependencies so it works even if earlier
--     migrations are missing from this project.
--   - Every structural statement uses IF NOT EXISTS or
--     OR REPLACE so the script can be re-run without error.
--   - Policies are wrapped in exception handlers so they
--     silently skip if they already exist.
-- =============================================================

-- ── Step 1: dependencies ─────────────────────────────────────
-- set_updated_at() is normally created in 20260527000000_initial_schema.sql.
-- Re-declaring with CREATE OR REPLACE is safe and idempotent.
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- my_studio_id() is normally created in 20260527000001_rls.sql.
-- Re-declaring is safe — same body, same behaviour.
CREATE OR REPLACE FUNCTION my_studio_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT id FROM studios WHERE owner_id = auth.uid()
$$;

-- ── Step 2: table ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS studio_knowledge (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id   UUID        NOT NULL REFERENCES studios(id) ON DELETE CASCADE,

  category    TEXT        NOT NULL DEFAULT 'general'
              CHECK (category IN ('policy', 'faq', 'style', 'pricing', 'general')),

  title       TEXT        NOT NULL,
  content     TEXT        NOT NULL,

  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
  is_public   BOOLEAN     NOT NULL DEFAULT FALSE,

  sort_order  INTEGER     NOT NULL DEFAULT 0,

  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Step 3: trigger ───────────────────────────────────────────
DROP TRIGGER IF EXISTS studio_knowledge_updated_at ON studio_knowledge;
CREATE TRIGGER studio_knowledge_updated_at
  BEFORE UPDATE ON studio_knowledge
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Step 4: indexes ───────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_studio_knowledge_studio
  ON studio_knowledge(studio_id);

CREATE INDEX IF NOT EXISTS idx_studio_knowledge_active
  ON studio_knowledge(studio_id, is_active) WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_studio_knowledge_public
  ON studio_knowledge(studio_id, is_public) WHERE is_public = TRUE;

-- ── Step 5: RLS ───────────────────────────────────────────────
ALTER TABLE studio_knowledge ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "studio_knowledge: owner can select"
    ON studio_knowledge FOR SELECT
    USING (studio_id = my_studio_id());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "studio_knowledge: owner can insert"
    ON studio_knowledge FOR INSERT
    WITH CHECK (studio_id = my_studio_id());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "studio_knowledge: owner can update"
    ON studio_knowledge FOR UPDATE
    USING  (studio_id = my_studio_id())
    WITH CHECK (studio_id = my_studio_id());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "studio_knowledge: owner can delete"
    ON studio_knowledge FOR DELETE
    USING (studio_id = my_studio_id());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "studio_knowledge: public can select public entries"
    ON studio_knowledge FOR SELECT
    USING (is_public = TRUE AND is_active = TRUE);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
