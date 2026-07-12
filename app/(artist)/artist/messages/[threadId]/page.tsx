export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth/config";
import { getThreadIfOwned, listMessages, markThreadRead } from "@/lib/messaging/threads";
import ThreadView from "@/components/messaging/ThreadView";
import { sendArtistMessage } from "../actions";

const GOLD = "#D4A853";

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
    <div className="max-w-2xl">
      <Link href="/artist/messages" className="text-zinc-500 hover:text-white transition-colors text-sm">
        ← All Messages
      </Link>
      <h1 className="text-2xl font-bold mt-3 mb-6">{clientLabel}</h1>

      <ThreadView
        threadId={thread.id}
        currentRole="artist"
        initialMessages={messages}
        labels={{ client: clientLabel, owner: studioName }}
        sendAction={sendArtistMessage}
        accentColor={GOLD}
        textOnAccent="#000000"
      />
    </div>
  );
}
