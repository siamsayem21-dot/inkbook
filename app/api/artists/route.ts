import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  void searchParams.get("studioId");
  void searchParams.get("style");

  // TODO: query artists from Supabase, filter by studio + style
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
