const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.inkbook.tech";

async function sendEmail(to: string, subject: string, html: string) {
  if (!process.env.RESEND_API_KEY) {
    console.log(`[email — no RESEND_API_KEY] To: ${to} | Subject: ${subject}`);
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: "InkBook <noreply@inkbook.tech>", to: [to], subject, html }),
  });
  if (!res.ok) {
    console.error("[sendEmail] Resend error:", res.status, await res.text());
  }
}

export async function sendBookingConfirmationEmail({
  to,
  clientName,
  artistName,
  studioName,
  studioAddress,
  date,
  time,
  depositAmountCents,
}: {
  to: string;
  clientName: string;
  artistName: string;
  studioName: string;
  studioAddress: string | null;
  date: string;
  time: string;
  depositAmountCents: number;
}) {
  const subject = `Your booking is confirmed — ${studioName}`;
  const depositDisplay = `$${(depositAmountCents / 100).toFixed(2)}`;

  const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0A0A0A;font-family:sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0A0A0A;padding:40px 16px;">
<tr><td align="center">
<table width="520" cellpadding="0" cellspacing="0" style="background:#111;border:1px solid #1E1E1E;border-radius:16px;padding:40px;">
<tr><td>
  <p style="color:#c9a84c;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin:0 0 24px;">Booking Confirmed</p>
  <h1 style="color:#E8E8E8;font-size:22px;font-weight:700;margin:0 0 8px;">You&apos;re booked, ${clientName}.</h1>
  <p style="color:#A0A0A0;font-size:15px;margin:0 0 28px;">
    Your appointment with <strong style="color:#c9a84c;">${artistName}</strong> at ${studioName} is confirmed.
  </p>
  <table width="100%" cellpadding="10" cellspacing="0" style="background:#0d0d0d;border:1px solid #1E1E1E;border-radius:10px;margin:0 0 28px;">
    <tr>
      <td style="color:#666;font-size:12px;text-transform:uppercase;letter-spacing:2px;width:110px;">Artist</td>
      <td style="color:#E8E8E8;font-size:14px;">${artistName}</td>
    </tr>
    <tr>
      <td style="color:#666;font-size:12px;text-transform:uppercase;letter-spacing:2px;">Date</td>
      <td style="color:#E8E8E8;font-size:14px;">${date}</td>
    </tr>
    <tr>
      <td style="color:#666;font-size:12px;text-transform:uppercase;letter-spacing:2px;">Time</td>
      <td style="color:#E8E8E8;font-size:14px;">${time}</td>
    </tr>
    <tr>
      <td style="color:#666;font-size:12px;text-transform:uppercase;letter-spacing:2px;">Deposit paid</td>
      <td style="color:#c9a84c;font-size:14px;font-weight:700;">${depositDisplay}</td>
    </tr>
    ${studioAddress ? `<tr>
      <td style="color:#666;font-size:12px;text-transform:uppercase;letter-spacing:2px;vertical-align:top;">Location</td>
      <td style="color:#A0A0A0;font-size:14px;">${studioAddress}</td>
    </tr>` : ""}
  </table>
  <div style="background:#0d0d0d;border:1px solid #1E1E1E;border-radius:10px;padding:16px 20px;margin:0 0 28px;">
    <p style="color:#A0A0A0;font-size:13px;margin:0;">
      Please arrive on time. Late arrivals may result in a shortened session.
      Your deposit is non-refundable for no-shows or cancellations within 48 hours.
    </p>
  </div>
  <p style="color:#555;font-size:12px;margin:24px 0 0;text-align:center;">
    Powered by InkBook &middot; inkbook.tech
  </p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;

  await sendEmail(to, subject, html);
}

export async function sendCustomRequestReceivedEmail({
  to,
  artistName,
  clientName,
  studioName,
  requestId,
  designDescription,
  placement,
  size,
  budgetRange,
}: {
  to: string;
  artistName: string;
  clientName: string;
  studioName: string;
  requestId: string;
  designDescription: string;
  placement: string;
  size: string;
  budgetRange: string;
}) {
  const reviewUrl = `${BASE_URL}/artist/requests/${requestId}`;
  const subject = `New Custom Request from ${clientName} — ${studioName}`;
  const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0A0A0A;font-family:sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0A0A0A;padding:40px 16px;">
<tr><td align="center">
<table width="520" cellpadding="0" cellspacing="0" style="background:#111;border:1px solid #1E1E1E;border-radius:16px;padding:40px;">
<tr><td>
<p style="color:#c9a84c;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin:0 0 24px;">New Custom Request</p>
<h1 style="color:#E8E8E8;font-size:22px;margin:0 0 8px;">Hi ${artistName},</h1>
<p style="color:#A0A0A0;font-size:15px;margin:0 0 24px;">
<strong style="color:#c9a84c;">${clientName}</strong> has submitted a custom tattoo request at ${studioName}.
</p>
<table width="100%" cellpadding="8" cellspacing="0" style="background:#0d0d0d;border:1px solid #1E1E1E;border-radius:10px;margin:0 0 28px;">
<tr><td style="color:#666;font-size:12px;text-transform:uppercase;letter-spacing:2px;width:100px;">Placement</td><td style="color:#E8E8E8;font-size:14px;">${placement}</td></tr>
<tr><td style="color:#666;font-size:12px;text-transform:uppercase;letter-spacing:2px;">Size</td><td style="color:#E8E8E8;font-size:14px;">${size}</td></tr>
<tr><td style="color:#666;font-size:12px;text-transform:uppercase;letter-spacing:2px;">Budget</td><td style="color:#E8E8E8;font-size:14px;">${budgetRange}</td></tr>
<tr><td style="color:#666;font-size:12px;text-transform:uppercase;letter-spacing:2px;vertical-align:top;">Design</td><td style="color:#A0A0A0;font-size:14px;">${designDescription.slice(0, 200)}${designDescription.length > 200 ? "…" : ""}</td></tr>
</table>
<a href="${reviewUrl}" style="display:inline-block;background:#c9a84c;color:#000;font-weight:700;font-size:15px;text-decoration:none;padding:14px 28px;border-radius:10px;">
Review Request & Send Quote →
</a>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;
  await sendEmail(to, subject, html);
}

