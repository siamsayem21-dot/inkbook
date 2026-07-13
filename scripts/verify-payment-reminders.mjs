// Phase C Feature 3 — Payment Reminders — Live DB Verification
//
// Migration applied: bookings.deposit_reminder_sent, remainder_reminder_sent.
// This script proves the two eligibility queries the new
// app/api/cron/payment-reminders/route.ts uses actually select the right
// rows (and only the right rows) against real data — the dedupe flags and
// the narrow deposit-expiry window are the parts a unit test (mocked
// Supabase) can't fully prove.
//
// Self-cleaning, synthetic data only — same pattern as
// scripts/verify-remainder-payment.mjs.

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
  bookingIds: [],
};

async function cleanup() {
  HEAD('CLEANUP');
  for (const id of created.bookingIds) await sb.from('bookings').delete().eq('id', id);
  if (created.clientRowId) await sb.from('clients').delete().eq('id', created.clientRowId);
  if (created.artistId) await sb.from('artists').delete().eq('id', created.artistId);
  if (created.studioId) await sb.from('studios').delete().eq('id', created.studioId);
  for (const uid of created.authUsers) await sb.auth.admin.deleteUser(uid).catch(() => {});
  console.log('  Synthetic rows removed.');
}

function getBalanceDueCents(b) {
  const total = b.total_amount_cents ?? b.quote_amount_cents ?? null;
  if (total === null) return null;
  return Math.max(total - b.deposit_amount_cents, 0);
}

// Mirrors cron/payment-reminders' Pass 1 query
async function fetchDepositEligible(now, windowEnd) {
  const { data } = await sb.from('bookings')
    .select('id')
    .eq('studio_id', created.studioId)
    .eq('status', 'pending_deposit')
    .eq('deposit_reminder_sent', false)
    .gte('deposit_expires_at', now)
    .lte('deposit_expires_at', windowEnd);
  return (data ?? []).map(r => r.id);
}

// Mirrors cron/payment-reminders' Pass 2 query
async function fetchRemainderEligible(today) {
  const { data } = await sb.from('bookings')
    .select('id, deposit_amount_cents, total_amount_cents, quote_amount_cents')
    .eq('studio_id', created.studioId)
    .in('status', ['confirmed', 'completed'])
    .eq('remainder_collected', false)
    .eq('remainder_reminder_sent', false)
    .not('date', 'is', null)
    .lt('date', today);
  return data ?? [];
}

