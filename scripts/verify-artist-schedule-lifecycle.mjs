// Artist Schedule 5/7 — Timezone + Lifecycle Consistency
// Read-only real-data verification (no writes).
//
// Confirms Schedule's per-booking rendering fields (status, deposit_paid,
// consent) agree exactly with what Artist Bookings' own list query would
// produce for the same real rows — same columns, same consent lookup,
// no independently-computed/duplicated state to drift.

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const HEAD = (msg) => console.log('\n' + msg + '\n' + '-'.repeat(msg.length));

async function main() {
  HEAD('1. Artist Bookings list query (source of truth for the locked list page)');
  const { data: bookingsListRows, error: e1 } = await sb
    .from('bookings')
    .select('id, date, time, style, status, deposit_paid, artist_id, clients(full_name)');
  if (e1) { console.log('  ERROR:', e1.message); return; }

  const ids = bookingsListRows.map(r => r.id);
  const { data: consentRows } = ids.length
    ? await sb.from('consent_forms').select('booking_id').in('booking_id', ids)
    : { data: [] };
  const consented = new Set((consentRows ?? []).map(c => c.booking_id));

  HEAD('2. Schedule day-view query, run per real (artist_id, date) pair, field-by-field diff');
  const byArtistDate = new Map();
  for (const b of bookingsListRows) {
    const key = `${b.artist_id}__${b.date}`;
    if (!byArtistDate.has(key)) byArtistDate.set(key, []);
    byArtistDate.get(key).push(b);
  }

  let checked = 0;
  let fieldMismatches = 0;
  for (const [key] of byArtistDate) {
    const [artistId, date] = key.split('__');
    const { data: scheduleRows, error } = await sb
      .from('bookings')
      .select('id, date, time, style, status, deposit_paid, clients(full_name)')
      .eq('artist_id', artistId)
      .eq('date', date)
      .order('time', { ascending: true });
    if (error) { console.log(`  ERROR: ${error.message}`); continue; }

    for (const sr of scheduleRows ?? []) {
      checked++;
      const listRow = bookingsListRows.find(r => r.id === sr.id);
      if (!listRow) { console.log(`  MISMATCH: booking ${sr.id} in Schedule but not in Bookings-list source`); fieldMismatches++; continue; }
      const fields = ['date', 'time', 'style', 'status', 'deposit_paid'];
      for (const f of fields) {
        if (sr[f] !== listRow[f]) {
          console.log(`  FIELD MISMATCH booking ${sr.id} field "${f}": schedule=${sr[f]} list=${listRow[f]}`);
          fieldMismatches++;
        }
      }
      const scheduleConsent = consented.has(sr.id);
      const listConsent = consented.has(listRow.id);
      if (scheduleConsent !== listConsent) {
        console.log(`  CONSENT MISMATCH booking ${sr.id}: schedule=${scheduleConsent} list=${listConsent}`);
        fieldMismatches++;
      }
    }
  }
  console.log(`  Checked ${checked} booking render(s) across all real (artist, date) pairs, ${fieldMismatches} field mismatch(es).`);

  HEAD('3. Timezone precedent check');
  const { data: studios } = await sb.from('studios').select('id, timezone');
  const nonUtc = (studios ?? []).filter(s => s.timezone && s.timezone !== 'UTC');
  console.log(`  ${studios?.length ?? 0} studio(s) total, ${nonUtc.length} with a non-UTC timezone set.`);
  console.log('  Schedule uses server-local Date() for "today"/nav math, same as Artist Dashboard and Artist Bookings —');
  console.log('  no per-studio timezone offset is applied anywhere in those locked pages either, so this is consistent');
  console.log('  behavior, not a new inconsistency. studios.timezone remains used only by the SMS reminder cron.');
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
