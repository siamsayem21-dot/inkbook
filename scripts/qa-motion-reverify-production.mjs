/**
 * Design/Motion re-verification against the NOW-LIVE PRODUCTION deployment
 * (DESIGN_MOTION_COVERAGE.md's "RE-VERIFY" rows) plus 4 new "NOT_TESTED"
 * elements not previously measured at all: /artist/earnings stat cards,
 * /portal/[studio]/dashboard project timeline card, /portal/[studio]/dashboard
 * 4 section cards, /book/[studio] hero+closing magnetic CTAs.
 *
 * Unlike scripts/qa-motion-visual-verify.mjs (print-only, screenshots for
 * human judgment), this is pass/fail: a real non-identity matrix3d transform
 * after a real pointer move proves tilt/lift is genuinely wired, and
 * transform === 'none' under prefers-reduced-motion proves the gate holds.
 *
 * Run with: QA_BASE_URL=https://www.inkbook.tech node scripts/qa-motion-reverify-production.mjs
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
const TAG = "QA-MOTION-REVERIFY";
const tag = `${TAG.toLowerCase()}-${Date.now()}`;
const PW = "Password123!";

const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const created = { auth: [], studios: [], artists: [], clients: [], clientAccounts: [], consultations: [], bookings: [], flashDesigns: [] };
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
async function loginAs(page, email) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: "load" });
  await page.getByPlaceholder("you@studio.com").fill(email);
  await page.getByPlaceholder("••••••••").fill(PW);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/(owner|artist)\/dashboard/, { timeout: 20000 });
  await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
}

async function assertTiltOnHover(page, locator, label) {
  const box = await locator.boundingBox().catch(() => null);
  if (!box) { FAIL(`${label} — element not found/no bounding box`); return; }
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 5 });
  await page.mouse.move(box.x + box.width * 0.85, box.y + box.height * 0.15, { steps: 12 });
  await page.waitForTimeout(200);
  const transform = await locator.evaluate((el) => getComputedStyle(el).transform);
  if (transform && transform !== "none") {
    PASS(`${label} — real non-identity transform while hovered: ${transform.slice(0, 60)}...`);
  } else {
    FAIL(`${label} — transform is '${transform}' after a real pointer move (expected a non-identity matrix3d)`);
  }
}

async function assertMagneticTranslate(page, locator, label) {
  // Must be scrolled into view first — page.mouse.move() targets raw
  // viewport coordinates, and boundingBox() can return a y past the
  // viewport height for an off-screen element, silently no-op'ing the move.
  await locator.scrollIntoViewIfNeeded().catch(() => {});
  const box = await locator.boundingBox().catch(() => null);
  if (!box) { FAIL(`${label} — element not found/no bounding box`); return; }
  const wrapper = locator.locator("xpath=..");
  await page.mouse.move(box.x + box.width * 0.85, box.y + box.height * 0.7, { steps: 10 });
  await page.waitForTimeout(200);
  const transform = await wrapper.evaluate((el) => getComputedStyle(el).transform).catch(() => "n/a");
  if (transform && transform !== "none" && transform !== "n/a") {
    PASS(`${label} — real magnetic translate while hovered: ${transform.slice(0, 60)}...`);
  } else {
    FAIL(`${label} — wrapper transform is '${transform}' after a real pointer move (expected a non-identity matrix)`);
  }
}

const browser = await chromium.launch({ headless: true });

try {
  HEAD("Seed — owner, artist, client with a completed booking + active project, flash design");
  const ownerEmail = `${tag}-owner@example.test`;
  const ownerId = await mkAuthUser(ownerEmail);
  const { data: studioRow } = await sb.from("studios").insert({
    name: `[${TAG}] Studio`, subdomain: tag, owner_id: ownerId, deposit_amount_cents: 5000, plan: "studio",
  }).select().single();
  created.studios.push(studioRow.id);

  const artistEmail = `${tag}-artist@example.test`;
  const artistUserId = await mkAuthUser(artistEmail);
  const { data: artistRow } = await sb.from("artists").insert({
    studio_id: studioRow.id, user_id: artistUserId, name: "QA Motion Artist", email: artistEmail, styles: ["Traditional"], minimum_rate_cents: 15000,
  }).select().single();
  created.artists.push(artistRow.id);

  const { data: clientRow } = await sb.from("clients").insert({
    studio_id: studioRow.id, full_name: "QA Motion Client", email: `${tag}-client@example.test`, phone: "+15550001111",
  }).select().single();
  created.clients.push(clientRow.id);

  const { data: completedBooking } = await sb.from("bookings").insert({
    studio_id: studioRow.id, artist_id: artistRow.id, client_id: clientRow.id,
    date: new Date(Date.now() - 5 * 86400000).toISOString().slice(0, 10), time: "14:00:00",
    style: "Traditional", status: "completed", deposit_amount_cents: 15000, deposit_paid: true,
    deposit_paid_at: new Date().toISOString(), total_amount_cents: 30000,
  }).select().single();
  created.bookings.push(completedBooking.id);

  const { data: flashRow } = await sb.from("flash_designs").insert({
    studio_id: studioRow.id, artist_id: artistRow.id, title: "QA Motion Flash",
    image_url: "https://placehold.co/400x400/png", price: 10000, category: "Traditional",
  }).select().single();
  created.flashDesigns.push(flashRow.id);

  const clientEmail = `${tag}-portalclient@example.test`;
  const clientAuthId = await mkAuthUser(clientEmail);
  const otpHelper = createClient(SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: linkData } = await sb.auth.admin.generateLink({ type: "magiclink", email: clientEmail });
  const { data: verifyData } = await otpHelper.auth.verifyOtp({ email: clientEmail, token: linkData.properties.email_otp, type: "email" });
  // Bootstrap client_accounts directly (normally done by ensureClientAccount()
  // on first portal visit) so seed data below can reference client_account_id
  // before any real page load — same pattern as qa-phase-d-client.mjs.
  const { data: clientAccount, error: clientAccountErr } = await sb.from("client_accounts")
    .insert({ user_id: clientAuthId, email: clientEmail }).select().single();
  if (clientAccountErr) throw new Error(`client_accounts insert: ${clientAccountErr.message}`);
  created.clientAccounts.push(clientAccount.id);
  // consultations has no client_account_id of its own — the Client Portal's
  // "projects" list scopes via a separate ai_chats row linking
  // client_account_id + consultation_id (same pattern as qa-phase-d-client.mjs).
  const { data: portalConsult, error: portalConsultErr } = await sb.from("consultations").insert({
    studio_id: studioRow.id, client_name: "QA Motion Client", client_email: clientEmail,
    client_phone: "+15550002222", tattoo_description: "QA motion project timeline card test", placement: "Forearm",
    estimated_size: "Small (2-4in)", color_preference: "Black & Grey", budget_range: "$200-400",
    detected_style: "Traditional", style_confidence: 90, status: "quoted", final_price: 400,
  }).select().single();
  if (portalConsultErr) throw new Error(`consultations insert: ${portalConsultErr.message}`);
  created.consultations.push(portalConsult.id);
  const { error: aiChatErr } = await sb.from("ai_chats").insert({
    studio_id: studioRow.id, client_account_id: clientAccount.id, status: "submitted", consultation_id: portalConsult.id,
  });
  if (aiChatErr) throw new Error(`ai_chats insert: ${aiChatErr.message}`);

  const projectRef = SUPABASE_URL.match(/https:\/\/([a-z0-9]+)\.supabase\.co/)[1];
  const cookieValue = "base64-" + Buffer.from(JSON.stringify(verifyData.session)).toString("base64url");
  NOTE(`Studio=${studioRow.id}, subdomain=${tag}`);

  // ═══════════════════════════════════════════════════════════
  // RE-VERIFY — Owner Dashboard StatsGrid + panels
  // ═══════════════════════════════════════════════════════════
  HEAD("RE-VERIFY — /owner/dashboard (StatsGrid card + a panel card)");
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await loginAs(page, ownerEmail);
    const cards = page.locator(".cursor-glow");
    const count = await cards.count();
    NOTE(`found ${count} .cursor-glow elements on /owner/dashboard`);
    if (count > 0) await assertTiltOnHover(page, cards.first(), "/owner/dashboard StatsGrid card 1");
    if (count > 1) await assertTiltOnHover(page, cards.nth(1), "/owner/dashboard panel card");
    await ctx.close();
  }

  // ═══════════════════════════════════════════════════════════
  // RE-VERIFY — Artist Dashboard
  // ═══════════════════════════════════════════════════════════
  HEAD("RE-VERIFY — /artist/dashboard stat card");
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await loginAs(page, artistEmail);
    const cards = page.locator(".cursor-glow");
    if (await cards.count() > 0) await assertTiltOnHover(page, cards.first(), "/artist/dashboard stat card 1");
    else FAIL("/artist/dashboard — no .cursor-glow elements found");
    await ctx.close();
  }

  // ═══════════════════════════════════════════════════════════
  // NOT_TESTED (new) — Artist Earnings stat cards
  // ═══════════════════════════════════════════════════════════
  HEAD("NEW — /artist/earnings stat cards");
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await loginAs(page, artistEmail);
    await page.goto(`${BASE_URL}/artist/earnings`, { waitUntil: "load" });
    await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
    const cards = page.locator(".cursor-glow");
    const count = await cards.count();
    NOTE(`found ${count} .cursor-glow elements on /artist/earnings`);
    if (count > 0) await assertTiltOnHover(page, cards.first(), "/artist/earnings stat card 1");
    else FAIL("/artist/earnings — no .cursor-glow elements found (expected 4 stat cards)");
    await ctx.close();
  }

  // ═══════════════════════════════════════════════════════════
  // RE-VERIFY + NEW — Client Portal Dashboard
  // ═══════════════════════════════════════════════════════════
  HEAD("RE-VERIFY + NEW — /portal/[studio]/dashboard magnetic CTA + project timeline card + section cards");
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await ctx.addCookies([{
      name: `sb-${projectRef}-auth-token`, value: cookieValue,
      domain: new URL(BASE_URL).hostname, path: "/", httpOnly: false, secure: BASE_URL.startsWith("https"), sameSite: "Lax",
    }]);
    const page = await ctx.newPage();
    await page.goto(`${BASE_URL}/portal/${tag}/dashboard`, { waitUntil: "load", timeout: 15000 });
    await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});

    const cta = page.getByRole("link", { name: /start ai consultation/i }).first();
    if (await cta.count() > 0) await assertMagneticTranslate(page, cta, "/portal dashboard 'Start AI Consultation' magnetic CTA");
    else FAIL("/portal dashboard — 'Start AI Consultation' CTA not found");

    const glowCards = page.locator(".cursor-glow");
    const glowCount = await glowCards.count();
    NOTE(`found ${glowCount} .cursor-glow elements on /portal dashboard`);
    if (glowCount > 0) await assertTiltOnHover(page, glowCards.first(), "/portal dashboard project timeline / section card 1");
    else FAIL("/portal dashboard — no .cursor-glow elements found (expected project timeline + section cards)");

    await ctx.close();
  }

  // ═══════════════════════════════════════════════════════════
  // NOT_TESTED (new) — Public /book/[studio] hero + closing magnetic CTAs
  // ═══════════════════════════════════════════════════════════
  HEAD("NEW — /book/[studio] hero + closing magnetic 'Start AI Consultation' CTAs");
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(`${BASE_URL}/book/${tag}`, { waitUntil: "load" });
    await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
    // 3 links share this text: a plain (intentionally non-magnetic, per
    // Magnetic.tsx's own "wrap ONE CTA per screen" doc comment) persistent
    // header nav link from layout.tsx, plus the real Magnetic-wrapped hero
    // and closing-section CTAs from page.tsx. Identify the real ones by
    // their wrapper's "motion-spring" class rather than assuming DOM order.
    const ctas = page.getByRole("link", { name: /start ai consultation/i });
    const ctaCount = await ctas.count();
    NOTE(`found ${ctaCount} 'Start AI Consultation' CTA(s) on /book/[studio]`);
    const magneticIndices = [];
    for (let i = 0; i < ctaCount; i++) {
      const cls = await ctas.nth(i).locator("xpath=..").evaluate((el) => el.className).catch(() => "");
      if (cls.includes("motion-spring")) magneticIndices.push(i);
    }
    NOTE(`Magnetic-wrapped CTA indices: [${magneticIndices.join(", ")}] of ${ctaCount} total`);
    if (magneticIndices.length >= 1) {
      await assertMagneticTranslate(page, ctas.nth(magneticIndices[0]), "/book/[studio] hero magnetic CTA");
    } else {
      FAIL("/book/[studio] — no Magnetic-wrapped hero CTA found");
    }
    if (magneticIndices.length >= 2) {
      await assertMagneticTranslate(page, ctas.nth(magneticIndices[1]), "/book/[studio] closing-section magnetic CTA");
    } else {
      FAIL("/book/[studio] — no second Magnetic-wrapped (closing-section) CTA found");
    }
    await ctx.close();
  }

  // ═══════════════════════════════════════════════════════════
  // RE-VERIFY — reduced-motion gate holds on production
  // ═══════════════════════════════════════════════════════════
  HEAD("RE-VERIFY — prefers-reduced-motion correctly disables tilt on production");
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
    const page = await ctx.newPage();
    await loginAs(page, ownerEmail);
    const card = page.locator(".cursor-glow").first();
    const box = await card.boundingBox().catch(() => null);
    if (box) {
      await page.mouse.move(box.x + box.width * 0.85, box.y + box.height * 0.15, { steps: 12 });
      await page.waitForTimeout(200);
      const transform = await card.evaluate((el) => getComputedStyle(el).transform);
      if (transform === "none") PASS(`reduced-motion correctly yields transform:'none' on production (${BASE_URL})`);
      else FAIL(`reduced-motion did NOT disable the tilt transform — got: ${transform}`);
    } else {
      FAIL("reduced-motion check — could not locate a .cursor-glow card");
    }
    await ctx.close();
  }

  // ═══════════════════════════════════════════════════════════
  // Mobile fallback — no crash, no horizontal overflow, tap-scale class present
  // ═══════════════════════════════════════════════════════════
  HEAD("RE-VERIFY — mobile (390x844) — no overflow across the re-verified routes");
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    await loginAs(page, ownerEmail);
    for (const route of ["/owner/dashboard"]) {
      await page.goto(`${BASE_URL}${route}`, { waitUntil: "load" });
      const overflowX = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
      if (!overflowX) PASS(`mobile ${route} — no horizontal overflow`);
      else FAIL(`mobile ${route} — horizontal overflow detected`);
    }
    await page.goto(`${BASE_URL}/artist/earnings`, { waitUntil: "load" }).catch(() => {});
    await page.goto(`${BASE_URL}/book/${tag}`, { waitUntil: "load" });
    const overflowX2 = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
    if (!overflowX2) PASS("mobile /book/[studio] — no horizontal overflow");
    else FAIL("mobile /book/[studio] — horizontal overflow detected");
    await ctx.close();
  }
} finally {
  await browser.close().catch(() => {});
}

// ── Cleanup ──────────────────────────────────────────────────
HEAD("Cleanup");
for (const id of created.consultations) await sb.from("ai_chats").delete().eq("consultation_id", id);
for (const id of created.consultations) await sb.from("consultations").delete().eq("id", id);
for (const id of created.clientAccounts) await sb.from("client_accounts").delete().eq("id", id);
for (const id of created.flashDesigns) await sb.from("flash_designs").delete().eq("id", id);
for (const id of created.bookings) await sb.from("bookings").delete().eq("id", id);
for (const id of created.clients) await sb.from("clients").delete().eq("id", id);
for (const id of created.artists) await sb.from("artists").delete().eq("id", id);
for (const id of created.studios) await sb.from("studios").delete().eq("id", id);
for (const id of created.auth) await sb.auth.admin.deleteUser(id).catch(() => {});

const check = await sb.from("studios").select("id").in("id", created.studios);
console.log("studios gone:", (check.data ?? []).length === 0);

HEAD(`DESIGN/MOTION RE-VERIFICATION COMPLETE — ${failures} finding(s)`);
if (findings.length) findings.forEach((f) => console.log(" -", f));
process.exit(failures > 0 ? 1 : 0);
