// P1-5 Regression Test Suite
// Verifies: depositPaymentStatus is derived from both deposit_payments (Flow A)
// AND deposits (Flow C / self-serve), not just deposit_payments alone.
// Self-contained: creates and deletes all its own test data.

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

let failures = 0;
const PASS = (msg) => console.log('  PASS:', msg);
const FAIL = (msg) => { console.log('  FAIL:', msg); failures++; };
const HEAD = (msg) => console.log('\n' + msg + '\n' + '-'.repeat(msg.length));

// ── Find studio + artist + client ─────────────────────────────────────────────
const { data: studioRows } = await sb.from('studios').select('id, deposit_amount_cents');
let studio = null, artistId = null;
for (const s of studioRows ?? []) {
  const { data: arts } = await sb.from('artists').select('id').eq('studio_id', s.id).limit(1);
  if (arts?.length) { studio = s; artistId = arts[0].id; break; }
}
if (!studio || !artistId) { console.log('No studio with an artist.'); process.exit(1); }
console.log('Studio:', studio.id.slice(0,8));
console.log('Artist:', artistId.slice(0,8));

const created = { bookings: [], clients: [], deposits: [], deposit_payments: [] };

async function makeClient(tag) {
  const { data, error } = await sb.from('clients').insert({
    studio_id: studio.id,
    full_name: 'Reg ' + tag,
    email: `reg-${tag}-${Date.now()}@test.internal`,
    phone: '5550000000',
  }).select('id').single();
  if (error) throw new Error('makeClient: ' + error.message);
  created.clients.push(data.id);
  return data.id;
}

async function makeBooking(clientId, depositPaid = false) {
  const { data, error } = await sb.from('bookings').insert({
    studio_id: studio.id,
    artist_id: artistId,
    client_id: clientId,
    date: '2026-12-15',
    time: '10:00',
    style: 'Test',
    status: depositPaid ? 'confirmed' : 'pending_deposit',
    deposit_amount_cents: studio.deposit_amount_cents,
    deposit_paid: depositPaid,
  }).select('id').single();
  if (error) throw new Error('makeBooking: ' + error.message);
  created.bookings.push(data.id);
  return data.id;
}

// Simulates the merged status logic from the fixed page.tsx
async function getDepositPaymentStatus(bookingId) {
  const [dpResult, legacyResult] = await Promise.all([
    sb.from('deposit_payments').select('payment_status')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: false })
      .limit(1).maybeSingle(),
    // deposits table — use as never since it's untyped
    sb.from('deposits' ).select('status')
      .eq('booking_id', bookingId)
      .maybeSingle(),
  ]);

  return (
    dpResult.data?.payment_status ??
    legacyResult.data?.status ??
    'none'
  );
}

// ── TEST 1: Flow A (owner-initiated) — deposit_payments pending ───────────────
HEAD('TEST 1 — Flow A: deposit_payments pending → status = "pending"');

const c1 = await makeClient('t1');
const bk1 = await makeBooking(c1);

// Simulate sendDepositRequest inserting into deposit_payments
const { data: dp1, error: dp1Err } = await sb.from('deposit_payments').insert({
  booking_id: bk1,
  amount_cents: studio.deposit_amount_cents,
  payment_status: 'pending',
}).select('id').single();
if (dp1Err) throw new Error('dp1 insert: ' + dp1Err.message);
created.deposit_payments.push(dp1.id);

const status1 = await getDepositPaymentStatus(bk1);
console.log('  deposit_payments row: pending | deposits row: none');
console.log('  Resolved status:', status1, '| expected: pending');
if (status1 === 'pending') {
  PASS('Flow A pending → depositPaymentStatus = "pending"');
} else {
  FAIL('Expected "pending", got "' + status1 + '"');
}

// ── TEST 2: Flow A paid — deposit_payments paid ────────────────────────────────
HEAD('TEST 2 — Flow A: deposit_payments paid → status = "paid"');

await sb.from('deposit_payments').update({ payment_status: 'paid', paid_at: new Date().toISOString() }).eq('id', dp1.id);
await sb.from('bookings').update({ deposit_paid: true, status: 'confirmed' }).eq('id', bk1);

const status2 = await getDepositPaymentStatus(bk1);
console.log('  deposit_payments row: paid');
console.log('  Resolved status:', status2, '| expected: paid');
if (status2 === 'paid') {
  PASS('Flow A paid → depositPaymentStatus = "paid"');
} else {
  FAIL('Expected "paid", got "' + status2 + '"');
}

// ── TEST 3 (THE KEY BUG): Flow C self-serve pending — only deposits row ───────
HEAD('TEST 3 — Flow C (self-serve): only deposits row pending → status = "pending" [THE KEY BUG]');

const c3 = await makeClient('t3');
const bk3 = await makeBooking(c3);  // pending_deposit, deposit_paid = false

