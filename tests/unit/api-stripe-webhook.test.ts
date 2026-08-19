import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { createSupabaseMock, type SupabaseMock } from "../mocks/supabase";

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/stripe/client", () => ({ getStripe: vi.fn() }));
vi.mock("@/lib/twilio/client", () => ({
  trySendSms: vi.fn(() => Promise.resolve()),
  buildSmsMessage: vi.fn(() => "sms body"),
}));

import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe/client";
import { trySendSms } from "@/lib/twilio/client";
import { POST } from "@/app/api/stripe/webhook/route";

let sb: SupabaseMock;

function mockConstructEvent(event: unknown) {
  vi.mocked(getStripe).mockReturnValue({
    webhooks: { constructEvent: vi.fn(() => event) },
  } as unknown as ReturnType<typeof getStripe>);
}

function makeRequest(body: string, withSignature = true) {
  return new NextRequest("http://localhost/api/stripe/webhook", {
    method: "POST",
    body,
    headers: withSignature ? { "stripe-signature": "t=1,v1=fake" } : {},
  });
}

beforeEach(() => {
  sb = createSupabaseMock();
  vi.mocked(createAdminClient).mockReturnValue(sb.client as unknown as ReturnType<typeof createAdminClient>);
  vi.mocked(trySendSms).mockClear();
});

describe("POST /api/stripe/webhook — signature handling", () => {
  it("400s when the stripe-signature header is missing", async () => {
    const res = await POST(makeRequest("{}", false));
    expect(res.status).toBe(400);
  });

  it("400s when signature verification throws", async () => {
    vi.mocked(getStripe).mockReturnValue({
      webhooks: {
        constructEvent: vi.fn(() => {
          throw new Error("bad sig");
        }),
      },
    } as unknown as ReturnType<typeof getStripe>);
    const res = await POST(makeRequest("{}"));
    expect(res.status).toBe(400);
  });

  it("acknowledges (200) unrecognized event types without touching the DB", async () => {
    mockConstructEvent({ type: "customer.created", data: { object: {} } });
    const res = await POST(makeRequest("{}"));
    expect(res.status).toBe(200);
    expect(sb.fromCalls).toHaveLength(0);
  });

  it("a failed/cancelled/expired checkout never advances a consultation to Deposit Paid", async () => {
    // Stripe only ever sends checkout.session.completed for a SUCCESSFUL
    // payment — an abandoned or expired checkout fires a different event type
    // (e.g. checkout.session.expired) if it fires anything at all, which this
    // handler doesn't recognize and must leave completely untouched.
    mockConstructEvent({ type: "checkout.session.expired", data: { object: { id: "cs_1", metadata: {} } } });
    const res = await POST(makeRequest("{}"));
    expect(res.status).toBe(200);
    expect(sb.fromCalls).toHaveLength(0);
  });

  it("acknowledges (200) checkout.session.completed with no recognised metadata", async () => {
    mockConstructEvent({
      type: "checkout.session.completed",
      data: { object: { id: "cs_1", metadata: {} } },
      created: 1700000000,
    });
    const res = await POST(makeRequest("{}"));
    expect(res.status).toBe(200);
  });
});

