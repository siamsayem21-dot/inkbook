export const dynamic = "force-dynamic";

import { createAdminClient } from "@/lib/supabase/admin";
import StudioSettingsClient from "./StudioSettingsClient";

const STUDIO_ID = "5fe382a1-fee7-4387-b625-4bf7a52b8f45";

type StudioRow = {
  id: string;
  name: string;
  subdomain: string;
  address: string | null;
  state: string | null;
};

export default async function StudioSettingsPage() {
  const supabase = createAdminClient();
  const { data: studioRaw } = await supabase
    .from("studios")
    .select("id, name, subdomain, address, state")
    .eq("id", STUDIO_ID)
    .maybeSingle();

  const studio = studioRaw as StudioRow | null;

  if (!studio) {
    return (
      <div className="max-w-xl space-y-6">
        <h1 className="text-2xl font-bold">Studio profile</h1>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-center">
          <p className="text-zinc-400 text-sm">Studio not found.</p>
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
