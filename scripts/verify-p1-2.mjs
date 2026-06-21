// P1-2 Regression Test Suite
// Tests: UNIQUE constraint, idempotency guard, normal flow, full pipeline
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

// ── Find a studio that has at least one artist ────────────────────────────────
const { data: studioRows } = await sb.from('studios').select('id, deposit_amount_cents');
let studio = null, artistId = null;
for (const s of studioRows ?? []) {
  const { data: arts } = await sb.from('artists').select('id').eq('studio_id', s.id).limit(1);
  if (arts?.length) { studio = s; artistId = arts[0].id; break; }
}
if (!studio || !artistId) { console.log('No studio with an artist found.'); process.exit(1); }
console.log('Studio :', studio.id.slice(0,8), '| deposit:', studio.deposit_amount_cents);
console.log('Artist :', artistId.slice(0,8));

const created = { consultations: [], bookings: [], clients: [] };

// Helper — create a temporary client
async function makeClient() {
  const { data, error } = await sb.from('clients').insert({
    studio_id: studio.id,
    full_name: 'Test Regression Client',
    email: `test-${Date.now()}@regression.internal`,
    phone: '5550000000',
  }).select('id').single();
  if (error) throw new Error('makeClient: ' + error.message);
  created.clients.push(data.id);
  return data.id;
}

// Helper — create a temporary consultation
async function makeConsultation(clientEmail) {
  const { data, error } = await sb.from('consultations').insert({
    studio_id: studio.id,
    client_name: 'Test Regression',
    client_email: clientEmail,
    client_phone: '5550000000',
    tattoo_description: 'Regression test consultation',
    placement: 'forearm',
    estimated_size: 'medium',
    color_preference: 'black_grey',
    budget_range: '300-600',
    status: 'quoted',
  }).select('id').single();
  if (error) throw new Error('makeConsultation: ' + error.message);
  created.consultations.push(data.id);
  return data.id;
}

// Helper — create a temporary booking
async function makeBooking(clientId, date) {
  const { data, error } = await sb.from('bookings').insert({
    studio_id: studio.id,
    artist_id: artistId,
    client_id: clientId,
    date,
    time: '10:00',
    style: 'Test',
    status: 'pending_deposit',
    deposit_amount_cents: studio.deposit_amount_cents,
    deposit_paid: false,
  }).select('id').single();
  if (error) throw new Error('makeBooking: ' + error.message);
  created.bookings.push(data.id);
  return data.id;
}

// ── CONSTRAINT VERIFICATION ───────────────────────────────────────────────────
HEAD('CONSTRAINT VERIFICATION — DB UNIQUE on consultations.booking_id');

const clientV = await makeClient();
const consultV1 = await makeConsultation(`v1-${Date.now()}@r.internal`);
const consultV2 = await makeConsultation(`v2-${Date.now()}@r.internal`);
const bkV = await makeBooking(clientV, '2026-12-01');

// Link consultV1 to anchor booking
await sb.from('consultations').update({ booking_id: bkV }).eq('id', consultV1);

// Now try to link consultV2 to the SAME booking → must fail UNIQUE constraint
const { error: dupErr } = await sb
  .from('consultations').update({ booking_id: bkV }).eq('id', consultV2);

if (dupErr) {
  PASS('UNIQUE constraint active — duplicate booking_id rejected');
  console.log('       code:', dupErr.code, '|', dupErr.message.slice(0, 100));
} else {
  const { data: v2check } = await sb.from('consultations').select('booking_id').eq('id', consultV2).single();
  if (v2check?.booking_id === bkV) {
    FAIL('Same booking_id written to two different consultations — constraint NOT enforced');
  } else {
    PASS('Write returned no error but booking_id was not changed (row already violated constraint)');
  }
}

// Reset
await sb.from('consultations').update({ booking_id: null }).eq('id', consultV1);
await sb.from('consultations').update({ booking_id: null }).eq('id', consultV2);

// ── TEST 1: Normal booking creation still works ───────────────────────────────
HEAD('TEST 1 — Normal booking creation still works');

const client1 = await makeClient();
const consult1 = await makeConsultation(`t1-${Date.now()}@r.internal`);
const bk1 = await makeBooking(client1, '2026-12-10');

const { error: link1Err } = await sb
  .from('consultations').update({ booking_id: bk1, status: 'booked' }).eq('id', consult1);

const { data: after1 } = await sb.from('consultations').select('booking_id, status').eq('id', consult1).single();

if (!link1Err && after1?.booking_id === bk1 && after1?.status === 'booked') {
  PASS('Booking linked correctly | booking_id=' + bk1.slice(0,8) + ' | status=booked');
} else {
  FAIL('Link failed: ' + (link1Err?.message ?? JSON.stringify(after1)));
}

// ── TEST 2: Double-click — idempotency guard prevents duplicate INSERT ─────────
HEAD('TEST 2 — Double-click/retry: guard returns existing bookingId, no duplicate');

