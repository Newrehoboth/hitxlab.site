import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type ModerationReason =
  | "copyright_claim"
  | "uploaded_music_not_beat"
  | "inappropriate_content"
  | "spam"
  | "terms_violation"
  | "other";

export type StrikeReason =
  | "copyright_violation"
  | "uploaded_music_instead_of_beat"
  | "inappropriate_content"
  | "spam"
  | "terms_violation"
  | "multiple_violations"
  | "other";

export type TakedownAction = "takedown_temporary" | "takedown_permanent" | "restore" | "warning";
export type StrikeType = "warning" | "violation" | "severe_violation";

/** Create in-app notification */
async function createNotification(params: {
  userId: string;
  title: string;
  message: string;
  type: string;
  link?: string;
}) {
  try {
    await supabaseAdmin.from("notifications").insert({
      user_id: params.userId,
      title: params.title,
      message: params.message,
      type: params.type,
      link: params.link || null,
      is_read: false,
    });
  } catch (err) {
    console.error("[Moderation] Failed to create notification:", err);
    // Don't throw - notification failure shouldn't block moderation
  }
}

/** Take down a beat (temporarily or permanently) */
export async function takedownBeat(params: {
  beatId: string;
  adminId: string;
  actionType: TakedownAction;
  reason: ModerationReason;
  customReason?: string;
  adminNotes?: string;
  expiresAt?: string; // ISO date for temporary takedowns
}) {
  const { beatId, adminId, actionType, reason, customReason, adminNotes, expiresAt } = params;

  // Get beat and producer info first
  const { data: beat, error: beatError } = await supabaseAdmin
    .from("beats")
    .select("id, title, producer_id")
    .eq("id", beatId)
    .single();

  if (beatError || !beat) {
    console.error("[Moderation] Beat not found:", beatError);
    throw new Error("Beat not found");
  }

  // Get producer info
  const { data: producer, error: producerError } = await supabaseAdmin
    .from("profiles")
    .select("id, name, email")
    .eq("id", beat.producer_id)
    .single();

  if (producerError || !producer) {
    console.error("[Moderation] Producer not found:", producerError);
    throw new Error("Producer not found");
  }

  const producerEmail = producer.email || "";
  const producerName = producer.name || "Producer";
  const producerId = beat.producer_id;

  console.log("[Moderation] Taking down beat:", {
    beatId,
    beatTitle: beat.title,
    producerId,
    producerEmail,
    actionType,
  });

  // If permanent takedown, DELETE the beat
  if (actionType === "takedown_permanent") {
    // Delete the beat from database
    const { error: deleteError } = await supabaseAdmin
      .from("beats")
      .delete()
      .eq("id", beatId);

    if (deleteError) {
      console.error("[Moderation] Failed to delete beat:", deleteError);
      throw new Error(`Failed to delete beat: ${deleteError.message}`);
    }

    console.log("[Moderation] ✅ Beat deleted from database");

    // Record the action before deletion
    await supabaseAdmin.from("beat_moderation_actions").insert({
      beat_id: beatId,
      producer_id: producerId,
      admin_id: adminId,
      action_type: actionType,
      reason,
      custom_reason: customReason || null,
      admin_notes: adminNotes || null,
      expires_at: null,
    });

    // Send email
    await sendBeatTakedownEmail({
      producerEmail,
      producerName,
      beatTitle: beat.title,
      actionType,
      reason,
      customReason,
      expiresAt: undefined,
    });

    // Send in-app notification
    await createNotification({
      userId: producerId,
      title: "Beat Permanently Removed",
      message: `Your beat "${beat.title}" has been permanently removed from the platform.`,
      type: "moderation",
      link: "/producer/dashboard",
    });

    return {
      success: true,
      action: "deleted",
      beatId,
      beatTitle: beat.title,
      producerId,
      producerEmail,
    };
  }

  // For temporary takedown, just hide it
  const { data, error } = await supabaseAdmin.rpc("takedown_beat", {
    _beat_id: beatId,
    _admin_id: adminId,
    _action_type: actionType,
    _reason: reason,
    _custom_reason: customReason || null,
    _admin_notes: adminNotes || null,
    _expires_at: expiresAt || null,
  });

  if (error) {
    console.error("[Moderation] Takedown RPC failed:", error);
    throw new Error(error.message);
  }

  console.log("[Moderation] ✅ Beat taken down temporarily");

  // Send email notification
  await sendBeatTakedownEmail({
    producerEmail,
    producerName,
    beatTitle: beat.title,
    actionType,
    reason,
    customReason,
    expiresAt,
  });

  // Send in-app notification
  const notificationMessage =
    actionType === "takedown_temporary"
      ? `Your beat "${beat.title}" has been temporarily hidden. ${expiresAt ? `It will be restored on ${new Date(expiresAt).toLocaleDateString()}.` : ""}`
      : `Your beat "${beat.title}" has been flagged for review.`;

  await createNotification({
    userId: producerId,
    title: "Beat Moderation Notice",
    message: notificationMessage,
    type: "moderation",
    link: "/producer/dashboard",
  });

  // Mark action as complete
  await supabaseAdmin
    .from("beat_moderation_actions")
    .update({
      email_sent: true,
      email_sent_at: new Date().toISOString(),
    })
    .eq("beat_id", beatId)
    .eq("admin_id", adminId)
    .order("created_at", { ascending: false })
    .limit(1);

  return data;
}

