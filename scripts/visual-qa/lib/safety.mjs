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
  return hit
    ? { blocked: true, reason: `File "${filePath}" matches never-auto-fix pattern ${hit}` }
    : { blocked: false, reason: null };
}

export const HIGH_CONFIDENCE_THRESHOLD = 0.8;
export const MAX_AUTO_FIX_ATTEMPTS = 3;
