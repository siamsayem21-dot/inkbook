/**
 * Visual QA V3 -- route -> likely Next.js source file lookup.
 * Deliberately a small, explicit table rather than filesystem inference
 * (App Router route groups like "(public)" don't map 1:1 from the URL path,
 * and guessing wrong would hand the fix step the wrong file). Extend this
 * as more routes are added to Visual QA V2/V3.
 */
const ROUTE_SOURCE_MAP = {
  "/": "app/page.tsx",
};

export function likelySourceFileFor(route) {
  return ROUTE_SOURCE_MAP[route] ?? null;
}
