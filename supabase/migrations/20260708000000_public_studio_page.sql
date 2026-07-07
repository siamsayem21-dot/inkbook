-- =============================================================
-- InkBook — Public Studio Page content
-- Adds the data needed by the redesigned /book/[studio] page:
--   - studios.about            free-text "About the Studio" blurb
--   - reviews                  studio-scoped client testimonials
--   - portfolio_images         artist portfolio photos (indexes the
--                              existing "portfolios" storage bucket)
-- =============================================================

-- ──────────────────────────────────────────────────────────────
-- studios.about
-- ──────────────────────────────────────────────────────────────
ALTER TABLE studios
  ADD COLUMN IF NOT EXISTS about TEXT;

-- ──────────────────────────────────────────────────────────────
-- TABLE: reviews
-- ──────────────────────────────────────────────────────────────
CREATE TABLE reviews (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id    UUID        NOT NULL REFERENCES studios(id) ON DELETE CASCADE,

  author_name  TEXT        NOT NULL,
  rating       SMALLINT    NOT NULL CHECK (rating BETWEEN 1 AND 5),
  quote        TEXT        NOT NULL,

  is_public    BOOLEAN     NOT NULL DEFAULT TRUE,   -- shown on the public studio page
  is_active    BOOLEAN     NOT NULL DEFAULT TRUE,   -- owner can hide without deleting
  sort_order   INTEGER     NOT NULL DEFAULT 0,

  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER reviews_updated_at
  BEFORE UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_reviews_studio_id ON reviews(studio_id);
CREATE INDEX idx_reviews_public    ON reviews(studio_id, is_public, is_active) WHERE is_public = TRUE AND is_active = TRUE;

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Anyone can view public, active reviews (shown on the public studio page)
CREATE POLICY "reviews: public can select public"
  ON reviews FOR SELECT
  USING (is_public = TRUE AND is_active = TRUE);

-- Owner can manage all reviews for their studio
CREATE POLICY "reviews: owner can select"
  ON reviews FOR SELECT
  USING (studio_id = my_studio_id());

CREATE POLICY "reviews: owner can insert"
  ON reviews FOR INSERT
  WITH CHECK (studio_id = my_studio_id());

CREATE POLICY "reviews: owner can update"
  ON reviews FOR UPDATE
  USING  (studio_id = my_studio_id())
  WITH CHECK (studio_id = my_studio_id());

CREATE POLICY "reviews: owner can delete"
  ON reviews FOR DELETE
  USING (studio_id = my_studio_id());

-- ──────────────────────────────────────────────────────────────
-- TABLE: portfolio_images
-- Indexes photos already uploaded to the "portfolios" storage
-- bucket (see 20260527000002_storage.sql) so they can be listed
-- on the public studio page and artist dashboard.
-- ──────────────────────────────────────────────────────────────
CREATE TABLE portfolio_images (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id    UUID        NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  artist_id    UUID        NOT NULL REFERENCES artists(id) ON DELETE CASCADE,

  image_url    TEXT        NOT NULL,
  style        TEXT,

  is_active    BOOLEAN     NOT NULL DEFAULT TRUE,
  sort_order   INTEGER     NOT NULL DEFAULT 0,

  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER portfolio_images_updated_at
  BEFORE UPDATE ON portfolio_images
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_portfolio_images_studio_id ON portfolio_images(studio_id);
CREATE INDEX idx_portfolio_images_artist_id ON portfolio_images(artist_id);
CREATE INDEX idx_portfolio_images_active    ON portfolio_images(studio_id, is_active) WHERE is_active = TRUE;

ALTER TABLE portfolio_images ENABLE ROW LEVEL SECURITY;

-- Anyone can view active portfolio images (shown on the public studio page)
CREATE POLICY "portfolio_images: public can select active"
  ON portfolio_images FOR SELECT
  USING (is_active = TRUE);

-- Owner can manage all portfolio images in their studio
CREATE POLICY "portfolio_images: owner can select"
  ON portfolio_images FOR SELECT
  USING (studio_id = my_studio_id());

CREATE POLICY "portfolio_images: owner can insert"
  ON portfolio_images FOR INSERT
  WITH CHECK (studio_id = my_studio_id());

CREATE POLICY "portfolio_images: owner can update"
  ON portfolio_images FOR UPDATE
  USING  (studio_id = my_studio_id())
  WITH CHECK (studio_id = my_studio_id());

CREATE POLICY "portfolio_images: owner can delete"
  ON portfolio_images FOR DELETE
  USING (studio_id = my_studio_id());

-- Artist can manage their own portfolio images
CREATE POLICY "portfolio_images: artist can select own"
  ON portfolio_images FOR SELECT
  USING (artist_id = my_artist_id());

CREATE POLICY "portfolio_images: artist can insert own"
  ON portfolio_images FOR INSERT
  WITH CHECK (
    artist_id = my_artist_id()
    AND studio_id = my_artist_studio_id()
  );

CREATE POLICY "portfolio_images: artist can update own"
  ON portfolio_images FOR UPDATE
  USING  (artist_id = my_artist_id())
  WITH CHECK (artist_id = my_artist_id());

CREATE POLICY "portfolio_images: artist can delete own"
  ON portfolio_images FOR DELETE
  USING (artist_id = my_artist_id());
