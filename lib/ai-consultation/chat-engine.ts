import { getStudioKnowledge, formatKnowledgeForAI } from "@/lib/studio-knowledge";
import { getAIProvider, type AIMessage } from "@/lib/ai";

export type GatheredFields = {
  name?: string;
  phone?: string;
  description?: string;
  placement?: string;
  size?: string;
  style?: string;
  color?: string;
  budget?: string;
  preferredArtist?: string;
  preferredDates?: string;
  medicalNotes?: string;
  additionalNotes?: string;
};

export type ChatMessageRow = {
  role: "user" | "assistant";
  content: string;
  image_url: string | null;
};

// Fields that must be filled (non-empty) before a consultation can be submitted.
// "name"/"phone" aren't in the product's gather list but are required to create
// the `consultations` row (client_name/client_phone are NOT NULL there).
const REQUIRED_FIELDS = [
  "name", "phone", "description", "placement", "size", "style", "color", "budget",
] as const;
type RequiredField = (typeof REQUIRED_FIELDS)[number];

const FALLBACK_PROMPTS: Record<RequiredField, string> = {
  name:        "First — what's your name?",
  phone:       "What's the best phone number for the studio to reach you at?",
  description: "Tell me about the tattoo idea you have in mind — what imagery or concept are you going for?",
  placement:   "Where on your body are you thinking of placing it?",
  size:        "About how big are you picturing it — roughly in inches, or compared to something like a palm or a forearm panel?",
  style:       "Is there a tattoo style you're drawn to — traditional, fine line, realism, blackwork, something else?",
  color:       "Are you thinking full color, or black & grey?",
  budget:      "Do you have a budget range in mind for this piece?",
};

const VALID_STYLES = [
  "Traditional", "Neo Traditional", "Japanese", "Fine Line",
  "Blackwork", "Realism", "Floral", "Geometric", "Tribal", "Watercolor", "Other",
];

export function isReadyToSubmit(gathered: GatheredFields): boolean {
  return REQUIRED_FIELDS.every((f) => Boolean(gathered[f]?.trim()));
}

function firstMissingRequired(gathered: GatheredFields): RequiredField | null {
  return REQUIRED_FIELDS.find((f) => !gathered[f]?.trim()) ?? null;
}

function mergeGathered(prev: GatheredFields, next: Partial<GatheredFields>): GatheredFields {
  const merged: GatheredFields = { ...prev };
  for (const key of Object.keys(next) as (keyof GatheredFields)[]) {
    const value = next[key];
    if (typeof value === "string" && value.trim()) merged[key] = value.trim();
  }
  return merged;
}

async function imageUrlToContentBlock(url: string): Promise<
  { type: "image"; source: { type: "base64"; media_type: string; data: string } } | null
> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const mediaType = res.headers.get("content-type") ?? "image/jpeg";
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(mediaType)) return null;
    const buf = await res.arrayBuffer();
    const data = Buffer.from(buf).toString("base64");
    return { type: "image", source: { type: "base64", media_type: mediaType, data } };
  } catch {
    return null;
  }
}

// Only the most recent image is sent as real image data (Claude vision) — older
// image messages are represented as a text placeholder so token usage stays
// bounded as the conversation grows. Anthropic's Messages API requires the
// array to start with a "user" role, so the seeded assistant greeting (if it's
// the very first row) is dropped before building the request.
async function buildAnthropicMessages(history: ChatMessageRow[]): Promise<AIMessage[]> {
  const trimmed = history[0]?.role === "assistant" ? history.slice(1) : history;
  const lastImagePos = trimmed.reduce((acc, m, i) => (m.image_url ? i : acc), -1);

  const messages: AIMessage[] = [];
  for (let i = 0; i < trimmed.length; i++) {
    const m = trimmed[i];
    if (m.image_url && i === lastImagePos) {
      const block = await imageUrlToContentBlock(m.image_url);
      messages.push({
        role: m.role,
        content: block
          ? [block, { type: "text", text: m.content || "(shared a reference image)" }]
          : (m.content || "(shared a reference image, which couldn't be loaded)"),
      });
    } else if (m.image_url) {
      messages.push({ role: m.role, content: `${m.content ? m.content + " " : ""}[client shared a reference image]` });
    } else {
      messages.push({ role: m.role, content: m.content });
    }
  }
  return messages;
}

