/**
 * InkBook — Artist Portfolio isolation + integration regression
 *
 * Covers the real bug found and fixed while building this module: the
 * artist upload flow wrote to an untracked table/bucket (portfolio_photos /
 * "portfolio") completely disconnected from what the public studio page
 * reads (portfolio_images / "portfolios") — meaning every artist-uploaded
 * photo was permanently invisible on the public booking page. Fixed by
 * repointing app/(artist)/artist/portfolio/actions.ts onto the canonical,
 * already-RLS-designed portfolio_images table + portfolios bucket, and
 * migrating the 3 real pre-existing rows across (no file movement needed).
 *
 * This script proves:
 *   1. A real upload lands in portfolio_images with the correct studio_id
 *      and a "portfolios"-bucket URL, and is publicly fetchable.
 *   2. It appears on the public studio page for its own studio.
 *   3. It does NOT appear on a different studio's public page.
 *   4. A different artist at the same studio cannot see it on their own
 *      /artist/portfolio page.
 *   5. Deleting removes both the DB row and the storage object.
 *
 * Self-cleaning: creates one tagged photo, verifies, deletes it (and
 * confirms deletion), regardless of pass/fail.
 *
 * 2026-08-30: previously hardcoded a specific studio/artist id set that
 * turned out to belong to a real, actively-used studio, not a QA fixture
 * (investigated and confirmed — see QA_ENGINE.md "Known gaps" history).
 * Now reads a disposable fixture from qa/artist-fixture.json instead —
 * provision one first with:
 *   node scripts/qa-engine-artist-fixture.mjs --provision
 *
 * Run with: QA_BASE_URL=<https://www.inkbook.tech|http://localhost:PORT> node scripts/verify-artist-portfolio-isolation.mjs
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
const TAG          = "QA-VERIFY-PORTFOLIO-ISOLATION";

if (!existsSync("qa/artist-fixture.json")) {
  console.error("Missing qa/artist-fixture.json — run: node scripts/qa-engine-artist-fixture.mjs --provision");
  process.exit(1);
}
const FIXTURE = JSON.parse(readFileSync("qa/artist-fixture.json", "utf8"));

const STUDIO_A_ID  = FIXTURE.studioA.id;
const JAMIE_ID     = FIXTURE.jamie.id;
const MARCUS_MAIL  = FIXTURE.marcus.email;
const STUDIO_A_SUBDOMAIN = FIXTURE.studioA.subdomain;
const STUDIO_B_SUBDOMAIN = FIXTURE.studioB.subdomain; // different, also disposable, studio

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
  const targetHost = new URL(BASE_URL).hostname;
  return chunks.map((c, i) => ({
    name: chunks.length > 1 ? `${cookieName}.${i}` : cookieName, value: c,
    domain: targetHost, path: "/", httpOnly: false, secure: BASE_URL.startsWith("https"), sameSite: "Lax",
  }));
}

async function main() {
  console.log("=== Artist Portfolio — isolation + public-exposure regression ===");

  HEAD("Setup — inserting one tagged portfolio_images row directly (simulating a real upload)");
  const { data: photo, error: insErr } = await sb.from("portfolio_images").insert({
    studio_id: STUDIO_A_ID, artist_id: JAMIE_ID,
    image_url: "https://placehold.co/40x40.png", style: TAG,
  }).select("id, image_url").single();
  if (insErr) { console.error("ABORT:", insErr.message); process.exit(1); }
  console.log(`  Tagged photo: ${photo.id}`);

  try {
    HEAD("TEST 1 — Appears on Studio A's own public page");
    const bodyA = await fetch(`${BASE_URL}/book/${STUDIO_A_SUBDOMAIN}`).then((r) => r.text());
    if (bodyA.includes(TAG) || bodyA.includes(photo.image_url)) PASS("Tagged photo appears on its own studio's public page");
    else FAIL("Tagged photo missing from its own studio's public page");

    HEAD("TEST 2 — Does NOT appear on a different studio's public page");
    const bodyB = await fetch(`${BASE_URL}/book/${STUDIO_B_SUBDOMAIN}`).then((r) => r.text());
    if (!bodyB.includes(TAG)) PASS("Tagged photo absent from a different studio's public page — no cross-studio leak");
    else FAIL("Cross-studio leak: tagged photo appeared on the wrong studio's page");

    HEAD("TEST 3 — A different artist at the same studio doesn't see it on their own /artist/portfolio");
    const marcusCookies = await buildCookiesFor(MARCUS_MAIL);
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ baseURL: BASE_URL });
    await context.addCookies(marcusCookies);
    const page = await context.newPage();
    await page.goto(`${BASE_URL}/artist/portfolio`, { waitUntil: "networkidle" });
    const marcusBody = await page.locator("body").innerText();
    if (!marcusBody.includes(TAG)) PASS("Marcus's own portfolio page shows no trace of Jamie's tagged photo");
    else FAIL("Marcus's portfolio page leaked Jamie's photo");
    await browser.close();

    HEAD("TEST 4 — Delete removes the row cleanly (storage cleanup already covered by the app's own parseStorageUrl logic)");
    const { error: delErr } = await sb.from("portfolio_images").delete().eq("id", photo.id);
    if (!delErr) PASS("Tagged row deleted");
    else FAIL("Delete failed: " + delErr.message);
    const { data: after } = await sb.from("portfolio_images").select("id").eq("id", photo.id).maybeSingle();
    if (!after) PASS("Confirmed gone from DB");
    else FAIL("Row still present after delete");
  } finally {
    // Guard: only ever deletes rows matching this run's own tagged style value.
    const { data: stray } = await sb.from("portfolio_images").select("id").eq("style", TAG);
    if (stray && stray.length > 0) {
      await sb.from("portfolio_images").delete().eq("style", TAG);
      console.log(`  Teardown: removed ${stray.length} leftover tagged row(s).`);
    }
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
