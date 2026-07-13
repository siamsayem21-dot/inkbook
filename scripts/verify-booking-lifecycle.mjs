// Phase C Feature 1 — Booking Lifecycle Completion — Live DB Verification
//
// No new tables/columns were added for this feature (blacklist, consent_forms,
// awaiting_schedule/completed all pre-existed), so there's no schema to probe.
// What matters here is proving the two pieces of NEW business logic actually
// behave correctly against real data:
//   1. The "confirmed requires schedule AND consent" gate (lib/booking-lifecycle.ts),
//      in BOTH orderings (schedule-then-consent, consent-then-schedule).
//   2. markCompleted()'s guard — rejects unscheduled/cancelled bookings AND
//      rejects a "confirmed" booking that still has no signed consent (the
//      classic-flow edge case this action must defend against per Rule 1).
//   3. Blacklist enforcement via the is_client_blacklisted() RPC.
//   4. Cross-client isolation on the new portal consent page's ownership chain.
//
// This script has no TS runtime, so it replicates the exact conditional logic
// of assignSchedule()/POST /api/consent-forms/markCompleted() directly against
// the real DB — same "simulate the logic against the real DB" precedent as
// scripts/verify-client-bookings.mjs. Self-cleaning, synthetic data only.

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
  consultationIds: [], bookingIds: [], blacklistId: null,
};

async function cleanup() {
  HEAD('CLEANUP');
  for (const id of created.bookingIds) await sb.from('consent_forms').delete().eq('booking_id', id);
  for (const id of created.consultationIds) await sb.from('consultations').delete().eq('id', id);
  for (const id of created.bookingIds) await sb.from('bookings').delete().eq('id', id);
  if (created.blacklistId) await sb.from('blacklist').delete().eq('id', created.blacklistId);
  if (created.clientRowId) await sb.from('clients').delete().eq('id', created.clientRowId);
  if (created.artistId) await sb.from('artists').delete().eq('id', created.artistId);
  if (created.studioId) await sb.from('studios').delete().eq('id', created.studioId);
  if (created.clientAAccountId) await sb.from('client_accounts').delete().eq('id', created.clientAAccountId);
  if (created.clientBAccountId) await sb.from('client_accounts').delete().eq('id', created.clientBAccountId);
  for (const uid of created.authUsers) await sb.auth.admin.deleteUser(uid).catch(() => {});
  console.log('  Synthetic rows removed.');
}

// Mirrors isReadyToConfirm() in lib/booking-lifecycle.ts
function isReadyToConfirm(hasSchedule, hasConsent) {
  return hasSchedule && hasConsent;
}

async function hasConsent(bookingId) {
  const { data } = await sb.from('consent_forms').select('id').eq('booking_id', bookingId).maybeSingle();
  return Boolean(data);
}

// Mirrors assignSchedule()'s status decision (app/(owner)/owner/bookings/[bookingId]/actions.ts)
async function assignSchedule(bookingId) {
  const consent = await hasConsent(bookingId);
  const nextStatus = isReadyToConfirm(true, consent) ? 'confirmed' : 'awaiting_schedule';
  await sb.from('bookings').update({ date: '2026-09-01', time: '14:00:00', status: nextStatus }).eq('id', bookingId).eq('status', 'awaiting_schedule');
  return nextStatus;
}

// Mirrors POST /api/consent-forms's status decision after inserting consent_forms
async function signConsent(bookingId) {
  await sb.from('consent_forms').insert({
    booking_id: bookingId, client_id: created.clientRowId, is_minor: false,
    client_signature: 'Test Client', id_photo_url: 'synthetic/path.jpg', state_template: 'US',
  });
  const { data: bookingRow } = await sb.from('bookings').select('date, status').eq('id', bookingId).single();
  const nextStatus = isReadyToConfirm(Boolean(bookingRow.date), true) ? 'confirmed' : bookingRow.status;
  await sb.from('bookings').update({ status: nextStatus }).eq('id', bookingId).neq('status', 'confirmed');
  const { data: after } = await sb.from('bookings').select('status').eq('id', bookingId).single();
  return after.status;
}

// Mirrors markCompleted()'s guard — now also sets completed_at
// (Phase C Feature 4: Aftercare, added alongside the aftercare notification).
async function markCompleted(bookingId) {
  const { data: bookingRow } = await sb.from('bookings').select('status').eq('id', bookingId).single();
  if (bookingRow.status !== 'confirmed') return { error: 'not confirmed' };
  const consent = await hasConsent(bookingId);
  if (!consent) return { error: 'no consent' };
  const completedAt = new Date().toISOString();
  await sb.from('bookings').update({ status: 'completed', completed_at: completedAt }).eq('id', bookingId).eq('status', 'confirmed');
  return { completedAt };
}

