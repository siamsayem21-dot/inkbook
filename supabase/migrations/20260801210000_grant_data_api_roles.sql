-- =============================================================
-- Grant Data API roles (anon, authenticated, service_role) access
-- to everything in the public schema.
-- =============================================================
-- Supabase's CLI/cloud stack no longer auto-exposes tables, sequences,
-- and functions created directly via migration SQL to the Data API
-- roles (the `auto_expose_new_tables` legacy toggle in config.toml is
-- deprecated, defaults to off, and is removed 2026-10-30). Because
-- every InkBook table was created by raw `CREATE TABLE` in migrations
-- rather than through the dashboard, none of them ever received the
-- underlying GRANTs — so every query, including ones from
-- service_role (which bypasses RLS but still needs the base table
-- grant), fails with "permission denied for table X" before RLS is
-- even evaluated.
--
-- This grants blanket table/sequence/function access to the three
-- Data API roles and sets default privileges so future objects get it
-- too. Actual per-row authorization still comes from the RLS policies
-- in 20260527000001_rls.sql and later — this migration only restores
-- the table-grant layer those policies depend on.
-- =============================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;
