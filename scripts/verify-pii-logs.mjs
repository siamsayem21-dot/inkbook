// PII Log Audit — billing webhook
// Verifies that no customer email addresses appear in console.log/error/warn calls.
// Also verifies that non-PII operational logs are still present.
// No test data created or deleted — read-only source analysis.

import { readFileSync } from 'fs';

let failures = 0;
const PASS = (msg) => console.log('  PASS:', msg);
const FAIL = (msg) => { console.log('  FAIL:', msg); failures++; };
const HEAD = (msg) => console.log('\n' + msg + '\n' + '-'.repeat(msg.length));

const src = readFileSync('app/api/billing/webhook/route.ts', 'utf8');
const lines = src.split('\n');

// ── TEST 1: PII email values must not appear in any console call ───────────────
HEAD('TEST 1 — No raw email value in any console.log/error/warn');

// Pattern: any console call that directly references .email (not !!.email)
// Matches: client?.email, client.email, etc. but NOT !!client?.email
const piiPattern = /console\.(log|error|warn)[^;]*(?<!\!\!)(client|user|owner)\??\.email/;

const piiLines = lines
  .map((line, i) => ({ n: i + 1, line: line.trim() }))
  .filter(({ line }) => piiPattern.test(line));

if (piiLines.length === 0) {
  PASS('No raw .email values in any console call');
} else {
  piiLines.forEach(({ n, line }) => {
    FAIL(`Line ${n}: PII email value in log — "${line}"`);
  });
}

// ── TEST 2: The two removed lines must not be present ─────────────────────────
HEAD('TEST 2 — Specific removed lines are gone');

const removed = [
  { pattern: /client\?\.email \?\? "null/, label: '"client email: ..." log (was line 122)' },
  { pattern: /attempting send to.*client\.email/, label: '"attempting send to: ..." log (was line 132)' },
];

for (const { pattern, label } of removed) {
  if (pattern.test(src)) {
    FAIL(`Still present: ${label}`);
  } else {
    PASS(`Removed: ${label}`);
  }
}

// ── TEST 3: Non-PII operational logs are still present ────────────────────────
HEAD('TEST 3 — Non-PII operational logs retained');

const kept = [
  { pattern: /\[email\] API key present.*!!process\.env\.RESEND_API_KEY/, label: '[email] API key present (boolean)' },
  { pattern: /\[email\] client email present.*!!client\?\.email/, label: '[email] client email present (boolean coercion — safe)' },
  { pattern: /\[email\] result: success/, label: '[email] result: success' },
  { pattern: /\[email\] error.*castErr\.message/, label: '[email] error: castErr.message (no PII)' },
  { pattern: /\[webhook\] bookingRow fetch.*found.*null/, label: '[webhook] bookingRow fetch (boolean string — no PII)' },
  { pattern: /\[billing\/webhook\] Signature verification failed/, label: '[billing/webhook] Signature verification failed' },
  { pattern: /\[billing\/webhook\] Missing Stripe env vars/, label: '[billing/webhook] Missing Stripe env vars' },
];

for (const { pattern, label } of kept) {
  if (pattern.test(src)) {
    PASS(`Retained: ${label}`);
  } else {
    FAIL(`Missing operational log: ${label}`);
  }
}

// ── TEST 4: No other PII-adjacent patterns anywhere in billing webhook ─────────
HEAD('TEST 4 — No phone numbers or full_name values in console calls');

const phonePii = /console\.(log|error|warn)[^;]*client\??\.phone(?!\s*&&)/;
const namePii  = /console\.(log|error|warn)[^;]*client\??\.full_name/;

phonePii.test(src)
  ? FAIL('Phone number referenced in console call')
  : PASS('No phone number in console calls');

namePii.test(src)
  ? FAIL('full_name referenced in console call')
  : PASS('No full_name in console calls');

// ── TEST 5: No interpolated email in string templates ────────────────────────
HEAD('TEST 5 — No template literals embedding email value');

// catches: `send to: ${client.email}`, `email: ${user.email}`, etc.
const templatePii = /console\.(log|error|warn)[^;]*\$\{[^}]*\.email[^}]*\}/;
templatePii.test(src)
  ? FAIL('Email value embedded in template literal inside a console call')
  : PASS('No template-literal email interpolation in console calls');

// ── TEST 6: Broad scan of all TS files in the repo ───────────────────────────
HEAD('TEST 6 — No email PII in console calls across entire codebase');

import { readdirSync, statSync } from 'fs';
import { join } from 'path';

function walkTs(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    // Exclude build artifacts and fork-agent worktrees (not live code)
    if (entry === 'node_modules' || entry === '.next' || entry === '.claude') continue;
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) files.push(...walkTs(full));
    else if (full.endsWith('.ts') || full.endsWith('.tsx')) files.push(full);
  }
  return files;
}

const tsFiles = walkTs('.');
const repoEmailPiiPattern = /console\.(log|error|warn)[^;]*(?<!\!\!)(?:client|user|owner)\??\.email(?!\s*present)/;

const violations = [];
for (const file of tsFiles) {
  const content = readFileSync(file, 'utf8');
  const fileLines = content.split('\n');
  fileLines.forEach((line, i) => {
    if (repoEmailPiiPattern.test(line)) {
      violations.push(`${file.replace(process.cwd(), '.')}:${i + 1} — ${line.trim()}`);
    }
  });
}

if (violations.length === 0) {
  PASS('No raw email values logged via console in any .ts/.tsx file');
} else {
  violations.forEach(v => FAIL(v));
}

// ── Summary ───────────────────────────────────────────────────────────────────
const HEAD2 = (msg) => console.log('\n' + msg + '\n' + '='.repeat(msg.length));
HEAD2('SUMMARY');
if (failures === 0) {
  console.log('  ALL TESTS PASSED — no PII email logging detected');
} else {
  console.log('  ' + failures + ' test(s) FAILED');
  process.exit(1);
}
