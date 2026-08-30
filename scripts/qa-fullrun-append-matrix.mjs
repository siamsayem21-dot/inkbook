/**
 * One-off helper: append Job B's owner click-through results
 * (qa-manifests/fullqa-20260829-owner-clickthrough-results.json) as Markdown
 * rows to FUNCTIONAL_TEST_MATRIX.md. Run once after qa-fullrun-owner-clickthrough.mjs.
 */
import { readFileSync, appendFileSync } from "fs";

const { results } = JSON.parse(readFileSync("qa-manifests/fullqa-20260829-owner-clickthrough-results.json", "utf8"));

function esc(s) {
  return String(s ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ").slice(0, 300);
}

let out = "\n## Owner Portal — Job B full click-through (2026-08-29)\n\n";
out += "Fresh QA studio seeded via real UI (register + invite-artist + accept-invite + style selector + portfolio upload). Studio/owner/artist creds in `qa-manifests/fullqa-20260829-studio.json`. Route sweep = desktop then mobile (390x844), same authenticated session, RSC-prefetch-abort noise filtered (documented Next.js App Router behavior, not a bug).\n\n";
out += "| ID | PERSONA | ROUTE | SCREEN | ACTION | EXPECTED | ACTUAL | CONSOLE | NETWORK | PERSISTENCE | CROSS-ROLE | STATUS | EVIDENCE | RETESTED |\n";
out += "|---|---|---|---|---|---|---|---|---|---|---|---|---|---|\n";
for (const r of results) {
  out += `| ${r.id} | ${esc(r.persona)} | ${esc(r.route)} | ${esc(r.screen)} | ${esc(r.action)} | ${esc(r.expected)} | ${esc(r.actual)} | ${esc(r.console)} | ${esc(r.network)} | ${esc(r.persistence)} | ${esc(r.crossRole)} | ${r.status} | ${esc(r.evidence)} | Yes — live run 2026-08-29 |\n`;
}

appendFileSync("FUNCTIONAL_TEST_MATRIX.md", out);
console.log(`Appended ${results.length} rows to FUNCTIONAL_TEST_MATRIX.md`);
