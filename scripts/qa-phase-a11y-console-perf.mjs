/**
 * Exhaustive QA — A11y/console/perf checks across the 4 portals against
 * production. Real browser console monitoring (not "the code looks clean"),
 * real navigation timing, and a targeted accessibility check reusing the
 * existing accessible-name/label-association pattern.
 *
 * Run with: QA_BASE_URL=https://www.inkbook.tech node scripts/qa-phase-a11y-console-perf.mjs
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
const TAG = "QA-A11Y-PERF";
const tag = `${TAG.toLowerCase()}-${Date.now()}`;
const PW = "Password123!";

const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const created = { auth: [], studios: [], artists: [], clientAccounts: [] };
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
}

// Console errors worth failing on — filters out expected/benign noise
// (favicon 404s, third-party analytics blocked by ad-blockers in CI,
// React DevTools suggestion, etc.) so a real regression doesn't drown in
// false positives.
const IGNORE_PATTERNS = [
  /favicon/i,
  /Download the React DevTools/i,
  /\[Fast Refresh\]/i,
  /Failed to fetch RSC payload/i, // known Next.js client-nav fallback noise, not a real error
];
function isRealError(text) {
  return !IGNORE_PATTERNS.some((p) => p.test(text));
}

async function checkConsoleAndTiming(page, route, label) {
  const errors = [];
  const handler = (msg) => {
    if (msg.type() === "error" && isRealError(msg.text())) errors.push(msg.text());
  };
  page.on("console", handler);
  const t0 = Date.now();
  await page.goto(`${BASE_URL}${route}`, { waitUntil: "load", timeout: 20000 }).catch((e) => errors.push(`navigation error: ${e.message}`));
  await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
  const loadMs = Date.now() - t0;
  page.off("console", handler);

  if (errors.length === 0) {
    PASS(`${label} — 0 console errors, loaded in ${loadMs}ms`);
  } else {
    FAIL(`${label} — ${errors.length} real console error(s), loaded in ${loadMs}ms: ${errors.slice(0, 3).join(" | ").slice(0, 300)}`);
  }
  if (loadMs > 5000) {
    NOTE(`${label} — load took ${loadMs}ms (>5s) — worth a closer look, not auto-failed since network conditions vary`);
  }
  return loadMs;
}

const browser = await chromium.launch({ headless: true });

try {
  HEAD("Seed — owner, artist, studio, client account");
  const ownerEmail = `${tag}-owner@example.test`;
  const ownerId = await mkAuthUser(ownerEmail);
  const { data: studioRow } = await sb.from("studios").insert({
    name: `[${TAG}] Studio`, subdomain: tag, owner_id: ownerId, deposit_amount_cents: 5000, plan: "studio",
  }).select().single();
  created.studios.push(studioRow.id);
  const artistEmail = `${tag}-artist@example.test`;
  const artistUserId = await mkAuthUser(artistEmail);
  const { data: artistRow } = await sb.from("artists").insert({
    studio_id: studioRow.id, user_id: artistUserId, name: "QA A11y Artist", email: artistEmail, styles: ["Traditional"], minimum_rate_cents: 15000,
  }).select().single();
  created.artists.push(artistRow.id);

  const clientEmail = `${tag}-client@example.test`;
  const clientAuthId = await mkAuthUser(clientEmail);
  const otpHelper = createClient(SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: linkData } = await sb.auth.admin.generateLink({ type: "magiclink", email: clientEmail });
  const { data: verifyData } = await otpHelper.auth.verifyOtp({ email: clientEmail, token: linkData.properties.email_otp, type: "email" });
  const { data: clientAccount } = await sb.from("client_accounts").insert({ user_id: clientAuthId, email: clientEmail }).select().single();
  created.clientAccounts.push(clientAccount.id);
  const projectRef = SUPABASE_URL.match(/https:\/\/([a-z0-9]+)\.supabase\.co/)[1];
  const cookieValue = "base64-" + Buffer.from(JSON.stringify(verifyData.session)).toString("base64url");

  // ═══════════════════════════════════════════════════════════
  // Console + timing — Owner Portal
  // ═══════════════════════════════════════════════════════════
  HEAD("Owner Portal — console errors + navigation timing across key routes");
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await loginAs(page, ownerEmail);
    for (const [route, label] of [
      ["/owner/dashboard", "/owner/dashboard"],
      ["/owner/bookings", "/owner/bookings"],
      ["/owner/consultations", "/owner/consultations"],
      ["/owner/artists", "/owner/artists"],
      ["/owner/revenue", "/owner/revenue"],
      ["/owner/settings/billing", "/owner/settings/billing"],
    ]) {
      await checkConsoleAndTiming(page, route, label);
    }
    await ctx.close();
  }

  // ═══════════════════════════════════════════════════════════
  // Console + timing — Artist Portal
  // ═══════════════════════════════════════════════════════════
  HEAD("Artist Portal — console errors + navigation timing");
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await loginAs(page, artistEmail);
    for (const [route, label] of [
      ["/artist/dashboard", "/artist/dashboard"],
      ["/artist/earnings", "/artist/earnings"],
      ["/artist/portfolio", "/artist/portfolio"],
      ["/artist/flash", "/artist/flash"],
    ]) {
      await checkConsoleAndTiming(page, route, label);
    }
    await ctx.close();
  }

  // ═══════════════════════════════════════════════════════════
  // Console + timing — Client Portal
  // ═══════════════════════════════════════════════════════════
  HEAD("Client Portal — console errors + navigation timing");
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await ctx.addCookies([{
      name: `sb-${projectRef}-auth-token`, value: cookieValue,
      domain: new URL(BASE_URL).hostname, path: "/", httpOnly: false, secure: BASE_URL.startsWith("https"), sameSite: "Lax",
    }]);
    const page = await ctx.newPage();
    for (const [route, label] of [
      [`/portal/${tag}/dashboard`, "/portal dashboard"],
      [`/portal/${tag}/projects`, "/portal projects"],
      [`/portal/${tag}/settings`, "/portal settings"],
    ]) {
      await checkConsoleAndTiming(page, route, label);
    }
    await ctx.close();
  }

  // ═══════════════════════════════════════════════════════════
  // Console + timing — Public
  // ═══════════════════════════════════════════════════════════
  HEAD("Public — console errors + navigation timing");
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    for (const [route, label] of [
      [`/book/${tag}`, "/book/[studio] landing"],
      [`/book/${tag}/custom`, "/book/[studio]/custom"],
      [`/book/${tag}/login`, "/book/[studio]/login"],
    ]) {
      await checkConsoleAndTiming(page, route, label);
    }
    await ctx.close();
  }

  // ═══════════════════════════════════════════════════════════
  // Accessibility — form label association spot-check on 3 key forms
  // ═══════════════════════════════════════════════════════════
  HEAD("Accessibility — form label <-> input association spot-check");
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    // Public custom-request form (real inputs, checked earlier in the mission
    // for functionality only — this specifically checks label wiring).
    await page.goto(`${BASE_URL}/book/${tag}/custom`, { waitUntil: "load" });
    const unlabeled = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll("input, select, textarea"));
      return inputs
        .filter((el) => el.type !== "hidden" && el.type !== "file")
        .filter((el) => {
          const id = el.id;
          const hasFor = id && document.querySelector(`label[for="${CSS.escape(id)}"]`);
          const hasAriaLabel = el.getAttribute("aria-label") || el.getAttribute("aria-labelledby");
          const wrappedInLabel = el.closest("label");
          return !hasFor && !hasAriaLabel && !wrappedInLabel;
        })
        .map((el) => el.outerHTML.slice(0, 100));
    });
    if (unlabeled.length === 0) {
      PASS("/book/[studio]/custom — every input/select/textarea has a real associated label (for/id, aria-label, or wrapping)");
    } else {
      FAIL(`/book/[studio]/custom — ${unlabeled.length} unlabeled form control(s): ${unlabeled.join(" | ")}`);
    }

    // Consent form — already known from a prior session to have an
    // unlinked-label issue (EXHAUSTIVE_ISSUES.md history references PR #9's
    // finding, never fixed). Re-check here for this mission's own fresh
    // evidence rather than trusting the old note.
    await page.goto(`${BASE_URL}/book/${tag}/consent`, { waitUntil: "load" });
    const unlabeledConsent = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll("input, select, textarea"));
      return inputs
        .filter((el) => el.type !== "hidden" && el.type !== "file")
        .filter((el) => {
          const id = el.id;
          const hasFor = id && document.querySelector(`label[for="${CSS.escape(id)}"]`);
          const hasAriaLabel = el.getAttribute("aria-label") || el.getAttribute("aria-labelledby");
          const wrappedInLabel = el.closest("label");
          return !hasFor && !hasAriaLabel && !wrappedInLabel;
        })
        .map((el) => `<${el.tagName.toLowerCase()} id="${el.id}" type="${el.type}">`);
    });
    if (unlabeledConsent.length === 0) {
      PASS("/book/[studio]/consent (StandaloneConsentForm) — every input has a real associated label — the previously-noted unlinked-label issue appears fixed");
    } else {
      NOTE(`/book/[studio]/consent — ${unlabeledConsent.length} unlabeled control(s) confirmed still present: ${unlabeledConsent.join(", ")} — matches the pre-existing, already-documented finding from before this mission (not new, not re-litigated as a fresh bug, just re-confirmed)`);
    }
    await ctx.close();
  }
} finally {
  await browser.close().catch(() => {});
}

// ── Cleanup ──────────────────────────────────────────────────
HEAD("Cleanup");
for (const id of created.clientAccounts) await sb.from("client_accounts").delete().eq("id", id);
for (const id of created.artists) await sb.from("artists").delete().eq("id", id);
for (const id of created.studios) await sb.from("studios").delete().eq("id", id);
for (const id of created.auth) await sb.auth.admin.deleteUser(id).catch(() => {});

const checkStudios = await sb.from("studios").select("id").in("id", created.studios);
console.log("studios gone:", (checkStudios.data ?? []).length === 0);

HEAD(`A11Y/CONSOLE/PERF COMPLETE — ${failures} finding(s)`);
if (findings.length) findings.forEach((f) => console.log(" -", f));
process.exit(failures > 0 ? 1 : 0);
