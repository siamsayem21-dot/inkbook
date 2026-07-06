import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";
import path from "path";

// Separate config for tests/db/ — these hit a REAL local Postgres/Supabase
// instance (started via `supabase start`) and are intentionally excluded from
// the default `npm test` / vitest.config.ts, which must stay fast and offline.
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["tests/db/**/*.test.ts"],
    setupFiles: ["tests/db/setup.ts"],
    testTimeout: 20_000,
    // DB tests share fixture studios/users per-file — run files serially to
    // avoid cross-file interference, but no need to isolate within a file.
    fileParallelism: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
