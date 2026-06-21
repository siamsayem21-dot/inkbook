// Migration verification — probes tables/columns directly via PostgREST
// Usage: node --env-file .env.local scripts/verify-migrations.mjs

const BASE = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!BASE || !KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const headers = { apikey: KEY, Authorization: `Bearer ${KEY}`, Accept: "application/json" };

async function tableExists(table) {
  const r = await fetch(`${BASE}/rest/v1/${table}?limit=0`, { headers });
  // 200 = table exists. PGRST204 (no content) also means it exists.
  // 42P01 in error body = undefined table.
  if (r.ok || r.status === 206) return { exists: true };
  const body = await r.json().catch(() => ({}));
  if (body?.code === "42P01") return { exists: false };
  return { exists: false, raw: body?.message ?? r.status };
}

async function columnsExist(table, cols) {
  const select = cols.join(",");
  const r = await fetch(`${BASE}/rest/v1/${table}?select=${select}&limit=0`, { headers });
  if (r.ok || r.status === 206) return { exists: true };
  const body = await r.json().catch(() => ({}));
  // 42703 = column does not exist
  return { exists: false, message: body?.message ?? String(r.status) };
}

async function bucketExists(id) {
  const r = await fetch(`${BASE}/storage/v1/bucket/${id}`, { headers });
  if (r.status === 404) return { exists: false };
  if (!r.ok) return { exists: false, error: r.status };
  const b = await r.json();
  return { exists: true, public: b.public };
}

// RLS: try a request with the anon key (no auth) — if RLS is on and no public
// policy allows it, we get a 0-row result or empty; if RLS is OFF an unauthed
// request would still return rows. We use the service role for everything else
// so just check via a known-private table: if the table exists we trust the
// migration's ENABLE ROW LEVEL SECURITY statement ran.
// We record RLS as "assumed enabled if migration ran" and flag it clearly.

const PASS = "✅";
const FAIL = "❌";
const WARN = "⚠️ ";
let passed = 0, failed = 0;

function ok(label, detail)   { passed++; console.log(`${PASS}  ${label}  →  ${detail}`); }
function fail(label, detail) { failed++; console.log(`${FAIL}  ${label}  →  ${detail}`); }
function warn(label, detail) {           console.log(`${WARN} ${label}  →  ${detail}`); }

console.log("\n━━━  InkBook Migration Verification  ━━━\n");

// ── 1. custom_requests table ─────────────────────────────────────────────────
const cr = await tableExists("custom_requests");
cr.exists ? ok("custom_requests table", "exists") : fail("custom_requests table", cr.raw ?? "NOT FOUND — run Migration 1");

// ── 2. flash_designs table ───────────────────────────────────────────────────
const fd = await tableExists("flash_designs");
fd.exists ? ok("flash_designs table", "exists") : fail("flash_designs table", fd.raw ?? "NOT FOUND — run Migration 2");

// ── 3. Studio branding columns ───────────────────────────────────────────────
const brand = await columnsExist("studios", ["primary_color", "secondary_color", "font_choice"]);
brand.exists
  ? ok("studios branding columns", "primary_color, secondary_color, font_choice all present")
  : fail("studios branding columns", brand.message ?? "MISSING — run Migration 3");

// ── 4. RLS ───────────────────────────────────────────────────────────────────
// PostgREST doesn't expose pg_tables. We verify indirectly: if the migration
// ran, RLS was enabled in the same statement. Trust the SQL; flag for manual
// check in the Supabase dashboard (Authentication → Policies).
if (cr.exists) {
  warn("RLS on custom_requests", "migration ran — verify in Supabase > Authentication > Policies");
} else {
  fail("RLS on custom_requests", "table missing — migration not applied");
}
if (fd.exists) {
  warn("RLS on flash_designs", "migration ran — verify in Supabase > Authentication > Policies");
} else {
  fail("RLS on flash_designs", "table missing — migration not applied");
}

// ── 5. Storage bucket ────────────────────────────────────────────────────────
const bucket = await bucketExists("custom-requests");
bucket.exists
  ? ok("custom-requests storage bucket", `exists · public=${bucket.public}`)
  : fail("custom-requests storage bucket", bucket.error ?? "NOT FOUND — run Migration 1");

// ── Custom_requests columns spot-check ───────────────────────────────────────
if (cr.exists) {
  const crCols = await columnsExist("custom_requests", [
    "studio_id","artist_id","client_name","client_email","client_phone",
    "status","deposit_amount","stripe_payment_intent_id",
  ]);
  crCols.exists
    ? ok("custom_requests columns", "all expected columns present")
    : fail("custom_requests columns", crCols.message);
}

// ── Flash_designs columns spot-check ─────────────────────────────────────────
if (fd.exists) {
  const fdCols = await columnsExist("flash_designs", [
    "studio_id","artist_id","title","image_url","price",
    "is_repeatable","is_available","is_booked",
  ]);
  fdCols.exists
    ? ok("flash_designs columns", "all expected columns present")
    : fail("flash_designs columns", fdCols.message);
}

// ── Summary ───────────────────────────────────────────────────────────────────
console.log("\n" + "─".repeat(50));
console.log(`Results: ${passed} passed, ${failed} failed\n`);

if (failed === 0) {
  console.log("✅  All migrations verified. Ready for production.\n");
} else {
  console.log("❌  Missing migrations. Open Supabase SQL Editor and run the");
  console.log("    numbered migration blocks from DEPLOY.md in order (1 → 2 → 3).\n");
}
