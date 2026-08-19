import { describe, it, expect } from "vitest";
import { isWithinConflictBuffer, BOOKING_CONFLICT_BUFFER_MINUTES, isDateUnavailable } from "@/lib/booking-conflict";

describe("isWithinConflictBuffer", () => {
  it("flags identical times as conflicting", () => {
    expect(isWithinConflictBuffer("10:00", "10:00")).toBe(true);
  });

  it("flags times within the buffer as conflicting", () => {
    expect(isWithinConflictBuffer("10:00", "11:00")).toBe(true); // 60min apart
  });

  it("does not flag times exactly at the buffer boundary", () => {
    const boundaryMinutes = BOOKING_CONFLICT_BUFFER_MINUTES;
    const existing = "10:00";
    const requestedTotal = 10 * 60 + boundaryMinutes; // exactly BOOKING_CONFLICT_BUFFER_MINUTES later
    const requested = `${String(Math.floor(requestedTotal / 60)).padStart(2, "0")}:${String(requestedTotal % 60).padStart(2, "0")}`;
    expect(isWithinConflictBuffer(existing, requested)).toBe(false);
  });

  it("does not flag times well outside the buffer", () => {
    expect(isWithinConflictBuffer("10:00", "16:00")).toBe(false); // 360min apart
  });

  it("is symmetric regardless of argument order", () => {
    expect(isWithinConflictBuffer("10:00", "11:00")).toBe(isWithinConflictBuffer("11:00", "10:00"));
  });
});

describe("isDateUnavailable", () => {
  it("flags a date that's in the artist's unavailable_dates", () => {
    expect(isDateUnavailable(["2027-01-01", "2027-01-15"], "2027-01-15")).toBe(true);
  });

  it("does not flag a date that's not in the list", () => {
    expect(isDateUnavailable(["2027-01-01", "2027-01-15"], "2027-01-16")).toBe(false);
  });

  it("treats an empty array as fully available", () => {
    expect(isDateUnavailable([], "2027-01-15")).toBe(false);
  });

  it("treats null/undefined as fully available (column default)", () => {
    expect(isDateUnavailable(null, "2027-01-15")).toBe(false);
    expect(isDateUnavailable(undefined, "2027-01-15")).toBe(false);
  });
});
