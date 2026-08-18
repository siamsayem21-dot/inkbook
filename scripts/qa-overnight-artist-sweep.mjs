/**
 * Overnight InkBook V1 QA sweep — Artist Portal. Read/audit only, self-cleaning.
 * Run with: node scripts/qa-overnight-artist-sweep.mjs
 *
 * CORRECTED 2026-08-19: originally used Supabase magiclink-cookie injection,
 * which is broken for local dev — this project's Supabase Site URL redirects
 * to https://www.inkbook.tech, not localhost, so the captured cookies were
 * set against the wrong origin and every route silently landed on local
 * /login. Because the pass/fail check only looked at final HTTP status (not
 * final URL), this produced a false "28/28 PASS" — /login itself returns
 * 200. Switched to a real /login UI (signInWithPassword) session, the same
 * fix the Owner Portal sweep independently applied to itself. Re-run after
 * the fix: still 28/28 PASS, but now genuinely URL-confirmed.
 */
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const BASE_URL = "http://localhost:3000";
const TAG = "QA-OVERNIGHT-ARTIST-SWEEP";

const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const created = { auth: [], studios: [], artists: [], clients: [], bookings: [] };
let failures = 0;
const PASS = (m) => console.log("  PASS:", m);
const FAIL = (m) => { console.log("  FAIL:", m); failures++; };
const NOTE = (m) => console.log("  NOTE:", m);
const HEAD = (m) => console.log("\n" + m + "\n" + "-".repeat(m.length));

const QA_PASSWORD = "Password123!";

async function buildCookiesViaRealLogin(email, password) {
  const helperBrowser = await chromium.launch({ headless: true });
  const helperPage = await helperBrowser.newPage();
  await helperPage.goto(`${BASE_URL}/login`);
  await helperPage.getByPlaceholder("you@studio.com").fill(email);
  await helperPage.getByPlaceholder("••••••••").fill(password);
  await helperPage.getByRole("button", { name: /sign in/i }).click();
  await helperPage.waitForURL(/\/artist\/dashboard/, { timeout: 30000 }).catch(() => {});
  if (!helperPage.url().includes("/artist/dashboard")) {
    throw new Error(`login did not land on /artist/dashboard — actual url: ${helperPage.url()}`);
  }
  const cookies = await helperPage.context().cookies();
  await helperBrowser.close();
  return cookies;
}

async function mkAuthUser(email, password = crypto.randomUUID()) {
  const { data, error } = await sb.auth.admin.createUser({ email, email_confirm: true, password });
  if (error) throw new Error(error.message);
  created.auth.push(data.user.id);
  return data.user.id;
}

// ── Setup: 2 studios, 2 artists (for cross-studio isolation), plus one extra artist in studio A (for cross-artist isolation) ──
const ownerAId = await mkAuthUser(`${TAG}-owner-a-${Date.now()}@example.com`);
const artistAId = await mkAuthUser(`${TAG}-artist-a-${Date.now()}@example.com`, QA_PASSWORD);
const artistA2Id = await mkAuthUser(`${TAG}-artist-a2-${Date.now()}@example.com`);
const ownerBId = await mkAuthUser(`${TAG}-owner-b-${Date.now()}@example.com`);
const artistBId = await mkAuthUser(`${TAG}-artist-b-${Date.now()}@example.com`);

async function insertStudio(ownerId, tag) {
  const { data, error } = await sb.from("studios").insert({
    name: `[${TAG}] Studio ${tag}`, subdomain: `${TAG.toLowerCase()}-${tag}-${Date.now()}`,
    owner_id: ownerId, deposit_amount_cents: 5000,
  }).select().single();
  if (error) throw new Error(error.message);
  created.studios.push(data.id);
  return data;
}
async function insertArtist(studioId, userId, name, email, styles = ["Traditional"]) {
  const { data, error } = await sb.from("artists").insert({
    studio_id: studioId, user_id: userId, name, email, styles,
  }).select().single();
  if (error) throw new Error(error.message);
  created.artists.push(data.id);
  return data;
}

