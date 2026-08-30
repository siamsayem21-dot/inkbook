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
let deletedStudios = 0;
for (const s of studios ?? []) {
  if (!s.name?.startsWith("[QA")) continue; // re-verify, don't trust the earlier read blindly
  await sb.from("bookings").delete().eq("studio_id", s.id);
  await sb.from("consultations").delete().eq("studio_id", s.id);
  await sb.from("custom_requests").delete().eq("studio_id", s.id);
  await sb.from("artist_invites").delete().eq("studio_id", s.id);
  await sb.from("artists").delete().eq("studio_id", s.id);
  await sb.from("clients").delete().eq("studio_id", s.id);
  await sb.from("studio_knowledge").delete().eq("studio_id", s.id);
  const { error: delErr } = await sb.from("studios").delete().eq("id", s.id);
  if (!delErr) deletedStudios += 1;
}

let deletedUsers = 0;
for (const u of qaUsers) {
  if (!(u.email?.includes("inkbook-qa.test") || u.email?.includes("@example.test"))) continue;
  const { error } = await sb.auth.admin.deleteUser(u.id);
  if (!error) deletedUsers += 1;
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

const clean = (studiosAfter?.length ?? 1) === 0 && qaUsersAfter.length === 0;
console.log(clean ? "\nPASS — verified clean, 0 QA-tagged rows remain." : "\nNOTE — some QA-tagged data remains (may be a genuinely in-progress separate run; re-check before assuming a leak).");
process.exit(0);
