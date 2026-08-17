/**
 * Visual QA V3 -- shared .env.local loader.
 * Same parsing convention used by every other one-off script in this repo.
 */
import { readFileSync, existsSync } from "node:fs";

export function loadEnv() {
  if (!existsSync(".env.local")) return {};
  return Object.fromEntries(
    readFileSync(".env.local", "utf8")
      .split("\n")
      .filter((line) => line.includes("=") && !line.startsWith("#"))
      .map((line) => {
        const i = line.indexOf("=");
        return [line.slice(0, i).trim(), line.slice(i + 1).trim()];
      }),
  );
}

export const env = { ...loadEnv(), ...process.env };
