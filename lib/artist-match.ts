// Deterministic artist-matching core for the AI Consultation -> Artist
// Match -> Quote lifecycle (DEFERRED_ISSUES.md #8, in-scope per the strict
// completion mission). This is the safe fallback the AI-assisted match
// route (app/api/ai/artist-match/route.ts) always has available, and the
// sole ranking logic when ANTHROPIC_API_KEY is unset or the AI call fails
// — matching lib/ai's other routes' "never break the flow" convention.
//
// Scores purely on data the studio itself entered (artists.styles) against
// the AI-detected style from Step 4 of the consultation — no invented
// signal, no hallucination risk. Deliberately simple: an exact style match
// is a strong, explainable recommendation; anything else is presented as a
// general option, not a guess dressed up as a match.

export type MatchCandidate = {
  id: string;
  name: string;
  bio: string | null;
  styles: string[];
};

export type MatchResult = {
  id: string;
  name: string;
  score: number; // 0-100
  reason: string;
  isRecommended: boolean;
};

/**
 * Ranks active studio artists against a consultation's detected style.
 * Never filters anyone out (inactive artists are expected to already be
 * excluded upstream, e.g. by the DB query) — every candidate gets a score
 * and a reason, so the caller can always show a full list; `isRecommended`
 * marks the ones worth highlighting.
 */
export function rankArtistsByStyle(
  candidates: MatchCandidate[],
  detectedStyle: string | null
): MatchResult[] {
  const style = detectedStyle?.trim();

  const results = candidates.map((c): MatchResult => {
    const matchesStyle = Boolean(style) && c.styles.includes(style!);
    if (matchesStyle) {
      return {
        id: c.id,
        name: c.name,
        score: 100,
        reason: `Accepts ${style} — matches this consultation's detected style.`,
        isRecommended: true,
      };
    }
    return {
      id: c.id,
      name: c.name,
      score: 50,
      reason: style
        ? `Doesn't list ${style} among accepted styles — general option.`
        : "No detected style to match against — general option.",
      isRecommended: false,
    };
  });

  // Stable-ish ordering: highest score first, ties broken alphabetically by
  // name so re-running with identical input always produces the same order.
  return results.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
}
