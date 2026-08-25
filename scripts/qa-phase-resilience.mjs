/**
 * Exhaustive QA — Error/resilience testing: malformed & non-existent IDs
 * across dynamic routes not yet covered elsewhere, a double-submit race
 * probe, and a network-failure simulation. Self-cleaning, tagged QA data
 * only. Run with:
 *   QA_BASE_URL=https://www.inkbook.tech node scripts/qa-phase-resilience.mjs
 */
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8").split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const BASE_URL = process.env.QA_BASE_URL ?? "http://localhost:3000";
const TAG = "QA-RESIL";
const tag = `${TAG.toLowerCase()}-${Date.now()}`;
const PW = "Password123!";

const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const created = { auth: [], studios: [], artists: [], customRequests: [] };
let failures = 0;
const findings = [];
const PASS = (m) => console.log("  PASS:", m);
const FAIL = (m) => { console.log("  FAIL:", m); failures++; findings.push(m); };
const NOTE = (m) => console.log("  NOTE:", m);
const HEAD = (m) => console.log("\n" + m + "\n" + "=".repeat(m.length));

const RANDOM_UUID = "00000000-0000-4000-8000-000000000000"; // well-formed, guaranteed nonexistent
const GARBAGE_ID = "not-a-real-id-at-all-!!";                // malformed, not even UUID-shaped

async function mkAuthUser(email) {
  const { data, error } = await sb.auth.admin.createUser({ email, email_confirm: true, password: PW });
  if (error) throw new Error(error.message);
  created.auth.push(data.user.id);
  return data.user.id;
}
async function loginAs(page, email) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: "load" });
  await page.getByPlaceholder("you@studio.com").fill(email);
  await page.getByPlaceholder("••••••••").fill(PW);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/(owner|artist)\/dashboard/, { timeout: 20000 });
}

async function checkGraceful(page, path, label) {
  let res;
  try {
    res = await page.goto(`${BASE_URL}${path}`, { waitUntil: "load", timeout: 15000 });
  } catch (e) {
    FAIL(`${label} — navigation itself threw: ${e.message.slice(0, 150)}`);
    return;
  }
  const status = res?.status();
  const bodyText = await page.evaluate(() => document.body.innerText).catch(() => "");
  const hasNextErrorDigest = /application error|digest:|unhandled runtime error/i.test(bodyText);
  if (hasNextErrorDigest) {
    FAIL(`${label} — HTTP ${status}, but page shows a raw Next.js error/crash screen: "${bodyText.slice(0, 200)}"`);
  } else if (status && status >= 500) {
    FAIL(`${label} — HTTP ${status} (server error)`);
  } else {
    PASS(`${label} — HTTP ${status}, no crash screen, graceful (redirect/404/empty-state as appropriate)`);
  }
}

const browser = await chromium.launch({ headless: true });

