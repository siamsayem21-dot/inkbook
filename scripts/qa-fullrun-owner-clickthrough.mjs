/**
 * Full ground-up QA re-run (2026-08-29) — Job B: Owner Portal full real-browser
 * click-through against PRODUCTION (https://www.inkbook.tech), using the
 * persistent QA studio seeded by qa-fullrun-seed-studio.mjs (manifest at
 * qa-manifests/fullqa-20260829-studio.json).
 *
 * Run with: node scripts/qa-fullrun-owner-clickthrough.mjs
 */
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync } from "fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8").split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const manifest = JSON.parse(readFileSync("qa-manifests/fullqa-20260829-studio.json", "utf8"));
const BASE_URL = manifest.baseUrl;
const TAG = manifest.tag;

const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

const studioId = manifest.studio.id;
const ownerEmail = manifest.owner.email;
const ownerPw = manifest.owner.password;
const artist1 = manifest.artists.find((a) => a.label === "artist1");
const artist2 = manifest.artists.find((a) => a.label === "artist2");

const results = []; // { id, persona, route, screen, action, expected, actual, console, network, persistence, crossRole, status, evidence }
const bugs = []; // { id, persona, route, action, expected, actual, repro, console, network, severity, rootCause, files, fix, retest, status }
let ownIdCounter = 1;
let bugIdCounter = 1;
function nextOwnId() { return `OWN-${String(ownIdCounter++).padStart(3, "0")}`; }
function nextBugId() { return `BUG-OWN-FULLQA-${String(bugIdCounter++).padStart(3, "0")}`; }

function record(row) { results.push({ id: nextOwnId(), ...row }); }
function recordBug(row) { const id = nextBugId(); bugs.push({ id, ...row }); return id; }

const cleanup = { auth: [], other: [] };

console.log(`Loaded manifest: studio=${studioId} owner=${ownerEmail} artist1=${artist1.id} artist2=${artist2.id}`);

// ═══════════════════════════════════════════════════════════
// 0 — Seed supporting QA data (clients, bookings, consultation,
//     custom_request, consent_form, review, waitlist, message thread)
// ═══════════════════════════════════════════════════════════
console.log("\n=== 0 — Seed supporting QA data ===");

let { data: clientOne } = await sb.from("clients").select("*").eq("studio_id", studioId).eq("email", "qa.fullqa.client1.20260829@inkbook-qa.test").maybeSingle();
if (!clientOne) {
  const { data, error } = await sb.from("clients").insert({
    studio_id: studioId, full_name: `[${TAG}] Client One`, email: "qa.fullqa.client1.20260829@inkbook-qa.test", phone: "+15550001111",
  }).select().single();
  if (error) throw new Error("client1 insert failed: " + error.message);
  clientOne = data;
}
const { data: client2exist } = await sb.from("clients").select("*").eq("studio_id", studioId).eq("email", "qa.fullqa.client2.20260829@inkbook-qa.test").maybeSingle();
let clientTwo = client2exist;
if (!clientTwo) {
  const { data } = await sb.from("clients").insert({
    studio_id: studioId, full_name: `[${TAG}] Client Two`, email: "qa.fullqa.client2.20260829@inkbook-qa.test", phone: "+15550002222",
  }).select().single();
  clientTwo = data;
}
console.log("clients:", clientOne?.id, clientTwo?.id);

// Booking A: confirmed + deposit paid + consent signed (for Mark Completed test)
let { data: bookingA } = await sb.from("bookings").select("*").eq("studio_id", studioId).eq("description", `[${TAG}] Booking A - confirmed`).maybeSingle();
if (!bookingA) {
  const { data } = await sb.from("bookings").insert({
    studio_id: studioId, artist_id: artist1.id, client_id: clientOne.id,
    date: "2027-03-01", time: "14:00", style: "Fine line",
    description: `[${TAG}] Booking A - confirmed`, status: "confirmed",
    deposit_amount_cents: 10000, deposit_paid: true, deposit_paid_at: new Date().toISOString(),
    total_amount_cents: 40000,
  }).select().single();
  bookingA = data;
}
let { data: consentA } = await sb.from("consent_forms").select("*").eq("booking_id", bookingA.id).maybeSingle();
if (!consentA) {
  const { data, error } = await sb.from("consent_forms").insert({
    booking_id: bookingA.id, client_id: clientOne.id, is_minor: false,
    client_signature: "QA Client One", state_template: "CA", signed_at: new Date().toISOString(),
    id_photo_url: "https://placehold.co/400x300.png?text=QA+ID+Photo",
  }).select().single();
  if (error) throw new Error("consent_forms insert failed: " + error.message);
  consentA = data;
}

// Booking B: pending_deposit (no Stripe Connect account on this studio — real
// regression test for the just-fixed "route owner deposit links through
// Connect-aware helper, fail closed" behavior).
let { data: bookingB } = await sb.from("bookings").select("*").eq("studio_id", studioId).eq("description", `[${TAG}] Booking B - pending deposit`).maybeSingle();
if (!bookingB) {
  const { data } = await sb.from("bookings").insert({
    studio_id: studioId, artist_id: artist2.id, client_id: clientTwo.id,
    date: "2027-03-05", time: "11:00", style: "Traditional",
    description: `[${TAG}] Booking B - pending deposit`, status: "pending_deposit",
    deposit_amount_cents: 10000, deposit_paid: false,
  }).select().single();
  bookingB = data;
}
console.log("bookings:", bookingA?.id, bookingB?.id);

// Consultation
let { data: consultationA } = await sb.from("consultations").select("*").eq("studio_id", studioId).eq("client_email", "qa.fullqa.consult1.20260829@inkbook-qa.test").maybeSingle();
if (!consultationA) {
  const { data, error } = await sb.from("consultations").insert({
    studio_id: studioId, client_name: `[${TAG}] Consult Client`, client_email: "qa.fullqa.consult1.20260829@inkbook-qa.test",
    client_phone: "+15550003333", tattoo_description: "QA test — small forearm piece", placement: "Forearm",
    estimated_size: "3 inches", color_preference: "Black and grey", budget_range: "$200-400", status: "new",
  }).select().single();
  if (error) throw new Error("consultation insert failed: " + error.message);
  consultationA = data;
}
console.log("consultation:", consultationA?.id);

