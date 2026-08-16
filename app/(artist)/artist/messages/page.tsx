export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth/config";
import { listThreadsForArtist } from "@/lib/messaging/threads";
import ArtistThreadList, { type ThreadListItem } from "@/components/artist/ArtistThreadList";

function deriveTitle(description: string, style: string | null): string {
  const base = (style ? `${style} Tattoo` : description) || "Tattoo Project";
  return base.length > 50 ? `${base.slice(0, 47).trimEnd()}…` : base;
}

export default async function ArtistMessagesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = createAdminClient();
  const { data: artistRow } = await supabase.from("artists").select("id").eq("user_id", user.id).maybeSingle();
  const artist = artistRow as { id: string } | null;
  if (!artist) redirect("/artist/dashboard");

  const threads = await listThreadsForArtist(artist.id);

  const clientAccountIds = Array.from(new Set(threads.map((t) => t.client_account_id)));
  const consultationIds = threads.map((t) => t.consultation_id).filter((id): id is string => Boolean(id));

  const [{ data: clientRows }, { data: consultRows }] = await Promise.all([
    clientAccountIds.length > 0
      ? supabase.from("client_accounts").select("id, email").in("id", clientAccountIds)
      : Promise.resolve({ data: [] as { id: string; email: string }[] }),
    consultationIds.length > 0
      ? supabase.from("consultations").select("id, client_name, tattoo_description, detected_style").in("id", consultationIds)
      : Promise.resolve({ data: [] as { id: string; client_name: string; tattoo_description: string; detected_style: string | null }[] }),
  ]);

  const emailByClient = new Map((clientRows ?? []).map((c: { id: string; email: string }) => [c.id, c.email]));
  const consultById = new Map(
    (consultRows ?? []).map((c: { id: string; client_name: string; tattoo_description: string; detected_style: string | null }) => [c.id, c])
  );

  const items: ThreadListItem[] = threads.map((t) => {
    const consult = t.consultation_id ? consultById.get(t.consultation_id) : undefined;
    const clientLabel = consult?.client_name ?? emailByClient.get(t.client_account_id) ?? "Client";
    return {
      id: t.id,
      title: clientLabel,
      subtitle: consult ? deriveTitle(consult.tattoo_description, consult.detected_style) : "General",
      preview: t.lastMessage ? t.lastMessage.content || (t.lastMessage.image_url ? "Sent an image" : "") : "No messages yet",
      updatedAt: t.updated_at,
      unread: t.unread,
    };
  });

  return (
    <div className="-m-4 -mt-16 md:-m-8 min-h-[calc(100vh-3rem)] md:min-h-screen" style={{ background: "#FAF9FC" }}>
      <div className="p-4 pt-16 md:p-8 space-y-6 max-w-2xl">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-zinc-900">Messages</h1>
          <p className="text-sm text-zinc-500 mt-1">Conversations with clients assigned to you.</p>
        </div>

        <ArtistThreadList
          items={items}
          basePath="/artist/messages"
          emptyTitle="No conversations yet"
          emptyDescription="Messages from clients on your assigned projects will show up here."
        />
      </div>
    </div>
  );
}
