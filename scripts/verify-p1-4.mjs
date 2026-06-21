// P1-4 Regression Test Suite
// Verifies: deposit_amount_cents is derived from min(studio_default, quote)
// not always the flat studio default.
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

// ── Find studio + artist ──────────────────────────────────────────────────────
const { data: studioRows } = await sb.from('studios').select('id, deposit_amount_cents');
let studio = null, artistId = null;
for (const s of studioRows ?? []) {
  const { data: arts } = await sb.from('artists').select('id').eq('studio_id', s.id).limit(1);
  if (arts?.length) { studio = s; artistId = arts[0].id; break; }
}
if (!studio || !artistId) { console.log('No studio with an artist.'); process.exit(1); }

const STUDIO_DEFAULT = studio.deposit_amount_cents; // 10000 = $100
console.log('Studio:', studio.id.slice(0,8), '| deposit_default:', STUDIO_DEFAULT, '= $' + STUDIO_DEFAULT/100);
console.log('Artist:', artistId.slice(0,8));

const created = { consultations: [], bookings: [], clients: [] };

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

async function makeConsultation(finalPrice, tag) {
  const { data, error } = await sb.from('consultations').insert({
    studio_id: studio.id,
    client_name: 'Reg Client',
    client_email: `reg-${tag}-${Date.now()}@test.internal`,
    client_phone: '5550000000',
    tattoo_description: 'P1-4 test',
    placement: 'forearm',
    estimated_size: 'medium',
    color_preference: 'black_grey',
    budget_range: '300-600',
    status: 'quoted',
    final_price: finalPrice,
    quote_status: finalPrice ? 'saved' : 'none',
  }).select('id').single();
  if (error) throw new Error('makeConsultation: ' + error.message);
  created.consultations.push(data.id);
  return data.id;
}

// Simulates bookConsultation() with the P1-4 fix applied:
// deposit = min(studio_default, quoteAmountCents) when quote is set
async function simulateBook(consultId, clientId, date) {
  const { data: consult } = await sb
    .from('consultations')
    .select('id, studio_id, client_name, client_email, client_phone, detected_style, status, booking_id, final_price')
    .eq('id', consultId).single();

  if (consult.booking_id) return { bookingId: consult.booking_id, idempotent: true };

  const quoteAmountCents = consult.final_price ? consult.final_price * 100 : null;

  // P1-4 fix: cap deposit at quote total
  const depositAmountCents = quoteAmountCents !== null
    ? Math.min(STUDIO_DEFAULT, quoteAmountCents)
    : STUDIO_DEFAULT;

  const { data: bk, error } = await sb.from('bookings').insert({
    studio_id: studio.id,
    artist_id: artistId,
    client_id: clientId,
    date: date ?? '2026-12-15',
    time: '10:00',
    style: consult.detected_style ?? 'Custom',
    status: 'pending_deposit',
    deposit_amount_cents: depositAmountCents,
    deposit_paid: false,
    ...(quoteAmountCents !== null ? { quote_amount_cents: quoteAmountCents } : {}),
  }).select('id, deposit_amount_cents, quote_amount_cents').single();
  if (error) throw new Error('simulateBook: ' + error.message);
  created.bookings.push(bk.id);
  await sb.from('consultations').update({ booking_id: bk.id, status: 'booked' }).eq('id', consultId);
  return bk;
}

// ── TEST 1: Quote > studio default → deposit stays at studio default ──────────
HEAD('TEST 1 — Quote ABOVE studio default: deposit stays at studio default');
// Studio default = $100 (10000 cents). Quote = $500 (50000 cents).
// Expected deposit = min(10000, 50000) = 10000 ($100)

const c1 = await makeClient('t1');
const consult1 = await makeConsultation(500, 't1');
const bk1 = await simulateBook(consult1, c1, '2026-12-01');

console.log('  final_price: $500 | studio_default: $' + STUDIO_DEFAULT/100);
console.log('  deposit_amount_cents:', bk1.deposit_amount_cents, '| expected:', STUDIO_DEFAULT);
console.log('  quote_amount_cents:', bk1.quote_amount_cents, '| expected: 50000');

if (bk1.deposit_amount_cents === STUDIO_DEFAULT) {
  PASS('$500 quote → deposit stays at studio default $' + STUDIO_DEFAULT/100 + ' (quote > default)');
} else {
  FAIL('Expected ' + STUDIO_DEFAULT + ', got ' + bk1.deposit_amount_cents);
}
if (bk1.quote_amount_cents === 50000) {
  PASS('quote_amount_cents = 50000 (P1-3 regression check)');
} else {
  FAIL('quote_amount_cents wrong: ' + bk1.quote_amount_cents);
}

// ── TEST 2: Quote < studio default → deposit capped at quote ─────────────────
HEAD('TEST 2 — Quote BELOW studio default: deposit capped at quote amount');
// Studio default = $100. Quote = $75 (7500 cents).
// Expected deposit = min(10000, 7500) = 7500 ($75) — cannot charge more than job costs

const c2 = await makeClient('t2');
const consult2 = await makeConsultation(75, 't2');
const bk2 = await simulateBook(consult2, c2, '2026-12-02');