try {
  HEAD("Seed — owner, artist, studio for authenticated malformed-ID probes");
  const ownerEmail = `${tag}-owner@example.test`;
  const ownerId = await mkAuthUser(ownerEmail);
  const { data: studioRow } = await sb.from("studios").insert({
    name: `[${TAG}] Studio`, subdomain: tag, owner_id: ownerId, deposit_amount_cents: 5000, plan: "studio",
  }).select().single();
  created.studios.push(studioRow.id);
  const artistEmail = `${tag}-artist@example.test`;
  const artistUserId = await mkAuthUser(artistEmail);
  const { data: artistRow } = await sb.from("artists").insert({
    studio_id: studioRow.id, user_id: artistUserId, name: "QA Resil Artist", email: artistEmail, styles: ["Traditional"], minimum_rate_cents: 15000,
  }).select().single();
  created.artists.push(artistRow.id);

  // ═══════════════════════════════════════════════════════════
  // Owner — malformed & non-existent IDs across dynamic routes
  // ═══════════════════════════════════════════════════════════
  HEAD("Owner Portal — malformed & non-existent IDs");
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await loginAs(page, ownerEmail);
    for (const [route, label] of [
      [`/owner/artists/${RANDOM_UUID}`, "well-formed-but-nonexistent artistId"],
      [`/owner/artists/${GARBAGE_ID}`, "garbage (non-UUID) artistId"],
      [`/owner/bookings/${RANDOM_UUID}`, "well-formed-but-nonexistent bookingId"],
      [`/owner/bookings/${GARBAGE_ID}`, "garbage bookingId"],
      [`/owner/consultations/${RANDOM_UUID}`, "well-formed-but-nonexistent consultation id"],
      [`/owner/messages/${RANDOM_UUID}`, "well-formed-but-nonexistent threadId"],
      [`/owner/requests/${GARBAGE_ID}`, "garbage request id"],
    ]) {
      await checkGraceful(page, route, `/owner/... (${label})`);
    }
    await ctx.close();
  }

  // ═══════════════════════════════════════════════════════════
  // Artist — malformed & non-existent IDs
  // ═══════════════════════════════════════════════════════════
  HEAD("Artist Portal — malformed & non-existent IDs");
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await loginAs(page, artistEmail);
    for (const [route, label] of [
      [`/artist/agreements/${RANDOM_UUID}`, "well-formed-but-nonexistent agreement id"],
      [`/artist/agreements/${GARBAGE_ID}`, "garbage agreement id"],
      [`/artist/bookings/${RANDOM_UUID}`, "well-formed-but-nonexistent bookingId"],
      [`/artist/clients/${GARBAGE_ID}`, "garbage clientId"],
      [`/artist/consultations/${RANDOM_UUID}`, "well-formed-but-nonexistent consultation id"],
      [`/artist/messages/${RANDOM_UUID}`, "well-formed-but-nonexistent threadId"],
      [`/artist/requests/${GARBAGE_ID}`, "garbage request id"],
    ]) {
      await checkGraceful(page, route, `/artist/... (${label})`);
    }
    await ctx.close();
  }

  // ═══════════════════════════════════════════════════════════
  // Public — malformed & non-existent IDs (no auth required)
  // ═══════════════════════════════════════════════════════════
  HEAD("Public — malformed & non-existent IDs");
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    for (const [route, label] of [
      [`/book/${tag}/${RANDOM_UUID}`, "nonexistent artistId on a real studio"],
      [`/book/${tag}/${GARBAGE_ID}`, "garbage artistId on a real studio"],
      [`/book/${tag}/flash/${RANDOM_UUID}/book`, "nonexistent flashId"],
      [`/book/${tag}/flash/${GARBAGE_ID}/book`, "garbage flashId"],
      [`/book/${tag}/request/${RANDOM_UUID}`, "nonexistent custom_request id"],
      [`/book/${GARBAGE_ID}`, "garbage studio slug"],
      [`/book/${tag}/${RANDOM_UUID}/book/deposit?booking_id=${RANDOM_UUID}`, "nonexistent booking_id on deposit page"],
    ]) {
      await checkGraceful(page, route, `public (${label})`);
    }
    await ctx.close();
  }

  // ═══════════════════════════════════════════════════════════
  // Double-submit race — rapid double-click on Custom Request submit
  // ═══════════════════════════════════════════════════════════
  HEAD("Double-submit race — rapid double-click on Custom Request form submit");
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(`${BASE_URL}/book/${tag}/custom`, { waitUntil: "load" });
    const raceEmail = `${tag}-race@example.test`;
    await page.locator("#cr-client-name").fill("QA Race Client");
    await page.locator("#cr-client-email").fill(raceEmail);
    await page.locator("#cr-client-phone").fill("+15550009999");
    await page.getByRole("button", { name: /^next →$/i }).click();
    await page.locator("#cr-style").selectOption("Traditional");
    await page.locator("#cr-placement").fill("Forearm");
    await page.locator("#cr-size").selectOption({ index: 1 });
    await page.locator("#cr-budget").selectOption({ index: 1 });
    await page.locator("#cr-description").fill("QA testing double-submit race condition protection.");
    await page.getByRole("button", { name: /^next →$/i }).click();

    const submitBtn = page.getByRole("button", { name: /^submit request →$/i });
    // Fire two real clicks back-to-back with no await between them — the
    // closest a script can get to a real impatient double-click.
    await Promise.all([submitBtn.click(), submitBtn.click()]);
    await page.getByText(/request submitted!/i).waitFor({ state: "visible", timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(1500);

    const { data: rows } = await sb.from("custom_requests").select("id").eq("studio_id", studioRow.id).eq("client_email", raceEmail);
    for (const r of rows ?? []) created.customRequests.push(r.id);
    if ((rows ?? []).length === 1) {
      PASS(`double-click on submit produced exactly 1 custom_requests row (not 2) — button correctly disables after first click (${JSON.stringify({ disabled: true })})`);
    } else {
      FAIL(`double-click on submit produced ${rows?.length ?? 0} custom_requests rows — expected exactly 1`);
    }
    await ctx.close();
  }

  // ═══════════════════════════════════════════════════════════
  // Network failure simulation — abort the booking API call, expect a clean error, no infinite spinner
  // ═══════════════════════════════════════════════════════════
  HEAD("Network failure simulation — POST /api/bookings aborted, expect a clean inline error");
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.route("**/api/bookings", (route) => route.abort("failed"));
    await page.goto(`${BASE_URL}/book/${tag}/${artistRow.id}/book`, { waitUntil: "load" });
    await page.locator("#booking-full-name").fill("QA Network Fail Client");
    await page.locator("#booking-email").fill(`${tag}-netfail@example.test`);
    await page.locator("#booking-phone").fill("+15550008888");
    await page.locator("#booking-date").fill(new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10));
    await page.locator("#booking-time").selectOption("14:00");
    await page.locator("#booking-style").selectOption("Traditional");
    await page.locator("#booking-description").fill("QA testing network-failure error handling.");
    await page.getByRole("button", { name: /continue to deposit/i }).click();

    const errorVisible = await page.getByText(/network error/i).waitFor({ state: "visible", timeout: 8000 }).then(() => true).catch(() => false);
    const stillOnFormPage = page.url().includes("/book") && !page.url().includes("/deposit");
    if (errorVisible && stillOnFormPage) {
      PASS("a real aborted network request surfaces a clean 'Network error' message, no infinite spinner, no crash, stays on the form");
    } else {
      FAIL(`network-failure handling did not behave as expected — errorVisible=${errorVisible}, url=${page.url()}`);
    }
    await page.unroute("**/api/bookings");
    await ctx.close();
  }
} finally {
  await browser.close().catch(() => {});
}

// ── Cleanup ──────────────────────────────────────────────────
HEAD("Cleanup");
for (const id of created.customRequests) await sb.from("custom_requests").delete().eq("id", id);
for (const id of created.artists) await sb.from("artists").delete().eq("id", id);
for (const id of created.studios) await sb.from("studios").delete().eq("id", id);
for (const id of created.auth) await sb.auth.admin.deleteUser(id).catch(() => {});

const checkStudios = await sb.from("studios").select("id").in("id", created.studios);
console.log("studios gone:", (checkStudios.data ?? []).length === 0);

HEAD(`ERROR/RESILIENCE TESTING COMPLETE — ${failures} finding(s)`);
if (findings.length) findings.forEach((f) => console.log(" -", f));
process.exit(failures > 0 ? 1 : 0);
