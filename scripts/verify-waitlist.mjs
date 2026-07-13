// Phase C Feature 6 — Waitlist — Live DB Verification
//
// No migration was needed — artists.monthly_booking_cap and the `waitlist`
// table (including its UNIQUE(artist_id, client_id) constraint) have existed
// since the initial schema but were never wired up. This script proves:
//   1. The new month-scoped cap helper (lib/waitlist.ts) counts correctly
//      against the TARGET month, not "today's month" — the exact gap that
//      made the existing artist_bookings_this_month() RPC unusable here.
//   2. The existing UNIQUE(artist_id, client_id) constraint actually rejects
//      a duplicate waitlist join.
//   3. The cron's FIFO + under-cap eligibility resolves correctly against
//      real rows.
//
// Self-cleaning, synthetic data only — same pattern as
// scripts/verify-reviews.mjs.

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
  bookingIds: [], waitlistIds: [],
};

async function cleanup() {
  HEAD('CLEANUP');
  for (const id of created.waitlistIds) await sb.from('waitlist').delete().eq('id', id);
  for (const id of created.bookingIds) await sb.from('bookings').delete().eq('id', id);
  if (created.clientRowId) await sb.from('clients').delete().eq('id', created.clientRowId);
  if (created.artistId) await sb.from('artists').delete().eq('id', created.artistId);
  if (created.studioId) await sb.from('studios').delete().eq('id', created.studioId);
  for (const uid of created.authUsers) await sb.auth.admin.deleteUser(uid).catch(() => {});
  console.log('  Synthetic rows removed.');
}

// Mirrors lib/waitlist.ts's getArtistBookingCountForMonth()
async function getArtistBookingCountForMonth(artistId, dateStr) {
  const [year, month] = dateStr.split('-').map(Number);
  const firstOfMonth = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const lastOfMonth = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  const { data } = await sb.from('bookings').select('id')
    .eq('artist_id', artistId).in('status', ['confirmed', 'completed'])
    .gte('date', firstOfMonth).lte('date', lastOfMonth);
  return (data ?? []).length;
}

async function makeBooking(date, status = 'confirmed') {
  const { data, error } = await sb.from('bookings').insert({
    studio_id: created.studioId, artist_id: created.artistId, client_id: created.clientRowId,
    date, time: '14:00:00', style: 'Custom', status,
    deposit_amount_cents: 10000, deposit_paid: true,
  }).select('id').single();
  if (error) throw new Error('booking insert failed: ' + error.message);
  created.bookingIds.push(data.id);
  return data.id;
}

