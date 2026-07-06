import { defineConfig, devices } from "@playwright/test";

// Full-browser E2E against a REAL running Next.js app + REAL local Supabase
// (started via `supabase start` — see .github/workflows/test.yml). Not
// mocked: exercises actual auth, RLS, and (when Stripe test keys are present)
// real Stripe Checkout. Requires the same env vars as tests/db/.
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false, // shared studio/owner state per spec file
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
