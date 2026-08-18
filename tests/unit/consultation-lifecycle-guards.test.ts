import { describe, it, expect, beforeEach, vi } from "vitest";
import { createSupabaseMock, type SupabaseMock } from "../mocks/supabase";

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/auth/config", () => ({ getStudioId: vi.fn() }));
vi.mock("@/lib/stripe/deposit-checkout", () => ({
  capDepositAmountCents: vi.fn((studioDefault: number) => studioDefault),
}));

import { createAdminClient } from "@/lib/supabase/admin";
import { getStudioId } from "@/lib/auth/config";
import {
  saveConsultationQuote,
  updateConsultationStatus,
  bookConsultation,
  startConsultationDeposit,
} from "@/app/book/[studio]/consult/actions";
import { isAllowedStatusTransition, isForwardSystemTransition } from "@/lib/pipeline";

const LIFECYCLE = ["new", "reviewed", "quoted", "deposit_paid", "booked", "completed"];
const NON_TERMINAL = ["new", "reviewed", "quoted", "deposit_paid", "booked"];

let sb: SupabaseMock;

const QUOTE_PAYLOAD = {
  priceLow: 500, priceHigh: 800, sessions: 2, hoursRange: "4-6",
  difficulty: "Medium", reasoning: "test", finalPrice: 650, finalSessions: 2, notes: "",
};

beforeEach(() => {
  sb = createSupabaseMock();
  vi.mocked(createAdminClient).mockReturnValue(sb.client as unknown as ReturnType<typeof createAdminClient>);
  vi.mocked(getStudioId).mockResolvedValue("studio-1");
});

// ── isAllowedStatusTransition — strict MANUAL-transition rule ──────────────────
// (updateConsultationStatus() — the status pills + Pipeline board dropdown)

describe("isAllowedStatusTransition (lib/pipeline.ts) — manual, adjacent-only", () => {
  it("allows every adjacent forward step EXCEPT -> Booked, which is never manual", () => {
    for (let i = 0; i < LIFECYCLE.length - 1; i++) {
      const [from, to] = [LIFECYCLE[i], LIFECYCLE[i + 1]];
      expect(isAllowedStatusTransition(from, to)).toBe(to !== "booked");
    }
  });

  it("rejects -> Booked from every stage, not just its adjacent predecessor (Deposit Paid)", () => {
    for (const from of LIFECYCLE) {
      expect(isAllowedStatusTransition(from, "booked")).toBe(false);
    }
  });

  it("rejects skipping ahead more than one stage", () => {
    expect(isAllowedStatusTransition("new", "quoted")).toBe(false);
    expect(isAllowedStatusTransition("new", "deposit_paid")).toBe(false);
    expect(isAllowedStatusTransition("new", "booked")).toBe(false);
    expect(isAllowedStatusTransition("new", "completed")).toBe(false);
    expect(isAllowedStatusTransition("reviewed", "deposit_paid")).toBe(false);
    expect(isAllowedStatusTransition("quoted", "booked")).toBe(false);
    expect(isAllowedStatusTransition("deposit_paid", "completed")).toBe(false);
  });

  it("rejects every backward step", () => {
    for (let i = LIFECYCLE.length - 1; i > 0; i--) {
      expect(isAllowedStatusTransition(LIFECYCLE[i], LIFECYCLE[i - 1])).toBe(false);
    }
  });

  it("rejects a same-status no-op click", () => {
    for (const s of LIFECYCLE) {
      expect(isAllowedStatusTransition(s, s)).toBe(false);
    }
  });

  it("allows 'lost' from any non-terminal stage", () => {
    for (const s of NON_TERMINAL) {
      expect(isAllowedStatusTransition(s, "lost")).toBe(true);
    }
  });

  it("treats completed and lost as terminal — no transitions out, including to each other or a no-op", () => {
    for (const from of ["completed", "lost"]) {
      for (const to of ["new", "reviewed", "quoted", "deposit_paid", "booked", "completed", "lost"]) {
        expect(isAllowedStatusTransition(from, to)).toBe(false);
      }
    }
  });

  it("normalizes legacy 'converted' as equivalent to 'completed' (terminal)", () => {
    expect(isAllowedStatusTransition("converted", "quoted")).toBe(false);
    expect(isAllowedStatusTransition("converted", "lost")).toBe(false);
  });
});

