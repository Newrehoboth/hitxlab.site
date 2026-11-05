import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { z } from "zod";
import { useEffect, useState, useRef } from "react";
import {
  ShoppingBag,
  MessageSquare,
  Settings,
  Sparkles,
  Music4,
  Download,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Send,
  User as UserIcon,
  ChevronRight,
  ShieldCheck,
  Headphones,
  ArrowUpRight,
  DollarSign,
} from "lucide-react";
import { ArtistLayout } from "@/components/ArtistLayout";
import { useAuth } from "@/lib/store";
import { fmtNaira } from "@/lib/currency";
import { supabase } from "@/integrations/supabase/client";
import { fetchUserLibrary, resolveCoverUrl } from "@/lib/purchase-service";
import { useServerFn } from "@tanstack/react-start";
import { sendPurchaseEmailsFn } from "@/lib/email.functions";

const searchSchema = z.object({
  tab: z
    .enum(["overview", "purchases", "messages", "settings"])
    .optional()
    .default("overview"),
});

export const Route = createFileRoute("/artist/dashboard")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [
      { title: "Artist Dashboard · HITXLAB" },
      { name: "description", content: "Manage your purchased beats, offers, and studio negotiations." },
    ],
  }),
  component: ArtistDashboard,
});

interface OrderItem {
  id: string;
  beat_id: string;
  producer_id: string;
  license_name: string;
  license_type: string;
  price: number;
  contract_snapshot: string;
  created_at: string;
  status: string;
  coverUrl?: string;
  beats?: {
    title: string;
    cover_url?: string;
    audio_url?: string;
    producer_id?: string;
  };
}

interface OfferItem {
  id: string;
  beat_id?: string;
  beat_title: string;
  producer: string;
  producer_id?: string;
  license_name?: string;
  offer_amount: number;
  status: "pending" | "accepted" | "rejected" | "countered" | "paid";
  date: string;
  messages: Array<{
    sender: "artist" | "producer";
    text: string;
    timestamp: string;
  }>;
}