export async function sendCustomRequestQuoteEmail({
  to,
  clientName,
  studioName,
  studioSlug,
  requestId,
  quoteAmount,
  quoteMessage,
  depositAmount,
}: {
  to: string;
  clientName: string;
  studioName: string;
  studioSlug: string;
  requestId: string;
  quoteAmount: number;
  quoteMessage: string;
  depositAmount: number;
}) {
  const acceptUrl = `${BASE_URL}/book/${studioSlug}/request/${requestId}`;
  const subject = `Your Custom Tattoo Quote from ${studioName}`;
  const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0A0A0A;font-family:sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0A0A0A;padding:40px 16px;">
<tr><td align="center">
<table width="520" cellpadding="0" cellspacing="0" style="background:#111;border:1px solid #1E1E1E;border-radius:16px;padding:40px;">
<tr><td>
<p style="color:#c9a84c;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin:0 0 24px;">Your Quote is Ready</p>
<h1 style="color:#E8E8E8;font-size:22px;margin:0 0 8px;">Hi ${clientName},</h1>
<p style="color:#A0A0A0;font-size:15px;margin:0 0 24px;">
<strong style="color:#c9a84c;">${studioName}</strong> has reviewed your custom tattoo request and sent you a quote.
</p>
<div style="background:#0d0d0d;border:1px solid #c9a84c33;border-radius:12px;padding:24px;margin:0 0 24px;">
<p style="color:#666;font-size:12px;text-transform:uppercase;letter-spacing:2px;margin:0 0 6px;">Total Session Price</p>
<p style="color:#c9a84c;font-size:32px;font-weight:700;margin:0 0 12px;">$${quoteAmount.toFixed(2)}</p>
<p style="color:#888;font-size:13px;margin:0;">Deposit to confirm: <strong style="color:#E8E8E8;">$${depositAmount.toFixed(2)}</strong></p>
${quoteMessage ? `<p style="color:#A0A0A0;font-size:14px;margin:16px 0 0;border-top:1px solid #1E1E1E;padding-top:14px;">${quoteMessage}</p>` : ""}
</div>
<a href="${acceptUrl}" style="display:inline-block;background:#c9a84c;color:#000;font-weight:700;font-size:15px;text-decoration:none;padding:14px 28px;border-radius:10px;">
View Quote & Pay Deposit →
</a>
<p style="color:#555;font-size:12px;margin:24px 0 0;">
Your appointment is only confirmed after the deposit is paid. Deposit is non-refundable on no-shows or late cancellations.
</p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;
  await sendEmail(to, subject, html);
}

export async function sendCustomRequestClientConfirmationEmail({
  to,
  clientName,
  studioName,
  requestId,
  studioSlug,
}: {
  to: string;
  clientName: string;
  studioName: string;
  requestId: string;
  studioSlug: string;
}) {
  const statusUrl = `${BASE_URL}/book/${studioSlug}/request/${requestId}`;
  const subject = `Request received — ${studioName} will respond within 48 hours`;
  const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0A0A0A;font-family:sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0A0A0A;padding:40px 16px;">
<tr><td align="center">
<table width="520" cellpadding="0" cellspacing="0" style="background:#111;border:1px solid #1E1E1E;border-radius:16px;padding:40px;">
<tr><td>
<p style="color:#c9a84c;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin:0 0 24px;">Request Received</p>
<h1 style="color:#E8E8E8;font-size:22px;margin:0 0 8px;">Hi ${clientName},</h1>
<p style="color:#A0A0A0;font-size:15px;margin:0 0 24px;">
We've received your custom tattoo request at <strong style="color:#c9a84c;">${studioName}</strong>. The artist will review it and respond within 48 hours.
</p>
<div style="background:#0d0d0d;border:1px solid #1E1E1E;border-radius:10px;padding:20px;margin:0 0 28px;">
<p style="color:#666;font-size:12px;text-transform:uppercase;letter-spacing:2px;margin:0 0 8px;">What happens next?</p>
<p style="color:#A0A0A0;font-size:14px;margin:0;">The artist will review your idea and either approve it with a deposit amount, or reach out with questions. You'll get an email the moment they respond.</p>
</div>
<a href="${statusUrl}" style="display:inline-block;background:#c9a84c;color:#000;font-weight:700;font-size:15px;text-decoration:none;padding:14px 28px;border-radius:10px;">
View Request Status →
</a>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;
  await sendEmail(to, subject, html);
}