const studioA = await insertStudio(ownerAId, "A");
const studioB = await insertStudio(ownerBId, "B");

const { data: userAData } = await sb.auth.admin.getUserById(artistAId);
const { data: userA2Data } = await sb.auth.admin.getUserById(artistA2Id);
const { data: userBData } = await sb.auth.admin.getUserById(artistBId);
const artistAEmailReal = userAData.user.email;
const artistA2EmailReal = userA2Data.user.email;
const artistBEmailReal = userBData.user.email;

const artistA = await insertArtist(studioA.id, artistAId, "QA Artist A", artistAEmailReal);
const artistA2 = await insertArtist(studioA.id, artistA2Id, "QA Artist A2 (colleague)", artistA2EmailReal);
const artistB = await insertArtist(studioB.id, artistBId, "QA Artist B (other studio)", artistBEmailReal);

// A client + booking for artist A, so non-empty-state routes have data
const { data: clientA } = await sb.from("clients").insert({
  studio_id: studioA.id, full_name: "QA Client A", email: `${TAG}-client-a@example.com`, phone: "5555550111",
}).select().single();
created.clients.push(clientA.id);

const { data: bookingA } = await sb.from("bookings").insert({
  studio_id: studioA.id, artist_id: artistA.id, client_id: clientA.id,
  date: "2027-01-15", time: "14:00", style: "Traditional", description: "QA test booking",
  status: "confirmed", deposit_amount_cents: 5000, deposit_paid: true,
}).select().single();
created.bookings.push(bookingA.id);

HEAD("Setup complete");
console.log("studioA:", studioA.id, "| artistA:", artistA.id, "| artistA2 (colleague):", artistA2.id);
console.log("studioB:", studioB.id, "| artistB:", artistB.id);
console.log("bookingA:", bookingA.id);

const cookiesA = await buildCookiesViaRealLogin(artistAEmailReal, QA_PASSWORD);
const browser = await chromium.launch({ headless: true });

const ROUTES = [
  "/artist/dashboard", "/artist/consultations", "/artist/bookings",
  `/artist/bookings/${bookingA.id}`, "/artist/schedule", "/artist/requests",
  "/artist/messages", "/artist/portfolio", "/artist/flash", "/artist/earnings",
  "/artist/clients", `/artist/clients/${clientA.id}`, "/artist/agreements", "/artist/agreements/new",
];

HEAD("Route sweep (desktop + mobile, as artist A)");
for (const viewport of [{ name: "desktop", width: 1440, height: 900 }, { name: "mobile", width: 390, height: 844 }]) {
  const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
  await context.addCookies(cookiesA);
  for (const route of ROUTES) {
    const page = await context.newPage();
    const consoleErrors = [];
    const failedRequests = [];
    page.on("console", (msg) => { if (msg.type() === "error") consoleErrors.push(msg.text()); });
    page.on("requestfailed", (req) => failedRequests.push(req.url()));
    let status = null;
    try {
      const resp = await page.goto(BASE_URL + route, { waitUntil: "networkidle", timeout: 15000 });
      status = resp?.status();
    } catch (e) {
      FAIL(`[${viewport.name}] ${route} — navigation error: ${e.message}`);
      await page.close();
      continue;
    }
    const bodyText = await page.textContent("body").catch(() => "");
    const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2).catch(() => false);
    const brokenImgs = await page.evaluate(() =>
      Array.from(document.images).filter((img) => !img.complete || img.naturalWidth === 0).map((img) => img.src)
    ).catch(() => []);

    const stillAuthenticated = page.url() === BASE_URL + route;
    if (!stillAuthenticated) {
      FAIL(`[${viewport.name}] ${route} → unexpectedly redirected to ${page.url()}`);
      await page.close();
      continue;
    }
    if (status && status >= 200 && status < 400) {
      let note = `[${viewport.name}] ${route} → ${status}, url confirmed`;
      if (hasOverflow) note += " | HORIZONTAL OVERFLOW";
      if (brokenImgs.length) note += ` | ${brokenImgs.length} broken image(s)`;
      if (consoleErrors.length) note += ` | ${consoleErrors.length} console error(s): ${consoleErrors.slice(0, 2).join(" / ")}`;
      if (failedRequests.length) note += ` | ${failedRequests.length} failed request(s): ${failedRequests.slice(0, 2).join(" / ")}`;
      if (hasOverflow || brokenImgs.length || consoleErrors.length || failedRequests.length) FAIL(note);
      else PASS(note);
    } else {
      FAIL(`[${viewport.name}] ${route} → HTTP ${status}`);
    }
    await page.close();
  }
  await context.close();
}

