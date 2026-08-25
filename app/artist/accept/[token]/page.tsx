export const dynamic = "force-dynamic";

import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";
import AcceptForm from "./AcceptForm";

function ErrorPage({ title, message }: { title: string; message: string }) {
  return (
    <div className="min-h-screen bg-[#FAF9FC] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white border border-zinc-200 shadow-elevation-3 rounded-2xl p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-red-50 border border-red-100 flex items-center justify-center mx-auto mb-5">
          <svg className="w-5 h-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
          </svg>
        </div>
        <h1 className="text-lg font-bold text-zinc-900 mb-2">{title}</h1>
        <p className="text-sm text-zinc-500 mb-6">{message}</p>
        <Link
          href="/login"
          className="inline-block text-sm text-violet-600 hover:text-violet-700 hover:underline"
        >
          Sign in instead →
        </Link>
      </div>
    </div>
  );
}

export default async function AcceptInvitePage({
  params,
}: {
  params: { token: string };
}) {
  const supabase = createAdminClient();

  const { data: invite } = await supabase
    .from("artist_invites")
    .select("id, invited_name, invited_email, accepted_at, expires_at, studio_id")
    .eq("token", params.token)
    .maybeSingle();

  if (!invite) {
    return (
      <ErrorPage
        title="Invalid invite link"
        message="This invite link doesn't exist or has already been deleted. Ask your studio owner to send a new one."
      />
    );
  }

  const inv = invite as {
    id: string;
    invited_name: string;
    invited_email: string;
    accepted_at: string | null;
    expires_at: string;
    studio_id: string;
  };

  if (inv.accepted_at) {
    return (
      <ErrorPage
        title="Invite already used"
        message="This invite link has already been accepted. Sign in with your account below."
      />
    );
  }

  if (new Date(inv.expires_at) < new Date()) {
    return (
      <ErrorPage
        title="Invite link expired"
        message="This invite link expired after 7 days. Ask your studio owner to send a new one."
      />
    );
  }

  // Look up studio name for the form
  const { data: studio } = await supabase
    .from("studios")
    .select("name")
    .eq("id", inv.studio_id)
    .single();

  const studioName = (studio as { name: string } | null)?.name ?? "your studio";

  return (
    <div className="min-h-screen bg-[#FAF9FC] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center">
              <span className="text-white text-xs font-bold">IB</span>
            </div>
            <span className="text-zinc-900 font-serif font-bold text-lg">InkBook</span>
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 mb-2">
            You&apos;re invited!
          </h1>
          <p className="text-sm text-zinc-500">
            <span className="text-violet-600 font-medium">{studioName}</span> has invited you to
            join their team. Set up your account below.
          </p>
        </div>

        {/* Form card */}
        <div className="bg-white border border-zinc-200 shadow-elevation-3 rounded-2xl p-8">
          <AcceptForm
            token={params.token}
            inviteeName={inv.invited_name}
            studioName={studioName}
            email={inv.invited_email}
          />
        </div>

        <p className="text-center text-xs text-zinc-400 mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-zinc-500 hover:text-violet-600 transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
