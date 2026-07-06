import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";
import path from "path";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    // Mocked, offline, no external services — see vitest.config.db.ts for the
    // separate live-database verification suite (tests/db/).
    include: ["tests/unit/**/*.test.ts"],
    setupFiles: ["tests/setup.ts"],
    coverage: {
      provider: "v8",
      reportsDirectory: "coverage",
      reporter: ["text", "json", "json-summary", "html"],
      include: ["app/api/**/*.ts", "lib/**/*.ts"],
      exclude: ["**/*.d.ts"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
