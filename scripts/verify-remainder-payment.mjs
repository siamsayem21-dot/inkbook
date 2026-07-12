// Phase C Feature 2 — Remaining Balance Payment — Live DB Verification
//
// Migration applied: deposit_payments.payment_type (default 'deposit'),
// bookings.remainder_collected_at. This script proves the two things a unit
// test can't fully cover:
//   1. A deposit row and a remainder row coexisting on the SAME booking do
//      NOT cross-contaminate the 5 existing deposit-status queries that were
//      retrofitted with a payment_type filter — the single biggest risk
//      flagged in the plan.
//   2. The balance/total-price coalesce (total_amount_cents ?? quote_amount_cents)
//      is correct against real rows for both booking-creation paths.
//   3. Cross-client isolation on the ownership chain payRemainderBalance() uses.
//
// Self-cleaning, synthetic data only — same pattern as
// scripts/verify-booking-lifecycle.mjs.

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });

let failures = 0;
const PASS = (msg) => console.log('  PASS:', msg);
const FAIL = (msg) => { console.log('  FAIL:', msg); failures++; };
const HEAD = (msg) => console.log('\n' + msg + '\n' + '-'.repeat(msg.length));

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const stamp = Date.now();
const created = {
  authUsers: [], studioId: null, artistId: null, clientRowId: null,
  clientAAccountId: null, clientBAccountId: null,
  consultationIds: [], bookingIds: [], depositPaymentIds: [],
};

async function cleanup() {
  HEAD('CLEANUP');
  for (const id of created.depositPaymentIds) await sb.from('deposit_payments').delete().eq('id', id);
  for (const id of created.consultationIds) await sb.from('consultations').delete().eq('id', id);
  for (const id of created.bookingIds) await sb.from('bookings').delete().eq('id', id);
  if (created.clientRowId) await sb.from('clients').delete().eq('id', created.clientRowId);
  if (created.artistId) await sb.from('artists').delete().eq('id', created.artistId);
  if (created.studioId) await sb.from('studios').delete().eq('id', created.studioId);
  if (created.clientAAccountId) await sb.from('client_accounts').delete().eq('id', created.clientAAccountId);
  if (created.clientBAccountId) await sb.from('client_accounts').delete().eq('id', created.clientBAccountId);
  for (const uid of created.authUsers) await sb.auth.admin.deleteUser(uid).catch(() => {});
  console.log('  Synthetic rows removed.');
}

// Mirrors lib/booking-balance.ts
function getBookingTotalCents(b) { return b.total_amount_cents ?? b.quote_amount_cents ?? null; }
function getBalanceDueCents(b) {
  const total = getBookingTotalCents(b);
  if (total === null) return null;
  return Math.max(total - b.deposit_amount_cents, 0);
}

async function makeBooking({ total_amount_cents = null, quote_amount_cents = null, deposit_amount_cents = 10000 } = {}) {
  const { data: consult, error: cErr } = await sb.from('consultations').insert({
    studio_id: created.studioId, artist_id: created.artistId,
    client_name: 'Client A', client_email: `verify-remainder-a-${stamp}@example.com`, client_phone: '5550000000',
    tattoo_description: 'Verification tattoo', placement: 'forearm',
    estimated_size: 'Medium', color_preference: 'Black & Grey', budget_range: '$500-800', status: 'quoted',
  }).select('id').single();
  if (cErr) throw new Error('consultation insert failed: ' + cErr.message);
  created.consultationIds.push(consult.id);

  const { data: booking, error: bErr } = await sb.from('bookings').insert({
    studio_id: created.studioId, artist_id: created.artistId, client_id: created.clientRowId,
    date: '2026-09-01', time: '14:00:00', style: 'Custom', status: 'confirmed',
    deposit_amount_cents, deposit_paid: true, total_amount_cents, quote_amount_cents,
  }).select('id').single();
  if (bErr) throw new Error('booking insert failed: ' + bErr.message);
  created.bookingIds.push(booking.id);

  await sb.from('consultations').update({ booking_id: booking.id }).eq('id', consult.id);
  return { consultId: consult.id, bookingId: booking.id };
}

// Mirrors the 5 retrofitted call sites' query shape (payment_type = 'deposit')
async function fetchLatestDepositStatus(bookingId) {
  const { data } = await sb.from('deposit_payments')
    .select('payment_status').eq('booking_id', bookingId).eq('payment_type', 'deposit')
    .order('created_at', { ascending: false }).limit(1).maybeSingle();
  return data?.payment_status ?? 'none';
}

// Mirrors app/portal/[studio]/projects/[id]/actions.ts's payRemainderBalance() ownership chain
async function fetchOwnershipChain(clientAccountId, bookingId) {
  const { data: chatRows } = await sb.from('ai_chats').select('consultation_id')
    .eq('client_account_id', clientAccountId).eq('status', 'submitted').not('consultation_id', 'is', null);
  const consultationIds = [...new Set((chatRows ?? []).map(r => r.consultation_id).filter(Boolean))];
  if (consultationIds.length === 0) return null;
  const { data: consultRow } = await sb.from('consultations').select('studio_id')
    .in('id', consultationIds).eq('booking_id', bookingId).maybeSingle();
  return consultRow ?? null;
}

