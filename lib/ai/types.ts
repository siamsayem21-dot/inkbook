export type AIContentBlock =
  | { type: "text"; text: string }
  | { type: "image"; source: { type: "base64"; media_type: string; data: string } };

export type AIMessage = {
  role: "user" | "assistant";
  content: string | AIContentBlock[];
};

export interface AIChatParams {
  system: string;
  messages: AIMessage[];
  maxTokens?: number;
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
