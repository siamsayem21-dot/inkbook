export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/config";
import { createAdminClient } from "@/lib/supabase/admin";
import ArtistClientsTable, { type ArtistClientRow } from "@/components/artist/ArtistClientsTable";

export default async function ArtistClientsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = createAdminClient();

  const { data: artistRaw } = await supabase
    .from("artists")
    .select("id, studio_id")
    .eq("user_id", user.id)
    .maybeSingle();

  const artist = artistRaw as { id: string; studio_id: string } | null;
  if (!artist) redirect("/artist/dashboard");

  // "Which clients an artist may see" — clients connected to this artist
  // through a real booking, not studio-wide access (an artist at the same
  // studio never automatically sees a colleague's clients). bookings.client_id
  // is the only direct FK between the CRM clients table and an artist's own
  // work; consultations/custom_requests have no client_id FK of their own
  // (they carry raw client_name/email/phone until a deposit converts them
  // into a real booking via process_custom_request_deposit), so any client
  // reachable through those paths is already captured here once a booking
  // exists — see TASKS.md Artist Clients 1-2/10 for the full reasoning.
  const { data: bookingsRaw } = await supabase
    .from("bookings")
    .select("client_id, status, date")
    .eq("artist_id", artist.id)
    .not("client_id", "is", null);

  const bookings = (bookingsRaw ?? []) as { client_id: string; status: string; date: string | null }[];

  const statsByClient: Record<string, { count: number; noShows: number; lastVisit: string | null }> = {};
  for (const b of bookings) {
    const s = (statsByClient[b.client_id] ??= { count: 0, noShows: 0, lastVisit: null });
    s.count += 1;
    if (b.status === "no_show") s.noShows += 1;
    if (b.date && (!s.lastVisit || b.date > s.lastVisit)) s.lastVisit = b.date;
  }

  const clientIds = Object.keys(statsByClient);

  const { data: clientsRaw } = clientIds.length
    ? await supabase.from("clients").select("id, full_name, email, phone").in("id", clientIds)
    : { data: [] };

  const clients: ArtistClientRow[] = ((clientsRaw ?? []) as { id: string; full_name: string; email: string; phone: string }[])
    .map((c) => ({
      id: c.id,
      fullName: c.full_name,
      email: c.email,
      phone: c.phone,
      sessionCount: statsByClient[c.id]?.count ?? 0,
      noShowCount: statsByClient[c.id]?.noShows ?? 0,
      lastVisit: statsByClient[c.id]?.lastVisit ?? null,
    }))
    .sort((a, b) => (b.lastVisit ?? "").localeCompare(a.lastVisit ?? ""));

  return (
    <div className="-m-4 -mt-16 md:-m-8 min-h-[calc(100vh-3rem)] md:min-h-screen" style={{ background: "#FAF9FC" }}>
      <div className="p-4 pt-16 md:p-8 space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-zinc-900">My Clients</h1>
          <p className="text-sm text-zinc-500 mt-1">Clients you&apos;ve had a booking with — not your studio&apos;s full client list.</p>
        </div>
        <ArtistClientsTable clients={clients} />
      </div>
    </div>
  );
}
