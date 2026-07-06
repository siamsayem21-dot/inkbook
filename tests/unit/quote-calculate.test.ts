import { describe, it, expect } from "vitest";
import { calculateQuote } from "@/lib/quote/calculate";

describe("calculateQuote", () => {
  it("prices a small fine-line black & grey piece at the low end", () => {
    const result = calculateQuote({
      size: 'Small (under 2")',
      colorPreference: "black_grey",
      style: "Fine Line",
    });
    expect(result.priceLow).toBeGreaterThan(0);
    expect(result.priceHigh).toBeGreaterThanOrEqual(result.priceLow);
    expect(result.difficulty).toBe("Easy");
    expect(result.sessions).toBe(1);
  });

  it("applies the realism multiplier so realism costs more than fine line at the same size", () => {
    const base = { size: 'Large (4–8")', colorPreference: "black_grey" as const };
    const fineLine = calculateQuote({ ...base, style: "Fine Line" });
    const realism = calculateQuote({ ...base, style: "Realism" });
    expect(realism.priceHigh).toBeGreaterThan(fineLine.priceHigh);
  });

  it("applies the color multiplier so full color costs more than black & grey", () => {
    const base = { size: 'Medium (2–4")', style: "Traditional" };
    const blackGrey = calculateQuote({ ...base, colorPreference: "black_grey" });
    const color = calculateQuote({ ...base, colorPreference: "color" });
    expect(color.priceHigh).toBeGreaterThan(blackGrey.priceHigh);
  });

  it("rates a full sleeve as Hard difficulty with multiple sessions", () => {
    const result = calculateQuote({
      size: "Full Sleeve",
      colorPreference: "color",
      style: "Japanese",
    });
    expect(result.difficulty).toBe("Hard");
    expect(result.sessions).toBeGreaterThan(1);
  });

  it("falls back to medium defaults for an unknown size", () => {
    const result = calculateQuote({
      size: "Some Unlisted Size",
      colorPreference: "open",
      style: null,
    });
    expect(result.priceLow).toBeGreaterThan(0);
    expect(result.difficulty).not.toBe("");
  });

  it("rounds prices to the nearest $25", () => {
    const result = calculateQuote({
      size: 'Medium (2–4")',
      colorPreference: "black_grey",
      style: "Geometric",
    });
    expect(result.priceLow % 25).toBe(0);
    expect(result.priceHigh % 25).toBe(0);
  });

  it("never returns priceHigh below priceLow", () => {
    const sizes = ['Small (under 2")', "Half Sleeve", "Full Back"];
    for (const size of sizes) {
      const result = calculateQuote({ size, colorPreference: "color", style: "Realism" });
      expect(result.priceHigh).toBeGreaterThanOrEqual(result.priceLow);
    }
  });
});
