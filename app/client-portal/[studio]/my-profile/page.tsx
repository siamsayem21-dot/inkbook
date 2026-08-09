export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser, ensureClientAccount } from "@/lib/auth/config";
import { formatDate } from "@/lib/utils";
import ProfileSummaryCard from "./_components/ProfileSummaryCard";
import PersonalInfoCard from "./_components/PersonalInfoCard";
import AccountSecurityCard from "./_components/AccountSecurityCard";
import PaymentSettingsCard from "./_components/PaymentSettingsCard";
import PrivacyAccountCard from "./_components/PrivacyAccountCard";
import LogOutButton from "./_components/LogOutButton";

interface Props {
  params: { studio: string };
}

export default async function MyProfilePage({ params }: Props) {
  const supabase = createAdminClient();
  const { data: studioData } = await supabase
    .from("studios")
    .select("id, name")
    .eq("subdomain", params.studio)
    .single();

  const studio = studioData as { id: string; name: string } | null;
  if (!studio) notFound();

  const user = await getCurrentUser();
  if (!user) notFound();

  const account = await ensureClientAccount();
  if (!account) notFound();

  const { data: accountRow } = await supabase
    .from("client_accounts")
    .select("name, phone_number, date_of_birth, created_at")
    .eq("id", account.id)
    .maybeSingle();
  const row = accountRow as {
    name: string | null;
    phone_number: string | null;
    date_of_birth: string | null;
    created_at: string;
  } | null;

  const fullName = row?.name ?? null;
  const memberSinceLabel = row?.created_at ? formatDate(row.created_at) : null;
  const emailVerified = Boolean(user.email_confirmed_at);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-[28px] leading-tight font-bold text-zinc-900">My Profile</h1>
        <p className="text-sm text-zinc-500 mt-1.5">Manage your personal information and account settings.</p>
      </div>

      <ProfileSummaryCard fullName={fullName} email={account.email} verified={emailVerified} />

      <PersonalInfoCard
        initialName={fullName ?? ""}
        initialPhoneNumber={row?.phone_number ?? ""}
        initialDateOfBirth={row?.date_of_birth ?? ""}
        email={account.email}
      />

      <AccountSecurityCard verified={emailVerified} memberSinceLabel={memberSinceLabel} />

      <PaymentSettingsCard />

      <PrivacyAccountCard />

      <LogOutButton studioSlug={params.studio} />
    </div>
  );
}