// Custom request
let { data: requestA } = await sb.from("custom_requests").select("*").eq("studio_id", studioId).eq("client_email", "qa.fullqa.request1.20260829@inkbook-qa.test").maybeSingle();
if (!requestA) {
  const { data, error } = await sb.from("custom_requests").insert({
    studio_id: studioId, artist_id: artist1.id,
    client_name: `[${TAG}] Request Client`, client_email: "qa.fullqa.request1.20260829@inkbook-qa.test", client_phone: "+15550004444",
    style: "Fine line", design_description: "QA test — line art request", placement: "Wrist", size: "2 inches",
    budget_range: "$150-250", preferred_dates: "Flexible, any weekday", status: "pending",
  }).select().single();
  if (error) throw new Error("custom_request insert failed: " + error.message);
  requestA = data;
}
console.log("custom_request:", requestA?.id);

// Review (pending approval, to test Approve action)
let { data: reviewA } = await sb.from("reviews").select("*").eq("studio_id", studioId).eq("author_name", `[${TAG}] Pending Reviewer`).maybeSingle();
if (!reviewA) {
  const { data } = await sb.from("reviews").insert({
    studio_id: studioId, author_name: `[${TAG}] Pending Reviewer`, rating: 5,
    quote: "QA test review — pending approval", is_public: false, is_active: true,
  }).select().single();
  reviewA = data;
}
console.log("review:", reviewA?.id);

// Waitlist entry
let { data: waitlistA } = await sb.from("waitlist").select("*").eq("artist_id", artist2.id).eq("client_id", clientTwo.id).maybeSingle();
if (!waitlistA) {
  const { data } = await sb.from("waitlist").insert({
    studio_id: studioId, artist_id: artist2.id, client_id: clientTwo.id, preferred_style: "Traditional", notes: `[${TAG}] QA waitlist entry`,
  }).select().single();
  waitlistA = data;
}
console.log("waitlist:", waitlistA?.id);

// Client account + message thread + 1 client message (for owner Messages test)
const clientAccountEmail = "qa.fullqa.clientaccount.20260829@inkbook-qa.test";
let { data: existingUsers } = await sb.auth.admin.listUsers();
let clientAuthUser = existingUsers?.users?.find((u) => u.email === clientAccountEmail);
if (!clientAuthUser) {
  const { data } = await sb.auth.admin.createUser({ email: clientAccountEmail, email_confirm: true, password: manifest.password });
  clientAuthUser = data.user;
}
let { data: clientAccountA } = await sb.from("client_accounts").select("*").eq("user_id", clientAuthUser.id).maybeSingle();
if (!clientAccountA) {
  const { data } = await sb.from("client_accounts").insert({ user_id: clientAuthUser.id, email: clientAccountEmail }).select().single();
  clientAccountA = data;
}
let { data: threadA } = await sb.from("message_threads").select("*").eq("studio_id", studioId).eq("client_account_id", clientAccountA.id).is("consultation_id", null).maybeSingle();
if (!threadA) {
  const { data } = await sb.from("message_threads").insert({ studio_id: studioId, client_account_id: clientAccountA.id, artist_id: artist1.id }).select().single();
  threadA = data;
}
const { data: existingMsgs } = await sb.from("messages").select("id").eq("thread_id", threadA.id);
if (!existingMsgs || existingMsgs.length === 0) {
  await sb.from("messages").insert({
    thread_id: threadA.id, sender_role: "client", sender_client_account_id: clientAccountA.id,
    content: `[${TAG}] Hi, question about my upcoming appointment.`,
  });
}
console.log("message thread:", threadA?.id);

console.log("\n=== Supporting QA data ready ===\n");

// ═══════════════════════════════════════════════════════════
// Browser setup
// ═══════════════════════════════════════════════════════════
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

// Known-benign Next.js App Router noise: RSC prefetch requests get aborted
// when navigation moves on before they resolve, and the client falls back to
// a full navigation — self-recovering, not a real bug. Same filter used by
// scripts/qa-phase-a11y-console-perf.mjs.
const BENIGN_CONSOLE = [/Failed to fetch RSC payload/i];
const BENIGN_NETWORK = [/[?&]_rsc=/, /\/monitoring\?/];

let consoleErrors = [];
let failedRequests = [];
page.on("console", (msg) => {
  if (msg.type() === "error" && !BENIGN_CONSOLE.some((re) => re.test(msg.text()))) consoleErrors.push(msg.text());
});
page.on("requestfailed", (req) => {
  if (!BENIGN_NETWORK.some((re) => re.test(req.url()))) failedRequests.push(req.url());
});
function drainNetwork() { const c = consoleErrors.slice(); const n = failedRequests.slice(); consoleErrors = []; failedRequests = []; return { c, n }; }

await page.goto(`${BASE_URL}/login`, { waitUntil: "load" });
await page.getByPlaceholder("you@studio.com").fill(ownerEmail);
await page.getByPlaceholder("••••••••").fill(ownerPw);
await page.getByRole("button", { name: /sign in/i }).click();
await page.waitForURL(/\/owner\/dashboard/, { timeout: 20000 });
drainNetwork();
console.log("Owner logged in.");

// ═══════════════════════════════════════════════════════════
// 1 — Route sweep, desktop + mobile
// ═══════════════════════════════════════════════════════════
const ROUTES = [
  "/owner/dashboard", "/owner/bookings", "/owner/clients", "/owner/consultations",
  "/owner/pipeline", "/owner/requests", "/owner/flash", "/owner/consent-forms",
  "/owner/revenue", "/owner/artists", "/owner/blacklist",
  "/owner/waitlist", "/owner/reviews", "/owner/knowledge", "/owner/messages",
  "/owner/settings", "/owner/settings/billing", "/owner/settings/studio", "/owner/audit-log",
];

