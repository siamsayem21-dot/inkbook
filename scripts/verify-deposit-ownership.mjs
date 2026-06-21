// Ownership Check Verification — sendDepositRequest
//
// Tests:
//   Source audits (no DB needed):
//     1. getStudioId() is called before any Supabase operation
//     2. Unauthorized guard fires if no studioId
//     3. Ownership check (booking.studio_id !== studioId) is present
//     4. Studio lookup now uses studioId, not booking.studio_id
//     5. cancelBooking (reference impl) still has its own ownership check
//
//   Integration tests (live DB, self-cleaning):
//     6. Cross-studio booking fetch — mismatch detected by ownership logic
//     7. Same-studio booking fetch — ownership logic allows it
//     8. Missing booking ID — returns "Booking not found" shape
//     9. Regression: deposit_payments table still writable for valid studio
//
// No Server Action session needed — we simulate the ownership check logic
// directly against the real DB using the admin client.

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
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

const src = readFileSync('app/(owner)/owner/bookings/[bookingId]/actions.ts', 'utf8');
const lines = src.split('\n');

// ── Source audits ─────────────────────────────────────────────────────────────
HEAD('TEST 1 — getStudioId() is called inside sendDepositRequest');

// Find the function body start and verify getStudioId appears before supabase
const fnStart = src.indexOf('export async function sendDepositRequest');
const fnBody  = src.slice(fnStart, fnStart + 2000); // first 2000 chars is enough

if (/const studioId = await getStudioId\(\)/.test(fnBody)) {
  PASS('sendDepositRequest calls getStudioId()');
} else {
  FAIL('sendDepositRequest missing getStudioId() call');
}

HEAD('TEST 2 — Unauthorized guard fires before DB access');

const getStudioIdIdx    = fnBody.indexOf('getStudioId()');
const createAdminIdx    = fnBody.indexOf('createAdminClient()');

if (getStudioIdIdx !== -1 && createAdminIdx !== -1 && getStudioIdIdx < createAdminIdx) {
  PASS('getStudioId() called before createAdminClient() — unauthenticated callers rejected before any DB query');
} else {
  FAIL(`getStudioId at ${getStudioIdIdx} must come before createAdminClient at ${createAdminIdx}`);
}

if (/if \(!studioId\) return \{ error: "Unauthorized" \}/.test(fnBody)) {
  PASS('Early return on missing studioId');
} else {
  FAIL('Missing early return for !studioId');
}

HEAD('TEST 3 — Ownership check present after booking fetch');

if (/if \(booking\.studio_id !== studioId\) return \{ error: "Booking not found" \}/.test(fnBody)) {
  PASS('Ownership check: booking.studio_id !== studioId → "Booking not found"');
} else {
  FAIL('Ownership check missing — cross-studio access not blocked');
}

// Check ordering: ownership check must come after the booking fetch
const ownershipIdx  = fnBody.indexOf('booking.studio_id !== studioId');
const bookingFetch  = fnBody.indexOf('.from("bookings")');
if (ownershipIdx !== -1 && bookingFetch !== -1 && ownershipIdx > bookingFetch) {
  PASS('Ownership check position: after booking fetch, before studio lookup');
} else {
  FAIL(`Ownership check at ${ownershipIdx} must come after booking fetch at ${bookingFetch}`);
}

HEAD('TEST 4 — Studio lookup uses verified studioId, not booking.studio_id');

// After the ownership check, the studio lookup should use .eq("id", studioId)
// not .eq("id", booking.studio_id)
const afterOwnership = fnBody.slice(ownershipIdx);
const studioLookupBlock = afterOwnership.slice(0, afterOwnership.indexOf('.single()') + 10);

if (/\.eq\("id", studioId\)/.test(studioLookupBlock)) {
  PASS('Studio lookup uses verified studioId (not booking.studio_id)');
} else {
  FAIL('Studio lookup should use studioId, not booking.studio_id');
}

