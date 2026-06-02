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
    <div className="min-h-screen bg-ink text-white">
      <header className="sticky top-0 z-50 bg-ink/95 backdrop-blur-sm border-b border-white/[0.06] px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          {studio.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={studio.logo_url}
              alt={studio.name}
              className="w-8 h-8 object-cover ring-1 ring-gold/30"
            />
          ) : (
            <div className="w-8 h-8 border border-gold/40 flex items-center justify-center shrink-0">
              <span className="font-cinzel text-gold text-xs font-bold">
                {studio.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <span className="font-cinzel font-bold tracking-wide text-sm">{studio.name}</span>
          <span className="ml-auto label-xs text-zinc-700 hidden sm:block">
            Powered by InkBook
          </span>
        </div>
      </header>
      {children}
    </div>
  );
}
