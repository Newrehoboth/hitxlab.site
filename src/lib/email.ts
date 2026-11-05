import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = "HITXLAB <noreply@hitxlab.com.ng>";
const SITE_URL = process.env.VITE_SITE_URL || "https://hitxlab.com.ng";

// ─── Purchase Confirmation Email ──────────────────────────────────────────────
export async function sendPurchaseConfirmationEmail({
  to,
  buyerName,
  beatTitle,
  producerName,
  licenseName,
  price,
  purchaseId,
}: {
  to: string;
  buyerName: string;
  beatTitle: string;
  producerName: string;
  licenseName: string;
  price: number;
  purchaseId: string;
}) {
  console.log("📧 Attempting to send purchase email to:", to);
  console.log("📧 Resend API Key exists:", !!process.env.RESEND_API_KEY);
  
  const formattedPrice = new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
  }).format(price);

  try {
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `Your beat license is ready — ${beatTitle}`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Purchase Confirmation – HITXLAB</title>
</head>
<body style="margin:0;padding:0;background:#0b0b12;font-family:Inter,Helvetica,Arial,sans-serif;color:#f0f0f0;">
  <div style="max-width:560px;margin:40px auto;background:#13131e;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.08);">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);padding:32px 40px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.08);">
      <div style="display:inline-block;background:linear-gradient(135deg,#ef4444,#dc2626);width:44px;height:44px;border-radius:10px;line-height:44px;font-size:22px;margin-bottom:12px;">🎵</div>
      <h1 style="margin:0;font-size:24px;font-weight:800;letter-spacing:-0.5px;">HITXLAB</h1>
      <p style="margin:4px 0 0;font-size:13px;color:rgba(255,255,255,0.5);">Premium Beats Marketplace</p>
    </div>

    <!-- Body -->
    <div style="padding:40px;">
      <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;">Your license is ready! 🎉</h2>
      <p style="margin:0 0 28px;color:rgba(255,255,255,0.65);font-size:14px;line-height:1.6;">
        Hey ${buyerName}, your purchase was successful. Your beat files and signed license agreement are waiting in your library.
      </p>

      <!-- Beat Card -->
      <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:20px;margin-bottom:28px;">
        <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:rgba(255,255,255,0.4);margin-bottom:12px;">Beat Details</div>
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:6px 0;color:rgba(255,255,255,0.5);font-size:13px;width:40%;">Beat</td>
            <td style="padding:6px 0;font-weight:600;font-size:13px;">${beatTitle}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:rgba(255,255,255,0.5);font-size:13px;">Producer</td>
            <td style="padding:6px 0;font-weight:600;font-size:13px;">${producerName}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:rgba(255,255,255,0.5);font-size:13px;">License</td>
            <td style="padding:6px 0;"><span style="background:rgba(212,160,23,0.15);color:#d4a017;font-size:11px;font-weight:700;text-transform:uppercase;padding:2px 8px;border-radius:6px;">${licenseName}</span></td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:rgba(255,255,255,0.5);font-size:13px;">Amount Paid</td>
            <td style="padding:6px 0;font-weight:800;font-size:16px;color:#d4a017;">${formattedPrice}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:rgba(255,255,255,0.5);font-size:13px;">License ID</td>
            <td style="padding:6px 0;font-size:11px;font-family:monospace;color:rgba(255,255,255,0.4);">${purchaseId.slice(0, 16).toUpperCase()}</td>
          </tr>
        </table>
      </div>

      <!-- CTA -->
      <div style="text-align:center;margin-bottom:32px;">
        <a href="${SITE_URL}/dashboard/library" style="display:inline-block;background:linear-gradient(135deg,#d4a017,#a87010);color:#000;font-weight:700;font-size:14px;padding:14px 32px;border-radius:10px;text-decoration:none;letter-spacing:0.2px;">
          Download Your Beat →
        </a>
      </div>

      <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.35);text-align:center;line-height:1.6;">
        Your signed license agreement is included in your download.<br/>
        Questions? Reply to this email or visit <a href="${SITE_URL}" style="color:#d4a017;text-decoration:none;">hitxlab.com.ng</a>
      </p>
    </div>

    <!-- Footer -->
    <div style="padding:20px 40px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
      <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.25);">
        © ${new Date().getFullYear()} HITXLAB Inc. · <a href="${SITE_URL}" style="color:rgba(255,255,255,0.35);text-decoration:none;">hitxlab.com.ng</a>
      </p>
    </div>
  </div>
