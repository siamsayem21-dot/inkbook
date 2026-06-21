"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getStudioId } from "@/lib/auth/config";
import { revalidatePath } from "next/cache";

export type KnowledgeCategory = "policy" | "faq" | "style" | "pricing" | "general";

export async function createKnowledgeEntry(data: {
  category: KnowledgeCategory;
  title: string;
  content: string;
  isPublic: boolean;
}): Promise<{ error?: string; id?: string }> {
  const studioId = await getStudioId();
  if (!studioId) return { error: "Unauthorized" };

  if (!data.title.trim())   return { error: "Title is required" };
  if (!data.content.trim()) return { error: "Content is required" };

  const supabase = createAdminClient();

  // Place new entry after existing ones in the same category
  const { count } = await supabase
    .from("studio_knowledge")
    .select("id", { count: "exact", head: true })
    .eq("studio_id", studioId)
    .eq("category", data.category);

  const { data: row, error } = await supabase
    .from("studio_knowledge")
    .insert({
      studio_id:  studioId,
      category:   data.category,
      title:      data.title.trim(),
      content:    data.content.trim(),
      is_active:  true,
      is_public:  data.isPublic,
      sort_order: count ?? 0,
    } as never)
    .select("id")
    .single();

  if (error) {
    console.error("[createKnowledgeEntry]", error.message);
    return { error: "Failed to save — please try again" };
  }

  revalidatePath("/owner/knowledge");
  return { id: (row as { id: string }).id };
}

export async function updateKnowledgeEntry(data: {
  id: string;
  title: string;
  content: string;
  isPublic: boolean;
  isActive: boolean;
}): Promise<{ error?: string }> {
  const studioId = await getStudioId();
  if (!studioId) return { error: "Unauthorized" };

  if (!data.title.trim())   return { error: "Title is required" };
  if (!data.content.trim()) return { error: "Content is required" };

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("studio_knowledge")
    .update({
      title:     data.title.trim(),
      content:   data.content.trim(),
      is_public: data.isPublic,
      is_active: data.isActive,
    } as never)
    .eq("id", data.id)
    .eq("studio_id" as never, studioId);

  if (error) {
    console.error("[updateKnowledgeEntry]", error.message);
    return { error: "Failed to save — please try again" };
  }

  revalidatePath("/owner/knowledge");
  return {};
}

export async function deleteKnowledgeEntry(id: string): Promise<{ error?: string }> {
  const studioId = await getStudioId();
  if (!studioId) return { error: "Unauthorized" };

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("studio_knowledge")
    .delete()
    .eq("id", id)
    .eq("studio_id" as never, studioId);

  if (error) {
    console.error("[deleteKnowledgeEntry]", error.message);
    return { error: "Failed to delete — please try again" };
  }

  revalidatePath("/owner/knowledge");
  return {};
}

export async function toggleKnowledgeActive(
  id: string,
  isActive: boolean
): Promise<{ error?: string }> {
  const studioId = await getStudioId();
  if (!studioId) return { error: "Unauthorized" };

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("studio_knowledge")
    .update({ is_active: isActive } as never)
    .eq("id", id)
    .eq("studio_id" as never, studioId);

  if (error) return { error: "Failed to update" };

  revalidatePath("/owner/knowledge");
  return {};
}
