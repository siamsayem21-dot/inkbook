-- Adds deposit_paid_at timestamp to custom_requests.
-- Set explicitly by the Stripe webhook when status → "accepted".
-- Used for reliable monthly revenue bucketing (replaces updated_at heuristic).
ALTER TABLE custom_requests ADD COLUMN IF NOT EXISTS deposit_paid_at TIMESTAMPTZ;