for (const viewport of [{ name: "desktop", width: 1440, height: 900 }, { name: "mobile", width: 390, height: 844 }]) {
  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  for (const route of ROUTES) {
    drainNetwork();
    let status = null, navErr = null;
    try {
      const resp = await page.goto(BASE_URL + route, { waitUntil: "networkidle", timeout: 15000 });
      status = resp?.status();
    } catch (e) { navErr = e.message; }
    const { c, n } = drainNetwork();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2).catch(() => false);
    const stillAuth = page.url().startsWith(BASE_URL + route);

    let actual, statusVal;
    if (navErr) { actual = `navigation error: ${navErr}`; statusVal = "FAIL"; }
    else if (!stillAuth) { actual = `redirected to ${page.url()}`; statusVal = "FAIL"; }
    else if (status >= 200 && status < 400) {
      actual = `HTTP ${status}`;
      const problems = [];
      if (overflow) problems.push("horizontal overflow");
      if (c.length) problems.push(`${c.length} console error(s)`);
      if (n.length) problems.push(`${n.length} failed request(s)`);
      statusVal = problems.length ? "FAIL" : "PASS";
      if (problems.length) actual += " | " + problems.join(", ");
    } else { actual = `HTTP ${status}`; statusVal = "FAIL"; }

    record({
      persona: "OWNER", route, screen: `${viewport.name} route load`, action: "navigate",
      expected: "HTTP 2xx-3xx, no console/network errors, no horizontal overflow, still authenticated",
      actual, console: c.slice(0, 3).join(" / "), network: n.slice(0, 3).join(" / "),
      persistence: "n/a", crossRole: "n/a", status: statusVal, evidence: "route sweep",
    });
    if (statusVal === "FAIL") console.log(`  [${viewport.name}] FAIL ${route}: ${actual}`);
  }
}
console.log("\nRoute sweep complete.\n");

await page.setViewportSize({ width: 1440, height: 900 });

// ═══════════════════════════════════════════════════════════
// 2 — Deep interactions per module
// ═══════════════════════════════════════════════════════════

// --- Dashboard sanity ---
await page.goto(`${BASE_URL}/owner/dashboard`, { waitUntil: "load" });
{
  const body = await page.evaluate(() => document.body.innerText);
  const ok = body.length > 200;
  record({ persona: "OWNER", route: "/owner/dashboard", screen: "Dashboard", action: "load with seeded data",
    expected: "dashboard renders widgets reflecting seeded bookings/revenue", actual: ok ? "rendered" : "empty/broken",
    console: "", network: "", persistence: "n/a", crossRole: "n/a", status: ok ? "PASS" : "FAIL", evidence: "" });
}

// --- Consultations: open detail ---
await page.goto(`${BASE_URL}/owner/consultations`, { waitUntil: "load" });
{
  const body = await page.evaluate(() => document.body.innerText);
  const listedOk = body.includes("Consult Client") || body.includes(TAG);
  record({ persona: "OWNER", route: "/owner/consultations", screen: "Consultations list", action: "view seeded consultation",
    expected: "seeded QA consultation appears in list", actual: listedOk ? "visible" : `not visible — snippet: ${body.slice(0,150)}`,
    console: "", network: "", persistence: "n/a", crossRole: "n/a", status: listedOk ? "PASS" : "FAIL", evidence: "" });

  if (listedOk) {
    await page.goto(`${BASE_URL}/owner/consultations/${consultationA.id}`, { waitUntil: "load" });
    const detailBody = await page.evaluate(() => document.body.innerText);
    const detailOk = detailBody.includes("forearm") || detailBody.includes("Forearm") || detailBody.includes("Consult Client");
    record({ persona: "OWNER", route: `/owner/consultations/${consultationA.id}`, screen: "Consultation detail", action: "open detail",
      expected: "detail shows description/placement fields", actual: detailOk ? "rendered correctly" : `unexpected — snippet: ${detailBody.slice(0,150)}`,
      console: "", network: "", persistence: "n/a", crossRole: "n/a", status: detailOk ? "PASS" : "FAIL", evidence: "" });
  }
}

// --- Pipeline: board shows custom request ---
await page.goto(`${BASE_URL}/owner/pipeline`, { waitUntil: "load" });
{
  const body = await page.evaluate(() => document.body.innerText);
  const ok = body.includes("Request Client") || body.includes(TAG) || body.includes("Consult Client");
  record({ persona: "OWNER", route: "/owner/pipeline", screen: "Pipeline board", action: "view seeded cards",
    expected: "seeded consultation/request appear as pipeline cards", actual: ok ? "visible" : `not visible — snippet: ${body.slice(0,200)}`,
    console: "", network: "", persistence: "n/a", crossRole: "n/a", status: ok ? "PASS" : "FAIL", evidence: "" });
}

// --- Requests: open + send quote via real OwnerQuoteForm ---
await page.goto(`${BASE_URL}/owner/requests`, { waitUntil: "load" });
{
  const body = await page.evaluate(() => document.body.innerText);
  const listedOk = body.includes("Request Client") || body.includes(TAG);
  record({ persona: "OWNER", route: "/owner/requests", screen: "Requests list", action: "view seeded custom request",
    expected: "seeded QA custom request appears", actual: listedOk ? "visible" : `not visible — snippet: ${body.slice(0,150)}`,
    console: "", network: "", persistence: "n/a", crossRole: "n/a", status: listedOk ? "PASS" : "FAIL", evidence: "" });

  if (listedOk) {
    await page.goto(`${BASE_URL}/owner/requests/${requestA.id}`, { waitUntil: "load" }).catch(() => {});
    const onDetail = page.url().includes(requestA.id);
    if (onDetail) {
      // Actions panel starts as Approve/Decline buttons; Approve reveals the quote form.
      const approveBtn = page.getByRole("button", { name: /^approve$/i }).first();
      const hasApprove = await approveBtn.count().then((c) => c > 0).catch(() => false);
      if (hasApprove) {
        await approveBtn.click();
        await page.waitForTimeout(300);
        await page.locator("#owner-quote-total").fill("250");
        await page.locator("#owner-quote-deposit").fill("75");
        await page.locator("#owner-quote-note").fill(`[${TAG}] QA quote message`);
        const confirmBtn = page.getByRole("button", { name: /confirm approval/i });
        await confirmBtn.click();
        await page.waitForTimeout(2500);
        const { data: afterQuote } = await sb.from("custom_requests").select("status, quote_amount").eq("id", requestA.id).single();
        const quoted = afterQuote?.status === "quoted";
        record({ persona: "OWNER", route: `/owner/requests/${requestA.id}`, screen: "Request detail — Approve → quote form", action: "click Approve, fill total+deposit, Confirm Approval",
          expected: "custom_requests.status → 'quoted', quote_amount persisted", actual: quoted ? `status=quoted, amount=${afterQuote.quote_amount}` : `status=${afterQuote?.status}`,
          console: "", network: "", persistence: quoted ? "verified via DB" : "FAILED", crossRole: "n/a", status: quoted ? "PASS" : "FAIL", evidence: "" });
      } else {
        record({ persona: "OWNER", route: `/owner/requests/${requestA.id}`, screen: "Request detail", action: "locate Approve button",
          expected: "Approve button present for pending request", actual: "not found", console: "", network: "", persistence: "n/a", crossRole: "n/a", status: "FAIL", evidence: "" });
      }
    } else {
      record({ persona: "OWNER", route: `/owner/requests/${requestA.id}`, screen: "Request detail", action: "navigate to detail",
        expected: "detail page loads at /owner/requests/{id}", actual: `landed at ${page.url()}`, console: "", network: "", persistence: "n/a", crossRole: "n/a", status: "FAIL", evidence: "" });
    }
  }
}

