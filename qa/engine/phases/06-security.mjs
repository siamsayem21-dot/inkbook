// Phase 06 — Security/Isolation. High priority: security regressions never
// get diluted into the general pass/fail noise — every check here maps
// directly to a real, previously-confirmed production vulnerability (see
// qa/manifest.json's "knownBugs" section and FUNCTIONAL_BUG_LOG.md).
import { runCheck, nodeScript, vitestFiles } from "../lib/exec.mjs";

export async function run(mode) {
  const results = [];

  // Real-Postgres RLS/schema tests — fast, deterministic, run every mode
  // except smoke. Requires a LOCAL Supabase instance (`supabase start`) —
  // SUPABASE_DB_URL is how tests/db/helpers.ts gates this itself. That's a
  // local-environment prerequisite, not a Siam-only blocker, so a missing
  // instance reports SKIPPED rather than a false FAIL or BLOCKED_NEEDS_SIAM.
  if (mode !== "smoke") {
    const hasLocalSupabase = !!process.env.SUPABASE_DB_URL;
    results.push(
      await runCheck({
        id: "security.db-rls-isolation",
        label: "tests/db — RLS isolation + schema integrity (real Postgres)",
        ...vitestFiles(["tests/db/rls-isolation.test.ts", "tests/db/schema-integrity.test.ts", "tests/db/artist-bookings-isolation.test.ts", "tests/db/artist-consultations-isolation.test.ts"], "vitest.config.db.ts"),
        timeoutMs: 5 * 60 * 1000,
        skip: !hasLocalSupabase,
        skipReason: "Requires a local Supabase instance (`supabase start`) — SUPABASE_DB_URL not set. Run manually with `npm run test:db` after starting one, or let CI (.github/workflows/test.yml) run it automatically.",
      })
    );
  }

  if (mode === "smoke") return results;

  // Known-bug live IDOR/leak regressions — each maps to a confirmed,
  // fixed, production vulnerability. Production-safe, self-cleaning.
  const knownBugScripts = [
    ["security.bookings-idor", "scripts/qa-fullrun-security-bookings-idor.mjs", "GET /api/bookings cross-tenant IDOR (BUG-SEC-FULLQA-001, P0)"],
    ["security.custom-request-idor", "scripts/qa-fullrun-security-custom-request-idor-retest.mjs", "submitCustomRequest cross-tenant artist assignment (BUG-SEC-FULLQA-003, P1)"],
    ["security.knowledge-leak", "scripts/qa-fullrun-security-knowledge-leak-retest.mjs", "Public AI routes private-knowledge exposure (BUG-SEC-FULLQA-002, P2)"],
    ["security.isolation-recheck", "scripts/qa-reconcile-isolation-recheck.mjs", "Cross-artist + cross-client isolation"],
  ];
  for (const [id, script, label] of knownBugScripts) {
    results.push(await runCheck({ id, label, ...nodeScript(script), timeoutMs: 3 * 60 * 1000 }));
  }

  if (mode === "full") {
    const fullOnly = [
      ["security.custom-requests-idor-legacy", "scripts/qa-phase-security-idor.mjs", "Custom-requests quote/decline/schedule IDOR (legacy sweep)"],
      ["security.deposit-ownership", "scripts/verify-deposit-ownership.mjs", "sendDepositRequest ownership check"],
      ["security.file-upload", "scripts/verify-file-upload-security.mjs", "File upload 3-layer validation"],
      ["security.rate-limit", "scripts/verify-rate-limit.mjs", "AI endpoint rate limiting"],
      ["security.pii-logs", "scripts/verify-pii-logs.mjs", "No customer PII in logs (billing webhook)"],
      // verify-audit-log.mjs deliberately NOT here — it depends on
      // qa/artist-fixture.json, which only exists during Phase 03 (Artist),
      // which tears it down before Phase 06 (this phase) ever runs. Moved
      // into Phase 03's fixture-dependent block instead (2026-08-30, fixed
      // after the first real `full` run caught this ordering bug).
      ["security.connect-live", "scripts/verify-connect-live.mjs", "Stripe Connect payment reconciliation (idempotency, cross-account rejection, 0% fee)"],
    ];
    for (const [id, script, label] of fullOnly) {
      results.push(await runCheck({ id, label, ...nodeScript(script), timeoutMs: 5 * 60 * 1000 }));
    }
  }

  return results;
}
