import { describe, it, expect, vi, beforeEach } from "vitest";
// vi.mock(...) calls below are hoisted by vitest above this static import,
// so runConsultationTurn resolves against the mocked react/studio-knowledge/
// ai modules — this avoids a top-level `await import(...)`, which tsc
// rejects for this project's tsconfig (module/target combination) even
// though vitest's own esbuild transform runs it fine.
import { runConsultationTurn, isReadyToSubmit, type GatheredFields, type ChatMessageRow } from "@/lib/ai-consultation/chat-engine";

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return { ...actual, cache: (fn: unknown) => fn };
});

vi.mock("@/lib/studio-knowledge", () => ({
  getStudioKnowledge: vi.fn().mockResolvedValue([]),
  formatKnowledgeForAI: vi.fn().mockReturnValue(""),
}));

const chatMock = vi.fn();
vi.mock("@/lib/ai", () => ({
  getAIProvider: () => ({ chat: chatMock, extract: vi.fn() }),
}));

const BASE_PARAMS = { studioId: "studio-1", studioName: "Test Studio" };

function toolReply(input: object) {
  return JSON.stringify(input);
}

function userMsg(content: string): ChatMessageRow {
  return { role: "user", content, image_url: null };
}
function assistantMsg(content: string): ChatMessageRow {
  return { role: "assistant", content, image_url: null };
}

beforeEach(() => {
  chatMock.mockReset();
  process.env.ANTHROPIC_API_KEY = "test-key";
});

describe("runConsultationTurn — normal progression", () => {
  it("merges a new field the model extracts and asks the next question", async () => {
    chatMock.mockResolvedValueOnce(
      toolReply({ reply: "Nice to meet you, Jane! What's the best phone number?", gathered: { name: "Jane" }, askingAbout: "phone", complete: false })
    );
    const result = await runConsultationTurn({
      ...BASE_PARAMS,
      history: [assistantMsg("Hi! What's your name?"), userMsg("Jane")],
      gathered: {},
    });
    expect(result.gathered.name).toBe("Jane");
    expect(result.reply).toContain("phone number");
    expect(result.complete).toBe(false);
  });
});

describe("runConsultationTurn — multiple fields in one message", () => {
  it("extracts placement, size, and description together", async () => {
    chatMock.mockResolvedValueOnce(
      toolReply({
        reply: "Got it — a lion face half sleeve on your left arm! What style are you drawn to?",
        gathered: { description: "lion face", placement: "left arm", size: "half sleeve" },
        askingAbout: "style",
        complete: false,
      })
    );
    const result = await runConsultationTurn({
      ...BASE_PARAMS,
      history: [userMsg("lion face tattoo on my left arm, roughly half sleeve size")],
      gathered: { name: "Jane", phone: "555-0100" },
    });
    expect(result.gathered.description).toBe("lion face");
    expect(result.gathered.placement).toBe("left arm");
    expect(result.gathered.size).toBe("half sleeve");
  });
});

describe("runConsultationTurn — vague answer", () => {
  it("does not crash and does not fabricate a field from a non-answer", async () => {
    chatMock.mockResolvedValueOnce(
      toolReply({
        reply: "No worries — are you drawn to something bold and colorful, or more subtle black & grey work?",
        gathered: {},
        askingAbout: "style",
        complete: false,
      })
    );
    const gathered: GatheredFields = { name: "Jane", phone: "555-0100", description: "lion face", placement: "left arm", size: "half sleeve" };
    const result = await runConsultationTurn({ ...BASE_PARAMS, history: [userMsg("not sure, whatever looks good")], gathered });
    expect(result.gathered.style).toBeUndefined();
    expect(result.complete).toBe(false);
    expect(result.reply.length).toBeGreaterThan(0);
  });
});

describe("runConsultationTurn — frustrated reply does not reset the flow", () => {
  it("keeps all previously gathered fields intact", async () => {
    chatMock.mockResolvedValueOnce(
      toolReply({
        reply: "Sorry about that, Jane — I have got everything you have shared so far. Do you have a preferred artist, or no preference?",
        gathered: {},
        askingAbout: "preferredArtist",
        complete: false,
      })
    );
    const gathered: GatheredFields = {
      name: "Jane", phone: "555-0100", description: "lion face", placement: "left arm",
      size: "half sleeve", style: "Traditional", color: "Black & grey", budget: "$200",
    };
    const result = await runConsultationTurn({ ...BASE_PARAMS, history: [userMsg("i already told you everything, why do you keep asking?!")], gathered });
    expect(result.gathered).toMatchObject(gathered);
    expect(result.complete).toBe(false);
  });
});

