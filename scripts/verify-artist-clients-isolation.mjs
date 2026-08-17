/**
 * InkBook — Artist Clients isolation + integration regression
 *
 * Artist Clients was previously a fully static placeholder (always "No
 * clients yet", a dead search input, no data layer at all). Built for real
 * on top of the existing bookings.client_id FK — no new tables, no
 * duplicate CRM. This script proves:
 *   1. An artist sees a client they have a real booking with.
 *   2. A same-studio colleague with no booking against that client gets 404
 *      on direct URL — no studio-wide fallback.
 *   3. A different-studio artist gets 404 too.
 *   4. Consultation/custom-request history (email-matched) surfaces
 *      correctly and links to the already-locked detail routes.
 *   5. Consent-signed indicator reflects real consent_forms state.
 *
 * Self-cleaning: creates one tagged client + booking (+ consultation +
 * consent form), deletes everything regardless of pass/fail.
 *
 * Requires: local dev server running on http://localhost:3001
 * Run with: node scripts/verify-artist-clients-isolation.mjs
 */

import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY     = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_KEY  = env.SUPABASE_SERVICE_ROLE_KEY;
const BASE_URL     = "http://localhost:3001";
const PROJECT_REF  = SUPABASE_URL.match(/https:\/\/([^.]+)\./)[1];
const TAG          = "QA-VERIFY-ARTIST-CLIENTS";

const STUDIO_A_ID  = "bb0c648e-4f18-4e48-8581-6b7cfd585eea";
const JAMIE_ID     = "78f9b22a-3b69-46d0-8bdf-773ec4e1f46b";
const JAMIE_MAIL   = "jamie.chen@inkbook-demo.test";
const MARCUS_MAIL  = "marcus.lee@inkbook-demo.test";
const OUTSIDER_MAIL = "testartist@inkbook.tech"; // different studio

let failures = 0;
const PASS = (msg) => console.log("  PASS:", msg);
const FAIL = (msg) => { console.log("  FAIL:", msg); failures++; };
const HEAD = (msg) => console.log("\n" + msg + "\n" + "-".repeat(msg.length));

const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

async function buildCookiesFor(email) {
  const { data, error } = await sb.auth.admin.generateLink({ type: "magiclink", email });
  if (error) throw new Error(`generateLink(${email}) failed: ${error.message}`);
  const helperBrowser = await chromium.launch({ headless: true });
  const helperPage = await helperBrowser.newPage();
  let capturedUrl = null;
  helperPage.on("framenavigated", (frame) => {
    if (frame === helperPage.mainFrame()) {
      const u = frame.url();
      if (u.includes("access_token=")) capturedUrl = u;
    }
  });
  await helperPage.goto(data.properties.action_link, { waitUntil: "domcontentloaded", timeout: 20000 }).catch(() => {});
  await helperPage.waitForTimeout(1200);
  if (!capturedUrl) capturedUrl = helperPage.url();
  await helperBrowser.close();
  const hashParams = new URLSearchParams(capturedUrl.split("#")[1] ?? "");
  const refresh_token = hashParams.get("refresh_token");
  if (!refresh_token) throw new Error(`Could not extract tokens for ${email}`);
  const resp = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST", headers: { "Content-Type": "application/json", apikey: ANON_KEY },
    body: JSON.stringify({ refresh_token }),
  });
  const session = await resp.json();
  const sessionStr = JSON.stringify(session);
  const chunks = [];
  for (let i = 0; i < sessionStr.length; i += 3180) chunks.push(sessionStr.slice(i, i + 3180));
  const cookieName = `sb-${PROJECT_REF}-auth-token`;
  return chunks.map((c, i) => ({
    name: chunks.length > 1 ? `${cookieName}.${i}` : cookieName, value: c,
    domain: "localhost", path: "/", httpOnly: false, secure: false, sameSite: "Lax",
  }));
}

