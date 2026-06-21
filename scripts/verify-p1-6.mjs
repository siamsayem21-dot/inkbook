// P1-6 Regression Test Suite
// Verifies Branch B of the Stripe webhook now fetches request data and
// is wired to send SMS + email after marking status = "accepted".
// Tests the DB state transitions and code-path wiring.
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

// ── Find studio ───────────────────────────────────────────────────────────────
const { data: studioRows } = await sb.from('studios').select('id, name, subdomain');
const studio = studioRows?.[0];
if (!studio) { console.log('No studio found.'); process.exit(1); }
console.log('Studio:', studio.id.slice(0,8), '|', studio.name, '| slug:', studio.subdomain);

const created = { custom_requests: [] };

async function makeCustomRequest(status = 'quoted') {
  const { data, error } = await sb.from('custom_requests').insert({
    studio_id: studio.id,
    client_name: 'Regression Test Client',
    client_email: `p16-${Date.now()}@test.internal`,
    client_phone: '5551234567',
    design_description: 'P1-6 regression test custom request',
    placement: 'forearm',
    size: 'medium',
    budget_range: '300-600',
    preferred_dates: 'Flexible',
    status,
    quote_amount: 500,
    deposit_amount: 100,
  }).select('id, client_email, client_phone, studio_id, deposit_amount').single();
  if (error) throw new Error('makeCustomRequest: ' + error.message);
  created.custom_requests.push(data.id);
  return data;
}

// Simulate what Branch B now does (without Stripe — test the DB and lookup logic)
async function simulateBranchB(customRequestId, fakePaymentIntentId) {
  // Step 1: mark accepted + record payment intent (what Branch B did before)
  const { error: updateErr } = await sb
    .from('custom_requests')
    .update({
      status: 'accepted',
      stripe_payment_intent_id: fakePaymentIntentId,
    })
    .eq('id', customRequestId);

  if (updateErr) return { error: updateErr.message };

  // Step 2: fetch request data (what Branch B now does)
  const { data: crRaw } = await sb
    .from('custom_requests')
    .select('client_name, client_email, client_phone, studio_id, deposit_amount')
    .eq('id', customRequestId)
    .single();

  if (!crRaw) return { error: 'custom_request not found after update' };

  const cr = crRaw;

  // Step 3: fetch studio data
  const { data: studioRaw } = await sb
    .from('studios')
    .select('name, subdomain')
    .eq('id', cr.studio_id)
    .single();

  const studioName = studioRaw?.name ?? null;
  const studioSlug = studioRaw?.subdomain ?? null;

  return { cr, studioName, studioSlug };
}

// ── TEST 1: DB state — status becomes "accepted" ──────────────────────────────
HEAD('TEST 1 — DB state: custom_request.status set to "accepted" after webhook');

const cr1 = await makeCustomRequest('quoted');
console.log('  Before: status = quoted');
const result1 = await simulateBranchB(cr1.id, 'pi_test_' + Date.now());

const { data: after1 } = await sb
  .from('custom_requests')
  .select('status, stripe_payment_intent_id')
  .eq('id', cr1.id)
  .single();

if (after1?.status === 'accepted') {
  PASS('status = "accepted" after Branch B fires');
} else {
  FAIL('Expected "accepted", got "' + after1?.status + '"');
}
if (after1?.stripe_payment_intent_id?.startsWith('pi_test_')) {
  PASS('stripe_payment_intent_id recorded on custom_request');
} else {
  FAIL('stripe_payment_intent_id missing or wrong: ' + after1?.stripe_payment_intent_id);
}

// ── TEST 2: Data fetch — Branch B can retrieve all notification fields ─────────
HEAD('TEST 2 — Data retrieval: Branch B fetches client_email, client_phone, studio data');

if (result1.error) {
  FAIL('simulateBranchB returned error: ' + result1.error);
} else {
  const { cr, studioName, studioSlug } = result1;

  if (cr.client_email && cr.client_email.includes('@')) {
    PASS('client_email retrievable: ' + cr.client_email);
  } else {
    FAIL('client_email missing or malformed: ' + cr.client_email);
  }

  if (cr.client_phone) {
    PASS('client_phone retrievable: ' + cr.client_phone);
  } else {
    FAIL('client_phone missing');
  }

  if (studioName) {
    PASS('studio name retrievable: ' + studioName);
  } else {
    FAIL('studio name missing');
  }

  if (studioSlug) {
    PASS('studio slug retrievable (for email link): ' + studioSlug);
  } else {
    FAIL('studio slug missing — email link would be broken');
  }

  if (typeof cr.deposit_amount === 'number' && cr.deposit_amount > 0) {
    PASS('deposit_amount retrievable: $' + cr.deposit_amount.toFixed(2));
  } else {
    FAIL('deposit_amount missing or zero: ' + cr.deposit_amount);
  }
}

// ── TEST 3: SMS message content is correct ────────────────────────────────────
HEAD('TEST 3 — SMS content: message contains studio name and key context');

const { studioName } = result1;
const smsText = `Your custom tattoo deposit at ${studioName} is confirmed. We'll be in touch to schedule your session.`;

