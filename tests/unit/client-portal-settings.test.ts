import { describe, it, expect, beforeEach, vi } from "vitest";
import { createSupabaseMock, type SupabaseMock } from "../mocks/supabase";

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/auth/config", () => ({ ensureClientAccount: vi.fn() }));

import { createAdminClient } from "@/lib/supabase/admin";
import { ensureClientAccount } from "@/lib/auth/config";
import { updateDisplayName } from "@/app/portal/[studio]/settings/actions";

let sb: SupabaseMock;

beforeEach(() => {
  sb = createSupabaseMock();
  vi.mocked(createAdminClient).mockReturnValue(sb.client as unknown as ReturnType<typeof createAdminClient>);
});

describe("updateDisplayName", () => {
  it("errors when not signed in", async () => {
    vi.mocked(ensureClientAccount).mockResolvedValue(null);
    const result = await updateDisplayName("Alex");
    expect(result.error).toBe("Not signed in.");
    expect(sb.fromCalls).toHaveLength(0);
  });

  it("trims whitespace before saving", async () => {
    vi.mocked(ensureClientAccount).mockResolvedValue({ id: "acc-1", email: "a@b.com" });
    sb.queueFrom("client_accounts", { success: true });

    await updateDisplayName("  Alex  ");

    expect(sb.getChain("client_accounts").update).toHaveBeenCalledWith({ name: "Alex" });
  });

  it("caps the name at 100 characters", async () => {
    vi.mocked(ensureClientAccount).mockResolvedValue({ id: "acc-1", email: "a@b.com" });
    sb.queueFrom("client_accounts", { success: true });

    const longName = "x".repeat(150);
    await updateDisplayName(longName);

    expect(sb.getChain("client_accounts").update).toHaveBeenCalledWith({ name: "x".repeat(100) });
  });

  it("treats an empty/whitespace-only name as a valid clear (null)", async () => {
    vi.mocked(ensureClientAccount).mockResolvedValue({ id: "acc-1", email: "a@b.com" });
    sb.queueFrom("client_accounts", { success: true });

    const result = await updateDisplayName("   ");

    expect(result.error).toBeUndefined();
    expect(sb.getChain("client_accounts").update).toHaveBeenCalledWith({ name: null });
  });

  it("scopes the update to the caller's own account id", async () => {
    vi.mocked(ensureClientAccount).mockResolvedValue({ id: "acc-42", email: "a@b.com" });
    sb.queueFrom("client_accounts", { success: true });

    await updateDisplayName("Alex");

    expect(sb.getChain("client_accounts").eq).toHaveBeenCalledWith("id", "acc-42");
  });

  it("returns a friendly error when the update fails", async () => {
    vi.mocked(ensureClientAccount).mockResolvedValue({ id: "acc-1", email: "a@b.com" });
    sb.queueFrom("client_accounts", null, { message: "db down" });

    const result = await updateDisplayName("Alex");

    expect(result.error).toBe("Failed to save — please try again.");
  });
});
