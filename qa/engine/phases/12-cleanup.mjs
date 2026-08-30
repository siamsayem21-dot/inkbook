// Phase 12 — Cleanup. Every check the engine runs already self-cleans;
// this is the second, independent safety net: dry-run sweep for anything
// left behind by a crashed check, verify it's genuinely QA-tagged, delete
// it, verify gone. Always runs, every mode — it's cheap and it's the
// engine's own responsibility to never leave a mess, regardless of what
// happened upstream.
import { runCheck, nodeScript } from "../lib/exec.mjs";

export async function run() {
  return [
    await runCheck({
      id: "cleanup.sweep",
      label: "QA data cleanup sweep (dry-run -> verify -> delete -> verify gone)",
      ...nodeScript("scripts/qa-engine-cleanup-sweep.mjs", ["--apply"]),
      timeoutMs: 60000,
    }),
  ];
}
