// Phase 03 — Artist Portal. `critical` mode runs the existing fast,
// production-safe, DB-only verify-artist-*.mjs scripts (no browser, no
// hardcoded studio/fixture dependency). `full` mode adds the heavy
// real-browser click-through.
//
// A second group of 8 verify-artist-*.mjs scripts (isolation/authz checks
// for bookings-null-schedule, requests, clients, portfolio, flash,
// messages, agreements) is deliberately NOT wired in here, even though
// their logic is real and valuable — investigated 2026-08-30 while
// building this engine: they hardcode `http://localhost:3001` (a real dev
// server dependency, not just a default) AND hardcode a specific studio id
// (`bb0c648e-4f18-4e48-8581-6b7cfd585eea`, currently a studio named
// "SM CreationS" with real-looking artist accounts, not a `[QA-`-tagged
// throwaway fixture). Pointing them at production without first confirming
// with Siam whether that studio is an intentional, sanctioned test fixture
// would risk exactly what this project's QA rules forbid — touching real
// studio/client data casually. See QA_ENGINE.md "Known gaps" for the
// full list and the exact question for Siam.
import { runCheck, nodeScript } from "../lib/exec.mjs";

const PRODUCTION_SAFE_SCRIPTS = [
  ["artist.dashboard-data", "scripts/verify-artist-dashboard-data.mjs", "Artist Dashboard data correctness"],
  ["artist.earnings-integration", "scripts/verify-artist-earnings-integration.mjs", "Artist Earnings booking/payment integration"],
  ["artist.earnings-isolation", "scripts/verify-artist-earnings-isolation.mjs", "Artist Earnings cross-studio isolation"],
  ["artist.schedule-nav", "scripts/verify-artist-schedule-nav.mjs", "Artist Schedule date navigation + booking integration"],
  ["artist.schedule-lifecycle", "scripts/verify-artist-schedule-lifecycle.mjs", "Artist Schedule timezone + lifecycle"],
  ["artist.schedule-isolation", "scripts/verify-artist-schedule-isolation.mjs", "Artist Schedule cross-studio isolation"],
];

export const LOCAL_ONLY_FIXTURE_DEPENDENT_SCRIPTS = [
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

  for (const [id, , label] of LOCAL_ONLY_FIXTURE_DEPENDENT_SCRIPTS) {
    results.push({
      id, label, status: "SKIPPED",
      reason: "Requires local dev server (localhost:3001) + a specific hardcoded studio fixture, not confirmed safe against production — see QA_ENGINE.md 'Known gaps'.",
      durationMs: 0, startedAt: new Date().toISOString(),
    });
  }

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
