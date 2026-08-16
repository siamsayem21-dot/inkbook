import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

const fromSpy = vi.fn();
const insertSpy = vi.fn();
const singleSpy = vi.fn();
const updateUserById = vi.fn(() => Promise.resolve({ data: {}, error: null }));

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: (table: string) => {
      fromSpy(table);
      return {
        insert: (row: unknown) => {
          insertSpy(row);
          return { select: () => ({ single: singleSpy }) };
        },
      };
    },
    auth: { admin: { updateUserById } },
  })),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

import { createClient as createServerClient } from "@/lib/supabase/server";
import { POST } from "@/app/api/studios/route";

function mockSession(user: { id: string } | null) {
  vi.mocked(createServerClient).mockReturnValue({
    auth: { getUser: vi.fn(() => Promise.resolve({ data: { user } })) },
  } as unknown as ReturnType<typeof createServerClient>);
}

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/studios", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => {
  fromSpy.mockClear();
  insertSpy.mockClear();
  singleSpy.mockReset();
  updateUserById.mockClear();
});

describe("POST /api/studios — session authorization", () => {
  it("401s when there is no authenticated session", async () => {
    mockSession(null);
    const res = await POST(makeRequest({ name: "Ink & Iron", subdomain: "ink-iron" }));
    expect(res.status).toBe(401);
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it("400s when required fields are missing", async () => {
    mockSession({ id: "user-1" });
    const res = await POST(makeRequest({ name: "Ink & Iron" }));
    expect(res.status).toBe(400);
  });

  it("400s on invalid subdomain format", async () => {
    mockSession({ id: "user-1" });
    const res = await POST(makeRequest({ name: "Ink & Iron", subdomain: "Not Valid!" }));
    expect(res.status).toBe(400);
  });

  it("400s with a friendly message when the subdomain is already taken", async () => {
    mockSession({ id: "user-1" });
    singleSpy.mockResolvedValue({ data: null, error: { code: "23505", message: "duplicate key" } });
    const res = await POST(makeRequest({ name: "Ink & Iron", subdomain: "ink-iron" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/already taken/);
  });

  it("creates the studio owned by the session's user id and confirms that user's email, ignoring any client-supplied userId", async () => {
    mockSession({ id: "session-user-1" });
    singleSpy.mockResolvedValue({ data: { id: "studio-1", name: "Ink & Iron", subdomain: "ink-iron" }, error: null });

    const res = await POST(makeRequest({
      userId: "attacker-supplied-id", // must be ignored — not a trusted field
      name: "Ink & Iron",
      subdomain: "ink-iron",
    }));

    expect(res.status).toBe(201);
    expect(insertSpy).toHaveBeenCalledWith(expect.objectContaining({ owner_id: "session-user-1" }));
    expect(updateUserById).toHaveBeenCalledWith("session-user-1", { email_confirm: true });
    expect(updateUserById).not.toHaveBeenCalledWith("attacker-supplied-id", expect.anything());
  });
});

describe("POST /api/studios — timezone (Studio Timezone Capture 3/7)", () => {
  it("400s on an invalid (non-IANA) timezone, before ever inserting", async () => {
    mockSession({ id: "user-1" });
    const res = await POST(makeRequest({ name: "Ink & Iron", subdomain: "ink-iron", timezone: "Not/A/Real/Zone" }));
    expect(res.status).toBe(400);
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it("includes a valid timezone in the insert, not just relying on the column default", async () => {
    mockSession({ id: "user-1" });
    singleSpy.mockResolvedValue({ data: { id: "studio-1", name: "Ink & Iron", subdomain: "ink-iron" }, error: null });
    const res = await POST(makeRequest({ name: "Ink & Iron", subdomain: "ink-iron", timezone: "America/Chicago" }));
    expect(res.status).toBe(201);
    expect(insertSpy).toHaveBeenCalledWith(expect.objectContaining({ timezone: "America/Chicago" }));
  });

  it("accepts 'UTC' as a valid timezone even though it's absent from Intl.supportedValuesOf('timeZone')", async () => {
    mockSession({ id: "user-1" });
    singleSpy.mockResolvedValue({ data: { id: "studio-1", name: "Ink & Iron", subdomain: "ink-iron" }, error: null });
    const res = await POST(makeRequest({ name: "Ink & Iron", subdomain: "ink-iron", timezone: "UTC" }));
    expect(res.status).toBe(201);
    expect(insertSpy).toHaveBeenCalledWith(expect.objectContaining({ timezone: "UTC" }));
  });

  it("omits timezone from the insert entirely when not provided, leaving the column's own DEFAULT 'UTC' in place", async () => {
    mockSession({ id: "user-1" });
    singleSpy.mockResolvedValue({ data: { id: "studio-1", name: "Ink & Iron", subdomain: "ink-iron" }, error: null });
    const res = await POST(makeRequest({ name: "Ink & Iron", subdomain: "ink-iron" }));
    expect(res.status).toBe(201);
    expect(insertSpy).toHaveBeenCalledTimes(1);
    expect(insertSpy.mock.calls[0][0]).not.toHaveProperty("timezone");
  });
});
