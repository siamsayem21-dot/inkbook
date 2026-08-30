/**
 * 2026-08-30 — P1 bug repro: artist invite acceptance hangs on
 * "Setting up your account..." with no success/redirect/error (Siam's
 * real production report).
 *
 * Reproduces the EXACT flow with full console + network instrumentation:
 * seed QA studio+owner via DB (matching real signup shape), send a real
 * artist_invites row (matching the real invite-sending action's shape),
 * load /artist/accept/[token], fill + submit exactly like a real user,
 * and capture every console message + network request/response during
 * submission so we can see exactly where it hangs.
 *
 * Self-cleaning except where the bug itself prevents cleanup (in which
 * case leftover state is reported, not silently discarded).
 *
 * Run with: QA_BASE_URL=https://www.inkbook.tech node scripts/qa-bugfix-artist-invite-repro.mjs
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
const BASE_URL = process.env.QA_BASE_URL ?? "https://www.inkbook.tech";
const TAG = "QA-BUGFIX-ARTISTINVITE-20260830";
const stamp = Date.now();
const PW = "QaBugfixInvite2026!";

const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

const created = { studios: [], auth: [], invites: [] };

try {
  console.log("\n=== SEED ===");
  const { data: ownerUser } = await sb.auth.admin.createUser({
    email: `${TAG.toLowerCase()}-owner-${stamp}@inkbook-qa.test`, email_confirm: true, password: PW,
  });
  created.auth.push(ownerUser.user.id);
  const { data: studio, error: studioErr } = await sb.from("studios").insert({
    name: `[${TAG}] Studio`, subdomain: `qa-bugfix-invite-${stamp}`, owner_id: ownerUser.user.id, plan: "studio",
  }).select().single();
  if (studioErr) throw new Error("studio insert failed: " + studioErr.message);
  created.studios.push(studio.id);
  console.log("Studio:", studio.id, studio.subdomain);

  // Matching the REAL inviteArtist() action's insert shape exactly
  // (app/(owner)/owner/artists/actions.ts) — token is DB-generated, not
  // client-supplied, per that action's own comment.
  const invitedEmail = `${TAG.toLowerCase()}-invitee-${stamp}@inkbook-qa.test`;
  const { data: invite, error: inviteErr } = await sb.from("artist_invites").insert({
    studio_id: studio.id,
    invited_email: invitedEmail,
    invited_name: "QA Invitee",
    invited_by: ownerUser.user.id,
    expires_at: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
  }).select("id, token").single();
  if (inviteErr) throw new Error("invite insert failed: " + inviteErr.message);
  created.invites.push(invite.id);
  const token = invite.token;
  console.log("Invite token (DB-generated):", token);
  console.log("Accept URL:", `${BASE_URL}/artist/accept/${token}`);

  console.log("\n=== VARIANT: owner already logged in, in the SAME browser, before opening the invite link ===");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Log in as the studio OWNER first (realistic: an owner who just sent
  // the invite and clicks their own link to "see what the artist sees",
  // in the same browser tab/session they're already using).
  await page.goto(`${BASE_URL}/login`, { waitUntil: "load" });
  await page.fill("#login-email", `${TAG.toLowerCase()}-owner-${stamp}@inkbook-qa.test`);
  await page.fill("#login-password", PW);
  await page.getByRole("button", { name: /sign in|log in|login/i }).click();
  await page.waitForTimeout(3000);
  console.log("After owner login, URL:", page.url());

  const consoleLogs = [];
  page.on("console", (msg) => consoleLogs.push(`[console.${msg.type()}] ${msg.text()}`));
  page.on("pageerror", (err) => consoleLogs.push(`[pageerror] ${err.message}\n${err.stack}`));

  const networkLog = [];
  page.on("request", (req) => {
    if (req.method() === "POST" || req.url().includes("accept") || req.url().includes("auth")) {
      networkLog.push(`>> ${req.method()} ${req.url()}`);
    }
  });
  page.on("response", async (res) => {
    const url = res.url();
    if (res.request().method() === "POST" || url.includes("accept") || url.includes("auth")) {
      let bodySnippet = "";
      try { bodySnippet = (await res.text()).slice(0, 300); } catch { /* ignore */ }
      networkLog.push(`<< ${res.status()} ${url} ${bodySnippet}`);
    }
  });
  page.on("requestfailed", (req) => {
    networkLog.push(`XX FAILED ${req.method()} ${req.url()} — ${req.failure()?.errorText}`);
  });

  await page.goto(`${BASE_URL}/artist/accept/${token}`, { waitUntil: "load" });
  console.log("Page loaded:", page.url());

  await page.fill("#accept-name", "QA Invitee Real Name");
  await page.fill("#accept-password", PW);
  await page.fill("#accept-confirm-password", PW);

  const submitStart = Date.now();
  await page.getByRole("button", { name: /join/i }).click();
  console.log("Submit clicked, waiting to observe behavior for up to 70s...");

  // Poll for either: redirect away from /artist/accept, a visible error, or timeout.
  let outcome = "TIMEOUT_NO_RESOLUTION";
  for (let i = 0; i < 35; i++) {
    await page.waitForTimeout(2000);
    const url = page.url();
    if (!url.includes("/artist/accept/")) { outcome = `REDIRECTED to ${url}`; break; }
    const bodyText = await page.evaluate(() => document.body.innerText).catch(() => "");
    if (/error|failed|invalid/i.test(bodyText) && !bodyText.includes("Setting up your account")) {
      outcome = `VISIBLE_ERROR: ${bodyText.slice(0, 300)}`;
      break;
    }
    const stillLoading = await page.evaluate(() =>
      document.body.innerText.includes("Setting up your account")
    ).catch(() => false);
    if (!stillLoading) { outcome = "BUTTON_NO_LONGER_LOADING_BUT_NO_REDIRECT"; break; }
  }
  const elapsedMs = Date.now() - submitStart;
  console.log(`\nOUTCOME after ${elapsedMs}ms: ${outcome}`);
  console.log("Final URL:", page.url());
  const finalBody = await page.evaluate(() => document.body.innerText).catch(() => "");
  console.log("Final body snippet:", finalBody.slice(0, 400));

  console.log("\n=== CONSOLE LOG (page) ===");
  consoleLogs.forEach((l) => console.log(l));

  console.log("\n=== NETWORK LOG (POST/accept/auth only) ===");
  networkLog.forEach((l) => console.log(l));

  await browser.close();

  console.log("\n=== DB STATE CHECK ===");
  const { data: authUsers } = await sb.auth.admin.listUsers({ perPage: 200 });
  const matchedUser = authUsers?.users?.find((u) => u.email === invitedEmail);
  console.log("Auth user created?", !!matchedUser, matchedUser ? { id: matchedUser.id, created_at: matchedUser.created_at } : null);

  const { data: artistRow } = await sb.from("artists").select("*").eq("studio_id", studio.id).eq("email", invitedEmail).maybeSingle();
  console.log("Artist row created?", !!artistRow, artistRow ? { id: artistRow.id, user_id: artistRow.user_id, is_active: artistRow.is_active } : null);

  const { data: inviteAfter } = await sb.from("artist_invites").select("accepted_at, artist_id").eq("token", token).single();
  console.log("Invite accepted_at:", inviteAfter?.accepted_at, "artist_id:", inviteAfter?.artist_id);

  if (matchedUser) created.auth.push(matchedUser.id);
} catch (e) {
  console.error("\nREPRO SCRIPT ERROR:", e);
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
