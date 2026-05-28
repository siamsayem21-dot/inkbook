import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/supabase/types";

export async function getCurrentUser() {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

export async function getUserRole(userId: string): Promise<UserRole | null> {
  const supabase = createClient();

  // Check if user owns a studio
  const { data: studio } = await supabase
    .from("studios")
    .select("id")
    .eq("owner_id", userId)
    .single();

  if (studio) return "owner";

  // Check if user is an artist
  const { data: artist } = await supabase
    .from("artists")
    .select("id")
    .eq("user_id", userId)
    .single();

  if (artist) return "artist";

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
