-- =============================================================
-- InkBook — Custom Requests
-- Creates the custom_requests table, custom-requests storage
-- bucket, indexes, and RLS policies.
--
-- This table powers the entire Custom Request flow:
--   1. Client submits from /book/[studio]/custom
--   2. Owner/artist reviews at /owner/requests
--   3. Owner approves with a deposit amount (status → "quoted")
--   4. Client pays deposit via Stripe (status → "accepted")
--   5. Webhook branch B in /api/stripe/webhook handles the event
-- =============================================================

-- ──────────────────────────────────────────────────────────────
-- TABLE: custom_requests
-- ──────────────────────────────────────────────────────────────
CREATE TABLE custom_requests (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id                UUID        NOT NULL REFERENCES studios(id)  ON DELETE CASCADE,
  artist_id                UUID                 REFERENCES artists(id)  ON DELETE SET NULL,

  -- Client info
  client_name              TEXT        NOT NULL,
  client_email             TEXT        NOT NULL,
  client_phone             TEXT        NOT NULL,

  -- Design details
  style                    TEXT,
  design_description       TEXT        NOT NULL,
  placement                TEXT        NOT NULL,
  size                     TEXT        NOT NULL,
  budget_range             TEXT        NOT NULL,
  preferred_dates          TEXT        NOT NULL DEFAULT '',
  reference_photos         TEXT[]      NOT NULL DEFAULT '{}',

  -- Lifecycle
  status                   TEXT        NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending', 'quoted', 'accepted', 'declined', 'completed')),

  -- Quote fields (set by owner/artist when approving)
  quote_amount             NUMERIC(10,2),
  quote_message            TEXT,
  deposit_amount           NUMERIC(10,2),
  artist_note              TEXT,
  declined_reason          TEXT,

  -- Stripe (set by webhook after client pays)
  stripe_payment_intent_id TEXT,

  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER custom_requests_updated_at
  BEFORE UPDATE ON custom_requests
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_custom_requests_studio_id ON custom_requests(studio_id);
CREATE INDEX idx_custom_requests_artist_id ON custom_requests(artist_id);
CREATE INDEX idx_custom_requests_status    ON custom_requests(studio_id, status);

-- ──────────────────────────────────────────────────────────────
-- RLS: custom_requests
-- All mutations use createAdminClient() (service role) so they
-- bypass RLS. Policies guard direct PostgREST access.
-- ──────────────────────────────────────────────────────────────
ALTER TABLE custom_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "custom_requests: owner can select"
  ON custom_requests FOR SELECT
  USING (studio_id = my_studio_id());

CREATE POLICY "custom_requests: owner can update"
  ON custom_requests FOR UPDATE
  USING  (studio_id = my_studio_id())
  WITH CHECK (studio_id = my_studio_id());

CREATE POLICY "custom_requests: artist can select"
  ON custom_requests FOR SELECT
  USING (studio_id = my_artist_studio_id());

CREATE POLICY "custom_requests: artist can update"
  ON custom_requests FOR UPDATE
  USING  (studio_id = my_artist_studio_id())
  WITH CHECK (studio_id = my_artist_studio_id());

-- ──────────────────────────────────────────────────────────────
-- STORAGE BUCKET: custom-requests
-- Stores reference photos uploaded by clients when submitting a
-- custom request or consultation. Public read so images are
-- visible when the owner reviews the request.
-- Uploads go through createAdminClient() and bypass storage RLS.
-- ──────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'custom-requests',
  'custom-requests',
  TRUE,
  5242880,                        -- 5 MB max
  ARRAY['image/jpeg','image/png','image/webp']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "custom-requests: public can read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'custom-requests');

CREATE POLICY "custom-requests: authenticated can insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'custom-requests'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "custom-requests: authenticated can delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'custom-requests'
    AND auth.role() = 'authenticated'
  );
