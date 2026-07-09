import type { AIChatParams, AIExtractParams, AIProvider } from "./types";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const CHAT_MODEL = "claude-sonnet-5";
const EXTRACT_MODEL = "claude-haiku-4-5-20251001";

function requireApiKey(): string {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");
  return apiKey;
}

export class AnthropicProvider implements AIProvider {
  async chat({ system, messages, maxTokens = 1024 }: AIChatParams): Promise<string> {
    const apiKey = requireApiKey();

    const res = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({ model: CHAT_MODEL, max_tokens: maxTokens, system, messages }),
    });
    if (!res.ok) throw new Error(`Anthropic ${res.status}`);

    const data = await res.json();
    // claude-sonnet-5 sometimes emits a leading "thinking" content block before
    // the actual "text" block — find the text block by type, not by position.
    const textBlock = (data.content as Array<{ type: string; text?: string }> | undefined)?.find(
      (b) => b.type === "text"
    );
    return textBlock?.text ?? "";
  }

  async extract({ prompt, maxTokens = 512 }: AIExtractParams): Promise<string> {
    const apiKey = requireApiKey();

    const res = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: EXTRACT_MODEL,
        max_tokens: maxTokens,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) throw new Error(`Anthropic ${res.status}`);

    const data = await res.json();
    // Positional access (not type-based) to match the single-shot Haiku responses
    // this replaces — no thinking block ever precedes them.
    return data.content?.[0]?.text ?? "";
  }
}