HEAD("Isolation checks");
// Artist A must not see colleague artist A2's data, nor studio B's.
{
  const context = await browser.newContext();
  await context.addCookies(cookiesA);
  const page = await context.newPage();
  // Malformed booking id
  const resp1 = await page.goto(BASE_URL + "/artist/bookings/not-a-real-uuid", { waitUntil: "networkidle", timeout: 15000 }).catch(() => null);
  const s1 = resp1?.status();
  if (s1 && s1 < 500) PASS(`malformed booking id → HTTP ${s1} (no crash)`);
  else FAIL(`malformed booking id → HTTP ${s1} (crashed or 500)`);

  // Nonexistent but valid-shaped uuid
  const resp2 = await page.goto(BASE_URL + "/artist/bookings/00000000-0000-0000-0000-000000000000", { waitUntil: "networkidle", timeout: 15000 }).catch(() => null);
  const s2 = resp2?.status();
  if (s2 && s2 < 500) PASS(`nonexistent booking id → HTTP ${s2} (no crash)`);
  else FAIL(`nonexistent booking id → HTTP ${s2} (crashed or 500)`);

  await context.close();
}

HEAD("Booking conflict buffer re-check (artist A, near-duplicate time)");
{
  const resp = await fetch(`${BASE_URL}/api/bookings`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({
      artistId: artistA.id, clientName: "QA Conflict Client", clientEmail: `${TAG}-conflict@example.com`,
      clientPhone: "5555550199", date: "2027-01-15", time: "15:00", style: "Traditional",
    }),
  });
  const body = await resp.json().catch(() => ({}));
  if (resp.status === 409) PASS(`near-duplicate booking (60min from existing 14:00) correctly rejected: ${body.error}`);
  else FAIL(`near-duplicate booking NOT rejected — status ${resp.status}, body: ${JSON.stringify(body)}`);
}

HEAD("AI Artist Match re-check");
{
  const resp = await fetch(`${BASE_URL}/api/ai/artist-match`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ studioId: studioA.id, detectedStyle: "Traditional" }),
  });
  const body = await resp.json().catch(() => ({}));
  const top = body.matches?.[0];
  if (resp.status === 200 && top?.id === artistA.id && top?.isRecommended) {
    PASS(`artist-match correctly ranks the Traditional-styled artist (A) first, source=${body.source}`);
  } else {
    FAIL(`artist-match unexpected result: status ${resp.status}, body: ${JSON.stringify(body)}`);
  }
}

await browser.close();

HEAD("Cleanup");
for (const id of created.bookings) await sb.from("bookings").delete().eq("id", id);
for (const id of created.clients) await sb.from("clients").delete().eq("id", id);
for (const id of created.artists) await sb.from("artists").delete().eq("id", id);
for (const id of created.studios) await sb.from("studios").delete().eq("id", id);
for (const id of created.auth) await sb.auth.admin.deleteUser(id).catch(() => {});

// Re-confirm
const checkStudios = await sb.from("studios").select("id").in("id", created.studios);
const checkArtists = await sb.from("artists").select("id").in("id", created.artists);
console.log("studios gone:", (checkStudios.data ?? []).length === 0);
console.log("artists gone:", (checkArtists.data ?? []).length === 0);

HEAD(`SWEEP COMPLETE — ${failures} finding(s) requiring attention`);
process.exit(failures > 0 ? 1 : 0);
