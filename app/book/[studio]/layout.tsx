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
      <header className="sticky top-0 z-50 bg-ink/95 backdrop-blur-sm border-b border-white/10 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          {studio.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={studio.logo_url}
              alt={studio.name}
              className="w-8 h-8 rounded-full object-cover ring-2 ring-gold/40"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gold flex items-center justify-center shrink-0">
              <span className="text-black text-xs font-black">
                {studio.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <span className="font-bold">{studio.name}</span>
          <span className="ml-auto text-[11px] text-white/20 tracking-widest uppercase hidden sm:block">
            Powered by InkBook
          </span>
        </div>
      </header>
      {children}
    </div>
  );
}
