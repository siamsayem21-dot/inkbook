/**
 * One-off recheck for ART-057 (agreements list) — verifies whether the
 * "NOT visible" result in qa-fullrun-artist-clickthrough.mjs was a real
 * product bug or a bad test assertion (searched for the wrong string).
 * Self-cleaning.
 */
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8").split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const manifest = JSON.parse(readFileSync("qa-manifests/fullqa-20260829-studio.json", "utf8"));
const BASE_URL = manifest.baseUrl;
const TAG = manifest.tag;
const studioId = manifest.studio.id;
const artist1 = manifest.artists.find((a) => a.label === "artist1");

const { data: client } = await sb.from("clients").insert({
  studio_id: studioId, full_name: `[${TAG}] Recheck Client`, email: "qa.fullqa.artagreerecheck.20260829@inkbook-qa.test", phone: "+15550088888",
}).select().single();

const { data: booking } = await sb.from("bookings").insert({
  studio_id: studioId, artist_id: artist1.id, client_id: client.id, date: "2027-04-10", time: "10:00",
  style: "Fine line", description: `[${TAG}] ART Recheck Booking`, status: "confirmed", deposit_amount_cents: 5000, deposit_paid: true,
}).select().single();

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.goto(`${BASE_URL}/login`, { waitUntil: "load" });
await page.getByPlaceholder("you@studio.com").fill(artist1.email);
await page.getByPlaceholder("••••••••").fill(artist1.password);
await page.getByRole("button", { name: /sign in/i }).click();
await page.waitForURL(/\/artist\/dashboard/, { timeout: 20000 });

await page.goto(`${BASE_URL}/artist/agreements/new`, { waitUntil: "load" });
await page.locator("#agreement-design-description").fill(`[${TAG}] Recheck agreement description`);
await page.locator("#agreement-placement").fill("Calf");
await page.locator("#agreement-size").fill('4"x4"');
await page.locator("#agreement-price").fill("175");
await page.locator("#agreement-signature").fill("Recheck Sig");
await page.getByRole("button", { name: /sign & save agreement/i }).click();
await page.waitForURL(/\/artist\/agreements\/[a-f0-9-]+$/, { timeout: 15000 }).catch(() => {});
const urlMatch = page.url().match(/\/artist\/agreements\/([a-f0-9-]+)$/);
console.log("Created agreement, redirected to:", page.url());

let agreementId = urlMatch?.[1];
if (agreementId) {
  const { data: row } = await sb.from("session_agreements").select("*").eq("id", agreementId).maybeSingle();
  console.log("DB row:", JSON.stringify(row));

  await page.goto(`${BASE_URL}/artist/agreements`, { waitUntil: "load" });
  const bodyText = await page.evaluate(() => document.body.innerText);
  console.log("List page contains client full_name?", bodyText.includes(`Recheck Client`));
  console.log("List page contains old wrong-check string?", bodyText.includes("QA Art Client One"));
  console.log("--- list page snippet ---");
  console.log(bodyText.slice(0, 800));
}

await ctx.close();
await browser.close();

// cleanup
if (agreementId) await sb.from("session_agreements").delete().eq("id", agreementId);
await sb.from("bookings").delete().eq("id", booking.id);
await sb.from("clients").delete().eq("id", client.id);
console.log("Cleaned up recheck data.");
