import { createAdminClient } from "@/lib/supabase/admin";
import { getStudioId } from "@/lib/auth/config";

export type KnowledgeEntry = {
  id: string;
  category: "policy" | "faq" | "style" | "pricing" | "general";
  title: string;
  content: string;
  is_active: boolean;
  is_public: boolean;
  sort_order: number;
};

const CATEGORY_LABEL: Record<KnowledgeEntry["category"], string> = {
  policy:  "Studio Policy",
  faq:     "FAQ",
  style:   "Style & Specialties",
  pricing: "Pricing Context",
  general: "Studio Info",
};

/**
 * Fetch all active knowledge entries for a studio.
 * Used by AI consultation/quote/style-detect consumers — inactive entries
 * must never appear in AI context, so this stays active-only.
 * Returns empty array if the table doesn't exist yet (migration pending).
 */
export async function getStudioKnowledge(studioId: string): Promise<KnowledgeEntry[]> {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("studio_knowledge")
      .select("id, category, title, content, is_active, is_public, sort_order")
      .eq("studio_id", studioId)
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    return (data ?? []) as KnowledgeEntry[];
  } catch {
    return [];
  }
}

/**
 * Fetch every knowledge entry for a studio, active and disabled alike.
 * Used only by the owner's own management page, so a disabled entry stays
 * visible (and re-enableable) after a refresh instead of disappearing.
 * AI/public consumers must keep using getStudioKnowledge()/getPublicFaq()
 * above, unchanged.
 */
export async function getAllStudioKnowledge(studioId: string): Promise<KnowledgeEntry[]> {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("studio_knowledge")
      .select("id, category, title, content, is_active, is_public, sort_order")
      .eq("studio_id", studioId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    return (data ?? []) as KnowledgeEntry[];
  } catch {
    return [];
  }
}

/**
 * Fetch only public FAQ entries (shown on the booking page).
 */
export async function getPublicFaq(studioId: string): Promise<KnowledgeEntry[]> {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("studio_knowledge")
      .select("id, category, title, content, is_active, is_public, sort_order")
      .eq("studio_id", studioId)
      .eq("is_active", true)
      .eq("is_public", true)
      .order("sort_order", { ascending: true });
    return (data ?? []) as KnowledgeEntry[];
  } catch {
    return [];
  }
}

/**
 * Fetch the right knowledge tier for whoever is actually calling an AI route
 * with this studioId. These AI routes (consultation-questions, quote-generate,
 * style-detect) are reachable both by the public, unauthenticated consult
 * wizard AND by the studio's own authenticated owner/artist consultation-detail
 * views, with the SAME endpoint and no other distinguishing signal — so the
 * only safe way to decide "does this caller get the studio's private
 * (is_public=false) notes folded into the AI prompt" is to check whether
 * their own session actually resolves to this exact studio. Anyone else
 * (anonymous, or authenticated as a different studio) gets public-only
 * knowledge — the same tier already shown on that studio's public booking
 * page — so a caller who only knows/guesses a studioId can never pull a
 * studio's internal pricing/staff notes into an AI response.
 */
export async function getKnowledgeForCaller(studioId: string): Promise<KnowledgeEntry[]> {
  const sessionStudioId = await getStudioId();
  if (sessionStudioId && sessionStudioId === studioId) {
    return getStudioKnowledge(studioId);
  }
  return getPublicFaq(studioId);
}

/**
 * Format knowledge entries as a concise block for injection into AI prompts.
 * Grouped by category, truncated per-entry to keep tokens reasonable.
 */
export function formatKnowledgeForAI(entries: KnowledgeEntry[]): string {
  if (entries.length === 0) return "";

  const grouped = new Map<string, KnowledgeEntry[]>();
  for (const e of entries) {
    const key = CATEGORY_LABEL[e.category] ?? e.category;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(e);
  }

  const lines: string[] = ["--- Studio-Specific Context ---"];
  grouped.forEach((items, label) => {
    lines.push(`\n[${label}]`);
    for (const item of items) {
      const body = item.content.length > 400
        ? item.content.slice(0, 400) + "…"
        : item.content;
      lines.push(`${item.title}: ${body}`);
    }
  });
  lines.push("--- End Studio Context ---");
  return lines.join("\n");
}
