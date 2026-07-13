"use server";

import { createClient } from "@supabase/supabase-js";
import { getCurrentUser } from "@/lib/auth/config";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function checkSlugAvailable(slug: string): Promise<{ available: boolean }> {
  if (!slug || slug.length < 2) return { available: false };
  const supabase = adminClient();
  const { data } = await supabase
    .from("studios")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  return { available: !data };
}

export async function createStudio(data: {
  name: string;
  slug: string;
  phone: string;
  city: string;
  state: string;
  userId: string;
}): Promise<{ error?: string }> {
  // Creates a studio owned by a given user — a privileged action, so the
  // caller must be authenticated as that same user. Never trust a
  // client-supplied user id for this (same fix as POST /api/studios).
  const user = await getCurrentUser();
  if (!user || user.id !== data.userId) {
    return { error: "Unauthorized" };
  }

  const supabase = adminClient();

  // If they already own a studio, skip the insert — form will redirect to dashboard
  const { data: existing } = await supabase
    .from("studios")
    .select("id")
    .eq("owner_id", user.id)
    .limit(1);
  if (existing && existing.length > 0) return {};

  const { error } = await supabase.from("studios").insert({
    name: data.name,
    slug: data.slug,
    phone: data.phone,
    city: data.city,
    state: data.state,
    owner_id: user.id,
  });

  if (error) {
    if (error.code === "23505") return { error: "That slug is already taken. Try another." };
    return { error: "Something went wrong, try again." };
  }

  return {};
}
