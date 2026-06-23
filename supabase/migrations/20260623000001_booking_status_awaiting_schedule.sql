-- Migration: Add awaiting_schedule to booking_status enum.
-- Represents a booking created immediately after deposit payment,
-- before the owner has assigned a date and time.
-- IF NOT EXISTS makes this idempotent — safe to re-run.
-- Must be applied before Migration 2 which sets this status on inserts.

ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'awaiting_schedule' BEFORE 'confirmed';
