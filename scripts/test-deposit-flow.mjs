/**
 * InkBook — Deposit Collection Flow E2E Test
 *
 * Auth strategy: generate magic link via admin API → intercept the hash
 * fragment on the production redirect → exchange refresh_token for a
 * fresh session → inject sb-* cookies directly into the localhost Playwright
 * context so the middleware sees a valid Supabase session.
 *
 * Run with:  node scripts/test-deposit-flow.mjs
 */

import { chromium }  from "playwright";
import { createClient } from "@supabase/supabase-js";
import fs             from "fs";
import path           from "path";
import { fileURLToPath } from "url";
import { readFileSync }  from "fs";

// ── Load .env.local ───────────────────────────────────────────────────────────
const envPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "../.env.local");
const envContent = readFileSync(envPath, "utf-8");
const env = Object.fromEntries(
  envContent.split("\n")
    .filter(l => l.includes("=") && !l.startsWith("#"))
    .map(l => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);

const SUPABASE_URL  = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY      = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_KEY   = env.SUPABASE_SERVICE_ROLE_KEY;
const OWNER_EMAIL   = "m54030041@gmail.com";
const BASE_URL      = "http://localhost:3000";
const PROJECT_REF   = SUPABASE_URL.match(/https:\/\/([^.]+)\./)[1]; // kcppekmmyjrbpggqbvuv

const SCREENSHOTS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "../.test-screenshots");
fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

// Clear old screenshots
fs.readdirSync(SCREENSHOTS_DIR).forEach(f => fs.unlinkSync(path.join(SCREENSHOTS_DIR, f)));

function shot(name) {
  return path.join(SCREENSHOTS_DIR, `${String(shot.counter++).padStart(2, "0")}-${name}.png`);
}
shot.counter = 1;

function log(msg) { console.log(`\n[${new Date().toISOString().slice(11, 19)}] ${msg}`); }

// ── Supabase admin client (service role — bypasses RLS) ───────────────────────
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── DB helpers ────────────────────────────────────────────────────────────────
async function getConsultationWithBooking() {
  // Scoped to Siam Enterprise studio (owner: m54030041@gmail.com)
  // so pipeline counters, booking detail, and RLS all match the logged-in user.
  const OWNER_STUDIO_ID = "5fe382a1-fee7-4387-b625-4bf7a52b8f45";

  const { data, error } = await supabase
    .from("consultations")
    .select("id, client_name, status, booking_id")
    .eq("studio_id", OWNER_STUDIO_ID)
    .not("booking_id", "is", null)
    .neq("status", "deposit_paid")
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) throw new Error("DB query failed: " + error.message);
  if (!data?.length) throw new Error("No consultation with a booking in the owner's studio. Run the setup script first.");
  return data[0];
}