export async function sendCustomRequestDeclinedEmail({
  to,
  clientName,
  studioName,
  studioSlug,
  declinedReason,
  depositWasPaid = false,
}: {
  to: string;
  clientName: string;
  studioName: string;
  studioSlug: string;
  declinedReason?: string;
  depositWasPaid?: boolean;
}) {
  const bookUrl = `${BASE_URL}/book/${studioSlug}`;
  const subject = `Update on your tattoo request — ${studioName}`;
  const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0A0A0A;font-family:sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0A0A0A;padding:40px 16px;">
<tr><td align="center">
<table width="520" cellpadding="0" cellspacing="0" style="background:#111;border:1px solid #1E1E1E;border-radius:16px;padding:40px;">
<tr><td>
<p style="color:#666;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin:0 0 24px;">Request Update</p>
<h1 style="color:#E8E8E8;font-size:22px;margin:0 0 8px;">Hi ${clientName},</h1>
<p style="color:#A0A0A0;font-size:15px;margin:0 0 24px;">
Thank you for reaching out to <strong style="color:#E8E8E8;">${studioName}</strong>. Unfortunately, the artist is unable to proceed with this project at this time.
</p>
${declinedReason ? `<div style="background:#0d0d0d;border:1px solid #1E1E1E;border-radius:10px;padding:20px;margin:0 0 24px;"><p style="color:#666;font-size:12px;text-transform:uppercase;letter-spacing:2px;margin:0 0 6px;">Note from the studio</p><p style="color:#A0A0A0;font-size:14px;margin:0;">${declinedReason}</p></div>` : ""}
${depositWasPaid ? `<div style="background:#1a1200;border:1px solid #c9a84c33;border-radius:10px;padding:16px 20px;margin:0 0 24px;"><p style="color:#c9a84c;font-size:13px;margin:0;">Your deposit will be refunded by the studio. Please allow 5–10 business days for the refund to appear on your original payment method. Contact ${studioName} directly if you have questions.</p></div>` : ""}
<p style="color:#A0A0A0;font-size:14px;margin:0 0 28px;">
Feel free to browse other artists or submit a new request — we'd love to work with you in the future.
</p>
<a href="${bookUrl}" style="display:inline-block;background:#c9a84c;color:#000;font-weight:700;font-size:15px;text-decoration:none;padding:14px 28px;border-radius:10px;">
Browse Artists →
</a>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;
  await sendEmail(to, subject, html);
}

export async function sendCustomRequestAcceptedEmail({
  to,
  clientName,
  studioName,
  studioSlug,
  requestId,
  depositAmount,
  quoteAmount,
}: {
  to: string;
  clientName: string;
  studioName: string;
  studioSlug: string;
  requestId: string;
  depositAmount: number;
  quoteAmount?: number;
}) {
  const statusUrl = `${BASE_URL}/book/${studioSlug}/request/${requestId}`;
  const subject = `Deposit received — ${studioName} will be in touch`;
  const remaining = quoteAmount != null ? quoteAmount - depositAmount : null;

  const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0A0A0A;font-family:sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0A0A0A;padding:40px 16px;">
<tr><td align="center">
<table width="520" cellpadding="0" cellspacing="0" style="background:#111;border:1px solid #1E1E1E;border-radius:16px;padding:40px;">
<tr><td>
<p style="color:#c9a84c;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin:0 0 24px;">Deposit Confirmed</p>
<h1 style="color:#E8E8E8;font-size:22px;font-weight:700;margin:0 0 8px;">You&apos;re confirmed, ${clientName}.</h1>
<p style="color:#A0A0A0;font-size:15px;margin:0 0 28px;">
  <strong style="color:#c9a84c;">${studioName}</strong> has received your deposit and accepted your custom tattoo project.
  The studio will be in touch to finalize your session date and time.
</p>
<table width="100%" cellpadding="10" cellspacing="0" style="background:#0d0d0d;border:1px solid #1E1E1E;border-radius:10px;margin:0 0 28px;">
  <tr>
    <td style="color:#666;font-size:12px;text-transform:uppercase;letter-spacing:2px;width:160px;">Studio</td>
    <td style="color:#E8E8E8;font-size:14px;">${studioName}</td>
  </tr>
  ${quoteAmount != null ? `<tr>
    <td style="color:#666;font-size:12px;text-transform:uppercase;letter-spacing:2px;">Total price</td>
    <td style="color:#E8E8E8;font-size:14px;">$${quoteAmount.toFixed(2)}</td>
  </tr>` : ""}
  <tr>
    <td style="color:#666;font-size:12px;text-transform:uppercase;letter-spacing:2px;">Deposit paid</td>
    <td style="color:#c9a84c;font-size:14px;font-weight:700;">$${depositAmount.toFixed(2)} ✓</td>
  </tr>
  ${remaining != null ? `<tr>
    <td style="color:#666;font-size:12px;text-transform:uppercase;letter-spacing:2px;">Balance at session</td>
    <td style="color:#E8E8E8;font-size:14px;">$${remaining.toFixed(2)}</td>
  </tr>` : ""}
  <tr>
    <td style="color:#666;font-size:12px;text-transform:uppercase;letter-spacing:2px;">Next step</td>
    <td style="color:#A0A0A0;font-size:14px;">Studio will contact you to schedule</td>
  </tr>
</table>
<a href="${statusUrl}" style="display:inline-block;background:#c9a84c;color:#000;font-weight:700;font-size:15px;text-decoration:none;padding:14px 28px;border-radius:10px;">
View Request Status →
</a>
<div style="background:#0d0d0d;border:1px solid #1E1E1E;border-radius:10px;padding:16px 20px;margin:28px 0 0;">
  <p style="color:#A0A0A0;font-size:13px;margin:0;">
    Your deposit is non-refundable for no-shows or cancellations within 48 hours of your scheduled session.
  </p>
</div>
<p style="color:#555;font-size:12px;margin:24px 0 0;text-align:center;">Powered by InkBook &middot; inkbook.tech</p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;
  await sendEmail(to, subject, html);
}

