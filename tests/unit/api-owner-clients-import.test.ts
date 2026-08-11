import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { createSupabaseMock, type SupabaseMock } from "../mocks/supabase";

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/auth/config", () => ({ getStudioId: vi.fn() }));

import { createAdminClient } from "@/lib/supabase/admin";
import { getStudioId } from "@/lib/auth/config";
import { POST } from "@/app/api/owner/clients/import/route";

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/owner/clients/import", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

let sb: SupabaseMock;

beforeEach(() => {
  sb = createSupabaseMock();
  vi.mocked(createAdminClient).mockReturnValue(sb.client as unknown as ReturnType<typeof createAdminClient>);
  vi.mocked(getStudioId).mockResolvedValue("studio-1");
});

describe("POST /api/owner/clients/import", () => {
  it("401s when there is no resolvable studio", async () => {
    vi.mocked(getStudioId).mockResolvedValue(null);
    const res = await POST(makeRequest({ rows: [{ name: "A", email: "a@test.com", phone: "555" }] }));
    expect(res.status).toBe(401);
  });

  it("imports a valid row with no existing clients", async () => {
    sb.queueFrom("clients", []); // existing-emails lookup
    sb.queueFrom("clients", [{ id: "new-1" }]); // insert

    const res = await POST(makeRequest({
      rows: [{ name: "Alex Client", email: "Alex@Example.com", phone: "5551234567" }],
    }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ imported: 1, skipped: 0, duplicates: 0 });

    const insertArg = (sb.getChain("clients", 2) as { insert: { mock: { calls: unknown[][] } } })
      .insert.mock.calls[0][0] as Record<string, unknown>[];
    expect(insertArg[0]).toEqual({
      studio_id: "studio-1",
      full_name: "Alex Client",
      email: "alex@example.com", // lowercased
      phone: "5551234567",
    });
  });

  it("skips a row whose email already exists for this studio (no insert call)", async () => {
    sb.queueFrom("clients", [{ email: "existing@test.com" }]); // existing-emails lookup

    const res = await POST(makeRequest({
      rows: [{ name: "Dup Client", email: "existing@test.com", phone: "5550000000" }],
    }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ imported: 0, skipped: 0, duplicates: 1 });
    expect(sb.fromCalls.filter((t) => t === "clients")).toHaveLength(1); // no insert — dedup short-circuits before any write
  });

  it("dedupes repeated rows within the same CSV batch (only one insert)", async () => {
    sb.queueFrom("clients", []); // existing-emails lookup
    sb.queueFrom("clients", [{ id: "new-1" }]); // insert

    const res = await POST(makeRequest({
      rows: [
        { name: "Same Client", email: "same@test.com", phone: "5551112222" },
        { name: "Same Client Again", email: "same@test.com", phone: "5551112222" },
      ],
    }));
    const body = await res.json();
    expect(body).toEqual({ imported: 1, skipped: 0, duplicates: 1 });

    const insertArg = (sb.getChain("clients", 2) as { insert: { mock: { calls: unknown[][] } } })
      .insert.mock.calls[0][0] as Record<string, unknown>[];
    expect(insertArg).toHaveLength(1);
  });

  it("skips malformed rows missing required fields, still imports valid rows", async () => {
    sb.queueFrom("clients", []); // existing-emails lookup
    sb.queueFrom("clients", [{ id: "new-1" }]); // insert

    const res = await POST(makeRequest({
      rows: [
        { name: "No Email", email: "", phone: "5550008888" },
        { name: "Complete Row", email: "complete@test.com", phone: "5550009999" },
      ],
    }));
    const body = await res.json();
    expect(body).toEqual({ imported: 1, skipped: 1, duplicates: 0 });
  });

  it("400s when rows is not an array", async () => {
    const res = await POST(makeRequest({ rows: "not-an-array" }));
    expect(res.status).toBe(400);
  });

  it("returns imported:0 without querying clients when every row is malformed", async () => {
    const res = await POST(makeRequest({ rows: [{ name: "", email: "", phone: "" }] }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ imported: 0, skipped: 1, duplicates: 0 });
    expect(sb.fromCalls).toHaveLength(0); // short-circuits before any DB call
  });
});
