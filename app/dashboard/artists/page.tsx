export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/config";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function DashboardArtistsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = createAdminClient();

  const { data: studioData } = await supabase
    .from("studios")
    .select("id, subdomain")
    .eq("owner_id", user.id)
    .single();

  const studio = studioData as { id: string; subdomain: string } | null;
  if (!studio) redirect("/register");

  // Artists + bookings this month in parallel
  const firstOfMonth = new Date();
  firstOfMonth.setDate(1);
  firstOfMonth.setHours(0, 0, 0, 0);
  const firstOfMonthStr = firstOfMonth.toISOString().split("T")[0];

  const [{ data: artistsRaw }, { data: bookingsRaw }] = await Promise.all([
    supabase
      .from("artists")
      .select("id, name, email, bio, styles, minimum_rate_cents, avatar_url")
      .eq("studio_id", studio.id)
      .order("name"),
    supabase
      .from("bookings")
      .select("id, artist_id, status")
      .eq("studio_id", studio.id)
      .gte("date", firstOfMonthStr),
  ]);

  const artists = (artistsRaw ?? []) as {
    id: string;
    name: string;
    email: string;
    bio: string | null;
    styles: string[];
    minimum_rate_cents: number;
    avatar_url: string | null;
  }[];

  const bookings = (bookingsRaw ?? []) as {
    id: string;
    artist_id: string;
    status: string;
  }[];

  // Aggregate booking counts per artist
  const bookingsByArtist: Record<string, { total: number; confirmed: number }> = {};
  for (const b of bookings) {
    if (!bookingsByArtist[b.artist_id]) {
      bookingsByArtist[b.artist_id] = { total: 0, confirmed: 0 };
    }
    bookingsByArtist[b.artist_id].total++;
    if (b.status === "confirmed" || b.status === "completed") {
      bookingsByArtist[b.artist_id].confirmed++;
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-1">Artists</h1>
          <p className="text-white/40 text-sm">
            {artists.length} artist{artists.length !== 1 ? "s" : ""} on your roster
          </p>
        </div>
        <Link
          href="/dashboard/artists/new"
          className="bg-gold text-black text-sm font-bold px-5 py-2.5 rounded-full hover:bg-gold-light transition-colors"
        >
          + Add artist
        </Link>
      </div>

      {artists.length > 0 ? (
        <div className="space-y-3">
          {artists.map((artist) => {
            const stats = bookingsByArtist[artist.id] ?? { total: 0, confirmed: 0 };
            const minRate = Math.round(artist.minimum_rate_cents / 100);

            return (
              <div
                key={artist.id}
                className="bg-zinc-900 border border-white/10 rounded-2xl p-5 flex items-center gap-5"
              >
                {/* Avatar */}
                <div className="w-12 h-12 rounded-full bg-zinc-800 shrink-0 overflow-hidden ring-1 ring-white/10">
                  {artist.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={artist.avatar_url}
                      alt={artist.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/30 font-bold">
                      {artist.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <p className="font-semibold">{artist.name}</p>
                    <span className="text-xs text-gold">From ${minRate}/hr</span>
                  </div>
                  <p className="text-white/40 text-xs mb-2">{artist.email}</p>
                  {artist.styles.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {artist.styles.slice(0, 5).map((s) => (
                        <span
                          key={s}
                          className="text-xs bg-white/5 text-white/40 px-2 py-0.5 rounded-full border border-white/8"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* This month stats */}
                <div className="shrink-0 text-right">
                  <p className="text-2xl font-bold">{stats.confirmed}</p>
                  <p className="text-white/30 text-xs">bookings this month</p>
                  {stats.total > stats.confirmed && (
                    <p className="text-yellow-400/60 text-xs mt-0.5">
                      +{stats.total - stats.confirmed} pending
                    </p>
                  )}
                </div>

                {/* View booking page */}
                <div className="shrink-0">
                  <a
                    href={`/book/${studio.subdomain}/${artist.id}`}
                    target="_blank"
                    className="text-xs text-white/30 hover:text-gold transition-colors px-3 py-1.5 border border-white/10 rounded-lg hover:border-gold/30"
                  >
                    View profile ↗
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-zinc-900 border border-white/10 rounded-2xl px-5 py-16 text-center">
          <p className="text-white/40 text-sm mb-4">No artists on your roster yet.</p>
          <Link
            href="/dashboard/artists/new"
            className="inline-block bg-gold text-black text-sm font-bold px-6 py-2.5 rounded-full hover:bg-gold-light transition-colors"
          >
            Add your first artist
          </Link>
        </div>
      )}
    </div>
  );
}