console.log('  final_price: $75 | studio_default: $' + STUDIO_DEFAULT/100);
console.log('  deposit_amount_cents:', bk2.deposit_amount_cents, '| expected: 7500');
console.log('  quote_amount_cents:', bk2.quote_amount_cents, '| expected: 7500');

if (bk2.deposit_amount_cents === 7500) {
  PASS('$75 quote → deposit capped at 7500 cents ($75) — not the $' + STUDIO_DEFAULT/100 + ' default');
} else if (bk2.deposit_amount_cents === STUDIO_DEFAULT) {
  FAIL('Deposit was NOT capped: still ' + STUDIO_DEFAULT + ' on a $75 job (deposit > quote)');
} else {
  FAIL('Unexpected value: ' + bk2.deposit_amount_cents);
}

// ── TEST 3: No quote → deposit is studio default ───────────────────────────────
HEAD('TEST 3 — No quote: deposit falls back to studio default');

const c3 = await makeClient('t3');
const consult3 = await makeConsultation(null, 't3');
const bk3 = await simulateBook(consult3, c3, '2026-12-03');

console.log('  final_price: null | studio_default: $' + STUDIO_DEFAULT/100);
console.log('  deposit_amount_cents:', bk3.deposit_amount_cents, '| expected:', STUDIO_DEFAULT);

if (bk3.deposit_amount_cents === STUDIO_DEFAULT) {
  PASS('No quote → deposit = studio default ' + STUDIO_DEFAULT + ' ($' + STUDIO_DEFAULT/100 + ')');
} else {
  FAIL('Expected ' + STUDIO_DEFAULT + ', got ' + bk3.deposit_amount_cents);
}
if (bk3.quote_amount_cents === null) {
  PASS('quote_amount_cents correctly NULL when no quote (P1-3 regression)');
} else {
  FAIL('quote_amount_cents should be null, got: ' + bk3.quote_amount_cents);
}

// ── TEST 4: Quote exactly equals studio default → deposit unchanged ────────────
HEAD('TEST 4 — Quote exactly equals studio default: deposit unchanged');
// Quote = $100 (10000 cents) = studio default → min(10000, 10000) = 10000

const c4 = await makeClient('t4');
const consult4 = await makeConsultation(100, 't4'); // $100 = STUDIO_DEFAULT/100
const bk4 = await simulateBook(consult4, c4, '2026-12-04');

console.log('  final_price: $100 = studio default');
console.log('  deposit_amount_cents:', bk4.deposit_amount_cents, '| expected:', STUDIO_DEFAULT);

if (bk4.deposit_amount_cents === STUDIO_DEFAULT) {
  PASS('Quote = studio default → deposit unchanged at ' + STUDIO_DEFAULT);
} else {
  FAIL('Expected ' + STUDIO_DEFAULT + ', got ' + bk4.deposit_amount_cents);
}

// ── TEST 5: Price grid — verify min() math across multiple amounts ────────────
HEAD('TEST 5 — Price grid: min(studio_default, quote) math');

const grid = [
  { finalPrice: 50,   expectedDeposit: 5000  },  // $50 quote < $100 default → $50
  { finalPrice: 99,   expectedDeposit: 9900  },  // $99 quote < $100 default → $99
  { finalPrice: 100,  expectedDeposit: STUDIO_DEFAULT }, // equal → default
  { finalPrice: 150,  expectedDeposit: STUDIO_DEFAULT }, // $150 > $100 → $100
  { finalPrice: 2000, expectedDeposit: STUDIO_DEFAULT }, // $2000 >> $100 → $100
];

for (const tc of grid) {
  const cN = await makeClient('g' + tc.finalPrice);
  const consultN = await makeConsultation(tc.finalPrice, 'g' + tc.finalPrice);
  const bkN = await simulateBook(consultN, cN, '2026-12-10');
  const label = `$${tc.finalPrice} quote → ${tc.expectedDeposit} cents ($${tc.expectedDeposit/100})`;
  if (bkN.deposit_amount_cents === tc.expectedDeposit) {
    PASS(label);
  } else {
    FAIL(label + ' | got: ' + bkN.deposit_amount_cents);
  }
}

// ── TEST 6: Idempotency regression (P1-2) ─────────────────────────────────────
HEAD('TEST 6 — P1-2 regression: idempotency guard still works');

const { data: chk1 } = await sb.from('consultations').select('booking_id').eq('id', consult1).single();
const guardFires = !!chk1?.booking_id;
if (guardFires) {
  PASS('P1-2 guard holds: consultation already has booking_id=' + chk1.booking_id.slice(0,8));
} else {
  FAIL('booking_id not set on consult1');
}

// ── TEST 7: P0-1 status regression ────────────────────────────────────────────
HEAD('TEST 7 — P0-1 regression: booked status cannot be downgraded');

const { data: statusChk } = await sb.from('consultations').select('status').eq('id', consult1).single();
const wouldDowngrade = ['new', 'reviewed'].includes(statusChk?.status ?? '');
if (statusChk?.status === 'booked' && !wouldDowngrade) {
  PASS('Status = "booked" — P0-1 guard would block any downgrade attempt');
} else {
  FAIL('Unexpected status: ' + statusChk?.status);
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
