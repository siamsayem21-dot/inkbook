/**
 * Full ground-up QA re-run (2026-08-29) — Job D: live cross-tenant IDOR probe
 * against GET /api/bookings. Source read of app/api/bookings/route.ts showed
 * the GET handler checks ONLY that a session exists (auth.getUser()) — it
 * never verifies the caller-supplied `studioId`/`artistId` query params
 * belong to that session. This plants a real booking (with realistic client
 * PII) on a throwaway "victim" studio, logs in as an unrelated "attacker"
 * owner, and calls GET /api/bookings?studioId=<victim> to see if it comes
 * back.
 *
 * Run with: node scripts/qa-fullrun-security-bookings-idor.mjs
 */
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
const TAG = "QA-SEC-BOOKINGS-IDOR";
const tag = `${TAG.toLowerCase()}-${Date.now()}`;

const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const anonClient = createClient(SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const created = { studios: [], artists: [], clients: [], bookings: [], auth: [] };
let failures = 0;
const PASS = (m) => console.log("  PASS:", m);
const FAIL = (m) => { console.log("  FAIL:", m); failures++; };
const NOTE = (m) => console.log("  NOTE:", m);
const HEAD = (m) => console.log("\n" + m + "\n" + "=".repeat(m.length));

async function mkAuthUser(email) {
  const { data, error } = await sb.auth.admin.createUser({ email, email_confirm: true, password: "Password123!" });
  if (error) throw new Error(error.message);
  created.auth.push(data.user.id);
  return data.user.id;
}
async function sessionCookieValueFor(email) {
  const { data: linkData, error: linkErr } = await sb.auth.admin.generateLink({ type: "magiclink", email });
  if (linkErr) throw new Error(`generateLink(${email}): ${linkErr.message}`);
  const { data: verifyData, error: verifyErr } = await anonClient.auth.verifyOtp({
    email, token: linkData.properties.email_otp, type: "email",
  });
  if (verifyErr) throw new Error(`verifyOtp(${email}): ${verifyErr.message}`);
  return "base64-" + Buffer.from(JSON.stringify(verifyData.session)).toString("base64url");
}

try {
  HEAD("Seed — Victim studio with a real booking (PII), unrelated Attacker studio/owner");
  const victimOwnerEmail = `${tag}-victimowner@example.test`;
  const victimOwnerId = await mkAuthUser(victimOwnerEmail);
  const { data: victimStudio } = await sb.from("studios").insert({
    name: `[${TAG}] Victim Studio`, subdomain: `${tag}-victim`, owner_id: victimOwnerId, deposit_amount_cents: 5000, plan: "studio",
  }).select().single();
  created.studios.push(victimStudio.id);

  const { data: victimArtist } = await sb.from("artists").insert({
    studio_id: victimStudio.id, name: "Victim Artist", email: `${tag}-vartist@example.test`, styles: ["Traditional"], minimum_rate_cents: 10000,
  }).select().single();
  created.artists.push(victimArtist.id);

  const CANARY_NAME = `PII-CANARY-${Date.now()}`;
  const { data: victimClient } = await sb.from("clients").insert({
    studio_id: victimStudio.id, full_name: CANARY_NAME, email: `${tag}-vclient@example.test`, phone: "+15559990000",
  }).select().single();
  created.clients.push(victimClient.id);

  const { data: victimBooking } = await sb.from("bookings").insert({
    studio_id: victimStudio.id, artist_id: victimArtist.id, client_id: victimClient.id,
    date: "2027-04-01", time: "13:00", style: "Traditional", status: "confirmed",
    deposit_amount_cents: 8000, deposit_paid: true, total_amount_cents: 40000,
  }).select().single();
  created.bookings.push(victimBooking.id);
  NOTE(`victimStudio=${victimStudio.id}, victimBooking=${victimBooking.id}, canary client name=${CANARY_NAME}`);

  const attackerOwnerEmail = `${tag}-attackerowner@example.test`;
  const attackerOwnerId = await mkAuthUser(attackerOwnerEmail);
  const { data: attackerStudio } = await sb.from("studios").insert({
    name: `[${TAG}] Attacker Studio`, subdomain: `${tag}-attacker`, owner_id: attackerOwnerId, deposit_amount_cents: 5000, plan: "studio",
  }).select().single();
  created.studios.push(attackerStudio.id);

  const projectRef = new URL(SUPABASE_URL).hostname.split(".")[0];
  const attackerCookieVal = await sessionCookieValueFor(attackerOwnerEmail);
  const attackerCookie = `sb-${projectRef}-auth-token=${attackerCookieVal}`;

  HEAD("Probe 1 — Attacker (logged in, unrelated studio) requests GET /api/bookings?studioId=<victim>");
  {
    const res = await fetch(`${BASE_URL}/api/bookings?studioId=${victimStudio.id}`, {
      headers: { cookie: attackerCookie },
    });
    const body = await res.json().catch(() => ({}));
    const text = JSON.stringify(body);
    const bookings = Array.isArray(body.bookings) ? body.bookings : [];
    const leaked = bookings.some((b) => b.id === victimBooking.id || b.studio_id === victimStudio.id);
    if (res.status === 401 || res.status === 403) {
      PASS(`blocked at the HTTP layer (${res.status})`);
    } else if (leaked) {
      FAIL(`CONFIRMED LEAK — an authenticated owner of an UNRELATED studio fetched another studio's full bookings rows (id, studio_id, artist_id, client_id, date, time, status, deposit_amount_cents, total_amount_cents, ...) via GET /api/bookings?studioId=<victim>. HTTP ${res.status}. ${bookings.length} row(s) returned, including the planted victim booking ${victimBooking.id}. Raw sample: ${text.slice(0, 400)}`);
    } else {
      PASS(`HTTP ${res.status}, victim booking not present in response — response: ${text.slice(0, 300)}`);
    }
  }

  HEAD("Probe 2 — unauthenticated (no session at all) requests the same URL");
  {
    const res = await fetch(`${BASE_URL}/api/bookings?studioId=${victimStudio.id}`);
    const body = await res.json().catch(() => ({}));
    const bookings2 = Array.isArray(body.bookings) ? body.bookings : [];
    const leaked2 = bookings2.some((b) => b.id === victimBooking.id);
    if (res.status === 401) PASS(`unauthenticated request correctly rejected (401)`);
    else if (leaked2) FAIL(`unauthenticated caller also got the leak — HTTP ${res.status}: ${JSON.stringify(body).slice(0, 300)}`);
    else PASS(`HTTP ${res.status}, victim booking not present: ${JSON.stringify(body).slice(0, 200)}`);
  }
} finally {
  HEAD("Cleanup");
  for (const id of created.bookings) await sb.from("bookings").delete().eq("id", id);
  for (const id of created.clients) await sb.from("clients").delete().eq("id", id);
  for (const id of created.artists) await sb.from("artists").delete().eq("id", id);
  for (const id of created.studios) await sb.from("studios").delete().eq("id", id);
  for (const id of created.auth) await sb.auth.admin.deleteUser(id).catch(() => {});
  const check = await sb.from("studios").select("id").in("id", created.studios);
  console.log("studios gone:", (check.data ?? []).length === 0);
}

HEAD(`BOOKINGS IDOR PROBE COMPLETE — ${failures} finding(s)`);
process.exit(0);