export async function sendOwnerDepositNotificationEmail({
  to,
  clientName,
  studioName,
  depositAmount,
  quoteAmount,
  scheduleUrl,
}: {
  to: string;
  clientName: string;
  studioName: string;
  depositAmount: number;
  quoteAmount: number;
  scheduleUrl: string;
}) {
  const subject = `Action required: Schedule ${clientName}'s session — ${studioName}`;
  const remaining = quoteAmount - depositAmount;

  const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0A0A0A;font-family:sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0A0A0A;padding:40px 16px;">
<tr><td align="center">
<table width="520" cellpadding="0" cellspacing="0" style="background:#111;border:1px solid #1E1E1E;border-radius:16px;padding:40px;">
<tr><td>
<p style="color:#c9a84c;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin:0 0 24px;">Deposit Received</p>
<h1 style="color:#E8E8E8;font-size:22px;font-weight:700;margin:0 0 8px;">Schedule ${clientName}'s session</h1>
<p style="color:#A0A0A0;font-size:15px;margin:0 0 28px;">
  <strong style="color:#c9a84c;">${clientName}</strong> has paid their deposit for a custom tattoo at
  <strong style="color:#E8E8E8;">${studioName}</strong>. Assign a date and time to complete the booking.
</p>
<table width="100%" cellpadding="10" cellspacing="0" style="background:#0d0d0d;border:1px solid #1E1E1E;border-radius:10px;margin:0 0 28px;">
  <tr>
    <td style="color:#666;font-size:12px;text-transform:uppercase;letter-spacing:2px;width:160px;">Client</td>
    <td style="color:#E8E8E8;font-size:14px;">${clientName}</td>
  </tr>
  <tr>
    <td style="color:#666;font-size:12px;text-transform:uppercase;letter-spacing:2px;">Deposit received</td>
    <td style="color:#c9a84c;font-size:14px;font-weight:700;">$${depositAmount.toFixed(2)}</td>
  </tr>
  <tr>
    <td style="color:#666;font-size:12px;text-transform:uppercase;letter-spacing:2px;">Balance at session</td>
    <td style="color:#E8E8E8;font-size:14px;">$${remaining.toFixed(2)}</td>
  </tr>
  <tr>
    <td style="color:#666;font-size:12px;text-transform:uppercase;letter-spacing:2px;">Total quote</td>
    <td style="color:#E8E8E8;font-size:14px;">$${quoteAmount.toFixed(2)}</td>
  </tr>
</table>
<a href="${scheduleUrl}" style="display:inline-block;background:#c9a84c;color:#000;font-weight:700;font-size:15px;text-decoration:none;padding:14px 28px;border-radius:10px;">
Schedule Session →
</a>
<p style="color:#555;font-size:12px;margin:28px 0 0;text-align:center;">Powered by InkBook &middot; inkbook.tech</p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;
  await sendEmail(to, subject, html);
}

