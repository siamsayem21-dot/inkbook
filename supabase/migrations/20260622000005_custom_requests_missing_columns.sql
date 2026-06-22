-- Patch missing columns on the production custom_requests table.
-- The table was created before these columns were added to the migration.
-- All statements are idempotent via ADD COLUMN IF NOT EXISTS.
ALTER TABLE custom_requests ADD COLUMN IF NOT EXISTS quote_amount             NUMERIC(10,2);
ALTER TABLE custom_requests ADD COLUMN IF NOT EXISTS quote_message            TEXT;
ALTER TABLE custom_requests ADD COLUMN IF NOT EXISTS deposit_amount           NUMERIC(10,2);
ALTER TABLE custom_requests ADD COLUMN IF NOT EXISTS artist_note              TEXT;
ALTER TABLE custom_requests ADD COLUMN IF NOT EXISTS declined_reason          TEXT;
ALTER TABLE custom_requests ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;
