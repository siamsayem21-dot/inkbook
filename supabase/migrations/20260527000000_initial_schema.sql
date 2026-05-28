-- =============================================================
-- InkBook — Initial Schema
-- Run this in: Supabase Dashboard → SQL Editor
-- =============================================================

-- ──────────────────────────────────────────────────────────────
-- EXTENSIONS
-- ──────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ──────────────────────────────────────────────────────────────
-- ENUMS
-- ──────────────────────────────────────────────────────────────
CREATE TYPE booking_status AS ENUM (
  'pending_deposit',  -- created, awaiting Stripe payment
  'confirmed',        -- deposit paid, appointment locked
  'completed',        -- session done
  'cancelled',        -- cancelled by owner / artist
  'no_show'           -- client never showed, deposit kept
);

CREATE TYPE deposit_status AS ENUM (
  'pending',   -- checkout session open, not yet paid
  'paid',      -- Stripe confirmed payment
  'refunded',  -- manually refunded by owner
  'kept'       -- no-show: deposit retained by studio
);

-- ──────────────────────────────────────────────────────────────
-- UPDATED_AT TRIGGER HELPER
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ──────────────────────────────────────────────────────────────
-- TABLE: studios
-- One row per tattoo studio. Owner is a Supabase auth user.
-- ──────────────────────────────────────────────────────────────
CREATE TABLE studios (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT        NOT NULL,
  subdomain           TEXT        NOT NULL UNIQUE,          -- bookings.{subdomain}.inkbook.app
  logo_url            TEXT,
  address             TEXT,
  state               TEXT,                                 -- US state / CA province, drives consent form template
  owner_id            UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  deposit_amount_cents INTEGER     NOT NULL DEFAULT 10000,  -- $100 default deposit; owner can change
  plan                TEXT        NOT NULL DEFAULT 'solo'   -- 'solo' | 'studio' | 'pro'
                      CHECK (plan IN ('solo','studio','pro')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER studios_updated_at
  BEFORE UPDATE ON studios
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_studios_owner_id  ON studios(owner_id);
CREATE INDEX idx_studios_subdomain ON studios(subdomain);

-- ──────────────────────────────────────────────────────────────
-- TABLE: artists
-- Each artist is a Supabase auth user invited by an owner.
-- ──────────────────────────────────────────────────────────────
CREATE TABLE artists (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id            UUID        NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  user_id              UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name                 TEXT        NOT NULL,
  email                TEXT        NOT NULL,
  bio                  TEXT,
  avatar_url           TEXT,
  minimum_rate_cents   INTEGER     NOT NULL DEFAULT 15000,  -- $150/hr floor set by owner
  styles               TEXT[]      NOT NULL DEFAULT '{}',   -- accepted tattoo styles
  monthly_booking_cap  INTEGER     NOT NULL DEFAULT 20,     -- max bookings per month before waitlist
  is_active            BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)                                          -- one artist record per auth user
);

CREATE TRIGGER artists_updated_at
  BEFORE UPDATE ON artists
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_artists_studio_id ON artists(studio_id);
CREATE INDEX idx_artists_user_id   ON artists(user_id);

-- ──────────────────────────────────────────────────────────────
-- TABLE: clients
-- No Supabase auth account. Created during the booking flow.
-- Identified by email + phone. Studio-scoped to support blacklist.
-- ──────────────────────────────────────────────────────────────
CREATE TABLE clients (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id    UUID        NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  full_name    TEXT        NOT NULL,
  email        TEXT        NOT NULL,
  phone        TEXT        NOT NULL,
  id_photo_url TEXT,                  -- uploaded on first booking, required before confirmed
  notes        TEXT,                  -- internal artist/owner notes
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_clients_studio_id ON clients(studio_id);
CREATE INDEX idx_clients_email     ON clients(studio_id, email);
CREATE INDEX idx_clients_phone     ON clients(studio_id, phone);

-- ──────────────────────────────────────────────────────────────
-- TABLE: bookings
-- Core table. Created when client submits the booking form.
-- Stays in 'pending_deposit' until Stripe webhook fires.
-- ──────────────────────────────────────────────────────────────
CREATE TABLE bookings (
  id                        UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id                 UUID           NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  artist_id                 UUID           NOT NULL REFERENCES artists(id) ON DELETE RESTRICT,
  client_id                 UUID           NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  date                      DATE           NOT NULL,
  time                      TIME           NOT NULL,
  style                     TEXT           NOT NULL,
  description               TEXT,
  status                    booking_status NOT NULL DEFAULT 'pending_deposit',
  deposit_amount_cents      INTEGER        NOT NULL,
  deposit_paid              BOOLEAN        NOT NULL DEFAULT FALSE,
  deposit_paid_at           TIMESTAMPTZ,
  deposit_kept              BOOLEAN        NOT NULL DEFAULT FALSE,
  deposit_expires_at        TIMESTAMPTZ    NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
  remainder_collected       BOOLEAN        NOT NULL DEFAULT FALSE,
  created_at                TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE TRIGGER bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_bookings_studio_id  ON bookings(studio_id);
CREATE INDEX idx_bookings_artist_id  ON bookings(artist_id);
CREATE INDEX idx_bookings_client_id  ON bookings(client_id);
CREATE INDEX idx_bookings_status     ON bookings(status);
CREATE INDEX idx_bookings_date       ON bookings(artist_id, date);

-- ──────────────────────────────────────────────────────────────
-- TABLE: deposits
-- Tracks the Stripe checkout session for each booking.
-- One-to-one with bookings.
-- ──────────────────────────────────────────────────────────────
CREATE TABLE deposits (
  id                         UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id                 UUID           NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  amount_cents               INTEGER        NOT NULL,
  status                     deposit_status NOT NULL DEFAULT 'pending',
  stripe_checkout_session_id TEXT,
  stripe_payment_intent_id   TEXT,
  paid_at                    TIMESTAMPTZ,
  refunded_at                TIMESTAMPTZ,
  created_at                 TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE TRIGGER deposits_updated_at
  BEFORE UPDATE ON deposits
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_deposits_booking_id                 ON deposits(booking_id);
CREATE INDEX idx_deposits_stripe_checkout_session_id ON deposits(stripe_checkout_session_id);
CREATE INDEX idx_deposits_stripe_payment_intent_id   ON deposits(stripe_payment_intent_id);

-- ──────────────────────────────────────────────────────────────
-- TABLE: consent_forms
-- Signed before the appointment is fully confirmed.
-- Immutable after creation (legal record).
-- ──────────────────────────────────────────────────────────────
CREATE TABLE consent_forms (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id        UUID        NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  client_id         UUID        NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  is_minor          BOOLEAN     NOT NULL DEFAULT FALSE,
  guardian_name     TEXT,
  guardian_signature TEXT,
  client_signature  TEXT        NOT NULL,
  id_photo_url      TEXT        NOT NULL,
  state_template    TEXT        NOT NULL,   -- e.g. 'CA', 'TX', 'ON'
  signed_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT minor_requires_guardian CHECK (
    is_minor = FALSE
    OR (guardian_name IS NOT NULL AND guardian_signature IS NOT NULL)
  )
);

CREATE INDEX idx_consent_forms_booking_id ON consent_forms(booking_id);
CREATE INDEX idx_consent_forms_client_id  ON consent_forms(client_id);

-- ──────────────────────────────────────────────────────────────
-- TABLE: blacklist
-- Studio-wide block. Checked at booking time against email + phone.
-- At least one of client_email / client_phone must be present.
-- ──────────────────────────────────────────────────────────────
CREATE TABLE blacklist (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id    UUID        NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  blocked_by   UUID        NOT NULL REFERENCES auth.users(id),
  client_email TEXT,
  client_phone TEXT,
  reason       TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT blacklist_needs_identifier CHECK (
    client_email IS NOT NULL OR client_phone IS NOT NULL
  )
);

CREATE INDEX idx_blacklist_studio_id    ON blacklist(studio_id);
CREATE INDEX idx_blacklist_email        ON blacklist(studio_id, client_email);
CREATE INDEX idx_blacklist_phone        ON blacklist(studio_id, client_phone);

-- ──────────────────────────────────────────────────────────────
-- TABLE: session_agreements
-- Sent at the start of each session to lock in design scope.
-- Immutable after signing.
-- ──────────────────────────────────────────────────────────────
CREATE TABLE session_agreements (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id         UUID        NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  artist_id          UUID        NOT NULL REFERENCES artists(id) ON DELETE RESTRICT,
  client_id          UUID        NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  design_description TEXT        NOT NULL,
  placement          TEXT        NOT NULL,
  agreed_price_cents INTEGER     NOT NULL,
  size_inches        TEXT,
  reference_images   TEXT[],     -- Supabase Storage URLs
  client_signature   TEXT        NOT NULL,
  signed_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_session_agreements_booking_id ON session_agreements(booking_id);
CREATE INDEX idx_session_agreements_artist_id  ON session_agreements(artist_id);

-- ──────────────────────────────────────────────────────────────
-- TABLE: waitlist
-- Added when artist hits monthly_booking_cap.
-- ──────────────────────────────────────────────────────────────
CREATE TABLE waitlist (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id       UUID        NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  artist_id       UUID        NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  client_id       UUID        NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  preferred_style TEXT,
  notes           TEXT,
  notified        BOOLEAN     NOT NULL DEFAULT FALSE,  -- TRUE once SMS sent about opening
  added_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (artist_id, client_id)                        -- prevent duplicate waitlist entries
);

CREATE INDEX idx_waitlist_studio_id ON waitlist(studio_id);
CREATE INDEX idx_waitlist_artist_id ON waitlist(artist_id);

-- ──────────────────────────────────────────────────────────────
-- FUNCTION: auto-cancel bookings with unpaid deposits
-- Call via Supabase pg_cron every 15 minutes:
--   SELECT cron.schedule('cancel-expired-deposits', '*/15 * * * *',
--     'SELECT cancel_expired_bookings()');
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION cancel_expired_bookings()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  cancelled_count INTEGER;
BEGIN
  UPDATE bookings
  SET status     = 'cancelled',
      updated_at = NOW()
  WHERE status            = 'pending_deposit'
    AND deposit_paid      = FALSE
    AND deposit_expires_at < NOW();

  GET DIAGNOSTICS cancelled_count = ROW_COUNT;
  RETURN cancelled_count;
END;
$$;

-- ──────────────────────────────────────────────────────────────
-- FUNCTION: check if a client is blacklisted at a studio
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION is_client_blacklisted(
  p_studio_id UUID,
  p_email     TEXT,
  p_phone     TEXT
)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM blacklist
    WHERE studio_id = p_studio_id
      AND (client_email = p_email OR client_phone = p_phone)
  );
$$;

-- ──────────────────────────────────────────────────────────────
-- FUNCTION: count confirmed bookings for artist in current month
-- Used to enforce monthly_booking_cap before allowing new bookings
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION artist_bookings_this_month(p_artist_id UUID)
RETURNS INTEGER LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT COUNT(*)::INTEGER
  FROM bookings
  WHERE artist_id = p_artist_id
    AND status    IN ('confirmed', 'completed')
    AND date_trunc('month', date::TIMESTAMPTZ) = date_trunc('month', NOW());
$$;
