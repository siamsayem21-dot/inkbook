import { describe, it, expect, beforeEach, vi } from "vitest";
import { createSupabaseMock, type SupabaseMock } from "../mocks/supabase";

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/auth/config", () => ({ getStudioId: vi.fn(), getCurrentUser: vi.fn(() => Promise.resolve(null)) }));
vi.mock("next/headers", () => ({ headers: () => new Map<string, string>() }));

import { createAdminClient } from "@/lib/supabase/admin";
import { submitConsultation } from "@/app/book/[studio]/consult/actions";

let sb: SupabaseMock;

function makeFormData(overrides?: Record<string, string>): FormData {
  const fd = new FormData();
  const fields: Record<string, string> = {
    studioId: "studio-1",
    clientName: "Alex Client",
    clientEmail: "alex@example.com",
    clientPhone: "555-123-4567",
    description: "Small rose on forearm",
    placement: "Forearm",
    size: "Small",
    colorPreference: "Black & grey",
    budgetRange: "$200-400",
    ...overrides,
  };
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

beforeEach(() => {
  sb = createSupabaseMock();
  vi.mocked(createAdminClient).mockReturnValue(sb.client as unknown as ReturnType<typeof createAdminClient>);
});

describe("submitConsultation", () => {
  it("errors when required fields are missing", async () => {
    const fd = new FormData();
    fd.set("studioId", "studio-1");
    const result = await submitConsultation(fd);
    expect(result.error).toMatch(/missing required fields/i);
  });

  it("inserts a new consultation and returns its id", async () => {
    sb.queueFrom("consultations", { id: "consult-1" });
    const result = await submitConsultation(makeFormData());
    expect(result.id).toBe("consult-1");
    expect(sb.fromCalls.filter((t) => t === "consultations")).toHaveLength(1);
  });

  it("returns the same id on an immediate retry with identical data, without inserting twice (idempotency)", async () => {
    sb.queueFrom("consultations", { id: "consult-1" });
    const uniqueEmail = `retry-${Math.random()}@example.com`;
    const fd = makeFormData({ clientEmail: uniqueEmail });
    const first = await submitConsultation(fd);

    // Second call reuses the same FormData values (simulating a retried
    // submit) — only ONE queued "consultations" insert result was provided
    // above, so if the code inserted a second time this would fail because
    // the mock queue is empty (defaults to null data → the error branch).
    const second = await submitConsultation(makeFormData({ clientEmail: uniqueEmail }));

    expect(first.id).toBe("consult-1");
    expect(second.id).toBe("consult-1");
    expect(sb.fromCalls.filter((t) => t === "consultations")).toHaveLength(1);
  });

  it("treats materially different submissions as independent (not falsely deduped)", async () => {
    const emailA = `a-${Math.random()}@example.com`;
    const emailB = `b-${Math.random()}@example.com`;
    sb.queueFrom("consultations", { id: "consult-a" });
    sb.queueFrom("consultations", { id: "consult-b" });

    const a = await submitConsultation(makeFormData({ clientEmail: emailA }));
    const b = await submitConsultation(makeFormData({ clientEmail: emailB }));

    expect(a.id).toBe("consult-a");
    expect(b.id).toBe("consult-b");
    expect(sb.fromCalls.filter((t) => t === "consultations")).toHaveLength(2);
  });
});