async function makeBooking(status, { date = null, time = null } = {}) {
  const { data: consult, error: cErr } = await sb.from('consultations').insert({
    studio_id: created.studioId, artist_id: created.artistId,
    client_name: 'Client A', client_email: `verify-lifecycle-a-${stamp}@example.com`, client_phone: '5550000000',
    tattoo_description: `Verification tattoo (${status})`, placement: 'forearm',
    estimated_size: 'Medium', color_preference: 'Black & Grey', budget_range: '$500-800', status: 'quoted',
  }).select('id').single();
  if (cErr) throw new Error('consultation insert failed: ' + cErr.message);
  created.consultationIds.push(consult.id);

  const { data: booking, error: bErr } = await sb.from('bookings').insert({
    studio_id: created.studioId, artist_id: created.artistId, client_id: created.clientRowId,
    date, time, style: 'Custom', status, deposit_amount_cents: 10000, deposit_paid: true,
  }).select('id').single();
  if (bErr) throw new Error('booking insert failed: ' + bErr.message);
  created.bookingIds.push(booking.id);

  await sb.from('consultations').update({ booking_id: booking.id }).eq('id', consult.id);
  return { consultId: consult.id, bookingId: booking.id };
}

async function fetchConsentPageOwnership(studioId, clientAccountId, consultationId) {
  const { data: chat } = await sb.from('ai_chats').select('id')
    .eq('studio_id', studioId).eq('client_account_id', clientAccountId)
    .eq('status', 'submitted').eq('consultation_id', consultationId).maybeSingle();
  return Boolean(chat);
}

