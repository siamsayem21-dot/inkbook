-- Add missing style column to custom_requests.
-- The original CREATE TABLE in 20260622000000 included this column but it
-- was not present when the production table was first created.
ALTER TABLE custom_requests ADD COLUMN IF NOT EXISTS style TEXT;