describe("POST /api/stripe/webhook — Branch A (deposit_payments)", () => {
  function event(metadata: Record<string, string>) {
    return {
      type: "checkout.session.completed",
      data: { object: { id: "cs_A", payment_intent: "pi_A", metadata } },
      created: 1700000000,
    };
  }

  it("acknowledges without side effects when no deposit_payments row is found", async () => {
    mockConstructEvent(event({ depositPaymentId: "dp_1" }));
    sb.queueFrom("deposit_payments", []);
    const res = await POST(makeRequest("{}"));
    expect(res.status).toBe(200);
    expect(sb.fromCalls).not.toContain("bookings");
  });

  it("is idempotent — already-paid deposit_payments row is skipped", async () => {
    mockConstructEvent(event({ depositPaymentId: "dp_1" }));
    sb.queueFrom("deposit_payments", [{ id: "dp_1", booking_id: "bk_1", payment_status: "paid" }]);
    const res = await POST(makeRequest("{}"));
    expect(res.status).toBe(200);
    // Must not proceed to update bookings for an already-processed payment
    expect(sb.fromCalls).not.toContain("bookings");
  });

  it("confirms the booking and sends SMS on a fresh paid deposit", async () => {
    mockConstructEvent(event({ depositPaymentId: "dp_1" }));
    sb.queueFrom("deposit_payments", [{ id: "dp_1", booking_id: "bk_1", payment_status: "pending" }]); // lookup
    sb.queueFrom("deposit_payments", ok()); // update -> paid
    sb.queueFrom("bookings", { date: "2026-08-01" }); // pre-update schedule check -> hasSchedule = true
    sb.queueFrom("bookings", ok()); // update -> confirmed
    sb.queueFrom("consultations", { id: "consult-1", status: "quoted" }); // current-status read
    sb.queueFrom("consultations", ok()); // update -> deposit_paid
    sb.queueFrom("bookings", {
      client_id: "client-1", artist_id: "artist-1", studio_id: "studio-1",
      date: "2026-08-01", time: "10:00:00", deposit_amount_cents: 5000,
    }); // re-fetch bookingRow
    sb.queueFrom("clients", { full_name: "Alex", email: "alex@example.com", phone: "5551234567" });
    sb.queueFrom("artists", { name: "Jane Artist" });
    sb.queueFrom("studios", { name: "Ink & Iron", address: "123 Main St" });

    const res = await POST(makeRequest("{}"));
    expect(res.status).toBe(200);
    expect(trySendSms).toHaveBeenCalledWith("5551234567", "sms body");
  });

  it("500s when the deposit_payments lookup errors", async () => {
    mockConstructEvent(event({ depositPaymentId: "dp_1" }));
    sb.queueFrom("deposit_payments", null, { message: "db down" });
    const res = await POST(makeRequest("{}"));
    expect(res.status).toBe(500);
  });

  it("lands an unscheduled booking (no date/time) in awaiting_schedule and skips confirmation notifications", async () => {
    // Client self-serve deposit flow (app/portal/[studio]/projects/[id]/actions.ts
    // continueToDeposit()) creates the booking with no date/time — the owner
    // schedules it afterward — so paying the deposit must NOT jump straight to
    // "confirmed", and there's no real date/time yet to put in a confirmation SMS/email.
    mockConstructEvent(event({ depositPaymentId: "dp_1" }));
    sb.queueFrom("deposit_payments", [{ id: "dp_1", booking_id: "bk_1", payment_status: "pending" }]); // lookup
    sb.queueFrom("deposit_payments", ok()); // update -> paid
    sb.queueFrom("bookings", { date: null }); // pre-update schedule check -> hasSchedule = false
    sb.queueFrom("bookings", ok()); // update -> awaiting_schedule
    sb.queueFrom("consultations", { id: "consult-1", status: "quoted" }); // current-status read
    sb.queueFrom("consultations", ok()); // update -> deposit_paid

    const res = await POST(makeRequest("{}"));
    expect(res.status).toBe(200);
    expect(sb.getChain("bookings", 2).update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "awaiting_schedule" })
    );
    // No date/time to notify with — must not contact anyone.
    expect(trySendSms).not.toHaveBeenCalled();
  });

  it("advances a linked consultation from Quoted to Deposit Paid (the normal, post-fix case)", async () => {
    mockConstructEvent(event({ depositPaymentId: "dp_1" }));
    sb.queueFrom("deposit_payments", [{ id: "dp_1", booking_id: "bk_1", payment_status: "pending" }]);
    sb.queueFrom("deposit_payments", ok());
    sb.queueFrom("bookings", { date: "2026-08-01" });
    sb.queueFrom("bookings", ok());
    sb.queueFrom("consultations", { id: "consult-1", status: "quoted" }); // current-status read
    sb.queueFrom("consultations", ok()); // update -> deposit_paid
    sb.queueFrom("bookings", {
      client_id: "client-1", artist_id: "artist-1", studio_id: "studio-1",
      date: "2026-08-01", time: "10:00:00", deposit_amount_cents: 5000,
    });
    sb.queueFrom("clients", { full_name: "Alex", email: "alex@example.com", phone: "5551234567" });
    sb.queueFrom("artists", { name: "Jane Artist" });
    sb.queueFrom("studios", { name: "Ink & Iron", address: "123 Main St" });

    await POST(makeRequest("{}"));

    const updateChain = sb.getChain("consultations", 2);
    expect(updateChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "deposit_paid" })
    );
  });

  it("never regresses an already-Booked consultation back to Deposit Paid (the reported bug)", async () => {
    mockConstructEvent(event({ depositPaymentId: "dp_1" }));
    sb.queueFrom("deposit_payments", [{ id: "dp_1", booking_id: "bk_1", payment_status: "pending" }]);
    sb.queueFrom("deposit_payments", ok());
    sb.queueFrom("bookings", { date: "2026-08-01" });
    sb.queueFrom("bookings", ok());
    // Simulates a consultation that (whether via legacy data or any other path)
    // already reached "booked" — a real Deposit Paid webhook event for its
    // booking must NOT drag it back to "deposit_paid".
    sb.queueFrom("consultations", { id: "consult-1", status: "booked" });
    sb.queueFrom("bookings", {
      client_id: "client-1", artist_id: "artist-1", studio_id: "studio-1",
      date: "2026-08-01", time: "10:00:00", deposit_amount_cents: 5000,
    });
    sb.queueFrom("clients", { full_name: "Alex", email: "alex@example.com", phone: "5551234567" });
    sb.queueFrom("artists", { name: "Jane Artist" });
    sb.queueFrom("studios", { name: "Ink & Iron", address: "123 Main St" });

    const res = await POST(makeRequest("{}"));

    expect(res.status).toBe(200);
    // Only the status-check read happened — no second "consultations" call
    // (the update) was made at all.
    expect(sb.fromCalls.filter((t) => t === "consultations")).toHaveLength(1);
    // The payment itself still fully processed — deposit_payments and bookings
    // both got their updates regardless of the consultation being skipped.
    expect(sb.getChain("deposit_payments", 2).update).toHaveBeenCalledWith(
      expect.objectContaining({ payment_status: "paid" })
    );
    expect(sb.getChain("bookings", 2).update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "confirmed", deposit_paid: true })
    );
  });

  it("is a no-op for a booking with no linked consultation (the plain client-facing booking case)", async () => {
    mockConstructEvent(event({ depositPaymentId: "dp_1" }));
    sb.queueFrom("deposit_payments", [{ id: "dp_1", booking_id: "bk_1", payment_status: "pending" }]);
    sb.queueFrom("deposit_payments", ok());
    sb.queueFrom("bookings", { date: "2026-08-01" });
    sb.queueFrom("bookings", ok());
    sb.queueFrom("consultations", null); // no consultation linked to this booking
    sb.queueFrom("bookings", {
      client_id: "client-1", artist_id: "artist-1", studio_id: "studio-1",
      date: "2026-08-01", time: "10:00:00", deposit_amount_cents: 5000,
    });
    sb.queueFrom("clients", { full_name: "Alex", email: "alex@example.com", phone: "5551234567" });
    sb.queueFrom("artists", { name: "Jane Artist" });
    sb.queueFrom("studios", { name: "Ink & Iron", address: "123 Main St" });

    const res = await POST(makeRequest("{}"));

    expect(res.status).toBe(200);
    expect(sb.fromCalls.filter((t) => t === "consultations")).toHaveLength(1); // read only, no update
  });
});

