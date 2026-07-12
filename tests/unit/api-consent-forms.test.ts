import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { createSupabaseMock, type SupabaseMock } from "../mocks/supabase";

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/stripe/client", () => ({ getStripe: vi.fn() }));
vi.mock("@/lib/file-validation", () => ({ validateImageFile: vi.fn() }));

import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe/client";
import { validateImageFile } from "@/lib/file-validation";
import { POST } from "@/app/api/consent-forms/route";

let sb: SupabaseMock;

const idPhoto = new File(["fake-bytes"], "id.jpg", { type: "image/jpeg" });

function buildForm(overrides: Partial<Record<string, string | File>> = {}) {
  const fd = new FormData();
  const fields: Record<string, string | File> = {
    bookingId: "bk-1",
    fullName: "Alex Client",
    dob: "1990-01-01",
    signature: "data:image/png;base64,AAA",
    isMinor: "false",
    idPhoto,
    ...overrides,
  };
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    fd.append(key, value as string | File);
  }
  return fd;
}

function req(fd: FormData) {
  return new NextRequest("http://localhost/api/consent-forms", { method: "POST", body: fd });
}

beforeEach(() => {
  sb = createSupabaseMock();
  vi.mocked(createAdminClient).mockReturnValue(sb.client as unknown as ReturnType<typeof createAdminClient>);
  vi.mocked(validateImageFile).mockResolvedValue({ valid: true });
});

