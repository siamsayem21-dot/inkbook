// Phase 09 — Automations/Cron. The sms-reminders migration gate already
// ran in Preflight (every mode needs to know that status early) — this
// phase covers the rest: auth-guard checks on all 6 cron routes (fast,
// safe, every mode except smoke) and real organic-production-evidence
// checks (full mode — slower, reads real production data to confirm each
// cron has genuinely executed on schedule).
import { runCheck, nodeScript } from "../lib/exec.mjs";

export async function run(mode) {
  if (mode === "smoke") return [];

  const results = [
    await runCheck({
      id: "automations.cron-organic-evidence",
      label: "Cron auth-guard (6 routes) + organic production-evidence check",
      ...nodeScript("scripts/qa-fullrun-cron-organic-evidence.mjs"),
      timeoutMs: 3 * 60 * 1000,
    }),
  ];

  return results;
}
