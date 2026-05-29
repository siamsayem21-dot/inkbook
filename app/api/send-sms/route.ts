import { NextRequest, NextResponse } from "next/server";
import { trySendSms } from "@/lib/twilio/client";

// Raw SMS sender — useful for one-off messages, testing, or internal tooling.
// Protected by CRON_SECRET so it can't be called by the public.
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { phone, message } = body as { phone?: string; message?: string };

  if (!phone || !message) {
    return NextResponse.json({ error: "phone and message are required" }, { status: 400 });
  }

  await trySendSms(phone, message);
  return NextResponse.json({ sent: true });
}
