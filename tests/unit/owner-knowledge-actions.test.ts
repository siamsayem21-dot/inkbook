import { describe, it, expect, beforeEach, vi } from "vitest";
import { createSupabaseMock, type SupabaseMock } from "../mocks/supabase";

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/auth/config", () => ({ getStudioId: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { createAdminClient } from "@/lib/supabase/admin";
import { getStudioId } from "@/lib/auth/config";
import {
  createKnowledgeEntry,
  updateKnowledgeEntry,
  deleteKnowledgeEntry,
  toggleKnowledgeActive,
} from "@/app/(owner)/owner/knowledge/actions";

let sb: SupabaseMock;

beforeEach(() => {
  sb = createSupabaseMock();
  vi.mocked(createAdminClient).mockReturnValue(sb.client as unknown as ReturnType<typeof createAdminClient>);
  vi.mocked(getStudioId).mockResolvedValue("studio-1");
});

describe("toggleKnowledgeActive — the Disable/Enable action", () => {
  it("errors when not signed in", async () => {
    vi.mocked(getStudioId).mockResolvedValue(null);
    const result = await toggleKnowledgeActive("k-1", false);
    expect(result.error).toBe("Unauthorized");
  });

  it("disabling sets is_active: false, scoped to the caller's studio", async () => {
    sb.queueFrom("studio_knowledge", { success: true });
    const result = await toggleKnowledgeActive("k-1", false);
    expect(result.error).toBeUndefined();
    const chain = sb.getChain("studio_knowledge");
    expect((chain as { update: { mock: { calls: unknown[][] } } }).update.mock.calls[0][0]).toEqual({ is_active: false });
    expect(chain.eq).toHaveBeenCalledWith("id", "k-1");
    expect(chain.eq).toHaveBeenCalledWith("studio_id", "studio-1");
  });

  it("re-enabling (Enable action) sets is_active: true, scoped to the caller's studio", async () => {
    sb.queueFrom("studio_knowledge", { success: true });
    const result = await toggleKnowledgeActive("k-1", true);
    expect(result.error).toBeUndefined();
    const chain = sb.getChain("studio_knowledge");
    expect((chain as { update: { mock: { calls: unknown[][] } } }).update.mock.calls[0][0]).toEqual({ is_active: true });
    expect(chain.eq).toHaveBeenCalledWith("studio_id", "studio-1");
  });

  it("cross-studio: toggling another studio's entry id is scoped to the caller's own studio, not the target row's studio", async () => {
    // The caller is authenticated as studio-1. Even if they pass an id that
    // actually belongs to studio-2, the mutation is always filtered by the
    // *session's* studio_id — so it structurally cannot affect studio-2's row.
    sb.queueFrom("studio_knowledge", { success: true });
    await toggleKnowledgeActive("entry-belonging-to-studio-2", true);
    const chain = sb.getChain("studio_knowledge");
    expect(chain.eq).toHaveBeenCalledWith("studio_id", "studio-1");
    expect(chain.eq).not.toHaveBeenCalledWith("studio_id", "studio-2");
  });
});

describe("updateKnowledgeEntry", () => {
  it("errors when not signed in", async () => {
    vi.mocked(getStudioId).mockResolvedValue(null);
    const result = await updateKnowledgeEntry({ id: "k-1", title: "T", content: "C", isPublic: false, isActive: true });
    expect(result.error).toBe("Unauthorized");
  });

  it("rejects an empty title", async () => {
    const result = await updateKnowledgeEntry({ id: "k-1", title: "  ", content: "C", isPublic: false, isActive: true });
    expect(result.error).toMatch(/Title/);
  });

  it("rejects empty content", async () => {
    const result = await updateKnowledgeEntry({ id: "k-1", title: "T", content: "  ", isPublic: false, isActive: true });
    expect(result.error).toMatch(/Content/);
  });

  it("updates scoped to the caller's studio", async () => {
    sb.queueFrom("studio_knowledge", { success: true });
    const result = await updateKnowledgeEntry({ id: "k-1", title: "New title", content: "New content", isPublic: true, isActive: true });
    expect(result.error).toBeUndefined();
    const chain = sb.getChain("studio_knowledge");
    expect(chain.eq).toHaveBeenCalledWith("studio_id", "studio-1");
  });

  it("cross-studio: cannot update an entry belonging to another studio", async () => {
    sb.queueFrom("studio_knowledge", { success: true });
    await updateKnowledgeEntry({ id: "entry-belonging-to-studio-2", title: "T", content: "C", isPublic: false, isActive: true });
    const chain = sb.getChain("studio_knowledge");
    expect(chain.eq).toHaveBeenCalledWith("studio_id", "studio-1");
    expect(chain.eq).not.toHaveBeenCalledWith("studio_id", "studio-2");
  });
});

describe("deleteKnowledgeEntry", () => {
  it("errors when not signed in", async () => {
    vi.mocked(getStudioId).mockResolvedValue(null);
    const result = await deleteKnowledgeEntry("k-1");
    expect(result.error).toBe("Unauthorized");
  });

  it("deletes scoped to the caller's studio", async () => {
    sb.queueFrom("studio_knowledge", { success: true });
    const result = await deleteKnowledgeEntry("k-1");
    expect(result.error).toBeUndefined();
    expect(sb.getChain("studio_knowledge").eq).toHaveBeenCalledWith("studio_id", "studio-1");
  });

  it("cross-studio: cannot delete an entry belonging to another studio", async () => {
    sb.queueFrom("studio_knowledge", { success: true });
    await deleteKnowledgeEntry("entry-belonging-to-studio-2");
    const chain = sb.getChain("studio_knowledge");
    expect(chain.eq).toHaveBeenCalledWith("studio_id", "studio-1");
    expect(chain.eq).not.toHaveBeenCalledWith("studio_id", "studio-2");
  });
});

describe("createKnowledgeEntry", () => {
  it("errors when not signed in", async () => {
    vi.mocked(getStudioId).mockResolvedValue(null);
    const result = await createKnowledgeEntry({ category: "policy", title: "T", content: "C", isPublic: false });
    expect(result.error).toBe("Unauthorized");
  });

  it("rejects an empty title", async () => {
    const result = await createKnowledgeEntry({ category: "policy", title: " ", content: "C", isPublic: false });
    expect(result.error).toMatch(/Title/);
  });

  it("creates a new entry active by default, scoped to the caller's studio", async () => {
    sb.queueFrom("studio_knowledge", [{ id: "count-probe" }]); // count() head query
    sb.queueFrom("studio_knowledge", { id: "new-id" }); // insert().select().single()
    const result = await createKnowledgeEntry({ category: "style", title: "New style", content: "…", isPublic: false });
    expect(result.error).toBeUndefined();
    expect(result.id).toBe("new-id");
    const insertChain = sb.getChain("studio_knowledge", 2);
    expect((insertChain as { insert: { mock: { calls: unknown[][] } } }).insert.mock.calls[0][0]).toMatchObject({
      studio_id: "studio-1",
      is_active: true,
    });
  });
});
