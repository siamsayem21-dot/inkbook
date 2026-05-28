import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { to, bookingId, type } = body;

  // type: "48hr_reminder" | "day_of_reminder" | "deposit_pending" | "cancellation"
  if (!to || !bookingId || !type) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const messages: Record<string, string> = {
    "48hr_reminder": "Reminder: your tattoo appointment is in 48 hours. Reply STOP to opt out.",
    "day_of_reminder": "Today is your tattoo appointment! See you soon. Reply STOP to opt out.",
    "deposit_pending": "Your booking is held — please pay your deposit within 24 hours or it will be cancelled.",
    "cancellation": "Your booking has been cancelled. Contact the studio to rebook.",
  };

  const message = messages[type];
  if (!message) {
    return NextResponse.json({ error: "Unknown message type" }, { status: 400 });
  }

  // TODO: send via Twilio
  // const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  // await client.messages.create({ to, from: process.env.TWILIO_PHONE_NUMBER, body: message })

  return NextResponse.json({ sent: true, type });
}
