// Phase 01 — QA Data. Every downstream check in this engine is
// self-contained (creates and deletes its own QA-tagged data — the
// established, proven pattern throughout this project's QA history), so
// there is no shared persistent fixture to seed here. This phase instead
// verifies the QA Engine itself can safely write and clean up data before
// any check that depends on that capability runs — catching a credentials/
// permissions problem here, in one place, instead of as a confusing
// failure deep inside an unrelated later phase.
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, QA_TAG_PREFIX } from "../lib/env.mjs";

export async function run() {
  const startedAt = Date.now();
  const id = { id: "qa-data.write-probe", label: "QA data write/delete probe (service-role access)" };
  try {
    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: owner, error: ownerErr } = await sb.auth.admin.createUser({
      email: `${QA_TAG_PREFIX.toLowerCase()}-probe-${Date.now()}@inkbook-qa.test`,
      email_confirm: true,
      password: "QaEngineProbe2026!",
    });
    if (ownerErr) throw new Error("auth.admin.createUser failed: " + ownerErr.message);

    const { data: studio, error: studioErr } = await sb
      .from("studios")
      .insert({ name: `[${QA_TAG_PREFIX}] Probe Studio`, subdomain: `qa-engine-probe-${Date.now()}`, owner_id: owner.user.id, plan: "solo" })
      .select()
      .single();
    if (studioErr) throw new Error("studios insert failed: " + studioErr.message);

    await sb.from("studios").delete().eq("id", studio.id);
    const { data: gone } = await sb.from("studios").select("id").eq("id", studio.id);
    await sb.auth.admin.deleteUser(owner.user.id);

    if ((gone ?? []).length !== 0) throw new Error("probe studio delete did not verify gone");

    return [{ ...id, status: "PASS", durationMs: Date.now() - startedAt, startedAt: new Date(startedAt).toISOString() }];
  } catch (e) {
    return [{ ...id, status: "FAIL", reason: e.message, durationMs: Date.now() - startedAt, startedAt: new Date(startedAt).toISOString() }];
  }
}