// --- Bookings: detail views + safe actions ---
await page.goto(`${BASE_URL}/owner/bookings`, { waitUntil: "load" });
{
  const body = await page.evaluate(() => document.body.innerText);
  const ok = body.includes(TAG) || body.includes("Client One") || body.includes("Client Two");
  record({ persona: "OWNER", route: "/owner/bookings", screen: "Bookings list", action: "view seeded bookings",
    expected: "seeded QA bookings appear in list", actual: ok ? "visible" : `not visible — snippet: ${body.slice(0,200)}`,
    console: "", network: "", persistence: "n/a", crossRole: "n/a", status: ok ? "PASS" : "FAIL", evidence: "" });

  // Booking A — Mark Session Completed
  // Idempotency: reset status back to 'confirmed' so a re-run of this script
  // can exercise the real Mark Session Completed click again.
  await sb.from("bookings").update({ status: "confirmed", completed_at: null }).eq("id", bookingA.id);
  await page.goto(`${BASE_URL}/owner/bookings/${bookingA.id}`, { waitUntil: "load" });
  const markBtn = page.getByRole("button", { name: /mark session completed/i });
  const hasMarkBtn = await markBtn.count().then((c) => c > 0).catch(() => false);
  if (hasMarkBtn) {
    await markBtn.click();
    await page.waitForTimeout(2000);
    const { data: afterMark } = await sb.from("bookings").select("status, completed_at").eq("id", bookingA.id).single();
    const completed = afterMark?.status === "completed";
    record({ persona: "OWNER", route: `/owner/bookings/${bookingA.id}`, screen: "Booking detail (confirmed + consent)", action: "Mark Session Completed",
      expected: "bookings.status → 'completed', completed_at set", actual: completed ? `status=completed, completed_at=${afterMark.completed_at}` : `status=${afterMark?.status}`,
      console: "", network: "", persistence: completed ? "verified via DB" : "FAILED", crossRole: "n/a", status: completed ? "PASS" : "FAIL", evidence: "" });
  } else {
    record({ persona: "OWNER", route: `/owner/bookings/${bookingA.id}`, screen: "Booking detail", action: "locate Mark Session Completed button",
      expected: "button present for confirmed booking with signed consent", actual: "not found", console: "", network: "", persistence: "n/a", crossRole: "n/a", status: "FAIL", evidence: "" });
  }

  // Booking B — Send deposit request (regression test: studio has no Stripe Connect account → should fail closed with clear message, per commit 4ee18db)
  await page.goto(`${BASE_URL}/owner/bookings/${bookingB.id}`, { waitUntil: "load" });
  const sendDepositBtn = page.getByRole("button", { name: /generate deposit link/i }).first();
  const hasSendDeposit = await sendDepositBtn.count().then((c) => c > 0).catch(() => false);
  if (hasSendDeposit) {
    await sendDepositBtn.click();
    await page.waitForTimeout(2500);
    const bodyAfter = await page.evaluate(() => document.body.innerText);
    const failedClosed = /connect|stripe|not.*set.*up|onboard/i.test(bodyAfter) && !/undefined|NaN|\[object Object\]/i.test(bodyAfter);
    record({ persona: "OWNER", route: `/owner/bookings/${bookingB.id}`, screen: "Booking detail (pending_deposit, no Connect account)", action: "Send deposit request — regression check for 4ee18db",
      expected: "fails closed with a clear Stripe-Connect-not-set-up message (no raw error, no wrong-account link)", actual: failedClosed ? "clear error message shown, no crash" : `unexpected body — snippet: ${bodyAfter.slice(0,200)}`,
      console: "", network: "", persistence: "n/a", crossRole: "n/a", status: failedClosed ? "PASS" : "FAIL", evidence: "regression test for prior P0/P1 payment-routing fix" });
  } else {
    record({ persona: "OWNER", route: `/owner/bookings/${bookingB.id}`, screen: "Booking detail", action: "locate Send Deposit button",
      expected: "button present for pending_deposit booking", actual: "not found", console: "", network: "", persistence: "n/a", crossRole: "n/a", status: "FAIL", evidence: "" });
  }
}

// --- Clients: detail view ---
await page.goto(`${BASE_URL}/owner/clients`, { waitUntil: "load" });
{
  const body = await page.evaluate(() => document.body.innerText);
  const ok = body.includes("Client One") || body.includes("Client Two");
  record({ persona: "OWNER", route: "/owner/clients", screen: "Clients list", action: "view seeded clients",
    expected: "seeded QA clients appear", actual: ok ? "visible" : `not visible — snippet: ${body.slice(0,150)}`,
    console: "", network: "", persistence: "n/a", crossRole: "n/a", status: ok ? "PASS" : "FAIL", evidence: "" });

  await page.goto(`${BASE_URL}/owner/clients/${clientOne.id}`, { waitUntil: "load" }).catch(() => {});
  const onDetail = page.url().includes(clientOne.id);
  record({ persona: "OWNER", route: `/owner/clients/${clientOne.id}`, screen: "Client detail", action: "navigate to detail",
    expected: "detail page loads", actual: onDetail ? "loaded" : `landed at ${page.url()}`, console: "", network: "", persistence: "n/a", crossRole: "n/a", status: onDetail ? "PASS" : "FAIL", evidence: "" });
}

