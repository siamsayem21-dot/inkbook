import { NextResponse } from "next/server";
import { checkRateLimit, getClientIp, rateLimitedResponse } from "@/lib/rate-limit";

const FALLBACK_QUESTIONS = [
  "Do you have any existing tattoos in or near this area?",
  "Are you open to a fully custom design, or working from a specific reference image?",
  "What is your preferred timeline — do you have a target date in mind?",
  "Is there any personal meaning or significance behind this piece?",
  "How flexible are you on the final design details?",
];

export async function POST(req: Request) {
  const rl = checkRateLimit(`consult-q:${getClientIp(req)}`, 20);
  if (!rl.allowed) return rateLimitedResponse(rl.retryAfter);

  try {
    const body = await req.json();
    const { description, placement, size, colorPreference, budgetRange } = body;

    if (!description || !placement) {
      return NextResponse.json({ questions: FALLBACK_QUESTIONS });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ questions: FALLBACK_QUESTIONS });
    }

    const colorLabel =
      colorPreference === "color" ? "Color"
      : colorPreference === "black_grey" ? "Black & Grey"
      : "Open to both";

    const prompt = `You are an assistant for a professional tattoo studio. A client just submitted a consultation form. Generate 4–5 specific follow-up questions to help the artist prepare and qualify this lead.

Client's consultation:
- Description: ${description}
- Placement: ${placement}
- Size: ${size}
- Color preference: ${colorLabel}
- Budget: ${budgetRange}

Requirements:
- Ask practical questions a tattoo artist would genuinely need answered
- Cover: style specifics (if unclear), timeline, existing tattoos nearby, design flexibility, and any meaningful context
- Be conversational, not clinical
- Return ONLY a JSON array of question strings. No other text.

Example format: ["Question 1?", "Question 2?"]`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 512,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) throw new Error(`Anthropic ${res.status}`);

    const data = await res.json();
    const text: string = data.content?.[0]?.text ?? "";
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) throw new Error("No JSON array in response");

    const questions = (JSON.parse(match[0]) as string[]).slice(0, 5);
    return NextResponse.json({ questions });
  } catch (err) {
    console.error("[consultation-questions]", err);
    return NextResponse.json({ questions: FALLBACK_QUESTIONS });
  }
}
