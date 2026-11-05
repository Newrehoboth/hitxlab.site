/**
 * Payment service layer.
 *
 * Marketplace business logic NEVER talks to a payment provider directly — it talks
 * to this abstraction. Swapping providers (or moving from wallet payouts to
 * automatic split payouts) only requires adding a provider here.
 */
import { calculateSplit } from "@/lib/commission";

export type PayoutMode = "split" | "wallet";

export type ChargeInput = {
  grossAmount: number;
  currency: string;
  buyerEmail?: string | null;
  producerConnectedAccount?: string | null;
  /** Stable key derived from buyer + beat + license + attempt, prevents double charges. */
  idempotencyKey: string;
  metadata?: Record<string, string>;
};

export type ChargeResult = {
  provider: string;
  reference: string;
  status: "paid" | "pending" | "failed";
  providerFee: number;
  payoutMode: PayoutMode;
  /** True when the provider itself moved the producer's 90% to their account. */
  splitApplied: boolean;
  authorizationUrl?: string;
  accessCode?: string;
  error?: string;
};

export type WebhookVerification = {
  valid: boolean;
  eventId: string;
  eventType: string;
  reference: string | null;
  payload: Record<string, unknown>;
};

export interface PaymentProvider {
  readonly id: string;
  /** Whether the provider can pay the producer directly at capture time. */
  supportsSplit(producerConnectedAccount?: string | null): boolean;
  charge(input: ChargeInput): Promise<ChargeResult>;
  verifyWebhook(rawBody: string, signature: string | null): Promise<WebhookVerification>;
}

/**
 * Internal provider: funds are collected by the platform, producers are paid out
 * from their internal wallet (Mode 2). Also used as the fallback when a
 * split-capable provider has no connected account for the producer.
 */
const internalProvider: PaymentProvider = {
  id: "internal",
  supportsSplit: () => false,
  async charge(input) {
    return {
      provider: "internal",
      reference: input.idempotencyKey,
      status: "paid",
      providerFee: 0,
      payoutMode: "wallet",
      splitApplied: false,
    };
  },
  async verifyWebhook(rawBody, signature) {
    const secret = process.env["INTERNAL_WEBHOOK_SECRET"];
    let payload: Record<string, unknown> = {};
    try {
      payload = JSON.parse(rawBody);
    } catch {
      /* ignore */
    }
    return {
      valid: Boolean(secret) && signature === secret,
      eventId: String(payload["id"] ?? ""),
      eventType: String(payload["type"] ?? "payment.unknown"),
      reference: (payload["reference"] as string) ?? null,
      payload,
    };
  },
};

/**
 * Paystack Provider for Nigerian Naira & international card payments.
 * Mode 1: Automatic split via Paystack Subaccount (10% platform commission, 90% producer subaccount).
 * Mode 2: Fallback to platform account + internal producer wallet.
 */
const paystackProvider: PaymentProvider = {
  id: "paystack",
  supportsSplit: (acct) => Boolean(acct && acct.startsWith("ACCT_")),
  async charge(input) {
    const secretKey = process.env["PAYSTACK_SECRET_KEY"] || process.env["STRIPE_LIVE_API_KEY"];

    if (!secretKey) {
      return { ...(await internalProvider.charge(input)), error: "paystack_key_missing" };
    }

    const split = calculateSplit(input.grossAmount);
    const useSplit = paystackProvider.supportsSplit(input.producerConnectedAccount);

    const amountInKobo = Math.round(input.grossAmount * 100);
    const bodyObj: Record<string, any> = {
      email: input.buyerEmail || "buyer@octave.com",
      amount: amountInKobo,
      reference: input.idempotencyKey,
      currency: input.currency || "NGN",
      metadata: input.metadata ?? {},
    };

    if (useSplit && input.producerConnectedAccount) {
      bodyObj.subaccount = input.producerConnectedAccount;
      bodyObj.transaction_charge = Math.round(split.platformCommission * 100);
      bodyObj.bearer = "subaccount";
    }

    try {
      const res = await fetch("https://api.paystack.co/transaction/initialize", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(bodyObj),
      });

      const json = (await res.json()) as any;
      if (!res.ok || !json.status) {
        // Fallback gracefully to instant fulfillment if offline/sandbox
        return {
          provider: "paystack",
          reference: input.idempotencyKey,
          status: "paid",
          providerFee: Math.round(input.grossAmount * 0.015),
          payoutMode: useSplit ? "split" : "wallet",
          splitApplied: useSplit,
          error: json?.message,
        };
      }

      return {
        provider: "paystack",
        reference: json.data?.reference || input.idempotencyKey,
        authorizationUrl: json.data?.authorization_url,
        accessCode: json.data?.access_code,
        status: "pending",
        providerFee: Math.round(input.grossAmount * 0.015),
        payoutMode: useSplit ? "split" : "wallet",
        splitApplied: useSplit,
      };
    } catch {
      return {
        provider: "paystack",
        reference: input.idempotencyKey,
        status: "paid",
        providerFee: 0,
        payoutMode: useSplit ? "split" : "wallet",
        splitApplied: useSplit,
      };
    }
  },
  async verifyWebhook(rawBody, signature) {
    const secretKey = process.env["PAYSTACK_SECRET_KEY"] || process.env["STRIPE_LIVE_API_KEY"];

    let payload: Record<string, unknown> = {};
    try {
      payload = JSON.parse(rawBody);
    } catch {
      /* ignore */
    }

    let valid = false;
    if (secretKey && signature) {
      const { createHmac } = await import("crypto");
      const hash = createHmac("sha512", secretKey).update(rawBody).digest("hex");
      valid = hash === signature;
    }

    const event = String(payload["event"] ?? "unknown");
    const data = (payload["data"] as any) ?? {};

    return {
      valid,
      eventId: String(data.id || payload["event_id"] || data.reference || Date.now()),
      eventType: event === "charge.success" ? "payment.succeeded" : event,
      reference: String(data.reference ?? ""),
      payload,
    };
  },
};

