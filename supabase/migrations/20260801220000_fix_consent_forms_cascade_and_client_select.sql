-- =============================================================
-- Fix: consent_forms cascade-delete + public client-insert RLS
-- =============================================================

-- ──────────────────────────────────────────────────────────────
-- 1. consent_forms.client_id is (deliberately, per
-- tests/db/schema-integrity.test.ts) ON DELETE RESTRICT — a consent
-- form should never silently vanish just because someone deletes a
-- client record directly. The bug is a *cascade-ordering* race, not
-- the delete action itself: deleting a studio cascades to its
-- clients (clients.studio_id CASCADE) and, independently, to its
-- bookings (bookings.studio_id CASCADE) which in turn cascades to
-- consent_forms (consent_forms.booking_id CASCADE). Postgres queues
-- these as ordinary AFTER-ROW triggers and doesn't guarantee the
-- client-row cascade runs after the booking-row cascade has already
-- removed the linked consent_forms row, so the RESTRICT check on
-- client_id can fire first and block the whole DELETE.
-- Making the constraint DEFERRABLE INITIALLY DEFERRED pushes its
-- check to transaction commit, by which point every cascade
-- triggered by the same statement (including the consent_forms
-- removal via booking_id) has already completed — so the check
-- always finds zero remaining references. This doesn't change
-- confdeltype ('r' == RESTRICT), so it stays consistent with the
-- schema-integrity ground truth and still blocks a standalone
-- `DELETE FROM clients` while a consent_forms row references it.
-- ──────────────────────────────────────────────────────────────
ALTER TABLE consent_forms DROP CONSTRAINT IF EXISTS consent_forms_client_id_fkey;
ALTER TABLE consent_forms
  ADD CONSTRAINT consent_forms_client_id_fkey
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE RESTRICT
  DEFERRABLE INITIALLY DEFERRED;

-- ──────────────────────────────────────────────────────────────
-- 2. "clients: public can insert" (20260527000001_rls.sql) lets an
-- anonymous booking-page visitor create a client row (WITH CHECK
-- true), but there was no SELECT policy granting anon visibility
-- into clients at all. Postgres enforces the table's SELECT
-- policies on the row returned by INSERT ... RETURNING (which is
-- what a chained `.select()` on the anon key compiles to) and
-- raises 42501 if none pass — even though the INSERT's own WITH
-- CHECK already succeeded. The public flow only needs the new
-- row's id back, so grant anon SELECT on that column only; the
-- PII columns (full_name, email, phone) stay unreadable to anon,
-- unlike the studio-scoped policy used by owners/artists.
-- ──────────────────────────────────────────────────────────────
REVOKE SELECT ON clients FROM anon;
GRANT SELECT (id) ON clients TO anon;

CREATE POLICY "clients: public can select id of own insert"
  ON clients FOR SELECT
  TO anon
  USING (true);
