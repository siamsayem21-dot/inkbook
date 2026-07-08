// Public Studio Page migration verification — probes tables/columns directly via PostgREST
// Usage: node --env-file .env.local scripts/verify-public-studio-page.mjs

const BASE = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!BASE || !KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const headers = { apikey: KEY, Authorization: `Bearer ${KEY}`, Accept: "application/json" };

async function columnsExist(table, cols) {
  const select = cols.join(",");
  const r = await fetch(`${BASE}/rest/v1/${table}?select=${select}&limit=0`, { headers });
  if (r.ok || r.status === 206) return { exists: true };
  const body = await r.json().catch(() => ({}));
  return { exists: false, message: body?.message ?? String(r.status) };
}

async function tableExists(table) {
  const r = await fetch(`${BASE}/rest/v1/${table}?limit=0`, { headers });
  if (r.ok || r.status === 206) return { exists: true };
  const body = await r.json().catch(() => ({}));
  if (body?.code === "42P01") return { exists: false };
  return { exists: false, raw: body?.message ?? r.status };
}

const PASS = "✅";
const FAIL = "❌";
const WARN = "⚠️ ";
let passed = 0, failed = 0;

function ok(label, detail)   { passed++; console.log(`${PASS}  ${label}  →  ${detail}`); }
function fail(label, detail) { failed++; console.log(`${FAIL}  ${label}  →  ${detail}`); }
function warn(label, detail) {           console.log(`${WARN} ${label}  →  ${detail}`); }

console.log("\n━━━  InkBook Public Studio Page Migration Verification  ━━━\n");

// ── 1. studios.about ─────────────────────────────────────────────────────────
const about = await columnsExist("studios", ["about"]);
about.exists ? ok("studios.about column", "exists") : fail("studios.about column", about.message);

// ── 2. reviews table ──────────────────────────────────────────────────────────
const reviews = await tableExists("reviews");
reviews.exists ? ok("reviews table", "exists") : fail("reviews table", reviews.raw ?? "NOT FOUND");

if (reviews.exists) {
  const reviewCols = await columnsExist("reviews", [
    "id", "studio_id", "author_name", "rating", "quote",
    "is_public", "is_active", "sort_order", "created_at", "updated_at",
  ]);
  reviewCols.exists
    ? ok("reviews columns", "all expected columns present")
    : fail("reviews columns", reviewCols.message);
  warn("RLS on reviews", "migration ran — verify in Supabase > Authentication > Policies");
}

// ── 3. portfolio_images table ────────────────────────────────────────────────
const portfolio = await tableExists("portfolio_images");
portfolio.exists ? ok("portfolio_images table", "exists") : fail("portfolio_images table", portfolio.raw ?? "NOT FOUND");

if (portfolio.exists) {
  const portfolioCols = await columnsExist("portfolio_images", [
    "id", "studio_id", "artist_id", "image_url", "style",
    "is_active", "sort_order", "created_at", "updated_at",
  ]);
  portfolioCols.exists
    ? ok("portfolio_images columns", "all expected columns present")
    : fail("portfolio_images columns", portfolioCols.message);
  warn("RLS on portfolio_images", "migration ran — verify in Supabase > Authentication > Policies");
}

// ── Summary ───────────────────────────────────────────────────────────────────
console.log("\n" + "─".repeat(50));
console.log(`Results: ${passed} passed, ${failed} failed\n`);

if (failed === 0) {
  console.log("✅  Public Studio Page migration verified.\n");
} else {
  console.log("❌  Migration incomplete or not applied — see failures above.\n");
  process.exit(1);
}
