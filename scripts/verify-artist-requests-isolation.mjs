/**
 * InkBook — Artist Requests cross-studio isolation verification
 *
 * Task 5's regression script (verify-artist-requests-authz.mjs) already
 * proves same-studio, cross-artist isolation (a colleague at the same
 * studio can't touch another artist's assigned request). This script
 * proves the other half: an artist at a COMPLETELY DIFFERENT studio can't
 * see or act on a request at all — whether it's assigned or unassigned —
 * via direct URL, the list page, or the mutation API routes.
 *
 * Self-cleaning: creates one tagged custom_requests row per studio at a
 * real studio, drives real HTTP requests with real injected sessions for
 * two artists at two different studios, then deletes everything it made.
 *
 * 2026-08-30: previously hardcoded a specific studio/artist id set that
 * turned out to belong to a real, actively-used studio, not a QA fixture
 * (investigated and confirmed — see QA_ENGINE.md "Known gaps" history).
 * Now reads a disposable fixture from qa/artist-fixture.json instead —
 * provision one first with:
 *   node scripts/qa-engine-artist-fixture.mjs --provision
 *
 * Run with: QA_BASE_URL=<https://www.inkbook.tech|http://localhost:PORT> node scripts/verify-artist-requests-isolation.mjs
 */

import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY     = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_KEY  = env.SUPABASE_SERVICE_ROLE_KEY;
const BASE_URL     = process.env.QA_BASE_URL ?? "https://www.inkbook.tech";
const PROJECT_REF  = SUPABASE_URL.match(/https:\/\/([^.]+)\./)[1];
const TAG          = "QA-VERIFY-ARTIST-REQUESTS-T7";

if (!existsSync("qa/artist-fixture.json")) {
  console.error("Missing qa/artist-fixture.json — run: node scripts/qa-engine-artist-fixture.mjs --provision");
  process.exit(1);
}
const FIXTURE = JSON.parse(readFileSync("qa/artist-fixture.json", "utf8"));

// Studio A: Jamie's disposable QA studio. Studio B: a completely different, also disposable, studio/artist.
const STUDIO_A_ID  = FIXTURE.studioA.id;
const JAMIE_ID     = FIXTURE.jamie.id;
const JAMIE_MAIL   = FIXTURE.jamie.email;

const STUDIO_B_ID    = FIXTURE.studioB.id;
const OUTSIDER_MAIL  = FIXTURE.outsider.email;

let failures = 0;
const PASS = (msg) => console.log("  PASS:", msg);
const FAIL = (msg) => { console.log("  FAIL:", msg); failures++; };
const HEAD = (msg) => console.log("\n" + msg + "\n" + "-".repeat(msg.length));

const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

async function buildCookiesFor(email) {
  const { data, error } = await sb.auth.admin.generateLink({ type: "magiclink", email });
  if (error) throw new Error(`generateLink(${email}) failed: ${error.message}`);
  const magicLink = data.properties.action_link;

  const helperBrowser = await chromium.launch({ headless: true });
  const helperPage = await helperBrowser.newPage();
  let capturedUrl = null;
  helperPage.on("framenavigated", (frame) => {
    if (frame === helperPage.mainFrame()) {
      const u = frame.url();
      if (u.includes("access_token=")) capturedUrl = u;
    }
  });
  await helperPage.goto(magicLink, { waitUntil: "domcontentloaded", timeout: 20000 }).catch(() => {});
  await helperPage.waitForTimeout(1200);
  if (!capturedUrl) capturedUrl = helperPage.url();
  await helperBrowser.close();

  const hashStr = capturedUrl.includes("#") ? capturedUrl.split("#")[1] : "";
  const hashParams = new URLSearchParams(hashStr);
  const access_token = hashParams.get("access_token");
  const refresh_token = hashParams.get("refresh_token");
  if (!access_token || !refresh_token) throw new Error(`Could not extract tokens for ${email}. URL: ${capturedUrl.slice(0, 200)}`);

  const resp = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: ANON_KEY },
    body: JSON.stringify({ refresh_token }),
  });
  const session = await resp.json();
  if (session.error) throw new Error(`Token refresh failed for ${email}: ${session.error_description}`);

  const sessionStr = JSON.stringify(session);
  const CHUNK_SIZE = 3180;
  const chunks = [];
  for (let i = 0; i < sessionStr.length; i += CHUNK_SIZE) chunks.push(sessionStr.slice(i, i + CHUNK_SIZE));

  const cookieName = `sb-${PROJECT_REF}-auth-token`;
  const targetHost = new URL(BASE_URL).hostname;
  return chunks.map((chunk, i) => ({
    name: chunks.length > 1 ? `${cookieName}.${i}` : cookieName,
    value: chunk,
    domain: targetHost,
    path: "/",
    httpOnly: false,
    secure: BASE_URL.startsWith("https"),
    sameSite: "Lax",
  }));
}

async function makeContext(cookies) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ baseURL: BASE_URL });
  await context.addCookies(cookies);
  return { browser, context };
}

