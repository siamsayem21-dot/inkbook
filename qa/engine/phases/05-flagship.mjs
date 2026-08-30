// Phase 05 — Flagship business journey (Public Studio -> AI Consultation ->
// Artist Match -> Quote -> Stripe TEST Deposit -> Booking -> cross-role
// state). `critical` runs the right-sized live regression (real AI/Artist
// Match/booking/Stripe-session-creation calls, no full card payment —
// proven pattern from the 2026-08-30 pre-deploy reconciliation). `full`
// additionally runs the exhaustive version with a complete real Stripe TEST
// payment (success/decline/cancel) and full cross-role verification.
import { runCheck, nodeScript } from "../lib/exec.mjs";

export async function run(mode) {
  if (mode === "smoke") return [];

  const results = [
    await runCheck({
      id: "flagship.critical-regression",
      label: "Flagship journey — right-sized live regression",
      ...nodeScript("scripts/qa-reconcile-flagship-regression.mjs"),
      timeoutMs: 3 * 60 * 1000,
    }),
  ];

  if (mode === "full") {
    results.push(
      await runCheck({
        id: "flagship.full-journey",
        label: "Flagship journey — full, real Stripe TEST payment (success/decline/cancel)",
        ...nodeScript("scripts/qa-fullrun-flagship-journey.mjs"),
        timeoutMs: 30 * 60 * 1000,
      })
    );
  }

  return results;
}
