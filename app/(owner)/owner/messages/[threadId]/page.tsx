export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStudioId } from "@/lib/auth/config";
import { getThreadIfOwned, listMessages, markThreadRead } from "@/lib/messaging/threads";
import ThreadView from "@/components/messaging/ThreadView";
import { sendOwnerMessage } from "../actions";

const GOLD = "#D4A853";

interface Props {
  params: { threadId: string };
}

export default async function OwnerThreadPage({ params }: Props) {
  const studioId = await getStudioId();
  if (!studioId) redirect("/login");

  const thread = await getThreadIfOwned(params.threadId, "owner", studioId);
  if (!thread) notFound();

  const [messages] = await Promise.all([listMessages(thread.id), markThreadRead(thread.id, "studio")]);

  const supabase = createAdminClient();

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

  let artistName: string | null = null;
  if (thread.artist_id) {
    const { data: artistRow } = await supabase.from("artists").select("name").eq("id", thread.artist_id).maybeSingle();
    artistName = (artistRow as { name: string } | null)?.name ?? null;
  }

  return (
    <div className="max-w-2xl">
      <Link href="/owner/messages" className="text-zinc-500 hover:text-white transition-colors text-sm">
        ← All Messages
      </Link>
      <h1 className="text-2xl font-bold mt-3 mb-6">{clientLabel}</h1>

      <ThreadView
        threadId={thread.id}
        currentRole="owner"
        initialMessages={messages}
        labels={{ client: clientLabel, artist: artistName ?? "Artist" }}
        sendAction={sendOwnerMessage}
        accentColor={GOLD}
        textOnAccent="#000000"
      />
    </div>
  );
}
