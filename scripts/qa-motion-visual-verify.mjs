/**
 * Visual + motion verification for the design-depth correction pass
 * (feature/design-depth-correction). NOT a pass/fail script — captures
 * screenshots (rest AND hovered/mid-pointer-move states) so the actual
 * rendered depth/motion can be judged, per Siam's explicit instruction that
 * typecheck/tests/HTTP status are not proof of visual quality.
 *
 * Run with: node scripts/qa-motion-visual-verify.mjs
 * Requires a running server at QA_BASE_URL (default http://localhost:3000).
 */
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { readFileSync, mkdirSync } from "fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const BASE_URL = process.env.QA_BASE_URL ?? "http://localhost:3000";
const TAG = "QA-MOTION-VERIFY";
const DIR = "reports/motion-qa-screenshots";
mkdirSync(DIR, { recursive: true });

const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const created = { auth: [], studios: [], artists: [] };
const tag = `${TAG.toLowerCase()}${Date.now()}`;
const PW = "Password123!";
const log = (m) => console.log(m);

async function mkAuthUser(email, password) {
  const { data, error } = await sb.auth.admin.createUser({ email, email_confirm: true, password });
  if (error) throw new Error(error.message);
  created.auth.push(data.user.id);
  return data.user.id;
}

const ownerEmail = `${tag}-owner@example.test`;
const artistEmail = `${tag}-artist@example.test`;
const subdomain = `${tag}-sub`;

const ownerId = await mkAuthUser(ownerEmail, PW);
const { data: studioRow } = await sb.from("studios").insert({
  name: `[${TAG}] Studio`, subdomain, owner_id: ownerId, deposit_amount_cents: 5000,
}).select().single();
created.studios.push(studioRow.id);
const artistUserId = await mkAuthUser(artistEmail, PW);
const { data: artistRow } = await sb.from("artists").insert({
  studio_id: studioRow.id, user_id: artistUserId, name: "QA Artist", email: artistEmail, styles: ["Traditional"],
}).select().single();
created.artists.push(artistRow.id);

const browser = await chromium.launch({ headless: true });

async function shot(page, name) {
  await page.screenshot({ path: `${DIR}/${name}.png` });
  log(`  shot: ${name}.png`);
}

