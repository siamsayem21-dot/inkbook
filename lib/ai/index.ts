import { AnthropicProvider } from "./anthropic-provider";
import type { AIProvider } from "./types";

export type { AIProvider, AIChatParams, AIExtractParams, AIMessage, AIContentBlock } from "./types";

let provider: AIProvider | null = null;

export function getAIProvider(): AIProvider {
  if (!provider) provider = new AnthropicProvider();
  return provider;
}
