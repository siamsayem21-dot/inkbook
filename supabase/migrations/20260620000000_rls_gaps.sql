-- =============================================================
-- InkBook — RLS Gap Patches
-- Covers three tables that were created after the initial RLS
-- migration (20260527000001_rls.sql) with no policies applied.
-- =============================================================

-- ──────────────────────────────────────────────────────────────
-- deposit_payments
-- Added in 20260619000003_stripe_deposit_payments.sql with no RLS.
-- Writes come exclusively from API routes via the service role key
-- (createAdminClient), so only SELECT policies are needed here.
-- ──────────────────────────────────────────────────────────────
ALTER TABLE deposit_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deposit_payments: owner can select"
  ON deposit_payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = deposit_payments.booking_id
        AND b.studio_id = my_studio_id()
    )
  );

CREATE POLICY "deposit_payments: artist can select own"
  ON deposit_payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = deposit_payments.booking_id
        AND b.artist_id = my_artist_id()
    )
  );

-- ──────────────────────────────────────────────────────────────
-- consultations
-- RLS was enabled in 20260618000000_consultations.sql but only
-- an owner policy and a public INSERT policy were added.
-- Artists at the studio had no SELECT/UPDATE access.
-- ──────────────────────────────────────────────────────────────

-- Artist can read consultations for their studio
CREATE POLICY "consultations: artist can select"
  ON consultations FOR SELECT
  USING (studio_id = my_artist_studio_id());

-- Artist can update status / quote fields on consultations
CREATE POLICY "consultations: artist can update"
  ON consultations FOR UPDATE
  USING (studio_id = my_artist_studio_id())
  WITH CHECK (studio_id = my_artist_studio_id());

-- ──────────────────────────────────────────────────────────────
-- standalone_consent_forms
-- Added in 20260529000001_standalone_consent.sql with no RLS.
-- Immutable after creation (legal record) — no UPDATE/DELETE.
-- ──────────────────────────────────────────────────────────────
ALTER TABLE standalone_consent_forms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "standalone_consent_forms: owner can select"
  ON standalone_consent_forms FOR SELECT
  USING (studio_id = my_studio_id());

CREATE POLICY "standalone_consent_forms: artist can select"
  ON standalone_consent_forms FOR SELECT
  USING (studio_id = my_artist_studio_id());

-- Public can sign during the walk-in flow (no auth required)
CREATE POLICY "standalone_consent_forms: public can insert"
  ON standalone_consent_forms FOR INSERT
  WITH CHECK (true);