function buildSystemPrompt(studioName: string, gathered: GatheredFields, knowledgeContext: string): string {
  const missing = firstMissingRequired(gathered);
  return `You are a warm, professional intake assistant for ${studioName}, a tattoo studio. You are chatting with a client who wants a tattoo consultation. Your job is ONLY to gather information for the artist — you are an assistant, not the artist.

${knowledgeContext ? `${knowledgeContext}\n` : ""}
Fields to gather (ask about ONE at a time, naturally, referencing what they've already told you — never repeat a question you already have an answer for):
- name (client's full name)
- phone (best phone number)
- description (the tattoo idea/concept)
- placement (where on the body)
- size (approximate size)
- style (tattoo style — try to map to one of: ${VALID_STYLES.join(", ")})
- color (color vs. black & grey)
- budget (a range is fine)
- preferredArtist (optional — accept "no preference")
- preferredDates (optional — accept "flexible"/"no preference")
- medicalNotes (ask once — any medical conditions, allergies, or skin sensitivities relevant to getting a tattoo; accept "none")
- additionalNotes (optional — anything else they want the artist to know)

Currently known: ${JSON.stringify(gathered)}
${missing ? `Still missing (required): ${missing}` : "All required fields are filled."}

Rules:
- Ask ONE question at a time. Keep it conversational and brief.
- If the client asks a studio-specific question (hours, policies, what styles the studio does, aftercare, etc.), answer using the studio context above, then gently return to gathering info.
- NEVER state or estimate a price, price range, or cost. If asked about pricing, say the studio will provide an exact quote after reviewing the consultation — you cannot give pricing.
- If the client shares a reference image, acknowledge it naturally and use it to help clarify style/description.
- Once ALL required fields above are filled AND you've asked about the optional ones (client may skip them), write a warm closing message letting them know their consultation is being sent to the studio, and set complete=true.
- Do not set complete=true until every required field has a real answer.

Respond with ONLY a JSON object in exactly this format, no other text:
{
  "reply": "<your next message to the client>",
  "gathered": <a JSON object with ALL fields known so far, merging anything new this turn with everything already known>,
  "complete": <true only once every required field is filled and you're wrapping up>
}`;
}

export async function runConsultationTurn(params: {
  studioId: string;
  studioName: string;
  history: ChatMessageRow[];
  gathered: GatheredFields;
}): Promise<{ reply: string; gathered: GatheredFields; complete: boolean }> {
  const { studioId, studioName, history, gathered } = params;

  const fallback = () => {
    const missing = firstMissingRequired(gathered);
    return {
      reply: missing ? FALLBACK_PROMPTS[missing] : "Thanks — could you tell me a bit more about what you're looking for?",
      gathered,
      complete: false,
    };
  };

  if (!process.env.ANTHROPIC_API_KEY) return fallback();

  try {
    const knowledgeContext = formatKnowledgeForAI(await getStudioKnowledge(studioId));
    const systemPrompt = buildSystemPrompt(studioName, gathered, knowledgeContext);
    const anthropicMessages = await buildAnthropicMessages(history);

    const text = await getAIProvider().chat({
      system: systemPrompt,
      messages: anthropicMessages,
      maxTokens: 1024,
    });

    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON object in response");

    const parsed = JSON.parse(match[0]) as { reply?: string; gathered?: Partial<GatheredFields>; complete?: boolean };
    const merged = mergeGathered(gathered, parsed.gathered ?? {});
    if (merged.style && !VALID_STYLES.includes(merged.style)) merged.style = "Other";

    return {
      reply: parsed.reply?.trim() || fallback().reply,
      gathered: merged,
      complete: Boolean(parsed.complete) && isReadyToSubmit(merged),
    };
  } catch (err) {
    console.error("[runConsultationTurn]", err);
    return fallback();
  }
}