// ── isForwardSystemTransition — looser AUTOMATIC-transition rule ───────────────
// (saveConsultationQuote / bookConsultation / the Stripe webhook)

describe("isForwardSystemTransition (lib/pipeline.ts) — automatic, skip-ahead allowed", () => {
  it("allows skipping ahead (e.g. new -> booked) — legitimate for system-driven jumps", () => {
    expect(isForwardSystemTransition("new", "booked")).toBe(true);
    expect(isForwardSystemTransition("new", "quoted")).toBe(true);
  });

  it("allows every adjacent forward step too", () => {
    for (let i = 0; i < LIFECYCLE.length - 1; i++) {
      expect(isForwardSystemTransition(LIFECYCLE[i], LIFECYCLE[i + 1])).toBe(true);
    }
  });

  it("rejects every backward step", () => {
    for (let i = LIFECYCLE.length - 1; i > 0; i--) {
      expect(isForwardSystemTransition(LIFECYCLE[i], LIFECYCLE[i - 1])).toBe(false);
    }
  });

  it("specifically rejects Booked -> Deposit Paid (the reported webhook regression)", () => {
    expect(isForwardSystemTransition("booked", "deposit_paid")).toBe(false);
  });

  it("allows 'lost' from any non-terminal stage", () => {
    for (const s of NON_TERMINAL) {
      expect(isForwardSystemTransition(s, "lost")).toBe(true);
    }
  });

  it("treats completed and lost as terminal", () => {
    expect(isForwardSystemTransition("completed", "deposit_paid")).toBe(false);
    expect(isForwardSystemTransition("lost", "quoted")).toBe(false);
  });
});

// ── updateConsultationStatus — server action ────────────────────────────────────

describe("updateConsultationStatus — regression guard", () => {
  it("rejects Completed -> Quoted (the reported regression)", async () => {
    sb.queueFrom("consultations", { status: "completed" }); // current-status read
    const result = await updateConsultationStatus("c1", "quoted" as never);
    expect(result.error).toMatch(/closed/i);
  });

  it("rejects Booked -> New (backward, non-terminal)", async () => {
    sb.queueFrom("consultations", { status: "booked" });
    const result = await updateConsultationStatus("c1", "new" as never);
    expect(result.error).toMatch(/backward/i);
  });

  it("rejects Lost -> anything", async () => {
    sb.queueFrom("consultations", { status: "lost" });
    const result = await updateConsultationStatus("c1", "reviewed" as never);
    expect(result.error).toMatch(/closed/i);
  });

  it("allows a legitimate forward move (Quoted -> Deposit Paid) and writes it", async () => {
    sb.queueFrom("consultations", { status: "quoted" }); // current-status read
    sb.queueFrom("consultations", { success: true });    // the update itself
    const result = await updateConsultationStatus("c1", "deposit_paid" as never);
    expect(result.error).toBeUndefined();
  });

  it("allows New -> Lost (exit state)", async () => {
    sb.queueFrom("consultations", { status: "new" });
    sb.queueFrom("consultations", { success: true });
    const result = await updateConsultationStatus("c1", "lost" as never);
    expect(result.error).toBeUndefined();
  });

  it("rejects skipping ahead (New -> Quoted, skipping Reviewed)", async () => {
    sb.queueFrom("consultations", { status: "new" });
    const result = await updateConsultationStatus("c1", "quoted" as never);
    expect(result.error).toMatch(/backward/i);
  });

  it.each([
    ["new", "reviewed"],
    ["reviewed", "quoted"],
    ["quoted", "deposit_paid"],
    ["booked", "completed"],
  ])("allows the adjacent step %s -> %s", async (from, to) => {
    sb.queueFrom("consultations", { status: from });
    sb.queueFrom("consultations", { success: true });
    const result = await updateConsultationStatus("c1", to as never);
    expect(result.error).toBeUndefined();
  });

  it("rejects manually setting Deposit Paid -> Booked via the status pills/dropdown (Confirm Appointment only)", async () => {
    sb.queueFrom("consultations", { status: "deposit_paid" });
    const result = await updateConsultationStatus("c1", "booked" as never);
    expect(result.error).toMatch(/confirming an appointment/i);
    // No write attempted — only the status-check read happened.
    expect(sb.fromCalls.filter((t) => t === "consultations")).toHaveLength(1);
  });

  it.each(["new", "reviewed", "quoted", "booked"])(
    "rejects manually setting -> Booked from %s too",
    async (from) => {
      sb.queueFrom("consultations", { status: from });
      const result = await updateConsultationStatus("c1", "booked" as never);
      expect(result.error).toBeTruthy();
    }
  );

  it.each(["new", "reviewed", "quoted", "deposit_paid", "booked"])(
    "allows %s -> Lost",
    async (from) => {
      sb.queueFrom("consultations", { status: from });
      sb.queueFrom("consultations", { success: true });
      const result = await updateConsultationStatus("c1", "lost" as never);
      expect(result.error).toBeUndefined();
    }
  );
});

