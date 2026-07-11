-- =============================================================
-- InkBook — Client Portal: Quote Acceptance
-- Run this in: Supabase Dashboard → SQL Editor
-- =============================================================
--
-- Adds the client-side "Accept Quote" signal that sits between a saved quote
-- (quote_status = 'saved', owner-side) and deposit payment (future step).
--
-- Nullable timestamp — presence means the client has accepted the quote.
-- Mirrors the existing bookings.deposit_paid_at / deposit_payments.paid_at
-- pattern already in this schema (event timestamp, no separate boolean column).
--
-- Deliberately NOT reusing consultations.quote_status ('none' | 'saved'): that
-- column means "the owner saved a quote" and is read by the owner dashboard
-- (app/(owner)/owner/consultations/[id]/ConsultationDetail.tsx and
-- page.tsx's self-heal check) — repurposing it for client acceptance would
-- break those existing checks. This is a separate, additive column instead.
--
-- Until this migration is run, every client portal page that shows the
-- ProjectTimeline (Dashboard, AI Consultation, Project Details) will fail to
-- load — they all select this column directly (lib/ai-consultation/session.ts,
-- lib/client-portal/projects.ts) — same behavior as every other migration in
-- this project (e.g. the owner /owner/consultations page's own
-- "Failed to load consultations. Run the migration first." message).
-- =============================================================

ALTER TABLE consultations
  ADD COLUMN IF NOT EXISTS quote_accepted_at TIMESTAMPTZ;
