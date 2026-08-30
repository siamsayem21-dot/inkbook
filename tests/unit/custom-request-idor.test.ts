import { describe, it, expect, beforeEach, vi } from "vitest";
import { createSupabaseMock, type SupabaseMock } from "../mocks/supabase";

// Permanent regression lock for BUG-SEC-FULLQA-003 (found 2026-08-29, P1,
// confirmed live on production): the public, unauthenticated Custom Request
// form (app/book/[studio]/custom) trusted a client-supplied `artistId` with
// no check that it belonged to the target studio. A forged submission
// (studioId=Studio A, artistId=Studio B's real artist) wrote a cross-tenant
// custom_requests.artist_id AND emailed that unrelated Studio B artist the
// client's real PII. Fixed by verifying the artistId belongs to the target
// studio before using it for either the insert or the notification lookup —
// an unverified/foreign id degrades to null ("Any Artist"), never a hard
// reject, matching the existing UX for that field.
let sb: SupabaseMock;

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/file-validation", () => ({ validateImageFile: vi.fn() }));
vi.mock("@/lib/email", () => ({
  sendCustomRequestReceivedEmail: vi.fn(() => Promise.resolve()),
  sendCustomRequestClientConfirmationEmail: vi.fn(() => Promise.resolve()),
}));

import { createAdminClient } from "@/lib/supabase/admin";
import { sendCustomRequestReceivedEmail } from "@/lib/email";
import { submitCustomRequest } from "@/app/book/[studio]/custom/actions";

function formData(overrides: Record<string, string> = {}) {
  const fd = new FormData();
  const base = {
    studioId: "studio-a", studioSlug: "studio-a-slug", studioName: "Studio A",
    clientName: "Client Name", clientEmail: "client@example.com", clientPhone: "555-0100",
    style: "Traditional", placement: "Forearm", size: "Small", budgetRange: "$200-500",
    description: "A cool tattoo idea, at least twenty characters long.",
  };
  for (const [k, v] of Object.entries({ ...base, ...overrides })) fd.set(k, v);
  return fd;
}

beforeEach(() => {
  sb = createSupabaseMock();
  vi.mocked(createAdminClient).mockReturnValue(sb.client as unknown as ReturnType<typeof createAdminClient>);
  vi.mocked(sendCustomRequestReceivedEmail).mockClear();
});

describe("submitCustomRequest — cross-tenant artistId is never trusted (BUG-SEC-FULLQA-003)", () => {
  it("writes artist_id=null when the supplied artistId belongs to a DIFFERENT studio (forged/tampered submission)", async () => {
    sb.queueFrom("artists", null); // ownership check: no row matches id+studio_id together -> not found
    sb.queueFrom("custom_requests", { id: "req-1" }); // insert
    sb.queueFrom("studios", { owner_id: "owner-1" }); // notify: falls back to studio owner lookup

    const fd = formData({ artistId: "foreign-artist-from-studio-b" });
    const result = await submitCustomRequest(fd);

    expect(result.error).toBeUndefined();
    const insertChain = sb.getChain("custom_requests");
    expect(insertChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ studio_id: "studio-a", artist_id: null })
    );
    // The foreign artist is never notified — recipient resolution falls
    // back to the studio owner lookup, which the mock leaves un-found
    // (auth.admin.getUserById defaults to no user), so no email fires at
    // all. What matters here: it definitely never emails the wrong artist.
    expect(sendCustomRequestReceivedEmail).not.toHaveBeenCalled();
  });

  it("preserves a legitimate same-studio artistId — no regression to the real flow", async () => {
    sb.queueFrom("artists", { id: "real-artist-1" }); // ownership check: found, same studio
    sb.queueFrom("custom_requests", { id: "req-2" }); // insert
    sb.queueFrom("artists", { name: "Real Artist", email: "real-artist@studio-a.test" }); // notify lookup

    const fd = formData({ artistId: "real-artist-1" });
    const result = await submitCustomRequest(fd);

    expect(result.error).toBeUndefined();
    const insertChain = sb.getChain("custom_requests");
    expect(insertChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ studio_id: "studio-a", artist_id: "real-artist-1" })
    );
    expect(sendCustomRequestReceivedEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "real-artist@studio-a.test", artistName: "Real Artist" })
    );
  });

  it("treats a missing artistId as 'Any Artist' — falls back to notifying the studio owner", async () => {
    sb.queueFrom("custom_requests", { id: "req-3" }); // insert (no ownership check runs — artistId is empty)
    sb.queueFrom("studios", { owner_id: "owner-1" });

    const fd = formData(); // no artistId set at all
    const result = await submitCustomRequest(fd);

    expect(result.error).toBeUndefined();
    const insertChain = sb.getChain("custom_requests");
    expect(insertChain.insert).toHaveBeenCalledWith(expect.objectContaining({ artist_id: null }));
  });
});
