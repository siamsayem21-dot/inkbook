-- =============================================================
-- InkBook — Client Portal Settings: display name (Phase B, Feature 4)
-- Run this in: Supabase Dashboard → SQL Editor
-- =============================================================
--
-- Adds the one "future profile field" client_accounts' own RLS migration
-- (20260709000000_client_accounts.sql) already anticipated — its
-- "client can update own account row" UPDATE policy has existed since that
-- migration and already covers this column; no RLS change needed here.
--
-- Nullable — a client who never sets a name simply has NULL. Nothing else
-- in the app reads this column yet (Messaging/History keep using their own
-- existing consultations.client_name / email fallbacks unchanged); it is
-- purely additive.
-- =============================================================

ALTER TABLE client_accounts
  ADD COLUMN IF NOT EXISTS name TEXT;
