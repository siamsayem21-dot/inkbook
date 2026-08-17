/**
 * Visual QA V3 -- AI visual-review stage.
 *
 * Consumes reports/visual-qa-v2/ai-report.json (Visual QA V2's structured
 * output). For every FAIL entry, loads the actual screenshot, the approved
 * baseline, and the diff image (if one exists), plus the runtime-error and
 * route/viewport metadata, and asks Claude (vision) to classify it.
 *
 * PASS entries are carried through unchanged -- no AI call needed, no cost.
 *
 * Usage: node scripts/visual-qa/ai-review.mjs
 * Reads:  reports/visual-qa-v2/ai-report.json
 * Writes: reports/visual-qa-v3/ai-review.json
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { callClaude, extractJson } from "./lib/anthropic.mjs";
import { loadImageForVision, closeImageResizer } from "./lib/image.mjs";
import { loadDiffRegionsForVision, closeDiffCropper } from "./lib/diff-crop.mjs";

const V2_REPORT = path.join("reports", "visual-qa-v2", "ai-report.json");
const V3_OUT_DIR = path.join("reports", "visual-qa-v3");
const V3_REVIEW_OUT = path.join(V3_OUT_DIR, "ai-review.json");

const CLASSIFICATIONS = [
  "REAL_REGRESSION",
  "ACCEPTABLE_VARIATION",
  "INTENTIONAL_CHANGE_NEEDS_BASELINE_APPROVAL",
  "UNCERTAIN_NEEDS_SIAM",
];

const SYSTEM_PROMPT = `You are an automated visual QA reviewer for a production web app (InkBook, a tattoo studio SaaS). You are shown a baseline screenshot (the last human-approved state), the current actual screenshot, and -- if available -- a pixel diff image that highlights exactly what changed. You also get the route, viewport, the pixel-diff summary, and any runtime errors captured during the test.

These are FULL-PAGE screenshots of a page that can be many thousands of pixels tall. A real, clearly visible defect can still be a tiny fraction of the total pixel count simply because the page is long -- do NOT treat a low reported "pixel ratio" or "X% of all pixels" number as evidence of a minor/noise difference. Judge severity from what you SEE in the images, especially the zoomed-in crop (when provided) of the exact region that changed, not from that ratio number.

Classify the failure as exactly one of:
- REAL_REGRESSION: an unintended visual defect (broken layout, wrong color/position, overlapping content, missing element, overflow, broken image, etc) -- however small a fraction of the total page it covers.
- ACCEPTABLE_VARIATION: the pixels differ but it is noise, not a defect (anti-aliasing, font rendering, a live/dynamic counter value, a timestamp, an animation caught mid-frame).
- INTENTIONAL_CHANGE_NEEDS_BASELINE_APPROVAL: the change looks deliberate and reasonable (e.g. copy update, a redesigned section) but the baseline hasn't been re-approved for it yet.
- UNCERTAIN_NEEDS_SIAM: you cannot confidently tell which of the above applies.

Respond with ONLY a single JSON object, no markdown fences, no extra prose, exactly this shape:
{
  "route": string,
  "viewport": string,
  "classification": "REAL_REGRESSION" | "ACCEPTABLE_VARIATION" | "INTENTIONAL_CHANGE_NEEDS_BASELINE_APPROVAL" | "UNCERTAIN_NEEDS_SIAM",
  "confidence": number,        // 0.0 - 1.0
  "reason": string,            // ONE sentence, max ~30 words
  "detectedIssues": string[],  // at most 3 short bullet items, each under ~20 words
  "suggestedFix": string       // ONE short sentence, or "" if none applies (e.g. for ACCEPTABLE_VARIATION)
}

Be conservative: only use REAL_REGRESSION with confidence >= 0.8 when the defect is unambiguous from the images. When unsure, prefer UNCERTAIN_NEEDS_SIAM over guessing. Keep every field brief -- you have a limited output budget and a truncated response is useless.`;

async function classifyFailure(entry) {
  const [baseline, actual, diff] = await Promise.all([
    loadImageForVision(entry.baselinePath),
    loadImageForVision(entry.screenshotPath),
    loadImageForVision(entry.diffPath),
  ]);

  const content = [
    {
      type: "text",
      text: [
        `Route: ${entry.route}`,
        `Viewport: ${entry.viewport}`,
        `Diff result: ${entry.diffResult}`,
        `Runtime errors captured:\n${entry.runtimeErrors.length ? entry.runtimeErrors.join("\n") : "(none)"}`,
      ].join("\n"),
    },
  ];

  if (baseline) {
    content.push({ type: "text", text: "Baseline (approved) screenshot, full page, downscaled for overall layout context:" });
    content.push({ type: "image", source: { type: "base64", media_type: baseline.mediaType, data: baseline.base64 } });
  }
  if (actual) {
    content.push({ type: "text", text: "Actual (current) screenshot, full page, downscaled for overall layout context:" });
    content.push({ type: "image", source: { type: "base64", media_type: actual.mediaType, data: actual.base64 } });
  }
  if (diff) {
    content.push({ type: "text", text: "Diff image, full page (highlights roughly where the differing pixels are):" });
    content.push({ type: "image", source: { type: "base64", media_type: diff.mediaType, data: diff.base64 } });
  }

  const regions = await loadDiffRegionsForVision(entry).catch(() => []);
  if (regions.length > 0) {
    content.push({
      type: "text",
      text: `IMPORTANT -- the diff wasn't one single blob; it broke into ${regions.length} spatially separate region(s) on the page (e.g. an unrelated section with live/animated demo data vs. an actual defect elsewhere are NOT the same thing -- judge each region independently). Below is a zoomed-in baseline/actual crop for each region, at much higher effective resolution than the full-page images above. Base your classification primarily on these:`,
    });
    regions.forEach((region, i) => {
      if (region.baseline) {
        content.push({ type: "text", text: `Region ${i + 1} of ${regions.length} -- baseline:` });
        content.push({ type: "image", source: { type: "base64", media_type: region.baseline.mediaType, data: region.baseline.base64 } });
      }
      if (region.actual) {
        content.push({ type: "text", text: `Region ${i + 1} of ${regions.length} -- actual:` });
        content.push({ type: "image", source: { type: "base64", media_type: region.actual.mediaType, data: region.actual.base64 } });
      }
    });
  }

  const responseText = await callClaude({
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content }],
    maxTokens: 4096,
  });

  const parsed = extractJson(responseText);
  if (!CLASSIFICATIONS.includes(parsed.classification)) {
    throw new Error(`Model returned an invalid classification: ${JSON.stringify(parsed.classification)}`);
  }
  return parsed;
}

export async function runAiReview() {
  if (!fs.existsSync(V2_REPORT)) {
    throw new Error(`Visual QA V2 report not found at ${V2_REPORT}. Run "npm run test:visual:v2" first.`);
  }
  const v2Report = JSON.parse(fs.readFileSync(V2_REPORT, "utf8"));
  const reviews = [];

  try {
    for (const entry of v2Report.checks) {
      if (entry.status === "PASS") {
        reviews.push({
          route: entry.route,
          viewport: entry.viewport,
          classification: "PASS",
          confidence: 1,
          reason: "Visual QA V2 already passed -- no review needed.",
          detectedIssues: [],
          suggestedFix: "",
          v2Entry: entry,
        });
        continue;
      }

      console.log(`Reviewing FAIL: ${entry.route} (${entry.viewport})...`);
      // A single bad/truncated model response shouldn't take down the whole
      // batch -- retry once, then fall back to a safe UNCERTAIN_NEEDS_SIAM
      // entry (never silently drop the route from the report).
      let classification;
      try {
        classification = await classifyFailure(entry);
      } catch (firstError) {
        console.log(`  retrying after error: ${firstError.message}`);
        try {
          classification = await classifyFailure(entry);
        } catch (secondError) {
          classification = {
            route: entry.route,
            viewport: entry.viewport,
            classification: "UNCERTAIN_NEEDS_SIAM",
            confidence: 0,
            reason: `AI review failed twice: ${secondError.message}`,
            detectedIssues: [],
            suggestedFix: "",
          };
        }
      }
      reviews.push({ ...classification, v2Entry: entry });
      console.log(`  -> ${classification.classification} (confidence ${classification.confidence})`);
    }
  } finally {
    await Promise.all([closeImageResizer(), closeDiffCropper()]);
  }

  fs.mkdirSync(V3_OUT_DIR, { recursive: true });
  const output = { generatedAt: new Date().toISOString(), reviews };
  fs.writeFileSync(V3_REVIEW_OUT, JSON.stringify(output, null, 2));
  console.log(`\nWrote ${V3_REVIEW_OUT}`);
  return output;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  runAiReview().catch((error) => {
    console.error("AI review failed:", error);
    process.exit(1);
  });
}
