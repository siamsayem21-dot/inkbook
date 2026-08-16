export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth/config";
import { getThreadIfOwned, listMessages, markThreadRead } from "@/lib/messaging/threads";
import ArtistThreadView from "@/components/artist/ArtistThreadView";
import { sendArtistMessage } from "../actions";

interface Props {
  params: { threadId: string };
}

export default async function ArtistThreadPage({ params }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = createAdminClient();
  const { data: artistRow } = await supabase.from("artists").select("id, name").eq("user_id", user.id).maybeSingle();
  const artist = artistRow as { id: string; name: string } | null;
  if (!artist) redirect("/artist/dashboard");

  const thread = await getThreadIfOwned(params.threadId, "artist", artist.id);
  if (!thread) notFound();

  const [messages] = await Promise.all([listMessages(thread.id), markThreadRead(thread.id, "studio")]);

  let clientLabel = "Client";
  if (thread.consultation_id) {
    const { data: consultRow } = await supabase
      .from("consultations")
      .select("client_name")
      .eq("id", thread.consultation_id)
      .maybeSingle();
    clientLabel = (consultRow as { client_name: string } | null)?.client_name ?? clientLabel;
  } else {
    const { data: clientRow } = await supabase
      .from("client_accounts")
      .select("email")
      .eq("id", thread.client_account_id)
      .maybeSingle();
    clientLabel = (clientRow as { email: string } | null)?.email ?? clientLabel;
  }

  const { data: studioRow } = await supabase.from("studios").select("name").eq("id", thread.studio_id).maybeSingle();
  const studioName = (studioRow as { name: string } | null)?.name ?? "Studio";

  return (
    <div className="-m-4 -mt-16 md:-m-8 min-h-[calc(100vh-3rem)] md:min-h-screen" style={{ background: "#FAF9FC" }}>
      <div className="p-4 pt-16 md:p-8 space-y-6 max-w-2xl">
        <Link href="/artist/messages" className="text-xs text-zinc-500 hover:text-zinc-900 transition-colors">
          ← All Messages
        </Link>
        <h1 className="text-2xl md:text-3xl font-bold text-zinc-900">{clientLabel}</h1>

        <ArtistThreadView
          threadId={thread.id}
          currentRole="artist"
          initialMessages={messages}
          labels={{ client: clientLabel, owner: studioName }}
          sendAction={sendArtistMessage}
        />
      </div>
    </div>
  );
}