// ── saveConsultationQuote — server action ────────────────────────────────────────

describe("saveConsultationQuote — regression guard", () => {
  it("refuses to write at all when the consultation is Completed", async () => {
    sb.queueFrom("consultations", { status: "completed" }); // current-status read
    const result = await saveConsultationQuote("c1", QUOTE_PAYLOAD);
    expect(result.error).toMatch(/closed/i);
    // Only the status-check read should have happened — no update attempted.
    expect(sb.fromCalls.filter((t) => t === "consultations")).toHaveLength(1);
  });

  it("refuses to write at all when the consultation is Lost", async () => {
    sb.queueFrom("consultations", { status: "lost" });
    const result = await saveConsultationQuote("c1", QUOTE_PAYLOAD);
    expect(result.error).toMatch(/closed/i);
  });

  it("saves and advances New -> Quoted", async () => {
    sb.queueFrom("consultations", { status: "new" });
    sb.queueFrom("consultations", { success: true });
    const result = await saveConsultationQuote("c1", QUOTE_PAYLOAD);
    expect(result.error).toBeUndefined();
    const updateChain = sb.getChain("consultations", 2);
    const updatePayload = (updateChain.update as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(updatePayload.status).toBe("quoted");
  });

  it("saves quote data for a Deposit Paid consultation WITHOUT regressing status to Quoted", async () => {
    sb.queueFrom("consultations", { status: "deposit_paid" });
    sb.queueFrom("consultations", { success: true });
    const result = await saveConsultationQuote("c1", QUOTE_PAYLOAD);
    expect(result.error).toBeUndefined();
    const updateChain = sb.getChain("consultations", 2);
    const updatePayload = (updateChain.update as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(updatePayload.status).toBeUndefined(); // status field untouched
  });

  it("saves quote data for a Booked consultation WITHOUT regressing status to Quoted", async () => {
    sb.queueFrom("consultations", { status: "booked" });
    sb.queueFrom("consultations", { success: true });
    const result = await saveConsultationQuote("c1", QUOTE_PAYLOAD);
    expect(result.error).toBeUndefined();
    const updateChain = sb.getChain("consultations", 2);
    const updatePayload = (updateChain.update as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(updatePayload.status).toBeUndefined();
  });
});

// ── bookConsultation — server action ─────────────────────────────────────────────

describe("bookConsultation — only bookable once Deposit Paid", () => {
  const CONSULT = {
    id: "c1", studio_id: "studio-1", client_name: "A", client_email: "a@example.com",
    client_phone: "+15551234567", detected_style: null, booking_id: null, final_price: 500,
  };
  const STUDIO = { id: "studio-1", deposit_amount_cents: 10000 };
  const REQ = { artistId: "artist-1", date: "2099-09-01", time: "14:00" };

  function queueHappyPath(status: string) {
    sb.queueFrom("consultations", { ...CONSULT, status });
    sb.queueFrom("studios", STUDIO);
    sb.queueRpc(false); // is_client_blacklisted -> not blocked
    sb.queueFrom("artists", { name: "Artist X", monthly_booking_cap: 20 });
    sb.queueFrom("bookings", []); // monthly count
    sb.queueFrom("clients", { id: "client-1" }); // existing client
    sb.queueFrom("bookings", { id: "bk-1" }); // insert booking
    sb.queueFrom("consultations", { success: true }); // link + status update
  }

  it.each(["new", "reviewed", "quoted"])(
    "rejects booking a %s consultation (deposit not paid yet)",
    async (status) => {
      sb.queueFrom("consultations", { ...CONSULT, status });
      const result = await bookConsultation("c1", REQ);
      expect(result.error).toMatch(/deposit/i);
      expect(sb.fromCalls).not.toContain("bookings");
    }
  );

  it("rejects booking a Completed consultation", async () => {
    sb.queueFrom("consultations", { ...CONSULT, status: "completed" });
    const result = await bookConsultation("c1", REQ);
    expect(result.error).toMatch(/closed/i);
    expect(sb.fromCalls).not.toContain("bookings");
  });

  it("rejects booking a Lost consultation", async () => {
    sb.queueFrom("consultations", { ...CONSULT, status: "lost" });
    const result = await bookConsultation("c1", REQ);
    expect(result.error).toMatch(/closed/i);
  });

  it("allows booking a Deposit Paid consultation and advances status to Booked", async () => {
    queueHappyPath("deposit_paid");
    const result = await bookConsultation("c1", REQ);
    expect(result.error).toBeUndefined();
    expect(result.bookingId).toBe("bk-1");
    const updateChain = sb.getChain("consultations", 2);
    const payload = (updateChain.update as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(payload.status).toBe("booked");
  });

  it("returns the existing booking for an already-scheduled/Booked consultation without creating a duplicate", async () => {
    sb.queueFrom("consultations", { ...CONSULT, status: "booked", booking_id: "bk-existing" });
    sb.queueFrom("bookings", { id: "bk-existing", date: "2099-01-01", time: "10:00:00" }); // already scheduled
    const result = await bookConsultation("c1", REQ);
    expect(result.error).toBeUndefined();
    expect(result.bookingId).toBe("bk-existing"); // returns the existing one, doesn't create a new one
    // Only the one read happened — no insert/update, i.e. no duplicate booking.
    expect(sb.fromCalls.filter((t) => t === "bookings")).toHaveLength(1);
  });

  it("is idempotent even for a Completed consultation that's already scheduled", async () => {
    sb.queueFrom("consultations", { ...CONSULT, status: "completed", booking_id: "bk-existing" });
    sb.queueFrom("bookings", { id: "bk-existing", date: "2099-01-01", time: "10:00:00" });
    const result = await bookConsultation("c1", REQ);
    expect(result.error).toBeUndefined();
    expect(result.bookingId).toBe("bk-existing");
  });

  it("rejects finalizing a provisional (not-yet-scheduled) booking on a Completed consultation", async () => {
    sb.queueFrom("consultations", { ...CONSULT, status: "completed", booking_id: "bk-provisional" });
    sb.queueFrom("bookings", { id: "bk-provisional", date: null, time: null }); // still awaiting_schedule
    const result = await bookConsultation("c1", REQ);
    expect(result.error).toMatch(/closed/i);
  });

  it("rejects booking a 'booked'-status consultation with no booking_id (data-integrity edge case)", async () => {
    // Shouldn't normally happen, but if it ever does, must still refuse rather
    // than silently create a second booking.
    sb.queueFrom("consultations", { ...CONSULT, status: "booked", booking_id: null });
    const result = await bookConsultation("c1", REQ);
    expect(result.error).toMatch(/deposit/i);
    expect(sb.fromCalls).not.toContain("bookings");
  });
});

// ── bookConsultation Case (a) — finalizing an existing provisional booking ─────
// (the normal path: startConsultationDeposit() already created one)

describe("bookConsultation — finalizes an existing provisional (awaiting_schedule) booking", () => {
  const CONSULT = {
    id: "c1", studio_id: "studio-1", client_name: "A", client_email: "a@example.com",
    client_phone: "+15551234567", detected_style: null, final_price: 500,
  };
  const REQ = { artistId: "artist-1", date: "2099-09-01", time: "14:00" };

  it("rejects finalizing while still Quoted (deposit not paid yet)", async () => {
    sb.queueFrom("consultations", { ...CONSULT, status: "quoted", booking_id: "bk-provisional" });
    sb.queueFrom("bookings", { id: "bk-provisional", date: null, time: null });
    const result = await bookConsultation("c1", REQ);
    expect(result.error).toMatch(/deposit/i);
    // Only the one read happened — no update, no duplicate.
    expect(sb.fromCalls.filter((t) => t === "bookings")).toHaveLength(1);
  });

  it("assigns date/time/artist and advances Deposit Paid -> Booked (the normal end-to-end path)", async () => {
    sb.queueFrom("consultations", { ...CONSULT, status: "deposit_paid", booking_id: "bk-provisional" });
    sb.queueFrom("bookings", { id: "bk-provisional", date: null, time: null }); // read — not yet scheduled
    sb.queueRpc(false); // is_client_blacklisted -> not blocked
    sb.queueFrom("artists", { name: "Artist X", monthly_booking_cap: 20 });
    sb.queueFrom("bookings", []); // monthly cap count
    sb.queueFrom("bookings", { success: true }); // update -> confirmed
    sb.queueFrom("consultations", { success: true }); // update -> booked

    const result = await bookConsultation("c1", REQ);

    expect(result.error).toBeUndefined();
    expect(result.bookingId).toBe("bk-provisional");

    const bookingUpdateChain = sb.getChain("bookings", 3); // read(1), cap-count(2), update(3)
    const bookingPayload = (bookingUpdateChain.update as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(bookingPayload).toEqual(
      expect.objectContaining({ artist_id: "artist-1", date: "2099-09-01", time: "14:00", status: "confirmed" })
    );

    const consultUpdateChain = sb.getChain("consultations", 2);
    const consultPayload = (consultUpdateChain.update as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(consultPayload).toEqual(expect.objectContaining({ status: "booked" }));

    // The booking that already existed was reused — never a second one created.
    expect((sb.getChain("bookings", 3).insert as ReturnType<typeof vi.fn> | undefined)?.mock.calls.length ?? 0).toBe(0);
  });

  it("rejects a blacklisted client even at the finalize step", async () => {
    sb.queueFrom("consultations", { ...CONSULT, status: "deposit_paid", booking_id: "bk-provisional" });
    sb.queueFrom("bookings", { id: "bk-provisional", date: null, time: null });
    sb.queueRpc(true); // is_client_blacklisted -> blocked
    const result = await bookConsultation("c1", REQ);
    expect(result.error).toMatch(/blacklisted/i);
  });

  it("rejects an artist that doesn't belong to the caller's studio (cross-studio IDOR guard)", async () => {
    sb.queueFrom("consultations", { ...CONSULT, status: "deposit_paid", booking_id: "bk-provisional" });
    sb.queueFrom("bookings", { id: "bk-provisional", date: null, time: null });
    sb.queueRpc(false); // not blacklisted
    sb.queueFrom("artists", null); // no row matches id+studio_id together
    const result = await bookConsultation("c1", { ...REQ, artistId: "artist-from-another-studio" });
    expect(result.error).toMatch(/artist not found/i);
  });
});

// ── startConsultationDeposit — the entry point into the Stripe flow ────────────

describe("startConsultationDeposit — provisional booking for deposit collection", () => {
  const CONSULT = {
    id: "c1", studio_id: "studio-1", client_name: "A", client_email: "a@example.com",
    client_phone: "+15551234567", detected_style: "Traditional", booking_id: null, final_price: 500,
  };
  const STUDIO = { id: "studio-1", deposit_amount_cents: 10000 };

  it("rejects with no artist selected", async () => {
    const result = await startConsultationDeposit("c1", "");
    expect(result.error).toMatch(/artist/i);
  });

  it.each(["new", "reviewed", "deposit_paid", "booked", "completed", "lost"])(
    "rejects starting a deposit from %s (only legitimate from Quoted)",
    async (status) => {
      sb.queueFrom("consultations", { ...CONSULT, status });
      const result = await startConsultationDeposit("c1", "artist-1");
      expect(result.error).toBeTruthy();
      expect(sb.fromCalls).not.toContain("bookings");
    }
  );

  it("rejects a Quoted consultation with no finalized price yet", async () => {
    sb.queueFrom("consultations", { ...CONSULT, status: "quoted", final_price: null });
    const result = await startConsultationDeposit("c1", "artist-1");
    expect(result.error).toMatch(/quote/i);
  });

  it("rejects an artist that doesn't belong to the caller's studio (cross-studio IDOR guard)", async () => {
    sb.queueFrom("consultations", { ...CONSULT, status: "quoted" });
    sb.queueFrom("artists", null); // no row matches id+studio_id together
    const result = await startConsultationDeposit("c1", "artist-from-another-studio");
    expect(result.error).toMatch(/artist not found/i);
    expect(sb.fromCalls).not.toContain("bookings");
  });

  it("rejects a blacklisted client", async () => {
    sb.queueFrom("consultations", { ...CONSULT, status: "quoted" });
    sb.queueFrom("artists", { id: "artist-1" }); // ownership check
    sb.queueFrom("studios", STUDIO);
    sb.queueRpc(true); // blacklisted
    const result = await startConsultationDeposit("c1", "artist-1");
    expect(result.error).toMatch(/blacklisted/i);
    expect(sb.fromCalls).not.toContain("bookings");
  });

  it("creates a provisional booking (no date/time) and links it WITHOUT changing consultation status", async () => {
    sb.queueFrom("consultations", { ...CONSULT, status: "quoted" });
    sb.queueFrom("artists", { id: "artist-1" }); // ownership check
    sb.queueFrom("studios", STUDIO);
    sb.queueRpc(false);
    sb.queueFrom("clients", { id: "client-1" });
    sb.queueFrom("bookings", { id: "bk-new" }); // insert
    sb.queueFrom("consultations", { success: true }); // link booking_id

    const result = await startConsultationDeposit("c1", "artist-1");

    expect(result.error).toBeUndefined();
    expect(result.bookingId).toBe("bk-new");

    const insertChain = sb.getChain("bookings", 1);
    const insertPayload = (insertChain.insert as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(insertPayload).toEqual(
      expect.objectContaining({ date: null, time: null, status: "pending_deposit", artist_id: "artist-1" })
    );

    const linkChain = sb.getChain("consultations", 2);
    const linkPayload = (linkChain.update as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(linkPayload).toEqual(expect.objectContaining({ booking_id: "bk-new" }));
    expect(linkPayload.status).toBeUndefined(); // status untouched — stays "quoted"
  });

  it("is idempotent — a second call reuses the existing provisional booking, no duplicate", async () => {
    sb.queueFrom("consultations", { ...CONSULT, status: "quoted", booking_id: "bk-existing" });
    const result = await startConsultationDeposit("c1", "artist-1");
    expect(result.error).toBeUndefined();
    expect(result.bookingId).toBe("bk-existing");
    expect(sb.fromCalls).not.toContain("bookings"); // no insert — reused, not duplicated
  });
});
