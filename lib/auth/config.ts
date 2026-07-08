import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { UserRole } from "@/lib/supabase/types";

// cache() deduplicates this call within a single request — the layout and every
// page component share one result instead of each creating a separate session read.
export const getCurrentUser = cache(async () => {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  return user;
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

  // .limit(1) — .maybeSingle() errors (and returns null) when multiple rows match
  const { data: studios } = await supabase
    .from("studios")
    .select("id")
    .eq("owner_id", user.id)
    .limit(1);

  if (studios && studios.length > 0) return (studios[0] as { id: string }).id;

  const { data: artists } = await supabase
    .from("artists")
    .select("studio_id")
    .eq("user_id", user.id)
    .limit(1);

  return (artists?.[0] as { studio_id: string } | undefined)?.studio_id ?? null;
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

  const { data: clientAccounts } = await supabase
    .from("client_accounts")
    .select("id")
    .eq("user_id", userId)
    .limit(1);

  if (clientAccounts && clientAccounts.length > 0) return "client";

  return null;
}

// Resolves the authenticated user's client_accounts row, creating it on first
// login (upsert keyed on user_id — safe to call on every portal request).
// Only the service-role client can insert into client_accounts (no public
// INSERT policy), so this always goes through createAdminClient().
export const ensureClientAccount = cache(async (): Promise<{ id: string; email: string } | null> => {
  const user = await getCurrentUser();
  if (!user?.email) return null;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("client_accounts")
    .upsert({ user_id: user.id, email: user.email } as never, { onConflict: "user_id" })
    .select("id, email")
    .single();

  if (error) {
    console.error("[ensureClientAccount] upsert failed:", error.message, "| user:", user.id);
    return null;
  }

  return data as { id: string; email: string };
});

export async function requireAuth(role?: UserRole) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthenticated");

  if (role) {
    const userRole = await getUserRole(user.id);
    if (userRole !== role) throw new Error("Forbidden");
  }

  return user;
}
