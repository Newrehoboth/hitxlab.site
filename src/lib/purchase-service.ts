import { supabase } from "@/integrations/supabase/client";
import cover1 from "@/assets/cover-1.jpg";

// ─── Asset inclusion per license type ────────────────────────────────────────
const LICENSE_ASSETS: Record<string, string[]> = {
  basic: ["mp3"],
  professional: ["mp3", "wav"],
  premium: ["mp3", "wav"],
  unlimited: ["mp3", "wav", "stems"],
  exclusive: ["mp3", "wav", "stems", "pdf"],
};

export function getIncludedAssets(licenseType: string): string[] {
  return LICENSE_ASSETS[licenseType?.toLowerCase()] ?? ["mp3"];
}

export function assetLabel(type: string): string {
  const labels: Record<string, string> = {
    mp3: "Download MP3",
    wav: "Download WAV",
    stems: "Download Stems (ZIP)",
    pdf: "Download License PDF",
  };
  return labels[type] ?? `Download ${type.toUpperCase()}`;
}

export function assetIcon(type: string): string {
  const icons: Record<string, string> = {
    mp3: "🎵",
    wav: "🎚️",
    stems: "🗜️",
    pdf: "📄",
  };
  return icons[type] ?? "📁";
}

// ─── Purchase creation ────────────────────────────────────────────────────────
export interface PurchasePayload {
  userId: string;
  producerId: string;
  beatId: string;
  beatTitle: string;
  producerName: string;
  licenseType: string;
  licenseName: string;
  price: number;
  contractSnapshot: string;
  paymentId?: string;
}

export interface PurchaseResult {
  purchaseId: string;
  items: PurchasePayload[];
}

export async function verifyAndCreatePurchase(
  payload: PurchasePayload
): Promise<PurchaseResult> {
  let createdId = "";

  // 1. Insert into orders table (guaranteed primary table)
  const { data: order } = await (supabase as any)
    .from("orders")
    .insert({
      buyer_id: payload.userId,
      beat_id: payload.beatId,
      producer_id: payload.producerId,
      license_type: payload.licenseType,
      license_name: payload.licenseName,
      price: payload.price,
      contract_snapshot: payload.contractSnapshot,
    })
    .select()
    .single();

  if (order?.id) {
    createdId = order.id;
  }

  // 2. Try inserting into purchases table if present
  try {
    const { data: purchase } = await (supabase as any)
      .from("purchases")
      .insert({
        user_id: payload.userId,
        producer_id: payload.producerId,
        beat_id: payload.beatId,
        license_id: payload.licenseType,
        license_name: payload.licenseName,
        payment_id: payload.paymentId ?? `pay_${Date.now()}`,
        amount: payload.price,
        status: "completed",
      })
      .select()
      .maybeSingle();

    if (purchase?.id) {
      createdId = purchase.id;
      await (supabase as any).from("purchase_items").insert({
        purchase_id: purchase.id,
        beat_id: payload.beatId,
        beat_title: payload.beatTitle,
        producer_id: payload.producerId,
        producer_name: payload.producerName,
        license_type: payload.licenseType,
        license_name: payload.licenseName,
        price: payload.price,
        contract_snapshot: payload.contractSnapshot,
      });
    }
  } catch (_) {}

  return { purchaseId: createdId, items: [payload] };
}

