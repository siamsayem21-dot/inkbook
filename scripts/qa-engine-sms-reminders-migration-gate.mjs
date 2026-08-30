/**
 * QA Engine — dedicated gate check for the known, tracked
 * cron/sms-reminders blocker: migration
 * supabase/migrations/20260802000000_appointment_reminder_email.sql
 * (adds bookings.email_48hr_sent / email_day_of_sent) has not been applied
 * to production. Read-only — never applies the migration itself; only
 * Siam can do that (per this project's standing rule on DB migrations).
 *
 * Exit codes: 0 = migration applied (this specific blocker is resolved),
 * 2 = still not applied (BLOCKED_NEEDS_SIAM — the QA Engine's convention
 * for a known out-of-scope blocker, distinct from exit 1 = a real test
 * failure). Never exits 1 — this check either confirms the migration is
 * live or reports the known block; it doesn't independently judge the
 * cron's broader correctness (that's qa-fullrun-cron-organic-evidence.mjs).
 */
import { readFileSync } from "fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8").split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);

const res = await fetch(
  `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/bookings?select=email_48hr_sent,email_day_of_sent&limit=1`,
  { headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` } }
);

if (res.status === 200) {
  console.log("PASS: bookings.email_48hr_sent / email_day_of_sent exist — migration 20260802000000_appointment_reminder_email.sql has been applied. cron/sms-reminders should now function normally.");
  process.exit(0);
}

const body = await res.text();
console.log("BLOCKED_NEEDS_SIAM: migration 20260802000000_appointment_reminder_email.sql is still NOT applied to production.");
console.log(`  Probe: GET /rest/v1/bookings?select=email_48hr_sent,email_day_of_sent -> HTTP ${res.status}: ${body}`);
console.log("  This is a one-line additive SQL statement (2 nullable boolean columns), already reviewed multiple times — needs Siam to run it in the Supabase SQL Editor. The QA Engine will never apply it automatically.");
console.log("  Until applied: cron/sms-reminders' main query selects these missing columns, fails, the failure is silently swallowed, and the cron returns HTTP 200 with zero reminders sent every day.");
process.exit(2);
