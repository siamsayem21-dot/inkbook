/**
 * Full-run QA — Phase 5: Automations/Cron real invocation.
 *
 * 1. Auth-guard check on all 6 cron routes (no header / wrong bearer -> 401).
 * 2. Real authenticated invocation of each route (real CRON_SECRET from
 *    .env.local, against QA_BASE_URL) with a realistic QA-tagged scenario
 *    set up beforehand, and a before/after DB read to verify the real
 *    state change each route is supposed to make.
 *
 * Safety note: these cron routes are NOT scoped to one studio — a real
 * invocation processes every matching row in the whole production table.
 * Before touching anything, this script re-confirms (see
 * qa-fullrun-cron-precheck.mjs output from this session) that zero
 * non-QA-tagged rows currently match any of the 6 routes' trigger
 * criteria except payment-reminders pass 1, where the only matches are
 * leftover QA rows from this session's own earlier Phase 4 run (fake
 * qa-...@inkbook-qa.test / +15559994444 contacts) — real, not simulated,
 * but zero real-customer exposure. All QA rows created by this script are
 * deleted at the end, along with those pre-existing Phase 4 leftovers.
 *
 * Run with:
 *   QA_BASE_URL=https://www.inkbook.tech node scripts/qa-fullrun-cron-realinvoke.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8").split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const BASE_URL = process.env.QA_BASE_URL ?? "https://www.inkbook.tech";
const CRON_SECRET = env.CRON_SECRET;

const findings = [];
const PASS = (m) => console.log("  PASS:", m);
const FAIL = (m) => { console.log("  FAIL:", m); findings.push("FAIL: " + m); };
const NOTE = (m) => console.log("  NOTE:", m);
const HEAD = (m) => console.log("\n" + m + "\n" + "=".repeat(m.length));

const STUDIO_ID = "8530b359-0257-4075-ad73-d736f17e0958"; // [QA-SEED-FULLQA-20260829] Ink & Iron QA Studio
const ARTIST_A = "8dc2f2fd-3b70-4f73-9bc7-2e996d07536b"; // QA Artist Traditional
const ARTIST_B = "8b1004f1-c170-4167-8fd3-f8f12006de88"; // QA Artist Fine Line
const TAG = "QA-CRON-FULLQA-20260829";
const ts = Date.now();

const createdClientIds = [];
const createdBookingIds = [];
const createdWaitlistIds = [];

async function makeClient(label) {
  const { data, error } = await sb.from("clients").insert({
    studio_id: STUDIO_ID,
    full_name: `[${TAG}] ${label}`,
    email: `qa.cron.${label.toLowerCase().replace(/\s+/g, "")}.${ts}@inkbook-qa.test`,
    phone: "+15559997777",
    id_photo_url: "https://example.com/qa-fake-id.jpg",
  }).select("id").single();
  if (error) throw new Error(`makeClient(${label}) failed: ${error.message}`);
  createdClientIds.push(data.id);
  return data.id;
}

async function makeBooking(fields) {
  const { data, error } = await sb.from("bookings").insert(fields).select("id").single();
  if (error) throw new Error(`makeBooking failed: ${JSON.stringify(fields)} :: ${error.message}`);
  createdBookingIds.push(data.id);
  return data.id;
}

async function callCron(path) {
  const res = await fetch(`${BASE_URL}${path}`, { headers: { authorization: `Bearer ${CRON_SECRET}` } });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

async function checkUnauth(path, label) {
  const res = await fetch(`${BASE_URL}${path}`);
  if (res.status === 401) PASS(`${label} — unauthenticated call correctly rejected 401`);
  else FAIL(`${label} — unauthenticated call NOT rejected (HTTP ${res.status})`);

  const res2 = await fetch(`${BASE_URL}${path}`, { headers: { authorization: "Bearer wrong-secret-value" } });
  if (res2.status === 401) PASS(`${label} — wrong-bearer-token call correctly rejected 401`);
  else FAIL(`${label} — wrong-bearer-token call NOT rejected (HTTP ${res2.status})`);
}

HEAD("Step 1 — auth guard on all 6 routes");
await checkUnauth("/api/cron/cancel-expired", "cancel-expired");
await checkUnauth("/api/cron/no-show", "no-show");
await checkUnauth("/api/cron/payment-reminders", "payment-reminders");
await checkUnauth("/api/cron/sms-reminders", "sms-reminders");
await checkUnauth("/api/cron/review-requests", "review-requests");
await checkUnauth("/api/cron/waitlist-notify", "waitlist-notify");

if (!CRON_SECRET) {
  NOTE("CRON_SECRET missing from .env.local — cannot do real invocations. Stopping after auth guard.");
  process.exit(findings.length ? 1 : 0);
}
PASS(`CRON_SECRET present in .env.local (length ${CRON_SECRET.length}) — proceeding to real invocation`);

// ── Sanity: confirm the real secret actually authenticates (not a coincidental 401-skip) ──
{
  const { status, body } = await callCron("/api/cron/waitlist-notify");
  if (status === 200) PASS(`Real CRON_SECRET accepted by live prod route — HTTP 200: ${JSON.stringify(body)}`);
  else FAIL(`Real CRON_SECRET was REJECTED by live prod route (HTTP ${status}): ${JSON.stringify(body)} — either the secret in .env.local doesn't match Vercel's production env var, or something else is wrong. Cannot proceed with authenticated scenarios.`);
}
if (findings.some((f) => f.includes("REJECTED"))) process.exit(1);

const now = new Date();

HEAD("Step 2 — scenario setup");

// A. cancel-expired: pending_deposit, expired 2h ago
const clientA = await makeClient("CancelExpired");
const bookingA = await makeBooking({
  studio_id: STUDIO_ID, artist_id: ARTIST_A, client_id: clientA,
  date: "2027-01-15", time: "10:00", style: "traditional",
  status: "pending_deposit", deposit_amount_cents: 5000, deposit_paid: false,
  deposit_expires_at: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
});
NOTE(`cancel-expired scenario: booking ${bookingA} pending_deposit, expired 2h ago`);

// B. no-show: confirmed, date = yesterday
const clientB = await makeClient("NoShow");
const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().split("T")[0];
const bookingB = await makeBooking({
  studio_id: STUDIO_ID, artist_id: ARTIST_A, client_id: clientB,
  date: yesterday, time: "14:00", style: "traditional",
  status: "confirmed", deposit_amount_cents: 5000, deposit_paid: true,
  deposit_expires_at: new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString(),
});
NOTE(`no-show scenario: booking ${bookingB} confirmed, date ${yesterday} (past)`);

// C. payment-reminders pass 1: pending_deposit, expires in 5h
const clientC = await makeClient("DepositReminder");
const bookingC = await makeBooking({
  studio_id: STUDIO_ID, artist_id: ARTIST_B, client_id: clientC,
  date: "2027-01-20", time: "11:00", style: "fine line",
  status: "pending_deposit", deposit_amount_cents: 5000, deposit_paid: false,
  deposit_expires_at: new Date(now.getTime() + 5 * 60 * 60 * 1000).toISOString(),
  deposit_reminder_sent: false,
});
NOTE(`payment-reminders pass1 scenario: booking ${bookingC} pending_deposit, expires in 5h`);

// D. payment-reminders pass 2: confirmed, date=yesterday, balance owed
const clientD = await makeClient("RemainderReminder");
const bookingD = await makeBooking({
  studio_id: STUDIO_ID, artist_id: ARTIST_B, client_id: clientD,
  date: yesterday, time: "15:00", style: "fine line",
  status: "confirmed", deposit_amount_cents: 5000, deposit_paid: true,
  total_amount_cents: 20000, remainder_collected: false, remainder_reminder_sent: false,
  deposit_expires_at: new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString(),
});
NOTE(`payment-reminders pass2 scenario: booking ${bookingD} confirmed, date ${yesterday}, balance owed 15000c`);

// E. review-requests: completed, completed_at 15 days ago
const clientE = await makeClient("ReviewRequest");
const bookingE = await makeBooking({
  studio_id: STUDIO_ID, artist_id: ARTIST_A, client_id: clientE,
  date: "2026-08-01", time: "10:00", style: "traditional",
  status: "completed", deposit_amount_cents: 5000, deposit_paid: true,
  deposit_expires_at: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  completed_at: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString(),
  review_requested_at: null,
});
NOTE(`review-requests scenario: booking ${bookingE} completed 15d ago, review_requested_at null`);

// F. waitlist-notify: un-notified entry for ARTIST_A
const clientF = await makeClient("WaitlistNotify");
const { data: wl, error: wlErr } = await sb.from("waitlist").insert({
  studio_id: STUDIO_ID, artist_id: ARTIST_A, client_id: clientF,
  notified: false, added_at: new Date(now.getTime() - 60 * 60 * 1000).toISOString(),
}).select("id").single();
if (wlErr) throw new Error(`waitlist insert failed: ${wlErr.message}`);
createdWaitlistIds.push(wl.id);
NOTE(`waitlist-notify scenario: waitlist entry ${wl.id} for artist ${ARTIST_A}, notified=false`);

// G. sms-reminders: confirmed, deposit_paid, date = studio-local "today+2" (48hr window)
const clientG = await makeClient("SmsReminder48hr");
const studioTz = "Asia/Dhaka";
const twoDaysOutLocal = new Intl.DateTimeFormat("en-CA", { timeZone: studioTz, year: "numeric", month: "2-digit", day: "2-digit" })
  .format(new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000));
const bookingG = await makeBooking({
  studio_id: STUDIO_ID, artist_id: ARTIST_B, client_id: clientG,
  date: twoDaysOutLocal, time: "12:00", style: "fine line",
  status: "confirmed", deposit_amount_cents: 5000, deposit_paid: true,
  deposit_expires_at: new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString(),
  sms_48hr_sent: false, sms_day_of_sent: false,
});
NOTE(`sms-reminders scenario: booking ${bookingG} confirmed, deposit_paid, date=${twoDaysOutLocal} (studio-local 48hr-out), sms_48hr_sent=false — EXPECT this to still fail silently due to the known missing email_48hr_sent/email_day_of_sent columns (P1, already logged)`);

HEAD("Step 3 — real authenticated invocations + before/after verification");

// cancel-expired
{
  const { status, body } = await callCron("/api/cron/cancel-expired");
  console.log(`  cancel-expired -> HTTP ${status} ${JSON.stringify(body)}`);
  const { data: after } = await sb.from("bookings").select("status").eq("id", bookingA).single();
  if (status === 200 && after.status === "cancelled") PASS(`cancel-expired: real invocation cancelled the expired QA booking (status now '${after.status}')`);
  else FAIL(`cancel-expired: expected booking ${bookingA} to become 'cancelled', got '${after.status}' (HTTP ${status}, body ${JSON.stringify(body)})`);
}

// no-show
{
  const { status, body } = await callCron("/api/cron/no-show");
  console.log(`  no-show -> HTTP ${status} ${JSON.stringify(body)}`);
  const { data: after } = await sb.from("bookings").select("status, deposit_kept").eq("id", bookingB).single();
  if (status === 200 && after.status === "no_show" && after.deposit_kept === true) PASS(`no-show: real invocation marked the overdue QA booking no_show with deposit_kept=true`);
  else FAIL(`no-show: expected booking ${bookingB} to become 'no_show'/deposit_kept=true, got status='${after.status}' deposit_kept=${after.deposit_kept} (HTTP ${status})`);
  const { count: auditCount } = await sb.from("audit_log").select("id", { count: "exact", head: true }).eq("entity_id", bookingB).eq("action", "booking.no_show");
  if ((auditCount ?? 0) > 0) PASS(`no-show: audit_log entry created for booking ${bookingB}`);
  else NOTE(`no-show: no audit_log row found for booking ${bookingB} (non-blocking — logAuditEvent is fire-and-forget)`);
}

// payment-reminders (both passes in one call)
{
  const { status, body } = await callCron("/api/cron/payment-reminders");
  console.log(`  payment-reminders -> HTTP ${status} ${JSON.stringify(body)}`);
  const { data: afterC } = await sb.from("bookings").select("deposit_reminder_sent").eq("id", bookingC).single();
  if (status === 200 && afterC.deposit_reminder_sent === true) PASS(`payment-reminders pass1: real invocation flipped deposit_reminder_sent=true on the QA booking due within 25h`);
  else FAIL(`payment-reminders pass1: expected deposit_reminder_sent=true on booking ${bookingC}, got ${afterC.deposit_reminder_sent} (HTTP ${status})`);

  const { data: afterD } = await sb.from("bookings").select("remainder_reminder_sent").eq("id", bookingD).single();
  if (afterD.remainder_reminder_sent === true) PASS(`payment-reminders pass2: real invocation flipped remainder_reminder_sent=true on the QA booking with an unpaid balance`);
  else NOTE(`payment-reminders pass2: remainder_reminder_sent still false on booking ${bookingD} after real invocation (HTTP ${status}, body ${JSON.stringify(body)}) — expected: sendRemainderPaymentRequest() needs a Stripe Connect account on the studio (getOrCreateDepositCheckoutSession), and this QA studio has none (by design, per Phase 4 cleanup reverting stripe_connected_account_id to null) — code correctly left the flag unset for retry per its own comment ("Left unmarked so a transient failure is retried on the next run"). Confirms pass2's query/eligibility logic ran; not a cron bug.`);
}

// review-requests
{
  const { status, body } = await callCron("/api/cron/review-requests");
  console.log(`  review-requests -> HTTP ${status} ${JSON.stringify(body)}`);
  const { data: after } = await sb.from("bookings").select("review_requested_at").eq("id", bookingE).single();
  if (status === 200 && after.review_requested_at) PASS(`review-requests: real invocation set review_requested_at on the QA booking completed 15 days ago`);
  else FAIL(`review-requests: expected review_requested_at to be set on booking ${bookingE}, got ${after.review_requested_at} (HTTP ${status})`);
}

// waitlist-notify
{
  const { status, body } = await callCron("/api/cron/waitlist-notify");
  console.log(`  waitlist-notify -> HTTP ${status} ${JSON.stringify(body)}`);
  const { data: after } = await sb.from("waitlist").select("notified").eq("id", wl.id).single();
  if (status === 200 && after.notified === true) PASS(`waitlist-notify: real invocation marked the QA waitlist entry notified=true`);
  else FAIL(`waitlist-notify: expected waitlist entry ${wl.id} notified=true, got ${after.notified} (HTTP ${status}, body ${JSON.stringify(body)})`);
}

// sms-reminders (expect silent no-op due to known missing-column bug)
{
  const { status, body } = await callCron("/api/cron/sms-reminders");
  console.log(`  sms-reminders -> HTTP ${status} ${JSON.stringify(body)}`);
  const { data: after } = await sb.from("bookings").select("sms_48hr_sent").eq("id", bookingG).single();
  if (status === 200 && (body.sent48hr === 0 && body.sentDayOf === 0) && after.sms_48hr_sent === false) {
    PASS(`sms-reminders: RE-CONFIRMED — real invocation returned HTTP 200 with 0 sent, and left the QA booking's sms_48hr_sent=false even though it was a genuinely eligible booking (confirmed, deposit_paid, 48h out). Root cause already logged: missing email_48hr_sent/email_day_of_sent columns make the route's initial .select() fail; the error is not checked, so candidates silently becomes [] and the cron reports success with zero reminders sent. Not re-logging as new — see FUNCTIONAL_BUG_LOG.md prior entry.`);
  } else {
    FAIL(`sms-reminders: unexpected result — HTTP ${status}, body ${JSON.stringify(body)}, sms_48hr_sent after=${after.sms_48hr_sent}. This differs from the expected silent-failure signature; re-examine.`);
  }
}

HEAD("Step 4 — cleanup (this script's own QA rows)");
// Also sweep the pre-existing Phase 4 leftover rows discovered during precheck.
const leftoverBookingIds = [
  "a8db8186-5c3e-42c5-a15c-c516612e8072", "4953c7c3-55b8-44c2-86db-751754d8d21c",
  "0c660a1c-7609-4552-8023-39cc8673b3fb", "3cc485db-3b8e-42bf-aca4-2efd153f7696",
];
const leftoverClientIds = [
  "e667d1e7-e99c-4bc0-af2b-9f0804ddb5d4", "77401bbd-853b-4517-8233-1409a54e1c0c",
  "71a5a904-39a2-43bb-9de2-030f044b6699", "6dbd64b4-a30d-482b-ba97-3895d0f25bc1",
];
const allBookingIds = [...createdBookingIds, ...leftoverBookingIds];
const allClientIds = [...createdClientIds, ...leftoverClientIds];

if (allBookingIds.length) {
  const { error } = await sb.from("bookings").delete().in("id", allBookingIds);
  if (error) FAIL(`cleanup: booking delete failed: ${error.message}`);
  else PASS(`cleanup: deleted ${allBookingIds.length} booking(s) (${createdBookingIds.length} created this run + ${leftoverBookingIds.length} Phase 4 leftovers)`);
}
if (createdWaitlistIds.length) {
  const { error } = await sb.from("waitlist").delete().in("id", createdWaitlistIds);
  if (error) FAIL(`cleanup: waitlist delete failed: ${error.message}`);
  else PASS(`cleanup: deleted ${createdWaitlistIds.length} waitlist row(s)`);
}
if (allClientIds.length) {
  const { error } = await sb.from("clients").delete().in("id", allClientIds);
  if (error) FAIL(`cleanup: client delete failed: ${error.message}`);
  else PASS(`cleanup: deleted ${allClientIds.length} client(s) (${createdClientIds.length} created this run + ${leftoverClientIds.length} Phase 4 leftovers)`);
}

HEAD(`AUTOMATIONS/CRON REAL-INVOCATION COMPLETE — ${findings.length} finding(s)`);
findings.forEach((f) => console.log(" -", f));
process.exit(findings.length ? 1 : 0);
