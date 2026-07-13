import { describe, it, expect, beforeEach, vi } from "vitest";

const fromSpy = vi.fn();
const insertSpy = vi.fn().mockResolvedValue({ error: null });
const selectLimitResult = vi.fn(() => Promise.resolve({ data: [], error: null }));

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: (table: string) => {
      fromSpy(table);
      return {
        select: () => ({
          eq: () => ({ limit: selectLimitResult, maybeSingle: () => Promise.resolve({ data: null, error: null }) }),
        }),
        insert: (row: unknown) => insertSpy(row),
      };
    },
  })),
}));
vi.mock("@/lib/auth/config", () => ({ getCurrentUser: vi.fn() }));

import { getCurrentUser } from "@/lib/auth/config";
import { createStudio } from "@/app/onboarding/actions";

const VALID_DATA = {
  name: "Ink & Iron",
  slug: "ink-iron",
  phone: "5551234567",
  city: "Austin",
  state: "Texas",
  userId: "session-user-1",
};

beforeEach(() => {
  fromSpy.mockClear();
  insertSpy.mockClear();
  selectLimitResult.mockReset().mockResolvedValue({ data: [], error: null });
});

describe("createStudio — session authorization", () => {
  it("rejects when there is no authenticated session", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    const result = await createStudio(VALID_DATA);
    expect(result.error).toBe("Unauthorized");
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it("rejects when the session user does not match the supplied userId", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "someone-else" } as never);
    const result = await createStudio(VALID_DATA);
    expect(result.error).toBe("Unauthorized");
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it("creates the studio owned by the session's user id when it matches", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "session-user-1" } as never);
    const result = await createStudio(VALID_DATA);
    expect(result.error).toBeUndefined();
    expect(insertSpy).toHaveBeenCalledWith(expect.objectContaining({ owner_id: "session-user-1" }));
  });
});
