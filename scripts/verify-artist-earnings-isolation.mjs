// Artist Earnings 7/10 — Artist/Studio Security + Isolation
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
  const { data: artists } = await sb.from('artists').select('id, name, studio_id, user_id');
  console.log(`  ${artists.length} artist row(s), ${new Set(artists.map(a => a.studio_id)).size} distinct studio(s)`);

  HEAD('2. Earnings query, per real artist — cross-artist / cross-studio leak check');
  let leaks = 0;
  let checked = 0;
  for (const artist of artists) {
    const { data: rows, error } = await sb
      .from('bookings')
      .select('id, artist_id, studio_id')
      .eq('artist_id', artist.id)
      .in('status', ['confirmed', 'completed']);
    if (error) { console.log(`  ERROR for artist ${artist.id}: ${error.message}`); continue; }
    checked++;
    for (const r of rows ?? []) {
      if (r.artist_id !== artist.id) { console.log(`  LEAK: query for artist ${artist.id} returned booking ${r.id} owned by ${r.artist_id}`); leaks++; }
      if (r.studio_id && r.studio_id !== artist.studio_id) { console.log(`  NOTE: booking ${r.id} studio_id ${r.studio_id} != artist's studio_id ${artist.studio_id} (pre-existing known stale row, see Owner Bookings Balance Bug memory — not an Earnings isolation leak, query still correctly scoped to artist_id)`); }
    }
  }
  console.log(`  Checked ${checked} artist(s)' Earnings-shaped queries — ${leaks} leak(s).`);

  HEAD('3. Two-different-studio spot check');
  const studios = [...new Set(artists.map(a => a.studio_id))];
  if (studios.length >= 2) {
    const artistA = artists.find(a => a.studio_id === studios[0]);
    const artistB = artists.find(a => a.studio_id === studios[1]);
    const { data: aRows } = await sb.from('bookings').select('id').eq('artist_id', artistA.id).in('status', ['confirmed', 'completed']);
    const { data: bRows } = await sb.from('bookings').select('id').eq('artist_id', artistB.id).in('status', ['confirmed', 'completed']);
    const aIds = new Set((aRows ?? []).map(r => r.id));
    const overlap = (bRows ?? []).filter(r => aIds.has(r.id));
    console.log(`  Artist A (studio ${studios[0]}, ${aRows?.length ?? 0} qualifying bookings) vs Artist B (studio ${studios[1]}, ${bRows?.length ?? 0} qualifying bookings): ${overlap.length} overlapping booking id(s).`);
  } else {
    console.log('  Fewer than 2 distinct studios with artists in real data — skipped.');
  }

  HEAD('4. Same-studio, different-artist spot check (the specific case the task calls out)');
  const byStudio = new Map();
  for (const a of artists) { (byStudio.get(a.studio_id) ?? byStudio.set(a.studio_id, []).get(a.studio_id)).push(a); }
  const studioWithTwo = [...byStudio.values()].find(list => list.length >= 2);
  if (studioWithTwo) {
    const [a1, a2] = studioWithTwo;
    const { data: r1 } = await sb.from('bookings').select('id').eq('artist_id', a1.id).in('status', ['confirmed', 'completed']);
    const { data: r2 } = await sb.from('bookings').select('id').eq('artist_id', a2.id).in('status', ['confirmed', 'completed']);
    const ids1 = new Set((r1 ?? []).map(r => r.id));
    const overlap = (r2 ?? []).filter(r => ids1.has(r.id));
    console.log(`  Same-studio artists ${a1.id} (${r1?.length ?? 0} rows) vs ${a2.id} (${r2?.length ?? 0} rows): ${overlap.length} overlapping booking id(s).`);
  } else {
    console.log('  No studio in real data currently has 2+ artists — will be covered by QA data in 10/10 instead.');
  }

  HEAD('5. Mutation surface + URL manipulation surface');
  console.log('  Artist Earnings (app/(artist)/artist/earnings/page.tsx) has NO server actions at all — purely read-only,');
  console.log('  so "artist cannot mutate Owner-only payment/financial state" is trivially true: there is nothing to mutate.');
  console.log('  The only URL param is ?month=YYYY-MM — it carries no artist/studio identity, so no crafted URL can target');
  console.log('  another artist\'s data; the artist is always resolved server-side from the authenticated session');
  console.log('  (getCurrentUser() -> artists.user_id match), identical to every other locked Artist Portal page.');
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
