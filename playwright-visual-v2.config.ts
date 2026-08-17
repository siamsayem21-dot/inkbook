import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.VISUAL_QA_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./tests/visual-v2",
  testMatch: /.*\.visual-v2\.spec\.ts/,
  outputDir: "reports/visual-qa-v2/artifacts",
  // Desktop and mobile baselines are kept in separate folders, one file per
  // route: tests/visual-v2/baselines/{desktop,mobile}/{route}.png
  snapshotPathTemplate: "tests/visual-v2/baselines/{projectName}/{arg}{ext}",
  timeout: 60_000,
  expect: {
    timeout: 10_000,
    toHaveScreenshot: {
      // Absolute pixel-count tolerance, not a ratio: these are full-page
      // screenshots of a page that can be many thousands of pixels tall, so
      // a ratio (e.g. 1% of all pixels) lets a small-but-real, clearly
      // visible localized defect (a mis-colored heading, a broken card)
      // hide under the threshold simply because the page is long. A fixed
      // pixel budget stays meaningful regardless of page length -- enough
      // to absorb anti-aliasing/font-rendering jitter, nowhere near enough
      // to mask a real visible defect.
      maxDiffPixels: 200,
      animations: "disabled",
    },
  },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  // Baselines are only ever written via the explicit
  // "npm run test:visual:v2:update-baseline" command (--update-snapshots).
  // A normal "npm run test:visual:v2" run never creates or overwrites one,
  // even a missing one -- an approved baseline is always an intentional act.
  updateSnapshots: "none",
  reporter: [
    ["list"],
    ["json", { outputFile: "reports/visual-qa-v2/results.json" }],
    ["./tests/visual-v2/reporters/ai-json-reporter.ts"],
  ],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "off",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: process.env.VISUAL_QA_SKIP_WEBSERVER === "1"
    ? undefined
    : {
        command: "npm run dev",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