describe("POST /api/stripe/webhook — Branch A, remainder payment_type (Phase C Feature 2)", () => {
  function event(metadata: Record<string, string>) {
    return {
      type: "checkout.session.completed",
      data: { object: { id: "cs_R", payment_intent: "pi_R", metadata } },
      created: 1700000000,
    };
  }

  it("marks remainder_collected without touching booking status, and skips deposit-confirmation notifications", async () => {
    mockConstructEvent(event({ depositPaymentId: "dp_r1" }));
    sb.queueFrom("deposit_payments", [
      { id: "dp_r1", booking_id: "bk_1", payment_status: "pending", payment_type: "remainder" },
    ]); // lookup
    sb.queueFrom("deposit_payments", ok()); // update -> paid
    sb.queueFrom("bookings", ok()); // update -> remainder_collected/remainder_collected_at
    sb.queueFrom("bookings", {
      client_id: "client-1", studio_id: "studio-1",
      deposit_amount_cents: 5000, total_amount_cents: 20000, quote_amount_cents: null,
    }); // re-fetch for notification
    sb.queueFrom("clients", { full_name: "Alex", email: "alex@example.com", phone: "5551234567" });
    sb.queueFrom("studios", { name: "Ink & Iron" });

    const res = await POST(makeRequest("{}"));
    expect(res.status).toBe(200);

    // The remainder-marking update must be exactly remainder_collected fields —
    // never status/deposit_paid, which belong to the deposit lifecycle only.
    const bookingUpdateArg = (sb.getChain("bookings", 1) as { update: { mock: { calls: unknown[][] } } })
      .update.mock.calls[0][0] as Record<string, unknown>;
    expect(bookingUpdateArg).toEqual(
      expect.objectContaining({ remainder_collected: true })
    );
    expect(bookingUpdateArg.status).toBeUndefined();
    expect(bookingUpdateArg.deposit_paid).toBeUndefined();

    expect(trySendSms).toHaveBeenCalledWith("5551234567", "sms body");
    // Must not run the "no date -> awaiting_schedule" schedule-check query at
    // all — that's deposit-only logic this branch must skip entirely.
    expect(sb.fromCalls.filter((t) => t === "consultations")).toHaveLength(0);
  });

  it("is idempotent — already-paid remainder row is skipped", async () => {
    mockConstructEvent(event({ depositPaymentId: "dp_r1" }));
    sb.queueFrom("deposit_payments", [
      { id: "dp_r1", booking_id: "bk_1", payment_status: "paid", payment_type: "remainder" },
    ]);
    const res = await POST(makeRequest("{}"));
    expect(res.status).toBe(200);
    expect(sb.fromCalls).not.toContain("bookings");
  });
});

