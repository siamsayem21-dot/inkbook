import { createAdminClient } from "@/lib/supabase/admin";

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
