export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureClientAccount } from "@/lib/auth/config";
import { getBrand } from "@/lib/brand";
import { getOrCreateActiveChat, getLatestSubmittedConsultation } from "@/lib/ai-consultation/session";
import ConsultationChat from "./ConsultationChat";
import ProjectTimeline from "../_components/ProjectTimeline";

interface Props {
  params: { studio: string };
}

export default async function ConsultationPage({ params }: Props) {
  const supabase = createAdminClient();
  const { data: studioData } = await supabase
    .from("studios")
    .select("id, name, primary_color")
    .eq("subdomain", params.studio)
    .single();

  const studio = studioData as { id: string; name: string; primary_color: string | null } | null;
  if (!studio) notFound();

  const account = await ensureClientAccount();
  if (!account) notFound();

  const brand = getBrand(studio.primary_color ?? "#D4AF37");

  const submitted = await getLatestSubmittedConsultation(studio.id, account.id);
  const { chat, messages } = await getOrCreateActiveChat({ id: studio.id, name: studio.name }, account.id);

  return (
    <div className="max-w-2xl">
      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-2">Client Portal</p>
      <h1 className="font-serif text-2xl md:text-3xl tracking-wide mb-3">AI Consultation</h1>
      <p className="text-zinc-400 text-sm leading-relaxed mb-6">
        Chat with our AI to share your tattoo idea — it&apos;ll ask a few natural questions and send everything to {studio.name}.
      </p>

      {submitted && messages.length <= 1 && (
        <div className="mb-6 border border-white/[0.08] bg-zinc-900/40 p-5">
          <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-3">Your Latest Consultation</p>
          <ProjectTimeline status={submitted.status} brandColor={brand.full} />
        </div>
      )}

      <ConsultationChat
        studioSlug={params.studio}
        studioName={studio.name}
        chatId={chat.id}
        initialMessages={messages.map((m) => ({ id: m.id, role: m.role, content: m.content, image_url: m.image_url }))}
        brandColor={brand.full}
        textOnBrand={brand.textOnBrand}
      />
    </div>
  );
}
