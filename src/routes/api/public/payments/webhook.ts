import { createFileRoute } from "@tanstack/react-router";

/**
 * Payment provider webhook. Verifies the signature, de-duplicates by event id
 * (payment_events.event_id is unique) and only then unlocks downloads / credits wallets.
 */
export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const raw = await request.text();
        const signature =
          request.headers.get("stripe-signature") ?? request.headers.get("x-webhook-signature");

        const { getPaymentProvider } = await import("@/lib/payments/gateway.server");
        const provider = getPaymentProvider();
        const result = await provider.verifyWebhook(raw, signature);
        if (!result.valid) return new Response("Invalid signature", { status: 401 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Idempotency: duplicate event ids are rejected by the unique constraint.
        const { error: dupe } = await supabaseAdmin.from("payment_events").insert({
          provider: provider.id,
          event_id: result.eventId,
          event_type: result.eventType,
          reference: result.reference,
          payload: result.payload as never,
          processed_at: new Date().toISOString(),
        });
        if (dupe) {
          if (dupe.code === "23505") return new Response("duplicate", { status: 200 });
          console.error("[webhook] log failed", dupe);
        }

        const succeeded =
          result.eventType.endsWith("succeeded") || result.eventType === "payment.succeeded";
        const failed =
          result.eventType.endsWith("payment_failed") || result.eventType === "payment.failed";

        if (result.reference && (succeeded || failed)) {
          const { data: purchase } = await supabaseAdmin
            .from("purchases")
            .select("id, producer_id, producer_earnings, payment_status, payout_mode")
            .eq("provider_reference", result.reference)
            .maybeSingle();

          if (purchase && purchase.payment_status !== (succeeded ? "paid" : "failed")) {
            await supabaseAdmin
              .from("purchases")
              .update({
                payment_status: succeeded ? "paid" : "failed",
                download_status: succeeded ? "unlocked" : "locked",
              })
              .eq("id", purchase.id);

            if (succeeded && purchase.payout_mode === "wallet") {
              await supabaseAdmin.rpc("credit_producer_wallet", {
                _producer_id: purchase.producer_id,
                _amount: Number(purchase.producer_earnings),
                _pending: false,
              });
            }
          }
        }

        return new Response("ok");
      },
    },
  },
});
