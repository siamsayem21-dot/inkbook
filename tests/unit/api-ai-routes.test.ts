import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
// These routes transitively import lib/studio-knowledge.ts, which wraps a
// getStudioId() import in React's cache() — unmockable in vitest's node
// environment. Every other test file that pulls in lib/auth/config.ts
// mocks it for this reason.
vi.mock("@/lib/auth/config", () => ({ getStudioId: vi.fn() }));
import { POST as quoteGenerate } from "@/app/api/ai/quote-generate/route";
import { POST as consultationQuestions } from "@/app/api/ai/consultation-questions/route";
import { POST as styleDetect } from "@/app/api/ai/style-detect/route";

let ipCounter = 0;
function req(body: unknown, ip?: string) {
  ipCounter += 1;
  return new Request("http://localhost/api/ai/x", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "x-forwarded-for": ip ?? `20.0.0.${ipCounter}` },
  });
}

function claudeResponse(text: string) {
  return new Response(JSON.stringify({ content: [{ text }] }), { status: 200 });
}

const originalKey = process.env.ANTHROPIC_API_KEY;

beforeEach(() => {
  delete process.env.ANTHROPIC_API_KEY;
});

afterEach(() => {
  vi.unstubAllGlobals();
  if (originalKey) process.env.ANTHROPIC_API_KEY = originalKey;
  else delete process.env.ANTHROPIC_API_KEY;
});

describe("POST /api/ai/quote-generate", () => {
  it("returns the fallback quote when description/placement are missing", async () => {
    const res = await quoteGenerate(req({}));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.difficulty).toBe("Medium");
    expect(body.priceLow).toBe(300);
  });

  it("returns the fallback quote when ANTHROPIC_API_KEY is not configured", async () => {
    const res = await quoteGenerate(req({ description: "wolf", placement: "arm" }));
    const body = await res.json();
    expect(body.reasoning).toMatch(/could not be auto-generated/i);
  });

  it("429s after 20 requests/min from the same IP", async () => {
    const ip = `21.0.0.1`;
    for (let i = 0; i < 20; i++) await quoteGenerate(req({}, ip));
    const res = await quoteGenerate(req({}, ip));
    expect(res.status).toBe(429);
  });

  it("parses and sanitizes a valid AI response, clamping negative/inverted values", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          claudeResponse(
            JSON.stringify({
              priceLow: -50, priceHigh: 100, sessionsEstimate: 0,
              hoursLow: 5, hoursHigh: 2, difficulty: "Bogus",
              reasoning: "test reasoning",
            })
          )
        )
      )
    );
    const res = await quoteGenerate(req({ description: "detailed wolf howling", placement: "forearm" }));
    const body = await res.json();
    expect(body.priceLow).toBe(0);
    expect(body.priceHigh).toBeGreaterThanOrEqual(body.priceLow);
    expect(body.sessionsEstimate).toBe(1);
    expect(body.hoursHigh).toBeGreaterThanOrEqual(body.hoursLow);
    expect(body.difficulty).toBe("Medium");
  });

  it("falls back gracefully when the Anthropic call fails", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response("error", { status: 500 }))));
    const res = await quoteGenerate(req({ description: "detailed wolf howling", placement: "forearm" }));
    const body = await res.json();
    expect(body.reasoning).toMatch(/could not be auto-generated/i);
  });
});

describe("POST /api/ai/consultation-questions", () => {
  it("returns fallback questions when description/placement are missing", async () => {
    const res = await consultationQuestions(req({}));
    const body = await res.json();
    expect(body.questions).toHaveLength(5);
  });

  it("returns fallback questions when ANTHROPIC_API_KEY is not configured", async () => {
    const res = await consultationQuestions(req({ description: "wolf", placement: "arm" }));
    const body = await res.json();
    expect(Array.isArray(body.questions)).toBe(true);
  });

  it("429s after 20 requests/min from the same IP", async () => {
    const ip = `21.0.0.2`;
    for (let i = 0; i < 20; i++) await consultationQuestions(req({}, ip));
    const res = await consultationQuestions(req({}, ip));
    expect(res.status).toBe(429);
  });

  it("parses and caps the AI question list at 5", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    const seven = Array.from({ length: 7 }, (_, i) => `Question ${i + 1}?`);
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(claudeResponse(JSON.stringify(seven)))));
    const res = await consultationQuestions(req({ description: "detailed wolf howling", placement: "forearm" }));
    const body = await res.json();
    expect(body.questions).toHaveLength(5);
    expect(body.questions[0]).toBe("Question 1?");
  });
});

describe("POST /api/ai/style-detect", () => {
  it("returns the fallback style when ANTHROPIC_API_KEY is not configured", async () => {
    const res = await styleDetect(req({ description: "wolf", followupAnswers: {} }));
    const body = await res.json();
    expect(body.style).toBe("Other");
    expect(body.confidence).toBe(50);
  });

  it("429s after 20 requests/min from the same IP", async () => {
    const ip = `21.0.0.3`;
    for (let i = 0; i < 20; i++) await styleDetect(req({ followupAnswers: {} }, ip));
    const res = await styleDetect(req({ followupAnswers: {} }, ip));
    expect(res.status).toBe(429);
  });

  it("corrects an out-of-list style to 'Other'", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          claudeResponse(JSON.stringify({ style: "Cubism", confidence: 90, reasoning: "x", aiNotes: "y" }))
        )
      )
    );
    const res = await styleDetect(req({ description: "wolf", followupAnswers: {} }));
    const body = await res.json();
    expect(body.style).toBe("Other");
  });

  it("accepts a valid style from the list unchanged", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          claudeResponse(JSON.stringify({ style: "Japanese", confidence: 85, reasoning: "x", aiNotes: "y" }))
        )
      )
    );
    const res = await styleDetect(req({ description: "koi and waves", followupAnswers: {} }));
    const body = await res.json();
    expect(body.style).toBe("Japanese");
  });
});
