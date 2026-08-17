/**
 * Visual QA V3 -- Anthropic API client.
 *
 * Mirrors the exact calling convention already used in production by
 * lib/ai/anthropic-provider.ts: raw fetch to the Messages API, same model,
 * same "find the text block by type, not position" handling for
 * claude-sonnet-5's occasional leading thinking block. Kept as a separate
 * copy (not an import from lib/ai/) because these are standalone Node
 * scripts, not part of the Next.js app bundle.
 */
import { env } from "./env.mjs";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const VISION_MODEL = "claude-sonnet-5";

function requireApiKey() {
  const apiKey = env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured in .env.local");
  return apiKey;
}

/**
 * @param {object} params
 * @param {string} params.system
 * @param {Array<{role: "user"|"assistant", content: any}>} params.messages
 * @param {number} [params.maxTokens]
 */
export async function callClaude({ system, messages, maxTokens = 2048 }) {
  const apiKey = requireApiKey();

  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({ model: VISION_MODEL, max_tokens: maxTokens, system, messages }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Anthropic API ${res.status}: ${body.slice(0, 500)}`);
  }

  const data = await res.json();
  const textBlock = (data.content ?? []).find((block) => block.type === "text");
  return textBlock?.text ?? "";
}

/**
 * Extracts the first JSON object/array from a model response, tolerating
 * markdown code fences (```json ... ```) the model sometimes wraps output in
 * despite instructions not to.
 */
export function extractJson(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.search(/[[{]/);
  if (start === -1) throw new Error(`No JSON found in model response: ${text.slice(0, 300)}`);

  // Walk forward from the opening bracket, tracking nesting depth (ignoring
  // brackets inside string literals) so trailing prose after the JSON block
  // doesn't break JSON.parse.
  const open = candidate[start];
  const close = open === "{" ? "}" : "]";
  let depth = 0;
  let inString = false;
  let escaped = false;
  let end = -1;
  for (let i = start; i < candidate.length; i++) {
    const ch = candidate[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') { inString = true; continue; }
    if (ch === open) depth++;
    else if (ch === close) { depth--; if (depth === 0) { end = i; break; } }
  }
  if (end === -1) throw new Error(`Unterminated JSON in model response: ${text.slice(0, 300)}`);
  return JSON.parse(candidate.slice(start, end + 1));
}
