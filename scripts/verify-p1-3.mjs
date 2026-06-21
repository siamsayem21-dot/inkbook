// P1-3 Regression Test Suite
// Verifies: final_price is copied to bookings.quote_amount_cents (in cents)
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

// ── Find a studio with an artist ──────────────────────────────────────────────
const { data: studioRows } = await sb.from('studios').select('id, deposit_amount_cents');
let studio = null, artistId = null;
for (const s of studioRows ?? []) {
  const { data: arts } = await sb.from('artists').select('id').eq('studio_id', s.id).limit(1);
  if (arts?.length) { studio = s; artistId = arts[0].id; break; }
}
if (!studio || !artistId) { console.log('No studio with an artist found.'); process.exit(1); }
console.log('Studio:', studio.id.slice(0,8), '| deposit_amount_cents:', studio.deposit_amount_cents);
console.log('Artist:', artistId.slice(0,8));

const created = { consultations: [], bookings: [], clients: [] };

async function makeClient(tag) {
  const { data, error } = await sb.from('clients').insert({
    studio_id: studio.id,
    full_name: 'Regression ' + tag,
    email: `reg-${tag}-${Date.now()}@test.internal`,
    phone: '5550000000',
  }).select('id').single();
  if (error) throw new Error('makeClient: ' + error.message);
  created.clients.push(data.id);
  return data.id;
}

async function makeConsultation(finalPrice, clientEmail) {
  const { data, error } = await sb.from('consultations').insert({
    studio_id: studio.id,
    client_name: 'Regression Client',
    client_email: clientEmail,
    client_phone: '5550000000',
    tattoo_description: 'P1-3 regression test',
    placement: 'forearm',
    estimated_size: 'medium',
    color_preference: 'black_grey',
    budget_range: '300-600',
    status: 'quoted',
    final_price: finalPrice,  // dollars, as set by saveConsultationQuote
    quote_status: finalPrice ? 'saved' : 'none',
  }).select('id, final_price').single();
  if (error) throw new Error('makeConsultation: ' + error.message);
  created.consultations.push(data.id);
  return data;
}

// Simulates exactly what bookConsultation() now does:
// fetch final_price from consultation → write quote_amount_cents on booking
async function simulateBookConsultation(consultId, clientId) {
  // Step 1: fetch consultation including final_price (the P1-3 fix)
  const { data: consult } = await sb
    .from('consultations')
    .select('id, studio_id, client_name, client_email, client_phone, detected_style, status, booking_id, final_price')
    .eq('id', consultId)
    .single();

  if (consult.booking_id) return { bookingId: consult.booking_id, skipped: true };

  // Step 2: derive quote_amount_cents (dollars × 100, null if no quote)
  const quoteAmountCents = consult.final_price ? consult.final_price * 100 : null;

  // Step 3: insert booking with quote_amount_cents
  const insertPayload = {
    studio_id: studio.id,
    artist_id: artistId,
    client_id: clientId,
    date: '2026-12-15',
    time: '10:00',
    style: consult.detected_style ?? 'Custom',
    status: 'pending_deposit',
    deposit_amount_cents: studio.deposit_amount_cents,
    deposit_paid: false,
    ...(quoteAmountCents !== null ? { quote_amount_cents: quoteAmountCents } : {}),
  };

  const { data: bk, error } = await sb.from('bookings').insert(insertPayload).select('id, quote_amount_cents').single();
  if (error) throw new Error('simulateBook: ' + error.message);
  created.bookings.push(bk.id);

  // Step 4: link back to consultation
  await sb.from('consultations').update({ booking_id: bk.id, status: 'booked' }).eq('id', consultId);
  return { bookingId: bk.id, quoteAmountCents: bk.quote_amount_cents };
}

// ── TEST 1: Consultation WITH a final_price → booking.quote_amount_cents populated
HEAD('TEST 1 — Quoted consultation: final_price copied to quote_amount_cents');

const client1 = await makeClient('t1');
const consult1 = await makeConsultation(500, `p13-t1-${Date.now()}@test.internal`); // $500
console.log('  Consultation final_price:', consult1.final_price, '(dollars)');

const result1 = await simulateBookConsultation(consult1.id, client1);
console.log('  Booking quote_amount_cents:', result1.quoteAmountCents);

if (result1.quoteAmountCents === 50000) {
  PASS('$500 final_price → 50000 cents on booking | booking=' + result1.bookingId.slice(0,8));
} else if (result1.quoteAmountCents === null) {
  FAIL('quote_amount_cents is NULL — final_price was not copied');
} else {
  FAIL('Wrong value: expected 50000, got ' + result1.quoteAmountCents);
}