/** Give a user a strike (auto-suspends at 2+ strikes) */
export async function giveUserStrike(params: {
  userId: string;
  adminId: string;
  strikeType: StrikeType;
  reason: StrikeReason;
  customReason?: string;
  adminNotes?: string;
  relatedBeatId?: string;
}) {
  const { userId, adminId, strikeType, reason, customReason, adminNotes, relatedBeatId } = params;

  // Get user info
  const { data: user, error: userError } = await supabaseAdmin
    .from("profiles")
    .select("id, name, email")
    .eq("id", userId)
    .single();

  if (userError || !user) throw new Error("User not found");

  // Call database function
  const { data, error } = await supabaseAdmin.rpc("give_user_strike", {
    _user_id: userId,
    _admin_id: adminId,
    _strike_type: strikeType,
    _reason: reason,
    _custom_reason: customReason || null,
    _admin_notes: adminNotes || null,
    _related_beat_id: relatedBeatId || null,
  });

  if (error) throw new Error(error.message);

  // Send email notification
  const result = data as any;
  await sendUserStrikeEmail({
    userEmail: user.email || "",
    userName: user.name || "User",
    strikeType,
    reason,
    customReason,
    totalStrikes: result.total_strikes,
    suspended: result.suspended,
  });

  // Send in-app notification
  const notificationTitle = result.suspended
    ? "Account Suspended"
    : `Strike ${result.total_strikes}/2 Received`;

  const notificationMessage = result.suspended
    ? `Your account has been suspended due to multiple violations. Contact support to appeal.`
    : `You have received a strike. ${result.total_strikes === 1 ? "One more strike will result in suspension." : ""}`;

  await createNotification({
    userId,
    title: notificationTitle,
    message: notificationMessage,
    type: "moderation",
    link: "/dashboard",
  });

  // Mark email as sent
  await supabaseAdmin
    .from("user_strikes")
    .update({
      email_sent: true,
      email_sent_at: new Date().toISOString(),
    })
    .eq("id", result.strike_id);

  return result;
}

/** Get user's moderation summary */
export async function getUserModerationSummary(userId: string) {
  const { data, error } = await supabaseAdmin.rpc("get_user_moderation_summary", {
    _user_id: userId,
  });

  if (error) throw new Error(error.message);
  return data;
}

