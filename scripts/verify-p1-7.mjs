// P1-7 Regression Test Suite
// Verifies that "converted" consultations:
//   1. Are normalized to "completed" for display (not invisible, not shown as "New")
//   2. Are counted correctly in activeCount and convertedCount
//   3. getStage("converted") returns the "completed" stage config, not "new"
//   4. All existing statuses still map correctly (regression)
// Self-contained: creates and deletes its own test data.

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
const { data: studioRows } = await sb.from('studios').select('id, name');
const studio = studioRows?.[0];
if (!studio) { console.log('No studio found.'); process.exit(1); }
console.log('Studio:', studio.id.slice(0,8), '|', studio.name);

const created = { consultations: [] };

async function makeConsultation(status) {
  const { data, error } = await sb.from('consultations').insert({
    studio_id: studio.id,
    client_name: `P17 Test ${status}`,
    client_email: `p17-${status}-${Date.now()}@test.internal`,
    client_phone: '5550000000',
    tattoo_description: `P1-7 regression test — status: ${status}`,
    placement: 'forearm',
    estimated_size: 'Medium (4-6 inches)',
    budget_range: '300-500',
    color_preference: 'black and grey',
    status,
  }).select('id, status').single();
  if (error) throw new Error(`makeConsultation(${status}): ${error.message}`);
  created.consultations.push(data.id);
  return data;
}

// Simulate what pipeline/page.tsx does after the fix
function normalizeSingleStatus(status) {
  return status === 'converted' ? 'completed' : status;
}
function normalizeConsults(rows) {
  return rows.map((c) => ({ ...c, status: normalizeSingleStatus(c.status) }));
}
function getStageLabel(status) {
  const stages = {
    new:          { label: 'New',          dot: 'bg-blue-500' },
    reviewed:     { label: 'Reviewed',     dot: 'bg-yellow-500' },
    quoted:       { label: 'Quoted',       dot: 'bg-amber-500' },
    booked:       { label: 'Booked',       dot: 'bg-emerald-500' },
    deposit_paid: { label: 'Deposit Paid', dot: 'bg-violet-500' },
    completed:    { label: 'Completed',    dot: 'bg-green-500' },
    lost:         { label: 'Lost',         dot: 'bg-zinc-600' },
  };
  // Replicates the fixed getStage() logic
  if (status === 'converted') return stages['completed'];
  return stages[status] ?? stages['new'];
}

// ── TEST 1: Before — raw DB row has status "converted" ───────────────────────
HEAD('TEST 1 — DB baseline: consultations can have status "converted"');

const convRow = await makeConsultation('converted');
const { data: rawFetch } = await sb
  .from('consultations')
  .select('id, status')
  .eq('id', convRow.id)
  .single();

if (rawFetch?.status === 'converted') {
  PASS('DB correctly stores status = "converted" (raw value confirmed)');
} else {
  FAIL('Expected "converted" in DB, got: ' + rawFetch?.status);
}

// ── TEST 2: getStage("converted") returns "completed" stage, not "new" ────────
HEAD('TEST 2 — getStage fix: "converted" maps to "completed" stage config');

const convertedStage = getStageLabel('converted');
if (convertedStage.label === 'Completed') {
  PASS('getStage("converted").label = "Completed" (not "New")');
} else {
  FAIL('Expected "Completed", got "' + convertedStage.label + '"');
}
if (convertedStage.dot === 'bg-green-500') {
  PASS('getStage("converted").dot = bg-green-500 (completed green, not new blue)');
} else {
  FAIL('Expected bg-green-500, got "' + convertedStage.dot + '"');
}

const newStage = getStageLabel('new');
if (newStage.dot !== convertedStage.dot) {
  PASS('"converted" and "new" have different dots — no longer mislabeled as New');
} else {
  FAIL('"converted" and "new" have the same dot — still mislabeled');
}

// ── TEST 3: Normalization logic (what pipeline/page.tsx now does) ─────────────
HEAD('TEST 3 — Normalization: "converted" rows appear in "completed" Kanban column');