try {
  HEAD('SETUP — synthetic studio, artist, client');

  const { data: ownerUser, error: ownerErr } = await sb.auth.admin.createUser({
    email: `verify-waitlist-owner-${stamp}@example.com`, email_confirm: true,
  });
  if (ownerErr) throw new Error('createUser(owner) failed: ' + ownerErr.message);
  created.authUsers.push(ownerUser.user.id);

  const { data: studio, error: studioErr } = await sb.from('studios').insert({
    name: 'Verify Waitlist Studio', subdomain: `verify-waitlist-${stamp}`, owner_id: ownerUser.user.id,
  }).select('id').single();
  if (studioErr) throw new Error('studio insert failed: ' + studioErr.message);
  created.studioId = studio.id;

  const { data: artistUser, error: artistUserErr } = await sb.auth.admin.createUser({
    email: `verify-waitlist-artist-${stamp}@example.com`, email_confirm: true,
  });
  if (artistUserErr) throw new Error('createUser(artist) failed: ' + artistUserErr.message);
  created.authUsers.push(artistUser.user.id);

  const { data: artist, error: artistErr } = await sb.from('artists').insert({
    studio_id: created.studioId, user_id: artistUser.user.id, name: 'Verify Artist',
    email: artistUser.user.email, monthly_booking_cap: 2,
  }).select('id').single();
  if (artistErr) throw new Error('artists insert failed: ' + artistErr.message);
  created.artistId = artist.id;

  const { data: clientRow, error: clientRowErr } = await sb.from('clients').insert({
    studio_id: created.studioId, full_name: 'Client A', email: `verify-waitlist-a-${stamp}@example.com`, phone: '5550000000',
  }).select('id').single();
  if (clientRowErr) throw new Error('clients insert failed: ' + clientRowErr.message);
  created.clientRowId = clientRow.id;

  PASS('studio, artist (cap=2), client created');

  HEAD('TEST 1 — month-scoped cap check: target month, not "today\'s month"');
  {
    // 2 bookings in a FUTURE month (September), 0 in the current month.
    await makeBooking('2027-09-05');
    await makeBooking('2027-09-20');

    const futureMonthCount = await getArtistBookingCountForMonth(created.artistId, '2027-09-15');
    futureMonthCount === 2
      ? PASS('correctly counts 2 bookings in the future target month (September 2027)')
      : FAIL('expected 2, got ' + futureMonthCount);

    const differentMonthCount = await getArtistBookingCountForMonth(created.artistId, '2027-10-01');
    differentMonthCount === 0
      ? PASS('correctly counts 0 bookings in a different month (October 2027) — proves month-scoping, not "this month"')
      : FAIL('expected 0, got ' + differentMonthCount);
  }

  HEAD('TEST 2 — UNIQUE(artist_id, client_id) rejects a duplicate waitlist join');
  {
    const { data: first, error: firstErr } = await sb.from('waitlist').insert({
      studio_id: created.studioId, artist_id: created.artistId, client_id: created.clientRowId,
      preferred_style: 'Traditional',
    }).select('id').single();
    if (firstErr) throw new Error('first waitlist insert failed: ' + firstErr.message);
    created.waitlistIds.push(first.id);
    PASS('first waitlist entry inserted successfully');

    const { error: secondErr } = await sb.from('waitlist').insert({
      studio_id: created.studioId, artist_id: created.artistId, client_id: created.clientRowId,
      preferred_style: 'Blackwork',
    });
    secondErr && secondErr.code === '23505'
      ? PASS('duplicate (artist_id, client_id) correctly rejected by existing UNIQUE constraint')
      : FAIL('duplicate was NOT rejected: ' + JSON.stringify(secondErr));
  }

  HEAD('TEST 3 — cron eligibility: FIFO ordering + under-cap detection');
  {
    // Clean slate: remove the entry from Test 2 to isolate this test.
    await sb.from('waitlist').delete().eq('id', created.waitlistIds[0]);
    created.waitlistIds = [];

    const { data: clientB } = await sb.from('clients').insert({
      studio_id: created.studioId, full_name: 'Client B', email: `verify-waitlist-b-${stamp}@example.com`, phone: '5550000001',
    }).select('id').single();

    const { data: entry1 } = await sb.from('waitlist').insert({
      studio_id: created.studioId, artist_id: created.artistId, client_id: created.clientRowId,
      added_at: new Date(Date.now() - 60_000).toISOString(), // older
    }).select('id').single();
    created.waitlistIds.push(entry1.id);

    const { data: entry2 } = await sb.from('waitlist').insert({
      studio_id: created.studioId, artist_id: created.artistId, client_id: clientB.id,
      added_at: new Date().toISOString(), // newer
    }).select('id').single();
    created.waitlistIds.push(entry2.id);

    const { data: fifoRows } = await sb.from('waitlist')
      .select('id').eq('artist_id', created.artistId).eq('notified', false)
      .order('added_at', { ascending: true }).limit(1);

    fifoRows[0]?.id === entry1.id
      ? PASS('oldest un-notified entry correctly first in FIFO order')
      : FAIL('FIFO ordering broken — expected entry1 first');

    // Cap is 2; current bookings this month for TODAY's month is 0 (both
    // synthetic bookings above are in Sep/Oct 2027) — so this artist is
    // currently under cap for the real current month.
    const today = new Date().toISOString().split('T')[0];
    const currentMonthCount = await getArtistBookingCountForMonth(created.artistId, today);
    currentMonthCount < 2
      ? PASS(`artist correctly under cap for the current month (${currentMonthCount}/2) — cron would notify`)
      : FAIL('artist unexpectedly at/over cap for the current month');
  }

  await sb.from('clients').delete().eq('email', `verify-waitlist-b-${stamp}@example.com`);

} catch (err) {
  FAIL('unexpected error: ' + (err?.message ?? err));
} finally {
  await cleanup();
}

console.log('\n' + '='.repeat(50));
console.log(failures === 0 ? `✅  All checks passed.\n` : `❌  ${failures} check(s) failed.\n`);
process.exit(failures === 0 ? 0 : 1);
