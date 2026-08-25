/**
 * Exhaustive QA — Security/RLS sweep: live cross-studio IDOR probes against
 * app/api/custom-requests/[id]/{quote,decline,schedule}/route.ts — the most
 * complex authorization logic in the API surface (owner OR assigned-artist,
 * scoped per-studio, with an explicit prior-fixed-bug comment about
 * multi-studio owners). Source read already confirmed these look correctly
 * guarded; this gets fresh, real, empirical evidence rather than trusting
 * the read. Self-cleaning, tagged QA data only. Run with:
 *   QA_BASE_URL=https://www.inkbook.tech node scripts/qa-phase-security-idor.mjs
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
const BASE_URL = process.env.QA_BASE_URL ?? "http://localhost:3000";
const TAG = "QA-SEC-IDOR";
const tag = `${TAG.toLowerCase()}-${Date.now()}`;
const PW = "Password123!";

const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const created = { auth: [], studios: [], artists: [], customRequests: [], bookings: [] };
let failures = 0;
const findings = [];
const PASS = (m) => console.log("  PASS:", m);
const FAIL = (m) => { console.log("  FAIL:", m); failures++; findings.push(m); };
const NOTE = (m) => console.log("  NOTE:", m);
const HEAD = (m) => console.log("\n" + m + "\n" + "=".repeat(m.length));

async function mkAuthUser(email) {
  const { data, error } = await sb.auth.admin.createUser({ email, email_confirm: true, password: PW });
  if (error) throw new Error(error.message);
  created.auth.push(data.user.id);
  return data.user.id;
}

// Same proven cookie-injection technique used throughout this mission's
// Client Portal QA (qa-phase-d-client.mjs): generate a real magic-link OTP
// via the admin API, verify it through a plain anon client to get a
// genuine, full Supabase session object, then base64url-encode it exactly
// the way the Supabase SSR cookie helper expects. This is a real logged-in
// session an attacker's browser would send, not a hand-built fake.
const anonClient = createClient(SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
async function sessionCookieValueFor(email) {
  const { data: linkData, error: linkErr } = await sb.auth.admin.generateLink({ type: "magiclink", email });
  if (linkErr) throw new Error(`generateLink(${email}): ${linkErr.message}`);
  const { data: verifyData, error: verifyErr } = await anonClient.auth.verifyOtp({
    email, token: linkData.properties.email_otp, type: "email",
  });
  if (verifyErr) throw new Error(`verifyOtp(${email}): ${verifyErr.message}`);
  return "base64-" + Buffer.from(JSON.stringify(verifyData.session)).toString("base64url");
}

function authCookieHeader(cookieValue, projectRef) {
  return `sb-${projectRef}-auth-token=${cookieValue}`;
}

try {
  HEAD("Seed — Studio A (target) with a pending custom_request, Studio B (attacker)");
  const projectRef = new URL(SUPABASE_URL).hostname.split(".")[0];

  const ownerAEmail = `${tag}-ownerA@example.test`;
  const ownerAId = await mkAuthUser(ownerAEmail);
  const { data: studioA } = await sb.from("studios").insert({
    name: `[${TAG}] Studio A`, subdomain: `${tag}-a`, owner_id: ownerAId, deposit_amount_cents: 5000, plan: "studio",
  }).select().single();
  created.studios.push(studioA.id);
  const { data: artistA } = await sb.from("artists").insert({
    studio_id: studioA.id, name: "QA Artist A", email: `${tag}-artistA@example.test`, styles: ["Traditional"], minimum_rate_cents: 10000,
  }).select().single();
  created.artists.push(artistA.id);

  const { data: crTarget } = await sb.from("custom_requests").insert({
    studio_id: studioA.id, artist_id: artistA.id, client_name: "QA Target Client",
    client_email: `${tag}-target@example.test`, client_phone: "+15550001111",
    design_description: "QA target request for IDOR probe", placement: "Forearm",
    size: "Medium", budget_range: "$400-600", preferred_dates: "Any weekday",
  }).select().single();
  created.customRequests.push(crTarget.id);

  const ownerBEmail = `${tag}-ownerB@example.test`;
  const ownerBId = await mkAuthUser(ownerBEmail);
  const { data: studioB } = await sb.from("studios").insert({
    name: `[${TAG}] Studio B`, subdomain: `${tag}-b`, owner_id: ownerBId, deposit_amount_cents: 5000, plan: "studio",
  }).select().single();
  created.studios.push(studioB.id);

  const artistBEmail = `${tag}-artistB@example.test`;
  const artistBUserId = await mkAuthUser(artistBEmail);
  const { data: artistB } = await sb.from("artists").insert({
    studio_id: studioB.id, user_id: artistBUserId, name: "QA Artist B", email: artistBEmail, styles: ["Fine Line"], minimum_rate_cents: 10000,
  }).select().single();
  created.artists.push(artistB.id);

  const [valOwnerB, valArtistB] = await Promise.all([
    sessionCookieValueFor(ownerBEmail),
    sessionCookieValueFor(artistBEmail),
  ]);
  const cookieOwnerB = authCookieHeader(valOwnerB, projectRef);
  const cookieArtistB = authCookieHeader(valArtistB, projectRef);
  NOTE(`studioA=${studioA.id} (target), studioB=${studioB.id} (attacker), crTarget=${crTarget.id}`);

  // ═══════════════════════════════════════════════════════════
  // Probe 1 — Studio B's OWNER tries to quote Studio A's request
  // ═══════════════════════════════════════════════════════════
  HEAD("Probe 1 — cross-studio owner attempts to QUOTE another studio's custom_request");
  {
    const res = await fetch(`${BASE_URL}/api/custom-requests/${crTarget.id}/quote`, {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie: cookieOwnerB },
      body: JSON.stringify({ quote_amount: 999, deposit_amount: 100 }),
    });
    const body = await res.json().catch(() => ({}));
    if (res.status === 401 || res.status === 403) {
      PASS(`cross-studio owner correctly blocked from quoting (HTTP ${res.status}): ${JSON.stringify(body)}`);
    } else {
      FAIL(`cross-studio owner was NOT blocked from quoting — HTTP ${res.status}: ${JSON.stringify(body)}`);
    }
    const { data: after } = await sb.from("custom_requests").select("status, quote_amount").eq("id", crTarget.id).single();
    if (after.status === "pending" && after.quote_amount === null) {
      PASS("DB re-query confirms the target request's status/quote_amount are unchanged");
    } else {
      FAIL(`DB shows the cross-studio quote attempt actually mutated the row: ${JSON.stringify(after)}`);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // Probe 2 — Studio B's ARTIST tries to decline Studio A's request
  // ═══════════════════════════════════════════════════════════
  HEAD("Probe 2 — cross-studio artist attempts to DECLINE another studio's custom_request");
  {
    const res = await fetch(`${BASE_URL}/api/custom-requests/${crTarget.id}/decline`, {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie: cookieArtistB },
      body: JSON.stringify({ declined_reason: "QA IDOR probe" }),
    });
    const body = await res.json().catch(() => ({}));
    if (res.status === 401 || res.status === 403) {
      PASS(`cross-studio artist correctly blocked from declining (HTTP ${res.status}): ${JSON.stringify(body)}`);
    } else {
      FAIL(`cross-studio artist was NOT blocked from declining — HTTP ${res.status}: ${JSON.stringify(body)}`);
    }
    const { data: after } = await sb.from("custom_requests").select("status").eq("id", crTarget.id).single();
    if (after.status === "pending") PASS("DB re-query confirms the target request's status is unchanged (still pending)");
    else FAIL(`DB shows the cross-studio decline attempt actually mutated the row: ${JSON.stringify(after)}`);
  }

  // ═══════════════════════════════════════════════════════════
  // Probe 3 — Studio B's OWNER tries to schedule Studio A's request
  // ═══════════════════════════════════════════════════════════
  HEAD("Probe 3 — cross-studio owner attempts to SCHEDULE another studio's custom_request");
  {
    const res = await fetch(`${BASE_URL}/api/custom-requests/${crTarget.id}/schedule`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", cookie: cookieOwnerB },
      body: JSON.stringify({ date: "2027-01-15", time: "14:00" }),
    });
    const body = await res.json().catch(() => ({}));
    if (res.status === 401 || res.status === 403) {
      PASS(`cross-studio owner correctly blocked from scheduling (HTTP ${res.status}): ${JSON.stringify(body)}`);
    } else {
      FAIL(`cross-studio owner was NOT blocked from scheduling — HTTP ${res.status}: ${JSON.stringify(body)}`);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // Probe 4 — unauthenticated (no cookie at all) attempts all three
  // ═══════════════════════════════════════════════════════════
  HEAD("Probe 4 — fully unauthenticated requests to all three endpoints");
  {
    const endpoints = [
      ["POST", `/api/custom-requests/${crTarget.id}/quote`, { quote_amount: 500, deposit_amount: 100 }],
      ["POST", `/api/custom-requests/${crTarget.id}/decline`, { declined_reason: "x" }],
      ["PATCH", `/api/custom-requests/${crTarget.id}/schedule`, { date: "2027-01-15", time: "14:00" }],
    ];
    for (const [method, path, payload] of endpoints) {
      const res = await fetch(`${BASE_URL}${path}`, {
        method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      if (res.status === 401) PASS(`unauthenticated ${method} ${path} correctly rejected 401`);
      else FAIL(`unauthenticated ${method} ${path} was NOT rejected — HTTP ${res.status}`);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // Probe 5 — positive control: Studio A's REAL owner CAN quote (proves the token/cookie mechanism itself works)
  // ═══════════════════════════════════════════════════════════
  HEAD("Probe 5 — positive control: the real owner of Studio A CAN quote their own request");
  {
    const valOwnerA = await sessionCookieValueFor(ownerAEmail);
    const cookieOwnerA = authCookieHeader(valOwnerA, projectRef);
    const res = await fetch(`${BASE_URL}/api/custom-requests/${crTarget.id}/quote`, {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie: cookieOwnerA },
      body: JSON.stringify({ quote_amount: 500, deposit_amount: 100 }),
    });
    const body = await res.json().catch(() => ({}));
    if (res.ok && body.success) {
      PASS("real owner of Studio A successfully quoted their own request (200) — confirms the auth-cookie mechanism itself is valid, so Probes 1-4's 401/403s are real authorization rejections, not just broken auth plumbing");
    } else {
      FAIL(`positive control failed — the legitimate owner could NOT quote their own request: HTTP ${res.status}, ${JSON.stringify(body)}`);
    }
    const { data: after } = await sb.from("custom_requests").select("status, quote_amount").eq("id", crTarget.id).single();
    if (after.status === "quoted" && after.quote_amount === 500) PASS("DB re-query confirms the legitimate quote persisted correctly");
    else FAIL(`legitimate quote did not persist as expected: ${JSON.stringify(after)}`);
  }
} finally {
  HEAD("Cleanup");
  for (const id of created.customRequests) await sb.from("custom_requests").delete().eq("id", id);
  for (const id of created.bookings) await sb.from("bookings").delete().eq("id", id);
  for (const id of created.artists) await sb.from("artists").delete().eq("id", id);
  for (const id of created.studios) await sb.from("studios").delete().eq("id", id);
  for (const id of created.auth) await sb.auth.admin.deleteUser(id).catch(() => {});

  const checkStudios = await sb.from("studios").select("id").in("id", created.studios);
  console.log("studios gone:", (checkStudios.data ?? []).length === 0);
}

HEAD(`SECURITY/RLS — CROSS-STUDIO IDOR PROBE COMPLETE — ${failures} finding(s)`);
if (findings.length) findings.forEach((f) => console.log(" -", f));
process.exit(failures > 0 ? 1 : 0);
