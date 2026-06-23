-- RPC: process_custom_request_deposit
--
-- Atomically processes a custom request deposit payment in a single transaction:
--   1. Acquires a row-level lock on custom_request (prevents concurrent processing)
--   2. Idempotency check via deposits.stripe_checkout_session_id (UNIQUE constraint)
--   3. Status guard: must be 'quoted' to proceed
--   4. Artist guard: artist_id must be set (bookings.artist_id is NOT NULL)
--   5. Client upsert: find or create the CRM record for this studio + email
--   6. INSERT booking (status: awaiting_schedule, date/time NULL)
--   7. INSERT deposit (status: paid, stripe session ID stored for idempotency)
--   8. UPDATE custom_request (status: accepted, booking_id linked)
--
-- Return JSON outcomes:
--   success           — all writes committed; booking_id returned
--   already_processed — deposits row found for session; returns existing booking_id
--   conflict          — custom_request status was not 'quoted'; no writes made
--   not_found         — custom_request UUID does not exist
--   missing_artist    — artist_id is null; booking cannot be created
--
-- SECURITY DEFINER: runs as the function owner, bypassing RLS.
-- Only reachable via the service-role key (createAdminClient).
--
-- Retry safety: if any step raises an exception the entire function rolls back.
-- The Stripe webhook returns 500 → Stripe retries → next attempt finds either
-- (a) the deposits row (idempotency hit → already_processed) or
-- (b) custom_request still in 'quoted' state → full re-execution succeeds.

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
  -- FOR UPDATE prevents a concurrent webhook delivery from racing through
  -- the idempotency and status checks simultaneously.
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
  -- If a deposit row already exists for this Stripe session this event was
  -- already processed — either by a prior successful run or a concurrent one.
  -- Return immediately without making any writes.
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
  -- Must be 'quoted' to proceed. Any other status means this request was already
  -- processed (accepted), declined, or is in an unexpected state. No writes made.
  IF v_cr.status != 'quoted' THEN
    RETURN json_build_object(
      'outcome',    'conflict',
      'booking_id', v_cr.booking_id
    );
  END IF;

  -- Step 4: Artist guard.
  -- bookings.artist_id is NOT NULL. A booking cannot be created without an
  -- assigned artist. The quote API (B2) enforces this at quote time; this guard
  -- catches any requests that bypassed that validation.
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
  -- Find the existing CRM record for this studio + email pair.
  -- If none exists, create one. LIMIT 1 handles the edge case where duplicates
  -- exist in the clients table before a unique constraint was added.
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
  -- date and time are NULL — the owner assigns them at the scheduling step.
  -- deposit_expires_at uses a far-future sentinel: the deposit is already paid
  -- so the 24-hour expiry window is irrelevant, but the column is NOT NULL.
  -- total_amount_cents carries the full session price from the quote so the
  -- remaining balance (total - deposit) is always computable on the booking row.
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
  -- stripe_checkout_session_id has a UNIQUE constraint (Migration 3).
  -- If this INSERT is reached on a Stripe retry after the booking was already
  -- created, it raises unique_violation which rolls back the entire function.
  -- Stripe retries — the next attempt hits the idempotency check in Step 2
  -- and returns already_processed cleanly.
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
  UPDATE custom_requests SET
    status                   = 'accepted',
    deposit_paid_at          = p_paid_at,
    stripe_payment_intent_id = p_payment_intent_id,
    booking_id               = v_booking_id,
    updated_at               = NOW()
  WHERE id = p_custom_request_id;

  RETURN json_build_object(
    'outcome',    'success',
    'booking_id', v_booking_id
  );
END;
$$;
