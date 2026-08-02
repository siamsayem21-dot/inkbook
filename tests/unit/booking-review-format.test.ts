import { describe, it, expect } from "vitest";
import { formatRatingStars } from "@/lib/booking-review";

describe("formatRatingStars", () => {
  it("renders 5 filled stars for a perfect rating", () => {
    expect(formatRatingStars(5)).toBe("★★★★★ (5/5)");
  });

  it("renders a mix of filled and empty stars", () => {
    expect(formatRatingStars(3)).toBe("★★★☆☆ (3/5)");
  });

  it("renders one filled star for the lowest valid rating", () => {
    expect(formatRatingStars(1)).toBe("★☆☆☆☆ (1/5)");
  });
});
