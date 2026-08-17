import { expect, test, type Page, type TestInfo } from "@playwright/test";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";

const routes = (process.env.VISUAL_QA_ROUTES ?? "/")
  .split(",")
  .map((route) => route.trim())
  .filter(Boolean);

const ignoredConsolePatterns = [/favicon/i];

function safeName(route: string) {
  return route === "/" ? "home" : route.replace(/^\//, "").replace(/[^a-z0-9-_]+/gi, "-");
}

// eslint-disable-next-line no-control-regex
const ANSI_PATTERN = /\[[0-9;]*m/g;
function stripAnsi(text: string) {
  return text.replace(ANSI_PATTERN, "");
}

function baselinePathFor(testInfo: TestInfo, snapshotName: string) {
  // Mirrors playwright-visual-v2.config.ts's snapshotPathTemplate exactly, so
  // this stays correct on both PASS (no attachment) and FAIL (attachment
  // exists but we still want a deterministic path we control) paths.
  return path.join("tests", "visual-v2", "baselines", testInfo.project.name, snapshotName);
}

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

async function saveScreenshot(page: Page, testInfo: TestInfo, route: string) {
  const directory = path.join("reports", "visual-qa-v2", "screenshots");
  await fsp.mkdir(directory, { recursive: true });
  const filePath = path.join(directory, `${safeName(route)}-${testInfo.project.name}.png`);
  await page.screenshot({ path: filePath, fullPage: true });
  return filePath;
}

for (const route of routes) {
  test(`${route} visual baseline check`, async ({ page }, testInfo) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    const failedRequests: string[] = [];

    page.on("console", (message) => {
      if (message.type() !== "error") return;
      const text = message.text();
      if (!ignoredConsolePatterns.some((pattern) => pattern.test(text))) consoleErrors.push(text);
    });
    page.on("pageerror", (error) => pageErrors.push(error.message));
    page.on("requestfailed", (request) => {
      const failure = request.failure()?.errorText ?? "unknown error";
      if (request.resourceType() !== "image") failedRequests.push(`${request.method()} ${request.url()} — ${failure}`);
    });

    const runtimeErrors: string[] = [];
    let screenshotPath: string | null = null;
    let diffPath: string | null = null;
    let diffResult = "not-run";
    const snapshotName = `${safeName(route)}.png`;
    const baselinePath = baselinePathFor(testInfo, snapshotName);

    try {
      // ── Same runtime-health checks as Visual QA V1, kept in sync so V2
      //    never loses coverage V1 already had ──
      const response = await page.goto(route, { waitUntil: "networkidle" });
      if (!response) runtimeErrors.push(`No main-document response for ${route}`);
      else if (response.status() >= 400) runtimeErrors.push(`Unexpected HTTP status ${response.status()} for ${route}`);

      const overflow = await page.evaluate(() => ({
        viewportWidth: document.documentElement.clientWidth,
        documentWidth: document.documentElement.scrollWidth,
      }));
      if (overflow.documentWidth > overflow.viewportWidth + 2) {
        runtimeErrors.push(`Horizontal overflow: document ${overflow.documentWidth}px > viewport ${overflow.viewportWidth}px`);
      }

      const brokenImages = await page.locator("img").evaluateAll((images) =>
        images
          .filter((image) => {
            const element = image as HTMLImageElement;
            return element.currentSrc && element.complete && element.naturalWidth === 0;
          })
          .map((image) => (image as HTMLImageElement).currentSrc),
      );
      if (brokenImages.length > 0) runtimeErrors.push(`Broken images on ${route}: ${brokenImages.join(", ")}`);
      if (pageErrors.length > 0) runtimeErrors.push(...pageErrors.map((e) => `Unhandled page error: ${e}`));
      if (consoleErrors.length > 0) runtimeErrors.push(...consoleErrors.map((e) => `Console error: ${e}`));
      if (failedRequests.length > 0) runtimeErrors.push(...failedRequests.map((e) => `Failed request: ${e}`));

      // Explicit screenshot we control fully -- always saved regardless of
      // diff outcome, so the AI Vision reviewer always has something to look
      // at, even for a route with zero visual difference.
      screenshotPath = await saveScreenshot(page, testInfo, route);

      // ── Baseline diff ──
      // Always call toHaveScreenshot -- do NOT branch around it based on our
      // own existence check. Whether a baseline actually gets written here is
      // entirely up to Playwright's own `updateSnapshots` setting: "none"
      // (the config default, used by "npm run test:visual:v2") never writes
      // one, even a missing one; the explicit "--update-snapshots" flag (used
      // only by "npm run test:visual:v2:update-baseline") does. Skipping the
      // call ourselves would silently defeat the update-baseline command.
      const baselineExistedBefore = fs.existsSync(baselinePath);
      try {
        await expect(page).toHaveScreenshot(snapshotName, { fullPage: true });
        diffResult = baselineExistedBefore ? "match-within-tolerance" : "baseline-created";
      } catch (diffError) {
        if (!baselineExistedBefore) {
          diffResult = "baseline-missing";
          runtimeErrors.push(
            `No approved baseline found at ${baselinePath}. Run "npm run test:visual:v2:update-baseline" to create one intentionally.`,
          );
        } else {
          diffResult = "visual-difference-detected";
          for (const attachment of testInfo.attachments) {
            if (/diff/i.test(attachment.name) && attachment.path) diffPath = attachment.path;
          }
          runtimeErrors.push(stripAnsi(diffError instanceof Error ? diffError.message : String(diffError)));
        }
      }
    } catch (navigationError) {
      runtimeErrors.push(stripAnsi(navigationError instanceof Error ? navigationError.message : String(navigationError)));
      diffResult = "navigation-failed";
    } finally {
      const status: "PASS" | "FAIL" =
        runtimeErrors.length === 0 && (diffResult === "match-within-tolerance" || diffResult === "baseline-created")
          ? "PASS"
          : "FAIL";
      const entry: AiReportEntry = {
        route,
        viewport: testInfo.project.name,
        status,
        screenshotPath,
        baselinePath: fs.existsSync(baselinePath) ? baselinePath : null,
        diffPath,
        diffResult,
        runtimeErrors,
        durationMs: 0, // filled in by the reporter from the real Playwright test duration
      };
      await testInfo.attach("ai-report-entry", { body: JSON.stringify(entry), contentType: "application/json" });
    }

    expect(runtimeErrors, `Visual QA V2 issues on ${route} (${testInfo.project.name})`).toEqual([]);
  });
}