// --- Revenue: sanity ---
await page.goto(`${BASE_URL}/owner/revenue`, { waitUntil: "load" });
{
  const body = await page.evaluate(() => document.body.innerText);
  const hasNumbers = /\$[\d,]+/.test(body);
  record({ persona: "OWNER", route: "/owner/revenue", screen: "Revenue dashboard", action: "view with seeded paid deposit",
    expected: "revenue figures render (dollar amounts)", actual: hasNumbers ? "dollar figures rendered" : `no $ figures found — snippet: ${body.slice(0,150)}`,
    console: "", network: "", persistence: "n/a", crossRole: "n/a", status: hasNumbers ? "PASS" : "FAIL", evidence: "" });
}

// --- Portfolio/Flash (owner cross-artist view) ---
// NOTE: "Flash" (flash_designs, per-artist /artist/flash) is a distinct
// feature from "Portfolio" (portfolio_images, per-artist /artist/portfolio) —
// seeding only uploaded portfolio photos, so an accurate empty state here is
// correct product behavior, not a gap. Confirmed via body text: "No flash
// designs yet."
await page.goto(`${BASE_URL}/owner/flash`, { waitUntil: "load" });
{
  const body = await page.evaluate(() => document.body.innerText);
  const emptyStateOk = /no flash designs yet/i.test(body);
  record({ persona: "OWNER", route: "/owner/flash", screen: "Flash cross-artist view (distinct from Portfolio)", action: "view with 0 flash designs seeded (only portfolio photos were seeded)",
    expected: "clean empty state renders, no crash (flash_designs is a separate table from portfolio_images, not seeded by Job A)", actual: emptyStateOk ? "clean empty state rendered correctly" : `unexpected — snippet: ${body.slice(0,200)}`,
    console: "", network: "", persistence: "n/a", crossRole: "n/a", status: emptyStateOk ? "PASS" : "FAIL", evidence: "flash vs portfolio are distinct features; deferred flash seeding to Artist Portal phase" });
}

// --- Consent Forms: list shows seeded form ---
await page.goto(`${BASE_URL}/owner/consent-forms`, { waitUntil: "load" });
{
  const body = await page.evaluate(() => document.body.innerText);
  const ok = body.includes("Client One") || body.includes("CA") || body.length > 100;
  record({ persona: "OWNER", route: "/owner/consent-forms", screen: "Consent Forms list", action: "view seeded consent form",
    expected: "seeded signed consent form appears or page renders cleanly", actual: ok ? "rendered" : `unexpected — snippet: ${body.slice(0,150)}`,
    console: "", network: "", persistence: "n/a", crossRole: "n/a", status: ok ? "PASS" : "FAIL", evidence: "" });
}

// --- Blacklist: empty-field guard, real add, real remove, double-submit ---
await page.goto(`${BASE_URL}/owner/blacklist`, { waitUntil: "load" });
{
  await page.getByRole("button", { name: /block client/i }).first().click();
  await page.waitForTimeout(300);
  const submitBtn = page.getByRole("button", { name: /^block client$/i }).last();
  const disabledEmpty = await submitBtn.isDisabled().catch(() => false);
  record({ persona: "OWNER", route: "/owner/blacklist", screen: "Block client form", action: "submit with both email+phone empty",
    expected: "submit button disabled (client-side guard)", actual: disabledEmpty ? "disabled as expected" : "NOT disabled — could submit empty",
    console: "", network: "", persistence: "n/a", crossRole: "n/a", status: disabledEmpty ? "PASS" : "FAIL", evidence: "" });

  const blEmail = "qa.fullqa.blacklisted.20260829@inkbook-qa.test";
  await page.locator("#blacklist-email").fill(blEmail);
  await page.locator("#blacklist-reason").fill(`[${TAG}] QA test block`);
  // Double-submit: click twice rapidly.
  await submitBtn.click();
  await submitBtn.click().catch(() => {});
  await page.waitForTimeout(2000);
  const { data: blRows } = await sb.from("blacklist").select("id").eq("studio_id", studioId).eq("client_email", blEmail);
  const oneRow = (blRows ?? []).length === 1;
  record({ persona: "OWNER", route: "/owner/blacklist", screen: "Block client form", action: "double-click submit with valid email",
    expected: "exactly 1 blacklist row created (no duplicate from double-submit)", actual: `${(blRows ?? []).length} row(s) created`,
    console: "", network: "", persistence: oneRow ? "verified via DB, no dup" : "DUPLICATE OR MISSING", crossRole: "n/a", status: oneRow ? "PASS" : "FAIL", evidence: "" });

  if (blRows && blRows.length > 0) {
    await page.reload({ waitUntil: "load" });
    const bodyAfterReload = await page.evaluate(() => document.body.innerText);
    const visibleAfterReload = bodyAfterReload.includes(blEmail) || bodyAfterReload.includes("QA test block");
    record({ persona: "OWNER", route: "/owner/blacklist", screen: "Blacklist list", action: "refresh after add",
      expected: "newly blocked client persists and shows after refresh", actual: visibleAfterReload ? "visible after refresh" : "NOT visible after refresh",
      console: "", network: "", persistence: visibleAfterReload ? "verified" : "FAILED", crossRole: "n/a", status: visibleAfterReload ? "PASS" : "FAIL", evidence: "" });

    // Remove
    const removeBtn = page.getByRole("button", { name: /^remove$/i }).first();
    if (await removeBtn.count()) {
      await removeBtn.click();
      await page.waitForTimeout(500);
      const confirmBtn = page.getByRole("button", { name: /confirm remove/i }).first();
      if (await confirmBtn.count()) await confirmBtn.click();
      await page.waitForTimeout(1500);
      const { data: afterRemove } = await sb.from("blacklist").select("id").eq("studio_id", studioId).eq("client_email", blEmail);
      const removed = !afterRemove || afterRemove.length === 0;
      record({ persona: "OWNER", route: "/owner/blacklist", screen: "Blacklist entry", action: "Remove → Confirm remove",
        expected: "blacklist row deleted", actual: removed ? "deleted" : `still present: ${JSON.stringify(afterRemove)}`,
        console: "", network: "", persistence: removed ? "verified via DB" : "FAILED", crossRole: "n/a", status: removed ? "PASS" : "FAIL", evidence: "" });
    }
  }
}

