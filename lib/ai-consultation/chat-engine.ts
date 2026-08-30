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

// Asked once each, in order, after every required field is filled — client
// may answer "no preference"/"none"/"skip", which still counts as filled
// (a real value, just an opt-out one) so the guard below doesn't re-ask.
const OPTIONAL_FIELDS = ["preferredArtist", "preferredDates", "medicalNotes", "additionalNotes"] as const;
type OptionalField = (typeof OPTIONAL_FIELDS)[number];

const OPTIONAL_PROMPTS: Record<OptionalField, string> = {
  preferredArtist: "Do you have a preferred artist for this piece, or no preference?",
  preferredDates:  "Any preferred dates for the appointment, or are you flexible?",
  medicalNotes:    "Any medical conditions, allergies, or skin sensitivities the artist should know about? (Totally fine to say none.)",
  additionalNotes: "Anything else you'd like the artist to know before we wrap up?",
};

const ALL_FIELDS = [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS] as const;
type AnyField = (typeof ALL_FIELDS)[number];

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

function firstMissingOptional(gathered: GatheredFields): OptionalField | null {
  return OPTIONAL_FIELDS.find((f) => !gathered[f]?.trim()) ?? null;
}

// The single, deterministic "what should we ask about next" selector — used
// both to steer the model (system prompt) and as the guard's override target
// when the model's own next question would be redundant. One question per
// missing field, chosen from data (which field is missing), not a scripted
// sequence of turns.
function nextQuestion(gathered: GatheredFields): { field: AnyField; prompt: string } | null {
  const req = firstMissingRequired(gathered);
  if (req) return { field: req, prompt: FALLBACK_PROMPTS[req] };
  const opt = firstMissingOptional(gathered);
  if (opt) return { field: opt, prompt: OPTIONAL_PROMPTS[opt] };
  return null;
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
- Extract EVERY piece of usable information from the client's latest message into "gathered", even if they answered more than one thing at once, phrased it vaguely, or answered a different question than the one you asked — never lose an answer they already gave.
- You must call the consultation_turn tool on every turn — never reply in plain text.`;
}

// The response shape is enforced structurally via tool_choice (see
// AnthropicProvider.chat), not by asking nicely in the prompt — a prompt-only
// "respond with ONLY JSON" instruction was measured to be ignored on ~80% of
// turns in a real production conversation once several fields were already
// known (the model would reply with plain conversational prose instead),
// silently discarding the client's answer every time. `askingAbout` is a
// second, independent deterministic check: the model self-reports which
// field (if any) its `reply` is asking about, so the app can verify that
// against `gathered` instead of trying to infer intent from free text — see
// the guard in runConsultationTurn.
function buildConsultationTool() {
  return {
    name: "consultation_turn",
    description: "Record your next reply to the client and the updated consultation state.",
    inputSchema: {
      type: "object",
      properties: {
        reply: { type: "string", description: "Your next message to the client." },
        gathered: {
          type: "object",
          description: "ALL fields known so far, merging anything new this turn with everything already known. Omit a key if still unknown.",
          properties: Object.fromEntries(ALL_FIELDS.map((f) => [f, { type: "string" }])),
        },
        askingAbout: {
          type: ["string", "null"],
          enum: [...ALL_FIELDS, null],
          description: "Which single field (from the fields-to-gather list) your `reply` is asking the client about, or null if it's not asking about a specific field (e.g. answering a studio question, or the closing message).",
        },
        complete: { type: "boolean", description: "true only once every required field is filled and you're wrapping up." },
      },
      required: ["reply", "gathered", "complete"],
    },
  };
}

export async function runConsultationTurn(params: {
  studioId: string;
  studioName: string;
  history: ChatMessageRow[];
  gathered: GatheredFields;
}): Promise<{ reply: string; gathered: GatheredFields; complete: boolean }> {
  const { studioId, studioName, history, gathered } = params;

  // Deterministic, data-driven fallback (never a fixed conversation script):
  // ask about whatever field is actually still missing — required first,
  // then optional. If literally nothing is missing, there's nothing left to
  // ask, so wrap up and complete right here rather than showing a dead-end
  // generic message forever (the exact bug this replaces: previously this
  // branch always said "Thanks — could you tell me a bit more about what
  // you're looking for?", which never advances and never accepts any new
  // answer, no matter what the client says next).
  const fallback = () => {
    const next = nextQuestion(gathered);
    if (next) return { reply: next.prompt, gathered, complete: false };
    return {
      reply: `Perfect, that's everything I need! Your consultation is on its way to ${studioName} — they'll be in touch soon.`,
      gathered,
      complete: isReadyToSubmit(gathered),
    };
  };

  if (!process.env.ANTHROPIC_API_KEY) return fallback();

  try {
    const knowledgeContext = formatKnowledgeForAI(await getStudioKnowledge(studioId));
    const systemPrompt = buildSystemPrompt(studioName, gathered, knowledgeContext);
    const anthropicMessages = await buildAnthropicMessages(history);

    const raw = await getAIProvider().chat({
      system: systemPrompt,
      messages: anthropicMessages,
      maxTokens: 1024,
      tool: buildConsultationTool(),
    });

    const parsed = JSON.parse(raw) as {
      reply?: string;
      gathered?: Partial<GatheredFields>;
      askingAbout?: AnyField | null;
      complete?: boolean;
    };
    const merged = mergeGathered(gathered, parsed.gathered ?? {});
    if (merged.style && !VALID_STYLES.includes(merged.style)) merged.style = "Other";

    let reply = parsed.reply?.trim() || fallback().reply;
    // Forcing tool_choice guarantees the JSON *shape* matches the schema,
    // not that boolean fields are semantically consistent with `reply`'s
    // text — observed live: the model wrote a clear, correct closing/recap
    // message ("I'm sending your consultation over to the studio now...")
    // but left `complete: false`, permanently stalling the conversation
    // (required fields were all filled, so there was nothing left to
    // extract on any future turn either). Same fix philosophy as the
    // askingAbout guard below: don't trust the model's self-reported flag
    // alone — a reply that isn't asking about any specific field, once
    // every required field is filled, IS a completion regardless of what
    // the model wrote into `complete`.
    const complete = isReadyToSubmit(merged) && (Boolean(parsed.complete) || !parsed.askingAbout);

    // Anti-loop guard: the model self-reports which field its `reply` is
    // asking about. If that field is already filled in `merged` (either
    // from before this turn, or just now from this same turn's answer),
    // the question is redundant — override deterministically with the
    // actual next missing field instead of trusting the model's repeat.
    if (!complete && parsed.askingAbout && ALL_FIELDS.includes(parsed.askingAbout) && merged[parsed.askingAbout]?.trim()) {
      const next = nextQuestion(merged);
      if (next) reply = next.prompt;
    }

    return { reply, gathered: merged, complete };
  } catch (err) {
    console.error("[runConsultationTurn]", err);
    return fallback();
  }
}
