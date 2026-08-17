/**
 * Visual QA V3 -- final machine-readable report.
 * Consolidates V1 results, V2's ai-report.json, and V3's ai-review.json /
 * auto-fix-log.json (if present) into one summary: what was checked, what
 * status each route/viewport ended at, what the AI decided, what got
 * auto-fixed, what files changed, and whether Siam still needs to look at
 * anything.
 *
 * Usage: node scripts/visual-qa/final-report.mjs
 * Writes: reports/visual-qa-v3/final-report.json
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const V1_RESULTS = path.join("reports", "visual-qa", "results.json");
const V2_REPORT = path.join("reports", "visual-qa-v2", "ai-report.json");
const V3_REVIEW = path.join("reports", "visual-qa-v3", "ai-review.json");
const V3_LOG = path.join("reports", "visual-qa-v3", "auto-fix-log.json");
const OUT = path.join("reports", "visual-qa-v3", "final-report.json");

const NEEDS_SIAM_CLASSIFICATIONS = new Set([
  "INTENTIONAL_CHANGE_NEEDS_BASELINE_APPROVAL",
  "UNCERTAIN_NEEDS_SIAM",
]);

function readJson(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

export function buildFinalReport() {
  const v1 = readJson(V1_RESULTS);
  const v2 = readJson(V2_REPORT);
  const v3Review = readJson(V3_REVIEW);
  const v3Log = readJson(V3_LOG);

  if (!v2) throw new Error(`Missing ${V2_REPORT} -- run the V2/V3 pipeline first.`);

  const routes = [...new Set(v2.checks.map((c) => c.route))];
  const byRouteViewport = {};
  for (const check of v2.checks) {
    byRouteViewport[`${check.route}::${check.viewport}`] = { v2: check };
  }
  for (const review of v3Review?.reviews ?? []) {
    const key = `${review.route}::${review.viewport}`;
    byRouteViewport[key] = { ...byRouteViewport[key], aiReview: review };
  }

  const v1Ok = v1?.stats && v1.stats.unexpected === 0 && v1.stats.expected > 0;

  const filesChanged = [...new Set((v3Log?.log ?? []).filter((l) => l.outcome === "fixed").map((l) => l.file))];
  const fixesAttempted = (v3Log?.log ?? []).map((l) => ({
    route: l.route,
    viewport: l.viewport,
    outcome: l.outcome,
    file: l.file ?? null,
    attemptCount: l.attempts?.length ?? 0,
  }));

  const aiClassifications = Object.entries(byRouteViewport).map(([key, entry]) => {
    const [route, viewport] = key.split("::");
    return {
      route,
      viewport,
      v2Status: entry.v2?.status ?? "unknown",
      classification: entry.aiReview?.classification ?? (entry.v2?.status === "PASS" ? "PASS" : "UNREVIEWED"),
      confidence: entry.aiReview?.confidence ?? null,
      fixed: entry.aiReview?.fixed ?? false,
    };
  });

  const needsSiam = aiClassifications.filter((c) => NEEDS_SIAM_CLASSIFICATIONS.has(c.classification));
  const stillFailing = aiClassifications.filter((c) => c.v2Status !== "PASS" && !c.fixed);

  const desktopEntries = aiClassifications.filter((c) => c.viewport === "desktop");
  const mobileEntries = aiClassifications.filter((c) => c.viewport === "mobile");
  const statusFor = (entries) =>
    entries.length > 0 && entries.every((e) => e.v2Status === "PASS" || e.fixed) ? "PASS" : "FAIL";

  const finalStatus = v1Ok && stillFailing.length === 0 ? "PASS" : "FAIL";

  const report = {
    generatedAt: new Date().toISOString(),
    routesChecked: routes,
    v1: { status: v1Ok ? "PASS" : "FAIL", stats: v1?.stats ?? null },
    desktop: { status: statusFor(desktopEntries), checks: desktopEntries },
    mobile: { status: statusFor(mobileEntries), checks: mobileEntries },
    aiClassifications,
    fixesAttempted,
    filesChanged,
    finalStatus,
    siamNeeded: needsSiam.length > 0 || stillFailing.length > 0,
    siamReasons: [
      ...needsSiam.map((c) => `${c.route} (${c.viewport}): ${c.classification}`),
      ...stillFailing
        .filter((c) => !needsSiam.includes(c))
        .map((c) => `${c.route} (${c.viewport}): still failing, unreviewed or unresolved`),
    ],
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log(`Wrote ${OUT}`);
  return report;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  try {
    buildFinalReport();
  } catch (error) {
    console.error("Final report generation failed:", error.message);
    process.exit(1);
  }
}