describe("runConsultationTurn — anti-loop guard", () => {
  it("overrides a redundant question about an already-filled field with the next missing one", async () => {
    // Model incorrectly asks about "placement" again even though it is already known,
    // and does not report any new gathered data. The guard must catch this via
    // askingAbout + merged[field] and redirect to the actual next missing field.
    chatMock.mockResolvedValueOnce(
      toolReply({
        reply: "Where on your body are you thinking of placing it?", // redundant — placement already known
        gathered: {},
        askingAbout: "placement",
        complete: false,
      })
    );
    const gathered: GatheredFields = { name: "Jane", phone: "555-0100", description: "lion face", placement: "left arm" };
    const result = await runConsultationTurn({ ...BASE_PARAMS, history: [userMsg("yes, left arm, i said that already")], gathered });
    // Must NOT repeat the placement question — must advance to the next genuinely missing field (size).
    expect(result.reply).not.toMatch(/placing it/i);
    expect(result.reply).toMatch(/big|size/i);
  });

  it("does not override when askingAbout targets a field that is genuinely still missing", async () => {
    chatMock.mockResolvedValueOnce(
      toolReply({ reply: "About how big are you picturing it?", gathered: {}, askingAbout: "size", complete: false })
    );
    const gathered: GatheredFields = { name: "Jane", phone: "555-0100", description: "lion face", placement: "left arm" };
    const result = await runConsultationTurn({ ...BASE_PARAMS, history: [userMsg("left arm")], gathered });
    expect(result.reply).toMatch(/big/i);
  });
});

describe("runConsultationTurn — fallback path (API/parse failure)", () => {
  it("asks about the actual first missing required field, not a generic dead-end message", async () => {
    chatMock.mockRejectedValueOnce(new Error("Anthropic 400: simulated failure"));
    const gathered: GatheredFields = { name: "Jane", phone: "555-0100", description: "lion face" };
    const result = await runConsultationTurn({ ...BASE_PARAMS, history: [userMsg("left arm")], gathered });
    expect(result.reply).toBe("Where on your body are you thinking of placing it?");
    expect(result.gathered).toEqual(gathered);
    expect(result.complete).toBe(false);
  });

  it("asks about the first missing OPTIONAL field when every required field is filled and the call fails — the exact real bug this replaces", async () => {
    chatMock.mockRejectedValueOnce(new Error("No JSON object in response"));
    // Every required field filled, no optional fields yet — matches the real
    // production state right before the observed infinite loop.
    const gathered: GatheredFields = {
      name: "Sezan", phone: "01916466298", description: "Lion face", placement: "Left arm",
      size: "Half sleeve", style: "Neo Traditional", color: "Black & grey", budget: "$126",
    };
    const result = await runConsultationTurn({ ...BASE_PARAMS, history: [userMsg("no")], gathered });
    // Must NOT be the old dead-end generic message that never advances.
    expect(result.reply).not.toBe("Thanks — could you tell me a bit more about what you're looking for?");
    expect(result.reply).toBe("Do you have a preferred artist for this piece, or no preference?");
    expect(result.complete).toBe(false);
  });

  it("wraps up and completes when literally every field — required and optional — is already filled and the call fails", async () => {
    chatMock.mockRejectedValueOnce(new Error("No JSON object in response"));
    const gathered: GatheredFields = {
      name: "Sezan", phone: "01916466298", description: "Lion face", placement: "Left arm",
      size: "Half sleeve", style: "Neo Traditional", color: "Black & grey", budget: "$126",
      preferredArtist: "No preference", preferredDates: "Flexible", medicalNotes: "None", additionalNotes: "None",
    };
    const result = await runConsultationTurn({ ...BASE_PARAMS, history: [userMsg("that's all")], gathered });
    expect(result.reply).not.toBe("Thanks — could you tell me a bit more about what you're looking for?");
    expect(result.complete).toBe(true);
    expect(isReadyToSubmit(result.gathered)).toBe(true);
  });

  it("falls back cleanly with no ANTHROPIC_API_KEY configured", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const result = await runConsultationTurn({ ...BASE_PARAMS, history: [userMsg("hi")], gathered: {} });
    expect(result.reply).toBe("First — what's your name?");
    expect(chatMock).not.toHaveBeenCalled();
    process.env.ANTHROPIC_API_KEY = "test-key";
  });
});

describe("runConsultationTurn — completion", () => {
  it("only completes once every required field is genuinely filled", async () => {
    chatMock.mockResolvedValueOnce(
      toolReply({ reply: "All set, thanks!", gathered: {}, askingAbout: null, complete: true })
    );
    // Missing "budget" — model claims complete=true but isReadyToSubmit must override it to false.
    const gathered: GatheredFields = {
      name: "Jane", phone: "555-0100", description: "lion face", placement: "left arm",
      size: "half sleeve", style: "Traditional", color: "Black & grey",
    };
    const result = await runConsultationTurn({ ...BASE_PARAMS, history: [userMsg("that's everything")], gathered });
    expect(result.complete).toBe(false);
  });

  it("completes when the model reports complete=true and all required fields are present", async () => {
    chatMock.mockResolvedValueOnce(
      toolReply({ reply: "Perfect, sending this to the studio now!", gathered: {}, askingAbout: null, complete: true })
    );
    const gathered: GatheredFields = {
      name: "Jane", phone: "555-0100", description: "lion face", placement: "left arm",
      size: "half sleeve", style: "Traditional", color: "Black & grey", budget: "$200",
    };
    const result = await runConsultationTurn({ ...BASE_PARAMS, history: [userMsg("none")], gathered });
    expect(result.complete).toBe(true);
  });
});

describe("runConsultationTurn — style validation", () => {
  it("normalizes an out-of-list style to Other", async () => {
    chatMock.mockResolvedValueOnce(
      toolReply({ reply: "Got it!", gathered: { style: "Cyberpunk Glitch" }, askingAbout: "color", complete: false })
    );
    const result = await runConsultationTurn({ ...BASE_PARAMS, history: [userMsg("cyberpunk glitch style")], gathered: {} });
    expect(result.gathered.style).toBe("Other");
  });
});