</body>
</html>`,
    });
    
    console.log("✅ Purchase email sent successfully to:", to);
    console.log("📧 Email ID:", result.data?.id);
    return result;
  } catch (error) {
    console.error("❌ Failed to send purchase email:", error);
    throw error;
  }
}

// ─── Welcome Email (after first sign-in post-verification) ───────────────────
export async function sendWelcomeEmail({
  to,
  name,
  role,
}: {
  to: string;
  name: string;
  role: "artist" | "producer";
}) {
  const dashboardUrl =
    role === "producer"
      ? `${SITE_URL}/producer/dashboard`
      : `${SITE_URL}/artist/dashboard`;
  const roleLabel = role === "producer" ? "Producer" : "Artist";

  return resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `Welcome to HITXLAB, ${name}! 🎵`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><title>Welcome to HITXLAB</title></head>
<body style="margin:0;padding:0;background:#0b0b12;font-family:Inter,Helvetica,Arial,sans-serif;color:#f0f0f0;">
  <div style="max-width:560px;margin:40px auto;background:#13131e;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.08);">
    <div style="background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);padding:32px 40px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.08);">
      <h1 style="margin:0;font-size:24px;font-weight:800;">HITXLAB</h1>
      <p style="margin:4px 0 0;font-size:13px;color:rgba(255,255,255,0.5);">Premium Beats Marketplace</p>
    </div>
    <div style="padding:40px;">
      <h2 style="margin:0 0 12px;font-size:22px;font-weight:700;">Welcome, ${name}! 👋</h2>
      <p style="margin:0 0 24px;color:rgba(255,255,255,0.65);font-size:14px;line-height:1.7;">
        Your account is verified and ready. You've joined as a <strong style="color:#ef4444;">${roleLabel}</strong> on HITXLAB — Africa's premium beats marketplace.
      </p>
      ${
        role === "producer"
          ? `<p style="margin:0 0 24px;color:rgba(255,255,255,0.65);font-size:14px;line-height:1.7;">Start uploading your beats, set your prices, and reach thousands of artists looking for the perfect sound.</p>`
          : `<p style="margin:0 0 24px;color:rgba(255,255,255,0.65);font-size:14px;line-height:1.7;">Browse thousands of premium beats from Africa's top producers. License instantly with auto-signed contracts.</p>`
      }
      <div style="text-align:center;">
        <a href="${dashboardUrl}" style="display:inline-block;background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;font-weight:700;font-size:14px;padding:14px 32px;border-radius:10px;text-decoration:none;">
          Go to My Dashboard →
        </a>
      </div>
    </div>
    <div style="padding:20px 40px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
      <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.25);">© ${new Date().getFullYear()} HITXLAB Inc. · <a href="${SITE_URL}" style="color:rgba(255,255,255,0.35);text-decoration:none;">hitxlab.com.ng</a></p>
    </div>
  </div>
