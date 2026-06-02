const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.inkbook.tech";

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
