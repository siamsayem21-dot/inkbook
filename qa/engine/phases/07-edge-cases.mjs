// Phase 07 — Failure/edge-case sweep (double-click, refresh, malformed IDs,
// invalid routes, etc). Reuses the existing exhaustive-mission sweep
// rather than rewriting — `full` mode only, since it's a broad, slower
// pass; `critical` mode's edge-case coverage instead comes from the
// specific cases already embedded in the known-bug regression tests
// (duplicate/retry on invite acceptance, double-submit on bookings, etc.)
// — see qa/manifest.json for the exact cross-reference.
import { runCheck, nodeScript } from "../lib/exec.mjs";

export async function run(mode) {
  if (mode !== "full") return [];

  return [
    await runCheck({
      id: "edge-cases.resilience-sweep",
      label: "Error/resilience sweep — malformed IDs, double-submit, nonexistent routes",
      ...nodeScript("scripts/qa-phase-resilience.mjs"),
      timeoutMs: 5 * 60 * 1000,
    }),
  ];
}