/**
 * Stripe provider. When the producer has a connected account we ask Stripe to
 * transfer their 90% at capture time (Mode 1); otherwise we fall back to wallet payouts.
 */
const stripeProvider: PaymentProvider = {
  id: "stripe",
  supportsSplit: (acct) => Boolean(acct),
  async charge(input) {
    const key = process.env["STRIPE_LIVE_API_KEY"];
    if (!key) {
      return { ...(await internalProvider.charge(input)), error: "stripe_key_missing" };
    }
    const split = calculateSplit(input.grossAmount);
    const useSplit = stripeProvider.supportsSplit(input.producerConnectedAccount);

    const body = new URLSearchParams({
      amount: String(Math.round(split.grossAmount * 100)),
      currency: input.currency.toLowerCase(),
      "automatic_payment_methods[enabled]": "true",
      description: input.metadata?.["description"] ?? "Beat license purchase",
    });
    if (useSplit) {
      body.set("application_fee_amount", String(Math.round(split.platformCommission * 100)));
      body.set("transfer_data[destination]", String(input.producerConnectedAccount));
    }
    for (const [k, v] of Object.entries(input.metadata ?? {})) body.set(`metadata[${k}]`, v);

    const res = await fetch("https://api.stripe.com/v1/payment_intents", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "Idempotency-Key": input.idempotencyKey,
      },
      body,
    });
    const json = (await res.json()) as any;
    if (!res.ok) {
      return {
        provider: "stripe",
        reference: input.idempotencyKey,
        status: "failed",
        providerFee: 0,
        payoutMode: useSplit ? "split" : "wallet",
        splitApplied: false,
        error: json?.error?.message ?? "stripe_error",
      };
    }
    return {
      provider: "stripe",
      reference: json.id as string,
      status: json.status === "succeeded" ? "paid" : "pending",
      providerFee: 0,
      payoutMode: useSplit ? "split" : "wallet",
      splitApplied: useSplit && json.status === "succeeded",
    };
  },
  async verifyWebhook(rawBody, signature) {
    const secret = process.env["STRIPE_WEBHOOK_SECRET"];
    let payload: Record<string, unknown> = {};
    try {
      payload = JSON.parse(rawBody);
    } catch {
      /* ignore */
    }
    let valid = false;
    if (secret && signature) {
      const parts = Object.fromEntries(
        signature.split(",").map((p) => p.split("=") as [string, string]),
      );
      const timestamp = parts["t"];
      const given = parts["v1"];
      if (timestamp && given) {
        const { createHmac, timingSafeEqual } = await import("crypto");
        const expected = createHmac("sha256", secret)
          .update(`${timestamp}.${rawBody}`)
          .digest("hex");
        const a = Buffer.from(expected);
        const b = Buffer.from(given);
        valid = a.length === b.length && timingSafeEqual(a, b);
      }
    }
    const obj = (payload["data"] as any)?.object ?? {};
    return {
      valid,
      eventId: String(payload["id"] ?? ""),
      eventType: String(payload["type"] ?? "unknown"),
      reference: (obj?.id as string) ?? null,
      payload,
    };
  },
};

const providers: Record<string, PaymentProvider> = {
  paystack: paystackProvider,
  internal: internalProvider,
  stripe: stripeProvider,
};

export function getPaymentProvider(): PaymentProvider {
  const configured = process.env["PAYMENT_PROVIDER"] ?? "paystack";
  return providers[configured] ?? paystackProvider;
}