async function getBooking(id)       { const { data } = await supabase.from("bookings").select("id, status, deposit_paid, deposit_amount_cents").eq("id", id).single(); return data; }
async function getDepositPayment(id) { const { data } = await (supabase.from("deposit_payments").select("id, payment_status, paid_at").eq("booking_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle()); return data; }
async function getConsultation(id)  { const { data } = await supabase.from("consultations").select("id, status").eq("id", id).single(); return data; }

// ── Auth: generate magic link, intercept token hash, exchange for fresh session
// ─────────────────────────────────────────────────────────────────────────────
async function buildLocalhostCookies() {
  log("Auth: generating admin magic-link…");
  const { data, error } = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email: OWNER_EMAIL,
    // redirectTo intentionally omitted → Supabase sends to Site URL with tokens in hash
  });
  if (error) throw new Error("generateLink failed: " + error.message);
  const magicLink = data.properties.action_link;
  log(`  Magic link obtained (${magicLink.slice(0, 60)}…)`);

  // Launch a headless browser just to consume the magic link and capture the hash
  const helperBrowser = await chromium.launch({ headless: true });
  const helperPage    = await helperBrowser.newPage();

  let capturedUrl = null;
  helperPage.on("framenavigated", frame => {
    if (frame === helperPage.mainFrame()) {
      const u = frame.url();
      if (u.includes("access_token=")) capturedUrl = u;
    }
  });

  log("Auth: consuming magic link (headless)…");
  // Use 'domcontentloaded' — we only need the redirect URL, not JS execution
  await helperPage.goto(magicLink, { waitUntil: "domcontentloaded", timeout: 20000 }).catch(() => {});
  await helperPage.waitForTimeout(1500);

  if (!capturedUrl) capturedUrl = helperPage.url();
  await helperBrowser.close();
  log(`  Captured redirect URL: ${capturedUrl.slice(0, 80)}…`);

  // Parse hash params
  const hashStr = capturedUrl.includes("#") ? capturedUrl.split("#")[1] : "";
  const hashParams = new URLSearchParams(hashStr);
  const access_token  = hashParams.get("access_token");
  const refresh_token = hashParams.get("refresh_token");

  if (!access_token || !refresh_token) {
    throw new Error(`Could not extract tokens from hash. URL: ${capturedUrl.slice(0, 200)}`);
  }
  log(`  Tokens extracted. Refresh token: ${refresh_token.slice(0, 8)}…`);

  // Exchange refresh_token for a fresh session via Supabase REST
  log("Auth: exchanging refresh token for fresh session…");
  const resp = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: ANON_KEY },
    body: JSON.stringify({ refresh_token }),
  });
  const session = await resp.json();
  if (session.error) throw new Error("Token refresh failed: " + session.error_description);
  log(`  Session obtained. User: ${session.user?.email} | exp: ${new Date(session.expires_at * 1000).toISOString()}`);

  // Chunk the session JSON into 3180-char pieces (supabase-ssr chunking scheme)
  const sessionStr = JSON.stringify(session);
  const CHUNK_SIZE = 3180;
  const chunks = [];
  for (let i = 0; i < sessionStr.length; i += CHUNK_SIZE) {
    chunks.push(sessionStr.slice(i, i + CHUNK_SIZE));
  }

  // Build Playwright cookie objects for localhost
  const cookieName = `sb-${PROJECT_REF}-auth-token`;
  const cookies = chunks.map((chunk, i) => ({
    name:     chunks.length > 1 ? `${cookieName}.${i}` : cookieName,
    value:    chunk,
    domain:   "localhost",
    path:     "/",
    httpOnly: false,
    secure:   false,
    sameSite: "Lax",
  }));
  log(`  Session chunked into ${chunks.length} cookie(s): ${cookies.map(c => c.name).join(", ")}`);
  return cookies;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  log("=== InkBook Deposit Flow E2E ===");

  // 1. Find a testable consultation
  log("Step 1: Finding consultation with booking (status ≠ deposit_paid)…");
  const consult = await getConsultationWithBooking();
  log(`  ${consult.client_name} | id=${consult.id} | booking=${consult.booking_id} | status=${consult.status}`);
  const consultUrl = `${BASE_URL}/owner/consultations/${consult.id}`;

  // 2. Build auth cookies for localhost
  const authCookies = await buildLocalhostCookies();

  // 3. Launch the real browser with the injected session
  log("Step 3: Launching browser with injected auth…");
  const browser = await chromium.launch({ headless: false, slowMo: 350 });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  await context.addCookies(authCookies);

  const page = await context.newPage();

  try {
    // 4. Verify auth by going to the dashboard
    log("Step 4: Verifying auth on owner dashboard…");
    await page.goto(`${BASE_URL}/owner`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: shot("owner-dashboard"), fullPage: true });
    if (page.url().includes("/login")) {
      throw new Error(`Auth failed — redirected to login. URL: ${page.url()}`);
    }
    log(`  Auth OK. URL: ${page.url()}`);

    // 5. Consultation detail
    log("Step 5: Opening consultation detail…");
    await page.goto(consultUrl, { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: shot("consultation-detail"), fullPage: true });
    log(`  URL: ${page.url()}`);

    // 6. Scroll to the Deposit Collection panel
    log("Step 6: Locating Deposit Collection panel…");
    const depositHeading = page.locator("text=Deposit Collection").first();
    await depositHeading.waitFor({ timeout: 10000 });
    await depositHeading.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await page.screenshot({ path: shot("deposit-panel"), fullPage: true });

    // 7. Generate deposit link
    log("Step 7: Clicking Generate Deposit Link…");
    const genBtn = page.locator("button", { hasText: /Generate Deposit Link|Regenerate/i }).first();
    await genBtn.waitFor({ timeout: 10000 });
    await genBtn.click();
    // Wait for the readonly input to appear (Stripe checkout session creation ~2-4s)
    await page.waitForSelector("input[readonly]", { timeout: 30000 });
    await page.waitForTimeout(800);
    await page.screenshot({ path: shot("deposit-link-generated"), fullPage: true });

    const depositLink = await page.locator("input[readonly]").first().inputValue();
    log(`  Deposit link: ${depositLink}`);

    // 8. Copy link feedback
    log("Step 8: Testing Copy button…");
    const copyBtn = page.locator("button", { hasText: /Copy/i });
    await copyBtn.click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: shot("copy-feedback"), fullPage: true });

    // 9. Stripe checkout — use "load" not "networkidle"; Stripe keeps analytics alive
    log("Step 9: Opening Stripe checkout…");
    await page.goto(depositLink, { waitUntil: "load", timeout: 45000 });
    await page.waitForTimeout(2500);
    await page.screenshot({ path: shot("stripe-checkout"), fullPage: true });
    log(`  Stripe URL: ${page.url()}`);

    // 10. Fill test card
    log("Step 10: Filling test card 4242 4242 4242 4242…");
    const filled = await fillStripeCheckout(page);
    if (!filled) throw new Error("Could not locate Stripe card fields — check screenshot 09-stripe-checkout.png");

    await page.screenshot({ path: shot("stripe-card-filled"), fullPage: true });

    // 11. Submit
    log("Step 11: Submitting payment…");
    const submitBtn = page.locator("button[type='submit'], button:text('Pay')").first();
    await submitBtn.click();
    log("  Waiting for redirect after payment…");
    await page.waitForURL(/consent|booking_id|localhost/, { timeout: 45000 }).catch(() => {});
    await page.waitForTimeout(2000);
    await page.screenshot({ path: shot("post-payment"), fullPage: true });
    log(`  After payment URL: ${page.url()}`);

    // 12. Webhook propagation
    log("Step 12: Waiting 6s for Stripe CLI webhook to fire…");
    await page.waitForTimeout(6000);

    // 13. Verify DB
    log("Step 13: Verifying DB state…");
    const [booking, dp, consultAfter] = await Promise.all([
      getBooking(consult.booking_id),
      getDepositPayment(consult.booking_id),
      getConsultation(consult.id),
    ]);

    log(`  bookings.status          = ${booking?.status}`);
    log(`  bookings.deposit_paid    = ${booking?.deposit_paid}`);
    log(`  deposit_payments.status  = ${dp?.payment_status}`);
    log(`  deposit_payments.paid_at = ${dp?.paid_at}`);
    log(`  consultations.status     = ${consultAfter?.status}`);

    // 14. Consultation detail → should show "Deposit Paid" card
    log("Step 14: Consultation Deposit Paid confirmation…");
    await page.goto(consultUrl, { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: shot("deposit-paid-confirmation"), fullPage: true });

    // 15. Pipeline board
    log("Step 15: Pipeline board…");
    await page.goto(`${BASE_URL}/owner/pipeline`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: shot("pipeline-board"), fullPage: true });

    // 16. Booking detail
    log("Step 16: Booking detail…");
    await page.goto(`${BASE_URL}/owner/bookings/${consult.booking_id}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: shot("booking-detail"), fullPage: true });

    // ── Results ───────────────────────────────────────────────────────────────
    const pass =
      booking?.status       === "confirmed"   &&
      booking?.deposit_paid === true          &&
      dp?.payment_status    === "paid"        &&
      consultAfter?.status  === "deposit_paid";

    log("\n=== RESULTS ===");
    log(`bookings.status:         ${booking?.status}        ${booking?.status === "confirmed"    ? "✓" : "✗ FAIL"}`);
    log(`bookings.deposit_paid:   ${booking?.deposit_paid}       ${booking?.deposit_paid === true       ? "✓" : "✗ FAIL"}`);
    log(`deposit_payments.status: ${dp?.payment_status}             ${dp?.payment_status === "paid"         ? "✓" : "✗ FAIL"}`);
    log(`consultations.status:    ${consultAfter?.status}  ${consultAfter?.status === "deposit_paid" ? "✓" : "✗ FAIL"}`);
    log(`\nOverall: ${pass ? "✓ PASS — all state correct" : "✗ FAIL — see above"}`);

    const files = fs.readdirSync(SCREENSHOTS_DIR).sort();
    log(`\nScreenshots (${files.length}):`);
    files.forEach(f => log(`  .test-screenshots/${f}`));

    if (!pass) process.exit(1);

  } finally {
    await browser.close();
  }
}

// ── Stripe Checkout card fill helper ─────────────────────────────────────────
async function fillStripeCheckout(page) {
  // Stripe Checkout v3 renders card fields as iframes.
  // Different builds use different iframe name/title patterns.
  const iframeSelectors = [
    "iframe[name*='privateStripeFrame']",
    "iframe[title*='Secure card']",
    "iframe[src*='js.stripe.com']",
    "iframe",
  ];

  // First fill the email if present (Stripe sometimes shows it)
  const emailInput = page.locator("input[autocomplete='email'], input[type='email']").first();
  if (await emailInput.isVisible({ timeout: 2000 }).catch(() => false)) {
    await emailInput.fill(OWNER_EMAIL);
    await emailInput.press("Tab");
    await page.waitForTimeout(300);
  }

  // Try each iframe selector to find card number field
  for (const sel of iframeSelectors) {
    const frames = page.frameLocator(sel);
    // Card number
    const cardNum = frames.locator("[placeholder*='1234'], [data-elements-stable-field-name='cardNumber'], #cardNumber").first();
    if (await cardNum.isVisible({ timeout: 1500 }).catch(() => false)) {
      await cardNum.fill("4242424242424242");
      await page.waitForTimeout(300);

      // Expiry
      const expiry = frames.locator("[placeholder='MM / YY'], [placeholder='MM/YY'], [data-elements-stable-field-name='cardExpiry'], #cardExpiry").first();
      if (await expiry.isVisible().catch(() => false)) {
        await expiry.fill("12 / 29");
        await page.waitForTimeout(200);
      }

      // CVC
      const cvc = frames.locator("[placeholder='CVC'], [placeholder='CVV'], [data-elements-stable-field-name='cardCvc'], #cardCvc").first();
      if (await cvc.isVisible().catch(() => false)) {
        await cvc.fill("123");
        await page.waitForTimeout(200);
      }

      // Cardholder name — NOT inside the iframe, it's in the main page
      await fillNameAndCountry(page);
      return true;
    }
  }

  // Fallback: Stripe Checkout might render all fields inline (newer builds)
  const inlineCard = page.locator("[data-testid='card-number-input'], [autocomplete='cc-number']").first();
  if (await inlineCard.isVisible({ timeout: 2000 }).catch(() => false)) {
    await inlineCard.fill("4242424242424242");
    const inlineExpiry = page.locator("[autocomplete='cc-exp']").first();
    if (await inlineExpiry.isVisible().catch(() => false)) await inlineExpiry.fill("12/29");
    const inlineCvc = page.locator("[autocomplete='cc-csc']").first();
    if (await inlineCvc.isVisible().catch(() => false)) await inlineCvc.fill("123");
    await fillNameAndCountry(page);
    return true;
  }

  return false;
}

// ── Fill cardholder name + country (not in iframes) ───────────────────────────
async function fillNameAndCountry(page) {
  // Cardholder name
  const nameField = page.locator("input[placeholder='Full name on card'], input[name='billingName'], [data-testid='cardholder-name']").first();
  if (await nameField.isVisible({ timeout: 2000 }).catch(() => false)) {
    await nameField.click();
    await nameField.fill("Test Client");
    await page.waitForTimeout(300);
    log("  Cardholder name filled ✓");
  } else {
    log("  Cardholder name field not found (OK if not required)");
  }
}

main().catch(err => {
  console.error("\n✗ Fatal:", err.message);
  process.exit(1);
});
