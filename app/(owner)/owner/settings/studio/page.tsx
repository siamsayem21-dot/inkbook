import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/config";
import { createAdminClient } from "@/lib/supabase/admin";
import StudioSettingsClient from "./StudioSettingsClient";

export default async function StudioSettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = createAdminClient();
  const { data: studioRaw } = await supabase
    .from("studios")
    .select("id, name, subdomain, address, state")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!studioRaw) redirect("/onboarding");

  const studio = studioRaw as {
    id: string;
    name: string;
    subdomain: string;
    address: string | null;
    state: string | null;
  };

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
