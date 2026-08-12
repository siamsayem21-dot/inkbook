import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { createSupabaseMock, type SupabaseMock } from "../mocks/supabase";

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/stripe/client", () => ({ getStripe: vi.fn() }));
vi.mock("@/lib/file-validation", () => ({ validateImageFile: vi.fn() }));

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/client";
import { validateImageFile } from "@/lib/file-validation";
import { GET, POST } from "@/app/api/consent-forms/route";

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

// Each call defaults to its own IP so the shared rate-limit store (a
// module-level singleton in lib/rate-limit.ts) doesn't let one test's
// requests count against another's budget.
let ipCounter = 0;
function req(fd: FormData, ip = `10.0.2.${++ipCounter}`) {
  return new NextRequest("http://localhost/api/consent-forms", {
    method: "POST",
    body: fd,
    headers: { "x-forwarded-for": ip },
  });
}

beforeEach(() => {
  sb = createSupabaseMock();
  vi.mocked(createAdminClient).mockReturnValue(sb.client as unknown as ReturnType<typeof createAdminClient>);
  vi.mocked(createClient).mockReturnValue(sb.client as unknown as ReturnType<typeof createClient>);
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

describe("POST /api/consent-forms — rate limiting", () => {
  it("blocks the 6th request within the window from the same IP", async () => {
    const ip = "203.0.113.30";
    for (let i = 0; i < 5; i++) {
      // missing fullName -> 400, but under the rate limit
      const res = await POST(req(buildForm({ fullName: undefined }), ip));
      expect(res.status).toBe(400);
    }
    const blocked = await POST(req(buildForm({ fullName: undefined }), ip));
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("Retry-After")).toBeTruthy();
  });

  it("never reaches Supabase once a request is rate-limited", async () => {
    const ip = "203.0.113.31";
    for (let i = 0; i < 5; i++) await POST(req(buildForm({ fullName: undefined }), ip));
    sb.fromCalls.length = 0;

    const res = await POST(req(buildForm(), ip));
    expect(res.status).toBe(429);
    expect(sb.fromCalls).toHaveLength(0);
  });

  it("tracks a different IP independently of one that's already at its limit", async () => {
    const exhaustedIp = "203.0.113.32";
    for (let i = 0; i < 5; i++) await POST(req(buildForm({ fullName: undefined }), exhaustedIp));

    const res = await POST(req(buildForm({ fullName: undefined }), "203.0.113.33"));
    expect(res.status).toBe(400); // missing fields, not rate-limited
  });
});

// ── GET /api/consent-forms — authorization ──────────────────────────────────
// Regression coverage for the fix closing the cross-studio data-exposure gap:
// the endpoint used to return any bookingId's consent form (signature,
// guardian info, ID-photo path) to any authenticated user. Authorization is
// now derived entirely server-side from the caller's identity + the real
// booking/studio/artist relationships — never from client-supplied input.
const BOOKING = { id: "bk-1", studio_id: "studio-1", artist_id: "artist-1" };
const CONSENT = {
  id: "consent-1", booking_id: "bk-1", client_id: "client-1",
  client_signature: "Alex Client", guardian_name: null, guardian_signature: null,
  id_photo_url: "client-1/bk-1.jpg", is_minor: false, state_template: "CA",
  signed_at: "2026-01-01T00:00:00Z",
};

function getReq(bookingId: string | null) {
  const url = bookingId
    ? `http://localhost/api/consent-forms?bookingId=${bookingId}`
    : "http://localhost/api/consent-forms";
  return new NextRequest(url);
}

function authAs(userId: string) {
  sb.getUser.mockResolvedValue({ data: { user: { id: userId, email: `${userId}@example.com` } as never }, error: null });
}

describe("GET /api/consent-forms — authorization", () => {
  it("400s when bookingId is missing", async () => {
    authAs("owner-1");
    const res = await GET(getReq(null));
    expect(res.status).toBe(400);
  });

  it("401s when there is no authenticated session", async () => {
    // sb.getUser defaults to { user: null } — no auth wired for this test.
    const res = await GET(getReq("bk-1"));
    expect(res.status).toBe(401);
  });

  it("404s when the booking does not exist", async () => {
    authAs("owner-1");
    sb.queueFrom("bookings", null);
    const res = await GET(getReq("bk-1"));
    expect(res.status).toBe(404);
  });

  it("allows the owner of the booking's studio and returns the consent form", async () => {
    authAs("owner-1");
    sb.queueFrom("bookings", BOOKING);
    sb.queueFrom("studios", { id: "studio-1" }); // owner_id=owner-1 AND id=studio-1 matches
    sb.queueFrom("consent_forms", CONSENT);

    const res = await GET(getReq("bk-1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.consentForm).toEqual(CONSENT);
  });

  it("blocks an owner of a DIFFERENT studio from another studio's booking (cross-studio, no bookingId guessing)", async () => {
    authAs("owner-2"); // owns some other studio, not studio-1
    sb.queueFrom("bookings", BOOKING);
    sb.queueFrom("studios", null);  // owner-2 does not own studio-1
    sb.queueFrom("artists", null);  // owner-2 is not the assigned artist either
    const res = await GET(getReq("bk-1"));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.consentForm).toBeUndefined();
    expect(JSON.stringify(body)).not.toMatch(/signature|guardian|photo/i);
  });

  it("blocks a completely unrelated authenticated user (not owner, not the assigned artist)", async () => {
    authAs("random-user");
    sb.queueFrom("bookings", BOOKING);
    sb.queueFrom("studios", null);
    sb.queueFrom("artists", null);
    const res = await GET(getReq("bk-1"));
    expect(res.status).toBe(404);
  });

  it("allows the artist assigned to the booking", async () => {
    authAs("artist-user-1");
    sb.queueFrom("bookings", BOOKING);
    sb.queueFrom("studios", null); // not the owner
    sb.queueFrom("artists", { id: "artist-1" }); // user_id=artist-user-1 AND id=booking.artist_id (artist-1) matches
    sb.queueFrom("consent_forms", CONSENT);

    const res = await GET(getReq("bk-1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.consentForm).toEqual(CONSENT);
  });

  it("blocks a different artist at the SAME studio who isn't assigned to this booking (tighter than studio-wide, matches RLS)", async () => {
    authAs("artist-user-2");
    sb.queueFrom("bookings", BOOKING); // assigned artist is artist-1, not this artist
    sb.queueFrom("studios", null);
    sb.queueFrom("artists", null); // this artist's id != booking.artist_id, so no match
    const res = await GET(getReq("bk-1"));
    expect(res.status).toBe(404);
  });

  it("blocks a client account — no client SELECT policy exists for consent_forms", async () => {
    authAs("client-account-1");
    sb.queueFrom("bookings", BOOKING);
    sb.queueFrom("studios", null);
    sb.queueFrom("artists", null);
    const res = await GET(getReq("bk-1"));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.consentForm).toBeUndefined();
  });

  it("never queries consent_forms at all once authorization fails", async () => {
    authAs("random-user");
    sb.queueFrom("bookings", BOOKING);
    sb.queueFrom("studios", null);
    sb.queueFrom("artists", null);
    await GET(getReq("bk-1"));
    expect(sb.fromCalls).not.toContain("consent_forms");
  });
});
