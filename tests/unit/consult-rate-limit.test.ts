import { describe, it, expect, beforeEach, vi } from "vitest";
import { createSupabaseMock, type SupabaseMock } from "../mocks/supabase";

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/auth/config", () => ({ getStudioId: vi.fn(), getCurrentUser: vi.fn(() => Promise.resolve(null)) }));
vi.mock("next/headers", () => ({
  headers: () => new Map([["x-forwarded-for", "203.0.113.7"]]),
}));

import { createAdminClient } from "@/lib/supabase/admin";
import { submitConsultation } from "@/app/book/[studio]/consult/actions";

let sb: SupabaseMock;

function makeFormData(email: string): FormData {
  const fd = new FormData();
  const fields: Record<string, string> = {
    studioId: "studio-1",
    clientName: "Alex Client",
    clientEmail: email,
    clientPhone: "555-123-4567",
    description: "Small rose",
    placement: "Forearm",
    size: "Small",
    colorPreference: "Black & grey",
    budgetRange: "$200-400",
  };
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

beforeEach(() => {
  sb = createSupabaseMock();
  vi.mocked(createAdminClient).mockReturnValue(sb.client as unknown as ReturnType<typeof createAdminClient>);
});

describe("submitConsultation rate limiting", () => {
  it("blocks after 10 submissions from the same IP within the window", async () => {
    // Each call must use a distinct email (+ distinct queued row) so the
    // idempotency cache never masks this as "same submission" — this test
    // is specifically about the rate limiter, not the dedupe guard.
    for (let i = 0; i < 10; i++) {
      sb.queueFrom("consultations", { id: `consult-${i}` });
      const result = await submitConsultation(makeFormData(`user${i}-${Math.random()}@example.com`));
      expect(result.id).toBe(`consult-${i}`);
    }

    // 11th request from the same IP within the window is rejected.
    const blocked = await submitConsultation(makeFormData(`user-blocked-${Math.random()}@example.com`));
    expect(blocked.error).toMatch(/too many submissions/i);
    expect(sb.fromCalls.filter((t) => t === "consultations")).toHaveLength(10); // no 11th insert attempted
  });
});
