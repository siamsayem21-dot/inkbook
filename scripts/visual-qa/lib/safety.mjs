/**
 * Visual QA V3 -- auto-fix safety gates.
 *
 * These patterns are checked against BOTH the route under test and any file
 * path a proposed fix would touch. A match on either blocks auto-fix
 * entirely, regardless of AI classification/confidence -- the loop must
 * fall back to UNCERTAIN_NEEDS_SIAM instead.
 */

const NEVER_AUTO_FIX_ROUTE_PATTERNS = [
  /\/login/i,
  /\/register/i,
  /\/reset-password/i,
  /\/book\/.*\/book\/deposit/i,
  /\/book\/.*\/consent/i,
  /\/checkout/i,
  /\/billing/i,
  /consent/i,
  /payment/i,
  /deposit/i,
  /auth/i,
];

const NEVER_AUTO_FIX_FILE_PATTERNS = [
  /app[\\/]api[\\/]stripe/i,
  /app[\\/]api[\\/]billing/i,
  /app[\\/]api[\\/]auth/i,
  /app[\\/]api[\\/]twilio/i,
  /app[\\/]api[\\/]consent-forms/i,
  /lib[\\/]auth/i,
  /lib[\\/]supabase/i,
  /middleware\.ts$/i,
  /supabase[\\/]migrations/i,
  /migrations[\\/]/i,
  /consent/i,
  /payment/i,
  /stripe/i,
  /webhook/i,
  /deposit/i,
  /\.env/i,
];

/**
 * @param {string} route
 * @returns {{ blocked: boolean, reason: string | null }}
 */
export function checkRouteSafety(route) {
  const hit = NEVER_AUTO_FIX_ROUTE_PATTERNS.find((pattern) => pattern.test(route));
  return hit
    ? { blocked: true, reason: `Route "${route}" matches never-auto-fix pattern ${hit}` }
    : { blocked: false, reason: null };
}

/**
 * @param {string} filePath
 * @returns {{ blocked: boolean, reason: string | null }}
 */
export function checkFileSafety(filePath) {
  const hit = NEVER_AUTO_FIX_FILE_PATTERNS.find((pattern) => pattern.test(filePath));
  if (hit) return { blocked: true, reason: `File "${filePath}" matches never-auto-fix pattern ${hit}` };

  // When /inkbook-run invokes the auto-fix loop while verifying a specific
  // task, it sets VISUAL_QA_AUTO_FIX_ALLOWED_FILES to that task's own
  // changed files (comma-separated, forward-slash paths). This keeps a task
  // from silently "fixing" an unrelated pre-existing regression elsewhere on
  // the page as a side effect of its own Visual QA gate -- exactly the same
  // scope discipline the runner already applies to its own file edits. When
  // the env var is unset (a manual/standalone run), no allowlist applies.
  const allowlist = (process.env.VISUAL_QA_AUTO_FIX_ALLOWED_FILES ?? "")
    .split(",")
    .map((f) => f.trim().replace(/\\/g, "/"))
    .filter(Boolean);
  if (allowlist.length > 0) {
    const normalized = filePath.replace(/\\/g, "/");
    if (!allowlist.includes(normalized)) {
      return {
        blocked: true,
        reason: `File "${filePath}" is outside the current task's changed-files scope (${allowlist.join(", ")}) -- refusing to auto-fix an unrelated file.`,
      };
    }
  }

  return { blocked: false, reason: null };
}

export const HIGH_CONFIDENCE_THRESHOLD = 0.8;
export const MAX_AUTO_FIX_ATTEMPTS = 3;
