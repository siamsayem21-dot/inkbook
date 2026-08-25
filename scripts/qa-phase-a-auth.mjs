/**
 * Exhaustive QA — Phase A: Auth + role-boundary verification.
 * Self-cleaning, tagged QA data only. Run with:
 *   QA_BASE_URL=https://www.inkbook.tech node scripts/qa-phase-a-auth.mjs
 * (defaults to http://localhost:3000)
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
const BASE_URL = process.env.QA_BASE_URL ?? "http://localhost:3000";
const TAG = "QA-PHASE-A";
const tag = `${TAG.toLowerCase()}${Date.now()}`;
const PW = "Password123!";

const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const created = { auth: [], studios: [], artists: [] };
let failures = 0;
const findings = [];
const PASS = (m) => console.log("  PASS:", m);
const FAIL = (m) => { console.log("  FAIL:", m); failures++; findings.push(m); };
const NOTE = (m) => console.log("  NOTE:", m);
const HEAD = (m) => console.log("\n" + m + "\n" + "=".repeat(m.length));

async function mkAuthUser(email, password) {
  const { data, error } = await sb.auth.admin.createUser({ email, email_confirm: true, password });
  if (error) throw new Error(error.message);
  created.auth.push(data.user.id);
  return data.user.id;
}

const browser = await chromium.launch({ headless: true });

try {
  // ═══════════════════════════════════════════════════════════
  // A1 — Login: invalid credentials
  // ═══════════════════════════════════════════════════════════
  HEAD("A1 — Login: invalid credentials");
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(`${BASE_URL}/login`, { waitUntil: "load" });
    await page.getByPlaceholder("you@studio.com").fill(`nonexistent-${tag}@example.test`);
    await page.getByPlaceholder("••••••••").fill("WrongPassword123!");
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForTimeout(2000);
    const errorVisible = await page.locator("text=/invalid|error|incorrect/i").first().isVisible().catch(() => false);
    const stillOnLogin = page.url().includes("/login");
    if (errorVisible && stillOnLogin) PASS("invalid login shows an error and stays on /login (no false-positive redirect)");
    else FAIL(`invalid login — errorVisible=${errorVisible} stillOnLogin=${stillOnLogin} url=${page.url()}`);
    await ctx.close();
  }

  // ═══════════════════════════════════════════════════════════
  // A2 — Register: validation
  // ═══════════════════════════════════════════════════════════
  HEAD("A2 — Register: client-side validation");
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(`${BASE_URL}/register`, { waitUntil: "load" });
    await page.getByPlaceholder("Ink & Iron Studio").fill(`[${TAG}] Studio`);
    await page.getByPlaceholder("Jane Smith").fill("QA Owner");
    await page.getByPlaceholder("you@studio.com").fill(`${tag}-shortpw@example.test`);
    await page.getByPlaceholder("••••••••").fill("short"); // < 8 chars
    await page.getByPlaceholder("inkandironstudio").fill(`${tag}-shortpw`);
    await page.getByRole("button", { name: /create account/i }).click();
    await page.waitForTimeout(1000);
    const errText = await page.locator("text=/at least 8 characters/i").first().isVisible().catch(() => false);
    const stillOnRegister = page.url().includes("/register");
    if (errText && stillOnRegister) PASS("short password correctly rejected client-side, stays on /register");
    else FAIL(`short-password validation — errText=${errText} stillOnRegister=${stillOnRegister}`);
    await ctx.close();
  }

  // ═══════════════════════════════════════════════════════════
  // A3 — Reset password: no session → redirect
  // ═══════════════════════════════════════════════════════════
  HEAD("A3 — Reset password: visiting without a recovery session");
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(`${BASE_URL}/reset-password`, { waitUntil: "load" });
    await page.waitForURL(/\/login/, { timeout: 10000 }).catch(() => {});
    if (page.url().includes("/login")) PASS(`/reset-password with no session correctly redirects to /login (?error=link_expired expected) — actual: ${page.url()}`);
    else FAIL(`/reset-password with no session did NOT redirect to /login — actual: ${page.url()}`);
    await ctx.close();
  }

  // ═══════════════════════════════════════════════════════════
  // A4 — Logged-out access to every protected route family
  // ═══════════════════════════════════════════════════════════
  HEAD("A4 — Logged-out access to protected routes");
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    const PROTECTED = ["/owner/dashboard", "/artist/dashboard", "/dashboard"];
    for (const route of PROTECTED) {
      await page.goto(`${BASE_URL}${route}`, { waitUntil: "load" });
      const onLogin = page.url().includes("/login");
      if (onLogin) PASS(`logged-out ${route} → redirected to /login`);
      else FAIL(`logged-out ${route} did NOT redirect to /login — actual: ${page.url()}`);
    }
    await ctx.close();
  }

  // ═══════════════════════════════════════════════════════════
  // Seed: real Owner (with studio) and real Artist (with artist row) for boundary tests
  // ═══════════════════════════════════════════════════════════
  HEAD("Seed QA owner + artist for role-boundary tests");
  const ownerEmail = `${tag}-owner@example.test`;
  const artistEmail = `${tag}-artist@example.test`;
  const ownerId = await mkAuthUser(ownerEmail, PW);
  const { data: studioRow } = await sb.from("studios").insert({
    name: `[${TAG}] Studio`, subdomain: `${tag}-sub`, owner_id: ownerId, deposit_amount_cents: 5000,
  }).select().single();
  created.studios.push(studioRow.id);
  const artistUserId = await mkAuthUser(artistEmail, PW);
  const { data: artistRow } = await sb.from("artists").insert({
    studio_id: studioRow.id, user_id: artistUserId, name: "QA Artist", email: artistEmail, styles: ["Traditional"],
  }).select().single();
  created.artists.push(artistRow.id);
  NOTE(`owner=${ownerId} (has studio, NO artist row) | artist=${artistUserId} (has artist row, NO studio)`);

  // ═══════════════════════════════════════════════════════════
  // A5 — Role boundary: Owner session visiting Artist routes
  // ═══════════════════════════════════════════════════════════
  HEAD("A5 — Role boundary: Owner (no artist row) visiting /artist/** routes");
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(`${BASE_URL}/login`, { waitUntil: "load" });
    await page.getByPlaceholder("you@studio.com").fill(ownerEmail);
    await page.getByPlaceholder("••••••••").fill(PW);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL(/\/owner\/dashboard/, { timeout: 20000 });
    PASS(`owner login confirmed → ${page.url()}`);

    const ARTIST_ROUTES = ["/artist/dashboard", "/artist/bookings", "/artist/schedule", "/artist/earnings", "/artist/clients"];
    for (const route of ARTIST_ROUTES) {
      await page.goto(`${BASE_URL}${route}`, { waitUntil: "load" });
      const bodyText = await page.evaluate(() => document.body.innerText).catch(() => "");
      // Layout-level guard only checks getCurrentUser(), not artist ownership — the
      // per-page artist lookup is the actual defense. Confirm it holds: an Owner
      // visiting must NEVER see real artist-scoped data (bookings, earnings, etc.)
      // — either an empty/"not set up" state, or a redirect, are both acceptable;
      // real data belonging to ANY artist is not.
      const hasEmptyStateMarker = /not set up yet|no bookings|no.*scheduled|\$0/i.test(bodyText);
      const status = 200; // page loaded without throwing
      NOTE(`[owner→${route}] url=${page.url()} bodySnippet="${bodyText.slice(0, 120).replace(/\n/g, " ")}"`);
      if (hasEmptyStateMarker || !page.url().includes(route)) {
        PASS(`owner visiting ${route} sees empty-state/redirect, not real artist data`);
      } else {
        FAIL(`owner visiting ${route} — could not confirm empty-state marker, needs manual review: "${bodyText.slice(0, 200)}"`);
      }
    }
    await ctx.close();
  }

  // ═══════════════════════════════════════════════════════════
  // A6 — Role boundary: Artist session visiting Owner routes
  // ═══════════════════════════════════════════════════════════
  HEAD("A6 — Role boundary: Artist (no studio) visiting /owner/** routes");
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(`${BASE_URL}/login`, { waitUntil: "load" });
    await page.getByPlaceholder("you@studio.com").fill(artistEmail);
    await page.getByPlaceholder("••••••••").fill(PW);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL(/\/artist\/dashboard/, { timeout: 20000 });
    PASS(`artist login confirmed → ${page.url()}`);

    const OWNER_ROUTES = ["/owner/dashboard", "/owner/bookings", "/owner/revenue", "/owner/settings"];
    for (const route of OWNER_ROUTES) {
      await page.goto(`${BASE_URL}${route}`, { waitUntil: "load" });
      const onRegister = page.url().includes("/register");
      const onPricing = page.url().includes("/pricing");
      if (onRegister || onPricing) {
        PASS(`artist visiting ${route} → correctly redirected to ${page.url()} (no owned studio)`);
      } else if (page.url().includes(route)) {
        FAIL(`artist visiting ${route} — DID NOT redirect, landed on the actual owner route: ${page.url()} — potential access-control gap, needs investigation`);
      } else {
        NOTE(`artist visiting ${route} → unexpected landing: ${page.url()}`);
      }
    }
    await ctx.close();
  }
} finally {
  await browser.close().catch(() => {});
}

// Cleanup
HEAD("Cleanup");
for (const id of created.artists) await sb.from("artists").delete().eq("id", id);
for (const id of created.studios) await sb.from("studios").delete().eq("id", id);
for (const id of created.auth) await sb.auth.admin.deleteUser(id).catch(() => {});
const check = await sb.from("studios").select("id").in("id", created.studios);
console.log("studios gone:", (check.data ?? []).length === 0);

HEAD(`PHASE A COMPLETE — ${failures} finding(s)`);
if (findings.length) findings.forEach((f) => console.log(" -", f));
process.exit(failures > 0 ? 1 : 0);