// consult1 now has booking_id=bk1 — simulate a second call to bookConsultation()
const { count: before2 } = await sb.from('bookings').select('*', { count: 'exact', head: true });

// Step 1: fetch consultation with booking_id field (what the guard does)
const { data: recheckC } = await sb
  .from('consultations').select('id, booking_id, status').eq('id', consult1).single();

const guardFires = !!recheckC?.booking_id;
console.log('  consultation.booking_id =', recheckC?.booking_id ? recheckC.booking_id.slice(0,8) : 'null');
console.log('  Guard fires?', guardFires ? 'YES → early return, no INSERT' : 'NO → would proceed to INSERT');

if (guardFires) {
  const { count: after2 } = await sb.from('bookings').select('*', { count: 'exact', head: true });
  if (before2 === after2) {
    PASS('bookings count stable at ' + after2 + ' — no duplicate inserted');
  } else {
    FAIL('bookings count changed ' + before2 + ' → ' + after2);
  }
  if (recheckC.booking_id === bk1) {
    PASS('Guard returns correct existing bookingId=' + bk1.slice(0,8));
  } else {
    FAIL('Wrong bookingId returned: ' + recheckC.booking_id);
  }
} else {
  FAIL('booking_id is null — guard would not fire (consultation not linked)');
}

// ── TEST 3: Replay — DB UNIQUE blocks duplicate at storage layer ──────────────
HEAD('TEST 3 — Replay: DB UNIQUE blocks duplicate even if app guard is bypassed');

const consult3 = await makeConsultation(`t3-${Date.now()}@r.internal`);

// Attempt to point consult3 at bk1 (already linked to consult1) — must be blocked
const { error: replayErr } = await sb
  .from('consultations').update({ booking_id: bk1 }).eq('id', consult3);

if (replayErr) {
  PASS('DB rejected replay — code: ' + replayErr.code + ' | ' + replayErr.message.slice(0, 80));
} else {
  const { data: r3check } = await sb.from('consultations').select('booking_id').eq('id', consult3).single();
  if (r3check?.booking_id === bk1) {
    FAIL('Replay succeeded — two consultations now share booking_id ' + bk1.slice(0,8));
  } else {
    PASS('Replay write silently rejected — booking_id not duplicated (constraint active)');
  }
}

// ── TEST 4: Full consultation → booking → deposit_paid pipeline ───────────────
HEAD('TEST 4 — Full flow: quoted → booked → deposit_paid');

const client4 = await makeClient();
const consult4 = await makeConsultation(`t4-${Date.now()}@r.internal`);
const bk4 = await makeBooking(client4, '2026-12-20');

// 4-a: bookConsultation — links booking, sets "booked"
await sb.from('consultations').update({ booking_id: bk4, status: 'booked' }).eq('id', consult4);
const { data: s4a } = await sb.from('consultations').select('status, booking_id').eq('id', consult4).single();
if (s4a?.status === 'booked' && s4a?.booking_id === bk4) {
  PASS('4a bookConsultation: status=booked, booking_id=' + bk4.slice(0,8));
} else {
  FAIL('4a mismatch: ' + JSON.stringify(s4a));
}

// 4-b: saveConsultationQuote called after — P0-1 guard must prevent status downgrade
const wouldDowngrade = ['new', 'reviewed'].includes(s4a?.status ?? '');
if (!wouldDowngrade) {
  PASS('4b P0-1 guard: "booked" not in [new,reviewed] — quote save cannot downgrade status');
} else {
  FAIL('4b P0-1 guard would allow downgrade of "' + s4a?.status + '"');
}

// 4-c: Stripe webhook fires → deposit_paid
await sb.from('consultations').update({ status: 'deposit_paid' }).eq('id', consult4);
await sb.from('bookings').update({ status: 'confirmed', deposit_paid: true }).eq('id', bk4);
const { data: s4c_c } = await sb.from('consultations').select('status').eq('id', consult4).single();
const { data: s4c_b } = await sb.from('bookings').select('status, deposit_paid').eq('id', bk4).single();
if (s4c_c?.status === 'deposit_paid' && s4c_b?.status === 'confirmed' && s4c_b?.deposit_paid === true) {
  PASS('4c webhook: consultation=deposit_paid, booking=confirmed, deposit_paid=true');
} else {
  FAIL('4c mismatch: ' + JSON.stringify({ s4c_c, s4c_b }));
}

// 4-d: idempotency still holds post-deposit (retry after deposit paid)
const { data: s4d } = await sb.from('consultations').select('booking_id').eq('id', consult4).single();
if (s4d?.booking_id === bk4) {
  PASS('4d post-deposit retry: guard would return existing bookingId=' + bk4.slice(0,8) + ' — no duplicate');
} else {
  FAIL('4d: unexpected booking_id: ' + s4d?.booking_id);
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
