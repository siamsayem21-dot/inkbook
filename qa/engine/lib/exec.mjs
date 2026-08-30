// Runs one QA check — a script (node scripts/xyz.mjs), a vitest file/dir, or
// a shell command — and normalizes the result to one shape every phase
// module and the report writer can rely on. Convention this project's
// scripts already follow (verified, not assumed): exit 0 = pass, nonzero =
// fail. A check that can't run at all (missing prerequisite, e.g. an
// un-applied migration) reports BLOCKED, never FAIL — those are different
// things and the report must keep them separate.
import { spawn, execFile } from "child_process";
import { REPO_ROOT, BASE_URL } from "./env.mjs";

// spawn(..., { shell: true }) on Windows launches the real command under a
// cmd.exe wrapper. child.kill("SIGKILL") only signals that wrapper — it does
// NOT reliably kill the actual node.exe (or any browser it launched) running
// underneath as a grandchild, so a hung check can survive its own "timeout"
// and become an orphan process (confirmed happening in practice: a
// standalone script hang left a live node.exe with no corresponding
// engine-tracked process after the parent shell had already exited). On
// Windows, kill the whole process tree by pid via taskkill instead; on
// POSIX, SIGKILL on the child is sufficient since these scripts aren't
// detached into their own process group.
function killProcessTree(child) {
  if (process.platform === "win32" && child.pid) {
    execFile("taskkill", ["/pid", String(child.pid), "/T", "/F"], () => {});
  } else {
    child.kill("SIGKILL");
  }
}

/**
 * @param {object} check
 * @param {string} check.id - stable id, e.g. "security.bookings-idor"
 * @param {string} check.label - human label for the report
 * @param {string} check.command - executable, e.g. "node" or "npx"
 * @param {string[]} check.args
 * @param {number} [check.timeoutMs]
 * @param {Record<string,string>} [check.env] - extra env vars
 * @param {boolean} [check.blocked] - pre-determined BLOCKED_NEEDS_SIAM, skips execution entirely
 * @param {string} [check.blockedReason]
 */
export async function runCheck(check) {
  const startedAt = Date.now();

  if (check.blocked) {
    return {
      id: check.id,
      label: check.label,
      status: "BLOCKED_NEEDS_SIAM",
      reason: check.blockedReason ?? "Blocked — needs Siam.",
      durationMs: 0,
      startedAt: new Date(startedAt).toISOString(),
      stdout: "",
      stderr: "",
    };
  }

  if (check.skip) {
    // Distinct from BLOCKED_NEEDS_SIAM: a missing LOCAL environment
    // prerequisite (e.g. `supabase start` not running) that any operator
    // can resolve themselves, not something only Siam can unblock.
    return {
      id: check.id,
      label: check.label,
      status: "SKIPPED",
      reason: check.skipReason ?? "Skipped — prerequisite not met.",
      durationMs: 0,
      startedAt: new Date(startedAt).toISOString(),
      stdout: "",
      stderr: "",
    };
  }

  const timeoutMs = check.timeoutMs ?? 120000;

  return new Promise((resolve) => {
    const child = spawn(check.command, check.args, {
      cwd: REPO_ROOT,
      env: { ...process.env, QA_BASE_URL: BASE_URL, ...(check.env ?? {}) },
      shell: true,
    });

    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      killProcessTree(child);
    }, timeoutMs);

    child.stdout?.on("data", (d) => { stdout += d.toString(); });
    child.stderr?.on("data", (d) => { stderr += d.toString(); });

    child.on("close", (code) => {
      clearTimeout(timer);
      const durationMs = Date.now() - startedAt;
      // Exit code convention (every script in this engine follows it):
      // 0 = PASS, 1 = FAIL, 2 = BLOCKED_NEEDS_SIAM (a real, known, out-of-
      // this-run's-control blocker — e.g. a migration only Siam can apply —
      // never conflated with a genuine test failure).
      const status = timedOut ? "FAIL" : code === 0 ? "PASS" : code === 2 ? "BLOCKED_NEEDS_SIAM" : "FAIL";
      resolve({
        id: check.id,
        label: check.label,
        status,
        reason: timedOut ? `Timed out after ${timeoutMs}ms` : status === "PASS" ? undefined : `Exit code ${code}`,
        durationMs,
        startedAt: new Date(startedAt).toISOString(),
        // Keep output bounded — full logs live in the child process's own
        // console output (visible to whoever ran the engine); the report
        // only needs enough to diagnose a failure at a glance.
        stdout: stdout.slice(-4000),
        stderr: stderr.slice(-4000),
      });
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      resolve({
        id: check.id,
        label: check.label,
        status: "FAIL",
        reason: `Failed to start: ${err.message}`,
        durationMs: Date.now() - startedAt,
        startedAt: new Date(startedAt).toISOString(),
        stdout,
        stderr,
      });
    });
  });
}

export function nodeScript(relPath, extraArgs = []) {
  return { command: "node", args: [relPath, ...extraArgs] };
}

export function vitestFiles(files, config) {
  const args = ["vitest", "run", ...(config ? ["-c", config] : []), ...files];
  return { command: "npx", args };
}
