import { expect, test, type Page, type TestInfo } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";

const routes = (process.env.VISUAL_QA_ROUTES ?? "/")
  .split(",")
  .map((route) => route.trim())
  .filter(Boolean);

const ignoredConsolePatterns = [/favicon/i];

function safeName(route: string) {
  return route === "/" ? "home" : route.replace(/^\//, "").replace(/[^a-z0-9-_]+/gi, "-");
}

async function saveScreenshot(page: Page, testInfo: TestInfo, route: string) {
  const directory = path.join("reports", "visual-qa", "screenshots");
  await fs.mkdir(directory, { recursive: true });
  await page.screenshot({
    path: path.join(directory, `${safeName(route)}-${testInfo.project.name}.png`),
    fullPage: true,
  });
}

for (const route of routes) {
  test(`${route} has no obvious visual/runtime regressions`, async ({ page }, testInfo) => {
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

    try {
      const response = await page.goto(route, { waitUntil: "networkidle" });
      expect(response, `No main-document response for ${route}`).not.toBeNull();
      expect(response?.status(), `Unexpected HTTP status for ${route}`).toBeLessThan(400);

      await expect(page.locator("body")).toBeVisible();
      await expect(page.locator("body")).not.toBeEmpty();

      const overflow = await page.evaluate(() => ({
        viewportWidth: document.documentElement.clientWidth,
        documentWidth: document.documentElement.scrollWidth,
      }));
      expect(
        overflow.documentWidth,
        `Horizontal overflow: document ${overflow.documentWidth}px > viewport ${overflow.viewportWidth}px`,
      ).toBeLessThanOrEqual(overflow.viewportWidth + 2);

      const brokenImages = await page.locator("img").evaluateAll((images) =>
        images
          .filter((image) => {
            const element = image as HTMLImageElement;
            return element.currentSrc && element.complete && element.naturalWidth === 0;
          })
          .map((image) => (image as HTMLImageElement).currentSrc),
      );

      expect(brokenImages, `Broken images on ${route}`).toEqual([]);
      expect(pageErrors, `Unhandled page errors on ${route}`).toEqual([]);
      expect(consoleErrors, `Console errors on ${route}`).toEqual([]);
      expect(failedRequests, `Failed non-image requests on ${route}`).toEqual([]);
    } finally {
      // Always captured, even if an assertion above threw — a screenshot of
      // the failing state is more useful for triage than no screenshot at all.
      await saveScreenshot(page, testInfo, route);
    }
  });
}
