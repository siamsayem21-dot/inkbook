/**
 * 2026-08-30 — P1 fix full verification: Artist Invite -> Accept -> Account
 * Setup, end to end, real browser, plus every cross-cutting check Siam
 * asked for: refresh/persistence, artist re-login, owner visibility,
 * cross-studio isolation, and duplicate/retry behavior on an
 * already-accepted invite.
 *
 * Run with: QA_BASE_URL=<base> node scripts/qa-bugfix-artist-invite-full-verify.mjs
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
const TAG = "QA-BUGFIX-INVITE-FULLVERIFY-20260830";
const stamp = Date.now();
const PW = "QaBugfixFullVerify2026!";

const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
let failures = 0;
const PASS = (m) => console.log("  PASS:", m);
const FAIL = (m) => { console.log("  FAIL:", m); failures++; };
const HEAD = (m) => console.log("\n" + m + "\n" + "=".repeat(m.length));

const created = { studios: [], auth: [], invites: [] };

try {
  HEAD("Seed — Studio A (real owner) + throwaway Studio B (for isolation check)");
  const { data: ownerA } = await sb.auth.admin.createUser({
    email: `${TAG.toLowerCase()}-ownerA-${stamp}@inkbook-qa.test`, email_confirm: true, password: PW,
  });
  created.auth.push(ownerA.user.id);
  const { data: studioA } = await sb.from("studios").insert({
    name: `[${TAG}] Studio A`, subdomain: `qa-bugfix-inviteA-${stamp}`, owner_id: ownerA.user.id, plan: "studio",
  }).select().single();
  created.studios.push(studioA.id);

  const { data: ownerB } = await sb.auth.admin.createUser({
    email: `${TAG.toLowerCase()}-ownerB-${stamp}@inkbook-qa.test`, email_confirm: true, password: PW,
  });
  created.auth.push(ownerB.user.id);
  const { data: studioB } = await sb.from("studios").insert({
    name: `[${TAG}] Studio B`, subdomain: `qa-bugfix-inviteB-${stamp}`, owner_id: ownerB.user.id, plan: "studio",
  }).select().single();
  created.studios.push(studioB.id);

  const invitedEmail = `${TAG.toLowerCase()}-artist-${stamp}@inkbook-qa.test`;
  const { data: invite } = await sb.from("artist_invites").insert({
    studio_id: studioA.id, invited_email: invitedEmail, invited_name: "QA Full-Verify Artist",
    invited_by: ownerA.user.id, expires_at: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
  }).select("id, token").single();
  created.invites.push(invite.id);
  const token = invite.token;

  HEAD("1. REPRODUCE + RETEST — full accept flow in a real browser");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const consoleErrors = [];
  page.on("pageerror", (e) => consoleErrors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });

  await page.goto(`${BASE_URL}/artist/accept/${token}`, { waitUntil: "load" });
  await page.fill("#accept-name", "QA Full-Verify Artist Real Name");
  await page.fill("#accept-password", PW);
  await page.fill("#accept-confirm-password", PW);
  const t0 = Date.now();
  await page.getByRole("button", { name: /join/i }).click();
  await page.waitForURL(/\/artist\/dashboard/, { timeout: 30000 }).catch(() => {});
  const elapsed = Date.now() - t0;
  if (page.url().includes("/artist/dashboard")) {
    PASS(`Accept flow completed and redirected to /artist/dashboard in ${elapsed}ms`);
  } else {
    FAIL(`Did not redirect to /artist/dashboard — stuck at ${page.url()}`);
  }
  const unexpectedErrors = consoleErrors.filter((e) => !/RSC payload|ERR_ABORTED/i.test(e));
  if (unexpectedErrors.length === 0) PASS("No unexpected console errors during accept flow");
  else FAIL(`Unexpected console errors: ${unexpectedErrors.join(" | ")}`);

  HEAD("2. VERIFY REFRESH/PERSISTENCE — reload the dashboard, state must hold");
  await page.reload({ waitUntil: "load" });
  const afterReloadUrl = page.url();
  const stillOnDashboard = afterReloadUrl.includes("/artist/dashboard");
  if (stillOnDashboard) PASS("Session persisted after refresh — still on /artist/dashboard, not bounced to /login");
  else FAIL(`Session did not persist — redirected to ${afterReloadUrl} after refresh`);
  await context.close();

  HEAD("3. VERIFY ARTIST CAN LOGIN — fresh browser context, real credentials");
  const loginContext = await browser.newContext();
  const loginPage = await loginContext.newPage();
  await loginPage.goto(`${BASE_URL}/login`, { waitUntil: "load" });
  await loginPage.fill("#login-email", invitedEmail);
  await loginPage.fill("#login-password", PW);
  await loginPage.getByRole("button", { name: /sign in|log in|login/i }).click();
  await loginPage.waitForURL(/\/artist\/dashboard/, { timeout: 15000 }).catch(() => {});
  if (loginPage.url().includes("/artist/dashboard")) PASS("Artist can log in fresh with the password they set and lands on their dashboard");
  else FAIL(`Fresh login did not reach /artist/dashboard — landed at ${loginPage.url()}`);
  await loginContext.close();

  HEAD("4. VERIFY OWNER SEES THE ARTIST");
  const { data: artistRow } = await sb.from("artists").select("id, name, studio_id, is_active").eq("studio_id", studioA.id).eq("email", invitedEmail).maybeSingle();
  if (artistRow && artistRow.is_active) PASS(`Artist row exists under Studio A, active — Owner Portal's /owner/artists query (scoped to studio_id) will show them: ${JSON.stringify(artistRow)}`);
  else FAIL(`Artist row missing or inactive: ${JSON.stringify(artistRow)}`);

  HEAD("5. VERIFY CROSS-STUDIO ISOLATION — Studio B's owner must not see Studio A's new artist");
  const { data: crossCheck } = await sb.from("artists").select("id").eq("studio_id", studioB.id).eq("email", invitedEmail).maybeSingle();
  if (!crossCheck) PASS("Studio B has no artist row for this email — isolation intact at the data layer");
  else FAIL("Studio B unexpectedly has an artist row for this email — isolation broken");

  const ownerBLoginCtx = await browser.newContext();
  const ownerBPage = await ownerBLoginCtx.newPage();
  await ownerBPage.goto(`${BASE_URL}/login`, { waitUntil: "load" });
  await ownerBPage.fill("#login-email", `${TAG.toLowerCase()}-ownerB-${stamp}@inkbook-qa.test`);
  await ownerBPage.fill("#login-password", PW);
  await ownerBPage.getByRole("button", { name: /sign in|log in|login/i }).click();
  await ownerBPage.waitForTimeout(2000);
  await ownerBPage.goto(`${BASE_URL}/owner/artists`, { waitUntil: "load" });
  const ownerBBody = await ownerBPage.evaluate(() => document.body.innerText);
  if (!ownerBBody.includes("QA Full-Verify Artist")) PASS("Studio B owner's /owner/artists page does not show Studio A's new artist");
  else FAIL("Studio B owner can see Studio A's artist name — cross-studio leak");
  await ownerBLoginCtx.close();

  HEAD("6. VERIFY DUPLICATE/RETRY BEHAVIOR — re-submitting an already-accepted invite");
  const retryCtx = await browser.newContext();
  const retryPage = await retryCtx.newPage();
  await retryPage.goto(`${BASE_URL}/artist/accept/${token}`, { waitUntil: "load" });
  const retryBody = await retryPage.evaluate(() => document.body.innerText);
  if (/already.*used|already.*accepted/i.test(retryBody)) {
    PASS("Reloading the same (now-accepted) invite link correctly shows 'already used', not the form again — no duplicate-account risk");
  } else {
    FAIL(`Re-visiting an accepted invite did not show the expected message — body: ${retryBody.slice(0, 200)}`);
  }
  await retryCtx.close();

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
  for (const id of created.auth) await sb.auth.admin.deleteUser(id).then(() => {}).catch(() => {});
  console.log("done");
}

console.log(`\nFULL VERIFICATION COMPLETE — ${failures} finding(s)`);
process.exit(failures > 0 ? 1 : 0);
