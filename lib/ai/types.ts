export type AIContentBlock =
  | { type: "text"; text: string }
  | { type: "image"; source: { type: "base64"; media_type: string; data: string } };

export type AIMessage = {
  role: "user" | "assistant";
  content: string | AIContentBlock[];
};

// Forces the model to respond via a structured tool call instead of free
// text it's merely asked (via the system prompt) to format as JSON — the
// prompt-only approach is not reliably followed: measured ~80% of turns
// falling back to plain prose on a real production conversation (see
// lib/ai-consultation/chat-engine.ts). When `tool` is set, chat() returns
// the tool call's `input` as a JSON string instead of raw response text.
export type AIToolDef = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
};

export interface AIChatParams {
  system: string;
  messages: AIMessage[];
  maxTokens?: number;
  tool?: AIToolDef;
}

export interface AIExtractParams {
  prompt: string;
  maxTokens?: number;
}

export interface AIProvider {
  // Multi-turn conversation with a system prompt (used by the consultation chat).
  chat(params: AIChatParams): Promise<string>;
  // Single-shot prompt-in, text-out extraction (used by the quote/style/questions routes).
  extract(params: AIExtractParams): Promise<string>;
}