describe("POST /api/stripe/webhook — Branch B (custom request deposit)", () => {
  function event(customRequestId: string) {
    return {
      type: "checkout.session.completed",
      data: { object: { id: "cs_B", payment_intent: "pi_B", metadata: { customRequestId } } },
      created: 1700000000,
    };
  }

  it("acknowledges when the custom request no longer exists", async () => {
    mockConstructEvent(event("cr_1"));
    sb.queueFrom("custom_requests", null);
    const res = await POST(makeRequest("{}"));
    expect(res.status).toBe(200);
    expect(sb.fromCalls).not.toContain("studios");
  });

  it("fast-path skips (no RPC call) when status is not 'quoted'", async () => {
    mockConstructEvent(event("cr_1"));
    sb.queueFrom("custom_requests", { status: "accepted", studio_id: "s1" });
    const res = await POST(makeRequest("{}"));
    expect(res.status).toBe(200);
    expect(sb.rpc).not.toHaveBeenCalled();
  });

  it("500s when the RPC errors", async () => {
    mockConstructEvent(event("cr_1"));
    sb.queueFrom("custom_requests", { status: "quoted", studio_id: "s1" });
    sb.queueRpc(null, { message: "rpc failed" });
    const res = await POST(makeRequest("{}"));
    expect(res.status).toBe(500);
  });

  it.each(["already_processed", "conflict", "not_found", "missing_artist"])(
    "acknowledges without notifying on RPC outcome '%s'",
    async (outcome) => {
      mockConstructEvent(event("cr_1"));
      sb.queueFrom("custom_requests", { status: "quoted", studio_id: "s1" });
      sb.queueRpc({ outcome });
      const res = await POST(makeRequest("{}"));
      expect(res.status).toBe(200);
      expect(trySendSms).not.toHaveBeenCalled();
    }
  );

  it("sends client + owner notifications on RPC success", async () => {
    mockConstructEvent(event("cr_1"));
    sb.queueFrom("custom_requests", {
      studio_id: "studio-1", artist_id: "artist-1",
      client_name: "Alex", client_email: "alex@example.com", client_phone: "5551234567",
      status: "quoted", deposit_amount: 150, quote_amount: 600,
    });
    sb.queueRpc({ outcome: "success", booking_id: "bk_new" });
    sb.queueFrom("studios", { name: "Ink & Iron", subdomain: "ink-iron", owner_id: "owner-1" });
    sb.getUserById.mockResolvedValueOnce({ data: { user: { email: "owner@example.com" } }, error: null });

    const res = await POST(makeRequest("{}"));
    expect(res.status).toBe(200);
    expect(trySendSms).toHaveBeenCalledWith("5551234567", expect.stringContaining("deposit"));
  });
});

