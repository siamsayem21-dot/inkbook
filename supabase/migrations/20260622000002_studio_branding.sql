-- =============================================================
-- InkBook — Studio Branding Columns
-- Adds white-label branding fields to the studios table.
--
-- These columns are read by /book/[studio] (public booking page)
-- to apply the studio's brand colors and font, and written by
-- the owner at /owner/settings/studio.
-- =============================================================

ALTER TABLE studios
  ADD COLUMN IF NOT EXISTS primary_color   TEXT NOT NULL DEFAULT '#D4AF37',
  ADD COLUMN IF NOT EXISTS secondary_color TEXT NOT NULL DEFAULT '#FFFFFF',
  ADD COLUMN IF NOT EXISTS font_choice     TEXT NOT NULL DEFAULT 'default'
    CHECK (font_choice IN ('default', 'bold', 'elegant'));