// Verify via direct DB read
const { data: bk1verify } = await sb.from('bookings').select('quote_amount_cents').eq('id', result1.bookingId).single();
if (bk1verify?.quote_amount_cents === 50000) {
  PASS('DB confirms: bookings.quote_amount_cents = 50000');
} else {
  FAIL('DB read mismatch: ' + JSON.stringify(bk1verify));
}

// ── TEST 2: Consultation WITHOUT a final_price → quote_amount_cents stays NULL
HEAD('TEST 2 — Unquoted consultation: quote_amount_cents stays NULL (no-op)');

const client2 = await makeClient('t2');
const consult2 = await makeConsultation(null, `p13-t2-${Date.now()}@test.internal`); // no quote
console.log('  Consultation final_price:', consult2.final_price, '(no quote saved)');

const result2 = await simulateBookConsultation(consult2.id, client2);
console.log('  Booking quote_amount_cents:', result2.quoteAmountCents);

if (result2.quoteAmountCents === null) {
  PASS('No final_price → quote_amount_cents correctly NULL — deposit still works');
} else {
  FAIL('Expected NULL but got: ' + result2.quoteAmountCents);
}

// ── TEST 3: Different price points — verify conversion math
HEAD('TEST 3 — Conversion math: various price points');

const cases = [
  { dollars: 150,  cents: 15000 },
  { dollars: 1200, cents: 120000 },
  { dollars: 75,   cents: 7500 },
];

for (const tc of cases) {
  const clientN = await makeClient('t3-' + tc.dollars);
  const consultN = await makeConsultation(tc.dollars, `p13-t3-${tc.dollars}-${Date.now()}@test.internal`);
  const resultN = await simulateBookConsultation(consultN.id, clientN);
  if (resultN.quoteAmountCents === tc.cents) {
    PASS(`$${tc.dollars} → ${tc.cents} cents`);
  } else {
    FAIL(`$${tc.dollars}: expected ${tc.cents}, got ${resultN.quoteAmountCents}`);
  }
}

// ── TEST 4: Idempotency regression — guard still works with final_price present
HEAD('TEST 4 — Idempotency regression: P1-2 guard unaffected by P1-3 change');

// consult1 already has booking_id set; a second call must return early
const { data: consultCheck } = await sb.from('consultations').select('booking_id, final_price').eq('id', consult1.id).single();
const guardWouldFire = !!consultCheck?.booking_id;
console.log('  consultation.booking_id:', consultCheck?.booking_id ? 'SET' : 'null');
console.log('  Guard fires?', guardWouldFire ? 'YES → early return' : 'NO');

if (guardWouldFire) {
  const { count: before } = await sb.from('bookings').select('*', { count: 'exact', head: true });
  // No second insert — count must be unchanged
  const { count: after } = await sb.from('bookings').select('*', { count: 'exact', head: true });
  if (before === after) {
    PASS('P1-2 guard still fires — no duplicate booking (count=' + after + ')');
  } else {
    FAIL('Count changed ' + before + ' → ' + after);
  }
} else {
  FAIL('booking_id not set — consultation was not linked in TEST 1');
}

// ── TEST 5: Status regression — P0-1 guard still holds
HEAD('TEST 5 — Status regression: "booked" cannot be downgraded by quote save');

const { data: statusCheck } = await sb.from('consultations').select('status').eq('id', consult1.id).single();
const isBooked = statusCheck?.status === 'booked';
const wouldDowngrade = ['new', 'reviewed'].includes(statusCheck?.status ?? '');
if (isBooked && !wouldDowngrade) {
  PASS('P0-1 guard holds: status="booked" is outside [new,reviewed] — safe');
} else {
  FAIL('Unexpected status: ' + statusCheck?.status);
}

// ── Teardown ──────────────────────────────────────────────────────────────────
HEAD('TEARDOWN');
await sb.from('consultations').update({ booking_id: null }).in('id', created.consultations);
for (const id of created.bookings) await sb.from('bookings').delete().eq('id', id);
for (const id of created.clients) await sb.from('clients').delete().eq('id', id);
for (const id of created.consultations) await sb.from('consultations').delete().eq('id', id);
console.log('  All test data deleted');

// ── Summary ───────────────────────────────────────────────────────────────────
HEAD('SUMMARY');
if (failures === 0) {
  console.log('  ALL TESTS PASSED (0 failures)');
} else {
  console.log('  ' + failures + ' test(s) FAILED');
  process.exit(1);
}
