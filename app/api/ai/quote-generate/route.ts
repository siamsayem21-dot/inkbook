import { NextResponse } from "next/server";

function fallback() {
  return {
    priceLow:         300,
    priceHigh:        600,
    sessionsEstimate: 1,
    hoursLow:         2,
    hoursHigh:        4,
    difficulty:       "Medium",
    reasoning:
      "Quote could not be auto-generated. Please review the consultation details and set a price manually based on your studio's hourly rate and the complexity of the design.",
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { description, placement, size, colorPreference, budget, style, aiNotes } = body;

    if (!description || !placement) {
      return NextResponse.json(fallback());
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(fallback());
    }

    const colorLabel =
      colorPreference === "color"       ? "Full color"
      : colorPreference === "black_grey" ? "Black & grey"
      : "Open to both";

    const prompt = `You are a professional tattoo studio manager with 15+ years of experience pricing custom tattoo work in the USA.

A client submitted this consultation. Generate a professional quote recommendation.

Consultation:
- Style: ${style || "Not specified"}
- Description: ${description}
- Placement: ${placement}
- Size: ${size}
- Color: ${colorLabel}
- Client's stated budget: ${budget}
${aiNotes ? `- AI notes: ${aiNotes}` : ""}

Studio context:
- Professional custom tattoo studio, USA market
- Typical rate: $150–$250/hour depending on complexity
- Deposits are mandatory; quotes are for the full session cost

Assess the work and return ONLY a JSON object in exactly this format (no other text):
{
  "priceLow": <integer dollars, no cents, realistic minimum>,
  "priceHigh": <integer dollars, no cents, realistic maximum>,
  "sessionsEstimate": <integer 1–10>,
  "hoursLow": <number one decimal, minimum hours>,
  "hoursHigh": <number one decimal, maximum hours>,
  "difficulty": "Easy" | "Medium" | "Hard",
  "reasoning": "<3–4 sentences covering: what drives the complexity and time estimate, color vs linework considerations, whether the client's stated budget is realistic, and any session structure recommendation>"
}

Difficulty guide:
- Easy: simple linework, minimal shading, under 3 hours
- Medium: moderate detail, some shading or color, 3–8 hours
- Hard: high realism, intricate detail, full sleeves/backs, 8+ hours`;

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
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON in response");

    const result = JSON.parse(match[0]);

    // Sanitise
    if (!["Easy", "Medium", "Hard"].includes(result.difficulty)) result.difficulty = "Medium";
    result.priceLow         = Math.max(0, Math.round(result.priceLow  ?? 0));
    result.priceHigh        = Math.max(result.priceLow, Math.round(result.priceHigh ?? 0));
    result.sessionsEstimate = Math.max(1, Math.round(result.sessionsEstimate ?? 1));
    result.hoursLow         = Math.max(0.5, parseFloat((result.hoursLow  ?? 1).toFixed(1)));
    result.hoursHigh        = Math.max(result.hoursLow, parseFloat((result.hoursHigh ?? 2).toFixed(1)));

    return NextResponse.json(result);
  } catch (err) {
    console.error("[quote-generate]", err);
    return NextResponse.json(fallback());
  }
}
