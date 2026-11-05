import { useState } from "react";
import { X, ShoppingBag, Trash2, ShieldCheck, FileCheck2, Loader2, CheckCircle2 } from "lucide-react";
import { useCart, useAuth } from "@/lib/store";
import { fmtNaira } from "@/lib/currency";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { sendPurchaseEmailsFn } from "@/lib/email.functions";
import { recordPurchaseFn, getSubaccountForBeatFn } from "@/lib/payouts.functions";

export function CartDrawer() {
  const { open, setOpen, items, remove, total, clear } = useCart();
  const { user } = useAuth();
  const nav = useNavigate();
  const sendEmails = useServerFn(sendPurchaseEmailsFn);
  const recordPurchase = useServerFn(recordPurchaseFn);
  const getSubaccountForBeat = useServerFn(getSubaccountForBeatFn);
  const [checkingOut, setCheckingOut] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const loadPaystackScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if ((window as any).PaystackPop) return resolve(true);
      const script = document.createElement("script");
      script.src = "https://js.paystack.co/v1/inline.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const processFulfillment = async (paymentReference: string) => {
    const purchases = await recordPurchase({
      data: {
        paymentReference,
        items: items.map((i) => ({ beatId: i.beat.id, licenseType: i.license.type })),
      },
    });

    const firstItem = items[0];
    const isSingle = items.length === 1;
    const lastPurchaseId = purchases[purchases.length - 1]?.id ?? "";

    // Receipts for buyer + sale notifications for producers
    for (const p of purchases) {
      sendEmails({
        data: {
          beatId: p.beatId,
          beatTitle: p.beatTitle,
          producerId: p.producerId,
          producerName:
            items.find((i) => i.beat.id === p.beatId)?.beat.producer ?? "Producer",
          licenseName: p.licenseName,
          price: p.grossAmount,
          purchaseId: p.id,
        },
      }).catch((e: unknown) => console.error("purchase email failed", e));
    }

    clear();
    setDone(true);

    setTimeout(() => {
      setOpen(false);
      setDone(false);
      if (isSingle && firstItem) {
        nav({
          to: "/purchase/success",
          search: {
            purchaseId: lastPurchaseId,
            beatId: firstItem.beat.id,
            beatTitle: firstItem.beat.title,
            producerName: firstItem.beat.producer,
            licenseName: firstItem.license.name,
            licenseType: firstItem.license.type,
            price: String(firstItem.license.price),
          },
        });
      } else {
        nav({ to: "/dashboard/library" });
      }
    }, 1500);
  };

  const checkout = async () => {
    setErr(null);
    if (!user) {
      setOpen(false);
      nav({ to: "/auth", search: { mode: "signin" } });
      return;
    }
    setCheckingOut(true);

    try {
      // Fetch the producer's subaccount code for split payment
      let subaccountCode: string | null = null;
      
      // For single-beat purchases, fetch the subaccount
      if (items.length === 1) {
        const beatId = items[0].beat.id;
        try {
          const result = await getSubaccountForBeat({ data: { beatId } });
          subaccountCode = result.subaccountCode;
          console.log("[Checkout] Subaccount for beat", beatId, ":", subaccountCode || "NONE");
        } catch (err) {
          console.warn("[Checkout] Could not fetch subaccount:", err);
        }
      }
      
      // Note: Multi-beat carts with different producers need split groups (future enhancement)
      if (items.length > 1) {
        console.warn("[Checkout] Multi-beat cart - split payment not yet supported for multiple producers");
      }

      const loaded = await loadPaystackScript();
      const paystackKey = "pk_live_e9bf7cfed2bff11590869169b377d641f6932a5a";

      if (loaded && (window as any).PaystackPop && paystackKey) {
        const config: any = {
          key: paystackKey,
          email: user.email || "buyer@octave.com",
          amount: Math.round(total * 100),
          currency: "NGN",
          ref: `oct_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          onClose: function () {
            setCheckingOut(false);
          },
          callback: function (response: any) {
            console.log("Paystack payment successful:", response);
            processFulfillment(String(response.reference ?? ""))
              .catch((e: any) => {
                console.error("Fulfillment error:", e);
                setErr(e?.message ?? "Checkout fulfillment failed");
              })
              .finally(() => {
                setCheckingOut(false);
              });
          },
        };
        
        // Add subaccount for automatic 10%/90% split
        if (subaccountCode) {
          config.subaccount = subaccountCode;
          console.log("[Checkout] ✅ Applying 10%/90% split payment with subaccount:", subaccountCode);
        } else {
          console.warn("[Checkout] ⚠️ No subaccount found - payment will NOT be split automatically");
        }
        
        const handler = (window as any).PaystackPop.setup(config);
        handler.openIframe();
      } else {
        throw new Error("Secure checkout could not be loaded. Please try again.");
      }
    } catch (e: any) {
      setErr(e?.message ?? "Checkout failed");
      setCheckingOut(false);
    }
  };

  return (
    <>
      <div onClick={() => setOpen(false)} className={`fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity ${open ? "opacity-100" : "pointer-events-none opacity-0"}`} />
      <aside className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-white/8 bg-background shadow-2xl transition-transform duration-300 ${open ? "translate-x-0" : "translate-x-full"}`}>
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/8 px-5">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-4 w-4 text-red-500" />
            <h3 className="font-display text-base font-bold">Your Cart</h3>
            <span className="text-xs text-muted-foreground">· {items.length}</span>
          </div>
          <button onClick={() => setOpen(false)} className="grid h-9 w-9 place-items-center rounded-lg hover:bg-white/5"><X className="h-4 w-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {done ? (
            <div className="mt-20 flex flex-col items-center gap-3 px-6 text-center">
              <div className="grid h-16 w-16 place-items-center rounded-2xl bg-teal/10 text-teal"><CheckCircle2 className="h-8 w-8" /></div>
              <div className="font-display text-lg font-bold">Order complete! 🎉</div>
              <p className="text-sm text-muted-foreground">Redirecting you to your files…</p>
            </div>
          ) : items.length === 0 ? (
            <div className="mt-20 flex flex-col items-center gap-3 px-6 text-center">
              <div className="grid h-16 w-16 place-items-center rounded-2xl bg-white/5"><ShoppingBag className="h-7 w-7 text-muted-foreground" /></div>
              <div className="font-semibold">Your cart is empty</div>
              <p className="text-sm text-muted-foreground">Open a beat, pick a license and accept the agreement to add it here.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {items.map((it) => (
                <div key={it.id} className="flex gap-3 rounded-xl border border-white/8 bg-surface/60 p-3">
                  <img src={it.beat.cover} alt="" width={64} height={64} loading="lazy" className="h-16 w-16 rounded-lg object-cover" />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="truncate text-sm font-semibold">{it.beat.title}</div>
                    <div className="truncate text-xs text-muted-foreground">{it.beat.producer}</div>
                    <div className="mt-1 inline-flex w-fit items-center gap-1 rounded-md bg-red-500/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-500">{it.license.name} License</div>
                    <div className="mt-auto flex items-center justify-between pt-1">
                      <span className="font-display text-sm font-bold text-red-500">{fmtNaira(it.license.price)}</span>
                      <button onClick={() => remove(it.id)} className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-white/5 hover:text-crimson"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                </div>
              ))}
              <div className="mt-1 flex items-center gap-2 rounded-lg border border-teal/20 bg-teal/5 px-3 py-2 text-[11px] text-teal">
                <FileCheck2 className="h-3.5 w-3.5" /> Signed license agreements attached to your order.
              </div>
            </div>
          )}
        </div>

        {items.length > 0 && !done && (
          <div className="border-t border-white/8 p-4">
            <div className="mb-3 flex items-baseline justify-between">
              <span className="text-sm text-muted-foreground">Subtotal</span>
              <span className="font-display text-2xl font-bold">{fmtNaira(total)}</span>
            </div>
            {err && <div className="mb-3 rounded-lg border border-crimson/30 bg-crimson/10 px-3 py-2 text-xs text-crimson">{err}</div>}
            <button onClick={checkout} disabled={checkingOut} className="mb-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#EF4444] to-[#DC2626] font-semibold text-black shadow-[0_10px_30px_-8px_oklch(0.7_0.17_55/0.6)] transition hover:brightness-105 active:scale-[0.99] disabled:opacity-60">
              {checkingOut && <Loader2 className="h-4 w-4 animate-spin" />}
              Pay with Paystack · {fmtNaira(total)}
            </button>
            <button onClick={clear} className="h-10 w-full rounded-xl text-xs font-medium text-muted-foreground hover:text-crimson">Clear cart</button>
            <div className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-teal" /> Paystack Secured · Instant delivery · Auto-signed contracts
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
