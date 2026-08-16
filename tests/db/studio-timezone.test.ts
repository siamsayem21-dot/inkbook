import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getPool, getAdminClient, provisionStudioGraph, teardownStudioGraph, testTag, type StudioGraph } from "./helpers";

// Covers supabase/migrations/20260802010000_studio_timezone.sql — verified
// here against a real, freshly-migrated Postgres instance (CI runs
// `supabase start`, which applies every migration file from scratch), since
// this exact migration/application mismatch is what silently broke the SMS
// reminder cron in production (see TASKS.md Timezone Fix 1/7).

const pool = getPool();
const admin = getAdminClient();

describe("studios.timezone column shape", () => {
  it("exists as TEXT, NOT NULL, with default 'UTC'", async () => {
    const { rows } = await pool.query(
      `SELECT data_type, is_nullable, column_default
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'studios' AND column_name = 'timezone'`
    );
    expect(rows, "studios.timezone column not found").toHaveLength(1);
    expect(rows[0].data_type).toBe("text");
    expect(rows[0].is_nullable).toBe("NO");
    expect(rows[0].column_default).toContain("UTC");
  });

  it("rejects an explicit NULL (NOT NULL enforced at the DB layer)", async () => {
    const { error } = await admin.from("studios").insert({
      name: "Null TZ Studio",
      subdomain: `${testTag()}-nulltz`,
      owner_id: "00000000-0000-0000-0000-000000000000",
      deposit_amount_cents: 5000,
      timezone: null,
    });
    expect(error).not.toBeNull();
    // 23502 = not_null_violation
    expect(error!.code).toBe("23502");
  });
});

describe("studio timezone behavior", () => {
  let graph: StudioGraph;

  beforeAll(async () => {
    graph = await provisionStudioGraph(testTag());
  });

  afterAll(async () => {
    await teardownStudioGraph(graph);
  });

  it("a newly created studio that doesn't specify timezone gets 'UTC' (matches the existing-row backfill behavior the migration performs)", async () => {
    // provisionStudioGraph()'s insert never sets timezone, exactly like every
    // real existing studio row before this migration was applied — so this
    // studio's resulting value is exactly what the ALTER TABLE ... DEFAULT
    // backfill would have produced for every pre-existing row.
    const { data, error } = await admin.from("studios").select("timezone").eq("id", graph.studioId).single();
    expect(error).toBeNull();
    expect(data!.timezone).toBe("UTC");
  });

  it("a studio created with an explicit valid IANA timezone stores it exactly", async () => {
    const { data, error } = await admin
      .from("studios")
      .insert({
        name: "Honolulu Studio",
        subdomain: `${testTag()}-honolulu`,
        owner_id: graph.ownerUserId,
        deposit_amount_cents: 5000,
        timezone: "Pacific/Honolulu",
      })
      .select("id, timezone")
      .single();
    expect(error).toBeNull();
    expect(data!.timezone).toBe("Pacific/Honolulu");

    await admin.from("studios").delete().eq("id", data!.id);
  });

  it("an invalid (non-IANA) string is still accepted at the DB layer — TEXT has no format constraint, so the cron's own defensive handling (Timezone Fix 4/7) is the enforcement point, not the schema", async () => {
    const { data, error } = await admin
      .from("studios")
      .insert({
        name: "Garbage TZ Studio",
        subdomain: `${testTag()}-garbagetz`,
        owner_id: graph.ownerUserId,
        deposit_amount_cents: 5000,
        timezone: "Not/A/Real/Zone",
      })
      .select("id, timezone")
      .single();
    expect(error).toBeNull();
    expect(data!.timezone).toBe("Not/A/Real/Zone");

    await admin.from("studios").delete().eq("id", data!.id);
  });

  it("no collateral changes — every other known studios column is still present and independently settable alongside timezone", async () => {
    const { data, error } = await admin
      .from("studios")
      .select("id, name, subdomain, address, state, about, phone, contact_email, hours, deposit_amount_cents, primary_color, secondary_color, font_choice, timezone")
      .eq("id", graph.studioId)
      .single();
    expect(error).toBeNull();
    expect(data!.timezone).toBe("UTC");
    expect(data!.name).toContain("Studio");
  });
});