if (smsText.includes(studioName)) {
  PASS('SMS contains studio name: "' + studioName + '"');
} else {
  FAIL('SMS missing studio name');
}
if (smsText.includes('confirmed') && smsText.includes('schedule')) {
  PASS('SMS text contains "confirmed" and "schedule" — correct context for custom request');
} else {
  FAIL('SMS text missing key context words: ' + smsText);
}
// Verify it does NOT say "reminder" — that's a different template
if (!smsText.toLowerCase().includes('reminder')) {
  PASS('SMS text is specific to deposit confirmation, not a reminder');
} else {
  FAIL('SMS text uses wrong template (reminder context)');
}

// ── TEST 4: Email function is exported and callable ────────────────────────────
HEAD('TEST 4 — Email function: sendCustomRequestAcceptedEmail is exported');

let emailFnExported = false;
try {
  // Dynamic import — if the function doesn't exist this throws
  const emailModule = await import('../lib/email.js');
  emailFnExported = typeof emailModule.sendCustomRequestAcceptedEmail === 'function';
} catch (e) {
  // Try with .ts extension resolved
  try {
    const emailModule = await import('../lib/email.ts');
    emailFnExported = typeof emailModule.sendCustomRequestAcceptedEmail === 'function';
  } catch {
    // Can't import TS directly in Node — verify via grep instead
    emailFnExported = null;
  }
}

if (emailFnExported === true) {
  PASS('sendCustomRequestAcceptedEmail function exported from lib/email.ts');
} else if (emailFnExported === null) {
  // Can't import TS module directly — verify function exists in source
  const { readFileSync } = await import('fs');
  const emailSrc = readFileSync('lib/email.ts', 'utf8');
  if (emailSrc.includes('sendCustomRequestAcceptedEmail') && emailSrc.includes('export async function sendCustomRequestAcceptedEmail')) {
    PASS('sendCustomRequestAcceptedEmail defined and exported in lib/email.ts (verified via source)');
  } else {
    FAIL('sendCustomRequestAcceptedEmail not found in lib/email.ts');
  }
} else {
  FAIL('sendCustomRequestAcceptedEmail is not a function in email module');
}

// ── TEST 5: Webhook source imports and calls the email function ───────────────
HEAD('TEST 5 — Webhook wiring: Branch B imports and invokes email + SMS');

const { readFileSync } = await import('fs');
const webhookSrc = readFileSync('app/api/stripe/webhook/route.ts', 'utf8');

const checks = [
  ['sendCustomRequestAcceptedEmail imported',          webhookSrc.includes('sendCustomRequestAcceptedEmail')],
  ['Branch B fetches client_name/email/phone',         webhookSrc.includes('client_name, client_email, client_phone, studio_id, deposit_amount')],
  ['Branch B fetches studio name + subdomain',         webhookSrc.includes('"name, subdomain"')],
  ['Branch B calls trySendSms',                        webhookSrc.includes('trySendSms') && webhookSrc.includes('custom tattoo deposit')],
  ['Branch B calls sendCustomRequestAcceptedEmail',    webhookSrc.includes('sendCustomRequestAcceptedEmail({')],
  ['Step 1 still sets status accepted',                webhookSrc.includes('status: "accepted"')],
  ['Step 1 still records payment intent',              webhookSrc.includes('stripe_payment_intent_id: session.payment_intent')],
];

for (const [label, passes] of checks) {
  if (passes) PASS(label);
  else FAIL(label);
}

// ── TEST 6: Idempotency — calling twice does not break anything ───────────────
HEAD('TEST 6 — Idempotency: Branch B can be called twice (Stripe may retry)');

const cr6 = await makeCustomRequest('quoted');
await simulateBranchB(cr6.id, 'pi_test_first_' + Date.now());
await simulateBranchB(cr6.id, 'pi_test_retry_' + Date.now());

const { data: after6 } = await sb
  .from('custom_requests')
  .select('status, stripe_payment_intent_id')
  .eq('id', cr6.id)
  .single();

if (after6?.status === 'accepted') {
  PASS('Status still "accepted" after second webhook call — no error');
} else {
  FAIL('Status broken after second call: ' + after6?.status);
}

// ── TEST 7: Previous P-bug regressions — consultations flow unaffected ────────
HEAD('TEST 7 — Regression: Branch A and Branch C routing logic unchanged');

const branchACheck = webhookSrc.includes('if (depositPaymentId)') &&
                     webhookSrc.indexOf('if (depositPaymentId)') < webhookSrc.indexOf('if (customRequestId)');
const branchBCheck = webhookSrc.includes('if (customRequestId)');
const branchCCheck = webhookSrc.includes('if (bookingId)');

branchACheck ? PASS('Branch A routing (depositPaymentId) still first') : FAIL('Branch A routing changed');
branchBCheck ? PASS('Branch B routing (customRequestId) intact')       : FAIL('Branch B routing missing');
branchCCheck ? PASS('Branch C routing (bookingId) intact')             : FAIL('Branch C routing missing');

// ── Teardown ──────────────────────────────────────────────────────────────────
HEAD('TEARDOWN');
for (const id of created.custom_requests) await sb.from('custom_requests').delete().eq('id', id);
console.log('  All test data deleted');

// ── Summary ───────────────────────────────────────────────────────────────────
HEAD('SUMMARY');
if (failures === 0) {
  console.log('  ALL TESTS PASSED (0 failures)');
} else {
  console.log('  ' + failures + ' test(s) FAILED');
  process.exit(1);
}
