// Client Portal "History" — Live DB Verification
//
// No new tables/columns were added for this feature (it's a read-only
// aggregation over ai_chats -> consultations -> bookings/consent_forms/
// message_threads/ai_chat_messages), so there's no schema to probe. What
// matters is proving the aggregation + ownership scoping work correctly
// against real data. Self-cleaning, synthetic data only — same pattern as
// scripts/verify-client-bookings.mjs and scripts/verify-messaging.mjs.
//
// Mirrors the exact query shape of lib/client-portal/history.ts's
// getClientHistory() directly against the real DB (no TS runtime available
// in a plain .mjs script).

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
  consultationIds: [], bookingIds: [], threadIds: [],
};

async function cleanup() {
  HEAD('CLEANUP');
  for (const id of created.threadIds) await sb.from('message_threads').delete().eq('id', id);
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

// Mirrors getClientHistory() in lib/client-portal/history.ts
async function fetchClientHistory(studioId, clientAccountId) {
  const { data: chatRows } = await sb.from('ai_chats').select('id, consultation_id')
    .eq('studio_id', studioId).eq('client_account_id', clientAccountId).eq('status', 'submitted')
    .not('consultation_id', 'is', null);
  const chats = (chatRows ?? []).filter(r => r.consultation_id);

  const { data: threadRows } = await sb.from('message_threads').select('id, consultation_id')
    .eq('studio_id', studioId).eq('client_account_id', clientAccountId);
  const generalThreads = (threadRows ?? []).filter(t => !t.consultation_id);
  const threadByConsult = new Map((threadRows ?? []).filter(t => t.consultation_id).map(t => [t.consultation_id, t]));

  if (chats.length === 0) return { projects: [], generalThreads };

  const consultationIds = [...new Set(chats.map(c => c.consultation_id))];
  const { data: consultRows } = await sb.from('consultations')
    .select('id, status, created_at, updated_at, quote_accepted_at, final_price, booking_id')
    .in('id', consultationIds);
  const consultations = consultRows ?? [];

  const bookingIds = consultations.map(c => c.booking_id).filter(Boolean);
  const { data: bookingRows } = bookingIds.length
    ? await sb.from('bookings').select('id, status, deposit_paid_at').in('id', bookingIds) : { data: [] };
  const bookingById = new Map((bookingRows ?? []).map(b => [b.id, b]));

  const { data: consentRows } = bookingIds.length
    ? await sb.from('consent_forms').select('booking_id, signed_at').in('booking_id', bookingIds) : { data: [] };
  const consentByBooking = new Map((consentRows ?? []).map(c => [c.booking_id, c.signed_at]));

  const chatByConsult = new Map(chats.map(c => [c.consultation_id, c.id]));
  const chatIds = chats.map(c => c.id);
  const { data: transcriptRows } = chatIds.length
    ? await sb.from('ai_chat_messages').select('chat_id, role, content, created_at').in('chat_id', chatIds) : { data: [] };
  const transcriptByChat = new Map();
  for (const row of (transcriptRows ?? [])) {
    const list = transcriptByChat.get(row.chat_id) ?? [];
    list.push(row);
    transcriptByChat.set(row.chat_id, list);
  }

  const projects = consultations.map(c => {
    const timeline = [{ key: 'submitted', date: c.created_at }];
    if (c.final_price !== null) {
      timeline.push({ key: 'quote_ready', date: c.updated_at });
      if (c.quote_accepted_at) timeline.push({ key: 'quote_accepted', date: c.quote_accepted_at });
    }
    const booking = c.booking_id ? bookingById.get(c.booking_id) ?? null : null;
    if (booking?.deposit_paid_at) timeline.push({ key: 'deposit_paid', date: booking.deposit_paid_at });
    const consentSignedAt = c.booking_id ? consentByBooking.get(c.booking_id) : undefined;
    if (consentSignedAt) timeline.push({ key: 'consent_signed', date: consentSignedAt });
    if (c.status === 'lost') timeline.push({ key: 'declined', date: c.updated_at });

    const chatId = chatByConsult.get(c.id);
    const transcript = chatId ? (transcriptByChat.get(chatId) ?? []) : [];

    return { id: c.id, status: c.status, timeline, booking, thread: threadByConsult.get(c.id) ?? null, transcript };
  });

  return { projects, generalThreads };
}

try {
  HEAD('SETUP — studio, artist, 2 clients, 3 projects (submitted-only / deposit+consent / lost), 1 general thread');

  const { data: ownerUser } = await sb.auth.admin.createUser({ email: `verify-history-owner-${stamp}@example.com`, email_confirm: true });
  created.authUsers.push(ownerUser.user.id);
  const { data: studio } = await sb.from('studios').insert({ name: 'Verify History Studio', subdomain: `verify-history-${stamp}`, owner_id: ownerUser.user.id }).select('id').single();
  created.studioId = studio.id;

  const { data: artistUser } = await sb.auth.admin.createUser({ email: `verify-history-artist-${stamp}@example.com`, email_confirm: true });
  created.authUsers.push(artistUser.user.id);
  const { data: artist } = await sb.from('artists').insert({ studio_id: created.studioId, user_id: artistUser.user.id, name: 'Verify Artist', email: artistUser.user.email }).select('id').single();
  created.artistId = artist.id;

  const { data: clientAUser } = await sb.auth.admin.createUser({ email: `verify-history-clientA-${stamp}@example.com`, email_confirm: true });
  created.authUsers.push(clientAUser.user.id);
  const { data: clientA } = await sb.from('client_accounts').insert({ user_id: clientAUser.user.id, email: clientAUser.user.email }).select('id').single();
  created.clientAAccountId = clientA.id;

  const { data: clientBUser } = await sb.auth.admin.createUser({ email: `verify-history-clientB-${stamp}@example.com`, email_confirm: true });
  created.authUsers.push(clientBUser.user.id);
  const { data: clientB } = await sb.from('client_accounts').insert({ user_id: clientBUser.user.id, email: clientBUser.user.email }).select('id').single();
  created.clientBAccountId = clientB.id;

  const { data: clientRow } = await sb.from('clients').insert({ studio_id: created.studioId, full_name: 'Client A', email: clientAUser.user.email, phone: '5550000000' }).select('id').single();
  created.clientRowId = clientRow.id;

  async function makeConsultation({ status, final_price, quote_accepted_at, bookingStatus, depositPaidAt, consent, chatMessages }) {
    const { data: consult, error: cErr } = await sb.from('consultations').insert({
      studio_id: created.studioId, artist_id: created.artistId,
      client_name: 'Client A', client_email: clientAUser.user.email, client_phone: '5550000000',
      tattoo_description: `Verification tattoo (${status})`, placement: 'forearm',
      estimated_size: 'Medium', color_preference: 'Black & Grey', budget_range: '$500-800',
      status, final_price: final_price ?? null, quote_accepted_at: quote_accepted_at ?? null,
    }).select('id').single();
    if (cErr) throw new Error('consultation insert failed: ' + cErr.message);
    created.consultationIds.push(consult.id);

    let bookingId = null;
    if (bookingStatus) {
      const { data: booking, error: bErr } = await sb.from('bookings').insert({
        studio_id: created.studioId, artist_id: created.artistId, client_id: created.clientRowId,
        date: '2026-09-01', time: '14:00:00', style: 'Custom', status: bookingStatus,
        deposit_amount_cents: 10000, deposit_paid: Boolean(depositPaidAt), deposit_paid_at: depositPaidAt ?? null,
      }).select('id').single();
      if (bErr) throw new Error('booking insert failed: ' + bErr.message);
      bookingId = booking.id;
      created.bookingIds.push(bookingId);
      await sb.from('consultations').update({ booking_id: bookingId }).eq('id', consult.id);

      if (consent) {
        const { error: cfErr } = await sb.from('consent_forms').insert({
          booking_id: bookingId, client_id: created.clientRowId, client_signature: 'Client A',
          id_photo_url: 'https://example.com/id.jpg', state_template: 'CA',
        });
        if (cfErr) throw new Error('consent_forms insert failed: ' + cfErr.message);
      }
    }

    const { data: chat, error: chatErr } = await sb.from('ai_chats').insert({
      studio_id: created.studioId, client_account_id: created.clientAAccountId,
      status: 'submitted', consultation_id: consult.id,
    }).select('id').single();
    if (chatErr) throw new Error('ai_chats insert failed: ' + chatErr.message);

    if (chatMessages) {
      for (const m of chatMessages) {
        await sb.from('ai_chat_messages').insert({ chat_id: chat.id, role: m.role, content: m.content });
      }
    }

    return { consultationId: consult.id, bookingId };
  }

  const submittedOnly = await makeConsultation({ status: 'new' });
  const depositPaidWithConsent = await makeConsultation({
    status: 'deposit_paid', final_price: 800, quote_accepted_at: new Date().toISOString(),
    bookingStatus: 'confirmed', depositPaidAt: new Date().toISOString(), consent: true,
    chatMessages: [{ role: 'user', content: 'I want a dragon' }, { role: 'assistant', content: 'Great choice!' }],
  });
  const lost = await makeConsultation({ status: 'lost' });
  PASS('3 projects created (submitted-only, deposit-paid+consent, lost)');

  const { data: generalThread, error: gtErr } = await sb.from('message_threads').insert({
    studio_id: created.studioId, client_account_id: created.clientAAccountId, consultation_id: null,
  }).select('id').single();
  if (gtErr) throw new Error('general thread insert failed: ' + gtErr.message);
  created.threadIds.push(generalThread.id);
  await sb.from('messages').insert({ thread_id: generalThread.id, sender_role: 'owner', content: 'Welcome!' });
  PASS('1 general (non-project) thread created');

  HEAD('TEST 1 — client A: submitted-only project has just the "submitted" event');
  {
    const { projects } = await fetchClientHistory(created.studioId, created.clientAAccountId);
    const p = projects.find(p => p.id === submittedOnly.consultationId);
    const keys = p?.timeline.map(t => t.key) ?? [];
    JSON.stringify(keys) === JSON.stringify(['submitted'])
      ? PASS('submitted-only project has exactly one timeline entry')
      : FAIL('expected ["submitted"], got ' + JSON.stringify(keys));
  }

  HEAD('TEST 2 — client A: deposit-paid+consent project has the full timeline + booking + transcript');
  {
    const { projects } = await fetchClientHistory(created.studioId, created.clientAAccountId);
    const p = projects.find(p => p.id === depositPaidWithConsent.consultationId);
    const keys = p?.timeline.map(t => t.key) ?? [];
    ['submitted', 'quote_ready', 'quote_accepted', 'deposit_paid', 'consent_signed'].every(k => keys.includes(k))
      ? PASS('all 5 expected timeline events present: ' + keys.join(', '))
      : FAIL('missing expected events, got: ' + keys.join(', '));
    p?.booking?.id === depositPaidWithConsent.bookingId
      ? PASS('booking correctly attached')
      : FAIL('booking not attached correctly: ' + JSON.stringify(p?.booking));
    p?.transcript.length === 2
      ? PASS('AI transcript correctly attached (2 messages)')
      : FAIL('transcript length wrong: ' + p?.transcript.length);
  }

  HEAD('TEST 3 — client A: lost project has a "declined" entry');
  {
    const { projects } = await fetchClientHistory(created.studioId, created.clientAAccountId);
    const p = projects.find(p => p.id === lost.consultationId);
    p?.timeline.some(t => t.key === 'declined')
      ? PASS('declined entry present for lost project')
      : FAIL('declined entry missing');
  }

  HEAD('TEST 4 — client A: general thread surfaced separately from projects');
  {
    const { generalThreads } = await fetchClientHistory(created.studioId, created.clientAAccountId);
    generalThreads.length === 1 && generalThreads[0].id === generalThread.id
      ? PASS('general thread correctly surfaced, separate from project list')
      : FAIL('general thread not found correctly: ' + JSON.stringify(generalThreads));
  }

  HEAD('TEST 5 — cross-client isolation: client B sees NOTHING of client A\'s history');
  {
    const { projects, generalThreads } = await fetchClientHistory(created.studioId, created.clientBAccountId);
    projects.length === 0 && generalThreads.length === 0
      ? PASS('client B\'s history is completely empty')
      : FAIL('SECURITY: client B saw client A\'s data — projects: ' + projects.length + ', threads: ' + generalThreads.length);
  }

} catch (err) {
  FAIL('unexpected error: ' + (err?.message ?? err));
} finally {
  await cleanup();
}

console.log('\n' + '='.repeat(50));
console.log(failures === 0 ? `✅  All checks passed.\n` : `❌  ${failures} check(s) failed.\n`);
process.exit(failures === 0 ? 0 : 1);
