// Shared environment/config for the QA Engine. Single source of truth for
// BASE_URL resolution and the QA data tag prefix, so every phase agrees on
// where to test and how to recognize its own data.
import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");

export function loadDotEnvLocal() {
  const p = path.join(REPO_ROOT, ".env.local");
  if (!existsSync(p)) return {};
  return Object.fromEntries(
    readFileSync(p, "utf8")
      .split("\n")
      .filter((l) => l.includes("=") && !l.startsWith("#"))
      .map((l) => {
        const i = l.indexOf("=");
        return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
      })
  );
}

const dotenv = loadDotEnvLocal();
for (const [k, v] of Object.entries(dotenv)) {
  if (process.env[k] === undefined) process.env[k] = v;
}

// PRODUCTION by default — every existing QA script in this project targets
// production with QA-tagged, self-cleaning data (the established, proven
// pattern throughout this repo's QA history). Override with QA_BASE_URL for
// a local dev run.
export const BASE_URL = process.env.QA_BASE_URL ?? "https://www.inkbook.tech";
export const IS_PRODUCTION_TARGET = BASE_URL.includes("inkbook.tech");
export const IS_LOCAL_TARGET = BASE_URL.includes("localhost");

// Every QA Engine run tags its own data with this prefix + the run id, so
// cleanup can always find (and only find) what THIS run created, and so a
// human scanning the DB can immediately tell QA Engine data apart from real
// studios. Individual phase scripts append their own suffix.
export const QA_TAG_PREFIX = "QA-ENGINE";

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
