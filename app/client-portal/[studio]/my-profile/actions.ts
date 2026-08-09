"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { ensureClientAccount } from "@/lib/auth/config";

const MAX_NAME_LENGTH = 100;
const MAX_PHONE_LENGTH = 30;

export type ProfileUpdateInput = {
  name: string;
  phoneNumber: string;
  dateOfBirth: string; // "" or "YYYY-MM-DD" (native <input type="date"> format)
};

// Persists client_accounts.name / phone_number / date_of_birth together — see
// supabase/migrations/20260809000000_client_accounts_phone_dob.sql for the
// two new nullable columns. Scoped to this My Profile module specifically
// (kept separate from app/portal/[studio]/settings/actions.ts's
// updateDisplayName(), which the old dark portal's own Settings page still
// calls with just a name) so this page's edits never touch that route.
// Empty fields are valid saves — cleared to NULL, matching name's own
// existing "not yet set" convention.
export async function updateProfile(input: ProfileUpdateInput): Promise<{ error?: string }> {
  const account = await ensureClientAccount();
  if (!account) return { error: "Not signed in." };

  const name = input.name.trim().slice(0, MAX_NAME_LENGTH);
  const phoneNumber = input.phoneNumber.trim().slice(0, MAX_PHONE_LENGTH);
  const dateOfBirth = input.dateOfBirth.trim();

  if (dateOfBirth) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth) || Number.isNaN(new Date(dateOfBirth).getTime())) {
      return { error: "Please enter a valid date of birth." };
    }
    if (new Date(dateOfBirth).getTime() > Date.now()) {
      return { error: "Date of birth can't be in the future." };
    }
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("client_accounts")
    .update({
      name: name || null,
      phone_number: phoneNumber || null,
      date_of_birth: dateOfBirth || null,
    } as never)
    .eq("id", account.id);

  if (error) {
    console.error("[updateProfile] update failed:", error.message);
    return { error: "Failed to save — please try again." };
  }

  return {};
}