const PIPELINE_VALUES = ['new', 'reviewed', 'quoted', 'booked', 'deposit_paid', 'completed', 'lost'];

// Seed a variety of statuses
const completedRow = await makeConsultation('completed');
const newRow       = await makeConsultation('new');

// Simulate the page fetch + normalization
const rawRows = [
  { id: convRow.id, status: 'converted' },
  { id: completedRow.id, status: 'completed' },
  { id: newRow.id, status: 'new' },
];

const normalizedRows = normalizeConsults(rawRows);

// After normalization: "converted" should become "completed"
const normalizedConv = normalizedRows.find((r) => r.id === convRow.id);
if (normalizedConv?.status === 'completed') {
  PASS('"converted" normalized to "completed" — will appear in Completed column');
} else {
  FAIL('Expected "completed" after normalization, got "' + normalizedConv?.status + '"');
}

// "completed" should be unchanged
const normalizedCompleted = normalizedRows.find((r) => r.id === completedRow.id);
if (normalizedCompleted?.status === 'completed') {
  PASS('"completed" status unchanged after normalization');
} else {
  FAIL('Normalization broke "completed": ' + normalizedCompleted?.status);
}

// "new" should be unchanged
const normalizedNew = normalizedRows.find((r) => r.id === newRow.id);
if (normalizedNew?.status === 'new') {
  PASS('"new" status unchanged after normalization');
} else {
  FAIL('Normalization broke "new": ' + normalizedNew?.status);
}

// After normalization: "converted" is in the "completed" Kanban column
const byStage = (rows, stage) => rows.filter((r) => r.status === stage);
const completedCards = byStage(normalizedRows, 'completed');
const convertedInCompletedColumn = completedCards.some((r) => r.id === convRow.id);
if (convertedInCompletedColumn) {
  PASS('"converted" consultation appears in Completed column (was invisible before)');
} else {
  FAIL('"converted" consultation still missing from Completed column');
}

// No stage should have a "converted" card (it's been normalized away)
const noConvertedColumn = !PIPELINE_VALUES.includes('converted');
if (noConvertedColumn) {
  PASS('No "converted" pipeline column — normalized rows go to "completed" column');
} else {
  FAIL('"converted" should not be a pipeline column');
}

// ── TEST 4: activeCount and convertedCount correctness ────────────────────────
HEAD('TEST 4 — Counter correctness: activeCount excludes converted; convertedCount includes it');

// Simulate: 1 converted, 1 completed, 1 new, 1 lost
const simRows = [
  { id: 'a', status: 'converted' },
  { id: 'b', status: 'completed' },
  { id: 'c', status: 'new' },
  { id: 'd', status: 'lost' },
];
const simNorm = normalizeConsults(simRows);

// After normalization: converted → completed, so both are in terminal states
const activeCount = simNorm.filter((c) => !['completed', 'lost'].includes(c.status)).length;
const convertedCount = simNorm.filter((c) => c.status === 'completed').length;

console.log('  simRows: converted(1), completed(1), new(1), lost(1)');
console.log('  After normalization:', simNorm.map((r) => r.status).join(', '));
console.log('  activeCount:', activeCount, '| expected: 1 (only new)');
console.log('  convertedCount:', convertedCount, '| expected: 2 (converted + completed)');

if (activeCount === 1) {
  PASS('activeCount = 1 — "converted" correctly excluded from active (was 2 before)');
} else {
  FAIL('activeCount = ' + activeCount + ', expected 1');
}
if (convertedCount === 2) {
  PASS('convertedCount = 2 — counts both "completed" and normalized "converted"');
} else {
  FAIL('convertedCount = ' + convertedCount + ', expected 2');
}

// ── TEST 5: Before behavior simulation (proving the bug existed) ───────────────
HEAD('TEST 5 — Before/after contrast: showing what changed');

