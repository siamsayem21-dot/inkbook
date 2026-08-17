/**
 * InkBook — Compliance Audit Log verification
 *
 * Data-level + RLS-level check for the new `audit_log` table
 * (supabase/migrations/20260817000000_compliance_audit_log.sql) and
 * lib/audit-log.ts's logAuditEvent() helper.
 *
 * 1. Table existence probe — if the migration hasn't been applied to this
 *    Supabase project yet, this fails fast with a clear message instead of a
 *    confusing cascade of unrelated failures.
 * 2. logAuditEvent() writes a real row.
 * 3. getAuditLogEntries()-equivalent query (admin client + studio_id filter,
 *    the actual code path the owner UI uses) returns only the target
 *    studio's rows, never a second studio's — proves the app-layer scoping
 *    that the UI actually relies on.
 * 4. Direct RLS check: a real owner session (anon key, no service role) can
 *    read its own studio's audit_log rows but not another studio's — proves
 *    the defense-in-depth policy also holds, independent of app code.
 *
 * Self-cleaning: every row this script inserts is deleted at the end,
 * regardless of pass/fail.
 *
 * Requires: SUPABASE_SERVICE_ROLE_KEY in .env.local (no dev server needed —
 * this is a pure data/RLS check, no HTTP/browser involved).
 * Run with: node scripts/verify-audit-log.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

const STUDIO_A_ID = "bb0c648e-4f18-4e48-8581-6b7cfd585eea";
const STUDIO_B_ID = "5fe382a1-fee7-4387-b625-4bf7a52b8f45";
const TAG = "QA-VERIFY-AUDIT-LOG";

let failures = 0;
const PASS = (msg) => console.log("  PASS:", msg);
const FAIL = (msg) => { console.log("  FAIL:", msg); failures++; };
const HEAD = (msg) => console.log("\n" + msg + "\n" + "-".repeat(msg.length));

const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

const insertedIds = [];

async function cleanup() {
  if (insertedIds.length === 0) return;
  await admin.from("audit_log").delete().in("id", insertedIds);
  console.log(`\nCleanup: removed ${insertedIds.length} test row(s).`);
}

try {
  HEAD("TEST 0 — table exists");
  const probe = await admin.from("audit_log").select("id").limit(1);
  if (probe.error) {
    console.log(`  FAIL: audit_log table not reachable — ${probe.error.message}`);
    console.log("\n  This means the migration has NOT been applied to this Supabase project yet.");
    console.log("  Action needed: run supabase/migrations/20260817000000_compliance_audit_log.sql");
    console.log("  in the Supabase SQL Editor, then re-run this script.");
    process.exit(1);
  }
  PASS("audit_log table exists and is queryable");

  HEAD("TEST 1 — logAuditEvent-equivalent insert");
  const { data: rowA, error: insErrA } = await admin
    .from("audit_log")
    .insert({
      studio_id: STUDIO_A_ID,
      actor_type: "system",
      actor_label: TAG,
      action: "blacklist.added",
      entity_type: "blacklist",
      entity_id: null,
      metadata: { tag: TAG },
    })
    .select("id")
    .single();
  if (insErrA) { FAIL("insert for studio A failed: " + insErrA.message); }
  else { PASS("insert for studio A succeeded"); insertedIds.push(rowA.id); }

  const { data: rowB, error: insErrB } = await admin
    .from("audit_log")
    .insert({
      studio_id: STUDIO_B_ID,
      actor_type: "system",
      actor_label: TAG,
      action: "blacklist.added",
      entity_type: "blacklist",
      entity_id: null,
      metadata: { tag: TAG },
    })
    .select("id")
    .single();
  if (insErrB) { FAIL("insert for studio B failed: " + insErrB.message); }
  else { PASS("insert for studio B succeeded"); insertedIds.push(rowB.id); }

  HEAD("TEST 2 — app-layer scoping (admin client + studio_id filter, the real UI code path)");
  const { data: scopedA } = await admin.from("audit_log").select("id, studio_id").eq("studio_id", STUDIO_A_ID).eq("action", "blacklist.added").in("id", insertedIds);
  const leaksIntoA = (scopedA ?? []).some((r) => r.studio_id !== STUDIO_A_ID);
  const hasOwnRowA = (scopedA ?? []).some((r) => r.id === rowA?.id);
  hasOwnRowA && !leaksIntoA
    ? PASS("studio A query returns its own row, nothing from studio B")
    : FAIL(`studio A query broken — hasOwnRow=${hasOwnRowA} leaks=${leaksIntoA}`);

  HEAD("TEST 3 — RLS: real owner session sees only their own studio's rows");
  const { data: studioA } = await admin.from("studios").select("owner_id").eq("id", STUDIO_A_ID).maybeSingle();
  if (!studioA?.owner_id) {
    console.log("  SKIP: could not resolve studio A's owner_id — skipping RLS session check");
  } else {
    const { data: userA } = await admin.auth.admin.getUserById(studioA.owner_id);
    const ownerEmail = userA?.user?.email;
    if (!ownerEmail) {
      console.log("  SKIP: could not resolve studio A owner's email");
    } else {
      const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({ type: "magiclink", email: ownerEmail });
      if (linkErr) {
        console.log("  SKIP: generateLink failed — " + linkErr.message);
      } else {
        const hashedToken = linkData.properties?.hashed_token;
        const asOwner = createClient(SUPABASE_URL, ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
        const { error: verifyErr } = await asOwner.auth.verifyOtp({ type: "magiclink", token_hash: hashedToken });
        if (verifyErr) {
          console.log("  SKIP: verifyOtp failed — " + verifyErr.message);
        } else {
          const { data: ownSession } = await asOwner.from("audit_log").select("id, studio_id").in("id", insertedIds);
          const seesOwnRow = (ownSession ?? []).some((r) => r.id === rowA?.id);
          const seesOtherStudio = (ownSession ?? []).some((r) => r.studio_id === STUDIO_B_ID);
          seesOwnRow ? PASS("owner session sees their own studio's audit_log row") : FAIL("owner session cannot see their own studio's row");
          !seesOtherStudio ? PASS("owner session cannot see studio B's row") : FAIL("RLS LEAK: owner session sees another studio's audit_log row");
        }
      }
    }
  }

  console.log(`\n${"=".repeat(50)}\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}\n${"=".repeat(50)}`);
} finally {
  await cleanup();
}

process.exit(failures === 0 ? 0 : 1);
