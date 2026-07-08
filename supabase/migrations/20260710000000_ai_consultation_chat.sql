-- =============================================================
-- InkBook — Client Portal AI Consultation Chat (Client Portal step 3)
-- Adds the conversational layer behind /portal/[studio]/consultation:
--   - ai_chats           one active chat session per client per studio;
--                        accumulates structured fields as the AI extracts
--                        them, links to the `consultations` row it produces
--   - ai_chat_messages   full transcript (text + optional reference image)
--
-- On completion the chat writes a normal row into the existing
-- `consultations` table — no changes to that table are needed, and the
-- owner's existing /owner/consultations dashboard picks it up immediately.
--
-- Idempotent: safe to re-run. Tables/indexes use IF NOT EXISTS, the trigger
-- is dropped-and-recreated, and policies are wrapped in DO blocks that
-- swallow duplicate_object the same way 20260622000003_studio_knowledge.sql
-- does, so re-running this file never fails on objects that already exist.
-- =============================================================

-- Returns the client_accounts.id for the current auth user (NULL if not a client)
CREATE OR REPLACE FUNCTION my_client_account_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT id FROM client_accounts WHERE user_id = auth.uid()
$$;

-- ──────────────────────────────────────────────────────────────
-- TABLE: ai_chats
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_chats (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id          UUID        NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  client_account_id  UUID        NOT NULL REFERENCES client_accounts(id) ON DELETE CASCADE,

  status             TEXT        NOT NULL DEFAULT 'active'
                                  CHECK (status IN ('active', 'submitted')),
  gathered           JSONB       NOT NULL DEFAULT '{}'::jsonb,   -- structured fields extracted so far
  consultation_id    UUID        REFERENCES consultations(id) ON DELETE SET NULL,

  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS ai_chats_updated_at ON ai_chats;
CREATE TRIGGER ai_chats_updated_at
  BEFORE UPDATE ON ai_chats
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Fast lookup of "the" active chat to resume for a given client + studio
CREATE INDEX IF NOT EXISTS idx_ai_chats_client_studio_status ON ai_chats(client_account_id, studio_id, status);
CREATE INDEX IF NOT EXISTS idx_ai_chats_consultation_id ON ai_chats(consultation_id);

-- Prevents a race (double-click, two open tabs) from creating two concurrent
-- "active" chats for the same client+studio. Submitted chats are exempt —
-- a client can have any number of historical submitted chats over time.
CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_chats_one_active_per_client_studio
  ON ai_chats(client_account_id, studio_id) WHERE status = 'active';

ALTER TABLE ai_chats ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "ai_chats: client can select own"
    ON ai_chats FOR SELECT
    USING (client_account_id = my_client_account_id());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "ai_chats: client can insert own"
    ON ai_chats FOR INSERT
    WITH CHECK (client_account_id = my_client_account_id());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "ai_chats: client can update own"
    ON ai_chats FOR UPDATE
    USING  (client_account_id = my_client_account_id())
    WITH CHECK (client_account_id = my_client_account_id());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ──────────────────────────────────────────────────────────────
-- TABLE: ai_chat_messages
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_chat_messages (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id    UUID        NOT NULL REFERENCES ai_chats(id) ON DELETE CASCADE,

  role       TEXT        NOT NULL CHECK (role IN ('user', 'assistant')),
  content    TEXT        NOT NULL DEFAULT '',
  image_url  TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_chat_id ON ai_chat_messages(chat_id, created_at);

ALTER TABLE ai_chat_messages ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "ai_chat_messages: client can select own"
    ON ai_chat_messages FOR SELECT
    USING (EXISTS (
      SELECT 1 FROM ai_chats c
      WHERE c.id = chat_id AND c.client_account_id = my_client_account_id()
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "ai_chat_messages: client can insert own"
    ON ai_chat_messages FOR INSERT
    WITH CHECK (EXISTS (
      SELECT 1 FROM ai_chats c
      WHERE c.id = chat_id AND c.client_account_id = my_client_account_id()
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- No owner/artist SELECT policy — the resulting `consultations` row (see
-- lib/ai-consultation/submit.ts) is how the studio sees the outcome. Reading
-- the raw chat transcript from the owner dashboard is out of scope for this
-- step (see memory: project_client_portal_ai_consultation).
