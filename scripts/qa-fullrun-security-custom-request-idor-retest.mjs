/**
 * Full ground-up QA re-run (2026-08-29) — Job D continuation retest.
 *
 * Retests the fix for a real cross-tenant IDOR found by code audit in
 * app/book/[studio]/custom/actions.ts submitCustomRequest(): the caller-
 * supplied `artistId` on the public/anonymous Custom Request form was used
 * WITHOUT verifying it belonged to the studio being submitted to. A forged
 * request (studioId=Studio A, artistId=Studio B's real artist) would:
 *   (a) write a cross-tenant custom_requests.artist_id (Studio A's request
 *       row pointing at Studio B's artist), and
 *   (b) email that unrelated Studio B artist the client's real PII
 *       (name/phone/email/tattoo description) via
 *       sendCustomRequestReceivedEmail().
 *
 * The legit form always renders <option> values sourced from the studio's
 * OWN artists prop, so a real user can never naturally select a foreign
 * artistId — this simulates a client tampering with the DOM/request (the
 * realistic attack surface for a server action, which trusts whatever the
 * client sends), matching how a real attacker would exploit this.
 *
 * Fix (already applied, uncommitted, in app/book/[studio]/custom/actions.ts):
 * validates artistId against studioId via .eq("studio_id", studioId) before
 * using it for either the insert or the notification lookup; an unverified/
 * foreign artistId is silently treated as "no preferred artist" (same as
 * leaving the field blank), not a hard rejection — matches the existing
 * "Any Artist" fallback UX already used elsewhere.
 *
 * MUST run against local dev (fix is uncommitted, not deployed to prod):
 *   QA_BASE_URL=http://localhost:3311 node scripts/qa-fullrun-security-custom-request-idor-retest.mjs
 *
 * Self-cleaning: deletes the victim studio/artist and the created
 * custom_requests row at the end regardless of outcome.
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
const BASE_URL = process.env.QA_BASE_URL ?? "http://localhost:3311";
const TAG = "QA-SEC-CUSTOMREQ-IDOR-RETEST-20260829";
const stamp = Date.now();

if (!BASE_URL.includes("localhost")) {
  console.error("Refusing to run — this retests an UNCOMMITTED fix, it must target localhost, not production.");
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

// 2026-08-30 reconciliation note: this script originally read the shared
// QA studio from qa-manifests/fullqa-20260829-studio.json. That studio was
// fully deleted during the prior session's final cleanup (Phase 6), so this
// retest now seeds its own throwaway TARGET studio (the one the form is
// submitted TO) here, mirroring the victim-studio pattern below, instead of
// depending on external state that may no longer exist.
const PASSWORD = "QaSecRetest2026!";

let targetStudioId = null;
let targetArtistId = null;
let targetOwnerAuthId = null;
let victimStudioId = null;
let victimArtistId = null;
let victimOwnerAuthId = null;
let createdRequestId = null;

async function cleanup() {
  if (createdRequestId) await sb.from("custom_requests").delete().eq("id", createdRequestId);
  if (victimStudioId) {
    await sb.from("artists").delete().eq("studio_id", victimStudioId);
    await sb.from("studios").delete().eq("id", victimStudioId);
  }
  if (targetStudioId) {
    await sb.from("artists").delete().eq("studio_id", targetStudioId);
    await sb.from("studios").delete().eq("id", targetStudioId);
  }
  if (victimOwnerAuthId) await sb.auth.admin.deleteUser(victimOwnerAuthId).catch(() => {});
  if (targetOwnerAuthId) await sb.auth.admin.deleteUser(targetOwnerAuthId).catch(() => {});
  console.log("Cleanup complete.");
}

let targetStudio;

try {
  // ── Seed a throwaway TARGET studio + artist (the one the form is submitted TO) ──
  const targetOwnerEmail = `qa-sec-customreq-target-owner-${stamp}@inkbook-qa.test`;
  const { data: targetOwnerUser, error: touErr } = await sb.auth.admin.createUser({
    email: targetOwnerEmail, email_confirm: true, password: PASSWORD,
  });
  if (touErr) throw new Error("target owner createUser failed: " + touErr.message);
  targetOwnerAuthId = targetOwnerUser.user.id;

  const { data: targetStudioRow, error: tsErr } = await sb.from("studios").insert({
    name: `[${TAG}] Target Studio`, subdomain: `qa-sec-customreq-target-${stamp}`,
    owner_id: targetOwnerAuthId,
    plan: "solo",
  }).select().single();
  if (tsErr) throw new Error("target studio insert failed: " + tsErr.message);
  targetStudioId = targetStudioRow.id;
  targetStudio = targetStudioRow;

  const { data: targetArtistRow, error: taErr } = await sb.from("artists").insert({
    studio_id: targetStudioId, name: `[${TAG}] Target Studio's Own Artist`,
    email: `qa-sec-customreq-target-artist-${stamp}@inkbook-qa.test`,
  }).select().single();
  if (taErr) throw new Error("target artist insert failed: " + taErr.message);
  targetArtistId = targetArtistRow.id;

  // ── Seed a throwaway victim studio + artist (the foreign target) ────────
  const victimOwnerEmail = `qa-sec-customreq-victim-owner-${stamp}@inkbook-qa.test`;
  const { data: victimOwnerUser, error: vouErr } = await sb.auth.admin.createUser({
    email: victimOwnerEmail, email_confirm: true, password: PASSWORD,
  });
  if (vouErr) throw new Error("victim owner createUser failed: " + vouErr.message);
  victimOwnerAuthId = victimOwnerUser.user.id;

  const { data: victimStudio, error: vsErr } = await sb.from("studios").insert({
    name: `[${TAG}] Victim Studio`, subdomain: `qa-sec-customreq-victim-${stamp}`,
    owner_id: victimOwnerAuthId,
    plan: "solo",
  }).select().single();
  if (vsErr) throw new Error("victim studio insert failed: " + vsErr.message);
  victimStudioId = victimStudio.id;

  const canaryEmail = `qa-sec-customreq-victim-artist-${stamp}@inkbook-qa.test`;
  const { data: victimArtist, error: vaErr } = await sb.from("artists").insert({
    studio_id: victimStudioId, name: `[${TAG}] Victim Artist (CANARY)`, email: canaryEmail,
  }).select().single();
  if (vaErr) throw new Error("victim artist insert failed: " + vaErr.message);
  victimArtistId = victimArtist.id;

  console.log(`Victim studio ${victimStudioId}, victim artist ${victimArtistId} (${canaryEmail})`);

  // ── Drive the REAL custom-request form for the QA studio, then tamper
  //    with the artist <select> via DOM injection to point at the victim's
  //    artist id (simulating a client sending a forged studioId/artistId
  //    pair — the realistic attack surface for a server action) ──────────
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(`${BASE_URL}/book/${targetStudio.subdomain}/custom`, { waitUntil: "load" });

  await page.fill("#cr-client-name", "QA Security Retest Client");
  await page.fill("#cr-client-email", `qa-sec-customreq-client-${stamp}@inkbook-qa.test`);
  await page.fill("#cr-client-phone", "+15559998888");

  // Inject a foreign <option> into the artist <select> and select it —
  // the real form only ever renders the target studio's own artists, so
  // this specifically simulates a tampered/forged submission.
  await page.evaluate((victimId) => {
    const sel = document.querySelector("#cr-artist");
    const opt = document.createElement("option");
    opt.value = victimId;
    opt.textContent = "INJECTED-FOREIGN-ARTIST";
    sel.appendChild(opt);
    sel.value = victimId;
    sel.dispatchEvent(new Event("change", { bubbles: true }));
  }, victimArtistId);

  const selectedValue = await page.$eval("#cr-artist", (el) => el.value);
  console.log("Artist select value after injection:", selectedValue, "expected victim id:", victimArtistId);

  await page.getByRole("button", { name: /next/i }).click();

  // Step 2
  await page.selectOption("#cr-style", "Fine Line");
  await page.fill("#cr-placement", "Forearm");
  await page.selectOption("#cr-size", { index: 1 });
  await page.selectOption("#cr-budget", { index: 1 });
  await page.fill("#cr-description", "QA security retest — verifying the cross-tenant artistId fix on submitCustomRequest, min 20 chars.");
  await page.getByRole("button", { name: /next/i }).click();

  // Step 3 — submit
  await page.waitForTimeout(300);
  await page.getByRole("button", { name: /submit request/i }).click();
  await page.waitForTimeout(2500);

  const bodyText = await page.evaluate(() => document.body.innerText);
  const submitted = bodyText.includes("Request Submitted");
  console.log("Form submitted:", submitted, submitted ? "" : `body snippet: ${bodyText.slice(0, 200)}`);

  await browser.close();

  // ── Verify DB state ──────────────────────────────────────────────────
  const { data: rows } = await sb.from("custom_requests")
    .select("id, studio_id, artist_id, client_email")
    .eq("studio_id", targetStudio.id)
    .like("client_email", `qa-sec-customreq-client-${stamp}%`)
    .order("created_at", { ascending: false })
    .limit(1);
  const row = rows?.[0];
  if (row) createdRequestId = row.id;

  console.log("Created custom_requests row:", JSON.stringify(row));

  const notPoisoned = row && row.artist_id !== victimArtistId;
  console.log(`\nRESULT: artist_id correctly NOT set to victim artist = ${notPoisoned}`);
  console.log(notPoisoned
    ? "PASS — cross-tenant artistId was rejected and treated as null (Any Artist), matching the fix."
    : "FAIL — cross-tenant artistId was accepted and written — fix did not take effect.");

  process.exitCode = notPoisoned ? 0 : 1;
} catch (e) {
  console.error("Retest error:", e);
  process.exitCode = 1;
} finally {
  await cleanup();
}
