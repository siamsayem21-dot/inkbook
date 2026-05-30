"use server";

import { createClient } from "@supabase/supabase-js";

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
  const supabase = adminClient();
  const { error } = await supabase.from("studios").insert({
    name: data.name,
    slug: data.slug,
    phone: data.phone,
    city: data.city,
    state: data.state,
    owner_id: data.userId,
  });

  if (error) {
    if (error.code === "23505") return { error: "That slug is already taken. Try another." };
    return { error: "Something went wrong, try again." };
  }

  return {};
}
