export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStudioId } from "@/lib/auth/config";
import { getThreadIfOwned, listMessages, markThreadRead } from "@/lib/messaging/threads";
import OwnerThreadView from "@/components/owner/OwnerThreadView";
import { sendOwnerMessage } from "../actions";

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
    <div className="-m-4 -mt-16 md:-m-8 min-h-[calc(100vh-3rem)] md:min-h-screen" style={{ background: "#FAF9FC" }}>
      <div className="p-4 pt-16 md:p-8 space-y-6 max-w-2xl">
        <Link href="/owner/messages" className="text-xs text-zinc-500 hover:text-zinc-900 transition-colors">
          ← All Messages
        </Link>
        <h1 className="text-2xl md:text-3xl font-bold text-zinc-900">{clientLabel}</h1>

        <OwnerThreadView
          threadId={thread.id}
          currentRole="owner"
          initialMessages={messages}
          labels={{ client: clientLabel, artist: artistName ?? "Artist" }}
          sendAction={sendOwnerMessage}
        />
      </div>
    </div>
  );
}
