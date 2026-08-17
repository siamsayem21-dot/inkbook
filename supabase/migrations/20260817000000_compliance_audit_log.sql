-- =============================================================
-- InkBook — Compliance Audit Log (V1 Completion Mission, Phase 6)
--
-- Append-only record of compliance-relevant events per studio: consent forms
-- signed, clients blacklisted/unblocked, bookings cancelled, no-shows marked.
-- Exists so a studio owner has a defensible paper trail if a client disputes
-- a charge, a no-show, or "I never signed anything."
--
-- Written exclusively via lib/audit-log.ts using the admin (service role)
-- client — there is deliberately no INSERT policy for the anon/authenticated
-- roles, since every write already goes through a server action or API route
-- that has already established the actor's identity. RLS here only needs to
-- gate reads.
--
-- Immutable by design: no UPDATE or DELETE policy, matching messages'
-- "no UPDATE/DELETE policy — immutable once sent" precedent
-- (20260713000000_client_studio_messaging.sql). A compliance log that could
-- be edited after the fact would defeat its own purpose.
--
-- Idempotent — safe to re-run.
-- =============================================================

CREATE TABLE IF NOT EXISTS audit_log (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id    UUID        NOT NULL REFERENCES studios(id) ON DELETE CASCADE,

  -- Who did it. actor_id is deliberately untyped/no-FK — it can point at
  -- auth.users (owner), artists.id (artist), or be NULL (system/cron) —
  -- actor_label carries a human-readable snapshot so the row stays readable
  -- even if the underlying account is later deleted.
  actor_type   TEXT        NOT NULL CHECK (actor_type IN ('owner', 'artist', 'client', 'system')),
  actor_id     UUID,
  actor_label  TEXT        NOT NULL,

  action       TEXT        NOT NULL,
  entity_type  TEXT        NOT NULL,
  entity_id    UUID,
  metadata     JSONB       NOT NULL DEFAULT '{}'::jsonb,

  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_studio_created ON audit_log(studio_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "audit_log: owner can select own studio"
    ON audit_log FOR SELECT
    USING (studio_id = my_studio_id());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
