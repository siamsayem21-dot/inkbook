import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";

interface Props {
  children: React.ReactNode;
  params: { studio: string };
}

type StudioHeader = { name: string; logo_url: string | null };

export default async function StudioBookingLayout({ children, params }: Props) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("studios")
    .select("name, logo_url")
    .eq("subdomain", params.studio)
    .single();

  const studio = data as StudioHeader | null;
  if (!studio) notFound();

  return (
    <div className="min-h-screen bg-white text-zinc-900">
      <header className="border-b border-zinc-200 px-6 py-4 flex items-center gap-3">
        {studio.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={studio.logo_url} alt={studio.name} className="w-8 h-8 rounded-full object-cover" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {studio.name.charAt(0).toUpperCase()}
          </div>
        )}
        <span className="font-bold text-lg">{studio.name}</span>
        <span className="ml-auto text-xs text-zinc-400">Powered by InkBook</span>
      </header>
      {children}
    </div>
  );
}
