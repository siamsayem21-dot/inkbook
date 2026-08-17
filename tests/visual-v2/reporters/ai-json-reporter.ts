/**
 * Visual QA V2 — AI-review-ready JSON reporter.
 *
 * Collects the structured "ai-report-entry" JSON attachment each test in
 * public-pages.visual-v2.spec.ts produces, and writes one consolidated
 * report file an AI Vision reviewer (or a human) can read in one pass:
 * route, viewport, screenshot path, baseline path, diff result, runtime
 * errors, and final status per check.
 */
import type { FullResult, Reporter, TestCase, TestResult } from "@playwright/test/reporter";
import fs from "node:fs";
import path from "node:path";

interface AiReportEntry {
  route: string;
  viewport: string;
  status: "PASS" | "FAIL";
  screenshotPath: string | null;
  baselinePath: string | null;
  diffPath: string | null;
  diffResult: string;
  runtimeErrors: string[];
  durationMs: number;
}

const OUTPUT_FILE = path.join("reports", "visual-qa-v2", "ai-report.json");

export default class AiJsonReporter implements Reporter {
  private entries: AiReportEntry[] = [];

  onTestEnd(test: TestCase, result: TestResult) {
    const attachment = result.attachments.find((a) => a.name === "ai-report-entry");
    let entry: AiReportEntry;

    if (attachment?.body) {
      entry = JSON.parse(attachment.body.toString("utf-8")) as AiReportEntry;
    } else {
      // The test crashed before it could build its own entry (e.g. navigation
      // itself threw) -- still record something so no route silently vanishes
      // from the report.
      entry = {
        route: test.title,
        viewport: test.parent.project()?.name ?? "unknown",
        status: "FAIL",
        screenshotPath: null,
        baselinePath: null,
        diffPath: null,
        diffResult: "test-crashed-before-report",
        runtimeErrors: result.errors.map((e) => e.message ?? String(e)),
        durationMs: result.duration,
      };
    }

    entry.status = result.status === "passed" ? "PASS" : "FAIL";
    entry.durationMs = result.duration;
    this.entries.push(entry);
  }

  onEnd(result: FullResult) {
    fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
    fs.writeFileSync(
      OUTPUT_FILE,
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          overallStatus: result.status,
          checks: this.entries,
        },
        null,
        2,
      ),
    );
  }
}