try {
  // ── OWNER DASHBOARD ──
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(`${BASE_URL}/login`, { waitUntil: "load" });
    await page.getByPlaceholder("you@studio.com").fill(ownerEmail);
    await page.getByPlaceholder("••••••••").fill(PW);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL(/\/owner\/dashboard/, { timeout: 20000 });
    await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});

    await shot(page, "01-owner-dashboard-desktop-REST");

    // Hover over the first StatsGrid card (a MotionCard) and measure the
    // transform it actually applies — proves tilt/lift/glow are live, not
    // just that the CSS class exists.
    const firstCard = page.locator(".cursor-glow").first();
    const box = await firstCard.boundingBox();
    if (box) {
      // Move toward the card's top-right quadrant so tilt is visibly asymmetric.
      await page.mouse.move(box.x + box.width * 0.85, box.y + box.height * 0.15, { steps: 12 });
      await page.waitForTimeout(150);
      const transform = await firstCard.evaluate((el) => getComputedStyle(el).transform);
      log(`  Owner StatsGrid card 1 computed transform while hovered: ${transform}`);
      const glowOpacity = await firstCard.evaluate((el) => getComputedStyle(el, "::after").opacity);
      log(`  Owner StatsGrid card 1 ::after (cursor-glow) opacity while hovered: ${glowOpacity}`);
      await shot(page, "02-owner-dashboard-desktop-HOVER-card1");
    } else {
      log("  WARNING: could not locate .cursor-glow card to hover");
    }

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE_URL}/owner/dashboard`, { waitUntil: "load" });
    await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
    await shot(page, "03-owner-dashboard-mobile");
    await ctx.close();
  }

  // ── ARTIST DASHBOARD ──
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(`${BASE_URL}/login`, { waitUntil: "load" });
    await page.getByPlaceholder("you@studio.com").fill(artistEmail);
    await page.getByPlaceholder("••••••••").fill(PW);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL(/\/artist\/dashboard/, { timeout: 20000 });
    await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});

    await shot(page, "04-artist-dashboard-desktop-REST");

    const firstCard = page.locator(".cursor-glow").first();
    const box = await firstCard.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width * 0.85, box.y + box.height * 0.15, { steps: 12 });
      await page.waitForTimeout(150);
      const transform = await firstCard.evaluate((el) => getComputedStyle(el).transform);
      log(`  Artist Dashboard card 1 computed transform while hovered: ${transform}`);
      await shot(page, "05-artist-dashboard-desktop-HOVER-card1");
    }

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE_URL}/artist/dashboard`, { waitUntil: "load" });
    await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
    await shot(page, "06-artist-dashboard-mobile");
    await ctx.close();
  }

  // ── CLIENT PORTAL DASHBOARD (cookie injection, same proven technique) ──
  {
    const clientEmail = `${tag}-client@example.test`;
    const clientAuthId = await mkAuthUser(clientEmail, undefined);
    const otpHelper = createClient(SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: linkData } = await sb.auth.admin.generateLink({ type: "magiclink", email: clientEmail });
    const { data: verifyData } = await otpHelper.auth.verifyOtp({ email: clientEmail, token: linkData.properties.email_otp, type: "email" });

    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const projectRef = SUPABASE_URL.match(/https:\/\/([a-z0-9]+)\.supabase\.co/)[1];
    const cookieValue = "base64-" + Buffer.from(JSON.stringify(verifyData.session)).toString("base64url");
    await ctx.addCookies([{
      name: `sb-${projectRef}-auth-token`, value: cookieValue,
      domain: new URL(BASE_URL).hostname, path: "/", httpOnly: false, secure: BASE_URL.startsWith("https"), sameSite: "Lax",
    }]);
    const page = await ctx.newPage();
    await page.goto(`${BASE_URL}/portal/${subdomain}/dashboard`, { waitUntil: "load", timeout: 15000 });
    await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
    await shot(page, "07-client-portal-dashboard-desktop-REST");

    // Hover the magnetic "Start AI Consultation" CTA and measure its transform.
    const cta = page.getByRole("link", { name: /start ai consultation/i }).first();
    const ctaBox = await cta.boundingBox().catch(() => null);
    if (ctaBox) {
      await page.mouse.move(ctaBox.x + ctaBox.width * 0.85, ctaBox.y + ctaBox.height * 0.7, { steps: 10 });
      await page.waitForTimeout(150);
      const wrapper = page.locator("a", { hasText: /start ai consultation/i }).first().locator("xpath=..");
      const transform = await wrapper.evaluate((el) => getComputedStyle(el).transform).catch(() => "n/a");
      log(`  Client Portal magnetic CTA wrapper computed transform while hovered: ${transform}`);
      await shot(page, "08-client-portal-dashboard-desktop-HOVER-cta");
    } else {
      log("  WARNING: could not locate 'Start AI Consultation' CTA on Client Portal dashboard");
    }

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE_URL}/portal/${subdomain}/dashboard`, { waitUntil: "load" });
    await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
    await shot(page, "09-client-portal-dashboard-mobile");
    await ctx.close();

    await sb.from("client_accounts").delete().eq("email", clientEmail);
    await sb.auth.admin.deleteUser(clientAuthId).catch(() => {});
  }

  // ── AUTH LOGIN ──
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(`${BASE_URL}/login`, { waitUntil: "load" });
    await shot(page, "10-login-desktop");
    await ctx.close();
  }

  // ── REDUCED MOTION — confirm no crash + no tilt applied ──
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
    const page = await ctx.newPage();
    await page.goto(`${BASE_URL}/login`, { waitUntil: "load" });
    await page.getByPlaceholder("you@studio.com").fill(ownerEmail);
    await page.getByPlaceholder("••••••••").fill(PW);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL(/\/owner\/dashboard/, { timeout: 20000 });
    await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
    const firstCard = page.locator(".cursor-glow").first();
    const box = await firstCard.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width * 0.85, box.y + box.height * 0.15, { steps: 12 });
      await page.waitForTimeout(150);
      const transform = await firstCard.evaluate((el) => getComputedStyle(el).transform);
      log(`  REDUCED MOTION — Owner StatsGrid card transform while hovered (should be 'none'): ${transform}`);
    }
    await ctx.close();
  }

  // ── PERFORMANCE — Owner Dashboard nav timing ──
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(`${BASE_URL}/login`, { waitUntil: "load" });
    await page.getByPlaceholder("you@studio.com").fill(ownerEmail);
    await page.getByPlaceholder("••••••••").fill(PW);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL(/\/owner\/dashboard/, { timeout: 20000 });
    // Second nav (warm) — closer to real repeat-visit performance than the login redirect itself.
    const t0 = Date.now();
    await page.goto(`${BASE_URL}/owner/dashboard`, { waitUntil: "load" });
    const loadMs = Date.now() - t0;
    log(`  Owner Dashboard warm navigation: ${loadMs}ms`);
    await ctx.close();
  }
} finally {
  await browser.close().catch(() => {});
}

// Cleanup
for (const id of created.artists) await sb.from("artists").delete().eq("id", id);
for (const id of created.studios) await sb.from("studios").delete().eq("id", id);
for (const id of created.auth) await sb.auth.admin.deleteUser(id).catch(() => {});
const check = await sb.from("studios").select("id").in("id", created.studios);
log(`Cleanup — studios gone: ${(check.data ?? []).length === 0}`);
log("DONE");