try {
  HEAD('SETUP — synthetic studio, artist, client');

  const { data: ownerUser, error: ownerErr } = await sb.auth.admin.createUser({
    email: `verify-reminders-owner-${stamp}@example.com`, email_confirm: true,
  });
  if (ownerErr) throw new Error('createUser(owner) failed: ' + ownerErr.message);
  created.authUsers.push(ownerUser.user.id);

  const { data: studio, error: studioErr } = await sb.from('studios').insert({
    name: 'Verify Reminders Studio', subdomain: `verify-reminders-${stamp}`, owner_id: ownerUser.user.id,
  }).select('id').single();
  if (studioErr) throw new Error('studio insert failed: ' + studioErr.message);
  created.studioId = studio.id;

  const { data: artistUser, error: artistUserErr } = await sb.auth.admin.createUser({
    email: `verify-reminders-artist-${stamp}@example.com`, email_confirm: true,
  });
  if (artistUserErr) throw new Error('createUser(artist) failed: ' + artistUserErr.message);
  created.authUsers.push(artistUser.user.id);

  const { data: artist, error: artistErr } = await sb.from('artists').insert({
    studio_id: created.studioId, user_id: artistUser.user.id, name: 'Verify Artist', email: artistUser.user.email,
  }).select('id').single();
  if (artistErr) throw new Error('artists insert failed: ' + artistErr.message);
  created.artistId = artist.id;

  const { data: clientRow, error: clientRowErr } = await sb.from('clients').insert({
    studio_id: created.studioId, full_name: 'Client A', email: `verify-reminders-a-${stamp}@example.com`, phone: '5550000000',
  }).select('id').single();
  if (clientRowErr) throw new Error('clients insert failed: ' + clientRowErr.message);
  created.clientRowId = clientRow.id;

  PASS('studio, artist, client created');

  HEAD('TEST 1 — deposit reminder: narrow window selects only the in-window, not-yet-reminded booking');
  {
    const now = new Date();
    const windowEnd = new Date(now.getTime() + 5 * 60 * 60 * 1000);

    async function makeDepositBooking(expiresAt, reminderSent) {
      const { data, error } = await sb.from('bookings').insert({
        studio_id: created.studioId, artist_id: created.artistId, client_id: created.clientRowId,
        date: null, time: null, style: 'Custom', status: 'pending_deposit',
        deposit_amount_cents: 10000, deposit_paid: false,
        deposit_expires_at: expiresAt.toISOString(), deposit_reminder_sent: reminderSent,
      }).select('id').single();
      if (error) throw new Error('booking insert failed: ' + error.message);
      created.bookingIds.push(data.id);
      return data.id;
    }

    const inWindow = await makeDepositBooking(new Date(now.getTime() + 2 * 60 * 60 * 1000), false);
    const outsideWindow = await makeDepositBooking(new Date(now.getTime() + 10 * 60 * 60 * 1000), false);
    const alreadyReminded = await makeDepositBooking(new Date(now.getTime() + 3 * 60 * 60 * 1000), true);

    const eligible = await fetchDepositEligible(now.toISOString(), windowEnd.toISOString());

    eligible.includes(inWindow) ? PASS('in-window, not-yet-reminded booking correctly eligible') : FAIL('in-window booking missing from results');
    eligible.includes(outsideWindow) ? FAIL('outside-window booking incorrectly eligible') : PASS('outside-window booking correctly excluded');
    eligible.includes(alreadyReminded) ? FAIL('already-reminded booking incorrectly eligible (dedupe broken)') : PASS('already-reminded booking correctly excluded (dedupe holds)');
  }

  HEAD('TEST 2 — remainder reminder: past-session, uncollected, not-yet-reminded booking is eligible');
  {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    async function makeRemainderBooking({ date, status = 'confirmed', remainderCollected = false, reminderSent = false, totalAmountCents = 50000 }) {
      const { data, error } = await sb.from('bookings').insert({
        studio_id: created.studioId, artist_id: created.artistId, client_id: created.clientRowId,
        date, time: '14:00:00', style: 'Custom', status,
        deposit_amount_cents: 10000, deposit_paid: true, total_amount_cents: totalAmountCents,
        remainder_collected: remainderCollected, remainder_reminder_sent: reminderSent,
      }).select('id').single();
      if (error) throw new Error('booking insert failed: ' + error.message);
      created.bookingIds.push(data.id);
      return data.id;
    }

    const eligiblePast = await makeRemainderBooking({ date: yesterday });
    const futureSession = await makeRemainderBooking({ date: tomorrow });
    const alreadyCollected = await makeRemainderBooking({ date: yesterday, remainderCollected: true });
    const alreadyReminded = await makeRemainderBooking({ date: yesterday, reminderSent: true });
    const noTotalPrice = await makeRemainderBooking({ date: yesterday, totalAmountCents: null });

    const rows = await fetchRemainderEligible(today);
    const ids = rows.map(r => r.id);

    ids.includes(eligiblePast) ? PASS('past-session, uncollected, not-yet-reminded booking correctly eligible') : FAIL('eligible booking missing');
    ids.includes(futureSession) ? FAIL('future-session booking incorrectly eligible') : PASS('future-session booking correctly excluded');
    ids.includes(alreadyCollected) ? FAIL('already-collected booking incorrectly eligible') : PASS('already-collected booking correctly excluded');
    ids.includes(alreadyReminded) ? FAIL('already-reminded booking incorrectly eligible (dedupe broken)') : PASS('already-reminded booking correctly excluded (dedupe holds)');

    // The no-total-price booking passes the raw SQL filter (it has no
    // signal to exclude it at the query level) — the application code's
    // getBalanceDueCents() null-check is what skips it. Verify that check
    // directly against the real row.
    const noTotalRow = rows.find(r => r.id === noTotalPrice);
    if (noTotalRow) {
      getBalanceDueCents(noTotalRow) === null
        ? PASS('no-total-price booking present in raw query but correctly skipped by getBalanceDueCents() null-check')
        : FAIL('getBalanceDueCents() did not return null for a booking with no total price');
    } else {
      FAIL('no-total-price booking unexpectedly absent from raw query results');
    }
  }

} catch (err) {
  FAIL('unexpected error: ' + (err?.message ?? err));
} finally {
  await cleanup();
}

console.log('\n' + '='.repeat(50));
console.log(failures === 0 ? `✅  All checks passed.\n` : `❌  ${failures} check(s) failed.\n`);
process.exit(failures === 0 ? 0 : 1);
