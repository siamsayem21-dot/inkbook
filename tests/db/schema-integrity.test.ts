import { describe, it, expect, afterAll } from "vitest";
import { getPool } from "./helpers";

const pool = getPool();
afterAll(() => pool.end());

// Ground truth taken directly from supabase/migrations/*.sql — keep in sync
// when adding new tables/constraints.
const RLS_ENABLED_TABLES = [
  "studios", "artists", "clients", "bookings", "deposits", "consent_forms",
  "blacklist", "session_agreements", "waitlist", "consultations",
  "deposit_payments", "standalone_consent_forms", "artist_invites",
  "custom_requests", "flash_designs", "studio_knowledge",
  "reviews", "portfolio_images",
];

const FOREIGN_KEYS: Array<{ table: string; column: string; refTable: string; onDelete: string }> = [
  { table: "studios", column: "owner_id", refTable: "users", onDelete: "CASCADE" },
  { table: "artists", column: "studio_id", refTable: "studios", onDelete: "CASCADE" },
  { table: "artists", column: "user_id", refTable: "users", onDelete: "CASCADE" },
  { table: "clients", column: "studio_id", refTable: "studios", onDelete: "CASCADE" },
  { table: "bookings", column: "studio_id", refTable: "studios", onDelete: "CASCADE" },
  { table: "bookings", column: "artist_id", refTable: "artists", onDelete: "RESTRICT" },
  { table: "bookings", column: "client_id", refTable: "clients", onDelete: "RESTRICT" },
  { table: "deposits", column: "booking_id", refTable: "bookings", onDelete: "CASCADE" },
  { table: "consent_forms", column: "booking_id", refTable: "bookings", onDelete: "CASCADE" },
  { table: "consent_forms", column: "client_id", refTable: "clients", onDelete: "RESTRICT" },
  { table: "blacklist", column: "studio_id", refTable: "studios", onDelete: "CASCADE" },
  { table: "session_agreements", column: "booking_id", refTable: "bookings", onDelete: "CASCADE" },
  { table: "session_agreements", column: "artist_id", refTable: "artists", onDelete: "RESTRICT" },
  { table: "waitlist", column: "studio_id", refTable: "studios", onDelete: "CASCADE" },
  { table: "waitlist", column: "artist_id", refTable: "artists", onDelete: "CASCADE" },
  { table: "waitlist", column: "client_id", refTable: "clients", onDelete: "CASCADE" },
  { table: "deposit_payments", column: "booking_id", refTable: "bookings", onDelete: "CASCADE" },
  { table: "artist_invites", column: "studio_id", refTable: "studios", onDelete: "CASCADE" },
  { table: "custom_requests", column: "studio_id", refTable: "studios", onDelete: "CASCADE" },
  { table: "custom_requests", column: "artist_id", refTable: "artists", onDelete: "SET NULL" },
  { table: "flash_designs", column: "studio_id", refTable: "studios", onDelete: "CASCADE" },
  { table: "flash_designs", column: "artist_id", refTable: "artists", onDelete: "CASCADE" },
  { table: "studio_knowledge", column: "studio_id", refTable: "studios", onDelete: "CASCADE" },
  { table: "reviews", column: "studio_id", refTable: "studios", onDelete: "CASCADE" },
  { table: "portfolio_images", column: "studio_id", refTable: "studios", onDelete: "CASCADE" },
  { table: "portfolio_images", column: "artist_id", refTable: "artists", onDelete: "CASCADE" },
];

const UNIQUE_COLUMNS: Array<{ table: string; columns: string[] }> = [
  { table: "studios", columns: ["subdomain"] },
  { table: "artists", columns: ["user_id"] },
  { table: "deposits", columns: ["booking_id"] },
  { table: "consent_forms", columns: ["booking_id"] },
  { table: "session_agreements", columns: ["booking_id"] },
  { table: "waitlist", columns: ["artist_id", "client_id"] },
  { table: "consultations", columns: ["booking_id"] },
];

const CHECK_CONSTRAINTS = [
  { table: "studios", name: "studios_plan_check" },
  { table: "consent_forms", name: "minor_requires_guardian" },
  { table: "blacklist", name: "blacklist_needs_identifier" },
  { table: "reviews", name: "reviews_rating_check" },
];

describe("RLS is enabled on every tenant-scoped table", () => {
  it.each(RLS_ENABLED_TABLES)("%s has relrowsecurity = true", async (table) => {
    const { rows } = await pool.query(
      `SELECT relrowsecurity FROM pg_class WHERE relname = $1 AND relnamespace = 'public'::regnamespace`,
      [table]
    );
    expect(rows, `table "${table}" not found`).toHaveLength(1);
    expect(rows[0].relrowsecurity).toBe(true);
  });
});

describe("Foreign key constraints exist with the expected ON DELETE behavior", () => {
  it.each(FOREIGN_KEYS)("$table.$column -> $refTable ON DELETE $onDelete", async ({ table, column, refTable, onDelete }) => {
    const { rows } = await pool.query(
      `
      SELECT confdeltype
      FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
      JOIN pg_class rt ON rt.oid = c.confrelid
      WHERE c.contype = 'f'
        AND t.relname = $1
        AND rt.relname = $2
        AND $3 = ANY (
          SELECT a.attname FROM pg_attribute a
          WHERE a.attrelid = t.oid AND a.attnum = ANY (c.conkey)
        )
      `,
      [table, refTable, column]
    );
    expect(rows.length, `no FK found: ${table}.${column} -> ${refTable}`).toBeGreaterThan(0);
    const deltypeMap: Record<string, string> = { c: "CASCADE", r: "RESTRICT", n: "SET NULL", a: "NO ACTION", d: "SET DEFAULT" };
    expect(deltypeMap[rows[0].confdeltype]).toBe(onDelete);
  });
});

describe("Unique constraints exist", () => {
  it.each(UNIQUE_COLUMNS)("$table ($columns)", async ({ table, columns }) => {
    const { rows } = await pool.query(
      `
      SELECT array_agg(a.attname ORDER BY a.attname) AS cols
      FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
      JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY (c.conkey)
      WHERE c.contype = 'u' AND t.relname = $1
      GROUP BY c.oid
      `,
      [table]
    );
    const expected = [...columns].sort();
    const match = rows.some((r) => JSON.stringify([...r.cols].sort()) === JSON.stringify(expected));
    expect(match, `no UNIQUE(${columns.join(",")}) found on ${table}. Found: ${JSON.stringify(rows.map((r) => r.cols))}`).toBe(true);
  });
});

describe("Named CHECK constraints exist", () => {
  it.each(CHECK_CONSTRAINTS)("$table.$name", async ({ table, name }) => {
    const { rows } = await pool.query(
      `
      SELECT 1 FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
      WHERE c.contype = 'c' AND t.relname = $1 AND c.conname = $2
      `,
      [table, name]
    );
    expect(rows.length, `CHECK constraint "${name}" not found on ${table}`).toBeGreaterThan(0);
  });
});
