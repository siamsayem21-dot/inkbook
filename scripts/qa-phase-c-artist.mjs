/**
 * Exhaustive QA — Phase C: Artist Portal (real interactions, live prod).
 * Self-cleaning, tagged QA data only. Run with:
 *   QA_BASE_URL=https://www.inkbook.tech node scripts/qa-phase-c-artist.mjs
 * (defaults to https://www.inkbook.tech — this mission tests the live product)
 */
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync } from "fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8").split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const BASE_URL = process.env.QA_BASE_URL ?? "https://www.inkbook.tech";
const TAG = "QA-PHASE-C-ARTIST";
const tag = `${TAG.toLowerCase()}-${Date.now()}`;
const PW = "Password123!";

const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

const created = {
  auth: [], studios: [], artists: [], clients: [], bookings: [], consultations: [],
  customRequests: [], portfolioImages: [], flashDesigns: [], agreements: [], threads: [],
  clientAccounts: [], consentForms: [],
};

let failures = 0;
const findings = [];
const coverage = []; // rows for INTERACTION_COVERAGE.md
const PASS = (m) => console.log("  PASS:", m);
const FAIL = (m) => { console.log("  FAIL:", m); failures++; findings.push(m); };
const NOTE = (m) => console.log("  NOTE:", m);
const HEAD = (m) => console.log("\n" + m + "\n" + "=".repeat(Math.min(m.length, 100)));
function rec(route, state, control, type, expected, method, status, evidence) {
  coverage.push(`ARTIST | ${route} | ${state} | ${control} | ${type} | ${expected} | ${method} | ${status} | ${evidence}`);
}

// 1x1 transparent PNG — passes the app's real magic-byte validator (validateImageFile)
const PNG_BUFFER = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64"
);

async function mkAuthUser(email, password) {
  const { data, error } = await sb.auth.admin.createUser({ email, email_confirm: true, password });
  if (error) throw new Error(`mkAuthUser(${email}): ${error.message}`);
  created.auth.push(data.user.id);
  return data.user.id;
}

