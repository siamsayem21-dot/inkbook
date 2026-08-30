/**
 * 2026-08-30 — completes the loop for the "email already exists" scenario:
 * after acceptInvite() links the artist role to a pre-existing account
 * (verified working in qa-bugfix-artist-invite-existing-email-repro.mjs),
 * confirm that account's ACTUAL (pre-existing) password still logs them
 * into their new artist dashboard correctly.
 *
 * Run with: QA_BASE_URL=<base> node scripts/qa-bugfix-artist-invite-existing-email-login-check.mjs
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
const TAG = "QA-BUGFIX-EXISTINGEMAIL-LOGIN-20260830";
const stamp = Date.now();
const OWNER_PW = "QaBugfixLoginCheck2026!";
const EXISTING_PW = "TheirRealPreExistingPassword123!";
const NEW_FORM_PW = "WhateverTheyTypedInTheForm456!";

const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const created = { studios: [], auth: [], invites: [] };

try {
  const existingEmail = `${TAG.toLowerCase()}-preexisting-${stamp}@inkbook-qa.test`;
  const { data: preExistingUser } = await sb.auth.admin.createUser({ email: existingEmail, email_confirm: true, password: EXISTING_PW });
  created.auth.push(preExistingUser.user.id);

  const { data: ownerUser } = await sb.auth.admin.createUser({ email: `${TAG.toLowerCase()}-owner-${stamp}@inkbook-qa.test`, email_confirm: true, password: OWNER_PW });
  created.auth.push(ownerUser.user.id);
  const { data: studio } = await sb.from("studios").insert({
    name: `[${TAG}] Studio`, subdomain: `qa-bugfix-existingemail-login-${stamp}`, owner_id: ownerUser.user.id, plan: "studio",
  }).select().single();
  created.studios.push(studio.id);

  const { data: invite } = await sb.from("artist_invites").insert({
    studio_id: studio.id, invited_email: existingEmail, invited_name: "QA Existing-Email Login-Check",
    invited_by: ownerUser.user.id, expires_at: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
  }).select("id, token").single();
  created.invites.push(invite.id);

  const browser = await chromium.launch({ headless: true });
  const acceptPage = await (await browser.newContext()).newPage();
  await acceptPage.goto(`${BASE_URL}/artist/accept/${invite.token}`, { waitUntil: "load" });
  await acceptPage.fill("#accept-name", "QA Existing-Email Login-Check");
  await acceptPage.fill("#accept-password", NEW_FORM_PW);
  await acceptPage.fill("#accept-confirm-password", NEW_FORM_PW);
  await acceptPage.getByRole("button", { name: /join/i }).click();
  await acceptPage.waitForTimeout(4000);
  console.log("After accept form submit, URL:", acceptPage.url());

  console.log("\n=== Now log in with the REAL pre-existing password ===");
  const loginCtx = await browser.newContext();
  const loginPage = await loginCtx.newPage();
  await loginPage.goto(`${BASE_URL}/login`, { waitUntil: "load" });
  await loginPage.fill("#login-email", existingEmail);
  await loginPage.fill("#login-password", EXISTING_PW);
  await loginPage.getByRole("button", { name: /sign in|log in|login/i }).click();
  await loginPage.waitForURL(/\/artist\/dashboard/, { timeout: 15000 }).catch(() => {});
  const finalUrl = loginPage.url();
  console.log("Final URL after login with real password:", finalUrl);
  console.log(finalUrl.includes("/artist/dashboard")
    ? "PASS — artist reaches their dashboard using their real pre-existing password"
    : "FAIL — did not reach /artist/dashboard");

  await browser.close();
} catch (e) {
  console.error("ERROR:", e);
} finally {
  for (const id of created.invites) await sb.from("artist_invites").delete().eq("id", id).then(() => {}).catch(() => {});
  for (const id of created.studios) {
    await sb.from("artists").delete().eq("studio_id", id).then(() => {}).catch(() => {});
    await sb.from("studios").delete().eq("id", id).then(() => {}).catch(() => {});
  }
  for (const id of [...new Set(created.auth)]) await sb.auth.admin.deleteUser(id).then(() => {}).catch(() => {});
  console.log("cleanup done");
}
