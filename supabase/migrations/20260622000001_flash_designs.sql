-- =============================================================
-- InkBook — Flash Designs
-- Creates the flash_designs table, indexes, and RLS policies.
--
-- Flash designs are pre-drawn tattoos that artists list for
-- clients to book. They appear on the public /book/[studio]
-- landing page and in the artist's flash gallery.
-- =============================================================

-- ──────────────────────────────────────────────────────────────
-- TABLE: flash_designs
-- ──────────────────────────────────────────────────────────────
CREATE TABLE flash_designs (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id      UUID        NOT NULL REFERENCES studios(id)  ON DELETE CASCADE,
  artist_id      UUID        NOT NULL REFERENCES artists(id)  ON DELETE CASCADE,

  title          TEXT        NOT NULL,
  description    TEXT,
  image_url      TEXT        NOT NULL,
  price          INTEGER     NOT NULL DEFAULT 0,  -- in cents
  category       TEXT,
  is_repeatable  BOOLEAN     NOT NULL DEFAULT TRUE,  -- can multiple clients book this design?
  is_available   BOOLEAN     NOT NULL DEFAULT TRUE,  -- actively listed for booking
  is_booked      BOOLEAN     NOT NULL DEFAULT FALSE, -- has been booked (for non-repeatable designs)

  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER flash_designs_updated_at
  BEFORE UPDATE ON flash_designs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_flash_designs_studio_id   ON flash_designs(studio_id);
CREATE INDEX idx_flash_designs_artist_id   ON flash_designs(artist_id);
CREATE INDEX idx_flash_designs_available   ON flash_designs(studio_id, is_available) WHERE is_available = TRUE;

-- ──────────────────────────────────────────────────────────────
-- RLS: flash_designs
-- Public booking page reads via createAdminClient() so RLS does
-- not apply there. Policies guard direct PostgREST queries.
-- ──────────────────────────────────────────────────────────────
ALTER TABLE flash_designs ENABLE ROW LEVEL SECURITY;

-- Anyone can view available flash (shown on the public booking page)
CREATE POLICY "flash_designs: public can select available"
  ON flash_designs FOR SELECT
  USING (is_available = TRUE);

-- Owner can manage all flash in their studio
CREATE POLICY "flash_designs: owner can select"
  ON flash_designs FOR SELECT
  USING (studio_id = my_studio_id());

CREATE POLICY "flash_designs: owner can insert"
  ON flash_designs FOR INSERT
  WITH CHECK (studio_id = my_studio_id());

CREATE POLICY "flash_designs: owner can update"
  ON flash_designs FOR UPDATE
  USING  (studio_id = my_studio_id())
  WITH CHECK (studio_id = my_studio_id());

CREATE POLICY "flash_designs: owner can delete"
  ON flash_designs FOR DELETE
  USING (studio_id = my_studio_id());

-- Artist can manage their own flash designs
CREATE POLICY "flash_designs: artist can select own"
  ON flash_designs FOR SELECT
  USING (artist_id = my_artist_id());

CREATE POLICY "flash_designs: artist can insert own"
  ON flash_designs FOR INSERT
  WITH CHECK (
    artist_id = my_artist_id()
    AND studio_id = my_artist_studio_id()
  );

CREATE POLICY "flash_designs: artist can update own"
  ON flash_designs FOR UPDATE
  USING  (artist_id = my_artist_id())
  WITH CHECK (artist_id = my_artist_id());

CREATE POLICY "flash_designs: artist can delete own"
  ON flash_designs FOR DELETE
  USING (artist_id = my_artist_id());