describe("POST /api/stripe/webhook — Branch C (legacy booking deposit)", () => {
  it("confirms the legacy booking and deposit records", async () => {
    mockConstructEvent({
      type: "checkout.session.completed",
      data: { object: { id: "cs_C", payment_intent: "pi_C", metadata: { bookingId: "bk_legacy" } } },
      created: 1700000000,
    });
    sb.queueFrom("bookings", { deposit_paid: false }); // idempotency check — not yet paid
    sb.queueFrom("bookings", ok()); // update confirmed
    sb.queueFrom("deposits", ok()); // update paid
    sb.queueFrom("bookings", {
      client_id: "client-1", artist_id: "artist-1", studio_id: "studio-1",
      date: "2026-08-01", time: "10:00:00", deposit_amount_cents: 5000,
    }); // re-fetch
    sb.queueFrom("clients", { full_name: "Alex", email: "alex@example.com", phone: "5551234567" });
    sb.queueFrom("artists", { name: "Jane Artist" });
    sb.queueFrom("studios", { name: "Ink & Iron", address: null });

    const res = await POST(makeRequest("{}"));
    expect(res.status).toBe(200);
    expect(trySendSms).toHaveBeenCalledWith("5551234567", "sms body");
  });

  it("is idempotent — a retried event for an already-confirmed booking is skipped without re-notifying", async () => {
    mockConstructEvent({
      type: "checkout.session.completed",
      data: { object: { id: "cs_C", payment_intent: "pi_C", metadata: { bookingId: "bk_legacy" } } },
      created: 1700000000,
    });
    sb.queueFrom("bookings", { deposit_paid: true }); // idempotency check — already processed

    const res = await POST(makeRequest("{}"));
    expect(res.status).toBe(200);
    expect(sb.fromCalls).not.toContain("deposits");
    expect(sb.fromCalls).not.toContain("consultations");
    expect(trySendSms).not.toHaveBeenCalled();
  });

  // ── Consultation-awareness fix (2026-08-19, see TASKS.md NEEDS_SIAM) ──────
  // Branch C predates the AI consultation feature. A booking created via
  // ConsultationDetail.tsx's "Generate Deposit Link" already has
  // consultations.booking_id set (by startConsultationDeposit()) before this
  // webhook ever fires — so on payment, Branch C should also advance that
  // consultation's status to "deposit_paid", the same way Branch B already
  // does for custom_requests.
  it("advances a linked consultation from quoted to deposit_paid", async () => {
    mockConstructEvent({
      type: "checkout.session.completed",
      data: { object: { id: "cs_C", payment_intent: "pi_C", metadata: { bookingId: "bk_legacy" } } },
      created: 1700000000,
    });
    sb.queueFrom("bookings", { deposit_paid: false }); // idempotency check
    sb.queueFrom("bookings", ok()); // update confirmed
    sb.queueFrom("deposits", ok()); // update paid
    sb.queueFrom("consultations", ok()); // update deposit_paid
    sb.queueFrom("bookings", {
      client_id: "client-1", artist_id: "artist-1", studio_id: "studio-1",
      date: "2026-08-01", time: "10:00:00", deposit_amount_cents: 5000,
    }); // re-fetch
    sb.queueFrom("clients", { full_name: "Alex", email: "alex@example.com", phone: "5551234567" });
    sb.queueFrom("artists", { name: "Jane Artist" });
    sb.queueFrom("studios", { name: "Ink & Iron", address: null });

    const res = await POST(makeRequest("{}"));
    expect(res.status).toBe(200);

    const chain = sb.getChain("consultations");
    expect(chain.update).toHaveBeenCalledWith(expect.objectContaining({ status: "deposit_paid" }));
    expect(chain.eq).toHaveBeenCalledWith("booking_id", "bk_legacy");
    expect(chain.eq).toHaveBeenCalledWith("status", "quoted");
  });

  it("does not error when the booking has no linked consultation (classic BookingForm flow)", async () => {
    mockConstructEvent({
      type: "checkout.session.completed",
      data: { object: { id: "cs_C", payment_intent: "pi_C", metadata: { bookingId: "bk_classic" } } },
      created: 1700000000,
    });
    sb.queueFrom("bookings", { deposit_paid: false });
    sb.queueFrom("bookings", ok());
    sb.queueFrom("deposits", ok());
    // No consultations row queued — mock defaults to { data: null, error: null },
    // matching zero matching rows in production (the .eq("status", "quoted")
    // filter matches nothing for a non-consultation booking).
    sb.queueFrom("bookings", {
      client_id: "client-1", artist_id: "artist-1", studio_id: "studio-1",
      date: "2026-08-01", time: "10:00:00", deposit_amount_cents: 5000,
    });
    sb.queueFrom("clients", { full_name: "Alex", email: "alex@example.com", phone: "5551234567" });
    sb.queueFrom("artists", { name: "Jane Artist" });
    sb.queueFrom("studios", { name: "Ink & Iron", address: null });

    const res = await POST(makeRequest("{}"));
    expect(res.status).toBe(200);
  });

  it("logs but does not fail the request if the consultation update itself errors", async () => {
    mockConstructEvent({
      type: "checkout.session.completed",
      data: { object: { id: "cs_C", payment_intent: "pi_C", metadata: { bookingId: "bk_legacy" } } },
      created: 1700000000,
    });
    sb.queueFrom("bookings", { deposit_paid: false });
    sb.queueFrom("bookings", ok());
    sb.queueFrom("deposits", ok());
    sb.queueFrom("consultations", null, { message: "transient db error" });
    sb.queueFrom("bookings", {
      client_id: "client-1", artist_id: "artist-1", studio_id: "studio-1",
      date: "2026-08-01", time: "10:00:00", deposit_amount_cents: 5000,
    });
    sb.queueFrom("clients", { full_name: "Alex", email: "alex@example.com", phone: "5551234567" });
    sb.queueFrom("artists", { name: "Jane Artist" });
    sb.queueFrom("studios", { name: "Ink & Iron", address: null });

    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await POST(makeRequest("{}"));
    expect(res.status).toBe(200);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining("consultation status update failed"),
      expect.anything()
    );
    consoleErrorSpy.mockRestore();
  });
});

function ok() {
  return { success: true };
}