</body>
</html>`,
  });
}

// ─── Academy Application Notification Email ──────────────────────────────────────────────
export async function sendAcademyApplicationEmail({
  fullName,
  email,
  whatsappNumber,
  address,
  amount,
  paymentStatus,
  reference,
}: {
  fullName: string;
  email: string;
  whatsappNumber: string;
  address: string;
  amount: number;
  paymentStatus: "Pending" | "Paid";
  reference?: string;
}) {
  const formattedPrice = new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
  }).format(amount);

  const cleanPhone = whatsappNumber.replace(/\D/g, "");
  const waUrl = cleanPhone ? `https://wa.me/${cleanPhone}` : "";

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>New Academy Application – HITXLAB</title>
</head>
<body style="margin:0;padding:0;background:#0b0b12;font-family:Inter,Helvetica,Arial,sans-serif;color:#f0f0f0;">
  <div style="max-width:580px;margin:40px auto;background:#13131e;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.08);">
    <div style="background:linear-gradient(135deg,#ef4444 0%,#dc2626 100%);padding:32px 40px;text-align:center;">
      <h1 style="margin:0;font-size:24px;font-weight:800;color:#ffffff;">🎓 New Academy Application</h1>
      <p style="margin:6px 0 0;font-size:14px;color:rgba(255,255,255,0.85);">HITXLAB Academy Founding Cohort</p>
    </div>

    <div style="padding:40px;">
      <p style="margin:0 0 20px;font-size:15px;color:rgba(255,255,255,0.9);">
        A new student has submitted an application for the HITXLAB Academy! Here are their details:
      </p>

      <div style="background:rgba(255,255,255,0.04);border-radius:12px;padding:20px;margin-bottom:24px;border:1px solid rgba(255,255,255,0.08);">
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <tr>
            <td style="padding:8px 0;color:rgba(255,255,255,0.5);width:140px;font-weight:600;">Full Name:</td>
            <td style="padding:8px 0;font-weight:700;color:#ffffff;">${fullName}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:rgba(255,255,255,0.5);font-weight:600;">Email:</td>
            <td style="padding:8px 0;font-weight:700;color:#ffffff;"><a href="mailto:${email}" style="color:#ef4444;text-decoration:none;">${email}</a></td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:rgba(255,255,255,0.5);font-weight:600;">WhatsApp / Phone:</td>
            <td style="padding:8px 0;font-weight:700;color:#25D366;">
              ${whatsappNumber} 
              ${waUrl ? `<a href="${waUrl}" target="_blank" style="display:inline-block;margin-left:8px;padding:3px 10px;background:#25D366;color:#000000;font-size:11px;font-weight:bold;border-radius:6px;text-decoration:none;">Chat on WhatsApp →</a>` : ''}
            </td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:rgba(255,255,255,0.5);font-weight:600;">Address:</td>
            <td style="padding:8px 0;font-weight:600;color:rgba(255,255,255,0.9);">${address}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:rgba(255,255,255,0.5);font-weight:600;">Program Fee:</td>
            <td style="padding:8px 0;font-weight:800;font-size:16px;color:#ef4444;">${formattedPrice}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:rgba(255,255,255,0.5);font-weight:600;">Payment Status:</td>
            <td style="padding:8px 0;">
              <span style="padding:4px 10px;border-radius:20px;font-size:12px;font-weight:bold;${paymentStatus === 'Paid' ? 'background:rgba(16,185,129,0.2);color:#10b981;' : 'background:rgba(245,158,11,0.2);color:#f59e0b;'}">
                ${paymentStatus}
              </span>
            </td>
          </tr>
          ${reference ? `
          <tr>
            <td style="padding:8px 0;color:rgba(255,255,255,0.5);font-weight:600;">Paystack Ref:</td>
            <td style="padding:8px 0;font-family:monospace;color:rgba(255,255,255,0.7);">${reference}</td>
          </tr>
          ` : ''}
        </table>
      </div>

      ${waUrl ? `
      <div style="text-align:center;margin-top:28px;">
        <a href="${waUrl}" target="_blank" style="display:inline-block;background:#25D366;color:#000000;font-weight:800;font-size:15px;padding:14px 28px;border-radius:12px;text-decoration:none;">
          💬 Chat Student on WhatsApp
        </a>
      </div>
      ` : ''}
    </div>
  </div>
</body>
</html>
  `;

  const recipients = ["rehobothekene@gmail.com", "Hitxlabng@gmail.com"];

  for (const toEmail of recipients) {
    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: toEmail,
        subject: `🎓 New Academy Application: ${fullName} (${paymentStatus})`,
        html,
      });
      console.log(`[sendAcademyApplicationEmail] Sent to ${toEmail}`);
    } catch (err) {
      console.error(`[sendAcademyApplicationEmail] Error sending to ${toEmail}:`, err);
    }
  }
}
