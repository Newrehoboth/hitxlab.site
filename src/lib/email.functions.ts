import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const purchaseSchema = z.object({
  beatId: z.string(),
  beatTitle: z.string(),
  producerId: z.string(),
  producerName: z.string(),
  licenseName: z.string(),
  price: z.number(),
  purchaseId: z.string(),
});

export const sendPurchaseEmailsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(purchaseSchema)
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendPurchaseConfirmationEmail } = await import("./email");

    // Buyer info from authenticated context
    const buyerId = context.userId;
    const { data: buyerAuth } = await supabaseAdmin.auth.admin.getUserById(buyerId);
    const buyerEmail = buyerAuth?.user?.email;
    const { data: buyerProfile } = await supabaseAdmin
      .from("profiles")
      .select("name, email")
      .eq("id", buyerId)
      .maybeSingle();
    const buyerName = buyerProfile?.name || buyerEmail?.split("@")[0] || "there";

    // Producer email
    const { data: prodAuth } = await supabaseAdmin.auth.admin.getUserById(data.producerId);
    const producerEmail = prodAuth?.user?.email;

    const results: { buyer: boolean; producer: boolean; error?: string } = {
      buyer: false,
      producer: false,
    };

    try {
      if (buyerEmail) {
        await sendPurchaseConfirmationEmail({
          to: buyerEmail,
          buyerName,
          beatTitle: data.beatTitle,
          producerName: data.producerName,
          licenseName: data.licenseName,
          price: data.price,
          purchaseId: data.purchaseId,
        });
        results.buyer = true;
      }
    } catch (e: any) {
      results.error = `buyer: ${e?.message ?? e}`;
      console.error("[email] buyer send failed", e);
    }

    try {
      if (producerEmail) {
        // Reuse purchase template but frame for producer as a sale notification
        const { Resend } = await import("resend");
        const resend = new Resend(process.env.RESEND_API_KEY);
        const SITE_URL = process.env.VITE_SITE_URL || "https://hitxlab.com.ng";
        const formattedPrice = new Intl.NumberFormat("en-NG", {
          style: "currency",
          currency: "NGN",
          minimumFractionDigits: 0,
        }).format(data.price);

        await resend.emails.send({
          from: "HITXLAB <noreply@hitxlab.com.ng>",
          to: producerEmail,
          subject: `You made a sale — ${data.beatTitle}`,
          html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0b0b12;font-family:Inter,Helvetica,Arial,sans-serif;color:#f0f0f0;">
  <div style="max-width:560px;margin:40px auto;background:#13131e;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.08);">
    <div style="background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);padding:32px 40px;text-align:center;">
      <h1 style="margin:0;font-size:24px;font-weight:800;">HITXLAB</h1>
      <p style="margin:4px 0 0;font-size:13px;color:rgba(255,255,255,0.5);">New Sale Notification</p>
    </div>
    <div style="padding:40px;">
      <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;">Cha-ching! You made a sale 💰</h2>
      <p style="margin:0 0 24px;color:rgba(255,255,255,0.65);font-size:14px;line-height:1.6;">
        ${buyerName} just licensed your beat <strong style="color:#fff;">${data.beatTitle}</strong>.
      </p>
      <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:20px;margin-bottom:28px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:6px 0;color:rgba(255,255,255,0.5);font-size:13px;">Beat</td><td style="padding:6px 0;font-weight:600;font-size:13px;">${data.beatTitle}</td></tr>
          <tr><td style="padding:6px 0;color:rgba(255,255,255,0.5);font-size:13px;">Buyer</td><td style="padding:6px 0;font-weight:600;font-size:13px;">${buyerName}</td></tr>
          <tr><td style="padding:6px 0;color:rgba(255,255,255,0.5);font-size:13px;">License</td><td style="padding:6px 0;"><span style="background:rgba(239,68,68,0.15);color:#ef4444;font-size:11px;font-weight:700;text-transform:uppercase;padding:2px 8px;border-radius:6px;">${data.licenseName}</span></td></tr>
          <tr><td style="padding:6px 0;color:rgba(255,255,255,0.5);font-size:13px;">Amount</td><td style="padding:6px 0;font-weight:800;font-size:16px;color:#ef4444;">${formattedPrice}</td></tr>
        </table>
      </div>
      <div style="text-align:center;margin-bottom:24px;">
        <a href="${SITE_URL}/producer/dashboard?tab=orders" style="display:inline-block;background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;font-weight:700;font-size:14px;padding:14px 32px;border-radius:10px;text-decoration:none;">View sale in dashboard →</a>
      </div>
    </div>
    <div style="padding:20px 40px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
      <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.25);">© ${new Date().getFullYear()} HITXLAB Inc.</p>
    </div>
  </div></body></html>`,
        });
        results.producer = true;
      }
    } catch (e: any) {
      results.error = (results.error ? results.error + " | " : "") + `producer: ${e?.message ?? e}`;
      console.error("[email] producer send failed", e);
    }

    return results;
  });

const welcomeSchema = z.object({
  role: z.enum(["artist", "producer"]),
});

export const sendWelcomeEmailFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(welcomeSchema)
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendWelcomeEmail } = await import("./email");

    const { data: auth } = await supabaseAdmin.auth.admin.getUserById(context.userId);
    const email = auth?.user?.email;
    if (!email) return { sent: false };

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("name")
      .eq("id", context.userId)
      .maybeSingle();
    const name = profile?.name || email.split("@")[0];

    try {
      await sendWelcomeEmail({ to: email, name, role: data.role });
      return { sent: true };
    } catch (e: any) {
      console.error("[email] welcome send failed", e);
      return { sent: false, error: e?.message };
    }
  });

const academyAppSchema = z.object({
  fullName: z.string().min(1),
  email: z.string().email(),
  whatsappNumber: z.string().min(3),
  address: z.string().min(1),
  amount: z.number().optional().default(850000),
  paymentStatus: z.enum(["Pending", "Paid"]).optional().default("Pending"),
  reference: z.string().optional(),
});

export const submitAcademyApplicationFn = createServerFn({ method: "POST" })
  .validator(academyAppSchema)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendAcademyApplicationEmail } = await import("./email");

    try {
      await supabaseAdmin.from("academy_applications").insert({
        full_name: data.fullName,
        email: data.email,
        whatsapp_number: data.whatsappNumber,
        address: data.address,
        amount: data.amount,
        payment_status: data.paymentStatus,
        reference: data.reference ?? null,
      });
    } catch (dbErr: any) {
      console.warn("[submitAcademyApplicationFn] DB insert warning:", dbErr?.message);
    }

    try {
      await sendAcademyApplicationEmail({
        fullName: data.fullName,
        email: data.email,
        whatsappNumber: data.whatsappNumber,
        address: data.address,
        amount: data.amount,
        paymentStatus: data.paymentStatus,
        reference: data.reference,
      });
      return { success: true };
    } catch (err: any) {
      console.error("[submitAcademyApplicationFn] Email send failed:", err);
      return { success: true, emailError: err?.message };
    }
  });
