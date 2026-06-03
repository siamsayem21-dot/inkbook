import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";

interface Props {
  children: React.ReactNode;
  params: { studio: string };
}

type StudioHeader = {
  name: string;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  font_choice: string | null;
};

export async function generateMetadata({
  params,
}: {
  params: { studio: string };
}): Promise<Metadata> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("studios")
    .select("name")
    .eq("subdomain", params.studio)
    .single();

  const studioName = (data as { name: string } | null)?.name;
  return { title: studioName ?? "Book Your Appointment" };
}

export default async function StudioBookingLayout({ children, params }: Props) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("studios")
    .select("name, logo_url, primary_color, secondary_color, font_choice")
    .eq("subdomain", params.studio)
    .single();

  const studio = data as StudioHeader | null;
  if (!studio) notFound();

  const primaryColor = studio.primary_color ?? "#D4AF37";
  const fontChoice = studio.font_choice ?? "default";
  const brandFont =
    fontChoice === "elegant"
      ? "var(--font-inter), system-ui, sans-serif"
      : "var(--font-cinzel), Georgia, serif";
  const fontWeight = fontChoice === "bold" ? "900" : undefined;

  return (
    <div
      className="min-h-screen bg-ink text-white"
      style={
        {
          "--brand-primary": primaryColor,
          "--brand-font": brandFont,
        } as React.CSSProperties
      }
    >
      <header className="sticky top-0 z-50 bg-ink/95 backdrop-blur-sm border-b border-white/[0.06] px-6 py-5">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          {studio.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={studio.logo_url}
              alt={studio.name}
              className="w-10 h-10 object-cover"
              style={{ outline: `1px solid ${primaryColor}4d` }}
            />
          ) : (
            <div
              className="w-10 h-10 flex items-center justify-center shrink-0"
              style={{ border: `1px solid ${primaryColor}66` }}
            >
              <span
                className="text-sm font-bold"
                style={{ color: primaryColor, fontFamily: brandFont, fontWeight }}
              >
                {studio.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <span
            className="font-bold tracking-wide text-base"
            style={{ fontFamily: brandFont, fontWeight }}
          >
            {studio.name}
          </span>
        </div>
      </header>
      {children}
    </div>
  );
}
