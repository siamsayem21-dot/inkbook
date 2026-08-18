import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createSupabaseMock, type SupabaseMock } from "../mocks/supabase";

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));

import { createAdminClient } from "@/lib/supabase/admin";
import { POST } from "@/app/api/ai/artist-match/route";

let sb: SupabaseMock;
let ipCounter = 0;

function req(body: unknown, ip?: string) {
  ipCounter += 1;
  return new Request("http://localhost/api/ai/artist-match", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "x-forwarded-for": ip ?? `22.0.0.${ipCounter}` },
  });
}

function claudeResponse(text: string) {
  return new Response(JSON.stringify({ content: [{ text }] }), { status: 200 });
}

const originalKey = process.env.ANTHROPIC_API_KEY;
const ARTISTS = [
  { id: "artist-a", name: "Amy", bio: "Bold traditional work", styles: ["Traditional"] },
  { id: "artist-b", name: "Bo",  bio: "Fine line specialist",   styles: ["Fine Line"] },
];

beforeEach(() => {
  delete process.env.ANTHROPIC_API_KEY;
  sb = createSupabaseMock();
  vi.mocked(createAdminClient).mockReturnValue(sb.client as unknown as ReturnType<typeof createAdminClient>);
});

afterEach(() => {
  vi.unstubAllGlobals();
  if (originalKey) process.env.ANTHROPIC_API_KEY = originalKey;
  else delete process.env.ANTHROPIC_API_KEY;
});

describe("POST /api/ai/artist-match", () => {
  it("400s when studioId is missing", async () => {
    const res = await POST(req({}));
    expect(res.status).toBe(400);
  });

  it("returns a deterministic match when ANTHROPIC_API_KEY is not configured (fallback, doesn't break the flow)", async () => {
    sb.queueFrom("artists", ARTISTS);
    const res = await POST(req({ studioId: "studio-1", detectedStyle: "Traditional" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.source).toBe("deterministic");
    expect(body.matches[0].id).toBe("artist-a"); // Traditional match ranked first
    expect(body.matches[0].isRecommended).toBe(true);
  });

  it("returns an empty match list without erroring when the studio has no active artists", async () => {
    sb.queueFrom("artists", []);
    const res = await POST(req({ studioId: "studio-1", detectedStyle: "Traditional" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.matches).toEqual([]);
  });

  it("429s after 20 requests/min from the same IP", async () => {
    const ip = "23.0.0.1";
    for (let i = 0; i < 20; i++) {
      sb.queueFrom("artists", ARTISTS);
      await POST(req({ studioId: "studio-1" }, ip));
    }
    const res = await POST(req({ studioId: "studio-1" }, ip));
    expect(res.status).toBe(429);
  });

  it("uses a valid AI re-ranking when the response names exactly the candidate set", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    sb.queueFrom("artists", ARTISTS);
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          claudeResponse(
            JSON.stringify([
              { id: "artist-b", reason: "Great fine-line portfolio fit" },
              { id: "artist-a", reason: "Solid traditional option" },
            ])
          )
        )
      )
    );
    const res = await POST(req({ studioId: "studio-1", detectedStyle: "Traditional" }));
    const body = await res.json();
    expect(body.source).toBe("ai");
    expect(body.matches[0].id).toBe("artist-b");
    expect(body.matches[0].reason).toMatch(/fine-line portfolio fit/i);
  });

  it("falls back to deterministic ranking when the AI response invents an id outside the candidate set", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    sb.queueFrom("artists", ARTISTS);
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          claudeResponse(
            JSON.stringify([
              { id: "artist-hallucinated", reason: "made up" },
              { id: "artist-a", reason: "x" },
            ])
          )
        )
      )
    );
    const res = await POST(req({ studioId: "studio-1", detectedStyle: "Traditional" }));
    const body = await res.json();
    expect(body.source).toBe("deterministic");
    expect(body.matches[0].id).toBe("artist-a");
  });

  it("falls back to deterministic ranking when the AI response omits a candidate", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    sb.queueFrom("artists", ARTISTS);
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(claudeResponse(JSON.stringify([{ id: "artist-a", reason: "x" }]))))
    );
    const res = await POST(req({ studioId: "studio-1", detectedStyle: "Traditional" }));
    const body = await res.json();
    expect(body.source).toBe("deterministic");
  });

  it("falls back to deterministic ranking when the AI call itself fails", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    sb.queueFrom("artists", ARTISTS);
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response("error", { status: 500 }))));
    const res = await POST(req({ studioId: "studio-1", detectedStyle: "Traditional" }));
    const body = await res.json();
    expect(body.source).toBe("deterministic");
    expect(body.matches[0].id).toBe("artist-a");
  });
});
