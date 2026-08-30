/**
 * 2026-08-30 — UX fix verification: invite-accept page must detect
 * upfront whether the invited email already has an InkBook account and
 * show a different UI (no password fields for an existing account).
 *
 * Covers BOTH cases with real browser testing, checking the UI BEFORE
 * submission (not just the end result), plus the full cross-cutting
 * checklist: owner sees artist, artist login, refresh/persistence,
 * duplicate/retry, cross-studio isolation, and confirms the existing
 * account's real password is never touched.
 *
 * Run with: QA_BASE_URL=<base> node scripts/qa-invite-existing-account-ux-verify.mjs
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
const TAG = "QA-INVITE-EXISTINGUX-20260830";
const stamp = Date.now();
const OWNER_PW = "QaInviteUxOwner2026!";
const NEW_USER_PW = "QaInviteUxNewUser2026!";
const EXISTING_REAL_PW = "TheirRealExistingPassword789!";

const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
let failures = 0;
const PASS = (m) => console.log("  PASS:", m);
const FAIL = (m) => { console.log("  FAIL:", m); failures++; };
const HEAD = (m) => console.log("\n" + m + "\n" + "=".repeat(m.length));

const created = { studios: [], auth: [], invites: [] };

try {
  HEAD("Seed — Studio A + Studio B (isolation), + a pre-existing account for Case B");
  const { data: ownerA } = await sb.auth.admin.createUser({ email: `${TAG.toLowerCase()}-ownerA-${stamp}@inkbook-qa.test`, email_confirm: true, password: OWNER_PW });
  created.auth.push(ownerA.user.id);
  const { data: studioA } = await sb.from("studios").insert({
    name: `[${TAG}] Studio A (Siam Enterprise-style)`, subdomain: `qa-invite-ux-A-${stamp}`, owner_id: ownerA.user.id, plan: "studio",
  }).select().single();
  created.studios.push(studioA.id);

  const { data: ownerB } = await sb.auth.admin.createUser({ email: `${TAG.toLowerCase()}-ownerB-${stamp}@inkbook-qa.test`, email_confirm: true, password: OWNER_PW });
  created.auth.push(ownerB.user.id);
  const { data: studioB } = await sb.from("studios").insert({
    name: `[${TAG}] Studio B`, subdomain: `qa-invite-ux-B-${stamp}`, owner_id: ownerB.user.id, plan: "studio",
  }).select().single();
  created.studios.push(studioB.id);

  const newEmail = `${TAG.toLowerCase()}-newuser-${stamp}@inkbook-qa.test`;
  const existingEmail = `${TAG.toLowerCase()}-existinguser-${stamp}@inkbook-qa.test`;
  const { data: preExisting } = await sb.auth.admin.createUser({ email: existingEmail, email_confirm: true, password: EXISTING_REAL_PW });
  created.auth.push(preExisting.user.id);

  const { data: inviteNew } = await sb.from("artist_invites").insert({
    studio_id: studioA.id, invited_email: newEmail, invited_name: "QA New User",
    invited_by: ownerA.user.id, expires_at: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
  }).select("id, token").single();
  created.invites.push(inviteNew.id);

  const { data: inviteExisting } = await sb.from("artist_invites").insert({
    studio_id: studioA.id, invited_email: existingEmail, invited_name: "QA Existing User",
    invited_by: ownerA.user.id, expires_at: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
  }).select("id, token").single();
  created.invites.push(inviteExisting.id);

  const browser = await chromium.launch({ headless: true });

  // ============ CASE A: NEW USER ============
  HEAD("CASE A — completely new invited email");
  const caseAPage = await (await browser.newContext()).newPage();
  await caseAPage.goto(`${BASE_URL}/artist/accept/${inviteNew.token}`, { waitUntil: "load" });

  const caseABodyBefore = await caseAPage.evaluate(() => document.body.innerText);
  const caseAHasPasswordField = await caseAPage.$("#accept-password") !== null;
  const caseAHasBanner = /already have an InkBook account/i.test(caseABodyBefore);
  if (caseAHasPasswordField && !caseAHasBanner) PASS("BEFORE submission: password fields shown, no 'already have an account' banner — correct new-user UI");
  else FAIL(`BEFORE submission: unexpected UI — hasPasswordField=${caseAHasPasswordField}, hasBanner=${caseAHasBanner}`);

  await caseAPage.fill("#accept-name", "QA New User Real Name");
  await caseAPage.fill("#accept-password", NEW_USER_PW);
  await caseAPage.fill("#accept-confirm-password", NEW_USER_PW);
  await caseAPage.getByRole("button", { name: /join/i }).click();
  await caseAPage.waitForURL(/\/artist\/dashboard/, { timeout: 15000 }).catch(() => {});
  if (caseAPage.url().includes("/artist/dashboard")) PASS("New user: accept -> auto sign-in -> /artist/dashboard");
  else FAIL(`New user did not reach /artist/dashboard — at ${caseAPage.url()}`);

  const { data: newUserArtist } = await sb.from("artists").select("id, user_id, is_active").eq("studio_id", studioA.id).eq("email", newEmail).maybeSingle();
  if (newUserArtist?.is_active) PASS(`New user: artist row correctly created and active: ${JSON.stringify(newUserArtist)}`);
  else FAIL(`New user: artist row missing/inactive: ${JSON.stringify(newUserArtist)}`);

  // Refresh/persistence for Case A
  await caseAPage.reload({ waitUntil: "load" });
  if (caseAPage.url().includes("/artist/dashboard")) PASS("New user: session persists after refresh");
  else FAIL(`New user: session lost after refresh — at ${caseAPage.url()}`);

  // ============ CASE B: EXISTING ACCOUNT ============
  HEAD("CASE B — invited email that already has an InkBook account");
  const caseBPage = await (await browser.newContext()).newPage();
  await caseBPage.goto(`${BASE_URL}/artist/accept/${inviteExisting.token}`, { waitUntil: "load" });

  const caseBBodyBefore = await caseBPage.evaluate(() => document.body.innerText);
  const caseBHasPasswordField = await caseBPage.$("#accept-password") !== null;
  const caseBHasConfirmField = await caseBPage.$("#accept-confirm-password") !== null;
  const caseBHasBanner = /already have an InkBook account/i.test(caseBBodyBefore);
  const caseBHasForgotLink = /forgot password/i.test(caseBBodyBefore);
  const caseBHasAcceptButton = /accept invitation/i.test(caseBBodyBefore);

  if (!caseBHasPasswordField && !caseBHasConfirmField) PASS("BEFORE submission: no password/confirm fields shown for an existing account");
  else FAIL(`BEFORE submission: password fields incorrectly shown — password=${caseBHasPasswordField}, confirm=${caseBHasConfirmField}`);

  if (caseBHasBanner) PASS("BEFORE submission: clear 'you already have an account' explanation shown");
  else FAIL("BEFORE submission: explanation banner missing");

  if (caseBHasForgotLink) PASS("BEFORE submission: 'Forgot password?' path is present");
  else FAIL("BEFORE submission: no forgot-password path offered");

  if (caseBHasAcceptButton) PASS("BEFORE submission: button reads 'Accept Invitation' (not 'Join ... ->')");
  else FAIL("BEFORE submission: Accept Invitation button not found");

  await caseBPage.getByRole("button", { name: /accept invitation/i }).click();
  await caseBPage.waitForURL(/\/login/, { timeout: 15000 }).catch(() => {});
  if (caseBPage.url().includes("/login")) PASS(`Existing user: accept -> redirected to login (not auto-signed-in, since we never touched their real password) — at ${caseBPage.url()}`);
  else FAIL(`Existing user: unexpected redirect target ${caseBPage.url()}`);

  const { data: existingUserArtist } = await sb.from("artists").select("id, user_id, is_active").eq("studio_id", studioA.id).eq("email", existingEmail).maybeSingle();
  if (existingUserArtist?.user_id === preExisting.user.id && existingUserArtist.is_active) {
    PASS(`Existing user: artist row correctly linked to their PRE-EXISTING auth user id, active: ${JSON.stringify(existingUserArtist)}`);
  } else {
    FAIL(`Existing user: artist row not correctly linked: ${JSON.stringify(existingUserArtist)}`);
  }

  // Verify the real password was never touched — must still work exactly as before.
  const loginCtx = await browser.newContext();
  const loginPage = await loginCtx.newPage();
  await loginPage.goto(`${BASE_URL}/login`, { waitUntil: "load" });
  await loginPage.fill("#login-email", existingEmail);
  await loginPage.fill("#login-password", EXISTING_REAL_PW);
  await loginPage.getByRole("button", { name: /sign in|log in|login/i }).click();
  await loginPage.waitForURL(/\/artist\/dashboard/, { timeout: 15000 }).catch(() => {});
  if (loginPage.url().includes("/artist/dashboard")) PASS("Existing user's REAL pre-existing password still works and reaches /artist/dashboard — password was never touched");
  else FAIL(`Existing user's real password no longer works — at ${loginPage.url()}`);
  await loginCtx.close();

  // Duplicate/retry: re-visiting the now-accepted existing-account invite.
  const retryPage = await (await browser.newContext()).newPage();
  await retryPage.goto(`${BASE_URL}/artist/accept/${inviteExisting.token}`, { waitUntil: "load" });
  const retryBody = await retryPage.evaluate(() => document.body.innerText);
  if (/already.*used|already.*accepted/i.test(retryBody)) PASS("Duplicate/retry: re-visiting the accepted existing-account invite shows 'already used', not the form again");
  else FAIL(`Duplicate/retry: unexpected body — ${retryBody.slice(0, 200)}`);

  // Owner visibility for both.
  const ownerACtx = await browser.newContext();
  const ownerAPage = await ownerACtx.newPage();
  await ownerAPage.goto(`${BASE_URL}/login`, { waitUntil: "load" });
  await ownerAPage.fill("#login-email", `${TAG.toLowerCase()}-ownerA-${stamp}@inkbook-qa.test`);
  await ownerAPage.fill("#login-password", OWNER_PW);
  await ownerAPage.getByRole("button", { name: /sign in|log in|login/i }).click();
  await ownerAPage.waitForTimeout(2000);
  await ownerAPage.goto(`${BASE_URL}/owner/artists`, { waitUntil: "load" });
  const ownerABody = await ownerAPage.evaluate(() => document.body.innerText);
  if (ownerABody.includes("QA New User Real Name") && ownerABody.includes("QA Existing User")) {
    PASS("Owner sees BOTH the new-user artist and the existing-account artist on /owner/artists");
  } else {
    FAIL(`Owner does not see both artists — body snippet: ${ownerABody.slice(0, 400)}`);
  }
  await ownerACtx.close();

  // Cross-studio isolation: Studio B owner must not see Studio A's artists.
  const ownerBCtx = await browser.newContext();
  const ownerBPage = await ownerBCtx.newPage();
  await ownerBPage.goto(`${BASE_URL}/login`, { waitUntil: "load" });
  await ownerBPage.fill("#login-email", `${TAG.toLowerCase()}-ownerB-${stamp}@inkbook-qa.test`);
  await ownerBPage.fill("#login-password", OWNER_PW);
  await ownerBPage.getByRole("button", { name: /sign in|log in|login/i }).click();
  await ownerBPage.waitForTimeout(2000);
  await ownerBPage.goto(`${BASE_URL}/owner/artists`, { waitUntil: "load" });
  const ownerBBody = await ownerBPage.evaluate(() => document.body.innerText);
  if (!ownerBBody.includes("QA New User Real Name") && !ownerBBody.includes("QA Existing User")) {
    PASS("Cross-studio isolation: Studio B owner cannot see Studio A's artists");
  } else {
    FAIL("Cross-studio isolation BROKEN: Studio B owner can see Studio A's artist names");
  }
  await ownerBCtx.close();

  await browser.close();
} catch (e) {
  console.error("\nVERIFY SCRIPT ERROR:", e);
  failures++;
} finally {
  HEAD("Cleanup");
  for (const id of created.invites) await sb.from("artist_invites").delete().eq("id", id).then(() => {}).catch(() => {});
  for (const id of created.studios) {
    await sb.from("artists").delete().eq("studio_id", id).then(() => {}).catch(() => {});
    await sb.from("studios").delete().eq("id", id).then(() => {}).catch(() => {});
  }
  const { data: authUsers } = await sb.auth.admin.listUsers({ perPage: 200 });
  const qaUsers = (authUsers?.users ?? []).filter((u) => u.email?.includes(TAG.toLowerCase()));
  for (const u of qaUsers) await sb.auth.admin.deleteUser(u.id).then(() => {}).catch(() => {});
  console.log("done");
}

console.log(`\nUX VERIFICATION COMPLETE — ${failures} finding(s)`);
process.exit(failures > 0 ? 1 : 0);
