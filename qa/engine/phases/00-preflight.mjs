// Phase 00 — Preflight. Fast environment/reachability sanity checks that
// every other phase depends on. Runs in every mode (smoke/critical/full) —
// if this fails, nothing downstream can be trusted.
import { runCheck, nodeScript } from "../lib/exec.mjs";
import { BASE_URL } from "../lib/env.mjs";

export async function run(mode) {
  const checks = [];

  checks.push(
    await runCheck({
      id: "preflight.reachable",
      label: `Production reachable (${BASE_URL})`,
      ...nodeScript("scripts/qa-engine-reachability-check.mjs"),
      timeoutMs: 20000,
    })
  );

  checks.push(await runCheck({ id: "preflight.sms-reminders-migration", label: "cron/sms-reminders migration gate (known blocker)", ...nodeScript("scripts/qa-engine-sms-reminders-migration-gate.mjs"), timeoutMs: 20000 }));

  if (mode !== "smoke") {
    checks.push(await runCheck({ id: "preflight.typecheck", label: "TypeScript typecheck", command: "npx", args: ["tsc", "--noEmit", "-p", "tsconfig.json"], timeoutMs: 120000 }));
    checks.push(await runCheck({ id: "preflight.lint", label: "ESLint", command: "npm", args: ["run", "lint"], timeoutMs: 120000 }));
  }

  if (mode === "full") {
    checks.push(await runCheck({ id: "preflight.migrations", label: "Schema/migration probe (verify-migrations.mjs)", ...nodeScript("scripts/verify-migrations.mjs"), timeoutMs: 30000 }));
  }

  return checks;
}
