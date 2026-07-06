#!/usr/bin/env node
// Maps v8 line coverage (from `npm run test:coverage`) onto the 17 Phase 1
// feature areas documented in PHASE1.md. Coverage only exists for app/api/**
// and lib/** (see vitest.config.ts coverage.include) — UI-only areas show
// null coverage and rely on the CT/E2E "tested" flags instead.
//
// Output: reports/coverage-by-feature.json — consumed by generate-test-dashboard.mjs.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SUMMARY_PATH = path.join(ROOT, "coverage", "coverage-summary.json");

const FEATURES = [
  { name: "White-Label Studio Page", globs: ["app/book/[studio]/page.tsx", "app/book/[studio]/layout.tsx", "components/booking/ArtistCard.tsx", "components/booking/FlashSection.tsx"] },
  { name: "AI Consultation Wizard", globs: ["app/api/ai/", "app/book/[studio]/consult/", "lib/quote/"] },
  { name: "Lead Pipeline", globs: ["app/(owner)/owner/pipeline/", "lib/pipeline.ts"] },
  { name: "Custom Requests", globs: ["app/api/custom-requests/", "app/book/[studio]/custom/", "app/(owner)/owner/requests/"] },
  { name: "Flash Designs", globs: ["app/(owner)/owner/flash/", "app/book/[studio]/flash/"] },
  { name: "Deposit Collection", globs: ["app/api/stripe/", "lib/stripe/"] },
  { name: "Booking System", globs: ["app/api/bookings/", "app/book/[studio]/[artistId]/", "app/api/cron/no-show", "app/api/cron/sms-reminders"] },
  { name: "Consent Forms", globs: ["app/api/consent-forms/", "components/booking/ConsentForm.tsx", "components/booking/StandaloneConsentForm.tsx", "lib/file-validation.ts"] },
  { name: "Studio Branding Settings", globs: ["app/(owner)/owner/settings/studio/"] },
  { name: "Team Management", globs: ["app/(owner)/owner/artists/", "app/artist/accept/"] },
  { name: "Multi-Artist Support", globs: ["components/artist/", "app/(artist)/artist/"] },
  { name: "Client CRM", globs: ["app/(owner)/owner/clients/", "app/(owner)/owner/blacklist/"] },
  { name: "Revenue Dashboard", globs: ["app/(owner)/owner/revenue/", "app/(owner)/owner/bookings/", "app/(owner)/owner/dashboard/"] },
  { name: "Artist Dashboard", globs: ["app/(artist)/artist/"] },
  { name: "Billing / Subscriptions", globs: ["app/api/billing/", "app/(owner)/owner/settings/billing/"] },
  { name: "Auth", globs: ["lib/auth/", "app/(auth)/", "middleware.ts"] },
  { name: "Security (rate limiting + file validation)", globs: ["lib/rate-limit.ts", "lib/file-validation.ts"] },
];

// CT/E2E don't produce line coverage, so their "tested" signal is manual —
// kept in sync with the actual spec files under tests/ct and tests/e2e.
const CT_TESTED = new Set(["AI Consultation Wizard", "Custom Requests"]);
const E2E_TESTED = new Set([
  "White-Label Studio Page", "AI Consultation Wizard", "Booking System", "Consent Forms",
  "Team Management", "Deposit Collection", "Revenue Dashboard", "Auth",
]);

function loadSummary() {
  if (!existsSync(SUMMARY_PATH)) return null;
  return JSON.parse(readFileSync(SUMMARY_PATH, "utf-8"));
}

function matchesGlob(filePath, glob) {
  const normalized = filePath.replace(ROOT, "").replace(/\\/g, "/").replace(/^\//, "");
  return normalized.startsWith(glob) || normalized === glob;
}

function computeFeatureCoverage(summary, globs) {
  if (!summary) return null;
  let covered = 0;
  let total = 0;
  let matchedAnyFile = false;
  for (const [file, stats] of Object.entries(summary)) {
    if (file === "total") continue;
    if (!globs.some((g) => matchesGlob(file, g))) continue;
    matchedAnyFile = true;
    covered += stats.lines.covered;
    total += stats.lines.total;
  }
  if (!matchedAnyFile || total === 0) return null;
  return Math.round((covered / total) * 1000) / 10;
}

const summary = loadSummary();

const features = FEATURES.map((f) => {
  const pct = computeFeatureCoverage(summary, f.globs);
  return {
    name: f.name,
    lineCoveragePct: pct,
    unitTested: pct !== null && pct > 0,
    ctTested: CT_TESTED.has(f.name),
    e2eTested: E2E_TESTED.has(f.name),
  };
});

const testedCount = features.filter((f) => f.unitTested || f.ctTested || f.e2eTested).length;
const phase1CompletionPct = Math.round((testedCount / features.length) * 1000) / 10;

const report = {
  generatedAt: new Date().toISOString(),
  definition: "Phase1CompletionPct = % of the 17 documented Phase 1 feature areas with at least one passing automated test (unit, component, or E2E) touching them.",
  phase1CompletionPct,
  testedFeatureCount: testedCount,
  totalFeatureCount: features.length,
  features,
};

mkdirSync(path.join(ROOT, "reports"), { recursive: true });
writeFileSync(path.join(ROOT, "reports", "coverage-by-feature.json"), JSON.stringify(report, null, 2));

console.log(`Phase 1 completion: ${phase1CompletionPct}% (${testedCount}/${features.length} features have automated coverage)`);
for (const f of features) {
  const cov = f.lineCoveragePct === null ? "—" : `${f.lineCoveragePct}%`;
  const badges = [f.unitTested && "unit", f.ctTested && "CT", f.e2eTested && "E2E"].filter(Boolean).join(", ") || "none";
  console.log(`  ${f.name.padEnd(40)} coverage=${cov.padEnd(6)} tested-by=[${badges}]`);
}
