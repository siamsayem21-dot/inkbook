import { redirect } from "next/navigation";

// This page was a dead, unwired static form: no onSubmit/action handler, so
// clicking "Send invite" did a native GET submit to "?" and silently did
// nothing — a real, directly-navigable route (unlike the unreachable
// /dashboard/* sub-pages) that nonetheless invited no one. Nothing in the
// app ever links here (fresh grep confirmed) because the real, fully-wired
// "invite artist" flow already lives in the InviteModal on /owner/artists
// (ArtistsClient.tsx → inviteArtist()). Rather than duplicate that working
// flow into a second, parallel code path, this now redirects to the real
// one. Found + fixed during the Owner Portal exhaustive QA pass — see
// EXHAUSTIVE_ISSUES.md.
export default function NewArtistPage() {
  redirect("/owner/artists");
}
