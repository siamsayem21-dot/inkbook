-- =============================================================
-- InkBook — Row Level Security Policies
-- Run AFTER 20260527000000_initial_schema.sql
-- =============================================================
-- Access model:
--   OWNER  → full access to their studio's data
--   ARTIST → read/write their own data only
--   CLIENT → no Supabase auth account; public inserts only
--   SERVICE ROLE → bypasses RLS (used by API routes + webhooks)
-- =============================================================

-- ──────────────────────────────────────────────────────────────
-- HELPER FUNCTIONS
-- These keep policies readable and avoid repeated sub-selects.
-- ──────────────────────────────────────────────────────────────

-- Returns the studio_id owned by the current auth user (NULL if not an owner)
CREATE OR REPLACE FUNCTION my_studio_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT id FROM studios WHERE owner_id = auth.uid()
$$;

-- Returns the artist row id for the current auth user (NULL if not an artist)
CREATE OR REPLACE FUNCTION my_artist_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT id FROM artists WHERE user_id = auth.uid()
$$;

-- Returns the studio_id the current artist belongs to (NULL if not an artist)
CREATE OR REPLACE FUNCTION my_artist_studio_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT studio_id FROM artists WHERE user_id = auth.uid()
$$;

-- ──────────────────────────────────────────────────────────────
-- studios
-- ──────────────────────────────────────────────────────────────
ALTER TABLE studios ENABLE ROW LEVEL SECURITY;

-- Owners see their own studio; artists see the studio they work at
CREATE POLICY "studios: owner and artist can select"
  ON studios FOR SELECT
  USING (
    owner_id = auth.uid()
    OR id = my_artist_studio_id()
  );

-- Public can look up a studio by subdomain (needed for booking page)
CREATE POLICY "studios: public can select by subdomain"
  ON studios FOR SELECT
  USING (true);

-- Any authenticated user can create a studio (first-time onboarding)
CREATE POLICY "studios: owner can insert"
  ON studios FOR INSERT
  WITH CHECK (owner_id = auth.uid());

-- Only the owner can update their studio
CREATE POLICY "studios: owner can update"
  ON studios FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Only the owner can delete their studio
CREATE POLICY "studios: owner can delete"
  ON studios FOR DELETE
  USING (owner_id = auth.uid());

-- ──────────────────────────────────────────────────────────────
-- artists
-- ──────────────────────────────────────────────────────────────
ALTER TABLE artists ENABLE ROW LEVEL SECURITY;

-- Owner sees all artists in their studio; artist sees themselves
CREATE POLICY "artists: owner and self can select"
  ON artists FOR SELECT
  USING (
    studio_id = my_studio_id()
    OR user_id = auth.uid()
  );

-- Public can see artists for a studio (needed for booking page)
CREATE POLICY "artists: public can select"
  ON artists FOR SELECT
  USING (true);

-- Only owner can add artists to their studio
CREATE POLICY "artists: owner can insert"
  ON artists FOR INSERT
  WITH CHECK (studio_id = my_studio_id());

-- Owner can update any artist; artist can update their own profile fields
CREATE POLICY "artists: owner can update"
  ON artists FOR UPDATE
  USING (studio_id = my_studio_id())
  WITH CHECK (studio_id = my_studio_id());

CREATE POLICY "artists: self can update own profile"
  ON artists FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Only owner can remove an artist
CREATE POLICY "artists: owner can delete"
  ON artists FOR DELETE
  USING (studio_id = my_studio_id());

-- ──────────────────────────────────────────────────────────────
-- clients
-- ──────────────────────────────────────────────────────────────
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Owner and artists of the studio can view clients
CREATE POLICY "clients: owner and studio artists can select"
  ON clients FOR SELECT
  USING (
    studio_id = my_studio_id()
    OR studio_id = my_artist_studio_id()
  );

-- Anyone can create a client record (public booking flow, no auth required)
CREATE POLICY "clients: public can insert"
  ON clients FOR INSERT
  WITH CHECK (true);

-- Only owner or artist of the studio can update (e.g. add notes, ID photo)
CREATE POLICY "clients: owner and studio artists can update"
  ON clients FOR UPDATE
  USING (
    studio_id = my_studio_id()
    OR studio_id = my_artist_studio_id()
  );

-- Only owner can delete a client record
CREATE POLICY "clients: owner can delete"
  ON clients FOR DELETE
  USING (studio_id = my_studio_id());

-- ──────────────────────────────────────────────────────────────
-- bookings
-- ──────────────────────────────────────────────────────────────
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Owner sees all bookings in their studio; artist sees their own
CREATE POLICY "bookings: owner can select all"
  ON bookings FOR SELECT
  USING (studio_id = my_studio_id());

CREATE POLICY "bookings: artist can select own"
  ON bookings FOR SELECT
  USING (artist_id = my_artist_id());

-- Public can create a booking (no auth required in the booking flow)
CREATE POLICY "bookings: public can insert"
  ON bookings FOR INSERT
  WITH CHECK (true);

-- Owner can update any booking in their studio
CREATE POLICY "bookings: owner can update"
  ON bookings FOR UPDATE
  USING (studio_id = my_studio_id())
  WITH CHECK (studio_id = my_studio_id());

