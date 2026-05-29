import twilio from "twilio";

let twilioInstance: ReturnType<typeof twilio> | null = null;

export function getTwilio() {
  if (!twilioInstance) {
    twilioInstance = twilio(
      process.env.TWILIO_ACCOUNT_SID!,
      process.env.TWILIO_AUTH_TOKEN!
    );
  }
  return twilioInstance;
}

export type SmsMessageType =
  | "48hr_reminder"
  | "day_of_reminder"
  | "deposit_pending"
  | "cancellation"
  | "booking_confirmed";

export function buildSmsMessage(type: SmsMessageType, studioName: string): string {
  const templates: Record<SmsMessageType, string> = {
    booking_confirmed: `Your booking at ${studioName} is confirmed! We'll remind you closer to the date.`,
    "48hr_reminder": `Reminder: your tattoo appointment at ${studioName} is in 48 hours. Reply STOP to opt out.`,
    day_of_reminder: `Today's the day! Your appointment at ${studioName} is today. See you soon. Reply STOP to opt out.`,
    deposit_pending: `Your booking at ${studioName} is held — please pay your deposit within 24 hours or the slot will be released.`,
    cancellation: `Your booking at ${studioName} has been cancelled. Contact the studio to rebook.`,
  };
  return templates[type];
}

export async function sendSms(to: string, message: string): Promise<void> {
  const client = getTwilio();
  await client.messages.create({
    to,
    from: process.env.TWILIO_PHONE_NUMBER!,
    body: message,
  });
}

export async function trySendSms(to: string, message: string): Promise<void> {
  if (
    !process.env.TWILIO_ACCOUNT_SID ||
    !process.env.TWILIO_AUTH_TOKEN ||
    !process.env.TWILIO_PHONE_NUMBER
  ) {
    console.warn("Twilio not configured — SMS skipped");
    return;
  }
  try {
    await sendSms(to, message);
  } catch (err) {
    console.error("Twilio SMS error:", err);
  }
}