async function main() {
  console.log("=== Artist Clients — isolation + integration regression ===");

  HEAD("Setup — tagged client + booking (Jamie) + consultation + consent form");
  const clientEmail = `qa-verify-artist-clients-${Date.now()}@test.internal`;
  const { data: client, error: cErr } = await sb.from("clients").insert({
    studio_id: STUDIO_A_ID, full_name: `${TAG} Client`, email: clientEmail, phone: "5559993333",
  }).select("id").single();
  if (cErr) { console.error("ABORT:", cErr.message); process.exit(1); }

  const { data: booking, error: bErr } = await sb.from("bookings").insert({
    studio_id: STUDIO_A_ID, artist_id: JAMIE_ID, client_id: client.id,
    date: "2026-09-01", time: "14:00", style: `${TAG} Style`, status: "completed",
    deposit_amount_cents: 10000, total_amount_cents: 40000, deposit_paid: true,
    deposit_paid_at: new Date().toISOString(), deposit_expires_at: new Date(Date.now() + 1e10).toISOString(),
    remainder_collected: true,
  }).select("id").single();
  if (bErr) { console.error("ABORT:", bErr.message); process.exit(1); }

  const { data: consult } = await sb.from("consultations").insert({
    studio_id: STUDIO_A_ID, artist_id: JAMIE_ID,
    client_name: `${TAG} Client`, client_email: clientEmail, client_phone: "5559993333",
    tattoo_description: "QA verify", placement: "arm", estimated_size: "medium", color_preference: "black and grey", budget_range: "$200-400",
  }).select("id").single();

  await sb.from("consent_forms").insert({
    booking_id: booking.id, client_id: client.id, is_minor: false,
    client_signature: `${TAG} Test Client`, id_photo_url: "qa-verify/synthetic.jpg", state_template: "US",
  });

  console.log(`  Client: ${client.id}, Booking: ${booking.id}, Consultation: ${consult.id}`);

  try {
    const jamieCookies = await buildCookiesFor(JAMIE_MAIL);
    const browser = await chromium.launch({ headless: true });

    HEAD("TEST 1 — Jamie sees the client on his list and can open the detail page");
    const jamieContext = await browser.newContext({ baseURL: BASE_URL });
    await jamieContext.addCookies(jamieCookies);
    const jamiePage = await jamieContext.newPage();
    await jamiePage.goto(`${BASE_URL}/artist/clients`, { waitUntil: "networkidle" });
    const listBody = await jamiePage.locator("body").innerText();
    if (listBody.includes(`${TAG} Client`)) PASS("Client appears on Jamie's list");
    else FAIL("Client missing from Jamie's list");

    const detailRes = await jamiePage.goto(`${BASE_URL}/artist/clients/${client.id}`, { waitUntil: "networkidle" });
    const detailBody = await jamiePage.locator("body").innerText();
    if (detailRes.ok() && detailBody.includes(clientEmail)) PASS("Detail page loads with correct contact info");
    else FAIL(`Detail page issue: status=${detailRes.status()}`);

    HEAD("TEST 2 — Consultation history surfaces and links to the locked detail route");
    if (detailBody.toUpperCase().includes("CONSULTATION")) PASS("Consultation history section renders");
    else FAIL("Consultation history missing");
    const consultLink = await jamiePage.locator(`a[href="/artist/consultations/${consult.id}"]`).count();
    if (consultLink > 0) PASS("Links to the existing locked consultation detail route (no duplicate logic)");
    else FAIL("Consultation link missing or wrong href");

    HEAD("TEST 3 — Consent-signed indicator reflects real consent_forms state");
    if (detailBody.toUpperCase().includes("CONSENT SIGNED")) PASS("Booking row shows 'Consent signed' indicator");
    else FAIL("Consent indicator missing despite a real consent_forms row existing");

    await jamieContext.close();

    HEAD("TEST 4 — Marcus (same studio, no booking with this client) gets 404 on direct URL");
    const marcusCookies = await buildCookiesFor(MARCUS_MAIL);
    const marcusContext = await browser.newContext({ baseURL: BASE_URL });
    await marcusContext.addCookies(marcusCookies);
    const marcusPage = await marcusContext.newPage();
    const marcusRes = await marcusPage.goto(`${BASE_URL}/artist/clients/${client.id}`, { waitUntil: "networkidle" });
    const marcusBody = await marcusPage.locator("body").innerText();
    if (marcusRes.status() === 404 && !marcusBody.includes(clientEmail)) {
      PASS("Blocked — 404, no contact info leaked, no studio-wide fallback");
    } else {
      FAIL(`Expected 404 with no leak, got status=${marcusRes.status()}, leaked=${marcusBody.includes(clientEmail)}`);
    }
    const marcusListRes = await marcusPage.goto(`${BASE_URL}/artist/clients`, { waitUntil: "networkidle" });
    const marcusListBody = await marcusPage.locator("body").innerText();
    if (!marcusListBody.includes(`${TAG} Client`)) PASS("Client absent from Marcus's own list");
    else FAIL("Client leaked onto Marcus's list");
    await marcusContext.close();

    HEAD("TEST 5 — Different-studio artist gets 404 too");
    const outsiderCookies = await buildCookiesFor(OUTSIDER_MAIL);
    const outsiderContext = await browser.newContext({ baseURL: BASE_URL });
    await outsiderContext.addCookies(outsiderCookies);
    const outsiderPage = await outsiderContext.newPage();
    const outsiderRes = await outsiderPage.goto(`${BASE_URL}/artist/clients/${client.id}`, { waitUntil: "networkidle" });
    if (outsiderRes.status() === 404) PASS("Blocked — 404 for a completely different studio's artist");
    else FAIL(`Expected 404, got ${outsiderRes.status()}`);
    await outsiderContext.close();

    HEAD("TEST 6 — Malformed client ID doesn't crash");
    const p6 = await browser.newContext({ baseURL: BASE_URL });
    await p6.addCookies(jamieCookies);
    const page6 = await p6.newPage();
    const res6 = await page6.goto(`${BASE_URL}/artist/clients/not-a-real-uuid`, { waitUntil: "networkidle" });
    if (res6.status() === 404) PASS("Malformed ID 404s cleanly, no server error");
    else FAIL(`Expected 404, got ${res6.status()}`);
    await p6.close();

    await browser.close();
  } finally {
    HEAD("Teardown");
    await sb.from("consent_forms").delete().eq("booking_id", booking.id);
    await sb.from("consultations").delete().eq("id", consult.id);
    await sb.from("bookings").delete().eq("id", booking.id);
    await sb.from("clients").delete().eq("id", client.id);
    console.log("  Deleted test client, booking, consultation, consent form.");
  }

  console.log("\nSUMMARY\n" + "=".repeat(7));
  if (failures === 0) {
    console.log("  ALL TESTS PASSED");
  } else {
    console.log(`  ${failures} test(s) FAILED`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("\nFatal:", err.message);
  process.exit(1);
});
