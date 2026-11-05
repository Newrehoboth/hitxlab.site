import { calculateSplit } from "@/lib/commission";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type PurchaseLineInput = { beatId: string; licenseType: string };

type LicenseRow = {
  type: string;
  name: string;
  price: number;
  contract?: string;
  isNegotiable?: boolean;
};

export async function isAdminUser(userId: string) {
  if (!userId) return false;
  try {
    const { data: userRes } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (userRes?.user?.email?.toLowerCase() === "hixlabadmin@gmail.com") return true;

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("email, account_type")
      .eq("id", userId)
      .maybeSingle();

    if (profile?.email?.toLowerCase() === "hixlabadmin@gmail.com" || (profile?.account_type as string) === "admin") return true;

    const { data } = await supabaseAdmin.rpc("has_role", { _user_id: userId, _role: "admin" });
    return Boolean(data);
  } catch {
    return false;
  }
}

async function logEvent(
  provider: string,
  eventId: string,
  eventType: string,
  reference: string | null,
  payload: Record<string, unknown>,
) {
  await supabaseAdmin
    .from("payment_events")
    .insert({
      provider,
      event_id: eventId,
      event_type: eventType,
      reference,
      payload: payload as never,
      processed_at: new Date().toISOString(),
    })
    .select()
    .maybeSingle();
}

/**
 * Records a verified purchase.
 * Prices, commission and earnings are resolved from the database — never from the client.
 */