export async function sendSessionScheduledEmail({
  to,
  clientName,
  artistName,
  studioName,
  studioAddress,
  date,
  time,
  depositAmountCents,
  totalAmountCents,
}: {
  to: string;
  clientName: string;
  artistName: string;
  studioName: string;
  studioAddress: string | null;
  date: string;
  time: string;
  depositAmountCents: number;
  totalAmountCents: number;
}) {
  const subject = `Your session is scheduled — ${studioName}`;
  const depositDisplay  = `$${(depositAmountCents / 100).toFixed(2)}`;
  const remainingCents  = totalAmountCents - depositAmountCents;
  const remainingDisplay = `$${(remainingCents / 100).toFixed(2)}`;

  const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0A0A0A;font-family:sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0A0A0A;padding:40px 16px;">
<tr><td align="center">
<table width="520" cellpadding="0" cellspacing="0" style="background:#111;border:1px solid #1E1E1E;border-radius:16px;padding:40px;">
<tr><td>
<p style="color:#c9a84c;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin:0 0 24px;">Session Scheduled</p>
<h1 style="color:#E8E8E8;font-size:22px;font-weight:700;margin:0 0 8px;">You&apos;re booked in, ${clientName}.</h1>
<p style="color:#A0A0A0;font-size:15px;margin:0 0 28px;">
  Your custom session with <strong style="color:#c9a84c;">${artistName}</strong> at
  <strong style="color:#E8E8E8;">${studioName}</strong> has been scheduled.
</p>
<table width="100%" cellpadding="10" cellspacing="0" style="background:#0d0d0d;border:1px solid #1E1E1E;border-radius:10px;margin:0 0 28px;">
  <tr>
    <td style="color:#666;font-size:12px;text-transform:uppercase;letter-spacing:2px;width:160px;">Artist</td>
    <td style="color:#E8E8E8;font-size:14px;">${artistName}</td>
  </tr>
  <tr>
    <td style="color:#666;font-size:12px;text-transform:uppercase;letter-spacing:2px;">Date</td>
    <td style="color:#E8E8E8;font-size:14px;">${date}</td>
  </tr>
  <tr>
    <td style="color:#666;font-size:12px;text-transform:uppercase;letter-spacing:2px;">Time</td>
    <td style="color:#E8E8E8;font-size:14px;">${time}</td>
  </tr>
  ${studioAddress ? `<tr>
    <td style="color:#666;font-size:12px;text-transform:uppercase;letter-spacing:2px;vertical-align:top;">Location</td>
    <td style="color:#A0A0A0;font-size:14px;">${studioAddress}</td>
  </tr>` : ""}
  <tr>
    <td style="color:#666;font-size:12px;text-transform:uppercase;letter-spacing:2px;">Deposit paid</td>
    <td style="color:#c9a84c;font-size:14px;font-weight:700;">${depositDisplay} ✓</td>
  </tr>
  <tr>
    <td style="color:#666;font-size:12px;text-transform:uppercase;letter-spacing:2px;">Balance at session</td>
    <td style="color:#E8E8E8;font-size:14px;">${remainingDisplay}</td>
  </tr>
</table>
<div style="background:#0d0d0d;border:1px solid #1E1E1E;border-radius:10px;padding:16px 20px;margin:0 0 28px;">
  <p style="color:#A0A0A0;font-size:13px;margin:0;">
    Please arrive on time. Your remaining balance of <strong style="color:#E8E8E8;">${remainingDisplay}</strong> is
    due at the end of your session. Your deposit is non-refundable for no-shows or cancellations within 48 hours.
  </p>
</div>
<p style="color:#555;font-size:12px;margin:0;text-align:center;">Powered by InkBook &middot; inkbook.tech</p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;
  await sendEmail(to, subject, html);
}

export async function sendBookingCancelledEmail({
  to,
  clientName,
  studioName,
}: {
  to: string;
  clientName: string;
  studioName: string;
}) {
  const subject = `Your booking at ${studioName} was cancelled`;

  const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0A0A0A;font-family:sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0A0A0A;padding:40px 16px;">
<tr><td align="center">
<table width="520" cellpadding="0" cellspacing="0" style="background:#111;border:1px solid #1E1E1E;border-radius:16px;padding:40px;">
<tr><td>
<p style="color:#666;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin:0 0 24px;">Booking Cancelled</p>
<h1 style="color:#E8E8E8;font-size:22px;font-weight:700;margin:0 0 8px;">Hi ${clientName},</h1>
<p style="color:#A0A0A0;font-size:15px;margin:0 0 24px;">
Your booking at <strong style="color:#E8E8E8;">${studioName}</strong> has been cancelled by the studio.
</p>
<p style="color:#A0A0A0;font-size:14px;margin:0 0 28px;">
Please contact the studio directly if you'd like to rebook or have questions about your deposit.
</p>
<p style="color:#555;font-size:12px;margin:0;text-align:center;">Powered by InkBook &middot; inkbook.tech</p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;

  await sendEmail(to, subject, html);
}

