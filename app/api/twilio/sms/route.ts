import { NextRequest, NextResponse } from "next/server";
import { buildSmsMessage, trySendSms, SmsMessageType } from "@/lib/twilio/client";

const VALID_TYPES: SmsMessageType[] = [
  "booking_confirmed",
  "48hr_reminder",
  "day_of_reminder",
  "deposit_pending",
  "cancellation",
];

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { to, bookingId, type, studioName } = body as {
    to?: string;
    bookingId?: string;
    type?: string;
    studioName?: string;
  };

  if (!to || !bookingId || !type || !studioName) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (!VALID_TYPES.includes(type as SmsMessageType)) {
    return NextResponse.json({ error: "Unknown message type" }, { status: 400 });
  }

  const message = buildSmsMessage(type as SmsMessageType, studioName);
  await trySendSms(to, message);

  return NextResponse.json({ sent: true, type });
}
