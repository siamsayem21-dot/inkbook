-- FIX: process_custom_request_deposit — remove reference to a column that
-- does not exist in production (custom_requests.updated_at).
--
-- Approved by Siam 2026-08-19: minimal one-line fix only. No new column, no
-- schema migration, no RLS/auth/Stripe config change — this file only
-- redefines this one function.
--
-- ROOT CAUSE (see DEFERRED_ISSUES.md #0 for full detail):
-- supabase/migrations/20260622000000_custom_requests.sql defines
-- custom_requests.updated_at (plus a trigger to maintain it), and this
-- function's original definition (supabase/migrations/20260623000005_
-- process_custom_request_deposit_rpc.sql, kept unmodified as the historical
-- record / backup of the prior definition) sets `updated_at = NOW()` in its
-- final UPDATE. But that column does not actually exist in the live
-- production `custom_requests` table — confirmed directly via a live
-- Supabase REST probe (`GET .../custom_requests?select=updated_at` →
-- `42703 column custom_requests.updated_at does not exist`), independent of
-- and unrelated to Stripe Connect. Every other column this function touches
-- (across custom_requests, bookings, deposits, clients) was individually
-- verified to genuinely exist in production before writing this fix — this
-- is confirmed to be the ONLY broken reference.
--
-- IMPACT BEFORE THIS FIX: every real client who paid a custom-request
-- deposit had their Stripe payment succeed while this function's final
-- UPDATE step threw `42703`, which — per this function's own "Retry safety"
-- design (any exception rolls back the entire transaction) — rolled back
-- the booking and deposit rows this same function had just inserted too.
-- Confirmed live: a completed TEST-mode Stripe payment ($50, real
-- `payment_status: "paid"` per Stripe's own API) left custom_requests.status
-- at "quoted" forever, with no booking created at all.
--
-- THE ONLY CHANGE: the final `UPDATE custom_requests SET ...` no longer
-- includes `updated_at = NOW()`. Every other line is byte-identical to the
-- original definition. No new column added — deliberately, per Siam's
-- explicit instruction not to add one.
--
-- Idempotent — CREATE OR REPLACE is always safe to re-run.

CREATE OR REPLACE FUNCTION process_custom_request_deposit(
  p_stripe_session_id   TEXT,
  p_custom_request_id   UUID,
  p_payment_intent_id   TEXT,
  p_paid_at             TIMESTAMPTZ
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cr               RECORD;
  v_existing_deposit RECORD;
  v_client_id        UUID;
  v_booking_id       UUID;
BEGIN
  -- Step 1: Lock the custom_request row.
  SELECT
    id, status, studio_id, artist_id,
    client_name, client_email, client_phone,
    style, design_description,
    deposit_amount, quote_amount,
    booking_id
  INTO v_cr
  FROM custom_requests
  WHERE id = p_custom_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('outcome', 'not_found');
  END IF;

  -- Step 2: Idempotency check.
  SELECT id, booking_id
  INTO v_existing_deposit
  FROM deposits
  WHERE stripe_checkout_session_id = p_stripe_session_id
  LIMIT 1;

  IF FOUND THEN
    RETURN json_build_object(
      'outcome',    'already_processed',
      'booking_id', v_existing_deposit.booking_id
    );
  END IF;

  -- Step 3: Status guard.
  IF v_cr.status != 'quoted' THEN
    RETURN json_build_object(
      'outcome',    'conflict',
      'booking_id', v_cr.booking_id
    );
  END IF;

  -- Step 4: Artist guard.
  IF v_cr.artist_id IS NULL THEN
    RETURN json_build_object('outcome', 'missing_artist');
  END IF;

  IF v_cr.deposit_amount IS NULL OR v_cr.deposit_amount <= 0 THEN
    RETURN json_build_object('outcome', 'missing_deposit_amount');
  END IF;

  IF v_cr.quote_amount IS NULL OR v_cr.quote_amount <= 0 THEN
    RETURN json_build_object('outcome', 'missing_quote_amount');
  END IF;

  -- Step 5: Client upsert.
  SELECT id INTO v_client_id
  FROM clients
  WHERE studio_id = v_cr.studio_id
    AND email     = v_cr.client_email
  LIMIT 1;

  IF v_client_id IS NULL THEN
    INSERT INTO clients (studio_id, full_name, email, phone)
    VALUES (v_cr.studio_id, v_cr.client_name, v_cr.client_email, v_cr.client_phone)
    RETURNING id INTO v_client_id;
  END IF;

  -- Step 6: Create the booking in awaiting_schedule state.
  INSERT INTO bookings (
    studio_id,
    artist_id,
    client_id,
    date,
    time,
    style,
    description,
    status,
    deposit_amount_cents,
    total_amount_cents,
    deposit_paid,
    deposit_paid_at,
    deposit_expires_at,
    remainder_collected
  ) VALUES (
    v_cr.studio_id,
    v_cr.artist_id,
    v_client_id,
    NULL,
    NULL,
    COALESCE(v_cr.style, 'Custom'),
    v_cr.design_description,
    'awaiting_schedule',
    ROUND(v_cr.deposit_amount * 100)::INTEGER,
    ROUND(v_cr.quote_amount  * 100)::INTEGER,
    TRUE,
    p_paid_at,
    p_paid_at + INTERVAL '100 years',
    FALSE
  )
  RETURNING id INTO v_booking_id;

  -- Step 7: Record the deposit payment.
  INSERT INTO deposits (
    booking_id,
    amount_cents,
    status,
    stripe_checkout_session_id,
    stripe_payment_intent_id,
    paid_at
  ) VALUES (
    v_booking_id,
    ROUND(v_cr.deposit_amount * 100)::INTEGER,
    'paid',
    p_stripe_session_id,
    p_payment_intent_id,
    p_paid_at
  );

  -- Step 8: Advance custom_request status and link the booking.
  -- FIX (2026-08-19): removed `updated_at = NOW()` — that column does not
  -- exist on custom_requests in production. Every other line below is
  -- unchanged from the original definition.
  UPDATE custom_requests SET
    status                   = 'accepted',
    deposit_paid_at          = p_paid_at,
    stripe_payment_intent_id = p_payment_intent_id,
    booking_id               = v_booking_id
  WHERE id = p_custom_request_id;

  RETURN json_build_object(
    'outcome',    'success',
    'booking_id', v_booking_id
  );
END;
$$;
