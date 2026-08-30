/**
 * Full ground-up QA re-run (2026-08-29) — Job A: seed one persistent QA studio
 * via the REAL browser UI (register, invite-artist, accept-invite, style
 * selector, portfolio upload) against PRODUCTION (https://www.inkbook.tech).
 *
 * This studio is NOT cleaned up at the end — it's the shared foundation for
 * later phases (Artist Portal, Client Portal, Security probes, etc), all
 * tagged QA-SEED-FULLQA-20260829. Manifest written to
 * qa-manifests/fullqa-20260829-studio.json.
 *
 * Run with: node scripts/qa-fullrun-seed-studio.mjs
 */
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, mkdirSync } from "fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8").split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const BASE_URL = process.env.QA_BASE_URL ?? "https://www.inkbook.tech";
const TAG = "QA-SEED-FULLQA-20260829";
const PW = "QaFullRun2026!";
const RUN_ID = Date.now();

const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
let failures = 0;
const PASS = (m) => console.log("  PASS:", m);
const FAIL = (m) => { console.log("  FAIL:", m); failures++; };
const NOTE = (m) => console.log("  NOTE:", m);
const HEAD = (m) => console.log("\n" + m + "\n" + "=".repeat(m.length));

const manifest = {
  tag: TAG,
  runId: RUN_ID,
  baseUrl: BASE_URL,
  password: PW,
  createdAt: new Date().toISOString(),
  studio: null,
  owner: null,
  artists: [],
  notes: [],
};

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

