import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/supabase/types";

// cache() deduplicates this call within a single request — the layout and every
// page component share one result instead of each creating a separate session read.
export const getCurrentUser = cache(async () => {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return null;
  return session.user;
});

export async function getUserRole(userId: string): Promise<UserRole | null> {
  const supabase = createClient();

  // .limit(1) — .single() returns null when multiple rows match
  const { data: studios } = await supabase
    .from("studios")
    .select("id")
    .eq("owner_id", userId)
    .limit(1);

  if (studios && studios.length > 0) return "owner";

  const { data: artists } = await supabase
    .from("artists")
    .select("id")
    .eq("user_id", userId)
    .limit(1);

  if (artists && artists.length > 0) return "artist";

  return null;
}

export async function requireAuth(role?: UserRole) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthenticated");

  if (role) {
    const userRole = await getUserRole(user.id);
    if (userRole !== role) throw new Error("Forbidden");
  }

  return user;
}