// --- Waitlist: view + remove ---
await page.goto(`${BASE_URL}/owner/waitlist`, { waitUntil: "load" });
{
  const body = await page.evaluate(() => document.body.innerText);
  const ok = body.includes("Client Two") || body.includes(TAG);
  record({ persona: "OWNER", route: "/owner/waitlist", screen: "Waitlist", action: "view seeded entry",
    expected: "seeded waitlist entry appears", actual: ok ? "visible" : `not visible — snippet: ${body.slice(0,150)}`,
    console: "", network: "", persistence: "n/a", crossRole: "n/a", status: ok ? "PASS" : "FAIL", evidence: "" });
}

// --- Reviews: approve seeded pending review, add new review via UI ---
// Idempotency: force reviewA back to pending (is_public=false) so a re-run of
// this script exercises the real Approve click again, not a stale state.
await sb.from("reviews").update({ is_public: false }).eq("id", reviewA.id);
await page.goto(`${BASE_URL}/owner/reviews`, { waitUntil: "load" });
{
  const body = await page.evaluate(() => document.body.innerText);
  const pendingVisible = body.includes("Pending Reviewer");
  if (pendingVisible) {
    const approveBtn = page.getByRole("button", { name: /^approve$/i }).first();
    if (await approveBtn.count()) {
      await approveBtn.click();
      await page.waitForTimeout(1500);
      const { data: afterApprove } = await sb.from("reviews").select("is_public").eq("id", reviewA.id).single();
      const approved = afterApprove?.is_public === true;
      record({ persona: "OWNER", route: "/owner/reviews", screen: "Reviews list", action: "Approve pending review",
        expected: "reviews.is_public → true", actual: approved ? "is_public=true" : `is_public=${afterApprove?.is_public}`,
        console: "", network: "", persistence: approved ? "verified via DB" : "FAILED", crossRole: "n/a", status: approved ? "PASS" : "FAIL", evidence: "" });
    } else {
      record({ persona: "OWNER", route: "/owner/reviews", screen: "Reviews list", action: "locate Approve button on pending review",
        expected: "Approve button present for pending review", actual: "not found", console: "", network: "", persistence: "n/a", crossRole: "n/a", status: "FAIL", evidence: "" });
    }
  } else {
    record({ persona: "OWNER", route: "/owner/reviews", screen: "Reviews list", action: "view seeded pending review",
      expected: "seeded pending review visible with Approve action", actual: `not visible — snippet: ${body.slice(0,150)}`,
      console: "", network: "", persistence: "n/a", crossRole: "n/a", status: "FAIL", evidence: "" });
  }

  // Add a new review via real UI form (button doubles as open-form and submit, both labeled "Add testimonial")
  const addTestimonialEmail = `[${TAG}] QA Added Reviewer`;
  await sb.from("reviews").delete().eq("studio_id", studioId).eq("author_name", addTestimonialEmail); // idempotency for re-runs
  const addBtn = page.getByRole("button", { name: /add testimonial/i }).first();
  if (await addBtn.count()) {
    await addBtn.click();
    await page.waitForTimeout(300);
    await page.getByPlaceholder(/sarah m/i).fill(addTestimonialEmail);
    await page.getByPlaceholder(/what did the client say/i).fill("QA test — added directly by owner via UI");
    const saveBtn = page.getByRole("button", { name: /add testimonial/i }).last();
    await saveBtn.click();
    await page.waitForTimeout(2000);
    const { data: addedReview } = await sb.from("reviews").select("id").eq("studio_id", studioId).eq("author_name", addTestimonialEmail).maybeSingle();
    record({ persona: "OWNER", route: "/owner/reviews", screen: "Add testimonial form", action: "fill + submit new review",
      expected: "new reviews row created", actual: addedReview ? `created id=${addedReview.id}` : "no row created",
      console: "", network: "", persistence: addedReview ? "verified via DB" : "FAILED", crossRole: "n/a", status: addedReview ? "PASS" : "FAIL", evidence: "" });
  } else {
    record({ persona: "OWNER", route: "/owner/reviews", screen: "Reviews list", action: "locate Add testimonial button",
      expected: "Add testimonial button present", actual: "not found", console: "", network: "", persistence: "n/a", crossRole: "n/a", status: "FAIL", evidence: "" });
  }
}

