import { NextResponse } from "next/server";
import { calculateQuote } from "@/lib/quote/calculate";

export async function POST(req: Request) {
  try {
    const { size, colorPreference, style } = await req.json();
    const result = calculateQuote({ size, colorPreference, style });
    return NextResponse.json(result);
  } catch (err) {
    console.error("[quote/generate]", err);
    return NextResponse.json({ error: "Failed to calculate quote" }, { status: 500 });
  }
}
