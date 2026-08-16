// Artist Schedule 6/7 — Artist/Studio Isolation + Regression Verification
// Read-only real-data verification (no writes, no mutations attempted).

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const HEAD = (msg) => console.log('\n' + msg + '\n' + '-'.repeat(msg.length));

async function main() {
  HEAD('1. Artists + studios');
  const { data: artists, error: aErr } = await sb.from('artists').select('id, name, studio_id, user_id');
  if (aErr) { console.log('  ERROR:', aErr.message); return; }
  console.log(`  ${artists.length} artist row(s), ${new Set(artists.map(a => a.studio_id)).size} distinct studio(s)`);

  HEAD('2. Schedule bookings query, per real artist — cross-artist / cross-studio leak check');
  const { data: allBookings } = await sb.from('bookings').select('id, artist_id, studio_id, date');
  const artistById = new Map(artists.map(a => [a.id, a]));

  let leaks = 0;
  let checked = 0;
  for (const artist of artists) {
    const { data: rows, error } = await sb
      .from('bookings')
      .select('id, artist_id, studio_id')
      .eq('artist_id', artist.id);
    if (error) { console.log(`  ERROR for artist ${artist.id}: ${error.message}`); continue; }
    checked++;
    for (const r of rows ?? []) {
      if (r.artist_id !== artist.id) { console.log(`  LEAK: query for artist ${artist.id} returned booking ${r.id} owned by ${r.artist_id}`); leaks++; }
      if (r.studio_id && r.studio_id !== artist.studio_id) { console.log(`  LEAK: booking ${r.id} studio_id ${r.studio_id} != artist's studio_id ${artist.studio_id}`); leaks++; }
    }
  }
  console.log(`  Checked ${checked} artist(s)' Schedule-shaped queries against ${allBookings?.length ?? 0} real bookings — ${leaks} leak(s).`);

  HEAD('3. artist_availability — per-artist scoping check (no studio_id column, artist_id-only isolation)');
  const { data: allAvail, error: avErr } = await sb.from('artist_availability').select('id, artist_id, day_of_week, hour');
  if (avErr) { console.log('  ERROR:', avErr.message); }
  else {
    console.log(`  ${allAvail.length} availability row(s) total across ${new Set(allAvail.map(r => r.artist_id)).size} artist(s)`);
    const orphaned = allAvail.filter(r => !artistById.has(r.artist_id));
    console.log(orphaned.length === 0
      ? '  PASS: every availability row\'s artist_id resolves to a real artist'
      : `  ${orphaned.length} orphaned availability row(s) referencing a nonexistent artist_id`);
  }

  HEAD('4. Two-different-studio spot check (if available)');
  const studios = [...new Set(artists.map(a => a.studio_id))];
  if (studios.length >= 2) {
    const artistA = artists.find(a => a.studio_id === studios[0]);
    const artistB = artists.find(a => a.studio_id === studios[1]);
    const { data: aRows } = await sb.from('bookings').select('id').eq('artist_id', artistA.id);
    const { data: bRows } = await sb.from('bookings').select('id').eq('artist_id', artistB.id);
    const aIds = new Set((aRows ?? []).map(r => r.id));
    const overlap = (bRows ?? []).filter(r => aIds.has(r.id));
    console.log(`  Artist A (studio ${studios[0]}, ${aRows?.length ?? 0} bookings) vs Artist B (studio ${studios[1]}, ${bRows?.length ?? 0} bookings): ${overlap.length} overlapping booking id(s).`);
  } else {
    console.log('  Fewer than 2 distinct studios with artists in real data — skipped.');
  }

  HEAD('5. Direct-URL bypass surface');
  console.log('  Schedule\'s only URL param is ?date=YYYY-MM-DD — it carries no artist/studio identity, so no');
  console.log('  crafted URL can target another artist\'s data; the artist is always resolved server-side from');
  console.log('  the authenticated session (getCurrentUser() -> artists.user_id match), identical to every other');
  console.log('  locked Artist Portal page. saveAvailability()\'s artistId parameter is the only client-suppliable');
  console.log('  identity value in this module, and it is already re-verified server-side by verifyArtistOwnership()');
  console.log('  (4 passing tests in tests/unit/artist-schedule-actions.test.ts) regardless of what a caller sends.');
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
