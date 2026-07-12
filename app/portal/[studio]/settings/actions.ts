"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { ensureClientAccount } from "@/lib/auth/config";

const MAX_NAME_LENGTH = 100;

// Writes client_accounts.name (see supabase/migrations/20260714000000_client_accounts_name.sql).
// Clearing the name (empty string) is a valid save — stored as NULL, matching
// the column's nullable, "not yet set" default state.
export async function updateDisplayName(name: string): Promise<{ error?: string }> {
  const account = await ensureClientAccount();
  if (!account) return { error: "Not signed in." };

  const trimmed = name.trim().slice(0, MAX_NAME_LENGTH);

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("client_accounts")
    .update({ name: trimmed || null } as never)
    .eq("id", account.id);

  if (error) {
    console.error("[updateDisplayName] update failed:", error.message);
    return { error: "Failed to save — please try again." };
  }

  return {};
}
