import { describe, it, expect, beforeEach, vi } from "vitest";
import { createSupabaseMock, type SupabaseMock } from "../mocks/supabase";

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));

import { createAdminClient } from "@/lib/supabase/admin";
import { getClientBookings, getClientBookingDetail } from "@/lib/client-portal/bookings";

let sb: SupabaseMock;

beforeEach(() => {
  sb = createSupabaseMock();
  vi.mocked(createAdminClient).mockReturnValue(sb.client as unknown as ReturnType<typeof createAdminClient>);
});

describe("getClientBookings", () => {
  it("returns [] when the client has no submitted ai_chats", async () => {
    sb.queueFrom("ai_chats", []);
    const result = await getClientBookings("studio-1", "acc-1");
    expect(result).toEqual([]);
    expect(sb.fromCalls).toEqual(["ai_chats"]);
  });

  it("returns [] when none of the client's consultations have a booking yet", async () => {
    sb.queueFrom("ai_chats", [{ consultation_id: "proj-1" }]);
    sb.queueFrom("consultations", []); // no consultations with booking_id set
    const result = await getClientBookings("studio-1", "acc-1");
    expect(result).toEqual([]);
  });

  it("resolves the full ownership chain and returns mapped bookings", async () => {
    sb.queueFrom("ai_chats", [{ consultation_id: "proj-1" }]);
    sb.queueFrom("consultations", [
      { id: "proj-1", booking_id: "bk-1", tattoo_description: "A dragon sleeve", detected_style: "Japanese" },
    ]);
    sb.queueFrom("bookings", [
      {
        id: "bk-1", artist_id: "artist-1", date: "2026-08-01", time: "14:00:00", style: "Japanese",
        description: null, status: "confirmed", deposit_amount_cents: 10000, deposit_paid: true,
        deposit_paid_at: "2026-07-20T00:00:00Z", deposit_kept: false, deposit_expires_at: null, total_amount_cents: 50000,
      },
    ]);
    sb.queueFrom("artists", [{ id: "artist-1", name: "Jane Artist" }]);

    const result = await getClientBookings("studio-1", "acc-1");

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: "bk-1", consultationId: "proj-1", artistName: "Jane Artist",
      status: "confirmed", date: "2026-08-01", depositPaid: true,
    });
    expect(result[0].title).toContain("Japanese");
  });

  it("never queries artists when no booking has an assigned artist", async () => {
    sb.queueFrom("ai_chats", [{ consultation_id: "proj-1" }]);
    sb.queueFrom("consultations", [
      { id: "proj-1", booking_id: "bk-1", tattoo_description: "Small script", detected_style: null },
    ]);
    sb.queueFrom("bookings", [
      {
        id: "bk-1", artist_id: null, date: null, time: null, style: "Custom",
        description: null, status: "pending_deposit", deposit_amount_cents: 5000, deposit_paid: false,
        deposit_paid_at: null, deposit_kept: false, deposit_expires_at: "2026-07-14T00:00:00Z", total_amount_cents: null,
      },
    ]);

    const result = await getClientBookings("studio-1", "acc-1");

    expect(result[0].artistName).toBeNull();
    expect(sb.fromCalls).not.toContain("artists");
  });
});

describe("getClientBookingDetail", () => {
  it("returns null when the client has no submitted ai_chats", async () => {
    sb.queueFrom("ai_chats", []);
    const result = await getClientBookingDetail("studio-1", "acc-1", "bk-1");
    expect(result).toBeNull();
    expect(sb.fromCalls).toEqual(["ai_chats"]);
  });

  it("returns null when no owned consultation points at this booking (ownership fails)", async () => {
    sb.queueFrom("ai_chats", [{ consultation_id: "proj-1" }]);
    sb.queueFrom("consultations", null); // .maybeSingle() finds no match for this bookingId
    const result = await getClientBookingDetail("studio-1", "acc-1", "someone-elses-booking");
    expect(result).toBeNull();
    expect(sb.fromCalls).not.toContain("bookings");
  });

  it("returns null if the booking row itself is missing despite a matched consultation", async () => {
    sb.queueFrom("ai_chats", [{ consultation_id: "proj-1" }]);
    sb.queueFrom("consultations", { id: "proj-1", tattoo_description: "x", detected_style: null });
    sb.queueFrom("bookings", null);
    const result = await getClientBookingDetail("studio-1", "acc-1", "bk-1");
    expect(result).toBeNull();
  });

  it("resolves full detail including consent form presence", async () => {
    sb.queueFrom("ai_chats", [{ consultation_id: "proj-1" }]);
    sb.queueFrom("consultations", { id: "proj-1", tattoo_description: "A dragon sleeve", detected_style: "Japanese" });
    sb.queueFrom("bookings", {
      id: "bk-1", artist_id: "artist-1", date: "2026-08-01", time: "14:00:00", style: "Japanese",
      description: "Full sleeve, color", status: "confirmed", deposit_amount_cents: 10000, deposit_paid: true,
      deposit_paid_at: "2026-07-20T00:00:00Z", deposit_kept: false, deposit_expires_at: null, total_amount_cents: 50000,
    });
    sb.queueFrom("artists", [{ id: "artist-1", name: "Jane Artist" }]);
    sb.queueFrom("consent_forms", { id: "cf-1" });

    const result = await getClientBookingDetail("studio-1", "acc-1", "bk-1");

    expect(result).toMatchObject({
      id: "bk-1", consultationId: "proj-1", artistName: "Jane Artist",
      hasConsentForm: true, totalAmountCents: 50000,
    });
  });

  it("reports hasConsentForm: false when no consent_forms row exists", async () => {
    sb.queueFrom("ai_chats", [{ consultation_id: "proj-1" }]);
    sb.queueFrom("consultations", { id: "proj-1", tattoo_description: "x", detected_style: null });
    sb.queueFrom("bookings", {
      id: "bk-1", artist_id: null, date: null, time: null, style: "Custom",
      description: null, status: "pending_deposit", deposit_amount_cents: 5000, deposit_paid: false,
      deposit_paid_at: null, deposit_kept: false, deposit_expires_at: "2026-07-14T00:00:00Z", total_amount_cents: null,
    });
    sb.queueFrom("consent_forms", null);

    const result = await getClientBookingDetail("studio-1", "acc-1", "bk-1");

    expect(result?.hasConsentForm).toBe(false);
  });
});
