/**
 * Visual/functional QA sweep for the InkBook design-system upgrade
 * (feature/design-system-upgrade). Read/audit only, self-cleaning.
 * Run with: node scripts/qa-design-system-sweep.mjs
 *
 * Covers what the Chrome extension would normally cover when it's connected:
 * Owner Portal, Artist Portal, Client Portal (via documented OTP
 * cookie-injection — see memory project_client_portal_ai_consultation.md),
 * and unauthenticated Auth pages, at desktop + mobile viewports, checking
 * console errors, failed requests, horizontal overflow, broken images, and a
 * few redesign-specific behaviors (password eye toggle, reduced-motion).
 *
 * Auth pattern for Owner/Artist matches scripts/qa-overnight-*-sweep.mjs
 * (real /login UI, not magiclink injection — this project's Supabase Site
 * URL redirects to production, breaking magiclink for local dev). Client
 * Portal auth uses the proven admin.generateLink + verifyOtp + manual
 * @supabase/ssr cookie construction technique (no real inbox available).
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
const ANON_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const PROJECT_REF = SUPABASE_URL.match(/https:\/\/([a-z0-9]+)\.supabase\.co/)[1];
const BASE_URL = "http://localhost:3000";
const TAG = "QA-DESIGN-SWEEP";
const SCREENSHOT_DIR = "reports/design-qa-screenshots";
mkdirSync(SCREENSHOT_DIR, { recursive: true });

const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const created = { auth: [], studios: [], artists: [], clients: [], bookings: [] };
let failures = 0;
const findings = [];
const PASS = (m) => console.log("  PASS:", m);
const FAIL = (m) => { console.log("  FAIL:", m); failures++; findings.push(m); };
const NOTE = (m) => console.log("  NOTE:", m);
const HEAD = (m) => console.log("\n" + m + "\n" + "=".repeat(m.length));

const tag = `${TAG.toLowerCase()}${Date.now()}`;
const QA_PASSWORD = "Password123!";

async function checkPage(page, route, { viewport }) {
  const consoleErrors = [];
  const failedRequests = [];
  const onConsole = (msg) => {
    if (msg.type() !== "error") return;
    // Next.js App Router's own prefetch-cache logs this at error level when a
    // rapid automated navigation aborts an in-flight RSC prefetch from the
    // previous page — framework internals, not app code, and Next itself
    // falls back to a normal browser navigation (confirmed harmless: every
    // route still loads and passes its own checks). Not a real error.
    if (msg.text().includes("Failed to fetch RSC payload")) return;
    consoleErrors.push(msg.text());
  };
  const onFailed = (req) => {
    // ERR_ABORTED is a cancelled prefetch/navigation (Next.js Link hover
    // prefetch, or the previous page's in-flight requests cancelled by a
    // new navigation) — not a real network failure. Only real failures
    // (connection refused, DNS, timeout, etc.) count.
    if (req.failure()?.errorText === "net::ERR_ABORTED") return;
    failedRequests.push(req.url());
  };
  page.on("console", onConsole);
  page.on("requestfailed", onFailed);

  let status = null;
  try {
    const resp = await page.goto(BASE_URL + route, { waitUntil: "load", timeout: 20000 });
    status = resp?.status();
  } catch (e) {
    FAIL(`[${viewport}] ${route} — navigation error: ${e.message}`);
    page.off("console", onConsole);
    page.off("requestfailed", onFailed);
    return null;
  }

  const hasOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2
  ).catch(() => false);
  const brokenImgs = await page.evaluate(() =>
    Array.from(document.images).filter((img) => !img.complete || img.naturalWidth === 0).map((img) => img.src)
  ).catch(() => []);

  page.off("console", onConsole);
  page.off("requestfailed", onFailed);

  // "_rsc=" and bare-route aborts are Next.js App Router prefetch requests
  // cancelled by client-side navigation — not real network failures.
  const ignorable = (u) => u.includes("_vercel/insights") || u.includes("favicon") || u.includes("_rsc=") || u.includes("?_rsc");
  const realFailedRequests = failedRequests.filter((u) => !ignorable(u));

  let note = `[${viewport}] ${route} → ${status}`;
  if (hasOverflow) note += " | HORIZONTAL OVERFLOW";
  if (brokenImgs.length) note += ` | ${brokenImgs.length} broken image(s)`;
  if (consoleErrors.length) note += ` | ${consoleErrors.length} console error(s): ${consoleErrors.slice(0, 2).join(" / ")}`;
  if (realFailedRequests.length) note += ` | ${realFailedRequests.length} failed request(s): ${realFailedRequests.slice(0, 2).join(" / ")}`;

  const ok = status && status >= 200 && status < 400 && !hasOverflow && !brokenImgs.length && !consoleErrors.length && !realFailedRequests.length;
  if (ok) PASS(note); else FAIL(note);
  return { status, hasOverflow, brokenImgs, consoleErrors, failedRequests: realFailedRequests };
}

async function screenshot(page, name) {
  // Bounded settle wait — server components can still be streaming past the
  // `load` event (Suspense/loading.tsx fallback swapping in real content),
  // so a screenshot taken immediately after navigation can catch the
  // skeleton instead of the real page. Best-effort only; never blocks a
  // screenshot from being taken if the network never truly goes idle.
  await page.waitForLoadState("networkidle", { timeout: 4000 }).catch(() => {});
  await page.screenshot({ path: `${SCREENSHOT_DIR}/${name}.png`, fullPage: false }).catch((e) => NOTE(`screenshot failed for ${name}: ${e.message}`));
}

const browser = await chromium.launch({ headless: true });

// ═══════════════════════════════════════════════════════════════════════
// SETUP: seed studio + owner + artist + client
// ═══════════════════════════════════════════════════════════════════════
HEAD("Seed QA data");

async function mkAuthUser(email, password) {
  const { data, error } = await sb.auth.admin.createUser({ email, email_confirm: true, password });
  if (error) throw new Error(error.message);
  created.auth.push(data.user.id);
  return data.user.id;
}

const ownerEmail = `${tag}-owner@example.test`;
const artistEmail = `${tag}-artist@example.test`;
const clientEmail = `${tag}-client@example.test`;
const studioName = `[${TAG}] Studio`;
const subdomain = `${tag}-sub`;

const ownerId = await mkAuthUser(ownerEmail, QA_PASSWORD);
const { data: studioRow, error: studioErr } = await sb.from("studios").insert({
  name: studioName, subdomain, owner_id: ownerId, deposit_amount_cents: 5000,
}).select().single();
if (studioErr) throw new Error(studioErr.message);
created.studios.push(studioRow.id);

const artistUserId = await mkAuthUser(artistEmail, QA_PASSWORD);
const { data: artistRow } = await sb.from("artists").insert({
  studio_id: studioRow.id, user_id: artistUserId, name: "QA Artist", email: artistEmail, styles: ["Traditional"],
}).select().single();
created.artists.push(artistRow.id);

const { data: clientRow } = await sb.from("clients").insert({
  studio_id: studioRow.id, full_name: "QA Client", email: clientEmail, phone: "5555550111",
}).select().single();
created.clients.push(clientRow.id);

const { data: bookingRow } = await sb.from("bookings").insert({
  studio_id: studioRow.id, artist_id: artistRow.id, client_id: clientRow.id,
  date: "2027-01-15", time: "14:00", style: "Traditional", description: "QA test booking",
  status: "confirmed", deposit_amount_cents: 5000, deposit_paid: true,
}).select().single();
created.bookings.push(bookingRow.id);

const clientAuthId = await mkAuthUser(clientEmail, undefined);

NOTE(`studio=${studioRow.id} owner=${ownerId} artist=${artistRow.id} client-auth=${clientAuthId}`);

try {

// ═══════════════════════════════════════════════════════════════════════
// OWNER PORTAL — real /login UI session
// ═══════════════════════════════════════════════════════════════════════
HEAD("Owner Portal");
{
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  await page.goto(`${BASE_URL}/login`);
  await page.getByPlaceholder("you@studio.com").fill(ownerEmail);
  await page.getByPlaceholder("••••••••").fill(QA_PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/owner\/dashboard/, { timeout: 20000 }).catch(() => {});
  if (page.url().includes("/owner/dashboard")) PASS(`owner login → ${page.url()}`);
  else FAIL(`owner login did not land on /owner/dashboard — actual: ${page.url()}`);

  await screenshot(page, "owner-dashboard-desktop");

  // Sidebar sanity: white bg, violet active state, Lucide icons (not raw text glyphs)
  const sidebarIsLight = await page.evaluate(() => {
    const aside = document.querySelector("aside");
    if (!aside) return null;
    const bg = getComputedStyle(aside).backgroundColor;
    return bg;
  });
  NOTE(`owner sidebar background: ${sidebarIsLight}`);
  if (sidebarIsLight === "rgb(255, 255, 255)") PASS("owner sidebar is white (light system)");
  else FAIL(`owner sidebar background unexpected: ${sidebarIsLight}`);

  const OWNER_ROUTES = [
    "/owner/dashboard", "/owner/artists", "/owner/artists/new", `/owner/artists/${artistRow.id}`,
    "/owner/clients", "/owner/bookings", `/owner/bookings/${bookingRow.id}`, "/owner/consultations",
    "/owner/pipeline", "/owner/requests", "/owner/revenue", "/owner/reviews", "/owner/blacklist",
    "/owner/consent-forms", "/owner/waitlist", "/owner/knowledge", "/owner/messages", "/owner/settings",
    "/owner/settings/billing", "/owner/settings/studio",
  ];
  for (const viewport of [{ name: "desktop", w: 1440, h: 900 }, { name: "mobile", w: 390, h: 844 }]) {
    await page.setViewportSize({ width: viewport.w, height: viewport.h });
    for (const route of OWNER_ROUTES) await checkPage(page, route, { viewport: viewport.name });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE_URL}/owner/dashboard`, { waitUntil: "load" });
  await screenshot(page, "owner-dashboard-mobile");

  // Hover-lift / motion sanity on a StatsGrid card (desktop only — pointer-fine gated)
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${BASE_URL}/owner/dashboard`, { waitUntil: "load" });
  const motionCardExists = await page.evaluate(() => !!document.querySelector(".cursor-glow"));
  if (motionCardExists) PASS("MotionCard (.cursor-glow) present on Owner Dashboard");
  else FAIL("MotionCard not found on Owner Dashboard — expected on StatsGrid");

  await context.close();
}

// ═══════════════════════════════════════════════════════════════════════
// ARTIST PORTAL — real /login UI session
// ═══════════════════════════════════════════════════════════════════════
HEAD("Artist Portal");
{
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  await page.goto(`${BASE_URL}/login`);
  await page.getByPlaceholder("you@studio.com").fill(artistEmail);
  await page.getByPlaceholder("••••••••").fill(QA_PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/artist\/dashboard/, { timeout: 20000 }).catch(() => {});
  if (page.url().includes("/artist/dashboard")) PASS(`artist login → ${page.url()}`);
  else FAIL(`artist login did not land on /artist/dashboard — actual: ${page.url()}`);

  await screenshot(page, "artist-dashboard-desktop");

  const sidebarBg = await page.evaluate(() => {
    const aside = document.querySelector("aside");
    return aside ? getComputedStyle(aside).backgroundColor : null;
  });
  if (sidebarBg === "rgb(255, 255, 255)") PASS("artist sidebar is white (matches Owner)");
  else FAIL(`artist sidebar background unexpected: ${sidebarBg}`);

  const ARTIST_ROUTES = [
    "/artist/dashboard", "/artist/consultations", "/artist/schedule", "/artist/bookings",
    "/artist/requests", "/artist/messages", "/artist/portfolio", "/artist/flash",
    "/artist/earnings", "/artist/clients", "/artist/agreements",
  ];
  for (const viewport of [{ name: "desktop", w: 1440, h: 900 }, { name: "mobile", w: 390, h: 844 }]) {
    await page.setViewportSize({ width: viewport.w, height: viewport.h });
    for (const route of ARTIST_ROUTES) await checkPage(page, route, { viewport: viewport.name });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE_URL}/artist/dashboard`, { waitUntil: "load" });
  await screenshot(page, "artist-dashboard-mobile");

  await context.close();
}

// ═══════════════════════════════════════════════════════════════════════
// CLIENT PORTAL — OTP session via admin.generateLink + verifyOtp + cookie injection
// (no real inbox available — documented technique, see memory
//  project_client_portal_ai_consultation.md)
// ═══════════════════════════════════════════════════════════════════════
HEAD("Client Portal");
{
  let clientSession = null;
  try {
    const otpHelper = createClient(SUPABASE_URL, ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: linkData, error: linkErr } = await sb.auth.admin.generateLink({
      type: "magiclink", email: clientEmail,
    });
    if (linkErr) throw new Error(linkErr.message);
    const otpCode = linkData.properties?.email_otp;
    if (!otpCode) throw new Error("generateLink did not return email_otp");

    const { data: verifyData, error: verifyErr } = await otpHelper.auth.verifyOtp({
      email: clientEmail, token: otpCode, type: "email",
    });
    if (verifyErr) throw new Error(verifyErr.message);
    clientSession = verifyData.session;
    PASS("obtained client session via generateLink+verifyOtp (no real inbox needed)");
  } catch (e) {
    FAIL(`client OTP session setup failed: ${e.message}`);
  }

  if (clientSession) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const cookieValue = "base64-" + Buffer.from(JSON.stringify(clientSession)).toString("base64url");
    const cookieName = `sb-${PROJECT_REF}-auth-token`;
    // Chunk past ~3180 chars, same as documented — single cookie usually suffices for a fresh session.
    const chunks = [];
    for (let i = 0; i < cookieValue.length; i += 3180) chunks.push(cookieValue.slice(i, i + 3180));
    const cookies = (chunks.length === 1
      ? [{ name: cookieName, value: chunks[0] }]
      : chunks.map((c, i) => ({ name: `${cookieName}.${i}`, value: c }))
    ).map((c) => ({ ...c, domain: "localhost", path: "/", httpOnly: false, secure: false, sameSite: "Lax" }));
    await context.addCookies(cookies);

    const page = await context.newPage();
    const resp = await page.goto(`${BASE_URL}/portal/${subdomain}/dashboard`, { waitUntil: "load", timeout: 15000 }).catch((e) => { FAIL(`client portal nav error: ${e.message}`); return null; });
    if (resp && page.url().includes(`/portal/${subdomain}/dashboard`)) {
      PASS(`client portal cookie injection → ${page.url()}`);
      await screenshot(page, "client-portal-dashboard-desktop");

      const sidebarBg = await page.evaluate(() => {
        const aside = document.querySelector("aside");
        return aside ? getComputedStyle(aside).backgroundColor : null;
      });
      if (sidebarBg === "rgb(255, 255, 255)") PASS("client portal sidebar is white (matches Owner/Artist)");
      else FAIL(`client portal sidebar background unexpected: ${sidebarBg}`);

      const CLIENT_ROUTES = [
        "dashboard", "consultation", "projects", "bookings", "history", "messages", "settings",
      ];
      for (const viewport of [{ name: "desktop", w: 1440, h: 900 }, { name: "mobile", w: 390, h: 844 }]) {
        await page.setViewportSize({ width: viewport.w, height: viewport.h });
        for (const r of CLIENT_ROUTES) await checkPage(page, `/portal/${subdomain}/${r}`, { viewport: viewport.name });
      }
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(`${BASE_URL}/portal/${subdomain}/dashboard`, { waitUntil: "load" });
      await screenshot(page, "client-portal-dashboard-mobile");
    } else {
      FAIL(`client portal cookie injection did not land on dashboard — actual: ${page?.url()}`);
    }
    await context.close();
  }
}

// ═══════════════════════════════════════════════════════════════════════
// AUTH (unauthenticated) — Login/Register/Reset-password + password toggle behavior
// ═══════════════════════════════════════════════════════════════════════
HEAD("Auth pages");
{
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  for (const viewport of [{ name: "desktop", w: 1440, h: 900 }, { name: "mobile", w: 390, h: 844 }]) {
    await page.setViewportSize({ width: viewport.w, height: viewport.h });
    for (const route of ["/login", "/register", "/reset-password"]) {
      await checkPage(page, route, { viewport: viewport.name });
    }
  }

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${BASE_URL}/login`, { waitUntil: "load" });
  await screenshot(page, "login-desktop");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE_URL}/login`, { waitUntil: "load" });
  await screenshot(page, "login-mobile");
  await page.setViewportSize({ width: 1440, height: 900 });

  // Password eye toggle: behavioral check, not just DOM presence
  await page.goto(`${BASE_URL}/login`, { waitUntil: "load" });
  const pwInput = page.locator("#login-password");
  const initialType = await pwInput.getAttribute("type");
  const toggleBtn = page.getByRole("button", { name: /show password/i });
  const toggleVisible = await toggleBtn.isVisible().catch(() => false);
  if (!toggleVisible) {
    FAIL("password eye toggle button not found/visible on /login");
  } else {
    await toggleBtn.click();
    const afterType = await pwInput.getAttribute("type");
    if (initialType === "password" && afterType === "text") PASS("password eye toggle switches type password→text on click");
    else FAIL(`password eye toggle did not change input type as expected (before=${initialType} after=${afterType})`);
    const hideBtn = page.getByRole("button", { name: /hide password/i });
    const hideVisible = await hideBtn.isVisible().catch(() => false);
    if (hideVisible) PASS("toggle button aria-label flips to 'Hide password' when revealed");
    else FAIL("toggle button did not flip its accessible name after reveal");
  }

  // Reduced motion: MotionCard should not throw / should render normally
  await context.close();
  const reducedContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const reducedPage = await reducedContext.newPage();
  reducedPage.on("console", (msg) => { if (msg.type() === "error") FAIL(`console error under reduced-motion on /owner/dashboard: ${msg.text()}`); });
  try {
    await reducedPage.goto(`${BASE_URL}/login`, { waitUntil: "load", timeout: 20000 });
    await reducedPage.getByPlaceholder("you@studio.com").fill(ownerEmail);
    await reducedPage.getByPlaceholder("••••••••").fill(QA_PASSWORD);
    await reducedPage.getByRole("button", { name: /sign in/i }).click();
    await reducedPage.waitForURL(/\/owner\/dashboard/, { timeout: 20000 }).catch(() => {});
    if (reducedPage.url().includes("/owner/dashboard")) PASS("owner dashboard renders cleanly under prefers-reduced-motion: reduce");
    else FAIL(`reduced-motion owner login failed — actual: ${reducedPage.url()}`);
  } catch (e) {
    FAIL(`reduced-motion check threw: ${e.message}`);
  }
  await reducedContext.close();
}

} catch (e) {
  FAIL(`sweep crashed: ${e.message}`);
} finally {
  await browser.close().catch(() => {});
}

// ═══════════════════════════════════════════════════════════════════════
// CLEANUP — always runs, even if the sweep above crashed
// ═══════════════════════════════════════════════════════════════════════
HEAD("Cleanup");
for (const id of created.bookings) await sb.from("bookings").delete().eq("id", id);
for (const id of created.clients) await sb.from("clients").delete().eq("id", id);
for (const id of created.artists) await sb.from("artists").delete().eq("id", id);
await sb.from("client_accounts").delete().eq("email", clientEmail);
for (const id of created.studios) await sb.from("studios").delete().eq("id", id);
for (const id of created.auth) await sb.auth.admin.deleteUser(id).catch(() => {});

const checkStudios = await sb.from("studios").select("id").in("id", created.studios);
const checkArtists = await sb.from("artists").select("id").in("id", created.artists);
console.log("studios gone:", (checkStudios.data ?? []).length === 0);
console.log("artists gone:", (checkArtists.data ?? []).length === 0);

HEAD(`SWEEP COMPLETE — ${failures} finding(s)`);
if (findings.length) {
  console.log("\nAll findings:");
  findings.forEach((f) => console.log(" -", f));
}
process.exit(failures > 0 ? 1 : 0);
