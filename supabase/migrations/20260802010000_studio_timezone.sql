-- =============================================================
-- InkBook — Studio Timezone
--
-- Appointment reminders (cron/sms-reminders) previously computed
-- "today" / "48 hours out" from the server's UTC clock alone, so a
-- studio far enough from UTC could have its day-of reminder fire on
-- the wrong calendar day. This adds an IANA timezone identifier per
-- studio so that logic can be judged against the studio's own local
-- date instead.
--
-- Defaults to 'UTC' — preserves today's actual (implicit-UTC) behavior
-- for every existing studio until an owner sets their real zone.
--
-- Idempotent — safe to re-run (ADD COLUMN IF NOT EXISTS).
-- =============================================================

ALTER TABLE studios
  ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'UTC';
