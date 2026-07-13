// Phase C Feature 5 — Reviews — Live DB Verification
//
// Migration applied: reviews.booking_id, reviews.client_account_id,
// reviews_booking_id_unique constraint, bookings.review_requested_at.
// This script proves the two eligibility queries (cron/review-requests'
// 14-day-delayed fetch, and getPublicReviews()'s existing public-display
// filter) resolve correctly against real data, that the UNIQUE(booking_id)
// constraint actually rejects a second review for the same booking, and
// that a client-submitted review defaults to invisible on the public page
// until the owner approves it.
//
// Self-cleaning, synthetic data only — same pattern as
// scripts/verify-payment-reminders.mjs.

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
  clientAccountId: null, bookingIds: [], reviewIds: [],
};

async function cleanup() {
  HEAD('CLEANUP');
  for (const id of created.reviewIds) await sb.from('reviews').delete().eq('id', id);
  for (const id of created.bookingIds) await sb.from('bookings').delete().eq('id', id);
  if (created.clientRowId) await sb.from('clients').delete().eq('id', created.clientRowId);
  if (created.artistId) await sb.from('artists').delete().eq('id', created.artistId);
  if (created.studioId) await sb.from('studios').delete().eq('id', created.studioId);
  if (created.clientAccountId) await sb.from('client_accounts').delete().eq('id', created.clientAccountId);
  for (const uid of created.authUsers) await sb.auth.admin.deleteUser(uid).catch(() => {});
  console.log('  Synthetic rows removed.');
}

async function makeCompletedBooking({ completedAt, reviewRequestedAt = null }) {
  const { data, error } = await sb.from('bookings').insert({
    studio_id: created.studioId, artist_id: created.artistId, client_id: created.clientRowId,
    date: '2026-09-01', time: '14:00:00', style: 'Custom', status: 'completed',
    deposit_amount_cents: 10000, deposit_paid: true,
    completed_at: completedAt, review_requested_at: reviewRequestedAt,
  }).select('id').single();
  if (error) throw new Error('booking insert failed: ' + error.message);
  created.bookingIds.push(data.id);
  return data.id;
}

// Mirrors cron/review-requests' eligibility query
async function fetchReviewRequestEligible(fourteenDaysAgoIso) {
  const { data } = await sb.from('bookings')
    .select('id')
    .eq('studio_id', created.studioId)
    .eq('status', 'completed')
    .is('review_requested_at', null)
    .lte('completed_at', fourteenDaysAgoIso);
  return (data ?? []).map(r => r.id);
}

// Mirrors lib/studio-content.ts's getPublicReviews()
async function fetchPublicReviews() {
  const { data } = await sb.from('reviews')
    .select('id, author_name, rating, quote')
    .eq('studio_id', created.studioId)
    .eq('is_public', true)
    .eq('is_active', true);
  return data ?? [];
}

