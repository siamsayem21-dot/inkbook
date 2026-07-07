import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getBrand } from "@/lib/brand";

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

const NAV_LINKS = [
  { href: "#about", label: "About" },
  { href: "#artists", label: "Artists" },
  { href: "#portfolio", label: "Portfolio" },
  { href: "#flash", label: "Flash" },
  { href: "#reviews", label: "Reviews" },
  { href: "#faq", label: "FAQ" },
];

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
  const brand = getBrand(primaryColor);
  const fontChoice = studio.font_choice ?? "default";
  const brandFont =
    fontChoice === "elegant"
      ? "var(--font-sans), system-ui, sans-serif"
      : "var(--font-serif), Georgia, serif";
  const fontWeight = fontChoice === "bold" ? "700" : undefined;

  return (
    <div
      className="min-h-screen bg-[#0A0A0A] text-white"
      style={
        {
          "--brand-primary": primaryColor,
          "--brand-font": brandFont,
        } as React.CSSProperties
      }
    >
      <header className="sticky top-0 z-50 bg-[#0A0A0A]/90 backdrop-blur-md border-b border-white/[0.06] px-4 sm:px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <a href="#top" className="flex items-center gap-3 min-w-0">
            {studio.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={studio.logo_url}
                alt={studio.name}
                className="w-9 h-9 object-cover shrink-0"
                style={{ outline: `1px solid ${primaryColor}4d` }}
              />
            ) : (
              <div
                className="w-9 h-9 flex items-center justify-center shrink-0"
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
              className="font-bold tracking-wide text-base truncate"
              style={{ fontFamily: brandFont, fontWeight }}
            >
              {studio.name}
            </span>
          </a>

          <nav className="hidden lg:flex items-center gap-6 shrink-0">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-xs font-semibold uppercase tracking-wide text-zinc-400 hover:text-white transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <a
            href={`/book/${params.studio}/consult`}
            className="shrink-0 text-xs font-bold uppercase tracking-widest px-4 sm:px-5 py-2.5 transition-opacity hover:opacity-90 whitespace-nowrap"
            style={{ backgroundColor: primaryColor, color: brand.textOnBrand }}
          >
            Start AI Consultation
          </a>
        </div>
      </header>
      {children}
    </div>
  );
}