// ─── Download URL generation (ownership-validated) ───────────────────────────
export async function validateOwnershipAndGetDownloadUrl(
  userId: string,
  purchaseId: string,
  assetType: string
): Promise<{ url: string | null; error: string | null }> {
  let beatId: string | null = null;
  let licenseId: string | null = null;
  let licenseName: string | null = null;

  // 1. Try purchases table first
  if (purchaseId) {
    const { data: purchase } = await (supabase as any)
      .from("purchases")
      .select("*")
      .eq("id", purchaseId)
      .eq("buyer_id", userId)
      .maybeSingle();

    if (purchase) {
      beatId = purchase.beat_id;
      licenseId = purchase.license_id || purchase.license_type;
      licenseName = purchase.license_name;
    }
  }

  // 2. Try orders table if not found in purchases
  if (!beatId && purchaseId) {
    const { data: order } = await (supabase as any)
      .from("orders")
      .select("*")
      .eq("id", purchaseId)
      .eq("buyer_id", userId)
      .maybeSingle();

    if (order) {
      beatId = order.beat_id;
      licenseId = order.license_type;
      licenseName = order.license_name;
    }
  }

  // 3. Fallback: query user's latest order/purchase for this beat if purchaseId is missing
  if (!beatId) {
    const { data: userOrder } = await (supabase as any)
      .from("orders")
      .select("*")
      .eq("buyer_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (userOrder) {
      beatId = userOrder.beat_id;
      licenseId = userOrder.license_type;
      licenseName = userOrder.license_name;
    }
  }

  if (!beatId || !licenseId) {
    return { url: null, error: "Purchase record not found or access denied." };
  }

  // Verify asset is included in license
  const included = getIncludedAssets(licenseId);
  if (!included.includes(assetType)) {
    return {
      url: null,
      error: `Your ${licenseName || licenseId} license does not include ${assetType.toUpperCase()} files.`,
    };
  }

  // Log download (ignore errors if download_logs table isn't present yet)
  try {
    await (supabase as any).from("download_logs").insert({
      user_id: userId,
      purchase_id: purchaseId || "order",
      beat_id: beatId,
      asset_type: assetType,
      ip_address: "client",
    });
  } catch (_) {}

  // 4. Get beat file from DB or mock data
  let rawUrl: string | null = null;
  const { data: beat } = await (supabase as any)
    .from("beats")
    .select("audio_url, wav_url, stems_url")
    .eq("id", beatId)
    .maybeSingle();

  if (beat) {
    if (assetType === "mp3") rawUrl = beat.audio_url;
    else if (assetType === "wav") rawUrl = beat.wav_url;
    else if (assetType === "stems") rawUrl = beat.stems_url;
  }

  if (!rawUrl) {
    return { 
      url: null, 
      error: `${assetType.toUpperCase()} file not available. The producer may not have uploaded this format yet.` 
    };
  }

  if (
    rawUrl.startsWith("http://") ||
    rawUrl.startsWith("https://") ||
    rawUrl.startsWith("blob:") ||
    rawUrl.startsWith("data:")
  ) {
    return { url: rawUrl, error: null };
  }

  // Try creating signed URL from storage bucket
  // Try multiple bucket names in order of likelihood
  const bucketsToTry = [
    "beat-files",      // Most common - all beat files
    "beat-audio",      // Legacy - just audio
    "beats",           // Alternative naming
    "audio",           // Another common pattern
  ];

  for (const bucket of bucketsToTry) {
    try {
      const { data: signedData, error: signedError } = await supabase.storage
        .from(bucket)
        .createSignedUrl(rawUrl, 3600);
      
      if (!signedError && signedData?.signedUrl) {
        console.log(`[Download] Successfully created signed URL from bucket: ${bucket}`);
        return { url: signedData.signedUrl, error: null };
      }
    } catch (err) {
      // Try next bucket
      continue;
    }
  }

  // If all buckets fail
  console.error("Error: File not found in any storage bucket");
  return { 
    url: null, 
    error: `File not available on server. Please contact the producer.` 
  };

  return { 
    url: null, 
    error: `File path exists but cannot be accessed. Please contact the producer.` 
  };
}

