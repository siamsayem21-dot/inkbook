/**
 * QA Engine — disposable Artist-isolation test fixture.
 *
 * 2026-08-30: investigated the studio ids hardcoded across 9
 * verify-artist-*.mjs / verify-audit-log.mjs scripts. Both turned out to
 * be REAL, actively-used studios, not QA fixtures:
 *   - bb0c648e-4f18-4e48-8581-6b7cfd585eea ("SM CreationS", subdomain
 *     "inkandironstudio" — matches CLAUDE.md's own documented example,
 *     but its owner account signed in minutes before this was written and
 *     it holds real bookings/clients/portfolio content) — genuinely
 *     ambiguous, treated as real per instruction.
 *   - 5fe382a1-fee7-4387-b625-4bf7a52b8f45 ("Siam Enterprise") —
 *     confirmed real: this is the exact studio behind Siam's live P1 bug
 *     report earlier this session (the printhutbd2019@gmail.com invite).
 * Per Siam's explicit instruction, NEITHER is touched by this engine.
 * This script provisions a fresh, uniquely QA-tagged, fully disposable
 * replacement instead: 2 studios, 2 artists in Studio A ("Jamie"/"Marcus"
 * role-equivalents), 1 outsider artist in Studio B.
 *
 * Modes:
 *   --provision   creates the fixture, writes qa/artist-fixture.json
 *   --cleanup     dry-run by default; add --apply to actually delete.
 *                 DRY RUN -> verify QA ownership -> DELETE -> VERIFY GONE.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const FIXTURE_PATH = path.join(REPO_ROOT, "qa", "artist-fixture.json");

const env = Object.fromEntries(
  readFileSync(path.join(REPO_ROOT, ".env.local"), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

const TAG = "QA-ARTISTFIXTURE";
const PW = "QaArtistFixture2026!";
const mode = process.argv.includes("--provision") ? "provision" : process.argv.includes("--cleanup") ? "cleanup" : null;
const APPLY = process.argv.includes("--apply");

if (!mode) {
  console.error("Usage: node scripts/qa-engine-artist-fixture.mjs --provision | --cleanup [--apply]");
  process.exit(1);
}

async function provision() {
  const stamp = Date.now();
  const tag = `${TAG}-${stamp}`;
  console.log(`Provisioning disposable artist-isolation fixture: ${tag}`);

  const { data: ownerA } = await sb.auth.admin.createUser({ email: `${tag.toLowerCase()}-ownerA@inkbook-qa.test`, email_confirm: true, password: PW });
  const { data: studioA, error: studioAErr } = await sb.from("studios").insert({
    name: `[${tag}] Studio A`, subdomain: `${tag.toLowerCase()}-a`, owner_id: ownerA.user.id, plan: "studio",
  }).select().single();
  if (studioAErr) throw new Error("studioA insert failed: " + studioAErr.message);

  const { data: ownerB } = await sb.auth.admin.createUser({ email: `${tag.toLowerCase()}-ownerB@inkbook-qa.test`, email_confirm: true, password: PW });
  const { data: studioB, error: studioBErr } = await sb.from("studios").insert({
    name: `[${tag}] Studio B`, subdomain: `${tag.toLowerCase()}-b`, owner_id: ownerB.user.id, plan: "studio",
  }).select().single();
  if (studioBErr) throw new Error("studioB insert failed: " + studioBErr.message);

  const { data: jamieUser } = await sb.auth.admin.createUser({ email: `${tag.toLowerCase()}-jamie@inkbook-qa.test`, email_confirm: true, password: PW });
  const { data: jamie, error: jamieErr } = await sb.from("artists").insert({
    studio_id: studioA.id, user_id: jamieUser.user.id, name: `${tag} Jamie`, email: `${tag.toLowerCase()}-jamie@inkbook-qa.test`, is_active: true, minimum_rate_cents: 10000,
  }).select().single();
  if (jamieErr) throw new Error("jamie artist insert failed: " + jamieErr.message);

  const { data: marcusUser } = await sb.auth.admin.createUser({ email: `${tag.toLowerCase()}-marcus@inkbook-qa.test`, email_confirm: true, password: PW });
  const { data: marcus, error: marcusErr } = await sb.from("artists").insert({
    studio_id: studioA.id, user_id: marcusUser.user.id, name: `${tag} Marcus`, email: `${tag.toLowerCase()}-marcus@inkbook-qa.test`, is_active: true, minimum_rate_cents: 10000,
  }).select().single();
  if (marcusErr) throw new Error("marcus artist insert failed: " + marcusErr.message);

  const { data: outsiderUser } = await sb.auth.admin.createUser({ email: `${tag.toLowerCase()}-outsider@inkbook-qa.test`, email_confirm: true, password: PW });
  const { data: outsider, error: outsiderErr } = await sb.from("artists").insert({
    studio_id: studioB.id, user_id: outsiderUser.user.id, name: `${tag} Outsider`, email: `${tag.toLowerCase()}-outsider@inkbook-qa.test`, is_active: true, minimum_rate_cents: 10000,
  }).select().single();
  if (outsiderErr) throw new Error("outsider artist insert failed: " + outsiderErr.message);

  const fixture = {
    tag,
    password: PW,
    createdAt: new Date().toISOString(),
    studioA: { id: studioA.id, ownerId: ownerA.user.id, ownerEmail: ownerA.user.email, subdomain: studioA.subdomain },
    studioB: { id: studioB.id, ownerId: ownerB.user.id, ownerEmail: ownerB.user.email, subdomain: studioB.subdomain },
    jamie: { id: jamie.id, userId: jamieUser.user.id, email: jamie.email },
    marcus: { id: marcus.id, userId: marcusUser.user.id, email: marcus.email },
    outsider: { id: outsider.id, userId: outsiderUser.user.id, email: outsider.email },
    authUserIds: [ownerA.user.id, ownerB.user.id, jamieUser.user.id, marcusUser.user.id, outsiderUser.user.id],
  };

  mkdirSync(path.dirname(FIXTURE_PATH), { recursive: true });
  writeFileSync(FIXTURE_PATH, JSON.stringify(fixture, null, 2));
  console.log("Fixture provisioned and written to qa/artist-fixture.json:");
  console.log(JSON.stringify({ tag, studioA: studioA.id, studioB: studioB.id, jamie: jamie.id, marcus: marcus.id, outsider: outsider.id }, null, 2));
  process.exit(0);
}

async function cleanup() {
  if (!existsSync(FIXTURE_PATH)) {
    console.log("No qa/artist-fixture.json found — nothing to clean up.");
    process.exit(0);
  }
  const fixture = JSON.parse(readFileSync(FIXTURE_PATH, "utf8"));
  console.log(`${APPLY ? "APPLY" : "DRY RUN"} — cleaning up fixture ${fixture.tag}`);

  // VERIFY QA OWNERSHIP — re-check every id we're about to touch actually
  // still carries the tag before deleting anything.
  const { data: studioAcheck } = await sb.from("studios").select("id, name").eq("id", fixture.studioA.id).maybeSingle();
  const { data: studioBcheck } = await sb.from("studios").select("id, name").eq("id", fixture.studioB.id).maybeSingle();
  const studioAOwned = studioAcheck?.name?.includes(fixture.tag);
  const studioBOwned = studioBcheck?.name?.includes(fixture.tag);
  console.log(`Studio A (${fixture.studioA.id}) tag-verified: ${studioAOwned} (name: ${studioAcheck?.name ?? "not found"})`);
  console.log(`Studio B (${fixture.studioB.id}) tag-verified: ${studioBOwned} (name: ${studioBcheck?.name ?? "not found"})`);

  if (!APPLY) {
    console.log("Dry run complete — no changes made. Re-run with --apply to delete.");
    process.exit(0);
  }

  for (const [label, studioId, owned] of [["A", fixture.studioA.id, studioAOwned], ["B", fixture.studioB.id, studioBOwned]]) {
    if (!owned) { console.log(`Skipping Studio ${label} delete — tag verification failed (already gone or not ours).`); continue; }
    await sb.from("bookings").delete().eq("studio_id", studioId);
    await sb.from("custom_requests").delete().eq("studio_id", studioId);
    await sb.from("consultations").delete().eq("studio_id", studioId);
    await sb.from("clients").delete().eq("studio_id", studioId);
    await sb.from("flash_designs").delete().eq("studio_id", studioId);
    await sb.from("artists").delete().eq("studio_id", studioId);
    const { error: delErr } = await sb.from("studios").delete().eq("id", studioId);
    console.log(`Studio ${label} deleted:`, !delErr);
  }

  for (const id of fixture.authUserIds ?? []) {
    await sb.auth.admin.deleteUser(id).catch(() => {});
  }

  // VERIFY GONE
  const { data: studioAafter } = await sb.from("studios").select("id").eq("id", fixture.studioA.id);
  const { data: studioBafter } = await sb.from("studios").select("id").eq("id", fixture.studioB.id);
  const clean = (studioAafter ?? []).length === 0 && (studioBafter ?? []).length === 0;
  console.log(clean ? "VERIFIED GONE." : "WARNING — some fixture data may remain, inspect manually.");

  const fs = await import("fs");
  fs.unlinkSync(FIXTURE_PATH);
  console.log("qa/artist-fixture.json removed.");
  process.exit(clean ? 0 : 1);
}

if (mode === "provision") await provision();
else await cleanup();
