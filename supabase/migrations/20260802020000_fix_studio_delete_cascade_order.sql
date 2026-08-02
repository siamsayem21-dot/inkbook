-- =============================================================
-- Fix: deterministic delete order for studios -> bookings
-- =============================================================
-- Deleting a studio cascades along two independent sibling paths at
-- once: studios -> clients (CASCADE) and studios -> bookings (CASCADE)
-- -> consent_forms/session_agreements (CASCADE via booking_id). Making
-- consent_forms.client_id DEFERRABLE INITIALLY DEFERRED (see
-- 20260801220000) was expected to push its RESTRICT check to commit
-- time, after every same-statement cascade had finished — but in
-- practice (confirmed via CI diagnostics) the deferred check still
-- fires before the sibling bookings->consent_forms cascade has
-- removed the row it's checking, so the studio delete keeps failing
-- with "violates foreign key constraint consent_forms_client_id_fkey".
--
-- Rather than continue to depend on cascade-firing order between two
-- independent sibling CASCADE paths (which this project's Postgres
-- version does not appear to resolve the way deferred-constraint
-- docs would suggest), make the order explicit: a BEFORE DELETE
-- trigger on studios pre-deletes all of its bookings (and, through
-- their own ON DELETE CASCADE, deposits/consent_forms/
-- session_agreements) before Postgres's standard AFTER-ROW cascade
-- triggers for clients and artists even run. By the time those
-- sibling cascades fire, nothing booking-shaped references this
-- studio's clients/artists any more, so their RESTRICT checks always
-- pass regardless of trigger-firing order.
-- =============================================================

CREATE OR REPLACE FUNCTION delete_studio_bookings_first() RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM bookings WHERE studio_id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER studios_delete_bookings_first
  BEFORE DELETE ON studios
  FOR EACH ROW EXECUTE FUNCTION delete_studio_bookings_first();
