import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { UserRole } from "@/lib/supabase/types";

// cache() deduplicates this call within a single request — the layout and every
// page component share one result instead of each creating a separate session read.
export const getCurrentUser = cache(async () => {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return null;
  return session.user;
});

// Resolves the authenticated user's studio ID.
// Owner:  auth.users.id → studios.owner_id → studio.id
// Artist: auth.users.id → artists.user_id  → artists.studio_id
// Returns null when the user is unauthenticated or has no associated studio.
// cache() deduplicates within a single request — layout + page share one result.
export const getStudioId = cache(async (): Promise<string | null> => {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = createAdminClient();

  const { data: studio } = await supabase
    .from("studios")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (studio) return (studio as { id: string }).id;

  const { data: artist } = await supabase
    .from("artists")
    .select("studio_id")
    .eq("user_id", user.id)
    .maybeSingle();

  return (artist as { studio_id: string } | null)?.studio_id ?? null;
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