export async function sendNoShowEmail({
  to,
  clientName,
  studioName,
  depositAmountCents,
}: {
  to: string;
  clientName: string;
  studioName: string;
  depositAmountCents: number;
}) {
  const subject = `You were marked as a no-show — ${studioName}`;
  const depositDisplay = `$${(depositAmountCents / 100).toFixed(2)}`;

  const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0A0A0A;font-family:sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0A0A0A;padding:40px 16px;">
<tr><td align="center">
<table width="520" cellpadding="0" cellspacing="0" style="background:#111;border:1px solid #1E1E1E;border-radius:16px;padding:40px;">
<tr><td>
<p style="color:#e05252;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin:0 0 24px;">Missed Appointment</p>
<h1 style="color:#E8E8E8;font-size:22px;font-weight:700;margin:0 0 8px;">Hi ${clientName},</h1>
<p style="color:#A0A0A0;font-size:15px;margin:0 0 24px;">
You were marked as a no-show for your appointment at <strong style="color:#E8E8E8;">${studioName}</strong>.
</p>
<div style="background:#1a0d0d;border:1px solid #e0525233;border-radius:10px;padding:16px 20px;margin:0 0 28px;">
<p style="color:#e05252;font-size:13px;margin:0;">
Your deposit of ${depositDisplay} is non-refundable and has been kept by the studio, per its booking policy.
</p>
</div>
<p style="color:#A0A0A0;font-size:14px;margin:0 0 28px;">
Please contact the studio directly if you'd like to rebook.
</p>
<p style="color:#555;font-size:12px;margin:0;text-align:center;">Powered by InkBook &middot; inkbook.tech</p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;

  await sendEmail(to, subject, html);
}

export async function sendRemainderRequestEmail({
  to,
  clientName,
  studioName,
  artistName,
  balanceDueCents,
  checkoutUrl,
}: {
  to: string;
  clientName: string;
  studioName: string;
  artistName: string;
  balanceDueCents: number;
  checkoutUrl: string;
}) {
  const subject = `Remaining balance due — ${studioName}`;
  const balanceDisplay = `$${(balanceDueCents / 100).toFixed(2)}`;

  const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0A0A0A;font-family:sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0A0A0A;padding:40px 16px;">
<tr><td align="center">
<table width="520" cellpadding="0" cellspacing="0" style="background:#111;border:1px solid #1E1E1E;border-radius:16px;padding:40px;">
<tr><td>
<p style="color:#c9a84c;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin:0 0 24px;">Balance Due</p>
<h1 style="color:#E8E8E8;font-size:22px;font-weight:700;margin:0 0 8px;">Hi ${clientName},</h1>
<p style="color:#A0A0A0;font-size:15px;margin:0 0 24px;">
${studioName} is requesting the remaining balance for your session with <strong style="color:#c9a84c;">${artistName}</strong>.
</p>
<div style="background:#0d0d0d;border:1px solid #c9a84c33;border-radius:12px;padding:24px;margin:0 0 24px;">
<p style="color:#666;font-size:12px;text-transform:uppercase;letter-spacing:2px;margin:0 0 6px;">Balance Due</p>
<p style="color:#c9a84c;font-size:32px;font-weight:700;margin:0;">${balanceDisplay}</p>
</div>
<a href="${checkoutUrl}" style="display:inline-block;background:#c9a84c;color:#000;font-weight:700;font-size:15px;text-decoration:none;padding:14px 28px;border-radius:10px;">
Pay Remaining Balance →
</a>
<p style="color:#555;font-size:12px;margin:24px 0 0;text-align:center;">Powered by InkBook &middot; inkbook.tech</p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;

  await sendEmail(to, subject, html);
}

export async function sendRemainderReceivedEmail({
  to,
  clientName,
  studioName,
  balanceDueCents,
}: {
  to: string;
  clientName: string;
  studioName: string;
  balanceDueCents: number;
}) {
  const subject = `Payment received — ${studioName}`;
  const balanceDisplay = `$${(balanceDueCents / 100).toFixed(2)}`;

  const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0A0A0A;font-family:sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0A0A0A;padding:40px 16px;">
<tr><td align="center">
<table width="520" cellpadding="0" cellspacing="0" style="background:#111;border:1px solid #1E1E1E;border-radius:16px;padding:40px;">
<tr><td>
<p style="color:#c9a84c;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin:0 0 24px;">Payment Received</p>
<h1 style="color:#E8E8E8;font-size:22px;font-weight:700;margin:0 0 8px;">Thanks, ${clientName}.</h1>
<p style="color:#A0A0A0;font-size:15px;margin:0 0 28px;">
Your remaining balance of <strong style="color:#c9a84c;">${balanceDisplay}</strong> at <strong style="color:#E8E8E8;">${studioName}</strong> has been received in full.
</p>
<p style="color:#555;font-size:12px;margin:0;text-align:center;">Powered by InkBook &middot; inkbook.tech</p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;

  await sendEmail(to, subject, html);
}

