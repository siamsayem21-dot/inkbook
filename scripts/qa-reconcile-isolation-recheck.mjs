/**
 * 2026-08-30 pre-deploy reconciliation — targeted cross-artist and
 * cross-client isolation re-confirmation. Not testing anything touched by
 * this session's fixes (that's covered by the dedicated retest scripts) —
 * this re-confirms the isolation mechanisms this mission's fixes sit next
 * to haven't regressed. Self-cleaning. Run against local dev (fixes are
 * uncommitted) so the whole app reflects the current working tree.
 *
 * Run with: QA_BASE_URL=http://localhost:3311 node scripts/qa-reconcile-isolation-recheck.mjs
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
const TAG = "QA-RECONCILE-ISOLATION-20260830";
const stamp = Date.now();
const PW = "QaReconcile2026!";

const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const anonClient = createClient(SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
let failures = 0;
const PASS = (m) => console.log("  PASS:", m);
const FAIL = (m) => { console.log("  FAIL:", m); failures++; };
const HEAD = (m) => console.log("\n" + m + "\n" + "=".repeat(m.length));

const created = { auth: [], studios: [] };
async function mkAuthUser(email) {
  const { data, error } = await sb.auth.admin.createUser({ email, email_confirm: true, password: PW });
  if (error) throw new Error(error.message);
  created.auth.push(data.user.id);
  return data.user.id;
}
async function sessionCookieFor(email) {
  const { data: linkData, error } = await sb.auth.admin.generateLink({ type: "magiclink", email });
  if (error) throw new Error(error.message);
  const { data: verifyData, error: vErr } = await anonClient.auth.verifyOtp({
    email, token: linkData.properties.email_otp, type: "email",
  });
  if (vErr) throw new Error(vErr.message);
  const projectRef = new URL(SUPABASE_URL).hostname.split(".")[0];
  return `sb-${projectRef}-auth-token=base64-${Buffer.from(JSON.stringify(verifyData.session)).toString("base64url")}`;
}

try {
  HEAD("Seed — 1 studio, 2 artists, 1 client, 1 exclusive booking+consultation per artist");
  const ownerEmail = `${TAG.toLowerCase()}-owner-${stamp}@inkbook-qa.test`;
  const ownerId = await mkAuthUser(ownerEmail);
  const { data: studio } = await sb.from("studios").insert({
    name: `[${TAG}] Studio`, subdomain: `qa-reconcile-iso-${stamp}`, owner_id: ownerId, plan: "studio",
  }).select().single();
  created.studios.push(studio.id);

  const a1Email = `${TAG.toLowerCase()}-artist1-${stamp}@inkbook-qa.test`;
  const a1Id = await mkAuthUser(a1Email);
  const { data: artist1 } = await sb.from("artists").insert({
    studio_id: studio.id, name: "Artist One", email: a1Email, user_id: a1Id, styles: ["Fine Line"], minimum_rate_cents: 10000,
  }).select().single();

  const a2Email = `${TAG.toLowerCase()}-artist2-${stamp}@inkbook-qa.test`;
  const a2Id = await mkAuthUser(a2Email);
  const { data: artist2 } = await sb.from("artists").insert({
    studio_id: studio.id, name: "Artist Two", email: a2Email, user_id: a2Id, styles: ["Traditional"], minimum_rate_cents: 10000,
  }).select().single();

  const { data: client1 } = await sb.from("clients").insert({
    studio_id: studio.id, full_name: "Client One", email: `${TAG.toLowerCase()}-client1-${stamp}@inkbook-qa.test`, phone: "+15551110001",
  }).select().single();
  const { data: client2 } = await sb.from("clients").insert({
    studio_id: studio.id, full_name: "Client Two", email: `${TAG.toLowerCase()}-client2-${stamp}@inkbook-qa.test`, phone: "+15551110002",
  }).select().single();

  // Booking exclusively assigned to artist2 — artist1 must not be able to act on it via direct URL.
  const { data: booking2, error: booking2Err } = await sb.from("bookings").insert({
    studio_id: studio.id, artist_id: artist2.id, client_id: client2.id,
    date: "2027-05-01", time: "14:00", style: "Traditional", status: "confirmed", total_amount_cents: 30000,
    deposit_amount_cents: 5000,
  }).select().single();
  if (booking2Err) throw new Error("booking2 insert failed: " + booking2Err.message);

  HEAD("Probe — cross-artist: artist1's session hitting artist2's exclusive booking detail page");
  {
    const cookie = await sessionCookieFor(a1Email);
    const res = await fetch(`${BASE_URL}/artist/bookings/${booking2.id}`, { headers: { cookie } });
    const text = await res.text();
    const leaked = text.includes("Client Two") || text.includes(client2.email);
    if (leaked) FAIL(`artist1 could see artist2's exclusive booking detail (client name/email present in response)`);
    else PASS(`artist1 blocked from artist2's exclusive booking (HTTP ${res.status}, no client data present)`);
  }

  // Two client_accounts, two AI-chat-linked consultations — cross-client probe.
  const { data: consult1, error: consult1Err } = await sb.from("consultations").insert({
    studio_id: studio.id, client_name: "Client One", client_email: client1.email, client_phone: client1.phone,
    tattoo_description: TAG, placement: "arm", estimated_size: "small",
    color_preference: "Black & grey", budget_range: "$200-500", status: "new",
  }).select().single();
  if (consult1Err) throw new Error("consult1 insert failed: " + consult1Err.message);

  const client1UserId = await mkAuthUser(client1.email);
  const client2UserId = await mkAuthUser(client2.email);
  const { data: account1, error: account1Err } = await sb.from("client_accounts").insert({
    user_id: client1UserId, email: client1.email,
  }).select().single();
  if (account1Err) throw new Error("account1 insert failed: " + account1Err.message);
  const { data: account2, error: account2Err } = await sb.from("client_accounts").insert({
    user_id: client2UserId, email: client2.email,
  }).select().single();
  if (account2Err) throw new Error("account2 insert failed: " + account2Err.message);

  await sb.from("ai_chats").insert({
    studio_id: studio.id, client_account_id: account1.id, status: "submitted", consultation_id: consult1.id,
  });

  HEAD("Probe — cross-client: client2's portal session hitting client1's exclusive project/consultation");
  {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const cookie = await sessionCookieFor(client2.email);
    await page.context().addCookies([{
      name: cookie.split("=")[0], value: cookie.split("=").slice(1).join("="),
      domain: new URL(BASE_URL).hostname, path: "/",
    }]);
    const res = await page.goto(`${BASE_URL}/portal/${studio.subdomain}/projects/${consult1.id}`, { waitUntil: "load" });
    const bodyText = await page.evaluate(() => document.body.innerText);
    const leaked = bodyText.includes(TAG) || bodyText.includes("arm");
    if (leaked) FAIL(`client2 could see client1's exclusive project detail`);
    else PASS(`client2 blocked from client1's exclusive project (HTTP ${res.status()}, no project data present)`);
    await browser.close();
  }
} catch (e) {
  console.error("Probe error:", e);
  failures++;
} finally {
  HEAD("Cleanup");
  for (const id of created.studios) {
    await sb.from("bookings").delete().eq("studio_id", id);
    await sb.from("consultations").delete().eq("studio_id", id);
    await sb.from("ai_chats").delete().eq("studio_id", id);
    await sb.from("clients").delete().eq("studio_id", id);
    await sb.from("artists").delete().eq("studio_id", id);
    await sb.from("studios").delete().eq("id", id);
  }
  for (const id of created.auth) await sb.auth.admin.deleteUser(id).catch(() => {});
  console.log("done");
}

HEAD(`ISOLATION RECHECK COMPLETE — ${failures} finding(s)`);
process.exit(failures > 0 ? 1 : 0);