describe("POST /api/consent-forms", () => {
  it("400s when required fields are missing", async () => {
    const res = await POST(req(buildForm({ fullName: undefined })));
    expect(res.status).toBe(400);
  });

  it("415s when the ID photo fails validation", async () => {
    vi.mocked(validateImageFile).mockResolvedValue({ valid: false, error: "bad file" });
    const res = await POST(req(buildForm()));
    expect(res.status).toBe(415);
  });

  it("400s when isMinor is true but guardian info is missing", async () => {
    const res = await POST(req(buildForm({ isMinor: "true" })));
    expect(res.status).toBe(400);
  });

  it("404s when the booking does not exist", async () => {
    sb.queueFrom("bookings", null);
    const res = await POST(req(buildForm()));
    expect(res.status).toBe(404);
  });

  it("short-circuits with success when consent was already submitted", async () => {
    sb.queueFrom("bookings", { id: "bk-1", client_id: "c1", studio_id: "s1", status: "confirmed" });
    sb.queueFrom("consent_forms", { id: "existing-consent" }); // existingConsent lookup
    const res = await POST(req(buildForm()));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ success: true, bookingId: "bk-1" });
    // Must not proceed to check deposits/upload
    expect(sb.fromCalls).not.toContain("deposit_payments");
  });

  it("402s when no deposit record exists at all", async () => {
    sb.queueFrom("bookings", { id: "bk-1", client_id: "c1", studio_id: "s1", status: "pending_deposit" });
    sb.queueFrom("consent_forms", null); // no existing consent
    sb.queueFrom("deposit_payments", null); // no deposit_payments row
    sb.queueFrom("deposits", null); // no legacy deposit either
    const res = await POST(req(buildForm()));
    expect(res.status).toBe(402);
  });

  it("402s when deposit_payments is pending with no Stripe session to verify", async () => {
    sb.queueFrom("bookings", { id: "bk-1", client_id: "c1", studio_id: "s1", status: "pending_deposit" });
    sb.queueFrom("consent_forms", null);
    sb.queueFrom("deposit_payments", { payment_status: "pending", stripe_checkout_session_id: null });
    const res = await POST(req(buildForm()));
    expect(res.status).toBe(402);
  });

  it("402s when Stripe reports the checkout session as unpaid", async () => {
    sb.queueFrom("bookings", { id: "bk-1", client_id: "c1", studio_id: "s1", status: "pending_deposit" });
    sb.queueFrom("consent_forms", null);
    sb.queueFrom("deposit_payments", { payment_status: "pending", stripe_checkout_session_id: "cs_1" });
    vi.mocked(getStripe).mockReturnValue({
      checkout: { sessions: { retrieve: vi.fn(() => Promise.resolve({ payment_status: "unpaid" })) } },
    } as unknown as ReturnType<typeof getStripe>);
    const res = await POST(req(buildForm()));
    expect(res.status).toBe(402);
  });

  it("completes the full flow when the deposit is already paid", async () => {
    sb.queueFrom("bookings", { id: "bk-1", client_id: "c1", studio_id: "s1", status: "pending_deposit" });
    sb.queueFrom("consent_forms", null); // existingConsent lookup
    sb.queueFrom("deposit_payments", { payment_status: "paid", stripe_checkout_session_id: "cs_1" });
    sb.queueFrom("studios", { state: "CA" });
    sb.queueFrom("consent_forms", { success: true }); // insert
    sb.queueFrom("bookings", { success: true }); // confirm update

    const res = await POST(req(buildForm()));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ success: true, bookingId: "bk-1" });
    expect(sb.storageUpload).toHaveBeenCalled();
  });

  it("falls back to the legacy deposits table when no deposit_payments row exists", async () => {
    sb.queueFrom("bookings", { id: "bk-1", client_id: "c1", studio_id: "s1", status: "pending_deposit" });
    sb.queueFrom("consent_forms", null);
    sb.queueFrom("deposit_payments", null);
    sb.queueFrom("deposits", { status: "paid", stripe_checkout_session_id: "cs_legacy" });
    sb.queueFrom("studios", { state: "TX" });
    sb.queueFrom("consent_forms", { success: true });
    sb.queueFrom("bookings", { success: true });

    const res = await POST(req(buildForm()));
    expect(res.status).toBe(200);
  });

  it("503s when the ID photo upload fails", async () => {
    sb.queueFrom("bookings", { id: "bk-1", client_id: "c1", studio_id: "s1", status: "pending_deposit" });
    sb.queueFrom("consent_forms", null);
    sb.queueFrom("deposit_payments", { payment_status: "paid", stripe_checkout_session_id: "cs_1" });
    sb.queueFrom("studios", { state: "CA" });
    sb.storageUpload.mockResolvedValueOnce({ data: null, error: { message: "upload failed" } });

    const res = await POST(req(buildForm()));
    expect(res.status).toBe(503);
  });

  it("confirms the booking when it already has a date (classic flow, schedule already assigned)", async () => {
    sb.queueFrom("bookings", { id: "bk-1", client_id: "c1", studio_id: "s1", status: "pending_deposit", date: "2026-09-01" });
    sb.queueFrom("consent_forms", null);
    sb.queueFrom("deposit_payments", { payment_status: "paid", stripe_checkout_session_id: "cs_1" });
    sb.queueFrom("studios", { state: "CA" });
    sb.queueFrom("consent_forms", { success: true });
    sb.queueFrom("bookings", { success: true });

    const res = await POST(req(buildForm()));
    expect(res.status).toBe(200);

    const finalUpdate = sb.getChain("bookings", 2);
    const updateArg = (finalUpdate as { update: { mock: { calls: unknown[][] } } }).update.mock.calls[0][0] as Record<string, unknown>;
    expect(updateArg.status).toBe("confirmed");
  });

  it("does NOT confirm an awaiting_schedule booking (no date yet) after consent is signed — Phase C Feature 1 gate", async () => {
    sb.queueFrom("bookings", { id: "bk-1", client_id: "c1", studio_id: "s1", status: "awaiting_schedule", date: null });
    sb.queueFrom("consent_forms", null);
    sb.queueFrom("deposit_payments", { payment_status: "paid", stripe_checkout_session_id: "cs_1" });
    sb.queueFrom("studios", { state: "CA" });
    sb.queueFrom("consent_forms", { success: true });
    sb.queueFrom("bookings", { success: true });

    const res = await POST(req(buildForm()));
    expect(res.status).toBe(200);

    const finalUpdate = sb.getChain("bookings", 2);
    const updateArg = (finalUpdate as { update: { mock: { calls: unknown[][] } } }).update.mock.calls[0][0] as Record<string, unknown>;
    expect(updateArg.status).toBeUndefined();
    expect(updateArg.deposit_paid).toBe(true);
  });

  it("accepts a minor submission when guardian info is provided", async () => {
    sb.queueFrom("bookings", { id: "bk-1", client_id: "c1", studio_id: "s1", status: "pending_deposit" });
    sb.queueFrom("consent_forms", null);
    sb.queueFrom("deposit_payments", { payment_status: "paid", stripe_checkout_session_id: "cs_1" });
    sb.queueFrom("studios", { state: "CA" });
    sb.queueFrom("consent_forms", { success: true });
    sb.queueFrom("bookings", { success: true });

    const res = await POST(
      req(buildForm({ isMinor: "true", guardianName: "Pat Guardian", guardianSignature: "sig" }))
    );
    expect(res.status).toBe(200);
  });
});
