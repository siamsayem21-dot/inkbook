// Client Portal "Settings" — Live DB Verification
//
// Proves client_accounts.name round-trips correctly and that a write scoped
// to one client's id never touches another's row. Self-cleaning, synthetic
// data only — same pattern as the last four features' verify-*.mjs scripts.
//
// Mirrors the exact write shape of updateDisplayName()
// (app/portal/[studio]/settings/actions.ts) directly against the real DB
// (no TS runtime available in a plain .mjs script).

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
const created = { authUsers: [], clientAAccountId: null, clientBAccountId: null };

async function cleanup() {
  HEAD('CLEANUP');
  if (created.clientAAccountId) await sb.from('client_accounts').delete().eq('id', created.clientAAccountId);
  if (created.clientBAccountId) await sb.from('client_accounts').delete().eq('id', created.clientBAccountId);
  for (const uid of created.authUsers) await sb.auth.admin.deleteUser(uid).catch(() => {});
  console.log('  Synthetic rows removed.');
}

// Mirrors updateDisplayName()'s write shape
function normalize(name) {
  const trimmed = name.trim().slice(0, 100);
  return trimmed || null;
}

try {
  HEAD('SETUP — 2 synthetic client accounts');

  const { data: clientAUser } = await sb.auth.admin.createUser({ email: `verify-settings-clientA-${stamp}@example.com`, email_confirm: true });
  created.authUsers.push(clientAUser.user.id);
  const { data: clientA } = await sb.from('client_accounts').insert({ user_id: clientAUser.user.id, email: clientAUser.user.email }).select('id, name').single();
  created.clientAAccountId = clientA.id;

  const { data: clientBUser } = await sb.auth.admin.createUser({ email: `verify-settings-clientB-${stamp}@example.com`, email_confirm: true });
  created.authUsers.push(clientBUser.user.id);
  const { data: clientB } = await sb.from('client_accounts').insert({ user_id: clientBUser.user.id, email: clientBUser.user.email }).select('id, name').single();
  created.clientBAccountId = clientB.id;

  clientA.name === null ? PASS('new account starts with name = null') : FAIL('expected null, got ' + JSON.stringify(clientA.name));

  HEAD('TEST 1 — name round-trips correctly (with whitespace trimmed)');
  {
    const { error } = await sb.from('client_accounts').update({ name: normalize('  Alex Client  ') }).eq('id', created.clientAAccountId);
    if (error) FAIL('update failed: ' + error.message);

    const { data } = await sb.from('client_accounts').select('name').eq('id', created.clientAAccountId).single();
    data.name === 'Alex Client' ? PASS('name saved and trimmed correctly: "' + data.name + '"') : FAIL('expected "Alex Client", got ' + JSON.stringify(data.name));
  }

  HEAD('TEST 2 — clearing the name (empty string) sets it back to null');
  {
    const { error } = await sb.from('client_accounts').update({ name: normalize('   ') }).eq('id', created.clientAAccountId);
    if (error) FAIL('clear update failed: ' + error.message);

    const { data } = await sb.from('client_accounts').select('name').eq('id', created.clientAAccountId).single();
    data.name === null ? PASS('name correctly cleared back to null') : FAIL('expected null, got ' + JSON.stringify(data.name));
  }

  HEAD('TEST 3 — a write scoped to client A never touches client B\'s row (critical)');
  {
    await sb.from('client_accounts').update({ name: normalize('Client A Name') }).eq('id', created.clientAAccountId);

    const { data: bRow } = await sb.from('client_accounts').select('name').eq('id', created.clientBAccountId).single();
    bRow.name === null
      ? PASS('client B\'s row is untouched by client A\'s write')
      : FAIL('SECURITY: client B\'s name was affected by client A\'s update: ' + JSON.stringify(bRow.name));

    const { data: aRow } = await sb.from('client_accounts').select('name').eq('id', created.clientAAccountId).single();
    aRow.name === 'Client A Name'
      ? PASS('client A\'s own row correctly updated')
      : FAIL('client A\'s row not updated correctly: ' + JSON.stringify(aRow.name));
  }

} catch (err) {
  FAIL('unexpected error: ' + (err?.message ?? err));
} finally {
  await cleanup();
}

console.log('\n' + '='.repeat(50));
console.log(failures === 0 ? `✅  All checks passed.\n` : `❌  ${failures} check(s) failed.\n`);
process.exit(failures === 0 ? 0 : 1);