export async function sendAftercareEmail({
  to,
  clientName,
  studioName,
  artistName,
}: {
  to: string;
  clientName: string;
  studioName: string;
  artistName: string;
}) {
  const subject = `Aftercare instructions — ${studioName}`;

  const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0A0A0A;font-family:sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0A0A0A;padding:40px 16px;">
<tr><td align="center">
<table width="520" cellpadding="0" cellspacing="0" style="background:#111;border:1px solid #1E1E1E;border-radius:16px;padding:40px;">
<tr><td>
<p style="color:#c9a84c;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin:0 0 24px;">Aftercare Instructions</p>
<h1 style="color:#E8E8E8;font-size:22px;font-weight:700;margin:0 0 8px;">Thanks for coming in, ${clientName}.</h1>
<p style="color:#A0A0A0;font-size:15px;margin:0 0 28px;">
Here's how to take care of your new tattoo from <strong style="color:#c9a84c;">${artistName}</strong> at ${studioName}.
</p>
<table width="100%" cellpadding="10" cellspacing="0" style="background:#0d0d0d;border:1px solid #1E1E1E;border-radius:10px;margin:0 0 28px;">
  <tr>
    <td style="color:#666;font-size:12px;text-transform:uppercase;letter-spacing:2px;width:140px;vertical-align:top;">First 24 hours</td>
    <td style="color:#E8E8E8;font-size:14px;">Leave the bandage on for 2–4 hours, then gently wash with fragrance-free soap and lukewarm water. Pat dry — do not rub.</td>
  </tr>
  <tr>
    <td style="color:#666;font-size:12px;text-transform:uppercase;letter-spacing:2px;vertical-align:top;">Next 2 weeks</td>
    <td style="color:#E8E8E8;font-size:14px;">Apply a thin layer of fragrance-free moisturizer 2–3 times a day. Keep the area clean and avoid picking at any scabbing.</td>
  </tr>
  <tr>
    <td style="color:#666;font-size:12px;text-transform:uppercase;letter-spacing:2px;vertical-align:top;">Avoid</td>
    <td style="color:#E8E8E8;font-size:14px;">Direct sun, swimming, baths, saunas, and tight clothing over the area until fully healed (typically 2–4 weeks).</td>
  </tr>
</table>
<p style="color:#A0A0A0;font-size:14px;margin:0 0 28px;">
If you notice excessive redness, swelling, or discharge, contact ${studioName} or your doctor — this can happen occasionally and is easy to treat early.
</p>
<p style="color:#555;font-size:12px;margin:0;text-align:center;">Powered by InkBook &middot; inkbook.tech</p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;

  await sendEmail(to, subject, html);
}

export async function sendArtistInviteEmail({
  to,
  inviteeName,
  studioName,
  token,
}: {
  to: string;
  inviteeName: string;
  studioName: string;
  token: string;
}) {
  const inviteUrl = `${BASE_URL}/artist/accept/${token}`;

  if (!process.env.RESEND_API_KEY) {
    console.log(
      `\n========================================\n` +
      `[INVITE LINK — add RESEND_API_KEY to send real emails]\n` +
      `To:     ${to}\n` +
      `Name:   ${inviteeName}\n` +
      `Studio: ${studioName}\n` +
      `URL:    ${inviteUrl}\n` +
      `========================================\n`
    );
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "InkBook <noreply@inkbook.tech>",
      to: [to],
      subject: `You've been invited to join ${studioName} on InkBook`,
      html: buildEmailHtml({ inviteeName, studioName, inviteUrl }),
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("[sendArtistInviteEmail] Resend error:", res.status, body);
    throw new Error(`Email delivery failed (${res.status})`);
  }
}

function buildEmailHtml({
  inviteeName,
  studioName,
  inviteUrl,
}: {
  inviteeName: string;
  studioName: string;
  inviteUrl: string;
}) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0A0A0A;font-family:sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0A0A0A;padding:40px 16px;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#111;border:1px solid #1E1E1E;border-radius:16px;padding:40px;">
        <tr><td>
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:32px;">
            <div style="width:32px;height:32px;background:#c9a84c;border-radius:8px;display:inline-block;text-align:center;line-height:32px;">
              <span style="color:#000;font-size:11px;font-weight:900;">IB</span>
            </div>
            <span style="color:#E8E8E8;font-weight:700;font-size:18px;vertical-align:top;line-height:32px;margin-left:8px;">InkBook</span>
          </div>
          <h1 style="color:#E8E8E8;font-size:22px;font-weight:700;margin:0 0 8px;">You're invited!</h1>
          <p style="color:#A0A0A0;font-size:15px;margin:0 0 24px;">
            Hi ${inviteeName}, <strong style="color:#c9a84c;">${studioName}</strong> has invited you to join their team on InkBook.
          </p>
          <p style="color:#888;font-size:14px;margin:0 0 32px;">
            Click the button below to accept your invite and set up your account. This link expires in 7 days.
          </p>
          <a href="${inviteUrl}" style="display:inline-block;background:#c9a84c;color:#000;font-weight:700;font-size:15px;text-decoration:none;padding:14px 28px;border-radius:10px;">
            Accept Invite →
          </a>
          <p style="color:#555;font-size:12px;margin:32px 0 0;">
            Or copy this link: <span style="color:#c9a84c;">${inviteUrl}</span>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function truncatePreview(preview: string): string {
  return preview.length > 160 ? `${preview.slice(0, 157).trimEnd()}…` : preview;
}