// --- Knowledge: add entry (double-submit test), delete ---
await page.goto(`${BASE_URL}/owner/knowledge`, { waitUntil: "load" });
{
  const title = `[${TAG}] QA Knowledge Entry`;
  // Idempotency: wipe any leftover rows from prior runs so the double-submit
  // delta check below is measuring only this run's clicks.
  await sb.from("studio_knowledge").delete().eq("studio_id", studioId).eq("title", title);

  await page.getByRole("button", { name: /add knowledge entry/i }).click();
  await page.waitForTimeout(300);
  await page.locator("#knowledge-title-new").fill(title);
  await page.locator("#knowledge-content-new").fill("QA test content for knowledge base entry.");
  const saveBtn = page.getByRole("button", { name: /save entry/i });
  await saveBtn.click();
  await saveBtn.click().catch(() => {}); // double-submit — fires before React can flip disabled if there's no debounce
  await page.waitForTimeout(2000);
  const { data: kRows } = await sb.from("studio_knowledge").select("id").eq("studio_id", studioId).eq("title", title);
  const oneKRow = (kRows ?? []).length === 1;
  record({ persona: "OWNER", route: "/owner/knowledge", screen: "Add knowledge entry form", action: "double-click Save entry",
    expected: "exactly 1 studio_knowledge row (no duplicate)", actual: `${(kRows ?? []).length} row(s) created`,
    console: "", network: "", persistence: oneKRow ? "verified via DB, no dup" : "DUPLICATE OR MISSING", crossRole: "n/a", status: oneKRow ? "PASS" : "FAIL", evidence: "" });

  if (kRows && kRows.length > 0) {
    const kId = kRows[0].id;
    await page.reload({ waitUntil: "load" });
    // Delete button text toggles "Delete" → "Sure?" after the first click —
    // re-locate by the post-click label rather than clicking the same locator twice.
    const card = page.locator(`text=${title}`).locator("xpath=ancestor::div[contains(@class,'rounded-2xl')][1]");
    const deleteBtn = card.getByRole("button", { name: /^delete$/i });
    const hasDelete = await deleteBtn.count().then((c) => c > 0).catch(() => false);
    if (hasDelete) {
      await deleteBtn.first().click();
      await page.waitForTimeout(300);
      const confirmDeleteBtn = card.getByRole("button", { name: /^sure\?$/i });
      await confirmDeleteBtn.first().click();
      await page.waitForTimeout(1500);
      const { data: afterDelete } = await sb.from("studio_knowledge").select("id").eq("id", kId);
      const deleted = !afterDelete || afterDelete.length === 0;
      record({ persona: "OWNER", route: "/owner/knowledge", screen: "Knowledge entry", action: "Delete → Sure? (confirm)",
        expected: "studio_knowledge row deleted", actual: deleted ? "deleted" : "still present",
        console: "", network: "", persistence: deleted ? "verified via DB" : "FAILED", crossRole: "n/a", status: deleted ? "PASS" : "FAIL", evidence: "" });
    } else {
      record({ persona: "OWNER", route: "/owner/knowledge", screen: "Knowledge entry", action: "locate Delete button",
        expected: "Delete button present on entry card", actual: "not found", console: "", network: "", persistence: "n/a", crossRole: "n/a", status: "FAIL", evidence: "" });
    }
  }
}

// --- Messages: open thread, reply as owner ---
await page.goto(`${BASE_URL}/owner/messages`, { waitUntil: "load" });
{
  const body = await page.evaluate(() => document.body.innerText);
  const threadVisible = body.includes(clientAccountEmail.split("@")[0]) || body.includes("question about my upcoming");
  record({ persona: "OWNER", route: "/owner/messages", screen: "Messages inbox", action: "view seeded client thread",
    expected: "seeded client message thread appears", actual: threadVisible ? "visible" : `not obviously visible — snippet: ${body.slice(0,200)}`,
    console: "", network: "", persistence: "n/a", crossRole: "n/a", status: threadVisible ? "PASS" : "FAIL", evidence: "" });

  if (threadVisible) {
    await page.goto(`${BASE_URL}/owner/messages/${threadA.id}`, { waitUntil: "load" }).catch(() => {});
    const onThread = page.url().includes(threadA.id);
    if (onThread) {
      const msgInput = page.locator('textarea, input[type="text"]').last();
      if (await msgInput.count()) {
        const replyText = `[${TAG}] QA owner reply`;
        await msgInput.fill(replyText);
        const sendBtn = page.getByRole("button", { name: /send/i }).last();
        await sendBtn.click();
        await page.waitForTimeout(2000);
        const { data: replyRows } = await sb.from("messages").select("id").eq("thread_id", threadA.id).eq("sender_role", "owner");
        const sent = (replyRows ?? []).length > 0;
        record({ persona: "OWNER", route: `/owner/messages/${threadA.id}`, screen: "Message thread", action: "reply as owner",
          expected: "new messages row with sender_role='owner'", actual: sent ? `${replyRows.length} owner message(s) found` : "no owner message row created",
          console: "", network: "", persistence: sent ? "verified via DB" : "FAILED", crossRole: "n/a", status: sent ? "PASS" : "FAIL", evidence: "" });
      }
    }
  }
}

// --- Settings: billing (Stripe Connect card, not connected) ---
await page.goto(`${BASE_URL}/owner/settings/billing`, { waitUntil: "load" });
{
  const body = await page.evaluate(() => document.body.innerText);
  const showsConnect = /connect|stripe/i.test(body);
  record({ persona: "OWNER", route: "/owner/settings/billing", screen: "Billing settings", action: "view Stripe Connect card (studio not yet connected)",
    expected: "Connect card renders with a connect/onboard action, no crash", actual: showsConnect ? "renders correctly" : `unexpected — snippet: ${body.slice(0,150)}`,
    console: "", network: "", persistence: "n/a", crossRole: "n/a", status: showsConnect ? "PASS" : "FAIL", evidence: "" });
}

// --- Settings studio: refresh-mid-flow (unsaved edit lost is expected, page must not crash) ---
await page.goto(`${BASE_URL}/owner/settings/studio`, { waitUntil: "load" });
{
  const nameInput = page.locator('input[type="text"]').first();
  await nameInput.fill("UNSAVED DRAFT NAME SHOULD NOT PERSIST");
  await page.reload({ waitUntil: "load" });
  const { data: studioCheck } = await sb.from("studios").select("name").eq("id", studioId).single();
  const notPersisted = studioCheck?.name !== "UNSAVED DRAFT NAME SHOULD NOT PERSIST";
  record({ persona: "OWNER", route: "/owner/settings/studio", screen: "Studio settings form", action: "type unsaved change, refresh mid-flow",
    expected: "unsaved edit is discarded on refresh, no crash, no accidental save", actual: notPersisted ? "correctly discarded" : "BUG: unsaved edit leaked into DB",
    console: "", network: "", persistence: notPersisted ? "confirmed no leak" : "LEAK", crossRole: "n/a", status: notPersisted ? "PASS" : "FAIL", evidence: "" });
}

// ═══════════════════════════════════════════════════════════
// 3 — Edge cases: nonexistent ids
// ═══════════════════════════════════════════════════════════
const FAKE_ID = "00000000-0000-0000-0000-000000000000";
for (const route of [
  `/owner/bookings/${FAKE_ID}`, `/owner/clients/${FAKE_ID}`, `/owner/consultations/${FAKE_ID}`,
  `/owner/requests/${FAKE_ID}`, `/owner/messages/${FAKE_ID}`,
]) {
  const resp = await page.goto(BASE_URL + route, { waitUntil: "networkidle", timeout: 15000 }).catch(() => null);
  const s = resp?.status();
  const safe = s && s < 500;
  record({ persona: "OWNER", route, screen: "Nonexistent record id", action: "navigate to fake uuid",
    expected: "graceful 404/redirect/error state, not a 500 crash", actual: `HTTP ${s}`,
    console: "", network: "", persistence: "n/a", crossRole: "n/a", status: safe ? "PASS" : "FAIL", evidence: "" });
}