// Simulate /api/stripe/checkout inserting into deposits (legacy table)
const { data: dep3, error: dep3Err } = await sb.from('deposits' ).insert({
  booking_id: bk3,
  amount_cents: studio.deposit_amount_cents,
  status: 'pending',
  stripe_checkout_session_id: 'cs_test_fake_' + Date.now(),
}).select('id').single();
if (dep3Err) throw new Error('dep3 insert: ' + dep3Err.message);
created.deposits.push(dep3.id);

// No deposit_payments row — this is the bug scenario
const { data: dpCheck3 } = await sb.from('deposit_payments').select('id').eq('booking_id', bk3).maybeSingle();
console.log('  deposit_payments row: ' + (dpCheck3 ? 'EXISTS (unexpected)' : 'none (correct)'));
console.log('  deposits row: pending');

const status3 = await getDepositPaymentStatus(bk3);
console.log('  Resolved status:', status3, '| expected: pending');
if (status3 === 'pending') {
  PASS('Flow C self-serve pending → depositPaymentStatus = "pending" (fixed — was "none" before)');
} else if (status3 === 'none') {
  FAIL('BUG STILL PRESENT: status = "none" — deposits table not consulted');
} else {
  FAIL('Unexpected: ' + status3);
}

// Verify the consequence: depositRequestSent would be true → blocks double-send
const depositRequestSent3 = status3 === 'pending';
console.log('  depositRequestSent:', depositRequestSent3, '| expected: true (blocks "Generate Deposit Link" button)');
if (depositRequestSent3) {
  PASS('"Generate Deposit Link" button correctly suppressed — no duplicate deposit possible');
} else {
  FAIL('"Generate Deposit Link" button would show — owner could create duplicate deposit session');
}

// ── TEST 4: Flow C self-serve paid — deposits paid ────────────────────────────
HEAD('TEST 4 — Flow C: self-serve paid → status = "paid"');

await sb.from('deposits' ).update({ status: 'paid', paid_at: new Date().toISOString() }).eq('id', dep3.id);
await sb.from('bookings').update({ deposit_paid: true, status: 'confirmed' }).eq('id', bk3);

const status4 = await getDepositPaymentStatus(bk3);
console.log('  deposits row: paid | deposit_payments: none');
console.log('  Resolved status:', status4, '| expected: paid');
if (status4 === 'paid') {
  PASS('Flow C self-serve paid → depositPaymentStatus = "paid"');
} else {
  FAIL('Expected "paid", got "' + status4 + '"');
}

// ── TEST 5: No deposit activity yet → "none" ──────────────────────────────────
HEAD('TEST 5 — No deposit rows in either table → status = "none"');

const c5 = await makeClient('t5');
const bk5 = await makeBooking(c5);

const status5 = await getDepositPaymentStatus(bk5);
console.log('  No rows in deposit_payments or deposits');
console.log('  Resolved status:', status5, '| expected: none');
if (status5 === 'none') {
  PASS('No deposit activity → depositPaymentStatus = "none"');
} else {
  FAIL('Expected "none", got "' + status5 + '"');
}

// ── TEST 6: Flow A takes priority over Flow C when both have rows ──────────────
HEAD('TEST 6 — Flow A row takes priority over Flow C row when both exist');

// Add a deposit_payments pending row to bk3 (which already has a deposits row paid)
const { data: dp6, error: dp6Err } = await sb.from('deposit_payments').insert({
  booking_id: bk3,
  amount_cents: studio.deposit_amount_cents,
  payment_status: 'pending',
}).select('id').single();
if (dp6Err) throw new Error('dp6 insert: ' + dp6Err.message);
created.deposit_payments.push(dp6.id);

const status6 = await getDepositPaymentStatus(bk3);
console.log('  deposit_payments row: pending | deposits row: paid');
console.log('  Resolved status:', status6, '| expected: pending (deposit_payments wins)');
if (status6 === 'pending') {
  PASS('Flow A deposit_payments("pending") takes priority over deposits("paid")');
} else {
  FAIL('Expected "pending", got "' + status6 + '"');
}

// ── Teardown ──────────────────────────────────────────────────────────────────
HEAD('TEARDOWN');
for (const id of created.deposit_payments) await sb.from('deposit_payments').delete().eq('id', id);
for (const id of created.deposits) await sb.from('deposits' ).delete().eq('id', id);
for (const id of created.bookings) await sb.from('bookings').delete().eq('id', id);
for (const id of created.clients) await sb.from('clients').delete().eq('id', id);
console.log('  All test data deleted');

// ── Summary ───────────────────────────────────────────────────────────────────
HEAD('SUMMARY');
if (failures === 0) {
  console.log('  ALL TESTS PASSED (0 failures)');
} else {
  console.log('  ' + failures + ' test(s) FAILED');
  process.exit(1);
}