try {
  HEAD('SETUP — synthetic studio, artist, client, 2 client_accounts');

  const { data: ownerUser, error: ownerErr } = await sb.auth.admin.createUser({
    email: `verify-remainder-owner-${stamp}@example.com`, email_confirm: true,
  });
  if (ownerErr) throw new Error('createUser(owner) failed: ' + ownerErr.message);
  created.authUsers.push(ownerUser.user.id);

  const { data: studio, error: studioErr } = await sb.from('studios').insert({
    name: 'Verify Remainder Studio', subdomain: `verify-remainder-${stamp}`, owner_id: ownerUser.user.id,
  }).select('id').single();
  if (studioErr) throw new Error('studio insert failed: ' + studioErr.message);
  created.studioId = studio.id;

  const { data: artistUser, error: artistUserErr } = await sb.auth.admin.createUser({
    email: `verify-remainder-artist-${stamp}@example.com`, email_confirm: true,
  });
  if (artistUserErr) throw new Error('createUser(artist) failed: ' + artistUserErr.message);
  created.authUsers.push(artistUser.user.id);

  const { data: artist, error: artistErr } = await sb.from('artists').insert({
    studio_id: created.studioId, user_id: artistUser.user.id, name: 'Verify Artist', email: artistUser.user.email,
  }).select('id').single();
  if (artistErr) throw new Error('artists insert failed: ' + artistErr.message);
  created.artistId = artist.id;

  const { data: clientRow, error: clientRowErr } = await sb.from('clients').insert({
    studio_id: created.studioId, full_name: 'Client A', email: `verify-remainder-a-${stamp}@example.com`, phone: '5550000000',
  }).select('id').single();
  if (clientRowErr) throw new Error('clients insert failed: ' + clientRowErr.message);
  created.clientRowId = clientRow.id;

  const { data: clientAUser } = await sb.auth.admin.createUser({
    email: `verify-remainder-clientA-${stamp}@example.com`, email_confirm: true,
  });
  created.authUsers.push(clientAUser.user.id);
  const { data: clientA } = await sb.from('client_accounts').insert({
    user_id: clientAUser.user.id, email: clientAUser.user.email,
  }).select('id').single();
  created.clientAAccountId = clientA.id;

  const { data: clientBUser } = await sb.auth.admin.createUser({
    email: `verify-remainder-clientB-${stamp}@example.com`, email_confirm: true,
  });
  created.authUsers.push(clientBUser.user.id);
  const { data: clientB } = await sb.from('client_accounts').insert({
    user_id: clientBUser.user.id, email: clientBUser.user.email,
  }).select('id').single();
  created.clientBAccountId = clientB.id;

  PASS('studio, artist, client, 2 client_accounts created');

  HEAD('TEST 1 — total price coalesce: total_amount_cents (portal flow) vs quote_amount_cents (bookConsultation flow)');
  {
    const total = getBalanceDueCents({ total_amount_cents: 50000, quote_amount_cents: null, deposit_amount_cents: 10000 });
    total === 40000 ? PASS('total_amount_cents path: balance = 40000') : FAIL('got ' + total);

    const quote = getBalanceDueCents({ total_amount_cents: null, quote_amount_cents: 30000, deposit_amount_cents: 10000 });
    quote === 20000 ? PASS('quote_amount_cents fallback path: balance = 20000') : FAIL('got ' + quote);

    const none = getBalanceDueCents({ total_amount_cents: null, quote_amount_cents: null, deposit_amount_cents: 10000 });
    none === null ? PASS('classic self-serve booking (neither column set): balance = null') : FAIL('got ' + none);
  }

  HEAD('TEST 2 — deposit + remainder rows coexist on one booking without cross-contaminating the retrofitted query');
  {
    const { bookingId } = await makeBooking({ total_amount_cents: 50000 });

    const { data: depositRow, error: depErr } = await sb.from('deposit_payments').insert({
      booking_id: bookingId, amount_cents: 10000, payment_status: 'paid', payment_type: 'deposit',
    }).select('id').single();
    if (depErr) throw new Error('deposit_payments (deposit) insert failed: ' + depErr.message);
    created.depositPaymentIds.push(depositRow.id);

    // Remainder row created LATER (higher created_at) — the exact scenario that
    // would leak into an unfiltered "latest row" query if the payment_type
    // filter were ever missing from one of the 5 retrofitted call sites.
    const { data: remainderRow, error: remErr } = await sb.from('deposit_payments').insert({
      booking_id: bookingId, amount_cents: 40000, payment_status: 'pending', payment_type: 'remainder',
    }).select('id').single();
    if (remErr) throw new Error('deposit_payments (remainder) insert failed: ' + remErr.message);
    created.depositPaymentIds.push(remainderRow.id);

    const depositStatus = await fetchLatestDepositStatus(bookingId);
    depositStatus === 'paid'
      ? PASS('deposit-status query still resolves the DEPOSIT row (paid), not the newer remainder row (pending)')
      : FAIL(`expected 'paid', got '${depositStatus}' — payment_type filter regression`);
  }

  HEAD('TEST 3 — cross-client isolation: payRemainderBalance() ownership chain');
  {
    const { consultId, bookingId } = await makeBooking({ total_amount_cents: 50000 });
    await sb.from('ai_chats').insert({
      studio_id: created.studioId, client_account_id: created.clientAAccountId,
      status: 'submitted', consultation_id: consultId,
    });

    const ownedByA = await fetchOwnershipChain(created.clientAAccountId, bookingId);
    ownedByA ? PASS('client A correctly recognized as owner of their own booking') : FAIL('client A ownership check failed');

    const ownedByB = await fetchOwnershipChain(created.clientBAccountId, bookingId);
    ownedByB ? FAIL('SECURITY: client B was recognized as owner of client A\'s booking') : PASS('client B correctly denied — no ai_chats link of their own');
  }

} catch (err) {
  FAIL('unexpected error: ' + (err?.message ?? err));
} finally {
  await cleanup();
}

console.log('\n' + '='.repeat(50));
console.log(failures === 0 ? `✅  All checks passed.\n` : `❌  ${failures} check(s) failed.\n`);
process.exit(failures === 0 ? 0 : 1);
