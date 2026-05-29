-- Standalone consent form — not tied to a booking.
-- Used for the public /book/[studio]/consent route (walk-ins, pre-visits, etc.)
-- The existing consent_forms table requires booking_id NOT NULL, so this is separate.

CREATE TABLE standalone_consent_forms (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id            UUID        NOT NULL REFERENCES studios(id) ON DELETE CASCADE,

  -- Client identity
  full_name            TEXT        NOT NULL,
  date_of_birth        DATE        NOT NULL,
  is_minor             BOOLEAN     NOT NULL DEFAULT FALSE,

  -- Health disclosures
  blood_thinner        BOOLEAN     NOT NULL DEFAULT FALSE,
  diabetic             BOOLEAN     NOT NULL DEFAULT FALSE,
  skin_condition       BOOLEAN     NOT NULL DEFAULT FALSE,
  pregnant             BOOLEAN     NOT NULL DEFAULT FALSE,

  -- Appointment details
  tattoo_placement     TEXT        NOT NULL,
  artist_name          TEXT        NOT NULL,
  design_description   TEXT        NOT NULL,

  -- Agreement
  agreed_to_aftercare  BOOLEAN     NOT NULL DEFAULT FALSE,
  client_signature     TEXT        NOT NULL,

  signed_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_standalone_consents_studio ON standalone_consent_forms(studio_id);
CREATE INDEX idx_standalone_consents_signed ON standalone_consent_forms(signed_at);