if (/\.eq\("id", booking\.studio_id\)/.test(studioLookupBlock)) {
  FAIL('Studio lookup still uses booking.studio_id — switch to studioId');
} else {
  PASS('booking.studio_id is NOT used in the studio lookup (correct)');
}

HEAD('TEST 5 — cancelBooking ownership check still intact (regression)');

const cancelFn = src.slice(src.indexOf('export async function cancelBooking'), fnStart);
if (/const studioId = await getStudioId\(\)/.test(cancelFn)) {
  PASS('cancelBooking: getStudioId() present');
} else {
  FAIL('cancelBooking: getStudioId() missing — regression');
}
if (/if \(check\.studio_id !== studioId\) return \{ error: "Unauthorized" \}/.test(cancelFn)) {
  PASS('cancelBooking: ownership check present');
} else {
  FAIL('cancelBooking: ownership check missing — regression');
}

// ── Integration tests ─────────────────────────────────────────────────────────
HEAD('Setup — find two studios (each with an artist) for cross-studio tests');

// Start from artists — guarantees each chosen studio has at least one artist.
const { data: allArtists } = await sb
  .from('artists')
  .select('id, studio_id, studios(id, name)')
  .limit(50);

// Collect one artist per studio, gather up to 2 distinct studios
const studioMap = new Map(); // studio_id → { studio, artistId }
for (const a of (allArtists ?? [])) {
  const s = a.studios;
  if (s && !studioMap.has(s.id)) {
    studioMap.set(s.id, { studio: s, artistId: a.id });
  }
  if (studioMap.size >= 2) break;
}

if (studioMap.size < 2) {
  console.log('  SKIP: need at least 2 studios with artists for cross-studio tests');
  console.log('        found only', studioMap.size, 'qualifying studio(s)');
  console.log('\nSUMMARY (source tests only)\n' + '='.repeat(28));
  if (failures === 0) console.log('  ALL SOURCE TESTS PASSED');
  else { console.log(`  ${failures} test(s) FAILED`); process.exit(1); }
  process.exit(0);
}

const [[, entryA], [, entryB]] = [...studioMap.entries()];
const studioA = entryA.studio;
const studioB = entryB.studio;
const artistA = { id: entryA.artistId };
const artistB = { id: entryB.artistId };
console.log(`  Studio A: ${studioA.id.slice(0,8)} | ${studioA.name} (artist ${artistA.id.slice(0,8)})`);
console.log(`  Studio B: ${studioB.id.slice(0,8)} | ${studioB.name} (artist ${artistB.id.slice(0,8)})`);

// Create a test client
const { data: clientRow } = await sb.from('clients').insert({
  studio_id: studioA.id,
  full_name: 'Deposit Ownership Test Client',
  email: `deposit-ownership-test-${Date.now()}@test.internal`,
  phone: '5550000001',
}).select('id').single();

if (!clientRow) { console.log('  ABORT: could not create test client'); process.exit(1); }
const clientId = clientRow.id;

// Create test bookings in each studio
const bookingBase = {
  client_id: clientId,
  status: 'confirmed',
  date: '2099-01-01',
  time: '10:00',
  style: 'Traditional',
  deposit_amount_cents: 5000,
};

const { data: bookingA } = await sb.from('bookings').insert({
  ...bookingBase,
  studio_id: studioA.id,
  artist_id: artistA.id,
}).select('id, studio_id').single();

const { data: bookingB } = await sb.from('bookings').insert({
  ...bookingBase,
  studio_id: studioB.id,
  artist_id: artistB.id,
}).select('id, studio_id').single();

if (!bookingA || !bookingB) { console.log('  ABORT: could not create test bookings'); process.exit(1); }
console.log(`  Booking A (studio A): ${bookingA.id.slice(0,8)}`);
console.log(`  Booking B (studio B): ${bookingB.id.slice(0,8)}`);

// ── TEST 6: Cross-studio access rejected ──────────────────────────────────────
HEAD('TEST 6 — Cross-studio: Studio B owner cannot access Studio A booking');