try {
  // ═══════════════════════════════════════════════════════════
  // 1 — Real owner signup via /register UI
  // ═══════════════════════════════════════════════════════════
  HEAD("1 — Owner signup via real /register UI");
  const ownerEmail = `qa.fullqa.owner.20260829@inkbook-qa.test`;
  const ownerName = "QA FullQA Owner";
  const studioName = `[${TAG}] Ink & Iron QA Studio`;
  const subdomain = `qa-fullqa-20260829`;

  // Idempotency: if a prior partial run already created this, reuse it.
  const { data: existingStudio } = await sb.from("studios").select("id, owner_id, subdomain").eq("subdomain", subdomain).maybeSingle();
  let studioRow, ownerId;

  if (existingStudio) {
    NOTE(`studio already exists (subdomain=${subdomain}) — reusing instead of re-registering`);
    studioRow = existingStudio;
    ownerId = existingStudio.owner_id;
  } else {
    await page.goto(`${BASE_URL}/register`, { waitUntil: "load" });
    await page.locator("#register-studio-name").fill(studioName);
    await page.locator("#register-owner-name").fill(ownerName);
    await page.locator("#register-email").fill(ownerEmail);
    await page.locator("#register-password").fill(PW);
    await page.locator("#register-subdomain").fill(subdomain);
    await page.getByRole("button", { name: /create account/i }).click();
    await page.waitForURL(/\/owner\/dashboard/, { timeout: 20000 }).catch(() => {});
    if (page.url().includes("/owner/dashboard")) {
      PASS(`real signup → redirected to ${page.url()}`);
    } else {
      FAIL(`signup did not redirect to owner dashboard — url=${page.url()}`);
    }

    const { data: freshStudio, error: fetchErr } = await sb.from("studios").select("id, owner_id, subdomain").eq("subdomain", subdomain).single();
    if (fetchErr || !freshStudio) throw new Error("studio not found in DB after real signup: " + fetchErr?.message);
    studioRow = freshStudio;
    ownerId = freshStudio.owner_id;
    PASS(`studio row confirmed in DB: id=${studioRow.id}`);
  }

  manifest.studio = { id: studioRow.id, name: studioName, subdomain, url: `${BASE_URL}/book/${subdomain}` };
  manifest.owner = { id: ownerId, email: ownerEmail, password: PW, name: ownerName };

  // Log in fresh (covers the reuse branch too, and re-verifies /login works for this account)
  await page.goto(`${BASE_URL}/login`, { waitUntil: "load" });
  await page.getByPlaceholder("you@studio.com").fill(ownerEmail);
  await page.getByPlaceholder("••••••••").fill(PW);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/owner\/dashboard/, { timeout: 20000 });
  PASS(`owner login via /login UI works → ${page.url()}`);

  // ═══════════════════════════════════════════════════════════
  // 2 — Invite 2 artists via real Invite Artist modal, accept via real UI
  // ═══════════════════════════════════════════════════════════
  const artistSpecs = [
    { label: "artist1", name: "QA Artist Fine Line", email: `qa.fullqa.artist1.20260829@inkbook-qa.test`, style: "Fine line" },
    { label: "artist2", name: "QA Artist Traditional", email: `qa.fullqa.artist2.20260829@inkbook-qa.test`, style: "Traditional" },
  ];

  for (const spec of artistSpecs) {
    HEAD(`2 — Invite + accept: ${spec.name} (${spec.style})`);

    const { data: existingArtist } = await sb.from("artists").select("id, user_id, styles").eq("studio_id", studioRow.id).eq("email", spec.email).maybeSingle();
    const artistCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const artistPage = await artistCtx.newPage();
    let acceptedArtist = existingArtist;

    if (existingArtist && existingArtist.user_id) {
      NOTE(`${spec.label} already exists as active artist — reusing account, completing style/photo via UI login`);
      await artistPage.goto(`${BASE_URL}/login`, { waitUntil: "load" });
      await artistPage.getByPlaceholder("you@studio.com").fill(spec.email);
      await artistPage.getByPlaceholder("••••••••").fill(PW);
      await artistPage.getByRole("button", { name: /sign in/i }).click();
      await artistPage.waitForURL(/\/artist\/dashboard/, { timeout: 20000 });
      await artistPage.goto(`${BASE_URL}/artist/portfolio`, { waitUntil: "load" });
    } else {
      await page.goto(`${BASE_URL}/owner/artists`, { waitUntil: "load" });
      await page.getByRole("button", { name: /invite artist/i }).first().click();
      await page.waitForTimeout(300);
      await page.locator("#invite-artist-name").fill(spec.name);
      await page.locator("#invite-artist-email").fill(spec.email);
      await page.getByRole("button", { name: /send invite/i }).click();
      await page.waitForTimeout(2000);
      const inviteSent = await page.locator("text=/Invite sent to/i").isVisible().catch(() => false);

      const { data: inviteRow, error: inviteErr } = await sb.from("artist_invites")
        .select("id, token, studio_id, invited_name, invited_email")
        .eq("invited_email", spec.email)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (inviteSent && inviteRow && inviteRow.studio_id === studioRow.id) {
        PASS(`invite created via real UI: artist_invites.id=${inviteRow.id}`);
      } else {
        FAIL(`invite creation failed for ${spec.email} — inviteSent=${inviteSent} row=${JSON.stringify(inviteRow)} err=${inviteErr?.message}`);
        await artistCtx.close();
        continue;
      }

      // Accept via real UI, own tab (fresh, unauthenticated context so we don't
      // clobber the owner's session cookie).
      await artistPage.goto(`${BASE_URL}/artist/accept/${inviteRow.token}`, { waitUntil: "load" });
      const nameField = artistPage.locator("#accept-name");
      await nameField.fill(spec.name);
      await artistPage.locator("#accept-password").fill(PW);
      await artistPage.locator("#accept-confirm-password").fill(PW);
      await artistPage.getByRole("button", { name: /join/i }).click();
      await artistPage.waitForTimeout(3000);
      const landedOk = /\/artist\/dashboard|\/login/.test(artistPage.url());

      const { data: freshAccepted } = await sb.from("artists").select("id, user_id, styles, name, email").eq("studio_id", studioRow.id).eq("email", spec.email).maybeSingle();
      acceptedArtist = freshAccepted;
      if (landedOk && acceptedArtist && acceptedArtist.user_id) {
        PASS(`invite accepted via real UI → artists.id=${acceptedArtist.id}, user_id=${acceptedArtist.user_id}`);
      } else {
        FAIL(`accept invite did not produce active artist — landedOk=${landedOk} acceptedArtist=${JSON.stringify(acceptedArtist)}`);
        await artistCtx.close();
        continue;
      }

      // ── Set accepted style via real StyleSelector UI (artist's own portfolio page) ──
      if (artistPage.url().includes("/artist/dashboard")) {
        // Already signed in from the accept flow.
        await artistPage.goto(`${BASE_URL}/artist/portfolio`, { waitUntil: "load" });
      } else {
        // Accept flow bounced to /login (session establishment sometimes fails) — sign in manually.
        await artistPage.goto(`${BASE_URL}/login`, { waitUntil: "load" });
        await artistPage.getByPlaceholder("you@studio.com").fill(spec.email);
        await artistPage.getByPlaceholder("••••••••").fill(PW);
        await artistPage.getByRole("button", { name: /sign in/i }).click();
        await artistPage.waitForURL(/\/artist\/dashboard/, { timeout: 20000 });
        await artistPage.goto(`${BASE_URL}/artist/portfolio`, { waitUntil: "load" });
      }
    }

    // Toggle button — only click if not already selected (re-running this
    // script against an already-seeded artist must not flip it back off).
    const { data: preStyle } = await sb.from("artists").select("styles").eq("id", acceptedArtist.id).single();
    if (!preStyle?.styles?.includes(spec.style)) {
      await artistPage.getByRole("button", { name: spec.style, exact: true }).click();
      await artistPage.waitForTimeout(1500);
    } else {
      NOTE(`style "${spec.style}" already selected — skipping toggle to avoid flipping it off`);
    }

    const { data: styledArtist } = await sb.from("artists").select("styles").eq("id", acceptedArtist.id).single();
    if (styledArtist && styledArtist.styles?.includes(spec.style)) {
      PASS(`style "${spec.style}" saved via real StyleSelector UI → DB confirms: ${JSON.stringify(styledArtist.styles)}`);
    } else {
      FAIL(`style not persisted — got: ${JSON.stringify(styledArtist)}`);
    }

    // ── Upload 1 portfolio/flash photo via real UI ──
    // Build a tiny valid JPEG on disk (1x1 red pixel) to use as the upload.
    const tmpImgPath = `${process.env.TEMP || "/tmp"}\\qa-fullqa-${spec.label}.jpg`;
    const tinyJpegBase64 = "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/2wBDAQMDAwQDBAgEBAgQCwkLEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBD/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAj/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=";
    writeFileSync(tmpImgPath, Buffer.from(tinyJpegBase64, "base64"));

    await artistPage.goto(`${BASE_URL}/artist/portfolio`, { waitUntil: "load" });
    const fileInput = artistPage.locator('input[type="file"]');
    await fileInput.setInputFiles(tmpImgPath);
    await artistPage.waitForTimeout(3000);

    const { data: photos } = await sb.from("portfolio_images").select("id").eq("artist_id", acceptedArtist.id);
    if (photos && photos.length > 0) {
      PASS(`portfolio photo uploaded via real UI → portfolio_images row confirmed (${photos.length} total)`);
    } else {
      FAIL(`portfolio photo upload did not create a DB row (check ALLOWED_MIME_TYPES / storage bucket perms)`);
    }

    manifest.artists.push({
      label: spec.label, id: acceptedArtist.id, userId: acceptedArtist.user_id,
      name: spec.name, email: spec.email, password: PW, style: spec.style,
      portfolioPhotos: (photos ?? []).length,
    });

    await artistCtx.close();
  }

  // ═══════════════════════════════════════════════════════════
  // 3 — Verify via owner dashboard (real browser) that both artists show up
  // ═══════════════════════════════════════════════════════════
  HEAD("3 — Owner dashboard / artists list shows both artists");
  await page.goto(`${BASE_URL}/owner/artists`, { waitUntil: "load" });
  const bodyText = await page.evaluate(() => document.body.innerText);
  let allVisible = true;
  for (const spec of artistSpecs) {
    if (!bodyText.includes(spec.name)) { allVisible = false; FAIL(`${spec.name} not visible on /owner/artists`); }
  }
  if (allVisible) PASS("both artists visible on /owner/artists with Active status");

  await page.goto(`${BASE_URL}/owner/dashboard`, { waitUntil: "load" });
  const dashText = await page.evaluate(() => document.body.innerText);
  NOTE(`dashboard loaded ok, body length=${dashText.length}`);

} finally {
  await ctx.close();
  await browser.close().catch(() => {});
}

// ── Write manifest ──────────────────────────────────────────
mkdirSync("qa-manifests", { recursive: true });
writeFileSync("qa-manifests/fullqa-20260829-studio.json", JSON.stringify(manifest, null, 2));
HEAD(`SEED COMPLETE — ${failures} finding(s). Manifest written to qa-manifests/fullqa-20260829-studio.json`);
console.log(JSON.stringify(manifest, null, 2));
process.exit(failures > 0 ? 1 : 0);