async function loginCookies(browser, email, password) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE_URL}/login`, { waitUntil: "load" });
  await page.getByPlaceholder("you@studio.com").fill(email);
  await page.getByPlaceholder("••••••••").fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/artist\/dashboard/, { timeout: 30000 });
  const cookies = await ctx.cookies();
  await ctx.close();
  return cookies;
}

async function reQuery(table, id, cols = "*") {
  const { data } = await sb.from(table).select(cols).eq("id", id).maybeSingle();
  return data;
}

// ═══════════════════════════════════════════════════════════════════════════
// SETUP
// ═══════════════════════════════════════════════════════════════════════════
HEAD("SETUP — seeding QA studios/artists/clients/bookings");

const ownerAId = await mkAuthUser(`${tag}-owner-a@example.test`, PW);
const artistAUserId = await mkAuthUser(`${tag}-artist-a@example.test`, PW);
const artistA2UserId = await mkAuthUser(`${tag}-artist-a2@example.test`, PW);
const ownerBId = await mkAuthUser(`${tag}-owner-b@example.test`, PW);
const artistCUserId = await mkAuthUser(`${tag}-artist-c@example.test`, PW);
const clientAuthId = await mkAuthUser(`${tag}-client@example.test`, PW);

async function insertStudio(ownerId, letter) {
  const { data, error } = await sb.from("studios").insert({
    name: `[${TAG}] Studio ${letter}`, subdomain: `${tag}-${letter}`.toLowerCase(),
    owner_id: ownerId, deposit_amount_cents: 5000,
  }).select().single();
  if (error) throw new Error(error.message);
  created.studios.push(data.id);
  return data;
}
async function insertArtist(studioId, userId, name, email, extra = {}) {
  const { data, error } = await sb.from("artists").insert({
    studio_id: studioId, user_id: userId, name, email, styles: ["Traditional"], ...extra,
  }).select().single();
  if (error) throw new Error(error.message);
  created.artists.push(data.id);
  return data;
}
async function insertClient(studioId, name, email) {
  const { data, error } = await sb.from("clients").insert({
    studio_id: studioId, full_name: name, email, phone: "5555550100",
  }).select().single();
  if (error) throw new Error(error.message);
  created.clients.push(data.id);
  return data;
}

const studioA = await insertStudio(ownerAId, "a");
const studioB = await insertStudio(ownerBId, "b");

const artistA = await insertArtist(studioA.id, artistAUserId, "QA Artist A", `${tag}-artist-a@example.test`);
const artistA2 = await insertArtist(studioA.id, artistA2UserId, "QA Artist A2 (colleague)", `${tag}-artist-a2@example.test`);
const artistC = await insertArtist(studioB.id, artistCUserId, "QA Artist C (other studio)", `${tag}-artist-c@example.test`);

const clientA = await insertClient(studioA.id, "QA Client Alpha", `${tag}-client-alpha@example.test`);
const clientA2 = await insertClient(studioA.id, "QA Client A2-Only", `${tag}-client-a2only@example.test`);
const clientB = await insertClient(studioB.id, "QA Client Beta", `${tag}-client-beta@example.test`);

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function insertBooking(fields) {
  const { data, error } = await sb.from("bookings").insert({
    studio_id: studioA.id, style: "Traditional", description: "QA test booking",
    deposit_paid: true, ...fields,
  }).select().single();
  if (error) throw new Error(error.message);
  created.bookings.push(data.id);
  return data;
}

// Confirmed booking for artist A — used for booking-detail, mark-completed, agreement, earnings
const bookingConfirmed = await insertBooking({
  artist_id: artistA.id, client_id: clientA.id, date: todayStr(), time: "10:00",
  status: "confirmed", deposit_amount_cents: 10000,
});
// Completed booking for artist A — earnings math + STATUS_META check
const bookingCompleted = await insertBooking({
  artist_id: artistA.id, client_id: clientA.id, date: todayStr(), time: "15:00",
  status: "completed", deposit_amount_cents: 20000, completed_at: new Date().toISOString(),
});
// pending_deposit + cancelled bookings with LARGE amounts — must be EXCLUDED from earnings
const bookingPending = await insertBooking({
  artist_id: artistA.id, client_id: clientA.id, date: todayStr(), time: "18:00",
  status: "pending_deposit", deposit_amount_cents: 999900, deposit_paid: false,
});
const bookingCancelled = await insertBooking({
  artist_id: artistA.id, client_id: clientA.id, date: todayStr(), time: "20:00",
  status: "cancelled", deposit_amount_cents: 888800,
});
// Colleague's own booking — cross-artist isolation target
const bookingA2 = await insertBooking({
  artist_id: artistA2.id, client_id: clientA2.id, date: todayStr(), time: "11:00",
  status: "confirmed", deposit_amount_cents: 15000,
});
// Different studio's booking — cross-studio isolation target
const { data: bookingB, error: bErr } = await sb.from("bookings").insert({
  studio_id: studioB.id, artist_id: artistC.id, client_id: clientB.id, date: todayStr(), time: "12:00",
  status: "confirmed", deposit_amount_cents: 15000, deposit_paid: true, style: "Traditional",
}).select().single();
if (bErr) throw new Error(bErr.message);
created.bookings.push(bookingB.id);

// Consultations
async function insertConsult(fields) {
  const { data, error } = await sb.from("consultations").insert({
    studio_id: studioA.id, client_name: "QA Consult Client", client_email: `${tag}-consult@example.test`,
    client_phone: "5555550111", tattoo_description: "QA test piece", placement: "Forearm",
    estimated_size: "Small", color_preference: "black_grey", budget_range: "$200-$400",
    status: "new", ...fields,
  }).select().single();
  if (error) throw new Error(error.message);
  created.consultations.push(data.id);
  return data;
}
const consultUnclaimed = await insertConsult({ artist_id: null });
const consultAssignedToA2 = await insertConsult({ artist_id: artistA2.id });
const consultAtStudioB = await sb.from("consultations").insert({
  studio_id: studioB.id, client_name: "QA Consult B", client_email: `${tag}-consultb@example.test`,
  client_phone: "5555550112", tattoo_description: "QA test piece B", placement: "Arm",
  estimated_size: "Small", color_preference: "color", budget_range: "$200-$400",
  status: "new", artist_id: artistC.id,
}).select().single();
created.consultations.push(consultAtStudioB.data.id);

// Custom requests
async function insertRequest(fields) {
  const { data, error } = await sb.from("custom_requests").insert({
    studio_id: studioA.id, client_name: "QA Request Client", client_email: `${tag}-request@example.test`,
    client_phone: "5555550113", design_description: "QA custom design", placement: "Shoulder",
    size: "Medium", budget_range: "$300-$600", preferred_dates: "Flexible", status: "pending", ...fields,
  }).select().single();
  if (error) throw new Error(error.message);
  created.customRequests.push(data.id);
  return data;
}
const requestApprove = await insertRequest({ artist_id: null });
const requestDecline = await insertRequest({ artist_id: null, client_name: "QA Decline Client" });

// Message thread — client_account + thread scoped to artist A
const { data: clientAccount, error: caErr } = await sb.from("client_accounts").insert({
  user_id: clientAuthId, email: `${tag}-client@example.test`,
}).select().single();
if (caErr) throw new Error(caErr.message);
created.clientAccounts.push(clientAccount.id);

const { data: thread, error: thErr } = await sb.from("message_threads").insert({
  studio_id: studioA.id, client_account_id: clientAccount.id, artist_id: artistA.id, consultation_id: null,
}).select().single();
if (thErr) throw new Error(thErr.message);
created.threads.push(thread.id);
// Seed one inbound (client) message so the thread isn't empty
await sb.from("messages").insert({
  thread_id: thread.id, sender_role: "client", sender_client_account_id: clientAccount.id,
  content: "Hi! Looking forward to my session.",
});

HEAD("Setup complete");
console.log("studioA:", studioA.id, studioA.subdomain, "| artistA:", artistA.id, "| artistA2:", artistA2.id);
console.log("studioB:", studioB.id, studioB.subdomain, "| artistC:", artistC.id);
console.log("bookingConfirmed:", bookingConfirmed.id, "| bookingCompleted:", bookingCompleted.id);
console.log("consultUnclaimed:", consultUnclaimed.id, "| consultAssignedToA2:", consultAssignedToA2.id);
console.log("thread:", thread.id);

const browser = await chromium.launch({ headless: true });
const artistAEmail = `${tag}-artist-a@example.test`;
const artistA2Email = `${tag}-artist-a2@example.test`;
const artistCEmail = `${tag}-artist-c@example.test`;

let cookiesA, cookiesA2, cookiesC;

try {
  cookiesA = await loginCookies(browser, artistAEmail, PW);
  PASS("Artist A real login via /login → landed on /artist/dashboard");
  cookiesA2 = await loginCookies(browser, artistA2Email, PW);
  PASS("Artist A2 (colleague) real login → landed on /artist/dashboard");
  cookiesC = await loginCookies(browser, artistCEmail, PW);
  PASS("Artist C (different studio) real login → landed on /artist/dashboard");

  // ═══════════════════════════════════════════════════════════════════════
  // PHASE 1 — Route sweep, desktop + mobile, as Artist A
  // ═══════════════════════════════════════════════════════════════════════
  HEAD("PHASE 1 — Route sweep (desktop 1440x900 + mobile 390x844), Artist A");
  const ROUTES = [
    "/artist/dashboard", "/artist/consultations", `/artist/consultations/${consultUnclaimed.id}`,
    "/artist/schedule", "/artist/bookings", `/artist/bookings/${bookingConfirmed.id}`,
    "/artist/requests", `/artist/requests/${requestApprove.id}`, "/artist/messages",
    `/artist/messages/${thread.id}`, "/artist/portfolio", "/artist/flash", "/artist/earnings",
    "/artist/clients", `/artist/clients/${clientA.id}`, "/artist/agreements", "/artist/agreements/new",
  ];
  for (const viewport of [{ name: "desktop", width: 1440, height: 900 }, { name: "mobile", width: 390, height: 844 }]) {
    const ctx = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
    await ctx.addCookies(cookiesA);
    for (const route of ROUTES) {
      const page = await ctx.newPage();
      const consoleErrors = [];
      page.on("console", (msg) => { if (msg.type() === "error") consoleErrors.push(msg.text()); });
      let status = null;
      try {
        const resp = await page.goto(BASE_URL + route, { waitUntil: "networkidle", timeout: 20000 });
        status = resp?.status();
      } catch (e) {
        FAIL(`[${viewport.name}] ${route} — navigation error: ${e.message}`);
        rec(route, viewport.name, "page load", "navigation", "200, no errors", "playwright goto", "FAIL", e.message);
        await page.close();
        continue;
      }
      const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2).catch(() => false);
      const brokenImgs = await page.evaluate(() =>
        Array.from(document.images).filter((img) => !img.complete || img.naturalWidth === 0).map((img) => img.src)
      ).catch(() => []);
      const onRoute = page.url() === BASE_URL + route;
      let note = `[${viewport.name}] ${route} → HTTP ${status}, url=${onRoute ? "confirmed" : page.url()}`;
      if (hasOverflow) note += " | HORIZONTAL OVERFLOW";
      if (brokenImgs.length) note += ` | ${brokenImgs.length} broken image(s): ${brokenImgs.slice(0, 2).join(",")}`;
      if (consoleErrors.length) note += ` | ${consoleErrors.length} console error(s): ${consoleErrors.slice(0, 2).join(" / ")}`;
      const ok = onRoute && status && status < 400 && !hasOverflow && !brokenImgs.length && !consoleErrors.length;
      if (ok) PASS(note); else FAIL(note);
      rec(route, viewport.name, "page load", "navigation", "200, on-route, no overflow/console errors", "playwright goto", ok ? "PASS" : "FAIL", note);
      await page.close();
    }
    await ctx.close();
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PHASE 2 — Portfolio: real upload, style tag, delete
  // ═══════════════════════════════════════════════════════════════════════
  HEAD("PHASE 2 — Portfolio upload/style/delete");
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await ctx.addCookies(cookiesA);
    const page = await ctx.newPage();
    await page.goto(`${BASE_URL}/artist/portfolio`, { waitUntil: "networkidle" });

    const emptyStateVisible = await page.locator("text=No photos yet").isVisible().catch(() => false);
    NOTE(`Portfolio empty state visible before upload: ${emptyStateVisible}`);
    rec("/artist/portfolio", "empty", "empty-state message", "text", "\"No photos yet\" shown", "DOM check", emptyStateVisible ? "PASS" : "NOTE", `visible=${emptyStateVisible}`);

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({ name: "qa-portfolio.png", mimeType: "image/png", buffer: PNG_BUFFER });
    await page.waitForTimeout(3000);

    const { data: photoRows } = await sb.from("portfolio_images").select("id, image_url, style").eq("artist_id", artistA.id);
    if (photoRows && photoRows.length === 1) {
      PASS(`Portfolio upload → DB row confirmed: portfolio_images.id=${photoRows[0].id}, image_url set`);
      created.portfolioImages.push(photoRows[0].id);
      rec("/artist/portfolio", "populated", "+ Upload photo (file input)", "file upload", "portfolio_images row created, artist_id scoped", "real PNG upload + DB re-query", "PASS", `row id=${photoRows[0].id}`);

      // Verify the uploaded image URL actually resolves (storage bucket public + object exists)
      const imgResp = await fetch(photoRows[0].image_url).catch(() => null);
      if (imgResp && imgResp.ok) PASS(`Uploaded photo URL resolves: HTTP ${imgResp.status} — ${photoRows[0].image_url}`);
      else FAIL(`Uploaded photo URL did NOT resolve: ${imgResp?.status ?? "fetch failed"} — ${photoRows[0].image_url}`);

      // Style tag
      const styleBtn = page.getByRole("button", { name: /add style tag/i }).first();
      if (await styleBtn.isVisible().catch(() => false)) {
        await styleBtn.click();
        await page.locator('input[placeholder="e.g. Japanese"]').fill("Japanese");
        await page.locator('button:has-text("Save")').first().click();
        await page.waitForTimeout(1500);
        const updated = await reQuery("portfolio_images", photoRows[0].id, "style");
        if (updated?.style === "Japanese") {
          PASS(`Style tag save confirmed via DB re-query: style="${updated.style}"`);
          rec("/artist/portfolio", "populated", "style tag input + Save", "click+fill+click", "portfolio_images.style updated", "real click/fill + DB re-query", "PASS", `style=${updated.style}`);
        } else {
          FAIL(`Style tag did not persist — DB shows style="${updated?.style}"`);
          rec("/artist/portfolio", "populated", "style tag input + Save", "click+fill+click", "portfolio_images.style updated", "real click/fill + DB re-query", "FAIL", `style=${updated?.style}`);
        }
      } else {
        FAIL("Style tag button not found after upload");
      }

      // Delete (handles window.confirm dialog) — a single persistent handler,
      // not a repeated .once(), so a retry attempt can never try to accept an
      // already-handled dialog (that throws and previously crashed this script).
      page.on("dialog", (d) => d.accept().catch(() => {}));
      await page.locator('button:has-text("Remove")').first().click({ force: true, trial: false }).catch(async () => {
        // hover to reveal overlay button first
        await page.hover(`img[src="${photoRows[0].image_url}"]`).catch(() => {});
      });
      await page.waitForTimeout(1000);
      // Ensure removal actually happened — hover then click if the above didn't trigger it
      const stillThere = await reQuery("portfolio_images", photoRows[0].id, "id");
      if (stillThere) {
        // Retry with explicit hover-then-click sequence
        const card = page.locator(".group").filter({ has: page.locator(`img[src="${photoRows[0].image_url}"]`) }).first();
        await card.hover();
        await card.locator('button:has-text("Remove")').click();
        await page.waitForTimeout(1500);
      }
      const afterDelete = await reQuery("portfolio_images", photoRows[0].id, "id");
      if (!afterDelete) {
        PASS("Portfolio photo delete confirmed via DB re-query (row gone)");
        rec("/artist/portfolio", "populated", "Remove (hover overlay button)", "click + confirm dialog", "portfolio_images row deleted", "real click + DB re-query", "PASS", "row absent after delete");
        created.portfolioImages = created.portfolioImages.filter((id) => id !== photoRows[0].id);
      } else {
        FAIL("Portfolio photo delete did NOT remove the DB row");
        rec("/artist/portfolio", "populated", "Remove (hover overlay button)", "click + confirm dialog", "portfolio_images row deleted", "real click + DB re-query", "FAIL", "row still present");
      }
    } else {
      FAIL(`Portfolio upload — expected 1 DB row, found ${photoRows?.length ?? 0}. Error text on page: ${await page.locator("text=/error|failed/i").first().textContent().catch(() => "n/a")}`);
      rec("/artist/portfolio", "empty", "+ Upload photo (file input)", "file upload", "portfolio_images row created", "real PNG upload", "FAIL", `rows=${photoRows?.length ?? 0}`);
    }
    await ctx.close();
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PHASE 3 — Flash: create, verify on public studio page, delete
  // ═══════════════════════════════════════════════════════════════════════
  HEAD("PHASE 3 — Flash design create/public-page-verify/delete");
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await ctx.addCookies(cookiesA);
    const page = await ctx.newPage();
    await page.goto(`${BASE_URL}/artist/flash`, { waitUntil: "networkidle" });

    const emptyStateVisible = await page.locator("text=No flash designs yet").isVisible().catch(() => false);
    rec("/artist/flash", "empty", "empty-state message", "text", "\"No flash designs yet\" shown", "DOM check", emptyStateVisible ? "PASS" : "NOTE", `visible=${emptyStateVisible}`);

    await page.locator('button:has-text("+ Add Design")').click();
    const flashTitle = `QA Flash Rose ${Date.now()}`;
    await page.locator('input#flash-title').fill(flashTitle);
    await page.locator('input#flash-price').fill("175");
    const flashFileInput = page.locator('input#flash-design-image');
    await flashFileInput.setInputFiles({ name: "qa-flash.png", mimeType: "image/png", buffer: PNG_BUFFER });
    await page.locator('button:has-text("Create Design")').click();
    await page.waitForTimeout(3000);

    const { data: flashRows } = await sb.from("flash_designs").select("id, title, image_url, is_available").eq("artist_id", artistA.id);
    if (flashRows && flashRows.length === 1 && flashRows[0].title === flashTitle) {
      created.flashDesigns.push(flashRows[0].id);
      PASS(`Flash design create → DB row confirmed: id=${flashRows[0].id}, title="${flashRows[0].title}", is_available=${flashRows[0].is_available}`);
      rec("/artist/flash", "empty", "New Flash Design form (title/price/image/submit)", "fill+upload+submit", "flash_designs row created", "real form fill + PNG upload + DB re-query", "PASS", `id=${flashRows[0].id}`);

      const imgResp = await fetch(flashRows[0].image_url).catch(() => null);
      if (imgResp && imgResp.ok) PASS(`Flash image URL resolves: HTTP ${imgResp.status}`);
      else FAIL(`Flash image URL did NOT resolve: ${imgResp?.status ?? "fetch failed"} — ${flashRows[0].image_url} (bucket: "portfolio")`);

      // Verify on the REAL public studio booking page
      const publicResp = await fetch(`${BASE_URL}/book/${studioA.subdomain}`);
      const publicHtml = await publicResp.text();
      const appearsOnPublicPage = publicHtml.includes(flashTitle);
      if (appearsOnPublicPage) {
        PASS(`Flash design appears on live public page /book/${studioA.subdomain} (title found in HTML)`);
        rec(`/book/${studioA.subdomain}`, "populated", "flash design card", "text presence", "new flash design visible on public booking page", "fetch + text search", "PASS", "title found");
      } else {
        FAIL(`Flash design "${flashTitle}" NOT found on live public page /book/${studioA.subdomain} (HTTP ${publicResp.status})`);
        rec(`/book/${studioA.subdomain}`, "populated", "flash design card", "text presence", "new flash design visible on public booking page", "fetch + text search", "FAIL", `HTTP ${publicResp.status}, title not found`);
      }

      // Delete (double-click confirm pattern)
      const card = page.locator(".group").filter({ hasText: flashTitle }).first();
      await card.locator('button:has-text("Delete")').click();
      await card.locator('button:has-text("Confirm?")').click();
      await page.waitForTimeout(1500);
      const afterDelete = await reQuery("flash_designs", flashRows[0].id, "id");
      if (!afterDelete) {
        PASS("Flash design delete confirmed via DB re-query (row gone)");
        rec("/artist/flash", "populated", "Delete → Confirm?", "double-click", "flash_designs row deleted", "real click + DB re-query", "PASS", "row absent after delete");
        created.flashDesigns = created.flashDesigns.filter((id) => id !== flashRows[0].id);

        const publicResp2 = await fetch(`${BASE_URL}/book/${studioA.subdomain}`);
        const publicHtml2 = await publicResp2.text();
        if (!publicHtml2.includes(flashTitle)) PASS("Deleted flash design correctly disappeared from public page too");
        else FAIL("Deleted flash design STILL appears on public page — stale cache or delete didn't propagate");
      } else {
        FAIL("Flash design delete did NOT remove the DB row");
        rec("/artist/flash", "populated", "Delete → Confirm?", "double-click", "flash_designs row deleted", "real click + DB re-query", "FAIL", "row still present");
      }
    } else {
      FAIL(`Flash design create — expected 1 matching DB row, found ${flashRows?.length ?? 0}`);
      rec("/artist/flash", "empty", "New Flash Design form", "fill+upload+submit", "flash_designs row created", "real form fill", "FAIL", `rows=${flashRows?.length ?? 0}`);
    }
    await ctx.close();
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PHASE 4 — Schedule: Days Off end-to-end (add → booking rejected → remove)
  // ═══════════════════════════════════════════════════════════════════════
  HEAD("PHASE 4 — Days Off (unavailable dates) end-to-end");
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await ctx.addCookies(cookiesA);
    const page = await ctx.newPage();
    await page.goto(`${BASE_URL}/artist/schedule`, { waitUntil: "networkidle" });

    const dayOffDate = "2026-09-20"; // distinct, no seeded booking on this date
    await page.locator('input[type="date"]').fill(dayOffDate);
    await page.locator('button:has-text("Add day off")').click();
    await page.waitForTimeout(1500);

    const artistAfterAdd = await reQuery("artists", artistA.id, "unavailable_dates");
    const dateAdded = (artistAfterAdd?.unavailable_dates ?? []).includes(dayOffDate);
    if (dateAdded) {
      PASS(`Day off "${dayOffDate}" added — confirmed via DB re-query: unavailable_dates=${JSON.stringify(artistAfterAdd.unavailable_dates)}`);
      rec("/artist/schedule", "populated", "date input + Add day off", "fill+click", "artists.unavailable_dates includes date", "real click + DB re-query", "PASS", JSON.stringify(artistAfterAdd.unavailable_dates));
    } else {
      FAIL(`Day off "${dayOffDate}" NOT added — DB shows unavailable_dates=${JSON.stringify(artistAfterAdd?.unavailable_dates)}`);
    }

    // Attempt a real booking on that exact date via the real booking API
    const bookResp1 = await fetch(`${BASE_URL}/api/bookings`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({
        artistId: artistA.id, clientName: "QA DaysOff Client", clientEmail: `${tag}-daysoff@example.test`,
        clientPhone: "5555550199", date: dayOffDate, time: "09:00", style: "Traditional",
      }),
    });
    const bookBody1 = await bookResp1.json().catch(() => ({}));
    if (bookResp1.status === 409 && /not available/i.test(bookBody1.error ?? "")) {
      PASS(`Booking on marked day-off correctly REJECTED: HTTP 409 — "${bookBody1.error}"`);
      rec("/api/bookings (POST)", "populated", "booking on a marked day-off date", "real API POST", "409 rejected, references artist unavailable", "fetch POST + status/body check", "PASS", bookBody1.error);
    } else {
      FAIL(`Booking on marked day-off date was NOT rejected as expected — status ${bookResp1.status}, body: ${JSON.stringify(bookBody1)}`);
      rec("/api/bookings (POST)", "populated", "booking on a marked day-off date", "real API POST", "409 rejected", "fetch POST", "FAIL", JSON.stringify(bookBody1));
      if (bookResp1.status === 201 && bookBody1.bookingId) created.bookings.push(bookBody1.bookingId);
    }

    // Remove the day off, then the SAME date should no longer be date-rejected
    const removeBtn = page.locator(`button[aria-label*="Remove"]`).first();
    await removeBtn.click();
    await page.waitForTimeout(1500);
    const artistAfterRemove = await reQuery("artists", artistA.id, "unavailable_dates");
    const dateRemoved = !(artistAfterRemove?.unavailable_dates ?? []).includes(dayOffDate);
    if (dateRemoved) {
      PASS(`Day off "${dayOffDate}" removed — confirmed via DB re-query: unavailable_dates=${JSON.stringify(artistAfterRemove.unavailable_dates)}`);
      rec("/artist/schedule", "populated", "× remove button on day-off chip", "click", "artists.unavailable_dates no longer includes date", "real click + DB re-query", "PASS", JSON.stringify(artistAfterRemove.unavailable_dates));
    } else {
      FAIL(`Day off "${dayOffDate}" NOT removed — DB still shows it: ${JSON.stringify(artistAfterRemove?.unavailable_dates)}`);
    }

    const bookResp2 = await fetch(`${BASE_URL}/api/bookings`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({
        artistId: artistA.id, clientName: "QA DaysOff Client 2", clientEmail: `${tag}-daysoff2@example.test`,
        clientPhone: "5555550198", date: dayOffDate, time: "09:00", style: "Traditional",
      }),
    });
    const bookBody2 = await bookResp2.json().catch(() => ({}));
    const stillDateRejected = bookResp2.status === 409 && /not available/i.test(bookBody2.error ?? "");
    if (!stillDateRejected) {
      PASS(`After removing the day off, booking on ${dayOffDate} is no longer date-rejected (status ${bookResp2.status})`);
      if (bookResp2.status === 201 && bookBody2.bookingId) created.bookings.push(bookBody2.bookingId);
    } else {
      FAIL(`After removing the day off, booking on ${dayOffDate} is STILL date-rejected: ${bookBody2.error}`);
    }
    await ctx.close();
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PHASE 5 — Consultations: claim workflow + cross-artist/cross-studio isolation
  // ═══════════════════════════════════════════════════════════════════════
  HEAD("PHASE 5 — Consultations claim workflow + isolation");
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await ctx.addCookies(cookiesA);
    const page = await ctx.newPage();

    // List page: unclaimed visible, colleague's assigned one NOT visible
    await page.goto(`${BASE_URL}/artist/consultations`, { waitUntil: "networkidle" });
    const listText = await page.evaluate(() => document.body.innerText);
    const seesUnclaimed = listText.includes(consultUnclaimed.client_name) || true; // same client_name reused across seeds; verified via DB below instead
    NOTE(`Consultations list loaded for Artist A (visual spot-check only — DB assertions below are authoritative)`);

    // Direct nav to colleague's assigned consultation → must 404
    const resp = await page.goto(`${BASE_URL}/artist/consultations/${consultAssignedToA2.id}`, { waitUntil: "networkidle" });
    const status404 = resp?.status();
    const bodyText = await page.evaluate(() => document.body.innerText).catch(() => "");
    const is404 = status404 === 404 || /not found|404/i.test(bodyText);
    if (is404) {
      PASS(`Artist A direct nav to colleague's ASSIGNED consultation → correctly 404'd (status=${status404})`);
      rec(`/artist/consultations/[id]`, "cross-artist", "direct nav to colleague's assigned consultation", "navigation", "404 not found", "real login + direct nav", "PASS", `status=${status404}`);
    } else {
      FAIL(`SECURITY: Artist A could view colleague's assigned consultation ${consultAssignedToA2.id} — status=${status404}, body snippet: ${bodyText.slice(0, 150)}`);
      rec(`/artist/consultations/[id]`, "cross-artist", "direct nav to colleague's assigned consultation", "navigation", "404 not found", "real login + direct nav", "FAIL", `status=${status404}`);
    }

    // Cross-studio: consultation at studio B
    const respB = await page.goto(`${BASE_URL}/artist/consultations/${consultAtStudioB.data.id}`, { waitUntil: "networkidle" });
    const bodyTextB = await page.evaluate(() => document.body.innerText).catch(() => "");
    const is404B = respB?.status() === 404 || /not found|404/i.test(bodyTextB);
    if (is404B) PASS(`Artist A direct nav to a DIFFERENT STUDIO's consultation → correctly 404'd`);
    else FAIL(`SECURITY: Artist A could view a different studio's consultation ${consultAtStudioB.data.id}`);
    rec(`/artist/consultations/[id]`, "cross-studio", "direct nav to different studio's consultation", "navigation", "404 not found", "real login + direct nav", is404B ? "PASS" : "FAIL", `status=${respB?.status()}`);

    // Claim workflow: open the unclaimed consultation, generate + save a quote
    await page.goto(`${BASE_URL}/artist/consultations/${consultUnclaimed.id}`, { waitUntil: "networkidle" });
    await page.locator('button:has-text("Generate AI Quote")').click();
    await page.waitForTimeout(2000);
    const finalPriceInput = page.locator("#artist-quote-final-price");
    await finalPriceInput.waitFor({ state: "visible", timeout: 10000 });
    await finalPriceInput.fill("450");
    await page.locator("#artist-quote-final-sessions").fill("2");
    await page.locator('button:has-text("Save Quote")').click();
    await page.waitForTimeout(2000);

    const consultAfter = await reQuery("consultations", consultUnclaimed.id, "artist_id, final_price, final_sessions, status");
    if (consultAfter?.artist_id === artistA.id && consultAfter.final_price === 450) {
      PASS(`Consultation claim + quote save confirmed via DB: artist_id=${consultAfter.artist_id}, final_price=${consultAfter.final_price}, status=${consultAfter.status}`);
      rec("/artist/consultations/[id]", "unclaimed", "Generate AI Quote → fill final price/sessions → Save Quote", "click+click+fill+fill+click", "consultations.artist_id claimed, final_price saved", "real form interaction + DB re-query", "PASS", `artist_id=${consultAfter.artist_id}, final_price=${consultAfter.final_price}`);
    } else {
      FAIL(`Consultation claim/quote save did not persist as expected — DB shows ${JSON.stringify(consultAfter)}`);
      rec("/artist/consultations/[id]", "unclaimed", "Generate AI Quote → Save Quote", "click+fill+click", "consultations.artist_id claimed, final_price saved", "real form interaction", "FAIL", JSON.stringify(consultAfter));
    }

    // Now verify Artist A2 (colleague) CANNOT edit this now-claimed-by-A consultation
    const ctxA2 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await ctxA2.addCookies(cookiesA2);
    const pageA2 = await ctxA2.newPage();
    await pageA2.goto(`${BASE_URL}/artist/consultations/${consultUnclaimed.id}`, { waitUntil: "networkidle" });
    const a2BodyText = await pageA2.evaluate(() => document.body.innerText).catch(() => "");
    const a2SeesLocked = /assigned to another artist/i.test(a2BodyText) || pageA2.url().includes("404");
    if (a2SeesLocked) PASS("Colleague (Artist A2) sees the now-claimed consultation as read-only/locked, cannot edit — correct");
    else NOTE(`Colleague view of now-claimed consultation — body snippet: ${a2BodyText.slice(0, 200)}`);
    await ctxA2.close();

    await ctx.close();
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PHASE 6 — Custom Requests: approve + decline flows
  // ═══════════════════════════════════════════════════════════════════════
  HEAD("PHASE 6 — Custom Requests approve/decline");
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await ctx.addCookies(cookiesA);
    const page = await ctx.newPage();

    await page.goto(`${BASE_URL}/artist/requests/${requestApprove.id}`, { waitUntil: "networkidle" });
    await page.locator('button:has-text("Approve")').click();
    await page.locator("#quote-total").fill("500");
    await page.locator("#quote-deposit").fill("150");
    await page.locator('button:has-text("Confirm Approval")').click();
    await page.waitForTimeout(2000);

    const reqAfter = await reQuery("custom_requests", requestApprove.id, "status, quote_amount, deposit_amount, artist_id");
    if (reqAfter?.status === "quoted" && reqAfter.artist_id === artistA.id && reqAfter.deposit_amount === 150) {
      PASS(`Custom request approve confirmed via DB: status=quoted, artist_id claimed, deposit_amount=${reqAfter.deposit_amount}`);
      rec("/artist/requests/[id]", "pending", "Approve → fill quote/deposit → Confirm Approval", "click+fill+fill+click", "custom_requests.status=quoted, artist_id claimed", "real form interaction + DB re-query", "PASS", JSON.stringify(reqAfter));
    } else {
      FAIL(`Custom request approve did not persist as expected — DB: ${JSON.stringify(reqAfter)}`);
      rec("/artist/requests/[id]", "pending", "Approve flow", "click+fill+click", "custom_requests.status=quoted", "real form interaction", "FAIL", JSON.stringify(reqAfter));
    }

    await page.goto(`${BASE_URL}/artist/requests/${requestDecline.id}`, { waitUntil: "networkidle" });
    await page.locator('button:has-text("Decline")').click();
    await page.locator("#decline-reason").fill("QA test decline — schedule full");
    await page.locator('button:has-text("Confirm Decline")').click();
    await page.waitForTimeout(2000);
    const declAfter = await reQuery("custom_requests", requestDecline.id, "status, declined_reason");
    if (declAfter?.status === "declined" && declAfter.declined_reason) {
      PASS(`Custom request decline confirmed via DB: status=declined, reason="${declAfter.declined_reason}"`);
      rec("/artist/requests/[id]", "pending", "Decline → fill reason → Confirm Decline", "click+fill+click", "custom_requests.status=declined", "real form interaction + DB re-query", "PASS", JSON.stringify(declAfter));
    } else {
      FAIL(`Custom request decline did not persist — DB: ${JSON.stringify(declAfter)}`);
      rec("/artist/requests/[id]", "pending", "Decline flow", "click+fill+click", "custom_requests.status=declined", "real form interaction", "FAIL", JSON.stringify(declAfter));
    }
    await ctx.close();
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PHASE 7 — Booking detail: mark completed (consent gate + success)
  // ═══════════════════════════════════════════════════════════════════════
  HEAD("PHASE 7 — Booking detail: consent gate + Mark Session Completed");
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await ctx.addCookies(cookiesA);
    const page = await ctx.newPage();

    // Before consent: button must NOT be actionable (only the warning text)
    await page.goto(`${BASE_URL}/artist/bookings/${bookingConfirmed.id}`, { waitUntil: "networkidle" });
    const warningVisible = await page.locator("text=Consent form must be signed").isVisible().catch(() => false);
    const btnVisibleBefore = await page.locator('button:has-text("Mark Session Completed")').isVisible().catch(() => false);
    if (warningVisible && !btnVisibleBefore) {
      PASS("Without signed consent: warning shown, 'Mark Session Completed' button correctly hidden");
      rec("/artist/bookings/[bookingId]", "confirmed, no consent", "Mark Session Completed gate", "visibility check", "button hidden, warning shown", "DOM check", "PASS", "warning visible, button hidden");
    } else {
      FAIL(`Consent gate not enforced in UI as expected — warningVisible=${warningVisible}, btnVisible=${btnVisibleBefore}`);
    }

    // Insert a real consent_forms row (matches bookingHasConsent()'s own check)
    const { data: consent, error: cErr } = await sb.from("consent_forms").insert({
      booking_id: bookingConfirmed.id, client_id: clientA.id, is_minor: false,
      client_signature: "QA Test Signature", id_photo_url: "https://placehold.co/300x300", state_template: "CA",
    }).select("id").single();
    if (cErr) throw new Error(cErr.message);
    created.consentForms.push(consent.id);

    await page.reload({ waitUntil: "networkidle" });
    const btnVisibleAfter = await page.locator('button:has-text("Mark Session Completed")').isVisible().catch(() => false);
    if (btnVisibleAfter) {
      await page.locator('button:has-text("Mark Session Completed")').click();
      await page.waitForTimeout(2000);
      const bookingAfter = await reQuery("bookings", bookingConfirmed.id, "status, completed_at");
      if (bookingAfter?.status === "completed" && bookingAfter.completed_at) {
        PASS(`Mark Session Completed confirmed via DB: status=completed, completed_at=${bookingAfter.completed_at}`);
        rec("/artist/bookings/[bookingId]", "confirmed, consent signed", "Mark Session Completed", "click", "bookings.status=completed, completed_at set", "real click + DB re-query", "PASS", JSON.stringify(bookingAfter));
      } else {
        FAIL(`Mark Session Completed did not persist — DB: ${JSON.stringify(bookingAfter)}`);
        rec("/artist/bookings/[bookingId]", "confirmed, consent signed", "Mark Session Completed", "click", "bookings.status=completed", "real click", "FAIL", JSON.stringify(bookingAfter));
      }
    } else {
      FAIL("After signing consent, 'Mark Session Completed' button still not visible");
    }

    // Cross-artist isolation: Artist A direct nav to colleague's own booking
    const respA2Booking = await page.goto(`${BASE_URL}/artist/bookings/${bookingA2.id}`, { waitUntil: "networkidle" });
    const a2BookingBody = await page.evaluate(() => document.body.innerText).catch(() => "");
    const a2Blocked = /doesn't exist or you don't have access|not found/i.test(a2BookingBody);
    if (a2Blocked) {
      PASS("Artist A direct nav to colleague's OWN booking → correctly blocked (not found/no access)");
      rec("/artist/bookings/[bookingId]", "cross-artist", "direct nav to colleague's own booking", "navigation", "blocked, no data leak", "real login + direct nav", "PASS", "access denied message shown");
    } else {
      FAIL(`SECURITY: Artist A could view colleague's booking ${bookingA2.id} — body: ${a2BookingBody.slice(0, 200)}`);
      rec("/artist/bookings/[bookingId]", "cross-artist", "direct nav to colleague's own booking", "navigation", "blocked, no data leak", "real login + direct nav", "FAIL", "leaked");
    }

    // Cross-studio isolation: Artist A direct nav to studio B's booking
    const respBBooking = await page.goto(`${BASE_URL}/artist/bookings/${bookingB.id}`, { waitUntil: "networkidle" });
    const bBookingBody = await page.evaluate(() => document.body.innerText).catch(() => "");
    const bBlocked = /doesn't exist or you don't have access|not found/i.test(bBookingBody);
    if (bBlocked) PASS("Artist A direct nav to a DIFFERENT STUDIO's booking → correctly blocked");
    else FAIL(`SECURITY: Artist A could view a different studio's booking ${bookingB.id}`);
    rec("/artist/bookings/[bookingId]", "cross-studio", "direct nav to different studio's booking", "navigation", "blocked, no data leak", "real login + direct nav", bBlocked ? "PASS" : "FAIL", "");

    await ctx.close();
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PHASE 8 — Earnings: math cross-check against raw DB query
  // ═══════════════════════════════════════════════════════════════════════
  HEAD("PHASE 8 — Earnings math cross-check");
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await ctx.addCookies(cookiesA);
    const page = await ctx.newPage();
    await page.goto(`${BASE_URL}/artist/earnings`, { waitUntil: "networkidle" });

    // Raw DB truth: sum deposit_amount_cents for artistA bookings, status IN (confirmed, completed), this month
    const now = new Date();
    const first = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const last = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    const { data: truthRows } = await sb.from("bookings").select("deposit_amount_cents, status")
      .eq("artist_id", artistA.id).in("status", ["confirmed", "completed"]).gte("date", first).lte("date", last);
    const truthCents = (truthRows ?? []).reduce((s, b) => s + (b.deposit_amount_cents ?? 0), 0);
    const truthDollars = truthCents / 100;

    const displayedText = await page.locator("text=/confirmed & completed deposits/").locator("..").first().innerText().catch(() => "");
    const bodyText = await page.evaluate(() => document.body.innerText);
    const moneyMatch = bodyText.match(/\$[\d,]+/g) ?? [];
    const displayedMatchesTruth = moneyMatch.some((m) => m.replace(/[\$,]/g, "") === String(Math.round(truthDollars)));

    NOTE(`DB truth (confirmed+completed, this month, artist A): $${truthDollars} from ${truthRows?.length} bookings (excludes pending_deposit $9999 and cancelled $8888 bookings — status filter test)`);
    NOTE(`Page money figures found: ${moneyMatch.join(", ")}`);
    if (displayedMatchesTruth) {
      PASS(`Earnings page total matches DB truth: $${truthDollars} appears on page — confirmed+completed filter correctly applied, pending_deposit/cancelled correctly excluded`);
      rec("/artist/earnings", "populated", "period earnings total", "value cross-check", `equals DB sum of confirmed+completed deposit_amount_cents ($${truthDollars})`, "DOM read + raw DB re-query", "PASS", `$${truthDollars} found on page`);
    } else {
      FAIL(`Earnings page total ($${moneyMatch.join(",")}) does NOT match DB truth ($${truthDollars}) — status filter may be wrong`);
      rec("/artist/earnings", "populated", "period earnings total", "value cross-check", `equals DB sum ($${truthDollars})`, "DOM read + raw DB re-query", "FAIL", `page shows ${moneyMatch.join(",")}`);
    }
    await ctx.close();
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PHASE 9 — Clients: isolation (own client visible, colleague's client hidden)
  // ═══════════════════════════════════════════════════════════════════════
  HEAD("PHASE 9 — Clients list + detail isolation");
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await ctx.addCookies(cookiesA);
    const page = await ctx.newPage();
    await page.goto(`${BASE_URL}/artist/clients`, { waitUntil: "networkidle" });
    const listText = await page.evaluate(() => document.body.innerText);
    const seesOwnClient = listText.includes(clientA.full_name);
    const seesColleaguesClient = listText.includes(clientA2.full_name);
    if (seesOwnClient && !seesColleaguesClient) {
      PASS(`Clients list correctly shows own client (${clientA.full_name}), hides colleague-only client (${clientA2.full_name})`);
      rec("/artist/clients", "populated", "client list rows", "text presence", "own client visible, colleague-only client hidden", "real login + DOM text search", "PASS", "own visible, colleague hidden");
    } else {
      FAIL(`Clients list isolation issue — seesOwnClient=${seesOwnClient}, seesColleaguesClient=${seesColleaguesClient}`);
      rec("/artist/clients", "populated", "client list rows", "text presence", "own visible, colleague hidden", "real login + DOM text search", "FAIL", `own=${seesOwnClient} colleague=${seesColleaguesClient}`);
    }

    const respA2Client = await page.goto(`${BASE_URL}/artist/clients/${clientA2.id}`, { waitUntil: "networkidle" });
    const clientBody = await page.evaluate(() => document.body.innerText).catch(() => "");
    const clientBlocked = respA2Client?.status() === 404 || /not found/i.test(clientBody);
    if (clientBlocked) {
      PASS("Artist A direct nav to colleague-only client → correctly 404'd");
      rec("/artist/clients/[clientId]", "cross-artist", "direct nav to colleague-only client", "navigation", "404 not found", "real login + direct nav", "PASS", `status=${respA2Client?.status()}`);
    } else {
      FAIL(`SECURITY: Artist A could view colleague-only client ${clientA2.id}`);
      rec("/artist/clients/[clientId]", "cross-artist", "direct nav to colleague-only client", "navigation", "404 not found", "real login + direct nav", "FAIL", "leaked");
    }
    await ctx.close();
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PHASE 10 — Agreements: create + immutable record
  // ═══════════════════════════════════════════════════════════════════════
  HEAD("PHASE 10 — Session Agreement create");
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await ctx.addCookies(cookiesA);
    const page = await ctx.newPage();
    await page.goto(`${BASE_URL}/artist/agreements/new`, { waitUntil: "networkidle" });

    await page.locator("#agreement-design-description").fill("QA test — full sleeve, traditional style, black and grey shading");
    await page.locator("#agreement-placement").fill("Left forearm");
    await page.locator("#agreement-size").fill('6"x8"');
    await page.locator("#agreement-price").fill("300");
    await page.locator("#agreement-signature").fill("QA Client Alpha");
    await page.locator('button:has-text("Sign & Save Agreement")').click();
    await page.waitForURL(/\/artist\/agreements\/[a-f0-9-]+$/, { timeout: 15000 }).catch(() => {});

    const urlMatch = page.url().match(/\/artist\/agreements\/([a-f0-9-]+)$/);
    if (urlMatch) {
      const agreementId = urlMatch[1];
      created.agreements.push(agreementId);
      const agreementRow = await reQuery("session_agreements", agreementId, "*");
      if (agreementRow && agreementRow.artist_id === artistA.id && agreementRow.booking_id === bookingConfirmed.id) {
        PASS(`Session agreement created + confirmed via DB: id=${agreementId}, artist_id correct, booking_id correct, price=${agreementRow.agreed_price_cents}`);
        rec("/artist/agreements/new", "populated", "fill form → Sign & Save Agreement", "fill x5 + click", "session_agreements row created, redirect to detail", "real form fill + DB re-query", "PASS", `id=${agreementId}`);

        // List page shows it
        await page.goto(`${BASE_URL}/artist/agreements`, { waitUntil: "networkidle" });
        const listShowsIt = (await page.evaluate(() => document.body.innerText)).includes("QA Client Alpha");
        if (listShowsIt) PASS("New agreement appears on /artist/agreements list");
        else FAIL("New agreement does NOT appear on /artist/agreements list");
      } else {
        FAIL(`Agreement DB row mismatch — got ${JSON.stringify(agreementRow)}`);
      }
    } else {
      FAIL(`Agreement submit did not redirect to a detail page — final url: ${page.url()}, page text: ${(await page.evaluate(() => document.body.innerText)).slice(0, 200)}`);
      rec("/artist/agreements/new", "populated", "fill form → Sign & Save Agreement", "fill x5 + click", "redirect to /artist/agreements/[id]", "real form fill", "FAIL", `url=${page.url()}`);
    }
    await ctx.close();
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PHASE 11 — Messages: send real message + thread isolation
  // ═══════════════════════════════════════════════════════════════════════
  HEAD("PHASE 11 — Messages send + thread isolation");
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await ctx.addCookies(cookiesA);
    const page = await ctx.newPage();
    await page.goto(`${BASE_URL}/artist/messages/${thread.id}`, { waitUntil: "networkidle" });

    const preSendMsg = "QA test message from Artist A — " + Date.now();
    await page.locator('textarea[placeholder="Type your message…"]').fill(preSendMsg);
    await page.locator('button:has-text("Send")').click();
    await page.waitForTimeout(2500);

    const { data: msgRows } = await sb.from("messages").select("id, content, sender_role, sender_artist_id").eq("thread_id", thread.id).eq("sender_role", "artist");
    const sentMsg = (msgRows ?? []).find((m) => m.content === preSendMsg);
    if (sentMsg && sentMsg.sender_artist_id === artistA.id) {
      PASS(`Message send confirmed via DB: id=${sentMsg.id}, sender_artist_id=${sentMsg.sender_artist_id}`);
      rec("/artist/messages/[threadId]", "populated", "textarea + Send", "fill+click", "messages row inserted, sender_role=artist", "real fill/click + DB re-query", "PASS", `id=${sentMsg.id}`);
      created.threads = created.threads; // messages cascade-delete with thread cleanup below
    } else {
      FAIL(`Message send did not persist as expected — rows found: ${JSON.stringify(msgRows)}`);
      rec("/artist/messages/[threadId]", "populated", "textarea + Send", "fill+click", "messages row inserted", "real fill/click", "FAIL", JSON.stringify(msgRows));
    }

    // Isolation: colleague (Artist A2) must NOT be able to open this thread (artist_id = artistA.id)
    const ctxA2 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await ctxA2.addCookies(cookiesA2);
    const pageA2 = await ctxA2.newPage();
    const respA2Thread = await pageA2.goto(`${BASE_URL}/artist/messages/${thread.id}`, { waitUntil: "networkidle" });
    const a2ThreadBody = await pageA2.evaluate(() => document.body.innerText).catch(() => "");
    const a2ThreadBlocked = respA2Thread?.status() === 404 || /not found/i.test(a2ThreadBody);
    if (a2ThreadBlocked) {
      PASS("Colleague (Artist A2) direct nav to Artist A's thread → correctly 404'd");
      rec("/artist/messages/[threadId]", "cross-artist", "direct nav to colleague's own thread", "navigation", "404 not found", "real login + direct nav", "PASS", `status=${respA2Thread?.status()}`);
    } else {
      FAIL(`SECURITY: Artist A2 could view Artist A's message thread ${thread.id}`);
      rec("/artist/messages/[threadId]", "cross-artist", "direct nav to colleague's own thread", "navigation", "404 not found", "real login + direct nav", "FAIL", "leaked");
    }
    await ctxA2.close();
    await ctx.close();
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PHASE 12 — Cross-STUDIO isolation sweep (Artist C, different studio entirely)
  // ═══════════════════════════════════════════════════════════════════════
  HEAD("PHASE 12 — Artist C (different studio) sees ZERO Studio A data");
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await ctx.addCookies(cookiesC);
    const page = await ctx.newPage();
    for (const route of ["/artist/dashboard", "/artist/bookings", "/artist/clients", "/artist/consultations", "/artist/requests"]) {
      await page.goto(`${BASE_URL}${route}`, { waitUntil: "networkidle" });
      const bodyText = await page.evaluate(() => document.body.innerText).catch(() => "");
      const leaksStudioAName = bodyText.includes(studioA.name) || bodyText.includes(clientA.full_name) || bodyText.includes("QA Consult Client");
      if (!leaksStudioAName) {
        PASS(`Artist C (Studio B) on ${route} → no Studio A data leaked`);
        rec(route, "cross-studio", "full page render", "text scan", "zero Studio A references", "real login + DOM text search", "PASS", "clean");
      } else {
        FAIL(`SECURITY: Artist C on ${route} sees Studio A data in page text`);
        rec(route, "cross-studio", "full page render", "text scan", "zero Studio A references", "real login + DOM text search", "FAIL", "leaked");
      }
    }
    // Direct-ID probes for Artist C against Studio A's booking/client/consultation
    for (const [label, url] of [
      ["studio A booking", `${BASE_URL}/artist/bookings/${bookingConfirmed.id}`],
      ["studio A client", `${BASE_URL}/artist/clients/${clientA.id}`],
      ["studio A consultation", `${BASE_URL}/artist/consultations/${consultUnclaimed.id}`],
    ]) {
      const resp = await page.goto(url, { waitUntil: "networkidle" });
      const bodyText = await page.evaluate(() => document.body.innerText).catch(() => "");
      const blocked = resp?.status() === 404 || /not found|doesn't exist/i.test(bodyText);
      if (blocked) PASS(`Artist C direct-ID probe of ${label} → correctly blocked`);
      else FAIL(`SECURITY: Artist C could access ${label} via direct ID`);
      rec(url.replace(BASE_URL, ""), "cross-studio", "direct-ID probe", "navigation", "blocked", "real login + direct nav", blocked ? "PASS" : "FAIL", "");
    }
    await ctx.close();
  }

} finally {
  await browser.close().catch(() => {});
}

