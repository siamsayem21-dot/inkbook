import { NextResponse } from "next/server";
import { checkRateLimit, getClientIp, rateLimitedResponse } from "@/lib/rate-limit";
import { getStudioKnowledge, formatKnowledgeForAI } from "@/lib/studio-knowledge";
import { getAIProvider } from "@/lib/ai";

const VALID_STYLES = [
  "Traditional", "Neo Traditional", "Japanese", "Fine Line",
  "Blackwork", "Realism", "Floral", "Geometric", "Tribal", "Watercolor", "Other",
];

export async function POST(req: Request) {
  const rl = checkRateLimit(`style-detect:${getClientIp(req)}`, 20);
  if (!rl.allowed) return rateLimitedResponse(rl.retryAfter);

  try {
    const body = await req.json();
    const { description, placement, colorPreference, size, followupAnswers, studioId } = body;

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(fallback());
    }

    const answersText = Object.entries(followupAnswers as Record<string, string>)
      .filter(([, v]) => v?.trim())
      .map(([k, v]) => `Q: ${k}\nA: ${v}`)
      .join("\n");

    const knowledgeContext = studioId
      ? formatKnowledgeForAI(await getStudioKnowledge(studioId as string))
      : "";

    const prompt = `You are an expert tattoo style analyst working with a professional tattoo studio.
${knowledgeContext ? `\n${knowledgeContext}\n` : ""}

Consultation details:
- Description: ${description}
- Placement: ${placement}
- Size: ${size}
- Color preference: ${colorPreference}
${answersText ? `\nFollow-up Q&A:\n${answersText}` : ""}

Classify the most fitting tattoo style from this exact list:
${VALID_STYLES.join(", ")}

Respond ONLY with a JSON object in exactly this format (no other text):
{
  "style": "<one style from the list above>",
  "confidence": <integer 0-100>,
  "reasoning": "<one sentence explaining why this style fits>",
  "aiNotes": "<2-3 sentences of professional notes for the tattoo artist about this client and their vision — include anything that will help the artist prepare for the consult>"
}`;

    const text = await getAIProvider().extract({ prompt });
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON in response");

    const result = JSON.parse(match[0]);
    if (!VALID_STYLES.includes(result.style)) result.style = "Other";

    return NextResponse.json(result);
  } catch (err) {
    console.error("[style-detect]", err);
    return NextResponse.json(fallback());
  }
}

function fallback() {
  return {
    style: "Other",
    confidence: 50,
    reasoning: "Style could not be determined from the provided information.",
    aiNotes: "Please discuss style preferences directly with the client. Review their reference images and description carefully to identify the right direction before quoting.",
  };
}
