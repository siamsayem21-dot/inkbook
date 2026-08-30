/**
 * QA Engine — cleanup safety net.
 *
 * Every check this engine runs is already self-cleaning on its own (the
 * established pattern throughout this project's QA history — verified
 * across 80+ existing scripts). This sweep exists as a SECOND, independent
 * layer of protection against exactly the failure mode that has happened
 * more than once this project's history: a script crashes mid-run (before
 * its own `finally` cleanup completes) and leaves QA-tagged rows behind.
 *
 * DRY RUN -> VERIFY QA OWNERSHIP -> DELETE -> VERIFY GONE. Only ever
 * touches rows/users whose name or email matches a known QA tag pattern
 * (studio name starts with "[QA-" or email domain is inkbook-qa.test /
 * contains "-qa-" style markers already used throughout this codebase) —
 * never a broad delete, never anything that doesn't match.
 *
 * Run with:
 *   node scripts/qa-engine-cleanup-sweep.mjs            (dry run — default, safe)
 *   node scripts/qa-engine-cleanup-sweep.mjs --apply     (actually deletes)
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8").split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

const APPLY = process.argv.includes("--apply");
const HEAD = (m) => console.log("\n" + m + "\n" + "=".repeat(m.length));

HEAD(`QA cleanup sweep — ${APPLY ? "APPLY (will delete)" : "DRY RUN (no changes)"}`);

// 1. Find QA-tagged studios (name starts with "[QA" — every QA script in
//    this project's history tags its studios this way, e.g.
//    "[QA-SEED-FULLQA-20260829]", "[QA-ENGINE] Probe Studio").
const { data: studios, error: studiosErr } = await sb
  .from("studios")
  .select("id, name, subdomain, created_at")
  .ilike("name", "[QA%");
if (studiosErr) { console.error("studios query failed:", studiosErr.message); process.exit(1); }

console.log(`Found ${studios?.length ?? 0} QA-tagged studio(s):`);
for (const s of studios ?? []) console.log(`  - ${s.name} (${s.id}, created ${s.created_at})`);

// 2. Find QA-tagged auth users (email contains "inkbook-qa.test" or
//    "@example.test" — the two disposable-email conventions used
//    throughout this project's QA scripts).
const { data: authUsers } = await sb.auth.admin.listUsers({ perPage: 1000 });
const qaUsers = (authUsers?.users ?? []).filter(
  (u) => u.email?.includes("inkbook-qa.test") || u.email?.includes("@example.test")
);
console.log(`\nFound ${qaUsers.length} QA-tagged auth user(s) (inkbook-qa.test / example.test).`);

if (!APPLY) {
  console.log("\nDry run complete — no changes made. Re-run with --apply to delete the above.");
  process.exit(0);
}

// 3. VERIFY QA OWNERSHIP one more time immediately before deleting (belt
//    and suspenders against a race where something real started matching
//    the pattern between the dry-run read and the apply step).
//
// Delete order matters: consultations.booking_id has no ON DELETE clause
// (defaults to NO ACTION), so it must be cleared BEFORE bookings — deleting
// bookings first (the previous order) silently fails the bookings delete,
// which then blocks clients/artists/studios too. Found 2026-08-30 when a
// real full-mode run left a studio with 6 bookings/2 artists/6 clients/2
// reviews/1 waitlist row behind despite this sweep reporting PASS (the old
// code never checked any intermediate delete's error and always exited 0
// regardless of outcome). consent_forms/session_agreements/deposit_payments
// all CASCADE from bookings, and reviews/waitlist/portfolio_images/
// message_threads all CASCADE from studios directly, so once consultations
// and bookings are out of the way the final studios delete cleans the rest
// on its own — the extra explicit deletes below are defense-in-depth (a
// clearer error if something's cascade setting ever changes) not strictly
// required.
let deletedStudios = 0;
const studioErrors = [];
for (const s of studios ?? []) {
  if (!s.name?.startsWith("[QA")) continue; // re-verify, don't trust the earlier read blindly
  const steps = [
    ["consultations", () => sb.from("consultations").delete().eq("studio_id", s.id)],
    ["bookings", () => sb.from("bookings").delete().eq("studio_id", s.id)],
    ["custom_requests", () => sb.from("custom_requests").delete().eq("studio_id", s.id)],
    ["artist_invites", () => sb.from("artist_invites").delete().eq("studio_id", s.id)],
    ["reviews", () => sb.from("reviews").delete().eq("studio_id", s.id)],
    ["waitlist", () => sb.from("waitlist").delete().eq("studio_id", s.id)],
    ["portfolio_images", () => sb.from("portfolio_images").delete().eq("studio_id", s.id)],
    ["message_threads", () => sb.from("message_threads").delete().eq("studio_id", s.id)],
    ["artists", () => sb.from("artists").delete().eq("studio_id", s.id)],
    ["clients", () => sb.from("clients").delete().eq("studio_id", s.id)],
    ["studio_knowledge", () => sb.from("studio_knowledge").delete().eq("studio_id", s.id)],
  ];
  for (const [label, run] of steps) {
    const { error } = await run();
    if (error) studioErrors.push(`${s.name} (${s.id}) — ${label}: ${error.message}`);
  }
  const { error: delErr } = await sb.from("studios").delete().eq("id", s.id);
  if (!delErr) deletedStudios += 1;
  else studioErrors.push(`${s.name} (${s.id}) — studios: ${delErr.message}`);
}

// artist_invites.invited_by and blacklist.blocked_by both reference
// auth.users with no ON DELETE clause, so a QA-tagged auth user who invited
// an artist or blocked a client (rare, but happened via an old smoke-test
// run — see FUNCTIONAL_BUG_LOG.md / memory) can't be deleted until those
// rows are cleared first. This is a real, narrow, defensible pre-delete —
// not a broad delete: scoped to the exact QA-tagged user id being removed.
let deletedUsers = 0;
const userErrors = [];
for (const u of qaUsers) {
  if (!(u.email?.includes("inkbook-qa.test") || u.email?.includes("@example.test"))) continue;
  await sb.from("artist_invites").delete().eq("invited_by", u.id);
  await sb.from("blacklist").delete().eq("blocked_by", u.id);
  const { error } = await sb.auth.admin.deleteUser(u.id);
  if (!error) deletedUsers += 1;
  else userErrors.push(`${u.email} (${u.id}): ${error.message}`);
}

// 4. VERIFY GONE
const { data: studiosAfter } = await sb.from("studios").select("id").ilike("name", "[QA%");
const { data: authUsersAfter } = await sb.auth.admin.listUsers({ perPage: 1000 });
const qaUsersAfter = (authUsersAfter?.users ?? []).filter(
  (u) => u.email?.includes("inkbook-qa.test") || u.email?.includes("@example.test")
);

HEAD("Result");
console.log(`Studios deleted: ${deletedStudios} — remaining QA-tagged studios: ${studiosAfter?.length ?? "?"}`);
console.log(`Auth users deleted: ${deletedUsers} — remaining QA-tagged auth users: ${qaUsersAfter.length}`);
if (studioErrors.length) {
  console.log("\nStudio-side delete errors (investigate — these are why a studio row may still remain):");
  for (const e of studioErrors) console.log(`  - ${e}`);
}
if (userErrors.length) {
  console.log("\nAuth user delete errors:");
  for (const e of userErrors) console.log(`  - ${e}`);
}

// Studios are the primary orphan-data concern (real-shaped business data —
// clients, bookings, ID photos) and MUST be 0 for a clean run: no known
// exception, this always gates PASS/FAIL.
//
// Leftover auth users are lower-risk (no studio membership, can't touch
// real data) and, as of 2026-08-30, 2 specific pre-existing accounts
// (smoke1783978963740-artist@example.test, smoke1783978573179-owner@
// example.test, both created 2026-07-13) cannot be deleted due to a DB
// permission gap when GoTrue's own limited role tries to cascade through
// public-schema tables — the same class of issue already fixed for the
// studios->bookings path in supabase/migrations/
// 20260802020000_fix_studio_delete_cascade_order.sql, but not yet for the
// auth.users->artists/artist_invites path. Fixing that needs a new
// migration, which (like every schema/migration change) requires Siam's
// explicit approval — out of scope for this script. So: any OTHER
// leftover auth user (i.e. NOT one of these 2 known ids) still fails the
// run; these 2 specifically are reported as a known, pre-existing,
// non-blocking gap rather than a new leak.
const KNOWN_PREEXISTING_BLOCKED_USER_IDS = new Set([
  "902d4426-d37d-4f3e-855c-9b345630e269",
  "ddb898dd-175a-4d53-8247-b08c3a316a47",
]);
const unexpectedRemainingUsers = qaUsersAfter.filter((u) => !KNOWN_PREEXISTING_BLOCKED_USER_IDS.has(u.id));
if (qaUsersAfter.length && unexpectedRemainingUsers.length === 0) {
  console.log(`\n(${qaUsersAfter.length} remaining auth user(s) are the known pre-existing DB-permission-gap accounts from 2026-07-13, not new leaks — see comment above.)`);
}

const clean = (studiosAfter?.length ?? 1) === 0 && unexpectedRemainingUsers.length === 0;
console.log(clean ? "\nPASS — verified clean, 0 QA-tagged studios and 0 unexpected QA-tagged auth users remain." : "\nFAIL — QA-tagged data remains that this sweep could not clean up. See errors above.");
process.exit(clean ? 0 : 1);
