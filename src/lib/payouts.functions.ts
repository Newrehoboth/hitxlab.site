import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const linesSchema = z.object({
  paymentReference: z.string().trim().min(8).max(160),
  items: z
    .array(z.object({ beatId: z.string().uuid(), licenseType: z.string().min(1).max(40) }))
    .min(1)
    .max(20),
});

export const recordPurchaseFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(linesSchema)
  .handler(async ({ data, context }) => {
    const { recordPurchases } = await import("./payouts.server");
    // Pass context.supabase so the RPC uses the authenticated role (not anon)
    const rows = await recordPurchases(context.userId, data.items, data.paymentReference, context.supabase);
    return rows.map((r: any) => ({
      id: r.id,
      beatId: r.beat_id,
      beatTitle: r.beat_title,
      producerId: r.producer_id,
      licenseName: r.license_name,
      licenseType: r.license_type,
      grossAmount: Number(r.gross_amount),
      platformCommission: Number(r.platform_commission),
      producerEarnings: Number(r.producer_earnings),
      invoiceNumber: r.invoice_number,
      status: r.payment_status,
    }));
  });

export const getWalletFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getWalletSummary, listProducerTransactions, listProducerWithdrawals } = await import(
      "./payouts.server"
    );
    const [summary, transactions, withdrawals] = await Promise.all([
      getWalletSummary(context.userId),
      listProducerTransactions(context.userId),
      listProducerWithdrawals(context.userId),
    ]);
    return { ...summary, transactions, withdrawals };
  });

const savePayoutAccountSchema = z.object({
  bankName: z.string().trim().min(2).max(80),
  accountNumber: z.string().trim().regex(/^\d{6,20}$/, "Enter a valid account number"),
  accountName: z.string().trim().min(2).max(120),
});

export const savePayoutAccountFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(savePayoutAccountSchema)
  .handler(async ({ data, context }) => {
    const { savePayoutAccount } = await import("./payouts.server");
    return savePayoutAccount(context.userId, data);
  });

const withdrawalSchema = z.object({ amount: z.number().positive().max(100_000_000) });

export const requestWithdrawalFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(withdrawalSchema)
  .handler(async ({ data, context }) => {
    const { createWithdrawal } = await import("./payouts.server");
    return createWithdrawal(context.userId, data.amount);
  });

export const adminOverviewFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { isAdminUser, getAdminOverview } = await import("./payouts.server");
    if (!(await isAdminUser(context.userId))) throw new Error("Forbidden");
    return getAdminOverview();
  });

export const adminFullOverviewFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { isAdminUser, getFullAdminData } = await import("./payouts.server");
    if (!(await isAdminUser(context.userId))) throw new Error("Forbidden");
    return getFullAdminData();
  });

const adminSettleWithdrawalSchema = z.object({
  withdrawalId: z.string().uuid(),
  status: z.enum(["processing", "paid", "failed", "reversed"]),
  note: z.string().max(500).nullable().optional(),
});

export const adminSettleWithdrawalFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(adminSettleWithdrawalSchema)
  .handler(async ({ data, context }) => {
    const { isAdminUser, settleWithdrawalAs } = await import("./payouts.server");
    if (!(await isAdminUser(context.userId))) throw new Error("Forbidden");
    return settleWithdrawalAs(data.withdrawalId, data.status, data.note ?? null);
  });

const adminToggleSuspendUserSchema = z.object({
  targetUserId: z.string().uuid(),
  suspend: z.boolean(),
});

export const adminToggleSuspendUserFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(adminToggleSuspendUserSchema)
  .handler(async ({ data, context }) => {
    const { isAdminUser, toggleSuspendUser } = await import("./payouts.server");
    if (!(await isAdminUser(context.userId))) throw new Error("Forbidden");
    return toggleSuspendUser(data.targetUserId, data.suspend);
  });

const adminDeleteUserSchema = z.object({
  targetUserId: z.string().uuid(),
});

export const adminDeleteUserFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(adminDeleteUserSchema)
  .handler(async ({ data, context }) => {
    const { isAdminUser, deleteUserAdmin } = await import("./payouts.server");
    if (!(await isAdminUser(context.userId))) throw new Error("Forbidden");
    return deleteUserAdmin(data.targetUserId);
  });

export const amIAdminFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { isAdminUser } = await import("./payouts.server");
    return { admin: await isAdminUser(context.userId) };
  });

/** Returns the live list of Nigerian banks from Paystack. */
export const listBanksFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { listNigerianBanks } = await import("./payouts.server");
    return listNigerianBanks();
  });

const resolveAccountNameSchema = z.object({
  accountNumber: z.string().trim().regex(/^\d{10}$/, "Account number must be 10 digits"),
  bankCode: z.string().trim().min(2).max(10),
});

/** Resolves an account name from bank code + account number (Paystack BVN-verified). */
export const resolveAccountNameFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(resolveAccountNameSchema)
  .handler(async ({ data }) => {
    const { resolveAccountName } = await import("./payouts.server");
    const name = await resolveAccountName(data.accountNumber, data.bankCode);
    return { accountName: name };
  });

const connectSubaccountSchema = z.object({
  bankCode: z.string().trim().min(2).max(10),
  accountNumber: z.string().trim().regex(/^\d{10}$/, "Account number must be 10 digits"),
  businessName: z.string().trim().min(2).max(120),
});

/** Creates a Paystack Subaccount for the logged-in producer and stores the code. */
export const connectSubaccountFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(connectSubaccountSchema)
  .handler(async ({ data, context }) => {
    const { createPaystackSubaccount } = await import("./payouts.server");
    return createPaystackSubaccount(
      context.userId,
      data.bankCode,
      data.accountNumber,
      data.businessName,
      context.supabase, // Pass the authenticated user's Supabase client
    );
  });

/** Returns the current subaccount connection status for the logged-in producer. */
export const getSubaccountStatusFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getSubaccountStatus } = await import("./payouts.server");
    return getSubaccountStatus(context.userId, context.supabase);
  });

const getSubaccountForBeatSchema = z.object({ beatId: z.string().uuid() });

/** Returns the subaccount code for a beat's producer (for split payment at checkout). */
export const getSubaccountForBeatFn = createServerFn({ method: "POST" })
  .validator(getSubaccountForBeatSchema)
  .handler(async ({ data }) => {
    const { getSubaccountForBeatPublic } = await import("./payouts.server");
    const subaccountCode = await getSubaccountForBeatPublic(data.beatId);
    return { subaccountCode };
  });
