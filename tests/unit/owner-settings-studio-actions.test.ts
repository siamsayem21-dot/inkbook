import { describe, it, expect, beforeEach, vi } from "vitest";
import { createSupabaseMock, type SupabaseMock } from "../mocks/supabase";

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/auth/config", () => ({ getStudioId: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { createAdminClient } from "@/lib/supabase/admin";
import { getStudioId } from "@/lib/auth/config";
import { saveStudio } from "@/app/(owner)/owner/settings/studio/actions";

let sb: SupabaseMock;

const BASE = {
  studioId: "studio-1",
  name: "Ink & Iron",
  address: "123 Main St",
  state: "CA",
  primaryColor: "#D4AF37",
  secondaryColor: "#FFFFFF",
  fontChoice: "default",
};

beforeEach(() => {
  sb = createSupabaseMock();
  vi.mocked(createAdminClient).mockReturnValue(sb.client as unknown as ReturnType<typeof createAdminClient>);
});

describe("saveStudio — authorization (Studio Timezone Capture 5/7)", () => {
  it("rejects when there is no authenticated studio session", async () => {
    vi.mocked(getStudioId).mockResolvedValue(null);
    const result = await saveStudio({ ...BASE, timezone: "America/New_York" });
    expect(result.error).toBe("Unauthorized");
    expect(sb.fromCalls).not.toContain("studios");
  });

  it("rejects a cross-studio update — caller's studio does not match the target studioId", async () => {
    vi.mocked(getStudioId).mockResolvedValue("someone-elses-studio");
    const result = await saveStudio({ ...BASE, studioId: "studio-1", timezone: "America/New_York" });
    expect(result.error).toBe("Unauthorized");
    expect(sb.fromCalls).not.toContain("studios");
  });
});

describe("saveStudio — timezone validation (Studio Timezone Capture 5/7)", () => {
  beforeEach(() => {
    vi.mocked(getStudioId).mockResolvedValue("studio-1");
  });

  it("rejects an invalid (non-IANA) timezone outright — never silently substitutes a default", async () => {
    const result = await saveStudio({ ...BASE, timezone: "Not/A/Real/Zone" });
    expect(result.error).toBe("Invalid timezone");
    expect(sb.fromCalls).not.toContain("studios");
  });

  it("rejects an empty timezone", async () => {
    const result = await saveStudio({ ...BASE, timezone: "" });
    expect(result.error).toBe("Invalid timezone");
    expect(sb.fromCalls).not.toContain("studios");
  });

  it("accepts 'UTC' — the column's own default value, even though it's absent from Intl.supportedValuesOf('timeZone')", async () => {
    sb.queueFrom("studios", { success: true });
    const result = await saveStudio({ ...BASE, timezone: "UTC" });
    expect(result.error).toBeUndefined();
    const chain = sb.getChain("studios");
    expect(chain.update).toHaveBeenCalledWith(expect.objectContaining({ timezone: "UTC" }));
  });

  it("accepts a real IANA zone and persists it exactly, scoped to the caller's own studio", async () => {
    sb.queueFrom("studios", { success: true });
    const result = await saveStudio({ ...BASE, timezone: "America/New_York" });
    expect(result.error).toBeUndefined();
    const chain = sb.getChain("studios");
    expect(chain.update).toHaveBeenCalledWith(expect.objectContaining({ timezone: "America/New_York" }));
    expect(chain.eq).toHaveBeenCalledWith("id", "studio-1");
  });

  it("does not touch timezone-unrelated fields' existing validation — invalid color still falls back, not rejected", async () => {
    sb.queueFrom("studios", { success: true });
    const result = await saveStudio({ ...BASE, primaryColor: "not-a-hex-color", timezone: "UTC" });
    expect(result.error).toBeUndefined();
    const chain = sb.getChain("studios");
    expect(chain.update).toHaveBeenCalledWith(expect.objectContaining({ primary_color: "#D4AF37" }));
  });
});
