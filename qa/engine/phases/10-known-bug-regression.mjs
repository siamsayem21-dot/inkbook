// Phase 10 — Permanent known-bug regression lock. Every serious bug this
// project has found and fixed gets ONE deterministic, fast (<15s total),
// offline unit test that fails again if the bug ever comes back. Runs in
// EVERY mode including smoke — this is the cheapest, highest-signal check
// in the whole engine. The live/production-facing half of these same known
// bugs (real IDOR probes, real UI checks) lives in the Security and
// Owner/Artist/Client phases — see qa/manifest.json's "knownBugs" section
// for the full cross-reference so nothing is silently uncovered.
import { runCheck, vitestFiles } from "../lib/exec.mjs";

// Keep this list curated and intentional — every file here is a permanent
// lock for a specific, named, previously-real bug (see qa/manifest.json).
// Do not add general-purpose unit tests here; they belong in `npm run test`.
export const LOCKED_REGRESSION_FILES = [
  "tests/unit/api-bookings.test.ts",                    // BUG-SEC-FULLQA-001 — cross-tenant bookings IDOR
  "tests/unit/custom-request-idor.test.ts",              // BUG-SEC-FULLQA-003 — forged cross-tenant artist assignment
  "tests/unit/studio-knowledge-helper.test.ts",          // BUG-SEC-FULLQA-002 — private studio knowledge exposure
  "tests/unit/api-ai-routes.test.ts",                    // BUG-SEC-FULLQA-002 (route wiring)
  "tests/unit/reconcile-guest-consultations.test.ts",    // BUG-FLAGSHIP-002 + its ILIKE-wildcard correction — guest consultation exact-email matching/privacy
  "tests/unit/artist-match.test.ts",                     // BUG-FLAGSHIP-001 — Artist Match case-sensitivity
  "tests/unit/api-ai-artist-match.test.ts",              // Artist Match API route wiring
  "tests/unit/artist-accept-invite.test.ts",             // Artist Invite infinite loading + existing-account password confusion
];

export async function run() {
  return [
    await runCheck({
      id: "known-bugs.locked-regression-suite",
      label: `Locked known-bug regression suite (${LOCKED_REGRESSION_FILES.length} files)`,
      ...vitestFiles(LOCKED_REGRESSION_FILES),
      timeoutMs: 60000,
    }),
  ];
}