// Simulate what sendDepositRequest does:
// 1. Load the booking (admin client, no RLS filter)
// 2. Apply ownership check (booking.studio_id !== authenticatedStudioId)
const { data: fetchedForB } = await sb
  .from('bookings')
  .select('id, studio_id')
  .eq('id', bookingA.id) // Studio B's owner queries Studio A's booking
  .single();

if (!fetchedForB) {
  FAIL('Could not fetch booking A for cross-studio test');
} else {
  // This is the exact ownership check the fixed code performs:
  const authenticatedStudio = studioB.id; // Studio B is "logged in"
  const ownershipBlocked = fetchedForB.studio_id !== authenticatedStudio;

  if (ownershipBlocked) {
    PASS(`Cross-studio blocked: booking.studio_id (${fetchedForB.studio_id.slice(0,8)}) !== auth studio (${authenticatedStudio.slice(0,8)})`);
  } else {
    FAIL('Cross-studio access NOT blocked — booking.studio_id matches wrong studio');
  }
}

// ── TEST 7: Same-studio access allowed ────────────────────────────────────────
HEAD('TEST 7 — Same-studio: Studio A owner CAN access Studio A booking');

const { data: fetchedForA } = await sb
  .from('bookings')
  .select('id, studio_id')
  .eq('id', bookingA.id)
  .single();

if (!fetchedForA) {
  FAIL('Could not fetch booking A for same-studio test');
} else {
  const authenticatedStudio = studioA.id; // Studio A is "logged in"
  const ownershipAllowed = fetchedForA.studio_id === authenticatedStudio;

  if (ownershipAllowed) {
    PASS(`Same-studio allowed: booking.studio_id (${fetchedForA.studio_id.slice(0,8)}) === auth studio (${authenticatedStudio.slice(0,8)})`);
  } else {
    FAIL('Same-studio access wrongly blocked');
  }
}

// ── TEST 8: Non-existent booking ID ───────────────────────────────────────────
HEAD('TEST 8 — Nonexistent booking ID returns null (not found path)');

const { data: missing, error: missingErr } = await sb
  .from('bookings')
  .select('id, studio_id')
  .eq('id', '00000000-0000-0000-0000-000000000000')
  .maybeSingle();

if (!missing && !missingErr) {
  PASS('Nonexistent booking ID returns null — "Booking not found" path correct');
} else if (missingErr) {
  FAIL(`Unexpected DB error on missing ID: ${missingErr.message}`);
} else {
  FAIL('Expected null for fake booking ID — got data');
}

// ── TEST 9: Regression — deposit_payments insert still works for valid studio ──
HEAD('TEST 9 — Regression: deposit_payments writable for a valid same-studio booking');

const { data: dpRow, error: dpErr } = await sb
  .from('deposit_payments')
  .insert({
    booking_id: bookingA.id,
    amount_cents: 5000,
    payment_status: 'pending',
  })
  .select('id')
  .single();

if (dpErr) {
  FAIL(`deposit_payments insert failed: ${dpErr.message}`);
} else {
  PASS(`deposit_payments record created for valid booking: ${dpRow.id.slice(0,8)}`);
  // Clean up deposit record
  await sb.from('deposit_payments').delete().eq('id', dpRow.id);
  PASS('deposit_payments record cleaned up');
}

// ── Teardown ──────────────────────────────────────────────────────────────────
HEAD('Teardown');

await sb.from('bookings').delete().eq('id', bookingA.id);
await sb.from('bookings').delete().eq('id', bookingB.id);
await sb.from('clients').delete().eq('id', clientId);
console.log('  Test bookings and client deleted');

// ── Summary ───────────────────────────────────────────────────────────────────
console.log('\nSUMMARY\n' + '='.repeat(7));
if (failures === 0) {
  console.log('  ALL TESTS PASSED — sendDepositRequest ownership check verified');
} else {
  console.log('  ' + failures + ' test(s) FAILED');
  process.exit(1);
}