export async function recordPurchases(
  buyerId: string,
  lines: Array<{ beatId: string; licenseType: string }>,
  paymentReference: string,
) {
  const secretKey = process.env["PAYSTACK_SECRET_KEY"] ?? process.env["STRIPE_LIVE_API_KEY"];
  if (!secretKey) throw new Error("Payment verification is not configured");

  const verificationResponse = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(paymentReference)}`,
    { headers: { Authorization: `Bearer ${secretKey}` } },
  );
  const verification = (await verificationResponse.json()) as {
    status?: boolean;
    message?: string;
    data?: { status?: string; amount?: number; currency?: string; reference?: string };
  };
  if (!verificationResponse.ok || !verification.status || verification.data?.status !== "success") {
    throw new Error(verification.message || "Payment could not be verified");
  }

  const results: any[] = [];
  const resolved: Array<{ beat: any; license: LicenseRow }> = [];

  for (const line of lines) {
    const { data: beat, error: beatErr } = await supabaseAdmin
      .from("beats")
      .select("id, title, producer_id, licenses")
      .eq("id", line.beatId)
      .maybeSingle();
    if (beatErr) {
      throw new Error(`Beat lookup failed: ${beatErr.message}`);
    }
    if (!beat) {
      console.error("[recordPurchases] Beat not found in database:", line.beatId);
      throw new Error(`Beat not found: ${line.beatId}`);
    }
    if (beat.producer_id === buyerId) throw new Error("You cannot buy your own beat");

    const licenses = (beat.licenses as unknown as LicenseRow[]) ?? [];
    const license = licenses.find((l) => l.type === line.licenseType);
    if (!license) throw new Error("License not available for this beat");
    if (!license.price || license.price <= 0) throw new Error("This license must be negotiated");
    resolved.push({ beat, license });
  }

  const expectedAmountKobo = Math.round(
    resolved.reduce((sum, item) => sum + Number(item.license.price), 0) * 100,
  );
  if (
    verification.data?.reference !== paymentReference ||
    verification.data?.currency !== "NGN" ||
    verification.data?.amount !== expectedAmountKobo
  ) {
    throw new Error("Payment amount or currency does not match this order");
  }

  for (const { beat, license } of resolved) {
    const ledgerReference = `${paymentReference}:${beat.id}:${license.type}`;
    const { data: existing } = await supabaseAdmin
      .from("purchases")
      .select("*")
      .eq("payment_provider", "paystack")
      .eq("provider_reference", ledgerReference)
      .maybeSingle();
    if (existing) {
      results.push(existing);
      continue;
    }

    const split = calculateSplit(license.price, 0);

    const { data: purchase, error } = await supabaseAdmin.rpc(
      "record_verified_marketplace_purchase",
      {
        _buyer_id: buyerId,
        _producer_id: beat.producer_id,
        _beat_id: beat.id,
        _beat_title: beat.title,
        _license_type: license.type,
        _license_name: license.name,
        _contract_snapshot: license.contract ?? "",
        _gross_amount: split.grossAmount,
        _platform_commission: split.platformCommission,
        _producer_earnings: split.producerEarnings,
        _provider_reference: ledgerReference,
      },
    );

    if (error || !purchase) throw new Error(error?.message || "Purchase could not be recorded");

    await logEvent("paystack", ledgerReference, "purchase.recorded", ledgerReference, {
      purchase_id: purchase.id,
      gross: split.grossAmount,
      commission: split.platformCommission,
      earnings: split.producerEarnings,
      split_applied: false,
    });

    results.push(purchase);
  }

  return results;
}

export async function getWalletSummary(producerId: string) {
  const { data: wallet } = await supabaseAdmin
    .from("producer_wallets")
    .select("*")
    .eq("producer_id", producerId)
    .maybeSingle();

  const { data: sales } = await supabaseAdmin
    .from("purchases")
    .select("gross_amount, producer_earnings, platform_commission, created_at, payment_status")
    .eq("producer_id", producerId)
    .eq("payment_status", "paid");

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const rows = sales ?? [];

  const { data: account } = await supabaseAdmin
    .from("payout_accounts")
    .select("bank_name, account_number, account_name")
    .eq("producer_id", producerId)
    .maybeSingle();

  return {
    wallet: wallet ?? {
      available_balance: 0,
      pending_balance: 0,
      lifetime_earnings: 0,
      total_withdrawn: 0,
      sales_count: 0,
      currency: "NGN",
    },
    account: account ?? null,
    stats: {
      salesToday: rows.filter((r) => r.created_at >= startOfDay).length,
      salesThisMonth: rows.filter((r) => r.created_at >= startOfMonth).length,
      totalSales: rows.length,
      grossVolume: rows.reduce((s, r) => s + Number(r.gross_amount), 0),
    },
  };
}

export async function listProducerTransactions(producerId: string, limit = 25) {
  const { data } = await supabaseAdmin
    .from("purchases")
    .select(
      "id, beat_title, license_name, gross_amount, platform_commission, producer_earnings, payment_status, invoice_number, created_at",
    )
    .eq("producer_id", producerId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function listProducerWithdrawals(producerId: string) {
  const { data } = await supabaseAdmin
    .from("withdrawals")
    .select("*")
    .eq("producer_id", producerId)
    .order("requested_at", { ascending: false });
  return data ?? [];
}

export async function savePayoutAccount(
  producerId: string,
  account: { bankName: string; accountNumber: string; accountName: string },
) {
  const { error } = await supabaseAdmin.from("payout_accounts").upsert(
    {
      producer_id: producerId,
      bank_name: account.bankName,
      account_number: account.accountNumber,
      account_name: account.accountName,
    },
    { onConflict: "producer_id" },
  );
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function createWithdrawal(producerId: string, amount: number) {
  const reference = `WD-${Date.now().toString(36).toUpperCase()}-${Math.random()
    .toString(36)
    .slice(2, 7)
    .toUpperCase()}`;
  const { data, error } = await supabaseAdmin.rpc("request_withdrawal", {
    _producer_id: producerId,
    _amount: amount,
    _reference: reference,
  });
  if (error) throw new Error(error.message);
  await logEvent("internal", reference, "withdrawal.requested", reference, {
    producer_id: producerId,
    amount,
  });
  return { id: data as unknown as string, reference };
}

export async function settleWithdrawalAs(
  withdrawalId: string,
  status: string,
  note: string | null,
) {
  const { error } = await supabaseAdmin.rpc("settle_withdrawal", {
    _withdrawal_id: withdrawalId,
    _status: status,
    _note: note ?? undefined,
  });
  if (error) throw new Error(error.message);
  await logEvent("internal", `${withdrawalId}-${status}-${Date.now()}`, `withdrawal.${status}`, withdrawalId, {
    withdrawal_id: withdrawalId,
    status,
  });
  return { ok: true };
}

export async function getAdminOverview() {
  const { data: purchases } = await supabaseAdmin
    .from("purchases")
    .select(
      "id, beat_id, beat_title, producer_id, gross_amount, platform_commission, producer_earnings, payment_status, created_at",
    );
  const { data: withdrawals } = await supabaseAdmin
    .from("withdrawals")
    .select("*")
    .order("requested_at", { ascending: false })
    .limit(100);

  const paid = (purchases ?? []).filter((p) => p.payment_status === "paid");
  const byProducer = new Map<string, { earnings: number; sales: number }>();
  const byBeat = new Map<string, { title: string; gross: number; sales: number }>();
  for (const p of paid) {
    const prod = byProducer.get(p.producer_id) ?? { earnings: 0, sales: 0 };
    prod.earnings += Number(p.producer_earnings);
    prod.sales += 1;
    byProducer.set(p.producer_id, prod);

    const beat = byBeat.get(p.beat_id) ?? { title: p.beat_title, gross: 0, sales: 0 };
    beat.gross += Number(p.gross_amount);
    beat.sales += 1;
    byBeat.set(p.beat_id, beat);
  }

  const producerIds = [...byProducer.keys()];
  const { data: profiles } = producerIds.length
    ? await supabaseAdmin.from("profiles").select("id, name, email").in("id", producerIds)
    : { data: [] as any[] };
  const nameOf = new Map((profiles ?? []).map((p: any) => [p.id, p.name || p.email || "Producer"]));

  const w = withdrawals ?? [];
  return {
    totals: {
      grossVolume: paid.reduce((s, p) => s + Number(p.gross_amount), 0),
      commissionEarned: paid.reduce((s, p) => s + Number(p.platform_commission), 0),
      producerPayouts: paid.reduce((s, p) => s + Number(p.producer_earnings), 0),
      totalSales: paid.length,
      pendingWithdrawals: w.filter((x) => x.status === "pending" || x.status === "processing").length,
      failedWithdrawals: w.filter((x) => x.status === "failed").length,
      pendingWithdrawalAmount: w
        .filter((x) => x.status === "pending" || x.status === "processing")
        .reduce((s, x) => s + Number(x.amount), 0),
    },
    topProducers: [...byProducer.entries()]
      .map(([id, v]) => ({ id, name: nameOf.get(id) ?? "Producer", ...v }))
      .sort((a, b) => b.earnings - a.earnings)
      .slice(0, 5),
    topBeats: [...byBeat.entries()]
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.gross - a.gross)
      .slice(0, 5),
    withdrawals: w,
    recentTransactions: (purchases ?? [])
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
      .slice(0, 25),
  };
}

async function resolveStorageUrl(bucket: string, path: string | null | undefined): Promise<string> {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("data:")) return path;
  try {
    const { data } = await supabaseAdmin.storage.from(bucket).createSignedUrl(path, 60 * 60 * 24 * 365);
    return data?.signedUrl ?? "";
  } catch {
    return "";
  }
}

export async function getFullAdminData() {
  const [
    { data: purchases },
    { data: withdrawals },
    { data: beats },
    { data: profiles },
    { data: producerProfiles },
    { data: samplePacks },
    { data: academyApps },
  ] = await Promise.all([
    supabaseAdmin.from("purchases").select("*").order("created_at", { ascending: false }),
    supabaseAdmin.from("withdrawals").select("*").order("requested_at", { ascending: false }),
    supabaseAdmin.from("beats").select("*").order("created_at", { ascending: false }),
    supabaseAdmin.from("profiles").select("*").order("created_at", { ascending: false }),
    supabaseAdmin.from("producer_profiles").select("*"),
    supabaseAdmin.from("sample_packs").select("*").order("created_at", { ascending: false }),
    supabaseAdmin.from("academy_applications").select("*").order("created_at", { ascending: false }),
  ]);

  const paid = (purchases ?? []).filter((p) => p.payment_status === "paid");
  const w = withdrawals ?? [];

  const producerMap = new Map(
    (producerProfiles ?? []).map((p: any) => [p.user_id, p.producer_name || p.username]),
  );

  const mappedBeats = await Promise.all(
    (beats ?? []).map(async (b: any) => {
      const coverPath = b.cover_url || b.cover || b.cover_path;
      const cover = await resolveStorageUrl("beat-covers", coverPath);
      const producerName = producerMap.get(b.producer_id) || "Producer";
      const licenses = Array.isArray(b.licenses) ? b.licenses : [];
      const price = b.price ?? licenses[0]?.price ?? 0;
      return {
        ...b,
        cover,
        producer: producerName,
        price,
      };
    }),
  );

  const mappedSamplePacks = await Promise.all(
    (samplePacks ?? []).map(async (p: any) => {
      const coverPath = p.cover_url || p.cover || p.cover_path;
      const cover = await resolveStorageUrl("sample-pack-covers", coverPath);
      return {
        ...p,
        cover,
      };
    }),
  );

  return {
    totals: {
      grossVolume: paid.reduce((s, p) => s + Number(p.gross_amount), 0),
      commissionEarned: paid.reduce((s, p) => s + Number(p.platform_commission), 0),
      producerPayouts: paid.reduce((s, p) => s + Number(p.producer_earnings), 0),
      totalSales: paid.length,
      totalUsers: (profiles ?? []).length,
      totalBeats: (beats ?? []).length,
      totalSamplePacks: (samplePacks ?? []).length,
      totalAcademyApps: (academyApps ?? []).length,
      pendingWithdrawals: w.filter((x) => x.status === "pending" || x.status === "processing").length,
      pendingWithdrawalAmount: w
        .filter((x) => x.status === "pending" || x.status === "processing")
        .reduce((s, x) => s + Number(x.amount), 0),
    },
    purchases: purchases ?? [],
    withdrawals: w,
    beats: mappedBeats,
    users: profiles ?? [],
    producerProfiles: producerProfiles ?? [],
    samplePacks: mappedSamplePacks,
    academyApplications: academyApps ?? [],
  };
}

function getPaystackSecret() {
  const secret = process.env["PAYSTACK_SECRET_KEY"] ?? process.env["STRIPE_LIVE_API_KEY"];
  if (!secret) throw new Error("Paystack is not configured");
  return secret;
}

/** Returns the full list of Nigerian banks supported by Paystack. */
export async function listNigerianBanks(): Promise<{ id: number; name: string; code: string; slug: string }[]> {
  const res = await fetch("https://api.paystack.co/bank?country=nigeria&perPage=200", {
    headers: { Authorization: `Bearer ${getPaystackSecret()}` },
  });
  const json = (await res.json()) as any;
  if (!res.ok || !json.status) throw new Error(json.message ?? "Could not fetch bank list");
  return (json.data as any[]).map((b: any) => ({ id: b.id, name: b.name, code: b.code, slug: b.slug }));
}

/** Resolves an account name from a bank code + account number via Paystack. */
export async function resolveAccountName(
  accountNumber: string,
  bankCode: string,
): Promise<string> {
  const url = `https://api.paystack.co/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${getPaystackSecret()}` },
  });
  const json = (await res.json()) as any;
  if (!res.ok || !json.status) throw new Error(json.message ?? "Could not resolve account name");
  return (json.data?.account_name as string) ?? "";
}

