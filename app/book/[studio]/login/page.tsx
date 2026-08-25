export const dynamic = "force-dynamic";

import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth/config";
import { getBrand } from "@/lib/brand";
import EmailLoginForm from "./EmailLoginForm";

interface Props {
  params: { studio: string };
}

export default async function ClientLoginPage({ params }: Props) {
  const supabase = createAdminClient();
  const { data: studioData } = await supabase
    .from("studios")
    .select("id, name, primary_color")
    .eq("subdomain", params.studio)
    .single();

  const studio = studioData as { id: string; name: string; primary_color: string | null } | null;
  if (!studio) notFound();

  // Already signed in — skip straight to the portal.
  const user = await getCurrentUser();
  if (user) redirect(`/portal/${params.studio}/dashboard`);

  const brand = getBrand(studio.primary_color ?? "#D4AF37");

  return (
    <div className="min-h-screen bg-[#FAF9FC] text-zinc-900">
      <div className="max-w-md mx-auto px-4 sm:px-6 py-8 md:py-14">
        <Link
          href={`/book/${params.studio}`}
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 transition-colors mb-8"
        >
          ← Back to {studio.name}
        </Link>

        <div className="mb-8">
          <div
            className="inline-flex items-center gap-2.5 px-4 py-1.5 mb-5 rounded-full"
            style={{ border: `1px solid ${brand.full}40` }}
          >
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: brand.full }} />
            <span className="text-[10px] uppercase tracking-widest" style={{ color: brand.full }}>
              Client Access
            </span>
          </div>
          <h1 className="font-serif text-3xl md:text-4xl tracking-wide mb-3 text-zinc-900">Sign in to continue</h1>
          <p className="text-zinc-500 text-sm leading-relaxed">
            Enter your email and we&apos;ll send you a 6-digit code to verify it&apos;s you. No password needed.
          </p>
        </div>

        <EmailLoginForm
          studioSlug={params.studio}
          brandColor={brand.full}
          textOnBrand={brand.textOnBrand}
        />
      </div>
    </div>
  );
}