function ArtistDashboard() {
  const { tab } = Route.useSearch();
  const { user, signOut } = useAuth();
  const nav = useNavigate();

  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [offers, setOffers] = useState<OfferItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeOfferId, setActiveOfferId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [viewingContract, setViewingContract] = useState<OrderItem | null>(null);
  const artistChatBoxRef = useRef<HTMLDivElement>(null);

  const activeOffer = offers.find((o) => o.id === activeOfferId);

  useEffect(() => {
    if (artistChatBoxRef.current) {
      artistChatBoxRef.current.scrollTop = artistChatBoxRef.current.scrollHeight;
    }
  }, [activeOffer?.messages]);

  // Settings state
  const [displayName, setDisplayName] = useState(user?.name ?? "");
  const [upgrading, setUpgrading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadDashboardData();
    const iv = setInterval(() => loadDashboardData({ silent: true }), 4000);
    return () => clearInterval(iv);
  }, [user]);

  // Poll messages & status live for the active offer thread
  useEffect(() => {
    if (!activeOfferId || !user) return;
    const pollMsgs = async () => {
      // 1. Poll messages
      const { data: msgs } = await (supabase as any)
        .from("negotiation_messages")
        .select("*")
        .eq("negotiation_id", activeOfferId)
        .order("created_at", { ascending: true });

      // 2. Poll negotiation status & price
      const { data: negRow } = await (supabase as any)
        .from("negotiations")
        .select("*")
        .eq("id", activeOfferId)
        .maybeSingle();

      if (msgs || negRow) {
        setOffers((prev) =>
          prev.map((off) => {
            if (off.id !== activeOfferId) return off;
            const updatedMsgs = msgs
              ? msgs.map((m: any) => ({
                  sender: m.sender_role,
                  text: m.body,
                  timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                }))
              : off.messages;

            return {
              ...off,
              offer_amount: negRow ? Number(negRow.offer_amount) : off.offer_amount,
              status: negRow ? negRow.status : off.status,
              messages: updatedMsgs,
            };
          })
        );
      }
    };

    pollMsgs();
    const iv = setInterval(pollMsgs, 2000);
    return () => clearInterval(iv);
  }, [activeOfferId, user]);

  const loadDashboardData = async (opts: { silent?: boolean } = {}) => {
    if (!user) return;
    if (!opts.silent) setLoading(true);

    try {
      // 1. Fetch Purchases & Orders placed by this artist using fetchUserLibrary
      const libItems = await fetchUserLibrary(user.id);

      const { data: orderData } = await supabase
        .from("orders")
        .select("*, beats(title, cover_url, audio_url, producer_id)")
        .eq("buyer_id", user.id)
        .order("created_at", { ascending: false });

      const resolvedMap = new Map<string, OrderItem>();

      if (libItems && libItems.length > 0) {
        for (const item of libItems) {
          resolvedMap.set(item.purchaseId, {
            id: item.purchaseId,
            beat_id: item.beatId,
            producer_id: "",
            license_name: item.licenseName,
            license_type: item.licenseType,
            price: item.price,
            contract_snapshot: item.contractSnapshot,
            created_at: item.purchaseDate,
            status: "completed",
            coverUrl: item.coverUrl,
            beats: {
              title: item.beatTitle,
              cover_url: item.coverUrl,
            },
          });
        }
      }

      if (orderData && orderData.length > 0) {
        for (const ord of orderData) {
          if (!resolvedMap.has(ord.id)) {
            const coverUrl = await resolveCoverUrl(ord.beats?.cover_url, ord.beat_id);
            resolvedMap.set(ord.id, {
              ...(ord as any),
              coverUrl,
              beats: {
                title: ord.beats?.title || "Beat License",
                cover_url: coverUrl,
                audio_url: ord.beats?.audio_url,
                producer_id: ord.beats?.producer_id,
              },
            });
          }
        }
      }

      setOrders(Array.from(resolvedMap.values()));

      // Fetch producer profiles for name mapping
      const { data: prodProfiles } = await supabase.from("producer_profiles").select("user_id, producer_name, username");
      const profileMap = new Map((prodProfiles ?? []).map((p) => [p.user_id, p.producer_name || p.username]));

      // 2. Fetch negotiations / offers from Supabase (clean select *)
      const { data: dbOffers } = await (supabase as any)
        .from("negotiations")
        .select("*")
        .eq("artist_id", user.id)
        .order("created_at", { ascending: false });

      let formattedOffers: OfferItem[] = [];
      if (dbOffers && dbOffers.length > 0) {
        for (const item of dbOffers) {
          const { data: msgs } = await (supabase as any)
            .from("negotiation_messages")
            .select("*")
            .eq("negotiation_id", item.id)
            .order("created_at", { ascending: true });

          formattedOffers.push({
            id: item.id,
            beat_id: item.beat_id,
            beat_title: item.beat_title,
            producer: profileMap.get(item.producer_id) || "Producer",
            producer_id: item.producer_id,
            license_name: item.license_name,
            offer_amount: Number(item.offer_amount),
            status: item.status,
            date: new Date(item.created_at).toLocaleDateString(),
            messages: (msgs ?? []).map((m: any) => ({
              sender: m.sender_role,
              text: m.body,
              timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            })),
          });
        }
      }

      // Scan local storage for fallback
      const storedOffers = localStorage.getItem(`artist_offers_${user.id}`);
      if (storedOffers) {
        try {
          const parsed = JSON.parse(storedOffers);
          for (const p of parsed) {
            if (!formattedOffers.some((f) => f.id === p.id)) {
              formattedOffers.push(p);
            }
          }
        } catch {}
      }

      if (formattedOffers.length === 0) {
        formattedOffers = defaultMockOffers();
      }

      setOffers(formattedOffers);
      if (formattedOffers.length > 0 && !activeOfferId) {
        setActiveOfferId(formattedOffers[0].id);
      }
    } catch (e) {
      console.error("Error loading artist dashboard:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSendReply = async (offerId: string) => {
    if (!replyText.trim() || !user) return;
    const txt = replyText.trim();
    setReplyText("");

    const updated = offers.map((off) => {
      if (off.id === offerId) {
        return {
          ...off,
          messages: [
            ...off.messages,
            {
              sender: "artist" as const,
              text: txt,
              timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            },
          ],
        };
      }
      return off;
    });

    setOffers(updated);
    localStorage.setItem(`artist_offers_${user.id}`, JSON.stringify(updated));

    try {
      await (supabase as any).from("negotiation_messages").insert({
        negotiation_id: offerId,
        sender_id: user.id,
        sender_role: "artist",
        body: txt,
      });
    } catch (e) {
      console.warn("Error sending message to DB:", e);
    }
  };

  const [purchasing, setPurchasing] = useState(false);
  const [purchaseErr, setPurchaseErr] = useState<string | null>(null);

  const sendEmails = useServerFn(sendPurchaseEmailsFn);

  const completeNegotiatedPurchase = async (offer: OfferItem) => {
    if (!user || !offer.beat_id || !offer.producer_id) {
      setPurchaseErr("Missing beat or producer info on this offer.");
      return;
    }
    setPurchasing(true);
    setPurchaseErr(null);
    try {
      const contractSnapshot = `Negotiated ${offer.license_name || "Custom"} License for "${offer.beat_title}" between ${offer.producer} and ${user.name}. Agreed price: ₦${offer.offer_amount.toLocaleString()}. Signed ${new Date().toISOString()}.`;
      const { data: orderRow, error } = await supabase.from("orders").insert({
        buyer_id: user.id,
        beat_id: offer.beat_id,
        producer_id: offer.producer_id,
        license_type: (offer.license_name || "custom").toLowerCase(),
        license_name: offer.license_name || "Negotiated",
        price: offer.offer_amount,
        contract_snapshot: contractSnapshot,
      }).select().maybeSingle();
      if (error) throw error;
      await (supabase as any).from("negotiations").update({ status: "paid" }).eq("id", offer.id);

      // Fire purchase emails to both parties
      sendEmails({
        data: {
          beatId: offer.beat_id,
          beatTitle: offer.beat_title,
          producerId: offer.producer_id,
          producerName: offer.producer,
          licenseName: offer.license_name || "Negotiated",
          price: offer.offer_amount,
          purchaseId: orderRow?.id ?? offer.id,
        },
      }).catch((e) => console.error("[email] send failed", e));

      await loadDashboardData({ silent: true });
    } catch (e: any) {
      setPurchaseErr(e?.message ?? "Purchase failed");
    } finally {
      setPurchasing(false);
    }
  };

  const handleBecomeProducer = async () => {
    if (!user) return;
    setUpgrading(true);
    try {
      // Update account_type to producer in Supabase profiles
      const { error } = await supabase
        .from("profiles")
        .update({ account_type: "producer" })
        .eq("id", user.id);

      if (error) console.error("Error updating account type:", error);

      // Also update user metadata
      await supabase.auth.updateUser({
        data: { account_type: "producer" },
      });

      // Redirect to producer onboarding
      nav({ to: "/producer/onboarding" });
    } catch (err) {
      console.error("Failed to upgrade account:", err);
    } finally {
      setUpgrading(false);
    }
  };

  const totalSpent = orders.reduce((sum, o) => sum + (o.price || 0), 0);

  return (
    <ArtistLayout active={`/artist/dashboard?${tab}`}>
      <div className="mx-auto max-w-6xl p-6 sm:p-8">
        {/* Header Banner */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-teal/10 px-3 py-1 text-xs font-bold text-teal">
              <Headphones className="h-3.5 w-3.5" /> Artist Command Center
            </div>
            <h1 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Welcome back, {user?.name ?? "Artist"} 👋
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage your licensed beats, custom negotiations, and offers.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/browse"
              className="flex h-10 items-center gap-2 rounded-xl bg-surface border border-white/10 px-4 text-xs font-bold text-foreground transition hover:bg-white/5"
            >
              <Music4 className="h-4 w-4 text-red-500" /> Browse Beats
            </Link>
            <button
              onClick={handleBecomeProducer}
              disabled={upgrading}
              className="flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-[#EF4444] to-[#DC2626] px-4 text-xs font-bold text-black shadow-lg transition hover:brightness-105"
            >
              <Sparkles className="h-4 w-4" /> Become a Producer
            </button>
          </div>
        </div>

        {/* Tab navigation bar */}
        <div className="mb-8 flex items-center gap-2 border-b border-white/10 pb-3">
          {[
            { id: "overview", label: "Overview", icon: Headphones },
            { id: "purchases", label: `My Purchases (${orders.length})`, icon: ShoppingBag },
            { id: "messages", label: `Negotiations (${offers.length})`, icon: MessageSquare },
            { id: "settings", label: "Account Settings", icon: Settings },
          ].map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <Link
                key={t.id}
                to="/artist/dashboard"
                search={{ tab: t.id as any }}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
                  active
                    ? "bg-teal/15 text-teal border border-teal/30"
                    : "text-muted-foreground hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {t.label}
              </Link>
            );
          })}
        </div>

        {/* ---------------- TAB: OVERVIEW ---------------- */}
        {tab === "overview" && (
          <div className="space-y-8">
            {/* Stats row */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-surface/60 p-5">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-xs font-semibold uppercase tracking-wider">Beats Purchased</span>
                  <ShoppingBag className="h-4 w-4 text-teal" />
                </div>
                <div className="mt-3 font-display text-3xl font-bold">{orders.length}</div>
                <p className="mt-1 text-xs text-muted-foreground">Instant WAV/Stem downloads</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-surface/60 p-5">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-xs font-semibold uppercase tracking-wider">Active Negotiations</span>
                  <MessageSquare className="h-4 w-4 text-red-500" />
                </div>
                <div className="mt-3 font-display text-3xl font-bold">{offers.length}</div>
                <p className="mt-1 text-xs text-muted-foreground">Offers sent to producers</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-surface/60 p-5">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-xs font-semibold uppercase tracking-wider">Total Invested</span>
                  <DollarSign className="h-4 w-4 text-emerald-400" />
                </div>
                <div className="mt-3 font-display text-3xl font-bold text-red-500">{fmtNaira(totalSpent)}</div>
                <p className="mt-1 text-xs text-muted-foreground">Commercial master rights</p>
              </div>
            </div>

            {/* Quick Purchases list preview */}
            <div className="rounded-2xl border border-white/10 bg-surface/40 p-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="font-display text-lg font-bold">Recent Purchases</h3>
                  <p className="text-xs text-muted-foreground">Your acquired beat licenses and downloads</p>
                </div>
                <Link
                  to="/artist/dashboard"
                  search={{ tab: "purchases" }}
                  className="text-xs font-bold text-teal hover:underline flex items-center gap-1"
                >
                  View all <ChevronRight className="h-3 w-3" />
                </Link>
              </div>

              {orders.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <ShoppingBag className="mx-auto h-10 w-10 opacity-30 mb-2" />
                  <p className="text-sm font-semibold">No beats purchased yet</p>
                  <p className="text-xs mt-1">Explore our marketplace to license radio-ready beats.</p>
                  <Link
                    to="/browse"
                    className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-lg bg-red-500/10 border border-red-500/30 px-4 text-xs font-bold text-red-500 hover:bg-red-500/20"
                  >
                    Browse Marketplace
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {orders.slice(0, 3).map((ord) => (
                    <div key={ord.id} className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-surface">
                          {ord.coverUrl || ord.beats?.cover_url ? (
                            <img
                              src={ord.coverUrl || ord.beats?.cover_url}
                              alt={ord.beats?.title || "Beat"}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="grid h-full w-full place-items-center bg-red-500/10 text-red-500">
                              <Music4 className="h-5 w-5" />
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-sm">{ord.beats?.title || "Beat License"}</div>
                          <div className="text-xs text-muted-foreground">
                            {ord.license_name} License · {new Date(ord.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-bold text-red-500 text-sm">{fmtNaira(ord.price)}</span>
                        <button
                          onClick={() => setViewingContract(ord)}
                          className="flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1 text-xs font-medium hover:bg-white/5"
                        >
                          <FileText className="h-3 w-3" /> Agreement
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ---------------- TAB: PURCHASES ---------------- */}
        {tab === "purchases" && (
          <div className="rounded-2xl border border-white/10 bg-surface/40 p-6">
            <div className="mb-6">
              <h2 className="font-display text-xl font-bold">My Licensed Beats</h2>
              <p className="text-xs text-muted-foreground">
                All purchased beat licenses, auto-signed agreements, and master files.
              </p>
            </div>

            {orders.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground">
                <ShoppingBag className="mx-auto h-12 w-12 opacity-30 mb-3" />
                <h3 className="font-display text-lg font-bold text-foreground">You haven't bought any beats yet</h3>
                <p className="text-xs max-w-sm mx-auto mt-1">
                  Once you purchase a beat license, your signed agreement and downloads will appear right here.
                </p>
                <Link
                  to="/browse"
                  className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-red-500 px-5 text-xs font-bold text-black hover:brightness-105"
                >
                  <Music4 className="h-4 w-4" /> Discover Beats Now
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((ord) => (
                  <div
                    key={ord.id}
                    className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-background/50 p-5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-surface shadow-md">
                        {ord.coverUrl || ord.beats?.cover_url ? (
                          <img
                            src={ord.coverUrl || ord.beats?.cover_url}
                            alt={ord.beats?.title || "Beat"}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="grid h-full w-full place-items-center bg-red-500/10 text-red-500">
                            <Music4 className="h-7 w-7" />
                          </div>
                        )}
                      </div>
                      <div>
                        <h4 className="font-display text-base font-bold">{ord.beats?.title || "Beat License"}</h4>
                        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="rounded-md bg-red-500/10 px-2 py-0.5 font-bold uppercase text-red-500 text-[10px]">
                            {ord.license_name} License
                          </span>
                          <span>·</span>
                          <span>Purchased {new Date(ord.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-center">
                      <div className="text-right mr-2">
                        <div className="font-display text-base font-bold text-red-500">{fmtNaira(ord.price)}</div>
                        <div className="text-[10px] text-teal flex items-center gap-1 justify-end">
                          <ShieldCheck className="h-3 w-3" /> Rights Secured
                        </div>
                      </div>

                      <button
                        onClick={() => setViewingContract(ord)}
                        className="flex h-9 items-center gap-1.5 rounded-lg border border-white/15 bg-surface/60 px-3 text-xs font-semibold hover:bg-white/10"
                      >
                        <FileText className="h-3.5 w-3.5" /> View Contract
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ---------------- TAB: MESSAGES / NEGOTIATIONS ---------------- */}
        {tab === "messages" && (
          <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
            {/* Conversations list sidebar */}
            <div className="rounded-2xl border border-white/10 bg-surface/40 p-4">
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground px-2">
                Offers & Negotiations ({offers.length})
              </h3>
              {offers.length === 0 ? (
                <p className="py-6 text-center text-xs text-muted-foreground">No active offers yet.</p>
              ) : (
                <div className="max-h-[420px] overflow-y-auto pr-1 space-y-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/20">
                  {offers.map((off) => {
                    const isSelected = off.id === activeOfferId;
                    return (
                      <button
                        key={off.id}
                        onClick={() => setActiveOfferId(off.id)}
                        className={`w-full rounded-xl border p-3 text-left transition ${
                          isSelected
                            ? "border-teal/50 bg-teal/10"
                            : "border-white/5 bg-background/40 hover:border-white/15"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm truncate">{off.beat_title}</span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${
                              off.status === "accepted"
                                ? "bg-teal/20 text-teal"
                                : off.status === "rejected"
                                ? "bg-crimson/20 text-crimson"
                                : "bg-red-500/20 text-red-500"
                            }`}
                          >
                            {off.status}
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">Prod. {off.producer}</div>
                        <div className="mt-2 flex items-center justify-between text-[11px]">
                          <span className="font-bold text-red-500">{fmtNaira(off.offer_amount)}</span>
                          <span className="text-muted-foreground/70">{off.date}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Chat conversation area */}
            <div className="flex min-h-[420px] flex-col rounded-2xl border border-white/10 bg-surface/40 p-5">
              {activeOffer ? (
                <>
                  {/* Chat header */}
                  <div className="border-b border-white/10 pb-4 flex items-center justify-between">
                    <div>
                      <div className="inline-flex items-center gap-1 text-xs font-bold text-red-500">
                        <Sparkles className="h-3 w-3" /> Negotiating Master Rights
                      </div>
                      <h3 className="font-display text-lg font-bold">{activeOffer.beat_title}</h3>
                      <p className="text-xs text-muted-foreground">Producer: {activeOffer.producer}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">Offer Amount</div>
                      <div className="font-display text-xl font-bold text-red-500">
                        {fmtNaira(activeOffer.offer_amount)}
                      </div>
                    </div>
                  </div>

                  {/* Message thread */}
                  <div
                    ref={artistChatBoxRef}
                    className="flex-1 max-h-[360px] overflow-y-auto pr-1 py-4 space-y-3 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/20"
                  >
                    {activeOffer.messages.map((msg, idx) => {
                      const isMe = msg.sender === "artist";
                      return (
                        <div
                          key={idx}
                          className={`flex flex-col max-w-[80%] ${
                            isMe ? "ml-auto items-end" : "items-start"
                          }`}
                        >
                          <div className="text-[10px] text-muted-foreground mb-1">
                            {isMe ? "You (Artist)" : activeOffer.producer} · {msg.timestamp}
                          </div>
                          <div
                            className={`rounded-2xl px-4 py-2.5 text-xs leading-relaxed ${
                              isMe
                                ? "bg-teal/20 border border-teal/30 text-white rounded-br-none"
                                : "bg-white/10 border border-white/10 text-foreground rounded-bl-none"
                            }`}
                          >
                            {msg.text}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {(activeOffer.status === "accepted" || activeOffer.status === "paid" || activeOffer.status === "countered") && (
                    <div className={`mt-4 rounded-xl border p-4 ${activeOffer.status === "paid" ? "border-teal/40 bg-teal/10" : "border-red-500/40 bg-red-500/10"}`}>
                      {activeOffer.status === "paid" ? (
                        <div className="flex items-center gap-2 text-sm font-bold text-teal">
                          <CheckCircle2 className="h-4 w-4" /> Purchase complete — find it under "My Purchases".
                        </div>
                      ) : activeOffer.status === "countered" ? (
                        <>
                          <div className="mb-1 text-sm font-bold text-red-500">⚡ Counter Offer from {activeOffer.producer}: {fmtNaira(activeOffer.offer_amount)}</div>
                          <p className="mb-3 text-xs text-muted-foreground">The producer countered your offer. Accept to complete purchase at this agreed price, or reply with another offer below.</p>
                          {purchaseErr && <div className="mb-2 text-xs text-crimson">{purchaseErr}</div>}
                          <div className="flex gap-2">
                            <button
                              onClick={() => completeNegotiatedPurchase(activeOffer)}
                              disabled={purchasing}
                              className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#EF4444] to-[#DC2626] px-4 text-xs font-bold text-black transition hover:brightness-105 disabled:opacity-60"
                            >
                              <ShoppingBag className="h-4 w-4" /> {purchasing ? "Processing…" : `Accept & Buy · ${fmtNaira(activeOffer.offer_amount)}`}
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="mb-2 text-sm font-bold text-red-500">🎉 Offer accepted by {activeOffer.producer}!</div>
                          <p className="mb-3 text-xs text-muted-foreground">Complete your purchase to unlock the beat files and signed agreement.</p>
                          {purchaseErr && <div className="mb-2 text-xs text-crimson">{purchaseErr}</div>}
                          <button
                            onClick={() => completeNegotiatedPurchase(activeOffer)}
                            disabled={purchasing}
                            className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#EF4444] to-[#DC2626] px-5 text-sm font-bold text-black transition hover:brightness-105 disabled:opacity-60"
                          >
                            <ShoppingBag className="h-4 w-4" /> {purchasing ? "Processing…" : `Complete Purchase · ${fmtNaira(activeOffer.offer_amount)}`}
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  {/* Reply input */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendReply(activeOffer.id);
                    }}
                    className="mt-3 flex gap-2 border-t border-white/10 pt-3"
                  >
                    <input
                      type="text"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder={`Reply to ${activeOffer.producer}...`}
                      className="h-10 flex-1 rounded-xl border border-white/10 bg-background/60 px-3 text-xs outline-none focus:border-teal/40"
                    />
                    <button
                      type="submit"
                      disabled={!replyText.trim()}
                      className="flex h-10 items-center gap-1.5 rounded-xl bg-teal px-4 text-xs font-bold text-black transition hover:brightness-105 disabled:opacity-40"
                    >
                      <Send className="h-3.5 w-3.5" /> Send
                    </button>
                  </form>
                </>
              ) : (
                <div className="m-auto text-center text-muted-foreground">
                  <MessageSquare className="mx-auto h-10 w-10 opacity-30 mb-2" />
                  <p className="text-sm font-semibold">Select an offer to view conversation</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ---------------- TAB: SETTINGS ---------------- */}
        {tab === "settings" && (
          <div className="max-w-2xl space-y-6">
            <div className="rounded-2xl border border-white/10 bg-surface/40 p-6">
              <h3 className="font-display text-lg font-bold mb-4">Profile Information</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="h-10 w-full rounded-xl border border-white/10 bg-background/60 px-3 text-sm font-medium outline-none focus:border-teal/40"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    disabled
                    value={user?.email ?? ""}
                    className="h-10 w-full rounded-xl border border-white/5 bg-background/30 px-3 text-sm font-medium text-muted-foreground cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    Account Role
                  </label>
                  <div className="inline-flex items-center gap-1.5 rounded-lg bg-teal/10 border border-teal/20 px-3 py-1.5 text-xs font-bold text-teal">
                    <Headphones className="h-3.5 w-3.5" /> Artist / Buyer
                  </div>
                </div>

                {saveSuccess && (
                  <div className="rounded-lg bg-teal/10 border border-teal/30 p-3 text-xs text-teal">
                    Profile details updated successfully.
                  </div>
                )}

                <button
                  onClick={() => setSaveSuccess(true)}
                  className="h-10 rounded-xl bg-teal px-5 text-xs font-bold text-black transition hover:brightness-105"
                >
                  Save Profile
                </button>
              </div>
            </div>

            {/* Upgrade to Producer Card */}
            <div className="rounded-2xl border border-red-500/30 bg-gradient-to-br from-red-500/10 via-surface/50 to-background p-6">
              <div className="flex items-start justify-between">
                <div>
                  <div className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-500 mb-2">
                    <Sparkles className="h-3 w-3" /> Upgrade Account
                  </div>
                  <h3 className="font-display text-xl font-bold">Become a Producer on HITXLAB</h3>
                  <p className="text-xs text-muted-foreground max-w-md mt-1">
                    Want to upload and sell your beats to thousands of artists? Switch your profile to a Producer studio account.
                  </p>
                </div>
              </div>

              <div className="mt-5 flex items-center gap-3">
                <button
                  onClick={handleBecomeProducer}
                  disabled={upgrading}
                  className="h-11 rounded-xl bg-gradient-to-r from-[#EF4444] to-[#DC2626] px-6 text-xs font-bold text-black shadow-lg transition hover:brightness-105"
                >
                  {upgrading ? "Switching..." : "Switch to Producer Account →"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Contract Viewer Modal */}
      {viewingContract && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setViewingContract(null)} />
          <div className="relative flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-background shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/8 px-6 py-4">
              <div className="flex items-center gap-2.5">
                {viewingContract.coverUrl || viewingContract.beats?.cover_url ? (
                  <img
                    src={viewingContract.coverUrl || viewingContract.beats?.cover_url}
                    alt=""
                    className="h-9 w-9 shrink-0 rounded-lg border border-white/10 object-cover"
                  />
                ) : (
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-red-500/15 text-red-500">
                    <Music4 className="h-4 w-4" />
                  </span>
                )}
                <div>
                  <div className="font-display text-base font-bold">
                    {viewingContract.license_name} License Agreement
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {viewingContract.beats?.title} · License ID: {viewingContract.id.slice(0, 8)}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setViewingContract(null)}
                className="grid h-8 w-8 place-items-center rounded-lg hover:bg-white/5"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-8 py-6">
              <article className="whitespace-pre-wrap font-sans text-[13px] leading-6 text-foreground/90">
                {viewingContract.contract_snapshot}
              </article>
            </div>
            <div className="flex items-center justify-between border-t border-white/8 px-6 py-4">
              <span className="text-xs font-bold text-red-500">Price Paid: {fmtNaira(viewingContract.price)}</span>
              <button
                onClick={() => setViewingContract(null)}
                className="h-9 rounded-lg bg-foreground px-4 text-xs font-bold text-background hover:brightness-90"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </ArtistLayout>
  );
}

function defaultMockOffers(): OfferItem[] {
  return [
    {
      id: "off-1",
      beat_title: "Midnight Bloom",
      producer: "Vantablack",
      offer_amount: 250000,
      status: "pending",
      date: "Today",
      messages: [
        {
          sender: "artist",
          text: "Hey! I want to acquire Exclusive rights for Midnight Bloom. I am planning an official single release next month.",
          timestamp: "10:30 AM",
        },
      ],
    },
  ];
}
