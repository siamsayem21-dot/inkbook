/**
 * Visual QA — covered route list, shared by V1 (tests/visual) and V2
 * (tests/visual-v2). This is the single source of truth for "which routes
 * does Visual QA check by default" -- both spec files fall back to this
 * list when VISUAL_QA_ROUTES isn't set, so adding a route here covers it
 * everywhere at once.
 *
 * Every route here must be reachable WITHOUT authentication and render
 * deterministically on a plain, unauthenticated visit (no live database
 * content that changes as real users use the product, no environment-
 * dependent auto-detected values, no in-progress async/animated state).
 * See TASKS.md's Visual QA route-coverage entry for the full reasoning
 * behind what's included and what's deliberately excluded.
 */
export const COVERED_ROUTES = [
  "/",
  "/pricing",
  "/privacy",
  "/terms",
  "/login",
  "/register",
  "/book/demo-studio",
];
