import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  // TODO: query artists from Supabase, filter by studioId + style
  return NextResponse.json({ artists: [] });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { studioId, name, email } = body;

  if (!studioId || !name || !email) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // TODO: create artist record + send invite email via Supabase Auth
  return NextResponse.json({ artist: { id: "placeholder", name, email } }, { status: 201 });
}