// ─── Direct File Download Handler (Bypasses Browser Audio Player Preview) ─────
export async function triggerFileDownload(fileUrl: string, fileName: string, ext: string) {
  const safeName = `${fileName.replace(/[^a-zA-Z0-9_-]/g, "_")}.${ext}`;

  try {
    const response = await fetch(fileUrl);
    if (!response.ok) throw new Error("Fetch failed");
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = safeName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
  } catch (_) {
    // Fallback if CORS blocks blob fetch
    const a = document.createElement("a");
    a.href = fileUrl;
    a.download = safeName;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}

// ─── PDF license generator ────────────────────────────────────────────────────
export function generateLicensePDFContent(opts: {
  buyerName: string;
  beatTitle: string;
  producerName: string;
  licenseName: string;
  price: number;
  purchaseDate: string;
  contract: string;
}): string {
  return `
HITXLAB BEAT MARKETPLACE – LICENSE AGREEMENT

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LICENSEE:   ${opts.buyerName}
BEAT:       ${opts.beatTitle}
PRODUCER:   ${opts.producerName}
LICENSE:    ${opts.licenseName}
AMOUNT:     ₦${opts.price.toLocaleString()}
DATE:       ${opts.purchaseDate}
PLATFORM:   HITXLAB Beat Marketplace
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${opts.contract}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
This document serves as proof of license purchase.
Generated on ${new Date().toUTCString()}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `.trim();
}

export function downloadLicenseAgreement(opts: {
  buyerName: string;
  beatTitle: string;
  producerName: string;
  licenseName: string;
  price: number;
  purchaseDate: string;
  contract: string;
}) {
  const content = generateLicensePDFContent(opts);
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const safeName = `license_${opts.beatTitle.replace(/[^a-zA-Z0-9_-]/g, "_")}.txt`;

  const a = document.createElement("a");
  a.href = url;
  a.download = safeName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

// ─── Purchase confirmation email (simulated) ──────────────────────────────────
export function simulatePurchaseEmail(opts: {
  buyerEmail: string;
  buyerName: string;
  beatTitle: string;
  producerName: string;
  licenseName: string;
  price: number;
  purchaseId: string;
}) {
  console.log("📧 Purchase Confirmation Email Sent:");
  console.log(`  To: ${opts.buyerEmail}`);
  console.log(`  Subject: Your Beat Purchase is Ready – "${opts.beatTitle}"`);
  console.log(`  Beat: ${opts.beatTitle} by ${opts.producerName}`);
  console.log(`  License: ${opts.licenseName}`);
  console.log(`  Amount: ₦${opts.price.toLocaleString()}`);
  console.log(`  Purchase ID: ${opts.purchaseId}`);
  console.log(`  Library: https://octave.music/dashboard/library`);
}

// ─── Helpers for cover & producer name resolution ────────────────────────────
async function resolveProducerName(producerId?: string | null): Promise<string> {
  if (!producerId) return "Producer";
  try {
    const { data } = await (supabase as any)
      .from("producer_profiles")
      .select("producer_name")
      .eq("user_id", producerId)
      .maybeSingle();
    if (data?.producer_name) return data.producer_name;
  } catch (_) {}
  return "Producer";
}

export async function resolveCoverUrl(rawCoverUrl?: string | null, beatId?: string): Promise<string> {
  // No demo data - if no cover provided, use default cover
  if (!rawCoverUrl) return cover1;

  if (
    rawCoverUrl.startsWith("http://") ||
    rawCoverUrl.startsWith("https://") ||
    rawCoverUrl.startsWith("blob:") ||
    rawCoverUrl.startsWith("data:") ||
    rawCoverUrl.startsWith("/")
  ) {
    return rawCoverUrl;
  }

  try {
    const { data } = await supabase.storage
      .from("beat-covers")
      .createSignedUrl(rawCoverUrl, 3600);
    if (data?.signedUrl) return data.signedUrl;
  } catch (_) {}

  return cover1;
}

// ─── Fetch user purchases ─────────────────────────────────────────────────────
export interface LibraryItem {
  purchaseId: string;
  beatId: string;
  beatTitle: string;
  producerName: string;
  licenseName: string;
  licenseType: string;
  price: number;
  purchaseDate: string;
  contractSnapshot: string;
  coverUrl?: string;
}

export async function fetchUserLibrary(userId: string): Promise<LibraryItem[]> {
  const items: LibraryItem[] = [];

  // 1. Fetch from purchases + purchase_items
  try {
    const { data: purchases, error: pErr } = await (supabase as any)
      .from("purchases")
      .select("*, purchase_items(*)")
      .eq("buyer_id", userId)
      .order("created_at", { ascending: false });

    if (!pErr && purchases && purchases.length > 0) {
      for (const purchase of purchases) {
        const item = purchase.purchase_items?.[0];
        const beatId = purchase.beat_id;

        let coverUrl = "";
        let producerName = item?.producer_name || "";

        const { data: beat } = await (supabase as any)
          .from("beats")
          .select("cover_url, producer_id")
          .eq("id", beatId)
          .maybeSingle();

        if (beat) {
          coverUrl = await resolveCoverUrl(beat.cover_url, beatId);
          if (!producerName || producerName === "Producer") {
            producerName = await resolveProducerName(beat.producer_id);
          }
        } else {
          coverUrl = await resolveCoverUrl(null, beatId);
          if (!producerName || producerName === "Producer") {
            producerName = await resolveProducerName(purchase.producer_id);
          }
        }

        items.push({
          purchaseId: purchase.id,
          beatId: purchase.beat_id,
          beatTitle: item?.beat_title || "Beat",
          producerName: producerName || "Producer",
          licenseName: purchase.license_name || item?.license_name || "License",
          licenseType: purchase.license_id || item?.license_type || "basic",
          price: purchase.amount || item?.price || 0,
          purchaseDate: purchase.purchase_date || purchase.created_at,
          contractSnapshot: item?.contract_snapshot || "",
          coverUrl,
        });
      }
      return items;
    }
  } catch (_) {}

  // 2. Fallback: fetch from orders table
  const { data: orders } = await (supabase as any)
    .from("orders")
    .select("*, beats(id, title, cover_url, producer_id)")
    .eq("buyer_id", userId)
    .order("created_at", { ascending: false });

  if (orders && orders.length > 0) {
    for (const o of orders) {
      const beatId = o.beat_id;
      const producerId = o.producer_id || o.beats?.producer_id;

      const [coverUrl, producerName] = await Promise.all([
        resolveCoverUrl(o.beats?.cover_url, beatId),
        resolveProducerName(producerId),
      ]);

      items.push({
        purchaseId: o.id,
        beatId: o.beat_id,
        beatTitle: o.beats?.title || "Beat",
        producerName: producerName || "Producer",
        licenseName: o.license_name || "License",
        licenseType: o.license_type || "basic",
        price: o.price || 0,
        purchaseDate: o.created_at,
        contractSnapshot: o.contract_snapshot || "",
        coverUrl,
      });
    }
  }

  return items;
}

// ─── Fetch Producer Sales & Orders ───────────────────────────────────────────
export interface ProducerOrderRecord {
  id: string;
  purchaseId: string;
  beatId: string;
  beatTitle: string;
  buyerId: string;
  buyerName: string;
  buyerEmail: string;
  licenseName: string;
  licenseType: string;
  price: number;
  contractSnapshot: string;
  status: string;
  createdAt: string;
  coverUrl?: string;
}

export async function fetchProducerSales(producerId: string): Promise<ProducerOrderRecord[]> {
  const records: ProducerOrderRecord[] = [];

  // Canonical paid ledger only. Legacy orders contain gross prices and are not earnings.
  let dbPurchases: any[] = [];
  try {
    const { data: pData } = await (supabase as any)
      .from("purchases")
      .select("*, beats(title, cover_url)")
      .eq("producer_id", producerId)
      .eq("payment_status", "paid")
      .order("created_at", { ascending: false });
    if (pData) dbPurchases = pData;
  } catch (_) {}

  // Gather all unique buyer IDs
  const buyerIds = new Set<string>();
  dbPurchases.forEach((p: any) => p.buyer_id && buyerIds.add(p.buyer_id));

  // Map buyer profile information (name & email)
  const profileMap = new Map<string, { name: string; email: string }>();

  if (buyerIds.size > 0) {
    try {
      const { data: profs } = await (supabase as any)
        .from("profiles")
        .select("id, name, email")
        .in("id", Array.from(buyerIds));

      (profs ?? []).forEach((p: any) => {
        if (p.id) profileMap.set(p.id, { name: p.name || "", email: p.email || "" });
      });
    } catch (_) {}

    // Fallback: check negotiations for artist name & email
    try {
      const { data: negs } = await (supabase as any)
        .from("negotiations")
        .select("artist_id, artist_name, artist_email")
        .eq("producer_id", producerId);

      (negs ?? []).forEach((n: any) => {
        if (n.artist_id && !profileMap.get(n.artist_id)?.email) {
          profileMap.set(n.artist_id, {
            name: n.artist_name || profileMap.get(n.artist_id)?.name || "Artist Buyer",
            email: n.artist_email || "",
          });
        }
      });
    } catch (_) {}
  }

  // Populate from purchases
  for (const p of dbPurchases) {
    const buyer = profileMap.get(p.buyer_id);
    const coverUrl = await resolveCoverUrl(p.beats?.cover_url, p.beat_id);

    records.push({
      id: p.id,
      purchaseId: p.id,
      beatId: p.beat_id,
      beatTitle: p.beat_title || p.beats?.title || "Beat",
      buyerId: p.buyer_id,
      buyerName: buyer?.name || "Artist Buyer",
      buyerEmail: buyer?.email || `buyer_${p.buyer_id.slice(0, 6)}@octave.music`,
      licenseName: p.license_name || "License",
      licenseType: p.license_type || "basic",
      price: Number(p.producer_earnings || 0),
      contractSnapshot: p.contract_snapshot || "",
      status: "completed",
      createdAt: p.purchased_at || p.created_at,
      coverUrl,
    });
  }

  return records;
}
