export const dynamic = "force-dynamic";

import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth/config";
import { getBrand } from "@/lib/brand";
import OtpVerifyForm from "./OtpVerifyForm";

interface Props {
  params: { studio: string };
  searchParams: { email?: string };
}

export default async function ClientVerifyPage({ params, searchParams }: Props) {
  const supabase = createAdminClient();
  const { data: studioData } = await supabase
    .from("studios")
    .select("id, name, primary_color")
    .eq("subdomain", params.studio)
    .single();

  const studio = studioData as { id: string; name: string; primary_color: string | null } | null;
  if (!studio) notFound();

  const email = searchParams.email;
  if (!email) redirect(`/book/${params.studio}/login`);

  const user = await getCurrentUser();
  if (user) redirect(`/portal/${params.studio}/dashboard`);

  const brand = getBrand(studio.primary_color ?? "#D4AF37");

  return (
    <div className="min-h-screen bg-[#080808]">
      <div className="max-w-md mx-auto px-4 sm:px-6 py-8 md:py-14">
        <Link
          href={`/book/${params.studio}/login`}
          className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition-colors mb-8"
        >
          ← Use a different email
        </Link>

        <div className="mb-8">
          <div
            className="inline-flex items-center gap-2.5 px-4 py-1.5 mb-5"
            style={{ border: `1px solid ${brand.full}40` }}
          >
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: brand.full }} />
            <span className="text-[10px] uppercase tracking-widest" style={{ color: `${brand.full}cc` }}>
              Verify Your Email
            </span>
          </div>
          <h1 className="font-serif text-3xl md:text-4xl tracking-wide mb-3">Enter your code</h1>
          <p className="text-zinc-400 text-sm leading-relaxed">
            We sent a 6-digit code to <span className="text-zinc-200 font-medium">{email}</span>.
          </p>
        </div>

        <OtpVerifyForm
          studioSlug={params.studio}
          email={email}
          brandColor={brand.full}
          textOnBrand={brand.textOnBrand}
        />
      </div>
    </div>
  );
}