async function main() {
  console.log("=== Artist Requests — cross-studio isolation verification ===");

  HEAD("Setup — creating tagged test rows in Studio A only");
  const base = {
    studio_id: STUDIO_A_ID,
    client_name: `${TAG} Client`,
    client_email: "qa-verify-t7@test.internal",
    client_phone: "5550003333",
    design_description: "QA verification row — safe to delete",
    placement: "shoulder",
    size: "small",
    budget_range: "$100-200",
    preferred_dates: "Flexible",
  };

  const { data: rows, error: insertErr } = await sb.from("custom_requests").insert([
    { ...base, status: "pending", artist_id: JAMIE_ID }, // rAssigned: Studio A, assigned to Jamie
    { ...base, status: "pending", artist_id: null },      // rUnassigned: Studio A, unassigned
  ]).select("id, status, artist_id");

  if (insertErr || !rows || rows.length !== 2) {
    console.error("ABORT: could not create test rows —", insertErr?.message);
    process.exit(1);
  }
  const [rAssigned, rUnassigned] = rows;
  console.log(`  rAssigned (Studio A, assigned to Jamie): ${rAssigned.id}`);
  console.log(`  rUnassigned (Studio A, unassigned):      ${rUnassigned.id}`);
  const rowIds = rows.map((r) => r.id);

  try {
    HEAD("Auth — building sessions for Jamie (Studio A) and an outsider artist (Studio B)");
    const jamieCookies = await buildCookiesFor(JAMIE_MAIL);
    const outsiderCookies = await buildCookiesFor(OUTSIDER_MAIL);
    console.log("  Sessions obtained for both artists.");

    const jamie = await makeContext(jamieCookies);
    const outsider = await makeContext(outsiderCookies);

    try {
      // ── TEST 1: same-studio artist CAN view an assigned request ──
      HEAD("TEST 1 — Jamie (Studio A) can view his own assigned request via direct URL");
      const p1 = await jamie.context.newPage();
      const res1 = await p1.goto(`${BASE_URL}/artist/requests/${rAssigned.id}`, { waitUntil: "networkidle" });
      const body1 = await p1.locator("body").innerText();
      if (res1.ok() && body1.includes(TAG)) PASS(`Jamie sees the request detail (status ${res1.status()})`);
      else FAIL(`Expected Jamie to see the request. status=${res1.status()}, contains tag=${body1.includes(TAG)}`);
      await p1.close();

      // ── TEST 2: cross-studio artist CANNOT view an assigned request (direct URL) ──
      HEAD("TEST 2 — Outsider (Studio B) cannot view Studio A's assigned request via direct URL");
      const p2 = await outsider.context.newPage();
      const res2 = await p2.goto(`${BASE_URL}/artist/requests/${rAssigned.id}`, { waitUntil: "networkidle" });
      const body2 = await p2.locator("body").innerText();
      if (res2.status() === 404 && !body2.includes(TAG)) PASS(`Blocked — 404, no client PII leaked`);
      else FAIL(`Expected 404 with no PII, got status=${res2.status()}, contains tag=${body2.includes(TAG)}`);
      await p2.close();

      // ── TEST 3: cross-studio artist CANNOT view an UNASSIGNED request either ──
      HEAD("TEST 3 — Outsider (Studio B) cannot view Studio A's UNASSIGNED request (studio scope still applies)");
      const p3 = await outsider.context.newPage();
      const res3 = await p3.goto(`${BASE_URL}/artist/requests/${rUnassigned.id}`, { waitUntil: "networkidle" });
      const body3 = await p3.locator("body").innerText();
      if (res3.status() === 404 && !body3.includes(TAG)) PASS(`Blocked — 404, unassigned does not mean 'any artist anywhere'`);
      else FAIL(`Expected 404, got status=${res3.status()}, contains tag=${body3.includes(TAG)}`);
      await p3.close();

      // ── TEST 4: list page isolation — outsider's list never contains Studio A's client ──
      HEAD("TEST 4 — Outsider's requests list page does not leak Studio A's client name");
      const p4 = await outsider.context.newPage();
      await p4.goto(`${BASE_URL}/artist/requests`, { waitUntil: "networkidle" });
      const listBody = await p4.locator("body").innerText();
      if (!listBody.includes(TAG)) PASS("Studio A's tagged client name absent from outsider's list page");
      else FAIL("Studio A's tagged client name LEAKED into outsider's list page");
      await p4.close();

      // ── TEST 5: direct API bypass — outsider cannot quote Studio A's request ──
      HEAD("TEST 5 — Outsider (Studio B) cannot POST /quote on Studio A's assigned request");
      const res5 = await outsider.context.request.post(`/api/custom-requests/${rAssigned.id}/quote`, {
        data: { quote_amount: 300, deposit_amount: 50 },
      });
      if (res5.status() === 403) PASS(`Blocked with 403 — cross-studio quote isolation holds`);
      else FAIL(`Expected 403, got ${res5.status()}: ${await res5.text()}`);

      // ── TEST 6: direct API bypass — outsider cannot decline Studio A's UNASSIGNED request ──
      HEAD("TEST 6 — Outsider (Studio B) cannot POST /decline on Studio A's unassigned request");
      const res6 = await outsider.context.request.post(`/api/custom-requests/${rUnassigned.id}/decline`, {
        data: { declined_reason: "should not apply" },
      });
      if (res6.status() === 403) PASS(`Blocked with 403 — cross-studio decline isolation holds even when unassigned`);
      else FAIL(`Expected 403, got ${res6.status()}: ${await res6.text()}`);

      // ── TEST 7: regression — the DB rows are untouched by every blocked attempt ──
      HEAD("TEST 7 — Regression: no blocked attempt mutated the DB");
      const { data: after } = await sb.from("custom_requests").select("id, status, artist_id").in("id", rowIds);
      const stillPending = (after ?? []).every((r) => r.status === "pending");
      if (stillPending) PASS("Both rows remain 'pending' — every cross-studio attempt was a true no-op");
      else FAIL(`Unexpected mutation: ${JSON.stringify(after)}`);
    } finally {
      await jamie.browser.close();
      await outsider.browser.close();
    }
  } finally {
    HEAD("Teardown — deleting tagged test rows");
    const { error: delErr } = await sb.from("custom_requests").delete().in("id", rowIds);
    if (delErr) console.error("  WARNING: cleanup failed —", delErr.message, "| IDs:", rowIds.join(", "));
    else console.log(`  Deleted ${rowIds.length} tagged test rows.`);
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
