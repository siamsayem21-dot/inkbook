-- =============================================================
-- InkBook — Client ↔ Studio Messaging (Client Portal Phase B, Feature 1)
-- Adds real messaging between a client and a studio (owner + optionally an
-- assigned artist), replacing the ComingSoon placeholder at
-- /portal/[studio]/messages and fulfilling the TODO left in
-- askQuoteQuestion() (app/portal/[studio]/projects/[id]/actions.ts):
-- "a thread keyed by studio + client (+ optionally this project), a message
-- row insert, and a notification to the studio/artist."
--
--   - message_threads   one thread per (client, studio, project), plus at
--                       most one "general" (non-project) thread per
--                       (client, studio) — shaped directly after ai_chats
--   - messages          full transcript across 3 sender roles (client, owner,
--                       artist) — shaped directly after ai_chat_messages
--
-- No existing table is altered. consultations/artists/client_accounts/studios
-- are only referenced via FK.
--
-- Idempotent: safe to re-run — matches 20260710000000_ai_consultation_chat.sql's
-- own rationale (tables/indexes use IF NOT EXISTS, trigger is
-- dropped-and-recreated, policies are wrapped in DO blocks that swallow
-- duplicate_object).
-- =============================================================

-- ──────────────────────────────────────────────────────────────
-- TABLE: message_threads
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS message_threads (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id          UUID        NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  client_account_id  UUID        NOT NULL REFERENCES client_accounts(id) ON DELETE CASCADE,
  consultation_id    UUID        REFERENCES consultations(id) ON DELETE SET NULL,
  artist_id          UUID        REFERENCES artists(id) ON DELETE SET NULL,

  -- Read cursors. client_last_read_at is the client's own; studio_last_read_at
  -- is a single shared cursor updated by whichever studio staff member (owner
  -- or the assigned artist) reads the thread — matches this codebase's
  -- existing simplicity level (no per-participant read receipts anywhere
  -- else). See lib/messaging/threads.ts for how "unread" is derived from
  -- these two columns vs the latest message's created_at.
  client_last_read_at TIMESTAMPTZ,
  studio_last_read_at TIMESTAMPTZ,

  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- At most one thread per (client, studio, project) — and, via the second
-- index, at most one "general" (non-project) thread per (client, studio).
-- Same partial-unique-index technique ai_chats uses for "one active chat per
-- client+studio."
CREATE UNIQUE INDEX IF NOT EXISTS idx_message_threads_project
  ON message_threads(client_account_id, studio_id, consultation_id) WHERE consultation_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_message_threads_general
  ON message_threads(client_account_id, studio_id) WHERE consultation_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_message_threads_studio_updated ON message_threads(studio_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_message_threads_artist ON message_threads(artist_id) WHERE artist_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_message_threads_client_studio ON message_threads(client_account_id, studio_id);

DROP TRIGGER IF EXISTS message_threads_updated_at ON message_threads;
CREATE TRIGGER message_threads_updated_at
  BEFORE UPDATE ON message_threads
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE message_threads ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "message_threads: client can select own"
    ON message_threads FOR SELECT
    USING (client_account_id = my_client_account_id());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "message_threads: client can insert own"
    ON message_threads FOR INSERT
    WITH CHECK (client_account_id = my_client_account_id());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "message_threads: client can update own"
    ON message_threads FOR UPDATE
    USING  (client_account_id = my_client_account_id())
    WITH CHECK (client_account_id = my_client_account_id());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "message_threads: owner can select"
    ON message_threads FOR SELECT
    USING (studio_id = my_studio_id());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "message_threads: owner can insert"
    ON message_threads FOR INSERT
    WITH CHECK (studio_id = my_studio_id());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "message_threads: owner can update"
    ON message_threads FOR UPDATE
    USING  (studio_id = my_studio_id())
    WITH CHECK (studio_id = my_studio_id());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Artist: full participant on threads they're assigned to (see plan §4) —
-- can read/update threads with artist_id = my_artist_id(), and can also
-- proactively start a new thread with a client of their own studio.
DO $$ BEGIN
  CREATE POLICY "message_threads: artist can select own"
    ON message_threads FOR SELECT
    USING (artist_id = my_artist_id());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "message_threads: artist can insert own"
    ON message_threads FOR INSERT
    WITH CHECK (artist_id = my_artist_id() AND studio_id = my_artist_studio_id());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "message_threads: artist can update own"
    ON message_threads FOR UPDATE
    USING  (artist_id = my_artist_id())
    WITH CHECK (artist_id = my_artist_id());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ──────────────────────────────────────────────────────────────
-- TABLE: messages
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id                        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id                 UUID        NOT NULL REFERENCES message_threads(id) ON DELETE CASCADE,

  -- 'owner' needs no dedicated sender id column — a studio has exactly one
  -- owner (studios.owner_id), so thread.studio_id already disambiguates.
  sender_role               TEXT        NOT NULL CHECK (sender_role IN ('client', 'owner', 'artist')),
  sender_client_account_id  UUID        REFERENCES client_accounts(id) ON DELETE SET NULL,
  sender_artist_id          UUID        REFERENCES artists(id) ON DELETE SET NULL,

  content                   TEXT        NOT NULL DEFAULT '',
  image_url                 TEXT,

  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_thread_created ON messages(thread_id, created_at);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- No UPDATE/DELETE policy — immutable once sent, matching ai_chat_messages.

DO $$ BEGIN
  CREATE POLICY "messages: client can select own"
    ON messages FOR SELECT
    USING (EXISTS (
      SELECT 1 FROM message_threads t
      WHERE t.id = thread_id AND t.client_account_id = my_client_account_id()
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "messages: client can insert own"
    ON messages FOR INSERT
    WITH CHECK (
      sender_role = 'client'
      AND EXISTS (
        SELECT 1 FROM message_threads t
        WHERE t.id = thread_id AND t.client_account_id = my_client_account_id()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "messages: owner can select"
    ON messages FOR SELECT
    USING (EXISTS (
      SELECT 1 FROM message_threads t
      WHERE t.id = thread_id AND t.studio_id = my_studio_id()
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "messages: owner can insert"
    ON messages FOR INSERT
    WITH CHECK (
      sender_role = 'owner'
      AND EXISTS (
        SELECT 1 FROM message_threads t
        WHERE t.id = thread_id AND t.studio_id = my_studio_id()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "messages: artist can select own"
    ON messages FOR SELECT
    USING (EXISTS (
      SELECT 1 FROM message_threads t
      WHERE t.id = thread_id AND t.artist_id = my_artist_id()
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "messages: artist can insert own"
    ON messages FOR INSERT
    WITH CHECK (
      sender_role = 'artist'
      AND EXISTS (
        SELECT 1 FROM message_threads t
        WHERE t.id = thread_id AND t.artist_id = my_artist_id()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
