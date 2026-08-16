/**
 * InkBook — Artist Requests authorization + lifecycle verification
 *
 * Covers the fix in app/api/custom-requests/[id]/{quote,decline}/route.ts:
 * previously any same-studio artist could quote/decline a colleague's
 * assigned request (isArtist only checked studio_id, not artist_id).
 *
 * Also covers the QuoteForm.tsx bug fix: the artist form used to send the
 * same value as both quote_amount and deposit_amount, which the API always
 * rejects (deposit_amount must be < quote_amount) — verified here by
 * posting two distinct values through the real API route.
 *
 * Self-cleaning: creates tagged custom_requests rows, runs live HTTP
 * requests against the local dev server with real injected auth sessions
 * for two real artists at the same studio, then deletes everything it made.
 *
 * Requires: local dev server running on http://localhost:3001
 * Run with: node scripts/verify-artist-requests-authz.mjs
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
const TAG          = "QA-VERIFY-ARTIST-REQUESTS-T5";

const STUDIO_ID  = "bb0c648e-4f18-4e48-8581-6b7cfd585eea";
const JAMIE_ID   = "78f9b22a-3b69-46d0-8bdf-773ec4e1f46b";
const JAMIE_MAIL = "jamie.chen@inkbook-demo.test";
const MARCUS_ID  = "7bbf0abe-70fe-4c2c-a1a7-758fc355182a";
const MARCUS_MAIL = "marcus.lee@inkbook-demo.test";

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
  return chunks.map((chunk, i) => ({
    name: chunks.length > 1 ? `${cookieName}.${i}` : cookieName,
    value: chunk,
    domain: "localhost",
    path: "/",
    httpOnly: false,
    secure: false,
    sameSite: "Lax",
  }));
}

async function makeRequestContext(cookies) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ baseURL: BASE_URL });
  await context.addCookies(cookies);
  return { browser, context };
}

async function getRow(id) {
  const { data } = await sb.from("custom_requests").select("id, status, artist_id, quote_amount, deposit_amount").eq("id", id).single();
  return data;
}

async function main() {
  console.log("=== Artist Requests — authorization + lifecycle verification ===");

  HEAD("Setup — creating tagged test rows");
  const base = {
    studio_id: STUDIO_ID,
    client_name: `${TAG} Client`,
    client_email: "qa-verify-artist-requests@test.internal",
    client_phone: "5550001111",
    design_description: "QA verification row — safe to delete",
    placement: "forearm",
    size: "medium",
    budget_range: "$200-400",
    preferred_dates: "Flexible",
  };

  const { data: rows, error: insertErr } = await sb.from("custom_requests").insert([
    { ...base, status: "pending",   artist_id: null },       // r1: unassigned pending
    { ...base, status: "pending",   artist_id: MARCUS_ID },   // r2: assigned to Marcus
    { ...base, status: "declined",  artist_id: JAMIE_ID },    // r3: terminal (declined)
    { ...base, status: "completed", artist_id: JAMIE_ID },    // r4: terminal (completed)
    { ...base, status: "pending",   artist_id: JAMIE_ID },    // r5: assigned to Jamie
    { ...base, status: "pending",   artist_id: MARCUS_ID },   // r6: assigned to Marcus (2nd, for decline isolation)
  ]).select("id, status, artist_id");

  if (insertErr || !rows || rows.length !== 6) {
    console.error("ABORT: could not create test rows —", insertErr?.message);
    process.exit(1);
  }
  const [r1, r2, r3, r4, r5, r6] = rows;
  console.log(`  Created ${rows.length} tagged rows (ids logged for cleanup):`);
  rows.forEach((r, i) => console.log(`   r${i + 1}: ${r.id}`));

  const rowIds = rows.map((r) => r.id);

  try {
    HEAD("Auth — building sessions for Jamie Chen and Marcus Lee (same studio)");
    const jamieCookies = await buildCookiesFor(JAMIE_MAIL);
    const marcusCookies = await buildCookiesFor(MARCUS_MAIL);
    console.log("  Sessions obtained for both artists.");

    const jamie = await makeRequestContext(jamieCookies);
    const marcus = await makeRequestContext(marcusCookies);

    try {
      // ── TEST 1: valid quote transition (unassigned → quoted, auto-assign) ──
      HEAD("TEST 1 — Jamie quotes an unassigned request (valid transition, two distinct amounts)");
      const res1 = await jamie.context.request.post(`/api/custom-requests/${r1.id}/quote`, {
        data: { quote_amount: 500, deposit_amount: 100, quote_message: "T5 verification" },
      });
      if (res1.status() === 200) {
        PASS(`POST quote → 200 (${res1.status()})`);
        const db1 = await getRow(r1.id);
        if (db1.status === "quoted" && db1.artist_id === JAMIE_ID && db1.quote_amount === 500 && db1.deposit_amount === 100) {
          PASS("DB: status=quoted, artist_id auto-assigned to Jamie, quote_amount=500, deposit_amount=100 (distinct values accepted — QuoteForm bug fix confirmed at API level)");
        } else {
          FAIL(`DB mismatch: ${JSON.stringify(db1)}`);
        }
      } else {
        FAIL(`Expected 200, got ${res1.status()}: ${await res1.text()}`);
      }

      // ── TEST 2: SECURITY FIX — Jamie cannot quote Marcus's assigned request ──
      HEAD("TEST 2 — Jamie attempts to quote a request assigned to Marcus (must be blocked)");
      const res2 = await jamie.context.request.post(`/api/custom-requests/${r2.id}/quote`, {
        data: { quote_amount: 300, deposit_amount: 50 },
      });
      if (res2.status() === 403) {
        PASS(`Blocked with 403 as expected — cross-artist quote isolation fix verified`);
      } else {
        FAIL(`Expected 403, got ${res2.status()}: ${await res2.text()}`);
      }
      const db2AfterJamie = await getRow(r2.id);
      if (db2AfterJamie.status === "pending") PASS("DB unchanged after blocked attempt (status still pending)");
      else FAIL(`DB should be unaffected by blocked attempt, got status=${db2AfterJamie.status}`);

      // ── TEST 3: Marcus (the assignee) CAN quote his own assigned request ──
      HEAD("TEST 3 — Marcus quotes his own assigned request (valid — same fix, correct side)");
      const res3 = await marcus.context.request.post(`/api/custom-requests/${r2.id}/quote`, {
        data: { quote_amount: 300, deposit_amount: 50 },
      });
      if (res3.status() === 200) {
        PASS(`POST quote → 200 (${res3.status()})`);
        const db3 = await getRow(r2.id);
        if (db3.status === "quoted" && db3.artist_id === MARCUS_ID) PASS("DB: status=quoted, artist_id remains Marcus");
        else FAIL(`DB mismatch: ${JSON.stringify(db3)}`);
      } else {
        FAIL(`Expected 200, got ${res3.status()}: ${await res3.text()}`);
      }

      // ── TEST 4: terminal state — declined request cannot be declined again ──
      HEAD("TEST 4 — Jamie attempts to decline an already-declined request (terminal state guard)");
      const res4 = await jamie.context.request.post(`/api/custom-requests/${r3.id}/decline`, {
        data: { declined_reason: "should not apply" },
      });
      if (res4.status() === 409) PASS(`Blocked with 409 — terminal 'declined' state protected`);
      else FAIL(`Expected 409, got ${res4.status()}: ${await res4.text()}`);

      // ── TEST 5: terminal state — completed request cannot be quoted ──
      HEAD("TEST 5 — Jamie attempts to quote a completed request (terminal state guard)");
      const res5 = await jamie.context.request.post(`/api/custom-requests/${r4.id}/quote`, {
        data: { quote_amount: 200, deposit_amount: 50 },
      });
      if (res5.status() === 409) PASS(`Blocked with 409 — terminal 'completed' state protected`);
      else FAIL(`Expected 409, got ${res5.status()}: ${await res5.text()}`);

      // ── TEST 6: valid decline transition (assigned to self, pending) ──
      HEAD("TEST 6 — Jamie declines his own assigned pending request (valid transition)");
      const res6 = await jamie.context.request.post(`/api/custom-requests/${r5.id}/decline`, {
        data: { declined_reason: "T5 verification decline" },
      });
      if (res6.status() === 200) {
        PASS(`POST decline → 200`);
        const db6 = await getRow(r5.id);
        if (db6.status === "declined") PASS("DB: status=declined");
        else FAIL(`DB mismatch: ${JSON.stringify(db6)}`);
      } else {
        FAIL(`Expected 200, got ${res6.status()}: ${await res6.text()}`);
      }

      // ── TEST 7: SECURITY FIX — decline isolation (Jamie cannot decline Marcus's request) ──
      HEAD("TEST 7 — Jamie attempts to decline a request assigned to Marcus (must be blocked)");
      const res7 = await jamie.context.request.post(`/api/custom-requests/${r6.id}/decline`, {
        data: { declined_reason: "should not apply" },
      });
      if (res7.status() === 403) PASS(`Blocked with 403 as expected — cross-artist decline isolation fix verified`);
      else FAIL(`Expected 403, got ${res7.status()}: ${await res7.text()}`);
      const db7 = await getRow(r6.id);
      if (db7.status === "pending") PASS("DB unchanged after blocked attempt (status still pending)");
      else FAIL(`DB should be unaffected, got status=${db7.status}`);

      // ── TEST 8: Owner-only action inaccessible to artists ──
      HEAD("TEST 8 — Jamie (artist) attempts the owner-only /schedule action");
      const res8 = await jamie.context.request.patch(`/api/custom-requests/${r6.id}/schedule`, {
        data: { date: "2099-01-01", time: "10:00" },
      });
      if (res8.status() === 403) PASS(`Blocked with 403 — schedule route remains owner-only`);
      else FAIL(`Expected 403, got ${res8.status()}: ${await res8.text()}`);

      // ── TEST 9: refresh persistence — re-fetch reflects the same DB state ──
      HEAD("TEST 9 — Refresh persistence (state read back matches what was written)");
      const finalR1 = await getRow(r1.id);
      const finalR5 = await getRow(r5.id);
      if (finalR1.status === "quoted" && finalR5.status === "declined") {
        PASS("Re-read from DB matches expected post-transition state for r1 and r5 (persists across requests, not just in-memory)");
      } else {
        FAIL(`Persistence mismatch: r1=${finalR1.status}, r5=${finalR5.status}`);
      }
    } finally {
      await jamie.browser.close();
      await marcus.browser.close();
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
