export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStudioId } from "@/lib/auth/config";
import StudioSettingsClient from "./StudioSettingsClient";

type StudioRow = {
  id: string;
  name: string;
  subdomain: string;
  address: string | null;
  state: string | null;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  font_choice: string | null;
};

export default async function StudioSettingsPage() {
  const studioId = await getStudioId();
  if (!studioId) redirect("/login");

  const supabase = createAdminClient();
  const { data: studioRaw } = await supabase
    .from("studios")
    .select("id, name, subdomain, address, state, logo_url, primary_color, secondary_color, font_choice")
    .eq("id", studioId)
    .maybeSingle();

  const studio = studioRaw as StudioRow | null;

  if (!studio) {
    return (
      <div className="-m-4 -mt-16 md:-m-8 min-h-[calc(100vh-3rem)] md:min-h-screen" style={{ background: "#FAF9FC" }}>
        <div className="p-4 pt-16 md:p-8 space-y-6 max-w-xl">
          <h1 className="text-2xl md:text-3xl font-bold text-zinc-900">Studio profile</h1>
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6 text-center">
            <p className="text-zinc-500 text-sm">Studio not found.</p>
            <p className="text-zinc-400 text-xs mt-1">Contact support if this issue persists.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="-m-4 -mt-16 md:-m-8 min-h-[calc(100vh-3rem)] md:min-h-screen" style={{ background: "#FAF9FC" }}>
      <div className="p-4 pt-16 md:p-8 space-y-6 max-w-xl">
        <h1 className="text-2xl md:text-3xl font-bold text-zinc-900">Studio profile</h1>
        <StudioSettingsClient
          studioId={studio.id}
          initialName={studio.name}
          initialSubdomain={studio.subdomain ?? ""}
          initialAddress={studio.address ?? ""}
          initialState={studio.state ?? ""}
          initialLogoUrl={studio.logo_url ?? ""}
          initialPrimaryColor={studio.primary_color ?? "#D4AF37"}
          initialSecondaryColor={studio.secondary_color ?? "#FFFFFF"}
          initialFontChoice={studio.font_choice ?? "default"}
        />
      </div>
    </div>
  );
}
