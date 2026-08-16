/**
 * InkBook — Artist Messages isolation verification
 *
 * Proves server-side, against the real local dev server and real injected
 * sessions, that:
 *   1. The owning artist can access their own assigned thread (list + detail).
 *   2. A different artist at the SAME studio cannot access a thread assigned
 *      to a colleague — no studio-wide fallback exists in messaging (unlike
 *      the bug this session already found and fixed in Artist Requests).
 *   3. An artist at a COMPLETELY DIFFERENT studio cannot access it at all.
 *   4. Direct URL access cannot bypass authorization in either case (404,
 *      zero message content leaked).
 *   5. The Owner of the thread's own studio CAN see it regardless of which
 *      artist it's assigned to (Owner has no assignment restriction, by design).
 *
 * Self-cleaning: creates one tagged client_account + message_thread + message
 * at a real studio, drives real HTTP requests with real injected sessions for
 * three roles (assigned artist, same-studio colleague, different-studio
 * outsider), then deletes everything it made.
 *
 * Requires: local dev server running on http://localhost:3001
 * Run with: node scripts/verify-artist-messages-isolation.mjs
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
const TAG          = "QA-VERIFY-ARTIST-MESSAGES-T7";

// Studio A: Jamie Chen's studio (owned by mohammadsiam21@gmail.com, who is
// also separately registered there as an artist named "Siam").
const STUDIO_A_ID  = "bb0c648e-4f18-4e48-8581-6b7cfd585eea";
const JAMIE_ID     = "78f9b22a-3b69-46d0-8bdf-773ec4e1f46b";
const JAMIE_MAIL   = "jamie.chen@inkbook-demo.test";
const MARCUS_MAIL  = "marcus.lee@inkbook-demo.test";
const OWNER_MAIL   = "mohammadsiam21@gmail.com";

// Studio B: a completely different studio/artist.
const OUTSIDER_MAIL = "testartist@inkbook.tech";

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
  const refresh_token = hashParams.get("refresh_token");
  if (!refresh_token) throw new Error(`Could not extract tokens for ${email}. URL: ${capturedUrl.slice(0, 200)}`);

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

async function makeContext(cookies) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ baseURL: BASE_URL });
  await context.addCookies(cookies);
  return { browser, context };
}

async function main() {
  console.log("=== Artist Messages — isolation verification ===");

  HEAD("Setup — creating a tagged test client account + thread assigned to Jamie");
  const testEmail = `qa-verify-messages-t7-${Date.now()}@test.internal`;
  const { data: userRes, error: userErr } = await sb.auth.admin.createUser({
    email: testEmail, password: "QaVerifyMessagesT720260817!", email_confirm: true,
  });
  if (userErr) { console.error("ABORT:", userErr.message); process.exit(1); }
  const clientUserId = userRes.user.id;

  const { data: clientAccount, error: caErr } = await sb.from("client_accounts").insert({
    user_id: clientUserId, email: testEmail,
  }).select("id").single();
  if (caErr) { console.error("ABORT:", caErr.message); await sb.auth.admin.deleteUser(clientUserId); process.exit(1); }

  const { data: thread, error: threadErr } = await sb.from("message_threads").insert({
    studio_id: STUDIO_A_ID, client_account_id: clientAccount.id, consultation_id: null, artist_id: JAMIE_ID,
  }).select("id").single();
  if (threadErr) { console.error("ABORT:", threadErr.message); process.exit(1); }

  const { error: msgErr } = await sb.from("messages").insert({
    thread_id: thread.id, sender_role: "client", sender_client_account_id: clientAccount.id,
    content: `${TAG} — private message, must not leak to unauthorized viewers`,
  });
  if (msgErr) { console.error("ABORT:", msgErr.message); process.exit(1); }

  console.log(`  Test thread: ${thread.id} (Studio A, assigned to Jamie)`);

  try {
    HEAD("Auth — building sessions for Jamie (owner), Marcus (same-studio colleague), an outsider (different studio), and the studio Owner");
    const jamieCookies = await buildCookiesFor(JAMIE_MAIL);
    const marcusCookies = await buildCookiesFor(MARCUS_MAIL);
    const outsiderCookies = await buildCookiesFor(OUTSIDER_MAIL);
    const ownerCookies = await buildCookiesFor(OWNER_MAIL);
    console.log("  Sessions obtained for all four.");

    const jamie = await makeContext(jamieCookies);
    const marcus = await makeContext(marcusCookies);
    const outsider = await makeContext(outsiderCookies);
    const owner = await makeContext(ownerCookies);

    try {
      // ── TEST 1: assigned artist can see it on the list + open the detail page ──
      HEAD("TEST 1 — Jamie (the assigned artist) can see the thread on his list and open it");
      const p1 = await jamie.context.newPage();
      await p1.goto(`${BASE_URL}/artist/messages`, { waitUntil: "networkidle" });
      const listBody = await p1.locator("body").innerText();
      if (listBody.includes(testEmail)) PASS("Thread appears on Jamie's list (by client account email, no linked project)");
      else FAIL("Thread missing from Jamie's list");

      const res1 = await p1.goto(`${BASE_URL}/artist/messages/${thread.id}`, { waitUntil: "networkidle" });
      const detailBody = await p1.locator("body").innerText();
      if (res1.ok() && detailBody.includes(TAG)) PASS(`Jamie can open the thread detail and see the message (status ${res1.status()})`);
      else FAIL(`Expected Jamie to see the thread. status=${res1.status()}, contains tag=${detailBody.includes(TAG)}`);
      await p1.close();

      // ── TEST 2: same-studio colleague cannot access it ──
      HEAD("TEST 2 — Marcus (same studio, different artist) cannot open Jamie's assigned thread via direct URL");
      const p2 = await marcus.context.newPage();
      const res2 = await p2.goto(`${BASE_URL}/artist/messages/${thread.id}`, { waitUntil: "networkidle" });
      const body2 = await p2.locator("body").innerText();
      if (res2.status() === 404 && !body2.includes(TAG)) PASS(`Blocked — 404, no message content leaked`);
      else FAIL(`Expected 404 with no content, got status=${res2.status()}, leaked=${body2.includes(TAG)}`);
      await p2.close();

      const p2list = await marcus.context.newPage();
      await p2list.goto(`${BASE_URL}/artist/messages`, { waitUntil: "networkidle" });
      const list2Body = await p2list.locator("body").innerText();
      if (!list2Body.includes(testEmail)) PASS("Marcus's own list page does not contain the tagged client's thread");
      else FAIL("Marcus's list page leaked the other artist's thread");
      await p2list.close();

      // ── TEST 3: different-studio outsider cannot access it at all ──
      HEAD("TEST 3 — Outsider (different studio) cannot open the thread via direct URL");
      const p3 = await outsider.context.newPage();
      const res3 = await p3.goto(`${BASE_URL}/artist/messages/${thread.id}`, { waitUntil: "networkidle" });
      const body3 = await p3.locator("body").innerText();
      if (res3.status() === 404 && !body3.includes(TAG)) PASS(`Blocked — 404, no message content leaked`);
      else FAIL(`Expected 404 with no content, got status=${res3.status()}, leaked=${body3.includes(TAG)}`);
      await p3.close();

      // ── TEST 4: malformed thread ID also cannot bypass (regression against the same class of gap) ──
      HEAD("TEST 4 — Malformed thread ID cannot bypass authorization for any caller");
      const p4 = await outsider.context.newPage();
      const res4 = await p4.goto(`${BASE_URL}/artist/messages/not-a-real-uuid`, { waitUntil: "networkidle" });
      if (res4.status() === 404) PASS(`Malformed ID correctly 404s, no server error (status ${res4.status()})`);
      else FAIL(`Expected 404, got ${res4.status()}`);
      await p4.close();

      // ── TEST 5: Owner CAN see it regardless of which artist it's assigned to ──
      HEAD("TEST 5 — The studio Owner can see the thread regardless of artist assignment");
      const p5 = await owner.context.newPage();
      const res5 = await p5.goto(`${BASE_URL}/owner/messages/${thread.id}`, { waitUntil: "networkidle" });
      const body5 = await p5.locator("body").innerText();
      if (res5.ok() && body5.includes(TAG)) PASS(`Owner can open the thread and see the message (status ${res5.status()})`);
      else FAIL(`Expected Owner to see the thread. status=${res5.status()}, contains tag=${body5.includes(TAG)}`);
      await p5.close();
    } finally {
      await jamie.browser.close();
      await marcus.browser.close();
      await outsider.browser.close();
      await owner.browser.close();
    }
  } finally {
    HEAD("Teardown");
    await sb.from("message_threads").delete().eq("id", thread.id); // cascades messages
    await sb.from("client_accounts").delete().eq("id", clientAccount.id);
    await sb.auth.admin.deleteUser(clientUserId);
    console.log("  Deleted test thread (+ cascaded messages), client_account, and auth user.");
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
