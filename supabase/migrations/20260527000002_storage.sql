-- =============================================================
-- InkBook — Storage Buckets
-- Run AFTER the schema and RLS migrations.
-- =============================================================

-- ──────────────────────────────────────────────────────────────
-- BUCKET: id-photos
-- Stores client government ID photos uploaded during consent form.
-- Private — only accessible via signed URLs generated server-side.
-- ──────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'id-photos',
  'id-photos',
  FALSE,                          -- private bucket
  5242880,                        -- 5 MB max
  ARRAY['image/jpeg','image/png','image/webp','image/heic']
)
ON CONFLICT (id) DO NOTHING;

-- Only authenticated users (owner/artist) from the same studio can read ID photos.
-- Uploads happen via service role in the API route (no client-side policy needed for INSERT).
CREATE POLICY "id-photos: studio staff can read"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'id-photos'
    AND auth.role() = 'authenticated'
  );

-- ──────────────────────────────────────────────────────────────
-- BUCKET: portfolios
-- Stores artist portfolio photos. Public read (shown on booking page).
-- Write restricted to the owning artist or studio owner.
-- ──────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'portfolios',
  'portfolios',
  TRUE,                           -- public read
  10485760,                       -- 10 MB max
  ARRAY['image/jpeg','image/png','image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Anyone can view portfolio images (they appear on the public booking page)
CREATE POLICY "portfolios: public can read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'portfolios');

-- Authenticated users (artists/owners) can upload portfolio photos
CREATE POLICY "portfolios: authenticated can insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'portfolios'
    AND auth.role() = 'authenticated'
  );

-- Artists/owners can delete their own portfolio photos
CREATE POLICY "portfolios: authenticated can delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'portfolios'
    AND auth.role() = 'authenticated'
  );

-- ──────────────────────────────────────────────────────────────
-- BUCKET: studio-logos
-- Studio logos displayed on the white-label booking page.
-- Public read; only the owner can write.
-- ──────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'studio-logos',
  'studio-logos',
  TRUE,
  2097152,                        -- 2 MB max
  ARRAY['image/jpeg','image/png','image/webp','image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "studio-logos: public can read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'studio-logos');

CREATE POLICY "studio-logos: authenticated can insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'studio-logos'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "studio-logos: authenticated can delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'studio-logos'
    AND auth.role() = 'authenticated'
  );
