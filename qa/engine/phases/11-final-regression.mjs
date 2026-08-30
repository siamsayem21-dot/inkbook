// Phase 11 — Final regression. `full` mode only: one more pass of the
// critical flagship journey at the very end of the run, so the report's
// last real signal reflects the state after everything else (including
// any bug fixes applied during this same run) has settled — the same
// "final regression" discipline used throughout this project's QA
// missions.
import { runCheck, nodeScript } from "../lib/exec.mjs";

export async function run(mode) {
  if (mode !== "full") return [];

  return [
    await runCheck({
      id: "final-regression.flagship-rerun",
      label: "Final regression — flagship journey re-run",
      ...nodeScript("scripts/qa-reconcile-flagship-regression.mjs"),
      timeoutMs: 3 * 60 * 1000,
    }),
  ];
}
