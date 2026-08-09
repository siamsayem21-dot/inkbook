import { redirect, notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser, ensureClientAccount } from "@/lib/auth/config";
import PortalHeader from "./_components/PortalHeader";

export const dynamic = "force-dynamic";

interface Props {
  children: React.ReactNode;
  params: { studio: string };
}

// New light-themed client portal shell (Home / My Tattoos / My Profile / Studio).
// Reuses the same auth wiring as the existing dark portal at app/portal/[studio]
// (getCurrentUser, ensureClientAccount, studio-by-subdomain lookup) but renders
// its own header instead of app/portal/[studio]'s sidebar, so the two visual
// systems don't collide inside a single layout tree.
export default async function ClientPortalLayout({ children, params }: Props) {
  const supabase = createAdminClient();
  const { data: studioData } = await supabase
    .from("studios")
    .select("id, name")
    .eq("subdomain", params.studio)
    .single();

  const studio = studioData as { id: string; name: string } | null;
  if (!studio) notFound();

  const user = await getCurrentUser();
  if (!user) redirect(`/book/${params.studio}/login`);

  const account = await ensureClientAccount();
  if (!account) redirect(`/book/${params.studio}/login`);

  return (
    <div className="min-h-screen" style={{ background: "#FAF9FC" }}>
      <PortalHeader studioSlug={params.studio} studioName={studio.name} clientEmail={account.email} />
      <main className="max-w-[1640px] mx-auto px-4 sm:px-6 lg:px-8 py-7">{children}</main>
    </div>
  );
}
