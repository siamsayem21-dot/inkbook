/**
 * Visual QA V3 -- safe auto-fix loop.
 *
 * Orchestrates: run V1 + V2 -> AI review -> for every REAL_REGRESSION at
 * high confidence, attempt the smallest safe fix (up to 3 tries), re-running
 * V1 + V2 + AI review after each attempt. Never touches approved baselines.
 * Never fixes payment/auth/security/schema/major-UX-risk routes or files.
 *
 * Modes:
 *   --dry-run  (default) reviews and proposes fixes, edits nothing.
 *   --auto     actually applies fixes for safe, high-confidence regressions.
 *
 * Usage:
 *   node scripts/visual-qa/auto-fix-loop.mjs --dry-run
 *   node scripts/visual-qa/auto-fix-loop.mjs --auto
 *
 * Env (forwarded to the underlying V1/V2 Playwright runs, same as those
 * commands already support):
 *   VISUAL_QA_BASE_URL, VISUAL_QA_SKIP_WEBSERVER, VISUAL_QA_ROUTES
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";
import { callClaude, extractJson } from "./lib/anthropic.mjs";
import { loadImageForVision, closeImageResizer } from "./lib/image.mjs";
import { checkRouteSafety, checkFileSafety, HIGH_CONFIDENCE_THRESHOLD, MAX_AUTO_FIX_ATTEMPTS } from "./lib/safety.mjs";
import { likelySourceFileFor } from "./lib/route-source-map.mjs";
import { runAiReview } from "./ai-review.mjs";

const MODE = process.argv.includes("--auto") ? "auto" : "dry-run";
const V3_OUT_DIR = path.join("reports", "visual-qa-v3");
const LOG_OUT = path.join(V3_OUT_DIR, "auto-fix-log.json");

const NPM_CMD = process.platform === "win32" ? "npm.cmd" : "npm";

function runNpmScript(scriptName) {
  try {
    // shell:true is required on Windows -- npm.cmd is a batch file, and
    // Node's execFileSync cannot spawn it directly (throws EINVAL) without
    // going through a shell. scriptName is always one of our own hardcoded
    // npm script names, never external input, so this is safe.
    execFileSync(NPM_CMD, ["run", scriptName], { stdio: "pipe", env: process.env, shell: true });
    return { ok: true };
  } catch (error) {
    // A failing Playwright run exits non-zero -- that's expected/normal here,
    // not a script crash. The actual pass/fail per route comes from the JSON
    // report files, not this exit code. But a genuine spawn-level failure
    // (wrong command, EINVAL, etc.) must be visible, not silently swallowed --
    // that would make every subsequent "rerun" a silent no-op reading stale
    // report files.
    if (error.code && !error.status && !error.stdout && !error.stderr) {
      console.error(`  WARNING: "npm run ${scriptName}" failed to even start: ${error.message}`);
    }
    return { ok: false, stdout: error.stdout?.toString(), stderr: error.stderr?.toString() };
  }
}

function runV1() {
  return runNpmScript("test:visual");
}

function runV2() {
  return runNpmScript("test:visual:v2");
}

function readV2Report() {
  const p = path.join("reports", "visual-qa-v2", "ai-report.json");
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function readV1Results() {
  const p = path.join("reports", "visual-qa", "results.json");
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function v1Passed(v1Results) {
  if (!v1Results) return false;
  const stats = v1Results.stats;
  return stats && stats.unexpected === 0 && stats.expected > 0;
}

const FIX_SYSTEM_PROMPT = `You are Claude Code making the smallest possible safe fix to resolve a visual QA regression in a Next.js/TypeScript codebase (InkBook, a tattoo studio SaaS). You will be given: the route and viewport that regressed, the AI reviewer's description of the defect, the suggested fix, screenshots (baseline/actual/diff), and the full current source of the file most likely responsible.

Rules:
- Make the SMALLEST possible change. Do not redesign, do not refactor, do not touch anything unrelated to the described defect.
- Prefer the simplest explanation that fits what you see. A single element rendering in the wrong color/size/position is almost always a single wrong className, style value, or prop -- NOT a duplicated, missing, or reordered element. Only propose adding/removing an element if the images clearly show one is literally absent or duplicated, not just visually different.
- Only propose a change within the ONE file you were given.
- Your patch must be an EXACT, UNIQUE substring match against the given file content (old_string must appear exactly once) so it can be applied as a literal find-and-replace.
- Never touch payment, authentication, consent, database schema, or security-sensitive code -- if the fix would require touching that kind of code, respond with "unsafe": true instead of a patch.
- If you cannot identify a safe, confident, minimal fix from the given information, respond with "unsafe": true.

Respond with ONLY a single JSON object, no markdown fences, no extra prose, exactly this shape:
{
  "unsafe": boolean,
  "file": string,             // relative path, must equal the file you were given
  "oldString": string,        // exact substring to replace (empty string if unsafe: true)
  "newString": string,        // its replacement (empty string if unsafe: true)
  "explanation": string       // one or two sentences on what this changes and why
}`;

async function proposeFix({ route, viewport, review, filePath, fileContent }) {
  const [baseline, actual, diff] = await Promise.all([
    loadImageForVision(review.v2Entry.baselinePath),
    loadImageForVision(review.v2Entry.screenshotPath),
    loadImageForVision(review.v2Entry.diffPath),
  ]);

  const content = [
    {
      type: "text",
      text: [
        `Route: ${route}`,
        `Viewport: ${viewport}`,
        `AI reviewer classification: ${review.classification} (confidence ${review.confidence})`,
        `AI reviewer reason: ${review.reason}`,
        `Detected issues:\n${review.detectedIssues.map((i) => `- ${i}`).join("\n") || "(none listed)"}`,
        `Suggested fix: ${review.suggestedFix || "(none provided)"}`,
        ``,
        `File to fix: ${filePath}`,
        `--- BEGIN FILE CONTENT ---`,
        fileContent,
        `--- END FILE CONTENT ---`,
      ].join("\n"),
    },
  ];
  if (baseline) {
    content.push({ type: "text", text: "Baseline (approved) screenshot:" });
    content.push({ type: "image", source: { type: "base64", media_type: baseline.mediaType, data: baseline.base64 } });
  }
  if (actual) {
    content.push({ type: "text", text: "Actual (current, regressed) screenshot:" });
    content.push({ type: "image", source: { type: "base64", media_type: actual.mediaType, data: actual.base64 } });
  }
  if (diff) {
    content.push({ type: "text", text: "Diff image:" });
    content.push({ type: "image", source: { type: "base64", media_type: diff.mediaType, data: diff.base64 } });
  }

  const responseText = await callClaude({ system: FIX_SYSTEM_PROMPT, messages: [{ role: "user", content }], maxTokens: 4096 });
  return extractJson(responseText);
}

function applyPatch(filePath, oldString, newString) {
  const content = fs.readFileSync(filePath, "utf8");
  const occurrences = content.split(oldString).length - 1;
  if (occurrences !== 1) {
    throw new Error(`oldString matched ${occurrences} time(s) in ${filePath}, expected exactly 1 -- refusing to apply`);
  }
  fs.writeFileSync(filePath, content.replace(oldString, newString));
}

async function attemptAutoFix(route, viewport, review, log) {
  const filePath = likelySourceFileFor(route);
  if (!filePath || !fs.existsSync(filePath)) {
    log.push({ route, viewport, outcome: "skipped", reason: `No known/safe source file mapped for route "${route}"` });
    return { classification: "UNCERTAIN_NEEDS_SIAM", reason: `No known source file mapped for route "${route}"` };
  }

  const fileSafety = checkFileSafety(filePath);
  if (fileSafety.blocked) {
    log.push({ route, viewport, outcome: "blocked", reason: fileSafety.reason });
    return { classification: "UNCERTAIN_NEEDS_SIAM", reason: fileSafety.reason };
  }

  const originalContent = fs.readFileSync(filePath, "utf8");
  const attempts = [];

  for (let attempt = 1; attempt <= MAX_AUTO_FIX_ATTEMPTS; attempt++) {
    console.log(`  Auto-fix attempt ${attempt}/${MAX_AUTO_FIX_ATTEMPTS} for ${route} (${viewport})...`);
    fs.writeFileSync(filePath, originalContent); // always start each attempt from the pristine original

    let patch;
    try {
      patch = await proposeFix({ route, viewport, review, filePath, fileContent: originalContent });
    } catch (error) {
      attempts.push({ attempt, error: `propose-fix failed: ${error.message}` });
      continue;
    }

    if (patch.unsafe) {
      attempts.push({ attempt, error: "Model reported the fix as unsafe", explanation: patch.explanation });
      continue;
    }
    if (patch.file !== filePath) {
      attempts.push({ attempt, error: `Model targeted a different file (${patch.file}) than provided (${filePath}) -- refusing` });
      continue;
    }
    const patchFileSafety = checkFileSafety(patch.file);
    if (patchFileSafety.blocked) {
      attempts.push({ attempt, error: patchFileSafety.reason });
      continue;
    }

    try {
      applyPatch(filePath, patch.oldString, patch.newString);
    } catch (error) {
      attempts.push({ attempt, error: error.message });
      continue;
    }

    console.log(`    Applied patch. Rerunning V1 + V2 for ${route}...`);
    const priorRoutes = process.env.VISUAL_QA_ROUTES;
    process.env.VISUAL_QA_ROUTES = route;
    runV1();
    runV2();
    if (priorRoutes === undefined) delete process.env.VISUAL_QA_ROUTES;
    else process.env.VISUAL_QA_ROUTES = priorRoutes;

    const v1Results = readV1Results();
    const v2Report = readV2Report();
    const nowPassing = v2Report.checks.find((c) => c.route === route && c.viewport === viewport)?.status === "PASS";
    const v1Ok = v1Passed(v1Results);

    if (nowPassing && v1Ok) {
      attempts.push({ attempt, error: null, explanation: patch.explanation, success: true });
      log.push({ route, viewport, outcome: "fixed", attempts, file: filePath, explanation: patch.explanation });
      return { classification: "REAL_REGRESSION", fixed: true, file: filePath, explanation: patch.explanation, attempts: attempt };
    }

    attempts.push({ attempt, error: "Fix applied but V1/V2 still failing for this route", explanation: patch.explanation });
  }

  // Exhausted all attempts -- restore the file to its untouched original state.
  fs.writeFileSync(filePath, originalContent);
  log.push({ route, viewport, outcome: "exhausted", attempts, file: filePath });
  return {
    classification: "UNCERTAIN_NEEDS_SIAM",
    reason: `Auto-fix exhausted ${MAX_AUTO_FIX_ATTEMPTS} attempts without resolving the regression. File restored to its original state.`,
  };
}

export async function runAutoFixLoop(mode = MODE) {
  console.log(`=== Visual QA V3 auto-fix loop (mode: ${mode}) ===\n`);

  console.log("Running V1...");
  runV1();
  console.log("Running V2...");
  runV2();
  console.log("Running AI review...");
  let review = await runAiReview();

  const log = [];
  const finalReviews = [];

  for (const entry of review.reviews) {
    if (entry.classification !== "REAL_REGRESSION" || entry.confidence < HIGH_CONFIDENCE_THRESHOLD) {
      finalReviews.push(entry);
      continue;
    }

    const routeSafety = checkRouteSafety(entry.route);
    if (routeSafety.blocked) {
      finalReviews.push({ ...entry, classification: "UNCERTAIN_NEEDS_SIAM", reason: routeSafety.reason });
      log.push({ route: entry.route, viewport: entry.viewport, outcome: "blocked", reason: routeSafety.reason });
      continue;
    }

    if (mode === "dry-run") {
      finalReviews.push(entry);
      log.push({
        route: entry.route,
        viewport: entry.viewport,
        outcome: "dry-run-proposed",
        proposedFix: entry.suggestedFix,
        likelySourceFile: likelySourceFileFor(entry.route),
      });
      continue;
    }

    // A prior entry in this same run may already have fixed the exact same
    // underlying file (e.g. desktop and mobile of the same route sharing one
    // source file) -- re-check the live V2 report before spending a fresh
    // attempt cycle on something that's already resolved.
    const alreadyPassing = readV2Report().checks.find(
      (c) => c.route === entry.route && c.viewport === entry.viewport,
    )?.status === "PASS";
    if (alreadyPassing) {
      finalReviews.push({ ...entry, classification: "REAL_REGRESSION", reason: `${entry.reason} -- already resolved by a fix applied for another viewport of this route.`, fixed: true });
      log.push({ route: entry.route, viewport: entry.viewport, outcome: "already-fixed" });
      continue;
    }

    const result = await attemptAutoFix(entry.route, entry.viewport, entry, log);
    if (result.fixed) {
      finalReviews.push({
        ...entry,
        classification: "REAL_REGRESSION",
        reason: `${entry.reason} -- auto-fixed in ${result.attempts} attempt(s): ${result.explanation}`,
        fixed: true,
        fixedFile: result.file,
      });
    } else {
      finalReviews.push({ ...entry, classification: result.classification, reason: result.reason });
    }
  }

  await closeImageResizer();

  fs.mkdirSync(V3_OUT_DIR, { recursive: true });
  fs.writeFileSync(LOG_OUT, JSON.stringify({ generatedAt: new Date().toISOString(), mode, log }, null, 2));

  // Re-run AI review one final time so reports/visual-qa-v3/ai-review.json
  // reflects the post-fix state (fixed routes now come back as V2 PASS ->
  // no AI call needed for them). The returned/written reviews always match
  // what's actually true on disk right now, not the pre-fix snapshot.
  let outputReviews = finalReviews;
  if (mode === "auto" && log.some((l) => l.outcome === "fixed")) {
    console.log("\nRe-running final V1 + V2 + AI review after fixes...");
    runV1();
    runV2();
    const finalReview = await runAiReview();
    outputReviews = finalReview.reviews;
  } else {
    fs.writeFileSync(
      path.join(V3_OUT_DIR, "ai-review.json"),
      JSON.stringify({ generatedAt: new Date().toISOString(), reviews: finalReviews }, null, 2),
    );
  }

  console.log(`\nWrote ${LOG_OUT}`);
  return { log, finalReviews: outputReviews };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  runAutoFixLoop().catch((error) => {
    console.error("Auto-fix loop failed:", error);
    process.exit(1);
  });
}
