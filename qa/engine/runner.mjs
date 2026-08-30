#!/usr/bin/env node
// InkBook QA Engine — one command, permanent, resumable QA system.
//
//   npm run qa:inkbook -- --smoke      fast production health check (~1 min)
//   npm run qa:inkbook -- --critical   core Owner/Artist/Client + flagship + security + known-bug regressions (~10-15 min)
//   npm run qa:inkbook -- --full       everything (~1-3 hours, real Stripe TEST payments, full click-throughs, mobile)
//
// See QA_ENGINE.md for architecture and qa/manifest.json for full test
// surface coverage.
import { BASE_URL, IS_PRODUCTION_TARGET } from "./lib/env.mjs";
import { resolveRun, markPhaseStart, markPhaseDone, markRunComplete } from "./lib/state.mjs";
import { writeResults } from "./lib/report.mjs";

import * as preflight from "./phases/00-preflight.mjs";
import * as qaData from "./phases/01-qa-data.mjs";
import * as owner from "./phases/02-owner.mjs";
import * as artist from "./phases/03-artist.mjs";
import * as client from "./phases/04-client.mjs";
import * as flagship from "./phases/05-flagship.mjs";
import * as security from "./phases/06-security.mjs";
import * as edgeCases from "./phases/07-edge-cases.mjs";
import * as mobile from "./phases/08-mobile.mjs";
import * as automations from "./phases/09-automations.mjs";
import * as knownBugs from "./phases/10-known-bug-regression.mjs";
import * as finalRegression from "./phases/11-final-regression.mjs";
import * as cleanup from "./phases/12-cleanup.mjs";

const PHASES = [
  ["preflight", preflight],
  ["qa-data", qaData],
  ["owner", owner],
  ["artist", artist],
  ["client", client],
  ["flagship", flagship],
  ["security", security],
  ["edge-cases", edgeCases],
  ["mobile", mobile],
  ["automations", automations],
  ["known-bug-regression", knownBugs],
  ["final-regression", finalRegression],
  ["cleanup", cleanup],
];

function parseArgs() {
  const args = process.argv.slice(2);
  const mode = args.includes("--full") ? "full" : args.includes("--critical") ? "critical" : "smoke";
  const forceFresh = args.includes("--fresh");
  return { mode, forceFresh };
}

async function main() {
  const { mode, forceFresh } = parseArgs();
  const { run, resumed } = resolveRun(mode, forceFresh);

  console.log(`\n${"#".repeat(60)}`);
  console.log(`# InkBook QA Engine — mode: ${mode}${resumed ? " (RESUMING run " + run.runId + ")" : " (new run " + run.runId + ")"}`);
  console.log(`# Target: ${BASE_URL}${IS_PRODUCTION_TARGET ? " (PRODUCTION — QA-tagged, self-cleaning data only)" : ""}`);
  console.log(`${"#".repeat(60)}\n`);

  const resultsByPhase = {};

  for (let i = 0; i < PHASES.length; i++) {
    const [phaseId] = PHASES[i];
    const prior = run.phases[phaseId];
    if (i < run.nextPhaseIndex && prior?.results) {
      // Already done in an earlier process (this run was resumed) — reuse
      // its persisted results so the final report stays complete instead
      // of only reflecting phases executed in this particular process.
      resultsByPhase[phaseId] = prior.results;
    }
  }

  for (let i = run.nextPhaseIndex; i < PHASES.length; i++) {
    const [phaseId, mod] = PHASES[i];
    const priorStatus = run.phases[phaseId]?.status;
    if (priorStatus === "completed" || priorStatus === "failed" || priorStatus === "blocked") {
      console.log(`\n>>> Phase '${phaseId}' already ${priorStatus} in this run — skipping (use --fresh to force a full restart).`);
      continue;
    }

    console.log(`\n>>> Phase ${i + 1}/${PHASES.length}: ${phaseId}`);
    markPhaseStart(run, phaseId);

    let results;
    try {
      results = await mod.run(mode);
    } catch (e) {
      console.error(`Phase '${phaseId}' threw an unexpected error:`, e);
      results = [{ id: `${phaseId}.unexpected-error`, label: `Phase ${phaseId} crashed`, status: "FAIL", reason: e.message, durationMs: 0, startedAt: new Date().toISOString() }];
    }

    resultsByPhase[phaseId] = results;
    const ICONS = { PASS: "✅", BLOCKED_NEEDS_SIAM: "🚧", SKIPPED: "⏭️", FAIL: "❌" };
    for (const r of results) {
      const icon = ICONS[r.status] ?? "❌";
      console.log(`  ${icon} ${r.status.padEnd(20)} ${r.label ?? r.id}${r.reason ? " — " + r.reason : ""}`);
    }

    const anyFail = results.some((r) => r.status === "FAIL");
    markPhaseDone(run, phaseId, anyFail ? "failed" : "completed", results);

    // Normal application/QA-infra bugs never stop the mission — continue to
    // the next phase regardless. Only a hard crash inside the runner itself
    // (caught above, reported as a FAIL result) would ever interrupt flow,
    // and even that doesn't throw further.
  }

  markRunComplete(run);
  const payload = writeResults(run, resultsByPhase);

  console.log(`\n${"#".repeat(60)}`);
  console.log(`# DONE — ${payload.totals.PASS} PASS, ${payload.totals.FAIL} FAIL, ${payload.totals.BLOCKED_NEEDS_SIAM} BLOCKED_NEEDS_SIAM, ${payload.totals.SKIPPED} SKIPPED`);
  console.log(`# Report: QA_LATEST_REPORT.md · qa/results/latest.json`);
  console.log(`${"#".repeat(60)}\n`);

  process.exit(payload.totals.FAIL > 0 ? 1 : 0);
}

main();
