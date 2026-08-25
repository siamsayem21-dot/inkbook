export const dynamic = "force-dynamic";

import { createAdminClient } from "@/lib/supabase/admin";
import { ensureClientAccount } from "@/lib/auth/config";
import SettingsForm from "./SettingsForm";

export default async function SettingsPage() {
  const account = await ensureClientAccount();

  let name = "";
  if (account) {
    const supabase = createAdminClient();
    const { data } = await supabase.from("client_accounts").select("name").eq("id", account.id).maybeSingle();
    name = (data as { name: string | null } | null)?.name ?? "";
  }

  return (
    <div className="max-w-lg">
      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2">Client Portal</p>
      <h1 className="font-serif text-2xl md:text-3xl tracking-wide mb-3 text-zinc-900">Settings</h1>
      <p className="text-zinc-500 text-sm leading-relaxed">Manage your account details.</p>

      <div className="mt-8 bg-white rounded-2xl border border-zinc-200 shadow-sm divide-y divide-zinc-100">
        <SettingsForm initialName={name} />
        <div className="px-6 py-4">
          <p className="text-[10px] uppercase tracking-widest text-zinc-400 mb-1">Email</p>
          <p className="text-sm text-zinc-900">{account?.email ?? "—"}</p>
        </div>
        <div className="px-6 py-4">
          <p className="text-[10px] uppercase tracking-widest text-zinc-400 mb-1">Sign-in method</p>
          <p className="text-sm text-zinc-900">Email verification code</p>
        </div>
      </div>
    </div>
  );
}
