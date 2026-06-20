-- =============================================================
-- InkBook — Artist Invites
-- Creates the artist_invites table used by the invite flow.
-- Also makes artists.user_id nullable so deactivation works.
-- =============================================================

-- ──────────────────────────────────────────────────────────────
-- TABLE: artist_invites
-- One row per invite link. Token is the URL-safe UUID used in
-- /artist/accept/[token]. Accepted rows are retained for audit.
-- ──────────────────────────────────────────────────────────────
CREATE TABLE artist_invites (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id      UUID        NOT NULL REFERENCES studios(id)     ON DELETE CASCADE,
  invited_name   TEXT        NOT NULL,
  invited_email  TEXT        NOT NULL,
  invited_by     UUID        NOT NULL REFERENCES auth.users(id),
  token          UUID        NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  artist_id      UUID        REFERENCES artists(id),   -- filled when the artist accepts
  accepted_at    TIMESTAMPTZ,                          -- NULL until invite is used
  expires_at     TIMESTAMPTZ NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_artist_invites_studio_id ON artist_invites(studio_id);
CREATE INDEX idx_artist_invites_token     ON artist_invites(token);

-- ──────────────────────────────────────────────────────────────
-- RLS: artist_invites
-- All mutation paths use createAdminClient() (service role) so
-- they bypass RLS. These policies guard direct PostgREST access.
-- ──────────────────────────────────────────────────────────────
ALTER TABLE artist_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "artist_invites: owner can select"
  ON artist_invites FOR SELECT
  USING (studio_id = my_studio_id());

CREATE POLICY "artist_invites: owner can insert"
  ON artist_invites FOR INSERT
  WITH CHECK (studio_id = my_studio_id());

CREATE POLICY "artist_invites: owner can delete"
  ON artist_invites FOR DELETE
  USING (studio_id = my_studio_id());

-- ──────────────────────────────────────────────────────────────
-- ALTER artists: make user_id nullable
-- removeArtist() sets user_id = NULL to sever the auth link
-- while keeping the artist row for historical booking data.
-- The NOT NULL constraint blocks this without this change.
-- ──────────────────────────────────────────────────────────────
ALTER TABLE artists ALTER COLUMN user_id DROP NOT NULL;