/** Get all moderation actions for admin dashboard */
export async function getAllModerationActions() {
  const [beatActions, userStrikes, activityLog] = await Promise.all([
    supabaseAdmin
      .from("beat_moderation_actions")
      .select(
        `
        *,
        beat:beats(title, cover_url),
        producer:profiles!beat_moderation_actions_producer_id_fkey(name, email),
        admin:profiles!beat_moderation_actions_admin_id_fkey(name, email)
      `,
      )
      .order("created_at", { ascending: false })
      .limit(50),

    supabaseAdmin
      .from("user_strikes")
      .select(
        `
        *,
        user:profiles!user_strikes_user_id_fkey(name, email, total_strikes, is_suspended),
        admin:profiles!user_strikes_admin_id_fkey(name, email)
      `,
      )
      .order("created_at", { ascending: false })
      .limit(50),

    supabaseAdmin
      .from("moderation_activity_log")
      .select("*, admin:profiles!moderation_activity_log_admin_id_fkey(name, email)")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  return {
    beatActions: beatActions.data || [],
    userStrikes: userStrikes.data || [],
    activityLog: activityLog.data || [],
  };
}

/** Get beats that are taken down */
export async function getTakenDownBeats() {
  const { data, error } = await supabaseAdmin
    .from("beats")
    .select(
      `
      *,
      producer:profiles!beats_producer_id_fkey(name, email, username),
      moderation_actions:beat_moderation_actions(*)
    `,
    )
    .in("moderation_status", ["taken_down_temporary", "taken_down_permanent"])
    .order("taken_down_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

/** Get users with strikes */
export async function getUsersWithStrikes() {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select(
      `
      *,
      strikes:user_strikes(*)
    `,
    )
    .gt("active_strikes", 0)
    .order("active_strikes", { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

// ═══════════════════════════════════════════════════════════════════════════
// EMAIL NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════

async function sendBeatTakedownEmail(params: {
  producerEmail: string;
  producerName: string;
  beatTitle: string;
  actionType: TakedownAction;
  reason: ModerationReason;
  customReason?: string;
  expiresAt?: string;
}) {
  const { producerEmail, producerName, beatTitle, actionType, reason, customReason, expiresAt } =
    params;

  if (!producerEmail) {
    console.error("[Moderation] Cannot send email: No producer email provided");
    return;
  }

  const reasonText = {
    copyright_claim: "Copyright Claim",
    uploaded_music_not_beat: "Uploaded Music Instead of Beat",
    inappropriate_content: "Inappropriate Content",
    spam: "Spam",
    terms_violation: "Terms of Service Violation",
    other: "Other",
  }[reason];

  const actionText = {
    takedown_temporary: "Temporarily Taken Down",
    takedown_permanent: "Permanently Removed",
    restore: "Restored",
    warning: "Under Review",
  }[actionType];

  const isPermanent = actionType === "takedown_permanent";
  const expiryText = expiresAt
    ? `This takedown will expire on ${new Date(expiresAt).toLocaleDateString()}.`
    : "";

  try {
    const { Resend } = await import("resend");
    const resendApiKey = process.env.RESEND_API_KEY;
    
    if (!resendApiKey) {
      console.error("[Moderation] RESEND_API_KEY not configured");
      return;
    }
    
    const resend = new Resend(resendApiKey);

    console.log(`[Moderation] Sending beat takedown email to ${producerEmail}...`);
    console.log(`[Moderation] Using Resend API Key: ${resendApiKey.substring(0, 10)}...`);

    const result = await resend.emails.send({
      from: "HITXLAB Moderation <onboarding@resend.dev>",
      to: producerEmail,
      subject: `⚠️ Beat ${actionText}: ${beatTitle}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #fee; border-left: 4px solid #ef4444; padding: 20px; margin-bottom: 20px;">
            <h2 style="color: #dc2626; margin: 0;">Content Moderation Notice</h2>
          </div>
          
          <p>Hello ${producerName},</p>
          
          <p>Your beat <strong>"${beatTitle}"</strong> has been <strong>${actionText.toLowerCase()}</strong> by our moderation team.</p>
          
          <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Reason</h3>
            <p style="margin: 5px 0;"><strong>${reasonText}</strong></p>
            ${customReason ? `<p style="color: #666;">${customReason}</p>` : ""}
          </div>
          
          ${expiryText ? `<p style="color: #666;">${expiryText}</p>` : ""}
          
          ${
            isPermanent
              ? `
          <p style="color: #dc2626; font-weight: bold;">
            This is a permanent removal. The beat has been deleted from the platform.
          </p>
          `
              : `
          <p>If you believe this was done in error, please contact our support team.</p>
          `
          }
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 14px;">
            <p><strong>What this means:</strong></p>
            <ul>
              <li>The beat is no longer visible to buyers</li>
              <li>It won't appear in search results or your profile</li>
              ${!isPermanent ? "<li>You can appeal this decision</li>" : "<li>This action is permanent and cannot be reversed</li>"}
            </ul>
          </div>
          
          <a href="https://hitxlab.com/producer/dashboard" 
             style="display: inline-block; background: #ef4444; color: white; 
                    padding: 12px 24px; text-decoration: none; border-radius: 6px; 
                    margin-top: 20px;">
            View Dashboard
          </a>
          
          <p style="margin-top: 30px; color: #999; font-size: 12px;">
            This is an automated message from HITXLAB Moderation Team.
          </p>
        </div>
      `,
    });

    console.log(`[Moderation] ✅ Beat takedown email sent to ${producerEmail}`);
    console.log(`[Moderation] Email result:`, result);
  } catch (err: any) {
    console.error("[Moderation] ❌ Failed to send beat takedown email:", err);
    console.error("[Moderation] Error message:", err.message);
    console.error("[Moderation] Error details:", JSON.stringify(err, null, 2));
    // Re-throw so we can see the error in the UI
    throw new Error(`Failed to send email: ${err.message}`);
  }
}

async function sendUserStrikeEmail(params: {
  userEmail: string;
  userName: string;
  strikeType: StrikeType;
  reason: StrikeReason;
  customReason?: string;
  totalStrikes: number;
  suspended: boolean;
}) {
  const { userEmail, userName, strikeType, reason, customReason, totalStrikes, suspended } = params;

  const reasonText = {
    copyright_violation: "Copyright Violation",
    uploaded_music_instead_of_beat: "Uploaded Music Instead of Beat",
    inappropriate_content: "Inappropriate Content",
    spam: "Spam",
    terms_violation: "Terms of Service Violation",
    multiple_violations: "Multiple Violations",
    other: "Other",
  }[reason];

  const strikeTypeText = {
    warning: "Warning",
    violation: "Violation",
    severe_violation: "Severe Violation",
  }[strikeType];

  try {
    const { Resend } = await import("resend");
    const resendApiKey = process.env.RESEND_API_KEY;
    
    if (!resendApiKey) {
      console.error("[Moderation] RESEND_API_KEY not configured for strike email");
      throw new Error("RESEND_API_KEY not configured");
    }
    
    const resend = new Resend(resendApiKey);
    
    console.log(`[Moderation] Sending strike email to ${userEmail}...`);

    const result = await resend.emails.send({
      from: "HITXLAB Moderation <onboarding@resend.dev>",
      to: userEmail,
      subject: suspended
        ? `🚨 Account Suspended - Strike ${totalStrikes}`
        : `⚠️ Strike ${totalStrikes}/2 - ${strikeTypeText}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: ${suspended ? "#dc2626" : "#f59e0b"}; color: white; padding: 20px; margin-bottom: 20px;">
            <h2 style="margin: 0;">${suspended ? "🚨 Account Suspended" : `⚠️ Strike ${totalStrikes}/2`}</h2>
          </div>
          
          <p>Hello ${userName},</p>
          
          ${
            suspended
              ? `
          <p style="font-size: 18px; color: #dc2626; font-weight: bold;">
            Your account has been suspended due to multiple strikes.
          </p>
          `
              : `
          <p>Your account has received a <strong>${strikeTypeText}</strong>.</p>
          `
          }
          
          <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Reason</h3>
            <p style="margin: 5px 0;"><strong>${reasonText}</strong></p>
            ${customReason ? `<p style="color: #666;">${customReason}</p>` : ""}
          </div>
          
          <div style="background: ${suspended ? "#fee" : "#fef3c7"}; border-left: 4px solid ${suspended ? "#ef4444" : "#f59e0b"}; padding: 15px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: ${suspended ? "#dc2626" : "#d97706"};">
              Strike Status: ${totalStrikes} / 2
            </h3>
            <ul style="margin: 10px 0;">
              <li><strong>Strike 1:</strong> Warning - Account under close watch</li>
              <li><strong>Strike 2:</strong> Suspension - Account disabled until further notice</li>
            </ul>
          </div>
          
          ${
            suspended
              ? `
          <div style="background: #fee; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #dc2626; margin-top: 0;">Account Suspended</h3>
            <p>Your account is now suspended. You cannot:</p>
            <ul>
              <li>Upload new beats</li>
              <li>Edit existing beats</li>
              <li>Receive earnings</li>
              <li>Access producer features</li>
            </ul>
            <p style="font-weight: bold; margin-top: 15px;">
              To appeal this suspension, contact our support team immediately.
            </p>
          </div>
          `
              : `
          <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #d97706; margin-top: 0;">⚠️ Warning</h3>
            <p><strong>One more strike will result in account suspension.</strong></p>
            <p>Please ensure you follow our Community Guidelines and Terms of Service.</p>
          </div>
          `
          }
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
            <h3>What to do next:</h3>
            <ul>
              <li>Review our <a href="https://hitxlab.com/terms">Terms of Service</a></li>
              <li>Read our <a href="https://hitxlab.com/community-guidelines">Community Guidelines</a></li>
              <li>Contact support if you believe this is an error</li>
            </ul>
          </div>
          
          <a href="https://hitxlab.com/support" 
             style="display: inline-block; background: #ef4444; color: white; 
                    padding: 12px 24px; text-decoration: none; border-radius: 6px; 
                    margin-top: 20px;">
            Contact Support
          </a>
          
          <p style="margin-top: 30px; color: #999; font-size: 12px;">
            This is an automated message from HITXLAB Moderation Team.
          </p>
        </div>
      `,
    });

    console.log(`[Moderation] ✅ Strike email sent to ${userEmail} (suspended: ${suspended})`);
    console.log(`[Moderation] Email result:`, result);
  } catch (err: any) {
    console.error("[Moderation] ❌ Failed to send strike email:", err);
    console.error("[Moderation] Error message:", err.message);
    // Re-throw so we can see the error
    throw new Error(`Failed to send strike email: ${err.message}`);
  }
}
