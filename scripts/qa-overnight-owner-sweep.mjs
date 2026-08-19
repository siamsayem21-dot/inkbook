/**
 * Overnight InkBook V1 QA sweep — Owner Portal. Read/audit only, self-cleaning.
 * Run with: node scripts/qa-overnight-owner-sweep.mjs
 *
 * Auth note: uses the real /register UI flow (matches tests/e2e/owner-workflow.spec.ts),
 * NOT Supabase magiclink-cookie injection — this project's Supabase Site URL is configured
 * to production (www.inkbook.tech), so a generateLink({type:"magiclink"}) action link redirects
 * there instead of localhost and captures zero usable cookies for a local dev server. A route
 * sweep built on that broken cookie set would silently land on /login for every route and still
 * report HTTP 200 with no console errors, i.e. false PASS across the board.
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
const TAG = "QA-OVERNIGHT-OWNER-SWEEP";

const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const created = { auth: [], studios: [], artists: [], clients: [], bookings: [] };
let failures = 0;
const PASS = (m) => console.log("  PASS:", m);
const FAIL = (m) => { console.log("  FAIL:", m); failures++; };
const HEAD = (m) => console.log("\n" + m + "\n" + "-".repeat(m.length));

const tag = `${TAG.toLowerCase()}${Date.now()}`;
const ownerEmail = `${tag}-owner@example.test`;
const password = "Password123!";
const studioName = `[${TAG}] Studio`;
const subdomain = `${tag}-sub`;

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();

HEAD("Register real owner via /register UI (not magiclink cookie injection)");
await page.goto(`${BASE_URL}/register`);
await page.getByPlaceholder("Ink & Iron Studio").fill(studioName);
await page.getByPlaceholder("Jane Smith").fill("QA Owner Sweep");
await page.getByPlaceholder("you@studio.com").fill(ownerEmail);
await page.getByPlaceholder("••••••••").fill(password);
await page.getByPlaceholder("inkandironstudio").fill(subdomain);
await page.getByRole("button", { name: /create account/i }).click();
await page.waitForURL(/\/owner\/dashboard/, { timeout: 20000 });
PASS(`registered + landed on ${page.url()}`);

const { data: studioRow } = await sb.from("studios").select("id, owner_id").eq("subdomain", subdomain).single();
created.studios.push(studioRow.id);
created.auth.push(studioRow.owner_id);

const { data: artistA } = await sb.from("artists").insert({
  studio_id: studioRow.id, name: "QA Artist A", email: `${tag}-artist-a@example.com`, styles: ["Traditional"],
}).select().single();
created.artists.push(artistA.id);

const { data: clientA } = await sb.from("clients").insert({
  studio_id: studioRow.id, full_name: "QA Client A", email: `${tag}-client-a@example.com`, phone: "5555550111",
}).select().single();
created.clients.push(clientA.id);

const { data: bookingA } = await sb.from("bookings").insert({
  studio_id: studioRow.id, artist_id: artistA.id, client_id: clientA.id,
  date: "2027-01-15", time: "14:00", style: "Traditional", description: "QA test booking",
  status: "confirmed", deposit_amount_cents: 5000, deposit_paid: true,
}).select().single();
created.bookings.push(bookingA.id);

HEAD("Seed data ready");
console.log("studio:", studioRow.id, "| artist:", artistA.id, "| client:", clientA.id, "| booking:", bookingA.id);

const ROUTES = [
  "/owner/dashboard", "/owner/bookings", "/owner/clients", "/owner/consultations",
  "/owner/pipeline", "/owner/requests", "/owner/flash", "/owner/consent-forms",
  "/owner/revenue", "/owner/artists", "/owner/artists/new", "/owner/blacklist",
  "/owner/waitlist", "/owner/reviews", "/owner/knowledge", "/owner/messages",
  "/owner/settings", "/owner/settings/billing", "/owner/settings/studio", "/owner/audit-log",
];

HEAD("Route sweep (desktop + mobile, same authenticated tab, no context re-creation)");
for (const viewport of [{ name: "desktop", width: 1440, height: 900 }, { name: "mobile", width: 390, height: 844 }]) {
  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  for (const route of ROUTES) {
    const consoleErrors = [];
    const failedRequests = [];
    const onConsole = (msg) => { if (msg.type() === "error") consoleErrors.push(msg.text()); };
    const onFailed = (req) => failedRequests.push(req.url());
    page.on("console", onConsole);
    page.on("requestfailed", onFailed);

    let status = null;
    try {
      const resp = await page.goto(BASE_URL + route, { waitUntil: "networkidle", timeout: 15000 });
      status = resp?.status();
    } catch (e) {
      FAIL(`[${viewport.name}] ${route} — navigation error: ${e.message}`);
      page.off("console", onConsole);
      page.off("requestfailed", onFailed);
      continue;
    }

    const stillAuthenticated = page.url().startsWith(BASE_URL + route.split("?")[0]) || page.url() === BASE_URL + route;
    const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2).catch(() => false);
    const brokenImgs = await page.evaluate(() =>
      Array.from(document.images).filter((img) => !img.complete || img.naturalWidth === 0).map((img) => img.src)
    ).catch(() => []);

    page.off("console", onConsole);
    page.off("requestfailed", onFailed);

    if (!stillAuthenticated) {
      FAIL(`[${viewport.name}] ${route} → unexpectedly redirected to ${page.url()}`);
      continue;
    }
    if (status && status >= 200 && status < 400) {
      let note = `[${viewport.name}] ${route} → ${status}`;
      if (hasOverflow) note += " | HORIZONTAL OVERFLOW";
      if (brokenImgs.length) note += ` | ${brokenImgs.length} broken image(s)`;
      if (consoleErrors.length) note += ` | ${consoleErrors.length} console error(s): ${consoleErrors.slice(0, 2).join(" / ")}`;
      if (failedRequests.length) note += ` | ${failedRequests.length} failed request(s): ${failedRequests.slice(0, 2).join(" / ")}`;
      if (hasOverflow || brokenImgs.length || consoleErrors.length || failedRequests.length) FAIL(note);
      else PASS(note);
    } else {
      FAIL(`[${viewport.name}] ${route} → HTTP ${status}`);
    }
  }
}

HEAD("Malformed id safety + refresh (desktop)");
await page.setViewportSize({ width: 1440, height: 900 });
for (const route of [
  "/owner/bookings/not-a-real-uuid", "/owner/clients/not-a-real-uuid",
  "/owner/consultations/not-a-real-uuid", "/owner/artists/not-a-real-uuid",
  "/owner/requests/not-a-real-uuid", "/owner/messages/not-a-real-uuid",
]) {
  const resp = await page.goto(BASE_URL + route, { waitUntil: "networkidle", timeout: 15000 }).catch(() => null);
  const s = resp?.status();
  if (s && s < 500) PASS(`malformed id ${route} → HTTP ${s} (no crash)`);
  else FAIL(`malformed id ${route} → HTTP ${s} (crashed or 500)`);
}

await page.goto(BASE_URL + "/owner/dashboard");
await page.reload({ waitUntil: "networkidle" });
if (page.url() === BASE_URL + "/owner/dashboard") PASS("refresh on /owner/dashboard stays authenticated");
else FAIL(`refresh on /owner/dashboard redirected to ${page.url()}`);

await browser.close();

HEAD("Cleanup");
for (const id of created.bookings) await sb.from("bookings").delete().eq("id", id);
for (const id of created.clients) await sb.from("clients").delete().eq("id", id);
for (const id of created.artists) await sb.from("artists").delete().eq("id", id);
for (const id of created.studios) await sb.from("studios").delete().eq("id", id);
for (const id of created.auth) await sb.auth.admin.deleteUser(id).catch(() => {});

const checkStudios = await sb.from("studios").select("id").in("id", created.studios);
const checkArtists = await sb.from("artists").select("id").in("id", created.artists);
console.log("studios gone:", (checkStudios.data ?? []).length === 0);
console.log("artists gone:", (checkArtists.data ?? []).length === 0);

HEAD(`SWEEP COMPLETE — ${failures} finding(s) requiring attention`);
process.exit(failures > 0 ? 1 : 0);