export async function sendOwnerNewMessageEmail({
  to,
  clientName,
  studioName,
  preview,
  threadUrl,
}: {
  to: string;
  clientName: string;
  studioName: string;
  preview: string;
  threadUrl: string;
}) {
  const subject = `New message from ${clientName} — ${studioName}`;

  const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0A0A0A;font-family:sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0A0A0A;padding:40px 16px;">
<tr><td align="center">
<table width="520" cellpadding="0" cellspacing="0" style="background:#111;border:1px solid #1E1E1E;border-radius:16px;padding:40px;">
<tr><td>
<p style="color:#c9a84c;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin:0 0 24px;">New Message</p>
<h1 style="color:#E8E8E8;font-size:22px;font-weight:700;margin:0 0 8px;">${clientName} sent you a message</h1>
<p style="color:#A0A0A0;font-size:15px;margin:0 0 24px;">at ${studioName}</p>
<div style="background:#0d0d0d;border:1px solid #1E1E1E;border-radius:10px;padding:16px 20px;margin:0 0 28px;">
  <p style="color:#A0A0A0;font-size:14px;margin:0;font-style:italic;">"${truncatePreview(preview)}"</p>
</div>
<a href="${threadUrl}" style="display:inline-block;background:#c9a84c;color:#000;font-weight:700;font-size:15px;text-decoration:none;padding:14px 28px;border-radius:10px;">
Reply →
</a>
<p style="color:#555;font-size:12px;margin:28px 0 0;text-align:center;">Powered by InkBook &middot; inkbook.tech</p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;

  await sendEmail(to, subject, html);
}

export async function sendArtistNewMessageEmail({
  to,
  artistName,
  clientName,
  studioName,
  preview,
  threadUrl,
}: {
  to: string;
  artistName: string;
  clientName: string;
  studioName: string;
  preview: string;
  threadUrl: string;
}) {
  const subject = `New message from ${clientName} — ${studioName}`;

  const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0A0A0A;font-family:sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0A0A0A;padding:40px 16px;">
<tr><td align="center">
<table width="520" cellpadding="0" cellspacing="0" style="background:#111;border:1px solid #1E1E1E;border-radius:16px;padding:40px;">
<tr><td>
<p style="color:#c9a84c;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin:0 0 24px;">New Message</p>
<h1 style="color:#E8E8E8;font-size:22px;font-weight:700;margin:0 0 8px;">Hi ${artistName},</h1>
<p style="color:#A0A0A0;font-size:15px;margin:0 0 24px;">
<strong style="color:#c9a84c;">${clientName}</strong> sent you a message at ${studioName}.
</p>
<div style="background:#0d0d0d;border:1px solid #1E1E1E;border-radius:10px;padding:16px 20px;margin:0 0 28px;">
  <p style="color:#A0A0A0;font-size:14px;margin:0;font-style:italic;">"${truncatePreview(preview)}"</p>
</div>
<a href="${threadUrl}" style="display:inline-block;background:#c9a84c;color:#000;font-weight:700;font-size:15px;text-decoration:none;padding:14px 28px;border-radius:10px;">
Reply →
</a>
<p style="color:#555;font-size:12px;margin:28px 0 0;text-align:center;">Powered by InkBook &middot; inkbook.tech</p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;

  await sendEmail(to, subject, html);
}

export async function sendClientNewMessageEmail({
  to,
  studioName,
  preview,
  threadUrl,
}: {
  to: string;
  studioName: string;
  preview: string;
  threadUrl: string;
}) {
  const subject = `New message from ${studioName}`;

  const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0A0A0A;font-family:sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0A0A0A;padding:40px 16px;">
<tr><td align="center">
<table width="520" cellpadding="0" cellspacing="0" style="background:#111;border:1px solid #1E1E1E;border-radius:16px;padding:40px;">
<tr><td>
<p style="color:#c9a84c;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin:0 0 24px;">New Message</p>
<h1 style="color:#E8E8E8;font-size:22px;font-weight:700;margin:0 0 8px;">${studioName} sent you a message</h1>
<div style="background:#0d0d0d;border:1px solid #1E1E1E;border-radius:10px;padding:16px 20px;margin:24px 0 28px;">
  <p style="color:#A0A0A0;font-size:14px;margin:0;font-style:italic;">"${truncatePreview(preview)}"</p>
</div>
<a href="${threadUrl}" style="display:inline-block;background:#c9a84c;color:#000;font-weight:700;font-size:15px;text-decoration:none;padding:14px 28px;border-radius:10px;">
View & Reply →
</a>
<p style="color:#555;font-size:12px;margin:28px 0 0;text-align:center;">Powered by InkBook &middot; inkbook.tech</p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;

  await sendEmail(to, subject, html);
}
