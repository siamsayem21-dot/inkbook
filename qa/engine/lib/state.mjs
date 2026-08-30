// Persistent run state so a QA Engine run survives interruption (session
// limit, Ctrl+C, a crashed phase) and can resume from the first unfinished
// phase instead of restarting a multi-hour run from scratch.
import { readFileSync, writeFileSync, existsSync } from "fs";
import path from "path";
import { REPO_ROOT } from "./env.mjs";

const STATE_PATH = path.join(REPO_ROOT, "qa", "run-state.json");

export function loadState() {
  if (!existsSync(STATE_PATH)) return null;
  try {
    return JSON.parse(readFileSync(STATE_PATH, "utf8"));
  } catch {
    return null;
  }
}

export function saveState(state) {
  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}

export function newRun(mode) {
  return {
    runId: `qa-${mode}-${Date.now()}`,
    mode,
    startedAt: new Date().toISOString(),
    completedAt: null,
    phases: {}, // id -> { status: "pending"|"running"|"completed"|"failed"|"blocked", startedAt, completedAt }
    nextPhaseIndex: 0,
  };
}

/**
 * Decide whether to resume a prior run or start fresh.
 * Resumes only when: same mode, and the prior run didn't complete.
 * A completed prior run (even minutes old) never silently resumes into a
 * no-op — that would hide a stale state.nextPhaseIndex being past the end.
 */
export function resolveRun(mode, forceFresh) {
  const prior = loadState();
  if (!forceFresh && prior && prior.mode === mode && !prior.completedAt) {
    return { run: prior, resumed: true };
  }
  return { run: newRun(mode), resumed: false };
}

export function markPhaseStart(run, phaseId) {
  run.phases[phaseId] = { status: "running", startedAt: new Date().toISOString(), completedAt: null, results: [] };
  saveState(run);
}

export function markPhaseDone(run, phaseId, status, results) {
  run.phases[phaseId] = {
    ...run.phases[phaseId],
    status, // "completed" | "failed" | "blocked"
    completedAt: new Date().toISOString(),
    // Persisted so a resumed run's final report still includes every
    // earlier phase's real results, not just whatever ran in this process.
    results,
  };
  run.nextPhaseIndex += 1;
  saveState(run);
}

export function markRunComplete(run) {
  run.completedAt = new Date().toISOString();
  saveState(run);
}
