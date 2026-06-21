-- =============================================================
-- InkBook — Studio Knowledge Base
--
-- Stores studio-specific context that is injected into every
-- AI call (consultation questions, style detection, quote gen).
-- Owners write their policies, specialties, pricing context,
-- and FAQs once; the AI uses them on every client interaction.
--
-- is_public = TRUE entries are shown as an FAQ section on the
-- public /book/[studio] landing page.
-- =============================================================

CREATE TABLE studio_knowledge (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id   UUID        NOT NULL REFERENCES studios(id) ON DELETE CASCADE,

  category    TEXT        NOT NULL DEFAULT 'general'
              CHECK (category IN ('policy', 'faq', 'style', 'pricing', 'general')),

  title       TEXT        NOT NULL,
  content     TEXT        NOT NULL,

  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,   -- included in AI context
  is_public   BOOLEAN     NOT NULL DEFAULT FALSE,  -- shown on public booking page

  sort_order  INTEGER     NOT NULL DEFAULT 0,

  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER studio_knowledge_updated_at
  BEFORE UPDATE ON studio_knowledge
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_studio_knowledge_studio    ON studio_knowledge(studio_id);
CREATE INDEX idx_studio_knowledge_active    ON studio_knowledge(studio_id, is_active) WHERE is_active = TRUE;
CREATE INDEX idx_studio_knowledge_public    ON studio_knowledge(studio_id, is_public) WHERE is_public = TRUE;

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE studio_knowledge ENABLE ROW LEVEL SECURITY;

-- Owner can do everything on their own studio's entries
CREATE POLICY "studio_knowledge: owner can select"
  ON studio_knowledge FOR SELECT
  USING (studio_id = my_studio_id());

CREATE POLICY "studio_knowledge: owner can insert"
  ON studio_knowledge FOR INSERT
  WITH CHECK (studio_id = my_studio_id());

CREATE POLICY "studio_knowledge: owner can update"
  ON studio_knowledge FOR UPDATE
  USING  (studio_id = my_studio_id())
  WITH CHECK (studio_id = my_studio_id());

CREATE POLICY "studio_knowledge: owner can delete"
  ON studio_knowledge FOR DELETE
  USING (studio_id = my_studio_id());

-- Public booking page reads active+public entries (via service role, so RLS
-- doesn't apply there, but this guards direct PostgREST access)
CREATE POLICY "studio_knowledge: public can select public entries"
  ON studio_knowledge FOR SELECT
  USING (is_public = TRUE AND is_active = TRUE);
