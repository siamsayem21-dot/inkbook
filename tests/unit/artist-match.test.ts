import { describe, it, expect } from "vitest";
import { rankArtistsByStyle, type MatchCandidate } from "@/lib/artist-match";

const artist = (id: string, name: string, styles: string[]): MatchCandidate => ({
  id, name, bio: null, styles,
});

describe("rankArtistsByStyle", () => {
  it("ranks a style-matching artist above non-matching artists", () => {
    const candidates = [
      artist("a", "Alice", ["Realism"]),
      artist("b", "Bob", ["Traditional", "Japanese"]),
    ];
    const result = rankArtistsByStyle(candidates, "Traditional");
    expect(result[0].id).toBe("b");
    expect(result[0].isRecommended).toBe(true);
    expect(result[1].id).toBe("a");
    expect(result[1].isRecommended).toBe(false);
  });

  it("returns all candidates as general options when no style is detected", () => {
    const candidates = [artist("a", "Alice", ["Realism"]), artist("b", "Bob", ["Traditional"])];
    const result = rankArtistsByStyle(candidates, null);
    expect(result.every((r) => !r.isRecommended)).toBe(true);
    expect(result.every((r) => r.score === 50)).toBe(true);
  });

  it("returns all candidates as general options when no artist matches the detected style", () => {
    const candidates = [artist("a", "Alice", ["Realism"]), artist("b", "Bob", ["Japanese"])];
    const result = rankArtistsByStyle(candidates, "Watercolor");
    expect(result.every((r) => !r.isRecommended)).toBe(true);
  });

  it("ranks multiple matching candidates above multiple non-matching, alphabetically within each tier", () => {
    const candidates = [
      artist("a", "Zara", ["Traditional"]),
      artist("b", "Amy", ["Traditional"]),
      artist("c", "Mike", ["Realism"]),
    ];
    const result = rankArtistsByStyle(candidates, "Traditional");
    expect(result.map((r) => r.id)).toEqual(["b", "a", "c"]); // Amy, Zara, then Mike
  });

  it("handles an empty candidate list without throwing", () => {
    expect(rankArtistsByStyle([], "Traditional")).toEqual([]);
  });

  it("produces stable output for identical input (deterministic)", () => {
    const candidates = [artist("a", "Alice", ["Traditional"]), artist("b", "Bob", ["Traditional"])];
    const r1 = rankArtistsByStyle(candidates, "Traditional");
    const r2 = rankArtistsByStyle(candidates, "Traditional");
    expect(r1).toEqual(r2);
  });
});
