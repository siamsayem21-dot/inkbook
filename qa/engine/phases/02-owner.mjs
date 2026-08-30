// Phase 02 — Owner Portal. Full real-browser click-through is heavy
// (~10+ minutes against production) — reserved for `full` mode. `critical`
// mode instead relies on the Owner-facing coverage already inside the
// Flagship and Security phases (quote approval, deposit-link generation,
// owner-sees-artist, cross-studio isolation), which is honest and fast
// rather than a shallow re-implementation.
import { runCheck, nodeScript } from "../lib/exec.mjs";

export async function run(mode) {
  if (mode !== "full") return [];

  return [
    await runCheck({
      id: "owner.full-clickthrough",
      label: "Owner Portal full real-browser click-through",
      ...nodeScript("scripts/qa-fullrun-owner-clickthrough.mjs"),
      timeoutMs: 20 * 60 * 1000,
    }),
  ];
}
