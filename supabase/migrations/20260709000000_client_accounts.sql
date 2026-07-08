-- =============================================================
-- InkBook — Client Portal auth (Client Portal step 2)
-- Adds the identity table backing client Email OTP login:
--   - client_accounts   1:1 with auth.users for the "client" role,
--                       created on first successful OTP verification
-- =============================================================

-- ──────────────────────────────────────────────────────────────
-- TABLE: client_accounts
-- ──────────────────────────────────────────────────────────────
CREATE TABLE client_accounts (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,

  email        TEXT        NOT NULL,

  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER client_accounts_updated_at
  BEFORE UPDATE ON client_accounts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_client_accounts_email ON client_accounts(email);

ALTER TABLE client_accounts ENABLE ROW LEVEL SECURITY;

-- A client can read their own account row
CREATE POLICY "client_accounts: client can select own"
  ON client_accounts FOR SELECT
  USING (user_id = auth.uid());

-- A client can update their own account row (future profile fields)
CREATE POLICY "client_accounts: client can update own"
  ON client_accounts FOR UPDATE
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- No public/anon INSERT policy: the row is created server-side by the
-- service-role client right after OTP verification (see lib/auth/config.ts
-- ensureClientAccount / app/book/[studio]/portal/layout.tsx).
