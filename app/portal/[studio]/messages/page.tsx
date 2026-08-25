export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureClientAccount } from "@/lib/auth/config";
import { getBrand } from "@/lib/brand";
import { listThreadsForClient } from "@/lib/messaging/threads";
import ThreadList, { type ThreadListItem } from "@/components/messaging/ThreadList";
import NewConversationButton from "./NewConversationButton";

interface Props {
  params: { studio: string };
}

function deriveTitle(description: string, style: string | null): string {
  const base = (style ? `${style} Tattoo` : description) || "Tattoo Project";
  return base.length > 50 ? `${base.slice(0, 47).trimEnd()}…` : base;
}

export default async function ClientMessagesPage({ params }: Props) {
  const supabase = createAdminClient();
  const { data: studioData } = await supabase
    .from("studios")
    .select("id, name, primary_color")
    .eq("subdomain", params.studio)
    .single();

  const studio = studioData as { id: string; name: string; primary_color: string | null } | null;
  if (!studio) notFound();

  const account = await ensureClientAccount();
  const brand = getBrand(studio.primary_color ?? "#D4AF37");
  const threads = account ? await listThreadsForClient(studio.id, account.id) : [];

  // Project-scoped threads show the project's title, same short-name logic
  // used by lib/client-portal/projects.ts's deriveTitle.
  const consultationIds = threads
    .map((t) => t.consultation_id)
    .filter((id): id is string => Boolean(id));

  const titleByConsultation = new Map<string, string>();
  if (consultationIds.length > 0) {
    const { data: rows } = await supabase
      .from("consultations")
      .select("id, tattoo_description, detected_style")
      .in("id", consultationIds);
    for (const r of (rows ?? []) as { id: string; tattoo_description: string; detected_style: string | null }[]) {
      titleByConsultation.set(r.id, deriveTitle(r.tattoo_description, r.detected_style));
    }
  }

  const items: ThreadListItem[] = threads.map((t) => ({
    id: t.id,
    title: t.consultation_id ? titleByConsultation.get(t.consultation_id) ?? "Project" : studio.name,
    subtitle: t.consultation_id ? undefined : "General",
    preview: t.lastMessage ? t.lastMessage.content || (t.lastMessage.image_url ? "Sent an image" : "") : "No messages yet",
    updatedAt: t.updated_at,
    unread: t.unread,
  }));

  return (
    <div className="max-w-2xl">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2">Client Portal</p>
          <h1 className="font-serif text-2xl md:text-3xl tracking-wide text-zinc-900">Messages</h1>
        </div>
        <NewConversationButton
          studioId={studio.id}
          studioSlug={params.studio}
          brandColor={brand.full}
          textOnBrand={brand.textOnBrand}
        />
      </div>
      <p className="text-zinc-500 text-sm leading-relaxed mb-8">
        Message {studio.name} directly — questions about a project, or anything else.
      </p>

      <ThreadList
        items={items}
        basePath={`/portal/${params.studio}/messages`}
        accentColor={brand.full}
        emptyTitle="No conversations yet"
        emptyDescription="Start a conversation with the studio, or ask a question from any of your projects."
      />
    </div>
  );
}
