// Client <-> Studio Messaging — Live DB Verification
//
// Self-cleaning integration test against the real Supabase project, using
// only synthetic data created and torn down by this script (no real client/
// studio rows are read or touched) — same pattern as
// scripts/verify-deposit-ownership.mjs.
//
// Proves:
//   1. message_threads / messages tables + all columns exist
//   2. idx_message_threads_project — one thread per (client, studio, project)
//   3. idx_message_threads_general — one "general" thread per (client, studio)
//   4. messages.sender_role CHECK constraint rejects invalid roles
//   5. message_threads.artist_id ON DELETE SET NULL
//   6. message_threads.client_account_id ON DELETE CASCADE (thread + messages)
//   7. A full thread lifecycle: client message -> owner reply -> artist reply

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
const created = { authUsers: [], studioId: null, artistId: null, clientAccountId: null, consultationId: null, threadIds: [] };

async function cleanup() {
  HEAD('CLEANUP');
  for (const id of created.threadIds) {
    await sb.from('message_threads').delete().eq('id', id);
  }
  if (created.consultationId) await sb.from('consultations').delete().eq('id', created.consultationId);
  if (created.artistId) await sb.from('artists').delete().eq('id', created.artistId);
  if (created.studioId) await sb.from('studios').delete().eq('id', created.studioId);
  if (created.clientAccountId) await sb.from('client_accounts').delete().eq('id', created.clientAccountId);
  for (const uid of created.authUsers) {
    await sb.auth.admin.deleteUser(uid).catch(() => {});
  }
  console.log('  Synthetic rows removed.');
}

