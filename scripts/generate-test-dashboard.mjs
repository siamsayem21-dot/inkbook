#!/usr/bin/env node
// Aggregates every suite's JSON report + the coverage-by-feature report into
// one static HTML dashboard. Run after all four suites (unit, ct, db, e2e)
// have produced their reports/*.json — see .github/workflows/test.yml.
// Safe to run with any subset missing (renders "not run" for that suite).

import { readFileSync, writeFileSync, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const REPORTS = path.join(ROOT, "reports");

function readJson(file) {
  const p = path.join(REPORTS, file);
  if (!existsSync(p)) return null;
  try { return JSON.parse(readFileSync(p, "utf-8")); } catch { return null; }
}

function vitestSummary(json) {
  if (!json) return null;
  return {
    total: json.numTotalTests,
    passed: json.numPassedTests,
    failed: json.numFailedTests,
    skipped: json.numPendingTests + (json.numTodoTests ?? 0),
  };
}

function playwrightSummary(json) {
  if (!json) return null;
  const s = json.stats ?? {};
  return {
    total: (s.expected ?? 0) + (s.unexpected ?? 0) + (s.skipped ?? 0) + (s.flaky ?? 0),
    passed: (s.expected ?? 0) + (s.flaky ?? 0),
    failed: s.unexpected ?? 0,
    skipped: s.skipped ?? 0,
  };
}

const suites = {
  Unit:      { data: vitestSummary(readJson("vitest-unit.json")),   desc: "Vitest — mocked API routes & business logic" },
  Component: { data: playwrightSummary(readJson("ct.json")),        desc: "Playwright CT — booking wizard UI, mocked network" },
  Database:  { data: vitestSummary(readJson("vitest-db.json")),     desc: "Vitest — RLS, FKs, constraints, cascades (live local Supabase)" },
  E2E:       { data: playwrightSummary(readJson("e2e.json")),       desc: "Playwright — full owner workflow, real browser + backend" },
};

const featureReport = readJson("coverage-by-feature.json");
const coverageSummary = (() => {
  const p = path.join(ROOT, "coverage", "coverage-summary.json");
  if (!existsSync(p)) return null;
  try {
    const j = JSON.parse(readFileSync(p, "utf-8"));
    return j.total ?? null;
  } catch { return null; }
})();

let grandTotal = 0, grandPassed = 0, grandFailed = 0, grandSkipped = 0;
for (const s of Object.values(suites)) {
  if (!s.data) continue;
  grandTotal += s.data.total;
  grandPassed += s.data.passed;
  grandFailed += s.data.failed;
  grandSkipped += s.data.skipped;
}

const generatedAt = new Date().toISOString();

function statusBadge(data) {
  if (!data) return `<span class="badge badge-warn">not run</span>`;
  if (data.failed > 0) return `<span class="badge badge-crit">${data.failed} failed</span>`;
  if (data.total === 0) return `<span class="badge badge-warn">no tests</span>`;
  return `<span class="badge badge-good">all passing</span>`;
}

function suiteCard(name, s) {
  const d = s.data;
  return `
  <div class="card">
    <div class="card-head">
      <h3>${name}</h3>
      ${statusBadge(d)}
    </div>
    <p class="card-desc">${s.desc}</p>
    ${d ? `
    <div class="stat-row">
      <div class="stat"><span class="stat-value">${d.total}</span><span class="stat-label">total</span></div>
      <div class="stat"><span class="stat-value good-ink">${d.passed}</span><span class="stat-label">passed</span></div>
      <div class="stat"><span class="stat-value crit-ink">${d.failed}</span><span class="stat-label">failed</span></div>
      <div class="stat"><span class="stat-value warn-ink">${d.skipped}</span><span class="stat-label">skipped</span></div>
    </div>` : `<p class="not-run">No report found — this suite hasn't been run in this environment yet.</p>`}
  </div>`;
}

function featureRow(f) {
  const pct = f.lineCoveragePct;
  const barPct = pct ?? 0;
  const badges = [
    f.unitTested && `<span class="pill">unit</span>`,
    f.ctTested && `<span class="pill">CT</span>`,
    f.e2eTested && `<span class="pill">E2E</span>`,
  ].filter(Boolean).join(" ") || `<span class="pill pill-none">untested</span>`;
  return `
    <tr>
      <td>${f.name}</td>
      <td class="cov-cell">
        ${pct === null ? `<span class="muted">—</span>` : `
        <div class="bar-track"><div class="bar-fill" style="width:${barPct}%"></div></div>
        <span class="bar-label">${pct}%</span>`}
      </td>
      <td>${badges}</td>
    </tr>`;
}

const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>InkBook Test Dashboard</title>
<style>
  :root {
    --surface: #fcfcfb; --plane: #f9f9f7; --ink: #0b0b0b; --ink-2: #52514e; --muted: #898781;
    --border: rgba(11,11,11,0.10); --grid: #e1e0d9;
    --good: #0ca30c; --warn: #fab219; --crit: #d03b3b;
    --seq-400: #3987e5; --seq-200: #9ec5f4;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --surface: #1a1a19; --plane: #0d0d0d; --ink: #ffffff; --ink-2: #c3c2b7; --muted: #898781;
      --border: rgba(255,255,255,0.10); --grid: #2c2c2a;
      --good: #0ca30c; --warn: #fab219; --crit: #d03b3b;
      --seq-400: #3987e5; --seq-200: #184f95;
    }
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; background: var(--plane); color: var(--ink);
    font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
    padding: 32px 20px 60px;
  }
  .wrap { max-width: 980px; margin: 0 auto; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  .subtitle { color: var(--ink-2); font-size: 13px; margin: 0 0 28px; }
  .hero { display: flex; gap: 20px; flex-wrap: wrap; margin-bottom: 28px; }
  .hero-tile {
    background: var(--surface); border: 1px solid var(--border); border-radius: 12px;
    padding: 20px 24px; flex: 1; min-width: 180px;
  }
  .hero-tile .value { font-size: 32px; font-weight: 700; font-variant-numeric: tabular-nums; }
  .hero-tile .label { font-size: 12px; color: var(--ink-2); text-transform: uppercase; letter-spacing: 0.06em; margin-top: 4px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 32px; }
  .card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 18px 20px; }
  .card-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .card-head h3 { font-size: 14px; margin: 0; }
  .card-desc { font-size: 12px; color: var(--muted); margin: 6px 0 14px; line-height: 1.4; }
  .not-run { font-size: 12px; color: var(--muted); font-style: italic; }
  .stat-row { display: flex; gap: 16px; }
  .stat { display: flex; flex-direction: column; }
  .stat-value { font-size: 20px; font-weight: 700; font-variant-numeric: tabular-nums; }
  .stat-label { font-size: 10px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; }
  .good-ink { color: var(--good); } .crit-ink { color: var(--crit); } .warn-ink { color: var(--warn); }
  .badge { font-size: 11px; padding: 3px 9px; border-radius: 999px; font-weight: 600; white-space: nowrap; }
  .badge-good { background: color-mix(in srgb, var(--good) 15%, transparent); color: var(--good); border: 1px solid color-mix(in srgb, var(--good) 30%, transparent); }
  .badge-crit { background: color-mix(in srgb, var(--crit) 15%, transparent); color: var(--crit); border: 1px solid color-mix(in srgb, var(--crit) 30%, transparent); }
  .badge-warn { background: color-mix(in srgb, var(--warn) 20%, transparent); color: #8a6200; border: 1px solid color-mix(in srgb, var(--warn) 40%, transparent); }
  @media (prefers-color-scheme: dark) { .badge-warn { color: var(--warn); } }
  table { width: 100%; border-collapse: collapse; background: var(--surface); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; }
  th, td { text-align: left; padding: 10px 14px; font-size: 13px; border-bottom: 1px solid var(--grid); }
  th { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); font-weight: 600; }
  tr:last-child td { border-bottom: none; }
  .cov-cell { display: flex; align-items: center; gap: 10px; }
  .bar-track { flex: 1; max-width: 140px; height: 6px; border-radius: 999px; background: var(--grid); overflow: hidden; }
  .bar-fill { height: 100%; background: linear-gradient(90deg, var(--seq-200), var(--seq-400)); border-radius: 999px; }
  .bar-label { font-size: 12px; font-variant-numeric: tabular-nums; color: var(--ink-2); width: 38px; }
  .muted { color: var(--muted); }
  .pill { font-size: 10px; padding: 2px 7px; border-radius: 999px; background: var(--plane); border: 1px solid var(--border); color: var(--ink-2); margin-right: 4px; }
  .pill-none { color: var(--muted); font-style: italic; }
  .footer-note { font-size: 11px; color: var(--muted); margin-top: 24px; line-height: 1.5; }
  h2 { font-size: 15px; margin: 0 0 12px; }
</style>
</head>
<body>
<div class="wrap">
  <h1>InkBook — Test Dashboard</h1>
  <p class="subtitle">Generated ${generatedAt}</p>

  <div class="hero">
    <div class="hero-tile">
      <div class="value">${grandTotal}</div>
      <div class="label">Total tests</div>
    </div>
    <div class="hero-tile">
      <div class="value good-ink">${grandPassed}</div>
      <div class="label">Passed</div>
    </div>
    <div class="hero-tile">
      <div class="value ${grandFailed > 0 ? "crit-ink" : ""}">${grandFailed}</div>
      <div class="label">Failed</div>
    </div>
    <div class="hero-tile">
      <div class="value">${coverageSummary ? coverageSummary.lines.pct + "%" : "—"}</div>
      <div class="label">Line coverage (unit)</div>
    </div>
    <div class="hero-tile">
      <div class="value">${featureReport ? featureReport.phase1CompletionPct + "%" : "—"}</div>
      <div class="label">Phase 1 completion</div>
    </div>
  </div>

  <h2>Suites</h2>
  <div class="grid">
    ${Object.entries(suites).map(([name, s]) => suiteCard(name, s)).join("")}
  </div>

  <h2>Phase 1 feature coverage</h2>
  <table>
    <thead><tr><th>Feature</th><th>Backend line coverage</th><th>Tested by</th></tr></thead>
    <tbody>
      ${featureReport ? featureReport.features.map(featureRow).join("") : `<tr><td colspan="3" class="muted">coverage-by-feature.json not found — run npm run test:coverage && node scripts/coverage-by-feature.mjs first</td></tr>`}
    </tbody>
  </table>

  <p class="footer-note">
    ${featureReport ? featureReport.definition : ""}<br>
    Backend line coverage only applies to app/api/** and lib/** (see vitest.config.ts). UI-only feature areas show "—" and rely on the CT/E2E "tested by" badges instead.
  </p>
</div>
</body>
</html>`;

writeFileSync(path.join(REPORTS, "dashboard.html"), html);
console.log(`Dashboard written to reports/dashboard.html — ${grandTotal} tests total, ${grandFailed} failed.`);
