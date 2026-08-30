// Phase 08 — Mobile + visual. Real mobile-viewport (390x844) critical-path
// taps against production, plus objective (getComputedStyle-based, not
// subjective-beauty) design/motion regression checks. `full` mode only —
// inherently slower than a CI-friendly smoke/critical budget.
import { runCheck, nodeScript } from "../lib/exec.mjs";

export async function run(mode) {
  if (mode !== "full") return [];

  return [
    await runCheck({
      id: "mobile.critical-paths",
      label: "Mobile critical path (390x844, real taps)",
      ...nodeScript("scripts/qa-fullrun-mobile-critical-paths.mjs"),
      timeoutMs: 10 * 60 * 1000,
    }),
    await runCheck({
      id: "mobile.design-motion-reverify",
      label: "Design/motion objective regression (getComputedStyle transforms)",
      ...nodeScript("scripts/qa-motion-reverify-production.mjs"),
      timeoutMs: 5 * 60 * 1000,
    }),
  ];
}
