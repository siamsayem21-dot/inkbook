import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const STUDIO_ID = "5fe382a1-fee7-4387-b625-4bf7a52b8f45";

interface CsvRow {
  name?: string;
  email?: string;
  phone?: string;
}

export async function POST(req: NextRequest) {
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
    return NextResponse.json({ imported: 0, skipped });
  }

  const records = valid.map((r) => ({
    studio_id: STUDIO_ID,
    full_name: r.name!.trim(),
    email:     r.email!.trim().toLowerCase(),
    phone:     r.phone!.trim(),
  }));

  const supabase = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await supabase.from("clients").insert(records as any);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ imported: valid.length, skipped });
}