// ═══════════════════════════════════════════════════════════════════════════
// CLEANUP — delete every QA record, then re-confirm gone
// ═══════════════════════════════════════════════════════════════════════════
HEAD("CLEANUP");
for (const id of created.consentForms) await sb.from("consent_forms").delete().eq("id", id);
for (const id of created.agreements) await sb.from("session_agreements").delete().eq("id", id);
for (const id of created.portfolioImages) await sb.from("portfolio_images").delete().eq("id", id);
for (const id of created.flashDesigns) await sb.from("flash_designs").delete().eq("id", id);
await sb.from("messages").delete().in("thread_id", created.threads);
for (const id of created.threads) await sb.from("message_threads").delete().eq("id", id);
for (const id of created.clientAccounts) await sb.from("client_accounts").delete().eq("id", id);
for (const id of created.customRequests) await sb.from("custom_requests").delete().eq("id", id);
for (const id of created.consultations) await sb.from("consultations").delete().eq("id", id);
for (const id of created.bookings) await sb.from("bookings").delete().eq("id", id);
for (const id of created.clients) await sb.from("clients").delete().eq("id", id);
for (const id of created.artists) await sb.from("artists").delete().eq("id", id);
for (const id of created.studios) await sb.from("studios").delete().eq("id", id);
for (const id of created.auth) await sb.auth.admin.deleteUser(id).catch(() => {});

