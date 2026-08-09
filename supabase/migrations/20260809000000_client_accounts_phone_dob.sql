-- =============================================================
-- InkBook — Client Portal My Profile: phone number + date of birth
-- Run this in: Supabase Dashboard → SQL Editor
-- =============================================================
--
-- Adds the two remaining "future profile fields" client_accounts' own RLS
-- migration (20260709000000_client_accounts.sql) already anticipated —
-- exactly the same pattern as name (20260714000000_client_accounts_name.sql).
-- That migration's "client can update own account row" UPDATE policy has
-- existed since 20260709000000 and already covers these columns too; no RLS
-- change needed here.
--
-- Both nullable — a client who never sets them simply has NULL, which the
-- My Profile page already renders as "Not provided". Nothing else in the app
-- reads these columns yet; this is purely additive.
--
-- date_of_birth is DATE (not TIMESTAMPTZ) — a birth date has no meaningful
-- time-of-day or timezone component, matching standalone_consent_forms'
-- own date_of_birth column (20260529000001_standalone_consent.sql).
--
-- Idempotent — safe to re-run.
-- =============================================================

ALTER TABLE client_accounts
  ADD COLUMN IF NOT EXISTS phone_number TEXT,
  ADD COLUMN IF NOT EXISTS date_of_birth DATE;
