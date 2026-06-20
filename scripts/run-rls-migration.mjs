/**
 * One-shot RLS migration runner.
 * Reads credentials from .env.local and posts the migration SQL to the
 * Supabase Management API, which supports arbitrary DDL (ALTER TABLE,
 * CREATE POLICY, etc.) — unlike the PostgREST client which does not.
 *
 * Prerequisites:
 *   1. Set SUPABASE_ACCESS_TOKEN in your environment:
 *        (Supabase Dashboard → Account → Access Tokens → Generate)
 *        PowerShell:  $env:SUPABASE_ACCESS_TOKEN="sbp_..."
 *        Bash:        export SUPABASE_ACCESS_TOKEN="sbp_..."
 *
 *   2. Run:  node scripts/run-rls-migration.mjs
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dir = dirname(fileURLToPath(import.meta.url));
const root  = join(__dir, "..");

// ── Parse .env.local ─────────────────────────────────────────────────────────
function parseEnv(filePath) {
  try {
    return Object.fromEntries(
      readFileSync(filePath, "utf8")
        .split("\n")
        .filter(l => l.includes("=") && !l.trimStart().startsWith("#"))
        .map(l => {
          const idx = l.indexOf("=");
          return [l.slice(0, idx).trim(), l.slice(idx + 1).trim().replace(/^["']|["']$/g, "")];
        })
    );
  } catch {
    return {};
  }
}

const env = { ...parseEnv(join(root, ".env.local")), ...process.env };

const supabaseUrl    = env.NEXT_PUBLIC_SUPABASE_URL;
const accessToken    = env.SUPABASE_ACCESS_TOKEN;

if (!supabaseUrl) {
  console.error("❌  NEXT_PUBLIC_SUPABASE_URL not found in .env.local");
  process.exit(1);
}
if (!accessToken) {
  console.error("❌  SUPABASE_ACCESS_TOKEN not set.");
  console.error("    Generate one at: https://supabase.com/dashboard/account/tokens");
  console.error("    Then run:  $env:SUPABASE_ACCESS_TOKEN=\"sbp_...\" ; node scripts/run-rls-migration.mjs");
  process.exit(1);
}

// Extract project ref from URL: https://<ref>.supabase.co → <ref>
const projectRef = supabaseUrl.replace("https://", "").split(".")[0];
if (!projectRef || projectRef === supabaseUrl) {
  console.error("❌  Could not extract project ref from:", supabaseUrl);
  process.exit(1);
}

// ── Migration SQL ─────────────────────────────────────────────────────────────
const migrationPath = join(root, "supabase/migrations/20260620000000_rls_gaps.sql");
const sql = readFileSync(migrationPath, "utf8");

// ── Execute ───────────────────────────────────────────────────────────────────
const apiUrl = `https://api.supabase.com/v1/projects/${projectRef}/database/query`;

console.log(`\n🔒  Running RLS migration on project: ${projectRef}`);
console.log(`    ${migrationPath}\n`);

const res = await fetch(apiUrl, {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${accessToken}`,
    "Content-Type":  "application/json",
  },
  body: JSON.stringify({ query: sql }),
});

const text = await res.text();

if (!res.ok) {
  console.error(`❌  Management API returned ${res.status}:`);
  console.error(text);
  process.exit(1);
}

console.log("✅  Migration applied successfully.");
console.log("    Tables now protected: deposit_payments, standalone_consent_forms, consultations (artist policy)\n");
