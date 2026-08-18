import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit, getClientIp, rateLimitedResponse } from "@/lib/rate-limit";
import { getAIProvider } from "@/lib/ai";
import { rankArtistsByStyle, type MatchCandidate, type MatchResult } from "@/lib/artist-match";

// AI Consultation -> Artist Match -> Quote (DEFERRED_ISSUES.md #8, in-scope
// per the strict completion mission). Human authority remains final in
// every case: this route only ever RANKS/ANNOTATES the studio's own active
// artists for a human (owner/artist) to review and pick from — it never
// assigns an artist to a booking, and the actual artist-selection controls
// in ConsultationDetail.tsx remain plain, freely-overridable dropdowns.
//
// AI's role is intentionally bounded: it may only reorder and annotate the
// exact candidate set the deterministic ranker (lib/artist-match.ts)
// already produced from real data (artists.styles) — it can never invent a
// candidate, and any response naming an id outside that set, or missing/
// duplicating ids, is rejected wholesale in favor of the deterministic
// ranking. Same "never break the flow" convention as style-detect and
// quote-generate: no API key, a network error, or an invalid response all
// fall back to the same safe deterministic result, never an error page.
export async function POST(req: Request) {
  const rl = checkRateLimit(`artist-match:${getClientIp(req)}`, 20);
  if (!rl.allowed) return rateLimitedResponse(rl.retryAfter);

  try {
    const body = await req.json();
    const { studioId, detectedStyle, description, placement } = body as {
      studioId?: string;
      detectedStyle?: string | null;
      description?: string;
      placement?: string;
    };

    if (!studioId) {
      return NextResponse.json({ error: "studioId is required" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data: artistsRaw, error } = await supabase
      .from("artists")
      .select("id, name, bio, styles")
      .eq("studio_id", studioId)
      .eq("is_active", true)
      .order("name");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const candidates = (artistsRaw ?? []) as MatchCandidate[];
    const deterministic = rankArtistsByStyle(candidates, detectedStyle ?? null);

    if (candidates.length === 0 || !process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ matches: deterministic, source: "deterministic" });
    }

    try {
      const aiRanked = await refineWithAI(candidates, deterministic, {
        detectedStyle: detectedStyle ?? null,
        description: description ?? "",
        placement: placement ?? "",
      });
      return NextResponse.json({ matches: aiRanked, source: "ai" });
    } catch (aiErr) {
      console.error("[artist-match] AI refinement failed, using deterministic ranking:", aiErr);
      return NextResponse.json({ matches: deterministic, source: "deterministic" });
    }
  } catch (err) {
    console.error("[artist-match]", err);
    return NextResponse.json({ error: "Failed to rank artists" }, { status: 500 });
  }
}

async function refineWithAI(
  candidates: MatchCandidate[],
  deterministic: MatchResult[],
  consult: { detectedStyle: string | null; description: string; placement: string }
): Promise<MatchResult[]> {
  const candidateLines = candidates
    .map((c) => `- id: ${c.id} | name: ${c.name} | accepted styles: ${c.styles.join(", ") || "none listed"} | bio: ${c.bio || "none"}`)
    .join("\n");

  const prompt = `You are helping a tattoo studio owner pick which of their own artists best fits a new consultation. You may ONLY choose from and reorder the exact candidates listed below — never invent a new one.

Consultation:
- Detected style: ${consult.detectedStyle ?? "unknown"}
- Description: ${consult.description}
- Placement: ${consult.placement}

Candidates:
${candidateLines}

Respond ONLY with a JSON array, ranked best-fit first, containing every candidate id exactly once — no more, no fewer:
[{ "id": "<candidate id>", "reason": "<one short sentence on why this artist fits, referencing their bio/styles>" }]`;

  const text = await getAIProvider().extract({ prompt });
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) throw new Error("No JSON array in AI response");

  const parsed = JSON.parse(match[0]) as { id: string; reason: string }[];

  const candidateIds = new Set(candidates.map((c) => c.id));
  const returnedIds = parsed.map((p) => p.id);
  const isValidSet =
    returnedIds.length === candidateIds.size &&
    new Set(returnedIds).size === candidateIds.size &&
    returnedIds.every((id) => candidateIds.has(id));

  if (!isValidSet) throw new Error("AI response did not name exactly the given candidate set");

  const deterministicById = new Map(deterministic.map((d) => [d.id, d]));
  return parsed.map((p, i) => {
    const base = deterministicById.get(p.id)!;
    return {
      id: p.id,
      name: base.name,
      score: Math.max(0, 100 - i * 5), // reflects AI's chosen order, not re-derived from style match alone
      reason: typeof p.reason === "string" && p.reason.trim() ? p.reason.trim() : base.reason,
      isRecommended: i === 0 || base.isRecommended,
    };
  });
}