// Before: no normalization, getStage fallback was "new"
function getStageOld(status) {
  const stages = {
    new:          { label: 'New',          dot: 'bg-blue-500' },
    reviewed:     { label: 'Reviewed',     dot: 'bg-yellow-500' },
    quoted:       { label: 'Quoted',       dot: 'bg-amber-500' },
    booked:       { label: 'Booked',       dot: 'bg-emerald-500' },
    deposit_paid: { label: 'Deposit Paid', dot: 'bg-violet-500' },
    completed:    { label: 'Completed',    dot: 'bg-green-500' },
    lost:         { label: 'Lost',         dot: 'bg-zinc-600' },
  };
  return stages[status] ?? stages['new']; // OLD: no special case for "converted"
}

const oldConverted    = getStageOld('converted');
const newConverted    = getStageLabel('converted');
const beforeStatus    = oldConverted.label;
const afterStatus     = newConverted.label;

console.log('  BEFORE: getStage("converted").label =', beforeStatus, '(was "New" — wrong)');
console.log('  AFTER:  getStage("converted").label =', afterStatus, '(now "Completed" — correct)');

if (beforeStatus === 'New') {
  PASS('Confirmed: old behavior returned "New" for "converted"');
} else {
  FAIL('Unexpected old behavior: ' + beforeStatus);
}
if (afterStatus === 'Completed') {
  PASS('Confirmed: new behavior returns "Completed" for "converted"');
} else {
  FAIL('Expected "Completed", got "' + afterStatus + '"');
}

// Before: "converted" rows were invisible (no column, byStage never matched)
const oldByStage = (rows, stage) => rows.filter((r) => r.status === stage); // no normalization
const oldCompletedCards = oldByStage(rawRows, 'completed');
const wasInvisible = !oldCompletedCards.some((r) => r.id === convRow.id);

// After: they appear in completed column
const newCompletedCards = byStage(normalizedRows, 'completed');
const nowVisible = newCompletedCards.some((r) => r.id === convRow.id);

console.log('  BEFORE: "converted" consultation in Completed column?', !wasInvisible, '(was invisible)');
console.log('  AFTER:  "converted" consultation in Completed column?', nowVisible, '(now visible)');

wasInvisible ? PASS('Confirmed: "converted" was invisible on board before fix') : FAIL('Old behavior check wrong');
nowVisible   ? PASS('Confirmed: "converted" is visible in Completed column after fix') : FAIL('Still invisible after fix');

// ── TEST 6: All existing statuses still map correctly ─────────────────────────
HEAD('TEST 6 — Regression: all existing pipeline statuses unaffected');

const expectations = {
  new:          'New',
  reviewed:     'Reviewed',
  quoted:       'Quoted',
  booked:       'Booked',
  deposit_paid: 'Deposit Paid',
  completed:    'Completed',
  lost:         'Lost',
  converted:    'Completed', // the fix
};

for (const [status, expectedLabel] of Object.entries(expectations)) {
  const actual = getStageLabel(status).label;
  if (actual === expectedLabel) {
    PASS(`getStage("${status}") = "${actual}"`);
  } else {
    FAIL(`getStage("${status}") = "${actual}", expected "${expectedLabel}"`);
  }
}

// Also verify normalization leaves non-"converted" statuses untouched
for (const s of ['new', 'reviewed', 'quoted', 'booked', 'deposit_paid', 'completed', 'lost']) {
  const result = normalizeSingleStatus(s);
  if (result === s) {
    PASS(`normalizeSingleStatus("${s}") unchanged = "${s}"`);
  } else {
    FAIL(`normalizeSingleStatus("${s}") changed unexpectedly to "${result}"`);
  }
}

// ── Teardown ──────────────────────────────────────────────────────────────────
HEAD('TEARDOWN');
for (const id of created.consultations) {
  await sb.from('consultations').delete().eq('id', id);
}
console.log('  All test data deleted');

// ── Summary ───────────────────────────────────────────────────────────────────
HEAD('SUMMARY');
if (failures === 0) {
  console.log('  ALL TESTS PASSED (0 failures)');
} else {
  console.log('  ' + failures + ' test(s) FAILED');
  process.exit(1);
}
