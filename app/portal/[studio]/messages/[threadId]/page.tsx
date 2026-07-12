export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureClientAccount } from "@/lib/auth/config";
import { getBrand } from "@/lib/brand";
import { getThreadIfOwned, listMessages, markThreadRead } from "@/lib/messaging/threads";
import ThreadView from "@/components/messaging/ThreadView";
import { sendClientMessage } from "../actions";

interface Props {
  params: { studio: string; threadId: string };
}

export default async function ClientThreadPage({ params }: Props) {
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

  const thread = await getThreadIfOwned(params.threadId, "client", account.id);
  if (!thread) notFound();

  const [messages] = await Promise.all([listMessages(thread.id), markThreadRead(thread.id, "client")]);

  let artistName: string | null = null;
  if (thread.artist_id) {
    const { data: artistRow } = await supabase.from("artists").select("name").eq("id", thread.artist_id).maybeSingle();
    artistName = (artistRow as { name: string } | null)?.name ?? null;
  }

  const brand = getBrand(studio.primary_color ?? "#D4AF37");

  return (
    <div className="max-w-2xl">
      <Link
        href={`/portal/${params.studio}/messages`}
        className="text-[10px] uppercase tracking-widest text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        ← All Messages
      </Link>
      <h1 className="font-serif text-2xl md:text-3xl tracking-wide mt-4 mb-6">{studio.name}</h1>

      <ThreadView
        threadId={thread.id}
        currentRole="client"
        initialMessages={messages}
        labels={{ owner: studio.name, artist: artistName ?? "Artist" }}
        sendAction={sendClientMessage}
        accentColor={brand.full}
        textOnAccent={brand.textOnBrand}
      />
    </div>
  );
}
