-- Add Stripe billing columns to studios table
-- Run in: Supabase Dashboard → SQL Editor

ALTER TABLE studios
  ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'trialing'
    CHECK (subscription_status IN ('trialing', 'active', 'past_due', 'canceled', 'unpaid')),
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

CREATE INDEX IF NOT EXISTS idx_studios_stripe_customer_id  ON studios(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_studios_subscription_status ON studios(subscription_status);