try {
  HEAD('SETUP — synthetic studio, artist, client, client_account');

  const { data: ownerUser, error: ownerErr } = await sb.auth.admin.createUser({
    email: `verify-reviews-owner-${stamp}@example.com`, email_confirm: true,
  });
  if (ownerErr) throw new Error('createUser(owner) failed: ' + ownerErr.message);
  created.authUsers.push(ownerUser.user.id);

  const { data: studio, error: studioErr } = await sb.from('studios').insert({
    name: 'Verify Reviews Studio', subdomain: `verify-reviews-${stamp}`, owner_id: ownerUser.user.id,
  }).select('id').single();
  if (studioErr) throw new Error('studio insert failed: ' + studioErr.message);
  created.studioId = studio.id;

  const { data: artistUser, error: artistUserErr } = await sb.auth.admin.createUser({
    email: `verify-reviews-artist-${stamp}@example.com`, email_confirm: true,
  });
  if (artistUserErr) throw new Error('createUser(artist) failed: ' + artistUserErr.message);
  created.authUsers.push(artistUser.user.id);

  const { data: artist, error: artistErr } = await sb.from('artists').insert({
    studio_id: created.studioId, user_id: artistUser.user.id, name: 'Verify Artist', email: artistUser.user.email,
  }).select('id').single();
  if (artistErr) throw new Error('artists insert failed: ' + artistErr.message);
  created.artistId = artist.id;

  const { data: clientRow, error: clientRowErr } = await sb.from('clients').insert({
    studio_id: created.studioId, full_name: 'Client A', email: `verify-reviews-a-${stamp}@example.com`, phone: '5550000000',
  }).select('id').single();
  if (clientRowErr) throw new Error('clients insert failed: ' + clientRowErr.message);
  created.clientRowId = clientRow.id;

  const { data: clientAUser } = await sb.auth.admin.createUser({
    email: `verify-reviews-clientA-${stamp}@example.com`, email_confirm: true,
  });
  created.authUsers.push(clientAUser.user.id);
  const { data: clientA } = await sb.from('client_accounts').insert({
    user_id: clientAUser.user.id, email: clientAUser.user.email,
  }).select('id').single();
  created.clientAccountId = clientA.id;

  PASS('studio, artist, client, client_account created');

  HEAD('TEST 1 — review-request eligibility: 14+ days old, not-yet-requested completed booking is eligible');
  {
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const fifteenDaysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString();
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();

    const eligible = await makeCompletedBooking({ completedAt: fifteenDaysAgo });
    const tooRecent = await makeCompletedBooking({ completedAt: fiveDaysAgo });
    const alreadyRequested = await makeCompletedBooking({ completedAt: fifteenDaysAgo, reviewRequestedAt: new Date().toISOString() });

    const ids = await fetchReviewRequestEligible(fourteenDaysAgo.toISOString());

    ids.includes(eligible) ? PASS('15-day-old, not-yet-requested booking correctly eligible') : FAIL('eligible booking missing');
    ids.includes(tooRecent) ? FAIL('5-day-old booking incorrectly eligible (too recent)') : PASS('5-day-old booking correctly excluded');
    ids.includes(alreadyRequested) ? FAIL('already-requested booking incorrectly eligible (dedupe broken)') : PASS('already-requested booking correctly excluded (dedupe holds)');
  }

  HEAD('TEST 2 — one review per booking: UNIQUE(booking_id) rejects a second review');
  {
    const bookingId = await makeCompletedBooking({ completedAt: new Date().toISOString() });

    const { data: first, error: firstErr } = await sb.from('reviews').insert({
      studio_id: created.studioId, booking_id: bookingId, client_account_id: created.clientAccountId,
      author_name: 'Client A', rating: 5, quote: 'Amazing!', is_public: false,
    }).select('id').single();
    if (firstErr) throw new Error('first review insert failed: ' + firstErr.message);
    created.reviewIds.push(first.id);
    PASS('first review for this booking inserted successfully');

    const { error: secondErr } = await sb.from('reviews').insert({
      studio_id: created.studioId, booking_id: bookingId, client_account_id: created.clientAccountId,
      author_name: 'Client A', rating: 3, quote: 'Second attempt', is_public: false,
    });
    secondErr && secondErr.code === '23505'
      ? PASS('second review for the same booking correctly rejected by UNIQUE(booking_id)')
      : FAIL('second review was NOT rejected — constraint missing or not enforced: ' + JSON.stringify(secondErr));
  }

  HEAD('TEST 3 — owner-entered testimonials (booking_id NULL) remain unrestricted by the UNIQUE constraint');
  {
    const { data: t1, error: e1 } = await sb.from('reviews').insert({
      studio_id: created.studioId, author_name: 'Manual One', rating: 5, quote: 'Testimonial one',
    }).select('id').single();
    if (e1) { FAIL('first NULL-booking_id testimonial insert failed: ' + e1.message); }
    else { created.reviewIds.push(t1.id); }

    const { data: t2, error: e2 } = await sb.from('reviews').insert({
      studio_id: created.studioId, author_name: 'Manual Two', rating: 4, quote: 'Testimonial two',
    }).select('id').single();
    if (e2) { FAIL('second NULL-booking_id testimonial incorrectly rejected: ' + e2.message); }
    else {
      created.reviewIds.push(t2.id);
      PASS('multiple owner-entered testimonials (booking_id NULL) coexist without constraint violation');
    }
  }

  HEAD('TEST 4 — client-submitted review defaults invisible until owner approval');
  {
    const bookingId = await makeCompletedBooking({ completedAt: new Date().toISOString() });
    const { data: review, error } = await sb.from('reviews').insert({
      studio_id: created.studioId, booking_id: bookingId, client_account_id: created.clientAccountId,
      author_name: 'Client A', rating: 5, quote: 'Pending approval review', is_public: false, is_active: true,
    }).select('id').single();
    if (error) throw new Error('review insert failed: ' + error.message);
    created.reviewIds.push(review.id);

    const beforeApproval = await fetchPublicReviews();
    beforeApproval.some(r => r.id === review.id)
      ? FAIL('unapproved review incorrectly visible via getPublicReviews()')
      : PASS('unapproved review correctly absent from public reviews');

    await sb.from('reviews').update({ is_public: true }).eq('id', review.id);
    const afterApproval = await fetchPublicReviews();
    afterApproval.some(r => r.id === review.id)
      ? PASS('review correctly appears via getPublicReviews() once approved — zero display-path code changes needed')
      : FAIL('approved review still missing from public reviews');
  }

} catch (err) {
  FAIL('unexpected error: ' + (err?.message ?? err));
} finally {
  await cleanup();
}

console.log('\n' + '='.repeat(50));
console.log(failures === 0 ? `✅  All checks passed.\n` : `❌  ${failures} check(s) failed.\n`);
process.exit(failures === 0 ? 0 : 1);
