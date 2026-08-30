import { describe, it, expect, beforeEach, vi } from "vitest";
import { createSupabaseMock, type SupabaseMock } from "../mocks/supabase";

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/auth/config", () => ({ getStudioId: vi.fn() }));

import { createAdminClient } from "@/lib/supabase/admin";
import { getStudioId } from "@/lib/auth/config";
import { getStudioKnowledge, getAllStudioKnowledge, getPublicFaq, getKnowledgeForCaller } from "@/lib/studio-knowledge";

let sb: SupabaseMock;

beforeEach(() => {
  sb = createSupabaseMock();
  vi.mocked(createAdminClient).mockReturnValue(sb.client as unknown as ReturnType<typeof createAdminClient>);
});

describe("getAllStudioKnowledge — owner management page", () => {
  it("returns disabled entries alongside active ones, scoped to the caller's studio", async () => {
    sb.queueFrom("studio_knowledge", [
      { id: "k-1", category: "policy", title: "Active entry", content: "…", is_active: true, is_public: true, sort_order: 0 },
      { id: "k-2", category: "faq", title: "Disabled entry", content: "…", is_active: false, is_public: false, sort_order: 1 },
    ]);

    const entries = await getAllStudioKnowledge("studio-1");

    // Disable → refresh → still visible as Disabled: the disabled row survives the fetch untouched.
    expect(entries).toHaveLength(2);
    expect(entries.find((e) => e.id === "k-2")).toMatchObject({ is_active: false });
    expect(entries.find((e) => e.id === "k-1")).toMatchObject({ is_active: true });

    const chain = sb.getChain("studio_knowledge");
    expect(chain.eq).toHaveBeenCalledWith("studio_id", "studio-1");
    // Never filters on is_active — that's the whole fix.
    expect(chain.eq).not.toHaveBeenCalledWith("is_active", true);
  });

  it("reflects a re-enabled entry as active on the next fetch (simulated refresh)", async () => {
    // Enable → refresh → Active again: after toggleKnowledgeActive flips the row,
    // the very next getAllStudioKnowledge call (i.e. the next page load) must
    // see is_active: true with no other trace of the disabled state.
    sb.queueFrom("studio_knowledge", [
      { id: "k-2", category: "faq", title: "Re-enabled entry", content: "…", is_active: true, is_public: false, sort_order: 1 },
    ]);

    const entries = await getAllStudioKnowledge("studio-1");
    expect(entries).toEqual([
      { id: "k-2", category: "faq", title: "Re-enabled entry", content: "…", is_active: true, is_public: false, sort_order: 1 },
    ]);
  });

  it("does not leak another studio's entries", async () => {
    sb.queueFrom("studio_knowledge", []);
    await getAllStudioKnowledge("studio-1");
    expect(sb.getChain("studio_knowledge").eq).toHaveBeenCalledWith("studio_id", "studio-1");
  });
});

describe("getStudioKnowledge — AI consultation/quote/style-detect consumer", () => {
  it("still filters to active entries only (unchanged by the owner-page fix)", async () => {
    sb.queueFrom("studio_knowledge", [
      { id: "k-1", category: "policy", title: "Active entry", content: "…", is_active: true, is_public: true, sort_order: 0 },
    ]);

    await getStudioKnowledge("studio-1");

    const chain = sb.getChain("studio_knowledge");
    expect(chain.eq).toHaveBeenCalledWith("studio_id", "studio-1");
    expect(chain.eq).toHaveBeenCalledWith("is_active", true);
  });
});

describe("getPublicFaq — public booking page consumer", () => {
  it("requires both is_active and is_public — a disabled entry is excluded even if it was public", async () => {
    sb.queueFrom("studio_knowledge", []);
    await getPublicFaq("studio-1");

    const chain = sb.getChain("studio_knowledge");
    expect(chain.eq).toHaveBeenCalledWith("studio_id", "studio-1");
    expect(chain.eq).toHaveBeenCalledWith("is_active", true);
    expect(chain.eq).toHaveBeenCalledWith("is_public", true);
  });
});

// BUG-SEC-FULLQA-002 regression coverage: the public AI routes (quote-generate,
// consultation-questions, style-detect) must never fold a studio's private
// (is_public=false) knowledge into a response for a caller who isn't
// authenticated as that exact studio — only the requested studioId matching
// the caller's own session studio unlocks the private tier.
describe("getKnowledgeForCaller — routing between private and public-only knowledge", () => {
  it("returns full (private+public) knowledge when the caller's own session studio matches the requested studioId", async () => {
    vi.mocked(getStudioId).mockResolvedValue("studio-1");
    sb.queueFrom("studio_knowledge", [
      { id: "k-1", category: "pricing", title: "Internal pricing note", content: "…", is_active: true, is_public: false, sort_order: 0 },
    ]);

    await getKnowledgeForCaller("studio-1");

    const chain = sb.getChain("studio_knowledge");
    expect(chain.eq).toHaveBeenCalledWith("studio_id", "studio-1");
    expect(chain.eq).toHaveBeenCalledWith("is_active", true);
    expect(chain.eq).not.toHaveBeenCalledWith("is_public", true);
  });

  it("falls back to public-only knowledge when the caller has no session (anonymous)", async () => {
    vi.mocked(getStudioId).mockResolvedValue(null);
    sb.queueFrom("studio_knowledge", []);

    await getKnowledgeForCaller("studio-1");

    const chain = sb.getChain("studio_knowledge");
    expect(chain.eq).toHaveBeenCalledWith("is_public", true);
  });

  it("falls back to public-only knowledge when the caller's session studio does NOT match the requested studioId (cross-tenant probe)", async () => {
    vi.mocked(getStudioId).mockResolvedValue("studio-2");
    sb.queueFrom("studio_knowledge", []);

    await getKnowledgeForCaller("studio-1");

    const chain = sb.getChain("studio_knowledge");
    expect(chain.eq).toHaveBeenCalledWith("is_public", true);
  });
});
