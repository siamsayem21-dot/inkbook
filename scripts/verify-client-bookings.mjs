// Client Portal "My Bookings" — Live DB Verification
//
// No new tables/columns were added for this feature (it's a read-only
// extension over the existing ai_chats -> consultations.booking_id -> bookings
// chain), so there's no schema to probe. What matters here is proving the
// OWNERSHIP CHAIN itself is correctly scoped against real data — in
// particular, that one client can never see another client's booking by
// guessing a bookingId. Self-cleaning, synthetic data only (no real rows
// read or touched) — same pattern as scripts/verify-messaging.mjs.
//
// This replicates the exact query shape of lib/client-portal/bookings.ts's
// getClientBookings()/getClientBookingDetail() directly against the real DB
// (no TS runtime available in this script — see verify-deposit-ownership.mjs
// for the same "simulate the ownership check logic against the real DB"
// precedent).

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
  consultationIds: [], bookingIds: [],
};

async function cleanup() {
  HEAD('CLEANUP');
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

// Mirrors getClientBookings() in lib/client-portal/bookings.ts
async function fetchClientBookings(studioId, clientAccountId) {
  const { data: chatRows } = await sb.from('ai_chats').select('consultation_id')
    .eq('studio_id', studioId).eq('client_account_id', clientAccountId).eq('status', 'submitted')
    .not('consultation_id', 'is', null);
  const consultationIds = [...new Set((chatRows ?? []).map(r => r.consultation_id).filter(Boolean))];
  if (consultationIds.length === 0) return [];

  const { data: consultRows } = await sb.from('consultations').select('id, booking_id')
    .in('id', consultationIds).not('booking_id', 'is', null);
  const bookingIds = (consultRows ?? []).map(c => c.booking_id);
  if (bookingIds.length === 0) return [];

  const { data: bookingRows } = await sb.from('bookings').select('id, status').in('id', bookingIds);
  return bookingRows ?? [];
}

// Mirrors getClientBookingDetail()'s ownership proof
async function fetchClientBookingDetail(studioId, clientAccountId, bookingId) {
  const { data: chatRows } = await sb.from('ai_chats').select('consultation_id')
    .eq('studio_id', studioId).eq('client_account_id', clientAccountId).eq('status', 'submitted')
    .not('consultation_id', 'is', null);
  const consultationIds = [...new Set((chatRows ?? []).map(r => r.consultation_id).filter(Boolean))];
  if (consultationIds.length === 0) return null;

  const { data: consultRow } = await sb.from('consultations').select('id')
    .in('id', consultationIds).eq('booking_id', bookingId).maybeSingle();
  if (!consultRow) return null;

  const { data: bookingRow } = await sb.from('bookings').select('id, status').eq('id', bookingId).maybeSingle();
  return bookingRow ?? null;
}

try {
  HEAD('SETUP — synthetic studio, artist, 2 clients, 4 bookings (3 statuses + 1 unlinked)');

  const { data: ownerUser, error: ownerErr } = await sb.auth.admin.createUser({
    email: `verify-bookings-owner-${stamp}@example.com`, email_confirm: true,
  });
  if (ownerErr) throw new Error('createUser(owner) failed: ' + ownerErr.message);
  created.authUsers.push(ownerUser.user.id);

  const { data: studio, error: studioErr } = await sb.from('studios').insert({
    name: 'Verify Bookings Studio', subdomain: `verify-bookings-${stamp}`, owner_id: ownerUser.user.id,
  }).select('id').single();
  if (studioErr) throw new Error('studio insert failed: ' + studioErr.message);
  created.studioId = studio.id;

  const { data: artistUser, error: artistUserErr } = await sb.auth.admin.createUser({
    email: `verify-bookings-artist-${stamp}@example.com`, email_confirm: true,
  });
  if (artistUserErr) throw new Error('createUser(artist) failed: ' + artistUserErr.message);
  created.authUsers.push(artistUser.user.id);

  const { data: artist, error: artistErr } = await sb.from('artists').insert({
    studio_id: created.studioId, user_id: artistUser.user.id, name: 'Verify Artist', email: artistUser.user.email,
  }).select('id').single();
  if (artistErr) throw new Error('artists insert failed: ' + artistErr.message);
  created.artistId = artist.id;

  const { data: clientAUser } = await sb.auth.admin.createUser({
    email: `verify-bookings-clientA-${stamp}@example.com`, email_confirm: true,
  });
  created.authUsers.push(clientAUser.user.id);
  const { data: clientA } = await sb.from('client_accounts').insert({
    user_id: clientAUser.user.id, email: clientAUser.user.email,
  }).select('id').single();
  created.clientAAccountId = clientA.id;

  const { data: clientBUser } = await sb.auth.admin.createUser({
    email: `verify-bookings-clientB-${stamp}@example.com`, email_confirm: true,
  });
  created.authUsers.push(clientBUser.user.id);
  const { data: clientB } = await sb.from('client_accounts').insert({
    user_id: clientBUser.user.id, email: clientBUser.user.email,
  }).select('id').single();
  created.clientBAccountId = clientB.id;

  // bookings.client_id is NOT NULL (studio-scoped `clients` row, separate
  // from client_accounts) — create one real clients row up front and reuse
  // it for every synthetic booking below.
  const { data: clientRow, error: clientRowErr } = await sb.from('clients').insert({
    studio_id: created.studioId, full_name: 'Client A', email: clientAUser.user.email, phone: '5550000000',
  }).select('id').single();
  if (clientRowErr) throw new Error('clients insert failed: ' + clientRowErr.message);
  created.clientRowId = clientRow.id;

  // Helper: create a consultation + booking (in the given status) + a
  // submitted ai_chats row linking it to client A. Returns { consultId, bookingId }.
  async function makeLinkedBooking(status, hasSchedule) {
    const { data: consult, error: cErr } = await sb.from('consultations').insert({
      studio_id: created.studioId, artist_id: created.artistId,
      client_name: 'Client A', client_email: clientAUser.user.email, client_phone: '5550000000',
      tattoo_description: `Verification tattoo (${status})`, placement: 'forearm',
      estimated_size: 'Medium', color_preference: 'Black & Grey', budget_range: '$500-800', status: 'quoted',
    }).select('id').single();
    if (cErr) throw new Error('consultation insert failed: ' + cErr.message);
    created.consultationIds.push(consult.id);

    const { data: booking, error: bErr } = await sb.from('bookings').insert({
      studio_id: created.studioId, artist_id: created.artistId, client_id: created.clientRowId,
      date: hasSchedule ? '2026-09-01' : null, time: hasSchedule ? '14:00:00' : null,
      style: 'Custom', status, deposit_amount_cents: 10000,
      deposit_paid: status !== 'pending_deposit',
    }).select('id').single();
    if (bErr) throw new Error('booking insert failed: ' + bErr.message);
    created.bookingIds.push(booking.id);

    await sb.from('consultations').update({ booking_id: booking.id }).eq('id', consult.id);
    return { consultId: consult.id, bookingId: booking.id };
  }

  const pending = await makeLinkedBooking('pending_deposit', false);
  const awaiting = await makeLinkedBooking('awaiting_schedule', false);
  const confirmed = await makeLinkedBooking('confirmed', true);
  PASS('3 linked bookings created (pending_deposit, awaiting_schedule, confirmed)');

  // Link all 3 consultations to client A via a submitted ai_chats row each.
  for (const { consultId } of [pending, awaiting, confirmed]) {
    const { error } = await sb.from('ai_chats').insert({
      studio_id: created.studioId, client_account_id: created.clientAAccountId,
      status: 'submitted', consultation_id: consultId,
    });
    if (error) throw new Error('ai_chats insert failed: ' + error.message);
  }
  PASS('3 ai_chats rows link client A to those consultations');

  // A 4th booking that exists but has NO ai_chats link at all — simulates a
  // walk-in/legacy booking. Must be invisible to My Bookings.
  const unlinked = await makeLinkedBooking('confirmed', true);
  PASS('1 unlinked ("legacy") booking created, deliberately not connected via ai_chats');

  HEAD('TEST 1 — client A sees exactly the 3 linked bookings, not the unlinked one');
  {
    const rows = await fetchClientBookings(created.studioId, created.clientAAccountId);
    const ids = rows.map(r => r.id).sort();
    const expected = [pending.bookingId, awaiting.bookingId, confirmed.bookingId].sort();
    JSON.stringify(ids) === JSON.stringify(expected)
      ? PASS('client A sees exactly the 3 linked bookings')
      : FAIL(`expected ${JSON.stringify(expected)}, got ${JSON.stringify(ids)}`);
    ids.includes(unlinked.bookingId)
      ? FAIL('unlinked/legacy booking leaked into client A\'s list')
      : PASS('unlinked/legacy booking correctly absent');
  }

  HEAD('TEST 2 — cross-client isolation: client B sees NONE of client A\'s bookings');
  {
    const rows = await fetchClientBookings(created.studioId, created.clientBAccountId);
    rows.length === 0
      ? PASS('client B\'s booking list is empty (no ai_chats rows of their own)')
      : FAIL('client B unexpectedly saw bookings: ' + JSON.stringify(rows));
  }

  HEAD('TEST 3 — detail view: client A can open their own booking');
  {
    const row = await fetchClientBookingDetail(created.studioId, created.clientAAccountId, confirmed.bookingId);
    row && row.id === confirmed.bookingId
      ? PASS('client A successfully fetched their own confirmed booking detail')
      : FAIL('client A could not fetch their own booking: ' + JSON.stringify(row));
  }

  HEAD('TEST 4 — detail view: client B CANNOT open client A\'s booking by guessing its id (critical)');
  {
    const row = await fetchClientBookingDetail(created.studioId, created.clientBAccountId, confirmed.bookingId);
    row === null
      ? PASS('client B correctly denied access to client A\'s booking id')
      : FAIL('SECURITY: client B fetched client A\'s booking detail: ' + JSON.stringify(row));
  }

  HEAD('TEST 5 — detail view: nobody can open the unlinked/legacy booking via this feature');
  {
    const row = await fetchClientBookingDetail(created.studioId, created.clientAAccountId, unlinked.bookingId);
    row === null
      ? PASS('unlinked/legacy booking correctly inaccessible even to the studio\'s own client A')
      : FAIL('unlinked booking was unexpectedly accessible: ' + JSON.stringify(row));
  }

} catch (err) {
  FAIL('unexpected error: ' + (err?.message ?? err));
} finally {
  await cleanup();
}

console.log('\n' + '='.repeat(50));
console.log(failures === 0 ? `✅  All checks passed.\n` : `❌  ${failures} check(s) failed.\n`);
process.exit(failures === 0 ? 0 : 1);
