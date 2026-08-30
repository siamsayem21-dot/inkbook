// Phase 03 — Artist Portal. `critical` mode runs the fast, production-safe,
// DB-only verify-artist-*.mjs scripts PLUS the isolation/authz scripts that
// need a real artist fixture. `full` mode adds the heavy real-browser
// click-through.
//
// 2026-08-30: a second group of 9 verify-artist-*.mjs / verify-audit-log.mjs
// scripts hardcoded a specific studio id, which investigation confirmed
// belongs to a real, actively-used studio ("SM CreationS") — not a QA
// fixture — plus a second real studio ("Siam Enterprise", the exact studio
// behind Siam's live P1 bug report earlier this session) used as the
// "different studio" in cross-studio checks. Per explicit instruction, this
// engine never touches either. All 9 scripts are now rewired to read a
// disposable, uniquely QA-tagged fixture from qa/artist-fixture.json
// instead (provisioned by scripts/qa-engine-artist-fixture.mjs), verified
// working end-to-end against production with zero real data touched.
import { runCheck, nodeScript } from "../lib/exec.mjs";

const PRODUCTION_SAFE_SCRIPTS = [
  ["artist.dashboard-data", "scripts/verify-artist-dashboard-data.mjs", "Artist Dashboard data correctness"],
  ["artist.earnings-integration", "scripts/verify-artist-earnings-integration.mjs", "Artist Earnings booking/payment integration"],
  ["artist.earnings-isolation", "scripts/verify-artist-earnings-isolation.mjs", "Artist Earnings cross-studio isolation"],
  ["artist.schedule-nav", "scripts/verify-artist-schedule-nav.mjs", "Artist Schedule date navigation + booking integration"],
  ["artist.schedule-lifecycle", "scripts/verify-artist-schedule-lifecycle.mjs", "Artist Schedule timezone + lifecycle"],
  ["artist.schedule-isolation", "scripts/verify-artist-schedule-isolation.mjs", "Artist Schedule cross-studio isolation"],
];

// Fixture-dependent scripts (need qa/artist-fixture.json — provisioned
// below, before these run, and torn down after regardless of outcome).
export const FIXTURE_DEPENDENT_SCRIPTS = [
  ["artist.bookings-null-schedule", "scripts/verify-artist-bookings-null-schedule.mjs", "Artist Bookings null date/time regression"],
  ["artist.requests-authz", "scripts/verify-artist-requests-authz.mjs", "Artist Requests authorization + lifecycle"],
  ["artist.requests-isolation", "scripts/verify-artist-requests-isolation.mjs", "Artist Requests cross-studio isolation"],
  ["artist.clients-isolation", "scripts/verify-artist-clients-isolation.mjs", "Artist Clients isolation + integration"],
  ["artist.portfolio-isolation", "scripts/verify-artist-portfolio-isolation.mjs", "Artist Portfolio isolation + integration"],
  ["artist.flash-isolation", "scripts/verify-artist-flash-isolation.mjs", "Artist Flash lifecycle-guard + isolation"],
  ["artist.messages-isolation", "scripts/verify-artist-messages-isolation.mjs", "Artist Messages isolation"],
  ["artist.agreements-isolation", "scripts/verify-artist-agreements-isolation.mjs", "Artist Agreements creation + isolation + immutability"],
];

export async function run(mode) {
  if (mode === "smoke") return [];

  const results = [];
  for (const [id, script, label] of PRODUCTION_SAFE_SCRIPTS) {
    results.push(await runCheck({ id, label, ...nodeScript(script), timeoutMs: 60000 }));
  }

  const provisionResult = await runCheck({
    id: "artist.fixture-provision",
    label: "Provision disposable artist-isolation fixture",
    ...nodeScript("scripts/qa-engine-artist-fixture.mjs", ["--provision"]),
    timeoutMs: 30000,
  });
  results.push(provisionResult);

  if (provisionResult.status === "PASS") {
    for (const [id, script, label] of FIXTURE_DEPENDENT_SCRIPTS) {
      results.push(await runCheck({ id, label, ...nodeScript(script), timeoutMs: 60000 }));
    }
  } else {
    for (const [id, , label] of FIXTURE_DEPENDENT_SCRIPTS) {
      results.push({
        id, label, status: "SKIPPED",
        reason: "Fixture provisioning failed — see artist.fixture-provision.",
        durationMs: 0, startedAt: new Date().toISOString(),
      });
    }
  }

  // Always tear down, even if some checks above failed — never leave the
  // fixture behind for Phase 12's sweep to have to catch.
  results.push(
    await runCheck({
      id: "artist.fixture-cleanup",
      label: "Clean up disposable artist-isolation fixture",
      ...nodeScript("scripts/qa-engine-artist-fixture.mjs", ["--cleanup", "--apply"]),
      timeoutMs: 30000,
    })
  );

  if (mode === "full") {
    results.push(
      await runCheck({
        id: "artist.full-clickthrough",
        label: "Artist Portal full real-browser click-through",
        ...nodeScript("scripts/qa-fullrun-artist-clickthrough.mjs"),
        timeoutMs: 20 * 60 * 1000,
      })
    );
  }

  return results;
}