try {
  HEAD('SETUP — synthetic studio, artist, client, 2 client_accounts');

  const { data: ownerUser, error: ownerErr } = await sb.auth.admin.createUser({
    email: `verify-lifecycle-owner-${stamp}@example.com`, email_confirm: true,
  });
  if (ownerErr) throw new Error('createUser(owner) failed: ' + ownerErr.message);
  created.authUsers.push(ownerUser.user.id);

  const { data: studio, error: studioErr } = await sb.from('studios').insert({
    name: 'Verify Lifecycle Studio', subdomain: `verify-lifecycle-${stamp}`, owner_id: ownerUser.user.id,
  }).select('id').single();
  if (studioErr) throw new Error('studio insert failed: ' + studioErr.message);
  created.studioId = studio.id;

  const { data: artistUser, error: artistUserErr } = await sb.auth.admin.createUser({
    email: `verify-lifecycle-artist-${stamp}@example.com`, email_confirm: true,
  });
  if (artistUserErr) throw new Error('createUser(artist) failed: ' + artistUserErr.message);
  created.authUsers.push(artistUser.user.id);

  const { data: artist, error: artistErr } = await sb.from('artists').insert({
    studio_id: created.studioId, user_id: artistUser.user.id, name: 'Verify Artist', email: artistUser.user.email,
  }).select('id').single();
  if (artistErr) throw new Error('artists insert failed: ' + artistErr.message);
  created.artistId = artist.id;

  const { data: clientRow, error: clientRowErr } = await sb.from('clients').insert({
    studio_id: created.studioId, full_name: 'Client A', email: `verify-lifecycle-a-${stamp}@example.com`, phone: '5550000000',
  }).select('id').single();
  if (clientRowErr) throw new Error('clients insert failed: ' + clientRowErr.message);
  created.clientRowId = clientRow.id;

  const { data: clientAUser } = await sb.auth.admin.createUser({
    email: `verify-lifecycle-clientA-${stamp}@example.com`, email_confirm: true,
  });
  created.authUsers.push(clientAUser.user.id);
  const { data: clientA } = await sb.from('client_accounts').insert({
    user_id: clientAUser.user.id, email: clientAUser.user.email,
  }).select('id').single();
  created.clientAAccountId = clientA.id;

  const { data: clientBUser } = await sb.auth.admin.createUser({
    email: `verify-lifecycle-clientB-${stamp}@example.com`, email_confirm: true,
  });
  created.authUsers.push(clientBUser.user.id);
  const { data: clientB } = await sb.from('client_accounts').insert({
    user_id: clientBUser.user.id, email: clientBUser.user.email,
  }).select('id').single();
  created.clientBAccountId = clientB.id;

  PASS('studio, artist, client, 2 client_accounts created');

  HEAD('TEST 1 — blacklist: is_client_blacklisted() RPC matches on email/phone within the studio');
  {
    const blockedEmail = `verify-lifecycle-blocked-${stamp}@example.com`;
    const { data: bl, error: blErr } = await sb.from('blacklist').insert({
      studio_id: created.studioId, blocked_by: ownerUser.user.id, client_email: blockedEmail, reason: 'test',
    }).select('id').single();
    if (blErr) throw new Error('blacklist insert failed: ' + blErr.message);
    created.blacklistId = bl.id;

    const { data: blocked } = await sb.rpc('is_client_blacklisted', {
      p_studio_id: created.studioId, p_email: blockedEmail, p_phone: 'no-match',
    });
    blocked === true ? PASS('blacklisted email correctly detected') : FAIL('blacklisted email NOT detected: ' + blocked);

    const { data: notBlocked } = await sb.rpc('is_client_blacklisted', {
      p_studio_id: created.studioId, p_email: 'someone-else@example.com', p_phone: 'no-match',
    });
    notBlocked === false ? PASS('non-blacklisted email correctly allowed') : FAIL('non-blacklisted email incorrectly blocked: ' + notBlocked);
  }

  HEAD('TEST 2 — gate ordering A: schedule assigned first (no consent) stays awaiting_schedule');
  {
    const { bookingId } = await makeBooking('awaiting_schedule');
    const status = await assignSchedule(bookingId);
    status === 'awaiting_schedule'
      ? PASS('booking correctly stayed awaiting_schedule (schedule set, no consent yet)')
      : FAIL('expected awaiting_schedule, got ' + status);

    const { data: row } = await sb.from('bookings').select('date, status').eq('id', bookingId).single();
    row.date === '2026-09-01' && row.status === 'awaiting_schedule'
      ? PASS('date/time were still saved even though status did not advance')
      : FAIL('date/time not saved correctly: ' + JSON.stringify(row));

    const afterConsentStatus = await signConsent(bookingId);
    afterConsentStatus === 'confirmed'
      ? PASS('signing consent afterward correctly confirms the booking (schedule + consent both present)')
      : FAIL('expected confirmed after consent, got ' + afterConsentStatus);
  }

  HEAD('TEST 3 — gate ordering B: consent signed first (no schedule) stays awaiting_schedule');
  {
    const { bookingId } = await makeBooking('awaiting_schedule');
    const statusAfterConsent = await signConsent(bookingId);
    statusAfterConsent === 'awaiting_schedule'
      ? PASS('booking correctly stayed awaiting_schedule (consent signed, no schedule yet)')
      : FAIL('expected awaiting_schedule, got ' + statusAfterConsent);

    const statusAfterSchedule = await assignSchedule(bookingId);
    statusAfterSchedule === 'confirmed'
      ? PASS('assigning schedule afterward correctly confirms the booking')
      : FAIL('expected confirmed after schedule, got ' + statusAfterSchedule);
  }

  HEAD('TEST 4 — markCompleted guard: rejects unscheduled/cancelled bookings');
  {
    const { bookingId: unscheduled } = await makeBooking('awaiting_schedule');
    const r1 = await markCompleted(unscheduled);
    r1.error ? PASS('awaiting_schedule booking correctly rejected') : FAIL('awaiting_schedule booking was NOT rejected');

    const { bookingId: cancelled } = await makeBooking('cancelled');
    const r2 = await markCompleted(cancelled);
    r2.error ? PASS('cancelled booking correctly rejected') : FAIL('cancelled booking was NOT rejected');
  }

  HEAD('TEST 5 — markCompleted guard: rejects confirmed booking with NO signed consent (classic-flow edge case)');
  {
    const { bookingId } = await makeBooking('confirmed', { date: '2026-09-01', time: '14:00:00' });
    const r = await markCompleted(bookingId);
    r.error ? PASS('confirmed-but-no-consent booking correctly rejected — Rule 1 upheld') : FAIL('SECURITY: booking completed without consent');
  }

  HEAD('TEST 6 — markCompleted: succeeds for confirmed + consent-signed booking');
  {
    const { bookingId } = await makeBooking('confirmed', { date: '2026-09-01', time: '14:00:00' });
    await sb.from('consent_forms').insert({
      booking_id: bookingId, client_id: created.clientRowId, is_minor: false,
      client_signature: 'Test Client', id_photo_url: 'synthetic/path.jpg', state_template: 'US',
    });
    const r = await markCompleted(bookingId);
    if (r.error) { FAIL('expected success, got error: ' + r.error); }
    else {
      const { data: row } = await sb.from('bookings').select('status, completed_at').eq('id', bookingId).single();
      row.status === 'completed' ? PASS('booking correctly marked completed') : FAIL('status did not update to completed: ' + row.status);
      row.completed_at ? PASS('completed_at correctly set (Phase C Feature 4)') : FAIL('completed_at was not set');
    }
  }

  HEAD('TEST 7 — cross-client isolation: portal consent page ownership chain');
  {
    const { consultId } = await makeBooking('awaiting_schedule');
    await sb.from('ai_chats').insert({
      studio_id: created.studioId, client_account_id: created.clientAAccountId,
      status: 'submitted', consultation_id: consultId,
    });

    const ownedByA = await fetchConsentPageOwnership(created.studioId, created.clientAAccountId, consultId);
    ownedByA ? PASS('client A correctly recognized as owner of their own consultation/booking') : FAIL('client A ownership check failed');

    const ownedByB = await fetchConsentPageOwnership(created.studioId, created.clientBAccountId, consultId);
    ownedByB ? FAIL('SECURITY: client B was recognized as owner of client A\'s consultation/booking') : PASS('client B correctly denied — no ai_chats link of their own');
  }

} catch (err) {
  FAIL('unexpected error: ' + (err?.message ?? err));
} finally {
  await cleanup();
}

console.log('\n' + '='.repeat(50));
console.log(failures === 0 ? `✅  All checks passed.\n` : `❌  ${failures} check(s) failed.\n`);
process.exit(failures === 0 ? 0 : 1);