try {
  HEAD('SETUP — synthetic studio, client, artist, project');

  const { data: ownerUser, error: ownerErr } = await sb.auth.admin.createUser({
    email: `verify-messaging-owner-${stamp}@example.com`, email_confirm: true,
  });
  if (ownerErr) throw new Error('createUser(owner) failed: ' + ownerErr.message);
  created.authUsers.push(ownerUser.user.id);

  const { data: studio, error: studioErr } = await sb.from('studios').insert({
    name: 'Verify Messaging Studio', subdomain: `verify-messaging-${stamp}`, owner_id: ownerUser.user.id,
  }).select('id').single();
  if (studioErr) throw new Error('studio insert failed: ' + studioErr.message);
  created.studioId = studio.id;
  PASS('synthetic studio created');

  const { data: clientUser, error: clientErr } = await sb.auth.admin.createUser({
    email: `verify-messaging-client-${stamp}@example.com`, email_confirm: true,
  });
  if (clientErr) throw new Error('createUser(client) failed: ' + clientErr.message);
  created.authUsers.push(clientUser.user.id);

  const { data: clientAccount, error: caErr } = await sb.from('client_accounts').insert({
    user_id: clientUser.user.id, email: clientUser.user.email,
  }).select('id').single();
  if (caErr) throw new Error('client_accounts insert failed: ' + caErr.message);
  created.clientAccountId = clientAccount.id;
  PASS('synthetic client_account created');

  const { data: artistUser, error: artistUserErr } = await sb.auth.admin.createUser({
    email: `verify-messaging-artist-${stamp}@example.com`, email_confirm: true,
  });
  if (artistUserErr) throw new Error('createUser(artist) failed: ' + artistUserErr.message);
  created.authUsers.push(artistUser.user.id);

  const { data: artist, error: artistErr } = await sb.from('artists').insert({
    studio_id: created.studioId, user_id: artistUser.user.id, name: 'Verify Artist', email: artistUser.user.email,
  }).select('id').single();
  if (artistErr) throw new Error('artists insert failed: ' + artistErr.message);
  created.artistId = artist.id;
  PASS('synthetic artist created');

  const { data: consult, error: consultErr } = await sb.from('consultations').insert({
    studio_id: created.studioId, artist_id: created.artistId,
    client_name: 'Verify Client', client_email: clientUser.user.email, client_phone: '5550000000',
    tattoo_description: 'Verification test tattoo', placement: 'forearm',
    estimated_size: 'Medium', color_preference: 'Black & Grey', budget_range: '$500-800',
    status: 'quoted',
  }).select('id').single();
  if (consultErr) throw new Error('consultations insert failed: ' + consultErr.message);
  created.consultationId = consult.id;
  PASS('synthetic project (consultation) created');

  HEAD('TEST 1 — schema: message_threads / messages columns exist');
  {
    const r1 = await sb.from('message_threads').select(
      'id,studio_id,client_account_id,consultation_id,artist_id,client_last_read_at,studio_last_read_at,created_at,updated_at'
    ).limit(0);
    r1.error ? FAIL('message_threads columns: ' + r1.error.message) : PASS('message_threads has all expected columns');

    const r2 = await sb.from('messages').select(
      'id,thread_id,sender_role,sender_client_account_id,sender_artist_id,content,image_url,created_at'
    ).limit(0);
    r2.error ? FAIL('messages columns: ' + r2.error.message) : PASS('messages has all expected columns');
  }

  HEAD('TEST 2 — idx_message_threads_project (one thread per client+studio+project)');
  {
    const { data: t1, error: e1 } = await sb.from('message_threads').insert({
      studio_id: created.studioId, client_account_id: created.clientAccountId,
      consultation_id: created.consultationId, artist_id: created.artistId,
    }).select('id').single();
    if (e1) { FAIL('first project-scoped thread insert failed: ' + e1.message); }
    else { created.threadIds.push(t1.id); PASS('first project-scoped thread created'); }

    const { error: e2 } = await sb.from('message_threads').insert({
      studio_id: created.studioId, client_account_id: created.clientAccountId,
      consultation_id: created.consultationId,
    });
    if (e2 && e2.code === '23505') PASS('duplicate project-scoped thread correctly rejected (unique violation)');
    else FAIL('expected a 23505 unique violation on duplicate project thread, got: ' + JSON.stringify(e2));
  }

  HEAD('TEST 3 — idx_message_threads_general (one general thread per client+studio)');
  {
    const { data: g1, error: e1 } = await sb.from('message_threads').insert({
      studio_id: created.studioId, client_account_id: created.clientAccountId, consultation_id: null,
    }).select('id').single();
    if (e1) { FAIL('first general thread insert failed: ' + e1.message); }
    else { created.threadIds.push(g1.id); PASS('first general thread created'); }

    const { error: e2 } = await sb.from('message_threads').insert({
      studio_id: created.studioId, client_account_id: created.clientAccountId, consultation_id: null,
    });
    if (e2 && e2.code === '23505') PASS('duplicate general thread correctly rejected (unique violation)');
    else FAIL('expected a 23505 unique violation on duplicate general thread, got: ' + JSON.stringify(e2));
  }

  HEAD('TEST 4 — messages.sender_role CHECK constraint');
  {
    const threadId = created.threadIds[0];
    const { error } = await sb.from('messages').insert({ thread_id: threadId, sender_role: 'bogus', content: 'x' });
    error && error.code === '23514'
      ? PASS('invalid sender_role correctly rejected (check violation)')
      : FAIL('expected a 23514 check violation for bad sender_role, got: ' + JSON.stringify(error));
  }

  HEAD('TEST 5 — full thread lifecycle (client -> owner -> artist)');
  {
    const threadId = created.threadIds[0];
    const { data: m1, error: e1 } = await sb.from('messages').insert({
      thread_id: threadId, sender_role: 'client', sender_client_account_id: created.clientAccountId,
      content: 'Hi, quick question about my quote.',
    }).select('id').single();
    e1 ? FAIL('client message insert failed: ' + e1.message) : PASS('client message inserted');

    const { error: e2 } = await sb.from('messages').insert({
      thread_id: threadId, sender_role: 'owner', content: 'Sure, happy to help!',
    });
    e2 ? FAIL('owner message insert failed: ' + e2.message) : PASS('owner message inserted');

    const { error: e3 } = await sb.from('messages').insert({
      thread_id: threadId, sender_role: 'artist', sender_artist_id: created.artistId,
      content: 'I can also confirm the placement works well.',
    });
    e3 ? FAIL('artist message insert failed: ' + e3.message) : PASS('artist message inserted');

    const { data: transcript, error: e4 } = await sb.from('messages').select('sender_role, content').eq('thread_id', threadId).order('created_at');
    if (e4 || !transcript || transcript.length !== 3) FAIL('expected 3 messages in transcript, got: ' + JSON.stringify(transcript ?? e4));
    else PASS('transcript reads back all 3 messages in order: ' + transcript.map(m => m.sender_role).join(' -> '));
  }

  HEAD('TEST 6 — artist_id ON DELETE SET NULL');
  {
    const threadId = created.threadIds[0];
    // consultations.artist_id has no ON DELETE clause (NO ACTION, pre-existing
    // schema — see 20260621000001_consultation_booking_link.sql) — it would
    // block the artist delete below with an unrelated FK violation, so clear
    // that reference first to isolate the thing this test actually checks:
    // message_threads.artist_id's own ON DELETE SET NULL.
    await sb.from('consultations').update({ artist_id: null }).eq('id', created.consultationId);
    const { error: delErr } = await sb.from('artists').delete().eq('id', created.artistId);
    if (delErr) FAIL('artist delete unexpectedly failed: ' + delErr.message);
    const { data: threadAfter, error } = await sb.from('message_threads').select('artist_id').eq('id', threadId).single();
    if (error) FAIL('re-fetch after artist delete failed: ' + error.message);
    else if (threadAfter.artist_id === null) PASS('thread.artist_id correctly nulled after artist deletion');
    else FAIL('expected artist_id to be null after artist deletion, got: ' + threadAfter.artist_id);
    created.artistId = null; // already deleted — skip in cleanup
  }

  HEAD('TEST 7 — client_account_id ON DELETE CASCADE (thread + messages)');
  {
    const threadId = created.threadIds[0];
    await sb.from('client_accounts').delete().eq('id', created.clientAccountId);

    const { data: threadAfter } = await sb.from('message_threads').select('id').eq('id', threadId).maybeSingle();
    threadAfter === null ? PASS('thread cascade-deleted with client_account') : FAIL('thread still exists after client_account delete');

    const { data: msgsAfter } = await sb.from('messages').select('id').eq('thread_id', threadId);
    (!msgsAfter || msgsAfter.length === 0)
      ? PASS('messages cascade-deleted with thread')
      : FAIL('messages still exist after thread cascade-delete');

    created.threadIds = created.threadIds.filter((id) => id !== threadId); // already gone — skip in cleanup
    created.clientAccountId = null; // already deleted — skip in cleanup
  }

} catch (err) {
  FAIL('unexpected error: ' + (err?.message ?? err));
} finally {
  await cleanup();
}

console.log('\n' + '='.repeat(50));
console.log(failures === 0 ? `✅  All checks passed.\n` : `❌  ${failures} check(s) failed.\n`);
process.exit(failures === 0 ? 0 : 1);
