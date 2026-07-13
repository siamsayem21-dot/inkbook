import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { createSupabaseMock, type SupabaseMock } from "../mocks/supabase";

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));

import { createAdminClient } from "@/lib/supabase/admin";
import { POST } from "@/app/api/waitlist/route";

const ARTIST = { id: "artist-1", studio_id: "studio-1" };

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/waitlist", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

const VALID_BODY = {
  artistId: ARTIST.id,
  clientName: "Alex Client",
  clientEmail: "alex@example.com",
  clientPhone: "5551234567",
  style: "Traditional",
};

let sb: SupabaseMock;

beforeEach(() => {
  sb = createSupabaseMock();
  vi.mocked(createAdminClient).mockReturnValue(sb.client as unknown as ReturnType<typeof createAdminClient>);
});

describe("POST /api/waitlist", () => {
  it("400s when required fields are missing", async () => {
    const res = await POST(makeRequest({ artistId: "x" }));
    expect(res.status).toBe(400);
  });

  it("404s when the artist does not exist", async () => {
    sb.queueFrom("artists", null);
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(404);
  });

  it("joins the waitlist for a new client", async () => {
    sb.queueFrom("artists", ARTIST);
    sb.queueFrom("clients", null); // existingClient lookup miss
    sb.queueFrom("clients", { id: "new-client-1" }); // insert new client
    sb.queueFrom("waitlist", null); // existingEntry pre-check
    sb.queueFrom("waitlist", { success: true }); // insert

    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);

    const insertArg = (sb.getChain("waitlist", 2) as { insert: { mock: { calls: unknown[][] } } })
      .insert.mock.calls[0][0] as Record<string, unknown>;
    expect(insertArg).toEqual(
      expect.objectContaining({ studio_id: "studio-1", artist_id: "artist-1", client_id: "new-client-1", preferred_style: "Traditional" })
    );
  });

  it("reports alreadyOnWaitlist without erroring when the entry already exists (pre-check)", async () => {
    sb.queueFrom("artists", ARTIST);
    sb.queueFrom("clients", { id: "existing-client-1" });
    sb.queueFrom("waitlist", { id: "existing-entry-1" }); // existingEntry pre-check hit

    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.alreadyOnWaitlist).toBe(true);
  });

  it("reports alreadyOnWaitlist when the unique constraint catches a race", async () => {
    sb.queueFrom("artists", ARTIST);
    sb.queueFrom("clients", { id: "existing-client-1" });
    sb.queueFrom("waitlist", null); // pre-check found nothing
    sb.queueFrom("waitlist", null, { code: "23505", message: "duplicate key" }); // insert races and fails

    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.alreadyOnWaitlist).toBe(true);
  });
});
