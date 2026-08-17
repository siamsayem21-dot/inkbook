import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.VISUAL_QA_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./tests/visual",
  outputDir: "reports/visual-qa/artifacts",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["json", { outputFile: "reports/visual-qa/results.json" }]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "off",
    // Pages that auto-detect the browser's system timezone (e.g. /register's
    // pre-selected timezone dropdown) would otherwise render a different
    // default depending on which machine/CI runner executes the test --
    // pinning it keeps every route deterministic regardless of environment.
    timezoneId: "UTC",
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
