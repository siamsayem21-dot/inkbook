// Artist Dashboard — Read-only real-data inspection
//
// Purely read-only (no writes, no test rows). Checks against the real DB:
//   1. How many artists exist, and do any have bookings at all (data to
//      visually verify the redesign against).
//   2. Artist/studio isolation: does every booking's artist_id map to an
//      artist whose studio_id matches the booking's own studio scoping?
//   3. The suspected "This Month's Earnings" mismatch between
//      app/(artist)/artist/dashboard/page.tsx (status = 'confirmed' only)
//      and app/(artist)/artist/earnings/page.tsx (status IN
//      ('confirmed','completed')) — does any real artist currently have a
//      'completed' booking this month that would make the two pages
//      disagree?

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const HEAD = (msg) => console.log('\n' + msg + '\n' + '-'.repeat(msg.length));

function monthRange() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const first = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const last = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(lastDay)}`;
  return { first, last };
}

async function main() {
  HEAD('1. Artists in the system');
  const { data: artists, error: artistsErr } = await sb
    .from('artists')
    .select('id, name, studio_id, is_active')
    .order('created_at', { ascending: true });
  if (artistsErr) { console.log('  ERROR:', artistsErr.message); return; }
  console.log(`  ${artists.length} artist row(s) total, ${artists.filter(a => a.is_active).length} active`);

  HEAD('2. Bookings per artist + artist/studio isolation check');
  const { data: bookings, error: bookingsErr } = await sb
    .from('bookings')
    .select('id, artist_id, studio_id, status, date, deposit_amount_cents');
  if (bookingsErr) { console.log('  ERROR:', bookingsErr.message); return; }
  console.log(`  ${bookings.length} booking row(s) total`);

  const artistById = new Map(artists.map(a => [a.id, a]));
  let isolationFailures = 0;
  for (const b of bookings) {
    const artist = artistById.get(b.artist_id);
    if (!artist) {
      console.log(`  FAIL: booking ${b.id} references artist_id ${b.artist_id} which does not exist`);
      isolationFailures++;
      continue;
    }
    if (b.studio_id && artist.studio_id !== b.studio_id) {
      console.log(`  FAIL: booking ${b.id} studio_id (${b.studio_id}) != its artist's studio_id (${artist.studio_id})`);
      isolationFailures++;
    }
  }
  console.log(isolationFailures === 0
    ? '  PASS: every booking\'s artist_id resolves to an artist whose studio_id matches'
    : `  ${isolationFailures} isolation mismatch(es) found`);

  HEAD('3. This-month earnings: Dashboard (confirmed only) vs Earnings page (confirmed+completed)');
  const { first, last } = monthRange();
  const thisMonthBookings = bookings.filter(b => b.date >= first && b.date <= last);
  console.log(`  Month range: ${first}..${last} — ${thisMonthBookings.length} booking(s) in range`);

  const byArtist = new Map();
  for (const b of thisMonthBookings) {
    if (!byArtist.has(b.artist_id)) byArtist.set(b.artist_id, []);
    byArtist.get(b.artist_id).push(b);
  }

  let mismatches = 0;
  for (const [artistId, rows] of byArtist) {
    const confirmedOnly = rows.filter(b => b.status === 'confirmed')
      .reduce((s, b) => s + (b.deposit_amount_cents ?? 0), 0) / 100;
    const confirmedPlusCompleted = rows.filter(b => b.status === 'confirmed' || b.status === 'completed')
      .reduce((s, b) => s + (b.deposit_amount_cents ?? 0), 0) / 100;
    const artist = artistById.get(artistId);
    const label = artist?.name ?? artistId;
    if (confirmedOnly !== confirmedPlusCompleted) {
      console.log(`  MISMATCH for artist "${label}": Dashboard would show $${confirmedOnly}, Earnings page shows $${confirmedPlusCompleted}`);
      mismatches++;
    } else {
      console.log(`  OK for artist "${label}": both pages agree at $${confirmedOnly}`);
    }
  }
  if (byArtist.size === 0) console.log('  No bookings this month for any artist — bug is currently latent (would trigger the moment any booking is marked completed this month).');
  console.log(`\n  Total artists with a live Dashboard/Earnings mismatch right now: ${mismatches}`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