-- Artist can update their own bookings (mark no-show, completed, etc.)
CREATE POLICY "bookings: artist can update own"
  ON bookings FOR UPDATE
  USING (artist_id = my_artist_id())
  WITH CHECK (artist_id = my_artist_id());

-- Only owner can cancel / delete a booking
CREATE POLICY "bookings: owner can delete"
  ON bookings FOR DELETE
  USING (studio_id = my_studio_id());

-- ──────────────────────────────────────────────────────────────
-- deposits
-- Writes are handled exclusively by the service role (Stripe webhook API route).
-- Artists and owners can read deposit status.
-- ──────────────────────────────────────────────────────────────
ALTER TABLE deposits ENABLE ROW LEVEL SECURITY;

-- Owner can see all deposits for their studio's bookings
CREATE POLICY "deposits: owner can select"
  ON deposits FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = deposits.booking_id
        AND b.studio_id = my_studio_id()
    )
  );

-- Artist can see deposits for their own bookings
CREATE POLICY "deposits: artist can select own"
  ON deposits FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = deposits.booking_id
        AND b.artist_id = my_artist_id()
    )
  );

-- Inserts and updates come only from API routes using the service role key,
-- so no public/user-facing policies are needed for INSERT/UPDATE/DELETE.

-- ──────────────────────────────────────────────────────────────
-- consent_forms
-- Immutable after creation. Writes are public (booking flow).
-- ──────────────────────────────────────────────────────────────
ALTER TABLE consent_forms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "consent_forms: owner can select"
  ON consent_forms FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = consent_forms.booking_id
        AND b.studio_id = my_studio_id()
    )
  );

CREATE POLICY "consent_forms: artist can select own"
  ON consent_forms FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = consent_forms.booking_id
        AND b.artist_id = my_artist_id()
    )
  );

-- Public can insert during the booking flow
CREATE POLICY "consent_forms: public can insert"
  ON consent_forms FOR INSERT
  WITH CHECK (true);

-- No UPDATE or DELETE — consent forms are a legal record

-- ──────────────────────────────────────────────────────────────
-- blacklist
-- ──────────────────────────────────────────────────────────────
ALTER TABLE blacklist ENABLE ROW LEVEL SECURITY;

-- Owner and artists of the studio can view the blacklist
CREATE POLICY "blacklist: owner and studio artists can select"
  ON blacklist FOR SELECT
  USING (
    studio_id = my_studio_id()
    OR studio_id = my_artist_studio_id()
  );

-- Public (booking flow) can check if a client is blacklisted via the
-- is_client_blacklisted() function (SECURITY DEFINER) — no direct SELECT needed

-- Owner and studio artists can add to the blacklist
CREATE POLICY "blacklist: owner can insert"
  ON blacklist FOR INSERT
  WITH CHECK (studio_id = my_studio_id());

CREATE POLICY "blacklist: studio artist can insert"
  ON blacklist FOR INSERT
  WITH CHECK (studio_id = my_artist_studio_id());

-- Only owner can remove from the blacklist
CREATE POLICY "blacklist: owner can delete"
  ON blacklist FOR DELETE
  USING (studio_id = my_studio_id());

-- ──────────────────────────────────────────────────────────────
-- session_agreements
-- Immutable after signing. Artist creates, owner and artist can read.
-- ──────────────────────────────────────────────────────────────
ALTER TABLE session_agreements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "session_agreements: owner can select"
  ON session_agreements FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM artists a
      WHERE a.id = session_agreements.artist_id
        AND a.studio_id = my_studio_id()
    )
  );

CREATE POLICY "session_agreements: artist can select own"
  ON session_agreements FOR SELECT
  USING (artist_id = my_artist_id());

-- Only the assigned artist can create a session agreement
CREATE POLICY "session_agreements: artist can insert own"
  ON session_agreements FOR INSERT
  WITH CHECK (artist_id = my_artist_id());

-- No UPDATE or DELETE — session agreements are a legal record

-- ──────────────────────────────────────────────────────────────
-- waitlist
-- ──────────────────────────────────────────────────────────────
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "waitlist: owner can select"
  ON waitlist FOR SELECT
  USING (studio_id = my_studio_id());

CREATE POLICY "waitlist: artist can select own"
  ON waitlist FOR SELECT
  USING (artist_id = my_artist_id());

-- Public can join the waitlist (booking flow)
CREATE POLICY "waitlist: public can insert"
  ON waitlist FOR INSERT
  WITH CHECK (true);

-- Owner and artist can update (e.g. mark notified = true)
CREATE POLICY "waitlist: owner can update"
  ON waitlist FOR UPDATE
  USING (studio_id = my_studio_id());

CREATE POLICY "waitlist: artist can update own"
  ON waitlist FOR UPDATE
  USING (artist_id = my_artist_id());

-- Owner can remove entries (slot opened, client no longer needed)
CREATE POLICY "waitlist: owner can delete"
  ON waitlist FOR DELETE
  USING (studio_id = my_studio_id());

CREATE POLICY "waitlist: artist can delete own"
  ON waitlist FOR DELETE
  USING (artist_id = my_artist_id());