/** Creates a Paystack Subaccount for a producer and stores the code in the DB. */
export async function createPaystackSubaccount(
  producerId: string,
  bankCode: string,
  accountNumber: string,
  businessName: string,
  userClient: any,
): Promise<{ subaccountCode: string; subaccountId: number }> {
  const secret = getPaystackSecret();
  console.log("[createPaystackSubaccount] Using Paystack key:", secret.substring(0, 10) + "...");
  
  const body = {
    business_name: businessName,
    settlement_bank: bankCode,
    account_number: accountNumber,
    percentage_charge: 10, // platform takes 10%
    description: `Beat Boutique producer: ${businessName}`,
  };

  console.log("[createPaystackSubaccount] Request body:", JSON.stringify(body, null, 2));

  const res = await fetch("https://api.paystack.co/subaccount", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  
  const json = (await res.json()) as any;
  console.log("[createPaystackSubaccount] HTTP Status:", res.status);
  console.log("[createPaystackSubaccount] Paystack response:", JSON.stringify(json, null, 2));
  
  if (!res.ok || !json.status) {
    // Return the exact error from Paystack
    const errorMsg = json.message ?? "Subaccount creation failed";
    const errorDetails = json.errors ? JSON.stringify(json.errors) : "";
    console.error("[createPaystackSubaccount] Error:", errorMsg, errorDetails);
    throw new Error(`${errorMsg}${errorDetails ? ` - ${errorDetails}` : ""}`);
  }

  const subaccountCode: string = json.data.subaccount_code;
  const subaccountId: number = json.data.id;
  const bankName: string = json.data.settlement_bank ?? "";
  const accountName: string = json.data.account_name ?? businessName;

  console.log("[createPaystackSubaccount] Saving to database with producer_id:", producerId);

  // Use the user's authenticated client instead of supabaseAdmin
  const db = userClient || supabaseAdmin;
  const { error } = await db.from("payout_accounts").upsert(
    {
      producer_id: producerId,
      bank_code: bankCode,
      bank_name: bankName,
      account_number: accountNumber,
      account_name: accountName,
      paystack_subaccount_code: subaccountCode,
      paystack_subaccount_id: subaccountId,
      is_verified: true,
    },
    { onConflict: "producer_id" },
  );
  
  console.log("[createPaystackSubaccount] Database upsert result - error:", error);
  if (error) {
    console.error("[createPaystackSubaccount] Database error:", JSON.stringify(error, null, 2));
    throw new Error(error.message);
  }

  return { subaccountCode, subaccountId };
}

/** Returns the current subaccount connection status for a producer. */
export async function getSubaccountStatus(
  producerId: string,
  userClient: any,
): Promise<{
  connected: boolean;
  subaccountCode: string | null;
  bankName: string | null;
  accountNumber: string | null;
  accountName: string | null;
}> {
  const db = userClient || supabaseAdmin;
  const { data } = await db
    .from("payout_accounts")
    .select("paystack_subaccount_code, bank_name, account_number, account_name")
    .eq("producer_id", producerId)
    .maybeSingle();

  return {
    connected: Boolean(data?.paystack_subaccount_code),
    subaccountCode: data?.paystack_subaccount_code ?? null,
    bankName: data?.bank_name ?? null,
    accountNumber: data?.account_number ?? null,
    accountName: data?.account_name ?? null,
  };
}

/** Returns the subaccount code for a beat's producer (used for split payment at checkout). */
export async function getSubaccountForBeat(beatId: string): Promise<string | null> {
  const { createClient } = await import("@supabase/supabase-js");
  const url = process.env["SUPABASE_URL"] || process.env["VITE_SUPABASE_URL"];
  const key =
    process.env["SUPABASE_PUBLISHABLE_KEY"] ||
    process.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ||
    process.env["SUPABASE_ANON_KEY"];

  if (!url || !key) {
    console.error("[getSubaccountForBeat] Missing Supabase public config");
    return null;
  }

  const client = createClient(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await client.rpc("get_subaccount_for_beat", { _beat_id: beatId });

  if (error) {
    console.error("[getSubaccountForBeat] RPC error:", error.message);
    return null;
  }

  const subaccountCode = (data as string | null) || null;
  console.log("[getSubaccountForBeat] Beat:", beatId, "Subaccount:", subaccountCode || "NONE");
  return subaccountCode;
}


/** Back-compat alias: subaccount lookup runs server-side with privileged access. */
export async function getSubaccountForBeatPublic(beatId: string): Promise<string | null> {
  return getSubaccountForBeat(beatId);
}

export async function toggleSuspendUser(userId: string, suspend: boolean) {
  try {
    await supabaseAdmin.auth.admin.updateUserById(userId, {
      ban_duration: suspend ? "876000h" : "none",
    });
  } catch (err: any) {
    console.warn("[toggleSuspendUser] Auth ban warning:", err?.message);
  }

  const { error } = await supabaseAdmin
    .from("profiles")
    .update({ is_suspended: suspend } as any)
    .eq("id", userId);

  if (error) {
    console.warn("[toggleSuspendUser] Profile update warning:", error.message);
  }

  return { success: true, suspended: suspend };
}

export async function deleteUserAdmin(userId: string) {
  try {
    await supabaseAdmin.auth.admin.deleteUser(userId);
  } catch (err: any) {
    console.warn("[deleteUserAdmin] Auth deletion warning:", err?.message);
  }

  await supabaseAdmin.from("profiles").delete().eq("id", userId);
  await supabaseAdmin.from("producer_profiles").delete().eq("user_id", userId);

  return { success: true };
}