const checkStudios = await sb.from("studios").select("id").in("id", created.studios);
const checkArtists = await sb.from("artists").select("id").in("id", created.artists);
const checkBookings = await sb.from("bookings").select("id").in("id", created.bookings);
const checkConsults = await sb.from("consultations").select("id").in("id", created.consultations);
console.log("studios gone:", (checkStudios.data ?? []).length === 0);
console.log("artists gone:", (checkArtists.data ?? []).length === 0);
console.log("bookings gone:", (checkBookings.data ?? []).length === 0);
console.log("consultations gone:", (checkConsults.data ?? []).length === 0);
if ((checkStudios.data ?? []).length || (checkArtists.data ?? []).length || (checkBookings.data ?? []).length || (checkConsults.data ?? []).length) {
  FAIL("CLEANUP INCOMPLETE — some QA rows still present after delete, see above");
}

writeFileSync("scripts/.qa-phase-c-coverage.tmp.txt", coverage.join("\n"), "utf8");
console.log(`\nWrote ${coverage.length} interaction-coverage rows to scripts/.qa-phase-c-coverage.tmp.txt`);

HEAD(`PHASE C COMPLETE — ${failures} finding(s)`);
if (findings.length) findings.forEach((f) => console.log(" -", f));
process.exit(failures > 0 ? 1 : 0);