// ═══════════════════════════════════════════════════════════
// 4 — Cross-studio isolation probe (security)
// ═══════════════════════════════════════════════════════════
console.log("\n=== Cross-studio isolation probe ===");
const isoEmail = `qa.fullqa.isolationprobe.20260829@inkbook-qa.test`;
let { data: isoUsers } = await sb.auth.admin.listUsers();
let probeOwnerUser = isoUsers?.users?.find((u) => u.email === isoEmail);
if (!probeOwnerUser) {
  const { data: created, error } = await sb.auth.admin.createUser({ email: isoEmail, email_confirm: true, password: manifest.password });
  if (error) throw new Error("isolation probe owner createUser failed: " + error.message);
  probeOwnerUser = created.user;
}
cleanup.auth.push(probeOwnerUser.id);

const { data: studioB, error: studioBErr } = await sb.from("studios").insert({
  name: `[${TAG}] Isolation Probe Studio B`, subdomain: `qa-fullqa-isoprobe-20260829`, owner_id: probeOwnerUser.id, plan: "solo",
}).select().single();
if (studioBErr) throw new Error("studio B insert failed: " + studioBErr.message);
cleanup.other.push({ table: "studios", id: studioB.id });

const { data: clientB, error: clientBErr } = await sb.from("clients").insert({ studio_id: studioB.id, full_name: "Isolation Probe Client B", email: "qa.fullqa.isoprobe.clientb@inkbook-qa.test", phone: "+15559998888" }).select().single();
if (clientBErr) throw new Error("client B insert failed: " + clientBErr.message);
cleanup.other.push({ table: "clients", id: clientB.id });

const { data: artistB, error: artistBErr } = await sb.from("artists").insert({ studio_id: studioB.id, name: "Isolation Probe Artist B", email: "qa.fullqa.isoprobe.artistb@inkbook-qa.test", styles: ["Realism"] }).select().single();
if (artistBErr) throw new Error("artist B insert failed: " + artistBErr.message);
cleanup.other.push({ table: "artists", id: artistB.id });

const { data: bookingBIso, error: bookingBErr } = await sb.from("bookings").insert({
  studio_id: studioB.id, artist_id: artistB.id, client_id: clientB.id, date: "2027-04-01", time: "10:00",
  style: "Realism", description: "Isolation probe booking B", status: "confirmed", deposit_amount_cents: 5000, deposit_paid: true,
}).select().single();
if (bookingBErr) throw new Error("booking B insert failed: " + bookingBErr.message);
cleanup.other.push({ table: "bookings", id: bookingBIso.id });

for (const [label, url] of [
  ["cross-studio booking id", `/owner/bookings/${bookingBIso.id}`],
  ["cross-studio client id", `/owner/clients/${clientB.id}`],
]) {
  const resp = await page.goto(BASE_URL + url, { waitUntil: "networkidle", timeout: 15000 }).catch(() => null);
  const bodyText = await page.evaluate(() => document.body.innerText).catch(() => "");
  const leaked = bodyText.includes("Isolation Probe") || bodyText.includes("Realism") && url.includes(bookingBIso.id);
  const status = resp?.status();
  const blocked = leaked === false;
  const rec = {
    persona: "OWNER", route: url, screen: `Isolation probe — ${label}`, action: "owner A session navigates to studio B's record id",
    expected: "blocked (404/redirect/empty), studio A owner must never see studio B's data", actual: leaked ? "DATA LEAKED — studio B record visible to studio A owner" : `blocked (HTTP ${status}, no leaked content)`,
    console: "", network: "", persistence: "n/a", crossRole: leaked ? "P0 ISOLATION FAILURE" : "isolated correctly", status: blocked ? "PASS" : "FAIL", evidence: "cross-tenant isolation security probe",
  };
  record(rec);
  if (leaked) {
    console.log(`  !!! P0 SECURITY: ${label} LEAKED cross-studio data !!!`);
    recordBug({
      persona: "OWNER", route: url, action: "navigate to another studio's record id while authenticated as a different studio's owner",
      expected: "record inaccessible — studio-scoped isolation enforced", actual: "cross-studio record data rendered in the UI",
      repro: `Log in as owner of Studio A, navigate directly to ${url} (a record belonging to Studio B). Data renders.`,
      console: "", network: "", severity: "P0", rootCause: "TBD — investigate route handler / query missing studio_id scoping",
      files: "TBD", fix: "NOT FIXED — flagged for immediate investigation, this is a hard security stop per mission rules if found in a code path requiring RLS/auth changes to fix",
      retest: "n/a", status: "BLOCKED_NEEDS_SIAM",
    });
  } else {
    console.log(`  OK — ${label} correctly isolated (HTTP ${status})`);
  }
}

await ctx.close();
await browser.close();

// Clean up isolation-probe throwaway studio B
for (const row of cleanup.other.reverse()) await sb.from(row.table).delete().eq("id", row.id);
for (const id of cleanup.auth) await sb.auth.admin.deleteUser(id).catch(() => {});
console.log("Isolation-probe Studio B cleaned up.");

// ═══════════════════════════════════════════════════════════
// Write results
// ═══════════════════════════════════════════════════════════
const passCount = results.filter((r) => r.status === "PASS").length;
const failCount = results.filter((r) => r.status === "FAIL").length;
const blockedCount = results.filter((r) => r.status === "BLOCKED_NEEDS_SIAM").length;

console.log(`\n\n=== JOB B COMPLETE — ${results.length} actions tested: ${passCount} PASS, ${failCount} FAIL, ${blockedCount} BLOCKED ===\n`);
for (const r of results) console.log(`  [${r.status}] ${r.id} ${r.route} — ${r.action} — ${r.actual}`);

writeFileSync("qa-manifests/fullqa-20260829-owner-clickthrough-results.json", JSON.stringify({ results, bugs }, null, 2));
console.log("\nRaw results also written to qa-manifests/fullqa-20260829-owner-clickthrough-results.json");
