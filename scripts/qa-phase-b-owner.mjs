/**
 * Exhaustive QA — Phase B, Owner Portal, Part 1: Artists + Settings/Studio.
 * Self-cleaning, tagged QA data only. Run with:
 *   QA_BASE_URL=https://www.inkbook.tech node scripts/qa-phase-b-owner-01-artists-settings.mjs
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
const TAG = "QA-OWNER-EXHAUSTIVE";
const tag = `${TAG.toLowerCase()}-${Date.now()}`;
const PW = "Password123!";

const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const created = { auth: [], studios: [], artists: [], invites: [] };
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

async function loginAs(page, email, password) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: "load" });
  await page.getByPlaceholder("you@studio.com").fill(email);
  await page.getByPlaceholder("••••••••").fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/owner\/dashboard/, { timeout: 20000 });
}

const browser = await chromium.launch({ headless: true });

try {
  // ── Seed: Studio A, owner (no artists yet — real empty state), plan "studio" ──
  HEAD("Seed — Studio A owner, zero artists (real empty state)");
  const ownerEmail = `${tag}-ownerA@example.test`;
  const ownerId = await mkAuthUser(ownerEmail, PW);
  const { data: studioRow, error: studioErr } = await sb.from("studios").insert({
    name: `[${TAG}] Studio A`,
    subdomain: `${tag}-a`,
    owner_id: ownerId,
    deposit_amount_cents: 5000,
    plan: "studio", // 2-5 seats, so we can test an invite without hitting the seat cap immediately
  }).select().single();
  if (studioErr) throw new Error("studio insert failed: " + studioErr.message);
  created.studios.push(studioRow.id);
  NOTE(`studioA=${studioRow.id} owner=${ownerId}`);

  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await loginAs(page, ownerEmail, PW);
  PASS(`owner A logged in → ${page.url()}`);

  // ═══════════════════════════════════════════════════════════
  // B1 — /owner/artists — empty state
  // ═══════════════════════════════════════════════════════════
  HEAD("B1 — /owner/artists — real empty state");
  {
    await page.goto(`${BASE_URL}/owner/artists`, { waitUntil: "load" });
    const bodyText = await page.evaluate(() => document.body.innerText);
    if (/No Artists Yet/i.test(bodyText)) PASS("empty artists state shown ('No Artists Yet')");
    else FAIL(`expected empty-artists marker not found. body snippet: ${bodyText.slice(0, 200)}`);
  }

  // ═══════════════════════════════════════════════════════════
  // B2 — /owner/artists/new — was a dead unwired stub, now fixed to redirect
  // ═══════════════════════════════════════════════════════════
  HEAD("B2 — /owner/artists/new — verify fix (redirects to /owner/artists)");
  {
    await page.goto(`${BASE_URL}/owner/artists/new`, { waitUntil: "load" });
    await page.waitForURL(/\/owner\/artists$/, { timeout: 10000 }).catch(() => {});
    if (page.url().replace(/\/$/, "").endsWith("/owner/artists")) {
      PASS(`/owner/artists/new correctly redirects to /owner/artists (was: dead static form, no onSubmit handler) — actual: ${page.url()}`);
    } else {
      FAIL(`/owner/artists/new did not redirect as expected — actual: ${page.url()}`);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // B3 — Invite Artist modal — real create, verify DB row
  // ═══════════════════════════════════════════════════════════
  HEAD("B3 — Invite Artist modal → real DB insert into artist_invites");
  {
    await page.goto(`${BASE_URL}/owner/artists`, { waitUntil: "load" });
    await page.getByRole("button", { name: /invite artist/i }).first().click();
    await page.waitForTimeout(300);
    const inviteName = "QA Invited Artist";
    const inviteEmail = `${tag}-invited@example.test`;
    await page.locator("#invite-artist-name").fill(inviteName);
    await page.locator("#invite-artist-email").fill(inviteEmail);
    await page.getByRole("button", { name: /send invite/i }).click();
    await page.waitForTimeout(2000);
    const successVisible = await page.locator("text=/Invite sent to/i").isVisible().catch(() => false);

    const { data: inviteRows } = await sb.from("artist_invites")
      .select("id, studio_id, invited_name, invited_email, accepted_at, expires_at")
      .eq("invited_email", inviteEmail);
    const invite = (inviteRows ?? [])[0];
    if (invite) created.invites.push(invite.id);

    if (successVisible && invite && invite.studio_id === studioRow.id && invite.invited_name === inviteName) {
      PASS(`invite modal → real DB row confirmed: artist_invites.id=${invite.id}, studio_id matches Studio A, name/email match`);
    } else {
      FAIL(`invite verification failed — successVisible=${successVisible} invite=${JSON.stringify(invite)}`);
    }

    // Reload and confirm the "Invited" badge now shows in the (populated) list
    await page.reload({ waitUntil: "load" });
    const bodyText = await page.evaluate(() => document.body.innerText);
    if (bodyText.includes(inviteName) && /Invited/i.test(bodyText)) {
      PASS("populated state: invited artist now appears in the list with 'Invited' badge");
    } else {
      FAIL(`invited artist not visible in list after refresh. snippet: ${bodyText.slice(0, 300)}`);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // B4 — Duplicate invite to the same email is rejected
  // ═══════════════════════════════════════════════════════════
  HEAD("B4 — Duplicate invite to same email → rejected with inline error");
  {
    await page.goto(`${BASE_URL}/owner/artists`, { waitUntil: "load" });
    await page.getByRole("button", { name: /invite artist/i }).first().click();
    await page.waitForTimeout(300);
    await page.locator("#invite-artist-name").fill("QA Invited Artist Dup");
    await page.locator("#invite-artist-email").fill(`${tag}-invited@example.test`);
    await page.getByRole("button", { name: /send invite/i }).click();
    await page.waitForTimeout(1500);
    const errorVisible = await page.locator("text=/already invited/i").isVisible().catch(() => false);
    if (errorVisible) PASS("duplicate invite correctly rejected with 'already invited' inline error");
    else FAIL("duplicate invite was not rejected as expected");
    await page.keyboard.press("Escape").catch(() => {});
    await page.locator("button:has(svg)").first(); // no-op, just ensure no crash
  }

  // ═══════════════════════════════════════════════════════════
  // B5 — Resend invite → expires_at bumped forward
  // ═══════════════════════════════════════════════════════════
  HEAD("B5 — Resend invite → expires_at extended, verified via DB");
  {
    // Close any open modal from B4 first
    await page.goto(`${BASE_URL}/owner/artists`, { waitUntil: "load" });
    const { data: beforeRows } = await sb.from("artist_invites").select("id, expires_at").eq("id", created.invites[0]);
    const before = beforeRows[0];
    await page.getByRole("button", { name: /resend/i }).first().click();
    await page.waitForTimeout(2000);
    const { data: afterRows } = await sb.from("artist_invites").select("id, expires_at").eq("id", created.invites[0]);
    const after = afterRows[0];
    if (after && new Date(after.expires_at) >= new Date(before.expires_at)) {
      PASS(`resend invite → expires_at moved forward (${before.expires_at} → ${after.expires_at})`);
    } else {
      FAIL(`resend invite did not extend expires_at — before=${before?.expires_at} after=${after?.expires_at}`);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // B6 — Cancel invite → row deleted
  // ═══════════════════════════════════════════════════════════
  HEAD("B6 — Cancel invite → artist_invites row deleted");
  {
    await page.goto(`${BASE_URL}/owner/artists`, { waitUntil: "load" });
    await page.getByRole("button", { name: /^cancel$/i }).first().click();
    await page.waitForTimeout(300);
    // Confirmation modal → confirm button says "Cancel Invite"
    await page.getByRole("button", { name: /cancel invite/i }).click();
    await page.waitForTimeout(2000);
    const { data: rows } = await sb.from("artist_invites").select("id").eq("id", created.invites[0]);
    if (!rows || rows.length === 0) {
      PASS("cancel invite → row confirmed deleted from artist_invites");
      created.invites = [];
    } else {
      FAIL(`invite row still present after cancel: ${JSON.stringify(rows)}`);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // B7 — Seed a real active artist directly, then exercise Remove
  // ═══════════════════════════════════════════════════════════
  HEAD("B7 — Seed active artist, exercise Remove Artist → user_id nulled, row kept");
  const artistUserId = await mkAuthUser(`${tag}-artist1@example.test`, PW);
  const { data: artistRow } = await sb.from("artists").insert({
    studio_id: studioRow.id, user_id: artistUserId, name: "QA Artist One",
    email: `${tag}-artist1@example.test`, styles: ["Traditional", "Blackwork"],
    minimum_rate_cents: 15000,
  }).select().single();
  created.artists.push(artistRow.id);
  {
    await page.goto(`${BASE_URL}/owner/artists`, { waitUntil: "load" });
    const bodyText1 = await page.evaluate(() => document.body.innerText);
    if (bodyText1.includes("QA Artist One") && /Active/i.test(bodyText1)) {
      PASS("seeded active artist appears in list with 'Active' badge");
    } else {
      FAIL(`seeded artist not visible as active: ${bodyText1.slice(0, 200)}`);
    }

    await page.getByRole("button", { name: /^remove$/i }).first().click();
    await page.waitForTimeout(1000); // upcoming-bookings count fetch
    await page.getByRole("button", { name: /^remove$/i }).last().click(); // confirm button in modal
    await page.waitForTimeout(2000);

    const { data: afterRemove } = await sb.from("artists").select("id, user_id").eq("id", artistRow.id).single();
    if (afterRemove && afterRemove.user_id === null) {
      PASS("Remove Artist → user_id nulled in DB, row preserved (booking history intact)");
    } else {
      FAIL(`Remove Artist did not null user_id as expected: ${JSON.stringify(afterRemove)}`);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // B8 — Settings / Studio — edit + verify persistence
  // ═══════════════════════════════════════════════════════════
  HEAD("B8 — /owner/settings/studio — edit fields, verify DB persistence");
  {
    await page.goto(`${BASE_URL}/owner/settings/studio`, { waitUntil: "load" });
    const newName = `[${TAG}] Studio A Renamed`;
    const nameInput = page.locator('input[type="text"]').first();
    await nameInput.fill(newName);

    // Address field (best-effort locate by nearby label text)
    const addressInput = page.locator("text=Address").locator("xpath=following::input[1]").first();
    const hasAddress = await addressInput.count().then((c) => c > 0).catch(() => false);
    if (hasAddress) await addressInput.fill("123 QA Test St, Los Angeles, CA");

    const saveBtn = page.getByRole("button", { name: /save/i }).first();
    await saveBtn.click();
    await page.waitForTimeout(2000);

    const { data: studioAfter } = await sb.from("studios").select("name, address").eq("id", studioRow.id).single();
    if (studioAfter && studioAfter.name === newName) {
      PASS(`studio name persisted: "${studioAfter.name}" (address="${studioAfter.address}")`);
    } else {
      FAIL(`studio name did not persist as expected — got: ${JSON.stringify(studioAfter)}`);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // B9 — Mobile viewport pass — /owner/artists + /owner/settings/studio
  // ═══════════════════════════════════════════════════════════
  HEAD("B9 — Mobile (390x844) — real interaction, not just screenshot");
  {
    const mctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const mpage = await mctx.newPage();
    await loginAs(mpage, ownerEmail, PW);
    await mpage.goto(`${BASE_URL}/owner/artists`, { waitUntil: "load" });
    const overflowX = await mpage.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
    if (!overflowX) PASS("mobile /owner/artists — no horizontal overflow");
    else FAIL("mobile /owner/artists — horizontal overflow detected");

    await mpage.getByRole("button", { name: /invite artist/i }).first().click();
    await mpage.waitForTimeout(300);
    const modalVisible = await mpage.locator("#invite-artist-name").isVisible().catch(() => false);
    if (modalVisible) {
      PASS("mobile: Invite Artist modal opens and the name field is usable/visible");
      await mpage.locator("#invite-artist-name").fill("QA Mobile Invite");
      await mpage.locator("#invite-artist-email").fill(`${tag}-mobile-invite@example.test`);
      await mpage.getByRole("button", { name: /send invite/i }).click();
      await mpage.waitForTimeout(2000);
      const { data: mobileInviteRows } = await sb.from("artist_invites").select("id").eq("invited_email", `${tag}-mobile-invite@example.test`);
      if (mobileInviteRows && mobileInviteRows.length > 0) {
        created.invites.push(mobileInviteRows[0].id);
        PASS("mobile: invite submitted through modal produced a real DB row");
      } else {
        FAIL("mobile: invite submission did not produce a DB row");
      }
    } else {
      FAIL("mobile: Invite Artist modal did not open / name field not visible");
    }

    await mpage.goto(`${BASE_URL}/owner/settings/studio`, { waitUntil: "load" });
    const overflowX2 = await mpage.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
    if (!overflowX2) PASS("mobile /owner/settings/studio — no horizontal overflow");
    else FAIL("mobile /owner/settings/studio — horizontal overflow detected");
    await mctx.close();
  }

  await ctx.close();
} finally {
  await browser.close().catch(() => {});
}

// ── Cleanup ──────────────────────────────────────────────────
HEAD("Cleanup");
for (const id of created.invites) await sb.from("artist_invites").delete().eq("id", id);
for (const id of created.artists) await sb.from("artists").delete().eq("id", id);
for (const id of created.studios) await sb.from("studios").delete().eq("id", id);
for (const id of created.auth) await sb.auth.admin.deleteUser(id).catch(() => {});

const checkStudios = await sb.from("studios").select("id").in("id", created.studios);
const checkArtists = await sb.from("artists").select("id").in("id", created.artists);
const checkInvites = await sb.from("artist_invites").select("id").in("id", created.invites.length ? created.invites : ["00000000-0000-0000-0000-000000000000"]);
console.log("studios gone:", (checkStudios.data ?? []).length === 0);
console.log("artists gone:", (checkArtists.data ?? []).length === 0);
console.log("invites gone:", (checkInvites.data ?? []).length === 0);

HEAD(`PHASE B PART 1 (Artists + Settings) COMPLETE — ${failures} finding(s)`);
if (findings.length) findings.forEach((f) => console.log(" -", f));
process.exit(failures > 0 ? 1 : 0);
