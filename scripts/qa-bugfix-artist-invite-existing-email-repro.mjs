/**
 * 2026-08-30 — targeted repro matching Siam's REAL scenario, discovered by
 * inspecting production data (read-only): the invited email already had an
 * auth account from weeks earlier (unrelated to this studio, no existing
 * artist row anywhere), so acceptInvite() takes the "email_exists" branch
 * — a code path not covered by the earlier general repro attempts.
 *
 * Run with: QA_BASE_URL=<base> node scripts/qa-bugfix-artist-invite-existing-email-repro.mjs
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
const TAG = "QA-BUGFIX-EXISTINGEMAIL-20260830";
const stamp = Date.now();
const PW = "QaBugfixExisting2026!";
const EXISTING_PW = "SomePreExistingPassword123!";

const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const created = { studios: [], auth: [], invites: [] };

try {
  console.log("\n=== SEED: pre-existing auth user with NO artist row anywhere (matches Siam's real scenario) ===");
  const preExistingEmail = `${TAG.toLowerCase()}-preexisting-${stamp}@inkbook-qa.test`;
  const { data: preExistingUser, error: preErr } = await sb.auth.admin.createUser({
    email: preExistingEmail, email_confirm: true, password: EXISTING_PW,
  });
  if (preErr) throw new Error("pre-existing user creation failed: " + preErr.message);
  created.auth.push(preExistingUser.user.id);
  console.log("Pre-existing auth user:", preExistingUser.user.id, "(created weeks ago in the real scenario, just now here)");

  const { data: ownerUser } = await sb.auth.admin.createUser({
    email: `${TAG.toLowerCase()}-owner-${stamp}@inkbook-qa.test`, email_confirm: true, password: PW,
  });
  created.auth.push(ownerUser.user.id);
  const { data: studio, error: studioErr } = await sb.from("studios").insert({
    name: `[${TAG}] Studio`, subdomain: `qa-bugfix-existingemail-${stamp}`, owner_id: ownerUser.user.id, plan: "studio",
  }).select().single();
  if (studioErr) throw new Error("studio insert failed: " + studioErr.message);
  created.studios.push(studio.id);

  const { data: invite, error: inviteErr } = await sb.from("artist_invites").insert({
    studio_id: studio.id, invited_email: preExistingEmail, invited_name: "QA Existing-Email Invitee",
    invited_by: ownerUser.user.id, expires_at: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
  }).select("id, token").single();
  if (inviteErr) throw new Error("invite insert failed: " + inviteErr.message);
  created.invites.push(invite.id);
  const token = invite.token;
  console.log("Invite for the pre-existing email, token:", token);
  console.log("Accept URL:", `${BASE_URL}/artist/accept/${token}`);

  console.log("\n=== REPRODUCE ===");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const consoleLogs = [];
  page.on("console", (m) => consoleLogs.push(`[${m.type()}] ${m.text()}`));
  page.on("pageerror", (e) => consoleLogs.push(`[pageerror] ${e.message}`));
  const netLog = [];
  page.on("response", async (res) => {
    if (res.request().method() === "POST") {
      let body = "";
      try { body = (await res.text()).slice(0, 400); } catch { /* ignore */ }
      netLog.push(`<< ${res.status()} ${res.url()} ${body}`);
    }
  });
  page.on("requestfailed", (req) => netLog.push(`XX FAILED ${req.url()} — ${req.failure()?.errorText}`));

  await page.goto(`${BASE_URL}/artist/accept/${token}`, { waitUntil: "load" });
  // On the accept form, the person setting a NEW password for what they may
  // not realize is an already-existing account (they typically won't know
  // their old password from weeks ago) — this is the realistic real-world
  // input: whatever password they type into the invite form.
  await page.fill("#accept-name", "Print Hut Bd (QA repro)");
  await page.fill("#accept-password", PW);
  await page.fill("#accept-confirm-password", PW);

  const t0 = Date.now();
  await page.getByRole("button", { name: /join/i }).click();
  console.log("Submitted, observing for up to 70s...");

  let outcome = "TIMEOUT_NO_RESOLUTION";
  for (let i = 0; i < 35; i++) {
    await page.waitForTimeout(2000);
    const url = page.url();
    if (!url.includes("/artist/accept/")) { outcome = `REDIRECTED to ${url}`; break; }
    const bodyText = await page.evaluate(() => document.body.innerText).catch(() => "");
    const stillLoading = bodyText.includes("Setting up your account");
    if (!stillLoading) { outcome = `NO_LONGER_LOADING — body: ${bodyText.slice(0, 300)}`; break; }
  }
  console.log(`\nOUTCOME after ${Date.now() - t0}ms: ${outcome}`);
  console.log("Final URL:", page.url());

  console.log("\n=== CONSOLE ===");
  consoleLogs.forEach((l) => console.log(l));
  console.log("\n=== NETWORK (POST only) ===");
  netLog.forEach((l) => console.log(l));

  await browser.close();

  console.log("\n=== DB STATE ===");
  const { data: artistRow } = await sb.from("artists").select("*").eq("studio_id", studio.id).eq("email", preExistingEmail).maybeSingle();
  console.log("Artist row created?", !!artistRow, artistRow);
  const { data: inviteAfter } = await sb.from("artist_invites").select("accepted_at, artist_id").eq("token", token).single();
  console.log("Invite accepted_at:", inviteAfter?.accepted_at, "artist_id:", inviteAfter?.artist_id);
} catch (e) {
  console.error("\nSCRIPT ERROR:", e);
} finally {
  console.log("\n=== CLEANUP ===");
  for (const id of created.invites) await sb.from("artist_invites").delete().eq("id", id).then(() => {}).catch(() => {});
  for (const id of created.studios) {
    await sb.from("artists").delete().eq("studio_id", id).then(() => {}).catch(() => {});
    await sb.from("studios").delete().eq("id", id).then(() => {}).catch(() => {});
  }
  for (const id of [...new Set(created.auth)]) await sb.auth.admin.deleteUser(id).then(() => {}).catch(() => {});
  console.log("done");
}
