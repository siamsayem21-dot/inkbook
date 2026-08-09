-- =============================================================
-- InkBook — Client Portal Studio page: public contact fields
-- Run this in: Supabase Dashboard → SQL Editor
-- =============================================================
--
-- Adds the public-facing studio contact fields the new Client Portal's
-- Studio page (/client-portal/[studio]/studio) needs for its Location &
-- Contact section. studios currently only has address/state
-- (20260527000000_initial_schema.sql) — there is no phone, public contact
-- email, or opening-hours column anywhere on this table. Same pattern as
-- 20260809000000_client_accounts_phone_dob.sql.
--
-- No RLS change needed — this table already has a public-readable path for
-- exactly this kind of public-facing content (see the "about" column added
-- in 20260708000000_public_studio_page.sql), and every read in this app
-- goes through the service-role client anyway.
--
-- All three nullable — a studio that hasn't set one simply omits that row
-- in Location & Contact rather than showing a fake value.
--
-- contact_email is deliberately separate from the studio owner's own
-- auth.users login email (studios.owner_id) — this is the public-facing
-- contact address a studio chooses to publish, not their sign-in credential.
--
-- hours is free text (e.g. "Mon–Fri 10am–7pm, Sat 11am–5pm, Sun Closed")
-- rather than a structured per-day schedule — matches this table's existing
-- style for descriptive fields (about TEXT) and avoids inventing a data
-- model the product hasn't asked for yet.
--
-- Idempotent — safe to re-run.
-- =============================================================

ALTER TABLE studios
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS contact_email TEXT,
  ADD COLUMN IF NOT EXISTS hours TEXT;
