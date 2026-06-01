import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/config";
import { createAdminClient } from "@/lib/supabase/admin";
import StudioSettingsClient from "./StudioSettingsClient";

type StudioRow = {
  id: string;
  name: string;
  subdomain: string;
  address: string | null;
  state: string | null;
};

export default async function StudioSettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = createAdminClient();
  const { data: studioRaw } = await supabase
    .from("studios")
    .select("id, name, subdomain, address, state")
    .eq("owner_id", user.id)
    .limit(1);

  const studio = (studioRaw as StudioRow[] | null)?.[0] ?? null;

  if (!studio) {
    return (
      <div className="max-w-xl space-y-6">
        <h1 className="text-2xl font-bold">Studio profile</h1>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-center">
          <p className="text-zinc-400 text-sm">Studio not found for your account.</p>
          <p className="text-zinc-600 text-xs mt-1">Contact support if this issue persists.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-bold">Studio profile</h1>
      <StudioSettingsClient
        studioId={studio.id}
        initialName={studio.name}
        initialSubdomain={studio.subdomain ?? ""}
        initialAddress={studio.address ?? ""}
        initialState={studio.state ?? ""}
      />
    </div>
  );
}
