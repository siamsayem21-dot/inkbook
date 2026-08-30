/**
 * Full ground-up QA re-run (2026-08-29) — Job D: live probe for a private
 * (is_public=false) studio_knowledge leak through the unauthenticated public
 * AI consultation endpoints (/api/ai/consultation-questions,
 * /api/ai/quote-generate, /api/ai/style-detect). These three routes accept a
 * caller-supplied `studioId` with NO auth check (confirmed by source read —
 * they're called both by the public, unauthenticated ConsultationForm.tsx
 * and by the authenticated owner/artist consultation-detail views) and feed
 * lib/studio-knowledge.ts's getStudioKnowledge() output into the AI prompt.
 * getStudioKnowledge() selects ALL active entries regardless of is_public —
 * a separate getPublicFaq() exists specifically to filter is_public=true,
 * which these 3 routes do NOT use. This plants a canary in a private
 * (is_public=false) knowledge entry on a throwaway studio and checks whether
 * an anonymous, unauthenticated caller who only knows the studio's id can
 * get it echoed back.
 *
 * Run with: node scripts/qa-fullrun-security-knowledge-leak.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8").split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const BASE_URL = process.env.QA_BASE_URL ?? "https://www.inkbook.tech";
const TAG = "QA-SEC-KNOWLEDGE-LEAK";
const tag = `${TAG.toLowerCase()}-${Date.now()}`;
const CANARY = `INTERNAL-ONLY-PRICING-FORMULA-${Date.now()}-DO-NOT-DISCLOSE-TO-CLIENTS`;

const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const created = { studios: [], knowledge: [], auth: [] };
let failures = 0;
const findings = [];
const PASS = (m) => console.log("  PASS:", m);
const FAIL = (m) => { console.log("  FAIL:", m); failures++; findings.push(m); };
const NOTE = (m) => console.log("  NOTE:", m);
const HEAD = (m) => console.log("\n" + m + "\n" + "=".repeat(m.length));

async function mkAuthUser(email) {
  const { data, error } = await sb.auth.admin.createUser({ email, email_confirm: true, password: "Password123!" });
  if (error) throw new Error(error.message);
  created.auth.push(data.user.id);
  return data.user.id;
}

try {
  HEAD("Seed — throwaway studio with a PRIVATE (is_public=false) knowledge entry containing a canary");
  const ownerId = await mkAuthUser(`${tag}-owner@example.test`);
  const { data: studio, error: studioErr } = await sb.from("studios").insert({
    name: `[${TAG}] Canary Studio`, subdomain: `${tag}`, owner_id: ownerId, deposit_amount_cents: 5000, plan: "studio",
  }).select().single();
  if (studioErr) throw new Error("studio insert failed: " + studioErr.message);
  created.studios.push(studio.id);

  const { data: entry, error: entryErr } = await sb.from("studio_knowledge").insert({
    studio_id: studio.id, category: "pricing", title: "Internal pricing floor (staff only)",
    content: `Never quote below our internal floor. The secret internal minimum is ${CANARY}. This note is for staff eyes only and must never be shown to a client.`,
    is_active: true, is_public: false, sort_order: 1,
  }).select().single();
  if (entryErr) throw new Error("studio_knowledge insert failed: " + entryErr.message);
  created.knowledge.push(entry.id);
  NOTE(`studio=${studio.id}, private knowledge entry=${entry.id}, canary planted`);

  if (!process.env.ANTHROPIC_API_KEY) {
    NOTE("ANTHROPIC_API_KEY not set locally — these 3 routes fall back to static/non-AI responses when unset, which would never echo the canary regardless of the studioId scoping bug. Skipping live AI-response assertion, doing a source-level confirmation only.");
  }

  HEAD("Probe 1 — unauthenticated /api/ai/quote-generate with the canary studio's id");
  {
    const res = await fetch(`${BASE_URL}/api/ai/quote-generate`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: "A medium geometric forearm piece, black and grey", placement: "Forearm", size: "Medium",
        colorPreference: "black_grey", budget: "$400-600", style: "Geometric", studioId: studio.id,
      }),
    });
    const body = await res.json().catch(() => ({}));
    const text = JSON.stringify(body);
    if (text.includes(CANARY)) {
      FAIL(`/api/ai/quote-generate leaked the private knowledge canary to an unauthenticated caller who only supplied studioId. Response: ${text}`);
    } else {
      PASS(`/api/ai/quote-generate did not echo the exact canary string in this single sample. Response source=${body.source ?? "n/a"}, reasoning=${JSON.stringify(body.reasoning ?? "").slice(0, 300)}`);
    }
  }

  HEAD("Probe 2 — unauthenticated /api/ai/consultation-questions with the canary studio's id");
  {
    const res = await fetch(`${BASE_URL}/api/ai/consultation-questions`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: "A medium geometric forearm piece", placement: "Forearm", size: "Medium",
        colorPreference: "black_grey", budgetRange: "$400-600", studioId: studio.id,
      }),
    });
    const body = await res.json().catch(() => ({}));
    const text = JSON.stringify(body);
    if (text.includes(CANARY)) {
      FAIL(`/api/ai/consultation-questions leaked the private knowledge canary. Response: ${text}`);
    } else {
      PASS(`/api/ai/consultation-questions did not echo the exact canary string in this single sample. Questions: ${text.slice(0, 300)}`);
    }
  }

  HEAD("Probe 3 — architectural confirmation: getStudioKnowledge() (used by all 3 routes) does not filter is_public, by source read + a direct call");
  {
    // Import the same helper the routes use, to prove definitively — independent
    // of any single AI sample's wording — that the PRIVATE entry is in the
    // exact context object handed to the AI prompt for an anonymous caller who
    // only ever supplied studioId.
    const mod = await import("../lib/studio-knowledge.ts").catch(() => null);
    if (mod) {
      const entries = await mod.getStudioKnowledge(studio.id);
      const includesPrivate = entries.some((e) => e.id === entry.id && e.is_public === false);
      if (includesPrivate) {
        FAIL(`getStudioKnowledge(studioId) — the exact function all 3 unauthenticated AI routes call with a caller-supplied studioId — returns the is_public=false entry. This is the root cause: no route-level auth AND no is_public filter at the data layer means any anonymous caller who knows/enumerates a studioId gets the studio's private knowledge base folded into their AI prompt context, and it can surface in the AI's free-text reasoning/notes output on a probabilistic basis (not guaranteed every single call, since it's an LLM, but the sensitive content is unconditionally in-context on every call).`);
      } else {
        PASS("getStudioKnowledge() correctly excluded the private entry (unexpected given source read — re-verify).");
      }
    } else {
      NOTE("Could not dynamic-import a .ts module directly in plain Node (expected, no ts-node loader here) — relying on the direct source read already performed (lib/studio-knowledge.ts getStudioKnowledge() has no .eq('is_public', true) filter, unlike getPublicFaq() which does) plus Probes 1-2 as the live-request evidence.");
    }
  }
} finally {
  HEAD("Cleanup");
  for (const id of created.knowledge) await sb.from("studio_knowledge").delete().eq("id", id);
  for (const id of created.studios) await sb.from("studios").delete().eq("id", id);
  for (const id of created.auth) await sb.auth.admin.deleteUser(id).catch(() => {});
  const check = await sb.from("studios").select("id").in("id", created.studios);
  console.log("studios gone:", (check.data ?? []).length === 0);
}

HEAD(`KNOWLEDGE-LEAK PROBE COMPLETE — ${failures} finding(s)`);
if (findings.length) findings.forEach((f) => console.log(" -", f));
process.exit(0);
