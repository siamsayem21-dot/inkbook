import { defineConfig, devices } from "@playwright/experimental-ct-react";
import path from "path";

export default defineConfig({
  testDir: "./tests/ct",
  snapshotDir: "./tests/ct/__snapshots__",
  timeout: 15_000,
  fullyParallel: true,
  reporter: "list",
  use: {
    trace: "retain-on-failure",
    ctPort: 3100,
    ctViteConfig: {
      resolve: {
        alias: {
          "@": path.resolve(__dirname),
          "next/link": path.resolve(__dirname, "tests/ct/mocks/next-link.mock.tsx"),
          "./actions": path.resolve(__dirname, "tests/ct/mocks/shared-actions.mock.ts"),
        },
      },
    },
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
});
