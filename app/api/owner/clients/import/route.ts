import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStudioId } from "@/lib/auth/config";

interface CsvRow {
  name?: string;
  email?: string;
  phone?: string;
}

export async function POST(req: NextRequest) {
  const studioId = await getStudioId();
  if (!studioId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { rows: CsvRow[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { rows } = body;
  if (!Array.isArray(rows)) {
    return NextResponse.json({ error: "rows must be an array" }, { status: 400 });
  }

  const valid = rows.filter(
    (r) => r.name?.trim() && r.email?.trim() && r.phone?.trim()
  );
  const skipped = rows.length - valid.length;

  if (valid.length === 0) {
    return NextResponse.json({ imported: 0, skipped, duplicates: 0 });
  }

  const supabase = createAdminClient();

  // Dedup against clients already on file for this studio (matches the
  // studio_id + email semantics used by findOrCreateClient() in lib/clients.ts).
  const { data: existingRaw } = await supabase
    .from("clients")
    .select("email")
    .eq("studio_id", studioId);
  const existingEmails = new Set(
    ((existingRaw ?? []) as { email: string }[]).map((c) => c.email.toLowerCase())
  );

  // Dedup within the CSV itself (a row can repeat, e.g. exported twice).
  const seenInBatch = new Set<string>();
  const records: { studio_id: string; full_name: string; email: string; phone: string }[] = [];
  let duplicates = 0;

  for (const r of valid) {
    const email = r.email!.trim().toLowerCase();
    if (existingEmails.has(email) || seenInBatch.has(email)) {
      duplicates++;
      continue;
    }
    seenInBatch.add(email);
    records.push({
      studio_id: studioId,
      full_name: r.name!.trim(),
      email,
      phone: r.phone!.trim(),
    });
  }

  if (records.length === 0) {
    return NextResponse.json({ imported: 0, skipped, duplicates });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await supabase.from("clients").insert(records as any);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ imported: records.length, skipped, duplicates });
}
