import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isAdminUser } from "./payouts.server";

// Validation schemas
const takedownBeatSchema = z.object({
  beatId: z.string().uuid(),
  actionType: z.enum(["takedown_temporary", "takedown_permanent", "restore", "warning"]),
  reason: z.enum([
    "copyright_claim",
    "uploaded_music_not_beat",
    "inappropriate_content",
    "spam",
    "terms_violation",
    "other",
  ]),
  customReason: z.string().optional(),
  adminNotes: z.string().optional(),
  expiresAt: z.string().optional(), // ISO date string
});

const giveUserStrikeSchema = z.object({
  userId: z.string().uuid(),
  strikeType: z.enum(["warning", "violation", "severe_violation"]),
  reason: z.enum([
    "copyright_violation",
    "uploaded_music_instead_of_beat",
    "inappropriate_content",
    "spam",
    "terms_violation",
    "multiple_violations",
    "other",
  ]),
  customReason: z.string().optional(),
  adminNotes: z.string().optional(),
  relatedBeatId: z.string().uuid().optional(),
});

const getUserModerationSummarySchema = z.object({
  userId: z.string().uuid(),
});

/** Take down a beat (admin only) */
export const takedownBeatFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(takedownBeatSchema)
  .handler(async ({ data, context }) => {
    // Check admin permission
    if (!(await isAdminUser(context.userId))) {
      throw new Error("Forbidden: Admin access required");
    }

    const { takedownBeat } = await import("./moderation.server");
    return takedownBeat({
      ...data,
      adminId: context.userId,
    });
  });

/** Give user a strike (admin only) */
export const giveUserStrikeFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(giveUserStrikeSchema)
  .handler(async ({ data, context }) => {
    // Check admin permission
    if (!(await isAdminUser(context.userId))) {
      throw new Error("Forbidden: Admin access required");
    }

    const { giveUserStrike } = await import("./moderation.server");
    return giveUserStrike({
      ...data,
      adminId: context.userId,
    });
  });

/** Get user's moderation summary */
export const getUserModerationSummaryFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(getUserModerationSummarySchema)
  .handler(async ({ data }) => {
    const { getUserModerationSummary } = await import("./moderation.server");
    return getUserModerationSummary(data.userId);
  });

/** Get all moderation actions (admin only) */
export const getAllModerationActionsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Check admin permission
    if (!(await isAdminUser(context.userId))) {
      throw new Error("Forbidden: Admin access required");
    }

    const { getAllModerationActions } = await import("./moderation.server");
    return getAllModerationActions();
  });

/** Get taken down beats (admin only) */
export const getTakenDownBeatsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Check admin permission
    if (!(await isAdminUser(context.userId))) {
      throw new Error("Forbidden: Admin access required");
    }

    const { getTakenDownBeats } = await import("./moderation.server");
    return getTakenDownBeats();
  });

/** Get users with strikes (admin only) */
export const getUsersWithStrikesFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Check admin permission
    if (!(await isAdminUser(context.userId))) {
      throw new Error("Forbidden: Admin access required");
    }

    const { getUsersWithStrikes } = await import("./moderation.server");
    return getUsersWithStrikes();
  });
