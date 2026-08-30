// Phase 01 — QA Data. Every check in `smoke`/`critical` is self-contained
// (creates and deletes its own QA-tagged data), so there is no shared
// fixture to seed for those modes — this phase just verifies the engine
// itself can safely write and clean up data before anything downstream
// depends on that capability.
//
// `full` mode is different: qa-fullrun-owner-clickthrough.mjs,
// qa-fullrun-artist-clickthrough.mjs, qa-fullrun-flagship-journey.mjs, and
// qa-fullrun-mobile-critical-paths.mjs all read a single PERSISTENT studio
// from qa-manifests/fullqa-20260829-studio.json (real signup via browser,
// shared across those 4 scripts rather than each re-signing-up its own —
// by original design from the mission that first wrote them). Found
// 2026-08-30: that studio had been deleted during an earlier session's
// final cleanup, so the manifest was a stale reference — all 4 scripts
// failed immediately on a foreign-key violation. Re-seeding it fresh here,
// every `full` run, fixes this permanently (not just a one-time patch).
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, QA_TAG_PREFIX } from "../lib/env.mjs";
import { runCheck, nodeScript } from "../lib/exec.mjs";

export async function run(mode) {
  const startedAt = Date.now();
  const id = { id: "qa-data.write-probe", label: "QA data write/delete probe (service-role access)" };
  let probeResult;
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

    probeResult = { ...id, status: "PASS", durationMs: Date.now() - startedAt, startedAt: new Date(startedAt).toISOString() };
  } catch (e) {
    probeResult = { ...id, status: "FAIL", reason: e.message, durationMs: Date.now() - startedAt, startedAt: new Date(startedAt).toISOString() };
  }

  if (mode !== "full") return [probeResult];

  const seedResult = await runCheck({
    id: "qa-data.seed-persistent-fullrun-studio",
    label: "Seed persistent full-mode studio (real signup, shared by owner/artist/flagship/mobile full-mode scripts)",
    ...nodeScript("scripts/qa-fullrun-seed-studio.mjs"),
    timeoutMs: 5 * 60 * 1000,
  });

  return [probeResult, seedResult];
}
