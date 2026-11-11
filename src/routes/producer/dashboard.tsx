import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { useEffect, useState, useMemo, useRef } from "react";
import {
  Music4,
  Users,
  DollarSign,
  Play,
  Download,
  TrendingUp,
  ShoppingBag,
  Upload as UploadIcon,
  Search,
  MoreHorizontal,
  BadgeCheck,
  Sparkles,
  Trash2,
  Pencil,
  MessageSquare,
  Send,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Mail,
  UserCheck,
  UserPlus,
  FileText,
  Eye,
  ShieldCheck,
  Globe,
  SlidersHorizontal,
  ChevronRight,
  X,
  Layers,
  BarChart3,
  ExternalLink,
  Package,
  Loader2,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ProducerLayout } from "@/components/ProducerLayout";
import { SettingsView } from "@/components/SettingsView";
import { ProducerAnalytics } from "@/components/ProducerAnalytics";
import { NotificationsPanel } from "@/components/NotificationsPanel";
import { fmtPlays, useAuth } from "@/lib/store";
import { useBeatPlays, getBeatPlays } from "@/lib/plays-store";
import { fmtNaira } from "@/lib/currency";
import { useProducerProfile } from "@/lib/producer-profile";
import { fetchMyBeats } from "@/lib/beats-api";
import type { Beat } from "@/data/beats";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchProducerSales,
  downloadLicenseAgreement,
  type ProducerOrderRecord,
} from "@/lib/purchase-service";
import { defaultLicenses, type License } from "@/lib/licenses";

const searchSchema = z.object({
  tab: z
    .enum([
      "overview",
      "beats",
      "sample-packs",
      "orders",
      "purchases",
      "followers",
      "notifications",
      "analytics",
      "direct-messages",
      "messages",
      "contracts",
      "settings",
    ])
    .optional()
    .default("overview"),
});

export const Route = createFileRoute("/producer/dashboard")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [
      { title: "Producer Dashboard · HITXLAB" },
      { name: "description", content: "Manage your beats, detailed orders, analytics, and contracts on HITXLAB." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { tab } = Route.useSearch();
  const { user } = useAuth();
  const { profile } = useProducerProfile();
  const [beats, setBeats] = useState<Beat[]>([]);
  const [orders, setOrders] = useState<ProducerOrderRecord[]>([]);
  const [directMessages, setDirectMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [followerCount, setFollowerCount] = useState<number>(0);

  const refresh = async () => {
    if (!user) return;
    setLoading(true);
    const [b, o] = await Promise.all([
      fetchMyBeats(user.id),
      fetchProducerSales(user.id),
    ]);
    setBeats(b);
    setOrders(o);
    
    // Load direct messages
    try {
      const { data: messages, error: msgError } = await (supabase as any)
        .from("direct_messages")
        .select("*")
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order("created_at", { ascending: false });
      
      console.log("📧 Producer messages query result:", messages, "Error:", msgError);
      
      if (messages && messages.length > 0) {
        // Fetch sender and receiver names separately
        const allUserIds = new Set<string>();
        messages.forEach((msg: any) => {
          allUserIds.add(msg.sender_id);
          allUserIds.add(msg.receiver_id);
        });

        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, name, email")
          .in("id", Array.from(allUserIds));

        const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

        const enrichedMessages = messages.map((msg: any) => ({
          ...msg,
          sender: profileMap.get(msg.sender_id) || { name: "Unknown" },
          receiver: profileMap.get(msg.receiver_id) || { name: "Unknown" },
        }));

        setDirectMessages(enrichedMessages);
        console.log("📧 Producer loaded", enrichedMessages.length, "direct messages");
      } else {
        setDirectMessages([]);
        console.log("📧 Producer: No direct messages found");
      }
    } catch (e) {
      console.error("Error loading messages:", e);
    }
    
    setLoading(false);
  };

  useEffect(() => {
    refresh();
  }, [user?.id]);

  // Fetch real follower count
  useEffect(() => {
    async function loadFollowerCount() {
      if (!user?.id) return;
      try {
        const { count } = await (supabase as any)
          .from("producer_followers")
          .select("*", { count: "exact", head: true })
          .eq("producer_id", user.id);
        setFollowerCount(count ?? 0);
      } catch {
        setFollowerCount(0);
      }
    }
    loadFollowerCount();
  }, [user?.id]);

  const [beatToDelete, setBeatToDelete] = useState<{ id: string; title: string } | null>(null);
  const [deletingBeat, setDeletingBeat] = useState(false);

  const handleConfirmDeleteBeat = async () => {
    if (!beatToDelete) return;
    setDeletingBeat(true);
    try {
      await (supabase as any).from("beats").delete().eq("id", beatToDelete.id);
      refresh();
    } catch (err) {
      console.error("Error deleting beat:", err);
    } finally {
      setDeletingBeat(false);
      setBeatToDelete(null);
    }
  };

  const revenue = orders.reduce((s, o) => s + Number(o.price ?? 0), 0);

  return (
    <ProducerLayout>
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8">
        {tab === "overview" && (
          <Overview 
            profile={profile} 
            beats={beats} 
            sales={orders.length} 
            revenue={revenue} 
            followerCount={followerCount}
          />
        )}
        {tab === "beats" && (
          <MyBeats
            beats={beats}
            loading={loading}
            onDelete={(id, title) => setBeatToDelete({ id, title })}
          />
        )}
        {tab === "sample-packs" && <MySamplePacks userId={user?.id} />}
        {tab === "orders" && <DetailedOrders orders={orders} loading={loading} />}
        {tab === "purchases" && <PurchasedBeats userId={user?.id} />}
        {tab === "followers" && <Followers profile={profile} orders={orders} />}
        {tab === "notifications" && <NotificationsPanel />}
        {tab === "analytics" && <ProducerAnalytics beats={beats} orders={orders} revenue={revenue} />}
        {tab === "direct-messages" && (
          <div>
            <div className="mb-6">
              <h1 className="font-display text-3xl font-bold">Messages</h1>
              <p className="text-sm text-muted-foreground">Chat with artists</p>
            </div>
            {directMessages.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-surface/40 p-12 text-center">
                <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground/40" />
                <p className="mt-4 text-sm text-muted-foreground">No conversations yet</p>
              </div>
            ) : (
              <ChatInterfaceProducer 
                messages={directMessages} 
                currentUserId={user?.id}
              />
            )}
          </div>
        )}
        {tab === "messages" && <ProducerMessages userId={user?.id} />}
        {tab === "contracts" && <Contracts orders={orders} profile={profile} />}
        {tab === "settings" && <SettingsView />}
      </div>

      <DeleteConfirmModal
        open={!!beatToDelete}
        itemName={beatToDelete?.title || ""}
        itemType="beat"
        loading={deletingBeat}
        onConfirm={handleConfirmDeleteBeat}
        onClose={() => setBeatToDelete(null)}
      />
    </ProducerLayout>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   OVERVIEW TAB
   ───────────────────────────────────────────────────────────────────────────── */
function Overview({
  profile,
  beats,
  sales,
  revenue,
  followerCount,
}: {
  profile: any;
  beats: Beat[];
  sales: number;
  revenue: number;
  followerCount: number;
}) {
  const cards = [
    { label: "Total beats", value: String(beats.length), icon: Music4, tint: "gold" as const },
    { label: "Published", value: String(beats.length), icon: Sparkles, tint: "teal" as const },
    { label: "Sales", value: String(sales), icon: ShoppingBag, tint: "teal" as const },
    { label: "Revenue", value: fmtNaira(revenue), icon: DollarSign, tint: "gold" as const },
    {
      label: "Plays",
      value: fmtPlays(beats.reduce((s, b) => s + getBeatPlays(b.id, b.plays), 0)),
      icon: Play,
      tint: "muted" as const,
    },
    { label: "Followers", value: String(followerCount), icon: Users, tint: "gold" as const },
    { label: "Downloads", value: String(sales), icon: Download, tint: "teal" as const },
    { label: "Drafts", value: "0", icon: MoreHorizontal, tint: "muted" as const },
  ];

  return (
    <>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-sm text-muted-foreground">
            Welcome back,{" "}
            <span className="font-semibold text-foreground">
              {profile?.producerName ?? "Producer"}
            </span>
          </div>
          <h1 className="mt-1 font-display text-3xl font-bold sm:text-4xl">Studio overview</h1>
        </div>
        <Link
          to="/producer/upload"
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-b from-[#EF4444] to-[#DC2626] px-5 text-sm font-semibold text-black shadow-[0_10px_30px_-8px_oklch(0.7_0.17_55/0.6)] transition hover:brightness-105"
        >
          <UploadIcon className="h-4 w-4" /> Upload a beat
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cards.map((c) => (
          <StatCard key={c.label} {...c} />
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-2xl border border-white/8 bg-surface/50 p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-bold">Revenue trend</h3>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-teal">
              <TrendingUp className="h-3.5 w-3.5" /> Live
            </span>
          </div>
          <MiniChart />
        </div>
        <div className="rounded-2xl border border-white/8 bg-surface/50 p-5">
          <h3 className="font-display text-lg font-bold">Recent activity</h3>
          {beats.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              No activity yet. Upload your first beat to get started.
            </p>
          ) : (
            <ul className="mt-4 flex flex-col divide-y divide-white/5">
              {beats.slice(0, 4).map((b) => (
                <li key={b.id} className="flex items-start justify-between gap-3 py-3">
                  <div>
                    <div className="text-sm font-semibold">Beat published</div>
                    <div className="text-xs text-muted-foreground">{b.title}</div>
                  </div>
                  <span className="text-[11px] text-muted-foreground">Live</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  tint,
}: {
  label: string;
  value: string;
  icon: any;
  tint: "gold" | "teal" | "muted";
}) {
  const tintCls =
    tint === "gold"
      ? "bg-red-500/10 text-red-500"
      : tint === "teal"
        ? "bg-teal/10 text-teal"
        : "bg-white/5 text-muted-foreground";
  return (
    <div className="rounded-2xl border border-white/8 bg-surface/50 p-4">
      <div className={`grid h-9 w-9 place-items-center rounded-lg ${tintCls}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="mt-3 font-display text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function MiniChart() {
  const data = [8, 12, 10, 18, 14, 22, 20, 28, 24, 30, 36, 42];
  const max = Math.max(...data);
  return (
    <div className="mt-4 flex h-40 items-end gap-1.5">
      {data.map((v, i) => (
        <div
          key={i}
          className="flex-1 rounded-t-md bg-gradient-to-t from-red-500/70 to-red-600/20"
          style={{ height: `${(v / max) * 100}%` }}
        />
      ))}
    </div>
  );
}

function BeatRowPlays({ beat }: { beat: Beat }) {
  const plays = useBeatPlays(beat.id, beat.plays);
  return <>{fmtPlays(plays)}</>;
}

/* ─────────────────────────────────────────────────────────────────────────────
   MY BEATS TAB
   ───────────────────────────────────────────────────────────────────────────── */
function MyBeats({
  beats,
  loading,
  onDelete,
}: {
  beats: Beat[];
  loading: boolean;
  onDelete: (id: string, title: string) => void;
}) {
  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">My beats</h1>
          <p className="text-sm text-muted-foreground">
            Manage your catalog, edit licenses, and track performance.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder="Search beats"
              className="h-10 w-56 rounded-xl border border-white/10 bg-surface/60 pl-9 pr-3 text-sm outline-none focus:border-red-500/40"
            />
          </div>
          <Link
            to="/producer/upload"
            className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-red-500 px-4 text-sm font-semibold text-red-500-foreground"
          >
            <UploadIcon className="h-4 w-4" /> Upload
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : beats.length === 0 ? (
        <Empty
          title="No beats yet"
          desc="Upload your first beat to open your catalog to artists worldwide."
          cta
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/8">
          <table className="w-full text-sm">
            <thead className="bg-surface/60 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Beat</th>
                <th className="px-4 py-3 hidden md:table-cell">Genre</th>
                <th className="px-4 py-3 hidden md:table-cell">BPM</th>
                <th className="px-4 py-3 hidden sm:table-cell">Plays</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {beats.map((b) => (
                <tr key={b.id} className="bg-surface/30 hover:bg-surface/60">
                  <td className="px-4 py-3">
                    <Link
                      to="/beat/$id"
                      params={{ id: b.id }}
                      className="flex items-center gap-3 hover:text-red-500"
                    >
                      <img src={b.cover} alt="" className="h-10 w-10 rounded-lg object-cover" />
                      <div className="min-w-0">
                        <div className="truncate font-semibold">{b.title}</div>
                        <div className="truncate text-xs text-muted-foreground">{b.key}</div>
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                    {b.genre}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{b.bpm}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                    <BeatRowPlays beat={b} />
                  </td>
                  <td className="px-4 py-3 font-bold text-red-500">
                    {fmtNaira(b.licenses[0]?.price ?? 0)}+
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        to="/producer/edit/$id"
                        params={{ id: b.id }}
                        className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-white/5 hover:text-red-500"
                      >
                        <Pencil className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => onDelete(b.id, b.title)}
                        className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-white/5 hover:text-crimson"
                        title="Delete Beat"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   DETAILED SEARCHABLE ORDERS TAB (Requirement #1)
   ───────────────────────────────────────────────────────────────────────────── */
function DetailedOrders({ orders, loading }: { orders: ProducerOrderRecord[]; loading: boolean }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "completed" | "pending">("all");
  const [selectedOrder, setSelectedOrder] = useState<ProducerOrderRecord | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      const matchesSearch =
        !search ||
        o.id.toLowerCase().includes(search.toLowerCase()) ||
        o.buyerName.toLowerCase().includes(search.toLowerCase()) ||
        o.buyerEmail.toLowerCase().includes(search.toLowerCase()) ||
        o.buyerId.toLowerCase().includes(search.toLowerCase()) ||
        o.beatTitle.toLowerCase().includes(search.toLowerCase()) ||
        o.licenseName.toLowerCase().includes(search.toLowerCase());

      const matchesStatus = statusFilter === "all" || o.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [orders, search, statusFilter]);

  const totalRevenue = filtered.reduce((s, o) => s + o.price, 0);
  const uniqueBuyers = new Set(filtered.map((o) => o.buyerEmail)).size;

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Orders & Sales</h1>
          <p className="text-sm text-muted-foreground">
            Search order IDs, buyer emails, view detailed transactions and legal contracts.
          </p>
        </div>
      </div>

      {/* Summary KPI Pills */}
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-white/8 bg-surface/50 p-4">
          <div className="text-xs text-muted-foreground">Total Sales Count</div>
          <div className="mt-1 font-display text-2xl font-bold text-foreground">{orders.length}</div>
        </div>
        <div className="rounded-xl border border-white/8 bg-surface/50 p-4">
          <div className="text-xs text-muted-foreground">Gross Revenue</div>
          <div className="mt-1 font-display text-2xl font-bold text-red-500">{fmtNaira(totalRevenue)}</div>
        </div>
        <div className="rounded-xl border border-white/8 bg-surface/50 p-4">
          <div className="text-xs text-muted-foreground">Unique Buyers</div>
          <div className="mt-1 font-display text-2xl font-bold text-teal">{uniqueBuyers}</div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Order ID, Buyer Name, Email, or Beat Title…"
            className="h-11 w-full rounded-xl border border-white/10 bg-surface/60 pl-10 pr-4 text-sm outline-none transition focus:border-red-500/40 focus:ring-1 focus:ring-red-500/20"
          />
        </div>
        <div className="flex items-center gap-1.5">
          {(["all", "completed", "pending"] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`h-10 rounded-xl px-3.5 text-xs font-semibold uppercase tracking-wider transition ${
                statusFilter === st
                  ? "bg-red-500 text-black shadow-md"
                  : "border border-white/8 bg-surface/40 text-muted-foreground hover:bg-white/5"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table */}
      {loading ? (
        <div className="p-8 text-center text-sm text-muted-foreground">Loading seller orders…</div>
      ) : filtered.length === 0 ? (
        <Empty
          title={search ? "No matching orders" : "No sales recorded yet"}
          desc={search ? "Try searching a different Order ID or buyer email." : "Your beat sales will show up here once an artist completes checkout."}
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/8 bg-surface/40 backdrop-blur-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-white/8 bg-surface/80 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3.5">Order / ID</th>
                  <th className="px-4 py-3.5">Buyer (Artist)</th>
                  <th className="px-4 py-3.5">Beat Title</th>
                  <th className="px-4 py-3.5">License Tier</th>
                  <th className="px-4 py-3.5">Amount</th>
                  <th className="px-4 py-3.5">Date</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((r) => (
                  <tr key={r.id} className="transition hover:bg-white/5">
                    {/* Order ID */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-semibold text-red-500">
                          #{r.id.slice(0, 8)}
                        </span>
                        <button
                          onClick={() => copyToClipboard(r.id, r.id)}
                          title="Copy Full ID"
                          className="grid h-6 w-6 place-items-center rounded text-muted-foreground hover:bg-white/10 hover:text-foreground"
                        >
                          {copiedId === r.id ? (
                            <Check className="h-3 w-3 text-teal" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                      </div>
                    </td>

                    {/* Buyer Name & Email */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-teal/15 text-xs font-bold text-teal">
                          {r.buyerName.slice(0, 1).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate font-semibold text-foreground">{r.buyerName}</div>
                          <div className="flex items-center gap-1">
                            <a
                              href={`mailto:${r.buyerEmail}`}
                              className="truncate text-xs text-muted-foreground hover:text-teal hover:underline"
                            >
                              {r.buyerEmail}
                            </a>
                            <button
                              onClick={() => copyToClipboard(r.buyerEmail, `email-${r.id}`)}
                              title="Copy Email"
                              className="text-muted-foreground/60 hover:text-foreground"
                            >
                              {copiedId === `email-${r.id}` ? (
                                <Check className="h-2.5 w-2.5 text-teal" />
                              ) : (
                                <Copy className="h-2.5 w-2.5" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Beat Title */}
                    <td className="px-4 py-3.5">
                      <div className="font-medium text-foreground">{r.beatTitle}</div>
                    </td>

                    {/* License Tier */}
                    <td className="px-4 py-3.5">
                      <span className="inline-flex rounded-full bg-red-500/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-500">
                        {r.licenseName}
                      </span>
                    </td>

                    {/* Price */}
                    <td className="px-4 py-3.5 font-display font-bold text-red-500">
                      {fmtNaira(r.price)}
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3.5 text-xs text-muted-foreground">
                      {new Date(r.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>

                    {/* Action */}
                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={() => setSelectedOrder(r)}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 text-xs font-semibold text-foreground transition hover:bg-white/10 hover:border-red-500/40"
                      >
                        <Eye className="h-3.5 w-3.5" /> Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Order Details Drawer / Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-white/10 bg-background p-6 shadow-2xl">
            <button
              onClick={() => setSelectedOrder(null)}
              className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-xl bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-red-500">
              <ShieldCheck className="h-4 w-4 text-teal" /> Order Details & Agreement
            </div>
            <h2 className="mt-1 font-display text-2xl font-bold">#{selectedOrder.id}</h2>

            <div className="mt-6 grid grid-cols-2 gap-4 rounded-2xl border border-white/8 bg-surface/60 p-4">
              <div>
                <div className="text-xs text-muted-foreground">Buyer Name</div>
                <div className="font-semibold">{selectedOrder.buyerName}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Buyer Email</div>
                <a href={`mailto:${selectedOrder.buyerEmail}`} className="font-semibold text-teal hover:underline flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5" /> {selectedOrder.buyerEmail}
                </a>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Beat Title</div>
                <div className="font-semibold">{selectedOrder.beatTitle}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">License & Price</div>
                <div className="font-semibold text-red-500">{selectedOrder.licenseName} · {fmtNaira(selectedOrder.price)}</div>
              </div>
            </div>

            {/* Signed legal contract */}
            <div className="mt-6">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-red-500" /> Signed Legal Agreement
                </div>
                <button
                  onClick={() =>
                    downloadLicenseAgreement({
                      buyerName: selectedOrder.buyerName,
                      beatTitle: selectedOrder.beatTitle,
                      producerName: "Producer",
                      licenseName: selectedOrder.licenseName,
                      price: selectedOrder.price,
                      purchaseDate: new Date(selectedOrder.createdAt).toLocaleDateString(),
                      contract: selectedOrder.contractSnapshot,
                    })
                  }
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-white/5 border border-white/10 px-3 text-xs font-semibold transition hover:bg-white/10"
                >
                  <Download className="h-3.5 w-3.5" /> Save Contract
                </button>
              </div>
              <pre className="max-h-60 overflow-y-auto whitespace-pre-wrap rounded-2xl border border-white/8 bg-black/40 p-4 text-xs font-mono text-muted-foreground leading-relaxed">
                {selectedOrder.contractSnapshot || "No contract snapshot stored."}
              </pre>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


function Followers({ profile, orders }: { profile: any; orders: ProducerOrderRecord[] }) {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [followerCount, setFollowerCount] = useState<number | null>(null);
  const [loadingFollowers, setLoadingFollowers] = useState(true);
  const [followersData, setFollowersData] = useState<any[]>([]);

  // Fetch real followers from producer_followers table
  useEffect(() => {
    async function loadFollowers() {
      if (!user?.id) return;
      setLoadingFollowers(true);
      try {
        // Get follower count
        const { count } = await (supabase as any)
          .from("producer_followers")
          .select("*", { count: "exact", head: true })
          .eq("producer_id", user.id);
        setFollowerCount(count ?? 0);

        // Get follower details
        const { data: followers } = await (supabase as any)
          .from("producer_followers")
          .select("follower_id, created_at")
          .eq("producer_id", user.id)
          .order("created_at", { ascending: false });

        if (followers && followers.length > 0) {
          // Fetch profile info for each follower
          const followerIds = followers.map((f: any) => f.follower_id);
          const { data: profiles } = await (supabase as any)
            .from("profiles")
            .select("id, name, email")
            .in("id", followerIds);

          const followersWithInfo = followers.map((f: any) => {
            const profile = profiles?.find((p: any) => p.id === f.follower_id);
            return {
              id: f.follower_id,
              name: profile?.name || "User",
              email: profile?.email || "",
              followedDate: new Date(f.created_at).toLocaleDateString("en-GB", { 
                month: "long", 
                year: "numeric" 
              }),
            };
          });

          setFollowersData(followersWithInfo);
        } else {
          setFollowersData([]);
        }
      } catch (error) {
        console.error("Error loading followers:", error);
        setFollowerCount(0);
        setFollowersData([]);
      } finally {
        setLoadingFollowers(false);
      }
    }
    loadFollowers();
  }, [user?.id]);

  const filtered = followersData.filter(
    (f) =>
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.email.toLowerCase().includes(search.toLowerCase())
  );

  const uniqueBuyers = new Set(orders.map((o) => o.buyerEmail || o.buyerId)).size;

  return (
    <>
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Followers</h1>
          <p className="text-sm text-muted-foreground">
            People who follow your studio profile. Reach out to engage with your audience.
          </p>
        </div>
      </div>

      {/* Stats Header */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/8 bg-surface/50 p-4">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-red-500/10 text-red-500">
            <Users className="h-4 w-4" />
          </div>
          <div className="mt-3 font-display text-2xl font-bold">
            {loadingFollowers ? "…" : (followerCount ?? 0).toLocaleString()}
          </div>
          <div className="text-xs text-muted-foreground">Total Followers</div>
        </div>
        <div className="rounded-2xl border border-white/8 bg-surface/50 p-4">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-teal/10 text-teal">
            <UserCheck className="h-4 w-4" />
          </div>
          <div className="mt-3 font-display text-2xl font-bold">{uniqueBuyers}</div>
          <div className="text-xs text-muted-foreground">Unique Buyers</div>
        </div>
        <div className="rounded-2xl border border-white/8 bg-surface/50 p-4">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-purple-500/10 text-purple-300">
            <ShoppingBag className="h-4 w-4" />
          </div>
          <div className="mt-3 font-display text-2xl font-bold">{orders.length}</div>
          <div className="text-xs text-muted-foreground">Total Sales</div>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6 relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search followers by name or email…"
          className="h-11 w-full rounded-xl border border-white/10 bg-surface/60 pl-10 pr-4 text-sm outline-none focus:border-red-500/40"
        />
      </div>

      {/* Followers Table */}
      <div className="overflow-hidden rounded-2xl border border-white/8 bg-surface/40">
        {loadingFollowers ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            Loading followers...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            {search ? "No followers match your search." : "No followers yet. When people click Follow on your profile, they'll appear here."}
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-white/5 bg-white/[0.02]">
              <tr>
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Follower
                </th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Email
                </th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">
                  Followed Since
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map((follower) => (
                <tr key={follower.id} className="transition hover:bg-white/[0.02]">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-red-500/20 to-red-600/5 text-xs font-bold text-red-500">
                        {follower.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="font-semibold">{follower.name}</div>
                    </div>
                  </td>
                  <td className="p-4 text-muted-foreground">{follower.email}</td>
                  <td className="p-4 text-right text-muted-foreground">{follower.followedDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   FUNCTIONAL CONTRACTS TAB (Requirement #2)
   ───────────────────────────────────────────────────────────────────────────── */
function Contracts({ orders, profile }: { orders: ProducerOrderRecord[]; profile: any }) {
  const [subTab, setSubTab] = useState<"templates" | "executed">("templates");
  const [selectedLicense, setSelectedLicense] = useState<License>(defaultLicenses(25000)[0]);
  const [customTerms, setCustomTerms] = useState<Record<string, string>>({
    streamingLimit: selectedLicense.streamingLimit,
    distributionLimit: selectedLicense.distributionLimit,
    commercialRights: selectedLicense.commercialRights,
  });

  const licenses = useMemo(() => defaultLicenses(25000), []);

  const handleSelectTemplate = (lic: License) => {
    setSelectedLicense(lic);
    setCustomTerms({
      streamingLimit: lic.streamingLimit,
      distributionLimit: lic.distributionLimit,
      commercialRights: lic.commercialRights,
    });
  };

  return (
    <>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Studio Contracts</h1>
          <p className="text-sm text-muted-foreground">
            Manage license contract agreements and inspect executed buyer signatures.
          </p>
        </div>
        <div className="flex items-center gap-1.5 bg-surface/60 p-1 rounded-xl border border-white/8">
          <button
            onClick={() => setSubTab("templates")}
            className={`h-9 rounded-lg px-4 text-xs font-semibold transition ${
              subTab === "templates"
                ? "bg-red-500 text-black shadow"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            License Templates
          </button>
          <button
            onClick={() => setSubTab("executed")}
            className={`h-9 rounded-lg px-4 text-xs font-semibold transition ${
              subTab === "executed"
                ? "bg-red-500 text-black shadow"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Executed Contracts ({orders.length})
          </button>
        </div>
      </div>

      {subTab === "templates" ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
          {/* License Tier Selector Cards */}
          <div className="flex flex-col gap-3">
            {licenses.map((lic) => {
              const active = selectedLicense.id === lic.id;
              return (
                <div
                  key={lic.id}
                  onClick={() => handleSelectTemplate(lic)}
                  className={`cursor-pointer rounded-2xl border p-4 transition ${
                    active
                      ? "border-red-500 bg-red-500/10 ring-1 ring-red-500/40 shadow-lg"
                      : "border-white/8 bg-surface/40 hover:bg-surface/70"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-display text-base font-bold text-foreground">
                      {lic.name} License
                    </span>
                    <span className="font-display text-sm font-bold text-red-500">
                      {fmtNaira(lic.price)}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className="rounded bg-white/5 px-2 py-0.5">{lic.streamingLimit}</span>
                    <span className="rounded bg-white/5 px-2 py-0.5">{lic.distributionLimit}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Contract Legal Inspector & Editor */}
          <div className="rounded-2xl border border-white/10 bg-surface/60 p-6 backdrop-blur-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-display text-lg font-bold">{selectedLicense.name} License Agreement</h3>
                <p className="text-xs text-muted-foreground">Preview legal boilerplate generated for buyers</p>
              </div>
              <button
                onClick={() =>
                  downloadLicenseAgreement({
                    buyerName: "Artist Name",
                    beatTitle: "Beat Title",
                    producerName: profile?.producerName ?? "Producer",
                    licenseName: selectedLicense.name,
                    price: selectedLicense.price,
                    purchaseDate: new Date().toLocaleDateString(),
                    contract: selectedLicense.contract,
                  })
                }
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-semibold hover:bg-white/10"
              >
                <Download className="h-4 w-4" /> Save Template
              </button>
            </div>

            <pre className="max-h-96 overflow-y-auto whitespace-pre-wrap rounded-xl border border-white/8 bg-black/50 p-4 text-xs font-mono leading-relaxed text-muted-foreground">
              {selectedLicense.contract}
            </pre>
          </div>
        </div>
      ) : (
        /* Executed Contracts List */
        <div className="overflow-hidden rounded-2xl border border-white/8 bg-surface/40">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-white/8 bg-surface/80 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3.5">Order ID</th>
                <th className="px-4 py-3.5">Buyer Email</th>
                <th className="px-4 py-3.5">Beat</th>
                <th className="px-4 py-3.5">License</th>
                <th className="px-4 py-3.5 text-right">Contract</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-sm text-muted-foreground">
                    No executed contracts yet.
                  </td>
                </tr>
              ) : (
                orders.map((o) => (
                  <tr key={o.id} className="transition hover:bg-white/5">
                    <td className="px-4 py-3.5 font-mono text-xs text-red-500">#{o.id.slice(0, 8)}</td>
                    <td className="px-4 py-3.5 font-medium text-foreground">{o.buyerEmail}</td>
                    <td className="px-4 py-3.5 text-foreground">{o.beatTitle}</td>
                    <td className="px-4 py-3.5 font-bold text-red-500">{o.licenseName}</td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={() =>
                          downloadLicenseAgreement({
                            buyerName: o.buyerName,
                            beatTitle: o.beatTitle,
                            producerName: profile?.producerName ?? "Producer",
                            licenseName: o.licenseName,
                            price: o.price,
                            purchaseDate: new Date(o.createdAt).toLocaleDateString(),
                            contract: o.contractSnapshot,
                          })
                        }
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 text-xs font-semibold hover:bg-white/10"
                      >
                        <FileText className="h-3.5 w-3.5" /> Download PDF
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   PRODUCER MESSAGES TAB
   ───────────────────────────────────────────────────────────────────────────── */
function ProducerMessages({ userId }: { userId?: string }) {
  const [negotiations, setNegotiations] = useState<any[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [replyText, setReplyText] = useState("");
  const [loading, setLoading] = useState(true);
  const [showCounterBox, setShowCounterBox] = useState(false);
  const [counterAmount, setCounterAmount] = useState("");

  const loadNegotiations = async () => {
    if (!userId) return;
    const { data } = await (supabase as any)
      .from("negotiations")
      .select("*")
      .eq("producer_id", userId)
      .order("created_at", { ascending: false });

    if (data && data.length > 0) {
      setNegotiations(data);
      if (!activeId) setActiveId(data[0].id);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadNegotiations();
    const timer = setInterval(loadNegotiations, 4000);
    return () => clearInterval(timer);
  }, [userId]);

  useEffect(() => {
    if (!activeId) return;
    const load = async () => {
      const { data } = await (supabase as any)
        .from("negotiation_messages")
        .select("*")
        .eq("negotiation_id", activeId)
        .order("created_at", { ascending: true });
      if (data) setMessages(data);
    };
    load();
    const timer = setInterval(load, 2500);
    return () => clearInterval(timer);
  }, [activeId]);

  const activeNeg = negotiations.find((n) => n.id === activeId);

  const handleSend = async (customBody?: string) => {
    const txt = customBody || replyText.trim();
    if (!txt || !activeId || !userId) return;
    if (!customBody) setReplyText("");

    const newMsg = {
      negotiation_id: activeId,
      sender_id: userId,
      sender_role: "producer",
      body: txt,
    };

    setMessages((prev) => [...prev, { ...newMsg, id: `temp-${Date.now()}`, created_at: new Date().toISOString() }]);

    await (supabase as any).from("negotiation_messages").insert(newMsg);
  };

  const handleStatusChange = async (status: string, offerAmount?: number) => {
    if (!activeId) return;
    const updateData: any = { status };
    if (offerAmount) updateData.offer_amount = offerAmount;

    setNegotiations((prev) =>
      prev.map((n) => (n.id === activeId ? { ...n, ...updateData } : n))
    );

    await (supabase as any).from("negotiations").update(updateData).eq("id", activeId);

    if (status === "accepted") {
      await handleSend(`🎉 Offer accepted! You can now proceed to checkout at ₦${(offerAmount || activeNeg?.offer_amount)?.toLocaleString()}.`);
    } else if (status === "rejected") {
      await handleSend("Offer rejected.");
    } else if (status === "countered") {
      await handleSend(` Counter offer proposed: ₦${offerAmount?.toLocaleString()}.`);
    }
  };

  const handleSendCounter = async () => {
    const amt = parseFloat(counterAmount);
    if (!amt || isNaN(amt)) return;
    await handleStatusChange("countered", amt);
    setShowCounterBox(false);
    setCounterAmount("");
  };

  if (loading) return <div className="p-8 text-center text-sm text-muted-foreground">Loading studio inbox…</div>;

  return (
    <>
      <div className="mb-6 flex flex-col gap-1">
        <h1 className="font-display text-3xl font-bold">Studio Messages</h1>
        <p className="text-sm text-muted-foreground">Negotiate beat offers and message buyers live.</p>
      </div>

      {negotiations.length === 0 ? (
        <Empty title="No offers yet" desc="Beat negotiations and buyer offers will appear here." />
      ) : (
        <div className="grid grid-cols-1 overflow-hidden rounded-2xl border border-white/8 bg-surface/40 md:grid-cols-[280px_1fr] h-[600px]">
          {/* Thread List - Max 5 visible with scrollbar (Requirement #7) */}
          <div className="border-r border-white/8 flex flex-col h-full bg-surface/60">
            <div className="p-3 border-b border-white/8 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Offers ({negotiations.length})
            </div>
            <div className="flex-1 overflow-y-auto max-h-[550px] divide-y divide-white/5 scrollbar-thin">
              {negotiations.map((n) => {
                const isActive = n.id === activeId;
                return (
                  <button
                    key={n.id}
                    onClick={() => setActiveId(n.id)}
                    className={`w-full p-3.5 text-left transition flex flex-col gap-1 ${
                      isActive ? "bg-red-500/10 border-l-4 border-red-500" : "hover:bg-white/5"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm truncate">{n.artist_name || "Buyer"}</span>
                      <span className="font-display text-xs font-bold text-red-500">₦{n.offer_amount?.toLocaleString()}</span>
                    </div>
                    <div className="text-xs text-muted-foreground truncate">{n.beat_title}</div>
                    <div className="mt-1 flex items-center justify-between text-[10px]">
                      <span className="capitalize text-muted-foreground/80">{n.status}</span>
                      <span className="text-muted-foreground/60">{new Date(n.created_at).toLocaleDateString()}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Chat Panel */}
          {activeNeg ? (
            <div className="flex flex-col h-full bg-background/50">
              {/* Header */}
              <div className="p-4 border-b border-white/8 flex flex-wrap items-center justify-between gap-2 bg-surface/30">
                <div>
                  <div className="font-bold text-base">{activeNeg.beat_title}</div>
                  <div className="text-xs text-muted-foreground">Offer from {activeNeg.artist_name || "Buyer"}</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right mr-2">
                    <div className="text-[10px] uppercase text-muted-foreground">Current Offer</div>
                    <div className="font-display text-lg font-bold text-red-500">₦{activeNeg.offer_amount?.toLocaleString()}</div>
                  </div>
                  {activeNeg.status === "pending" || activeNeg.status === "countered" ? (
                    <>
                      <button
                        onClick={() => handleStatusChange("accepted")}
                        className="h-9 px-3 rounded-lg bg-teal text-black text-xs font-bold transition hover:brightness-105"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => setShowCounterBox(!showCounterBox)}
                        className="h-9 px-3 rounded-lg bg-red-500/20 text-red-500 border border-red-500/40 text-xs font-bold transition hover:bg-red-500/30"
                      >
                        Counter
                      </button>
                      <button
                        onClick={() => handleStatusChange("rejected")}
                        className="h-9 px-3 rounded-lg bg-crimson/20 text-crimson border border-crimson/40 text-xs font-bold transition hover:bg-crimson/30"
                      >
                        Reject
                      </button>
                    </>
                  ) : (
                    <span className="inline-flex rounded-full bg-teal/15 px-3 py-1 text-xs font-bold text-teal capitalize">
                      {activeNeg.status}
                    </span>
                  )}
                </div>
              </div>

              {/* Counter Input Box */}
              {showCounterBox && (
                <div className="p-3 border-b border-red-500/30 bg-red-500/10 flex items-center gap-3">
                  <span className="text-xs font-bold text-red-500">Counter Price (₦):</span>
                  <input
                    type="number"
                    value={counterAmount}
                    onChange={(e) => setCounterAmount(e.target.value)}
                    placeholder="Enter amount (e.g. 35000)"
                    className="h-9 w-48 rounded-lg border border-red-500/40 bg-black/60 px-3 text-xs font-semibold outline-none text-foreground"
                  />
                  <button
                    onClick={handleSendCounter}
                    className="h-9 px-4 rounded-lg bg-red-500 text-black text-xs font-bold"
                  >
                    Submit Counter
                  </button>
                </div>
              )}

              {/* Chat Thread Messages Box (Scrollable max 5 / standard height Requirement #8) */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[420px] scrollbar-thin">
                {messages.length === 0 ? (
                  <div className="text-center py-12 text-xs text-muted-foreground">No messages yet. Send a response below.</div>
                ) : (
                  messages.map((m) => {
                    const isMe = m.sender_role === "producer";
                    return (
                      <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-xs ${isMe ? "bg-red-500 text-black font-medium" : "bg-white/10 text-foreground"}`}>
                          <div>{m.body}</div>
                          <div className={`text-[9px] mt-1 ${isMe ? "text-black/60" : "text-muted-foreground"}`}>
                            {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Input Footer */}
              <div className="p-3 border-t border-white/8 bg-surface/40 flex items-center gap-2">
                <input
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Type your reply to the buyer…"
                  className="flex-1 h-10 rounded-xl border border-white/10 bg-background px-4 text-xs outline-none focus:border-red-500/40"
                />
                <button
                  onClick={() => handleSend()}
                  className="grid h-10 w-10 place-items-center rounded-xl bg-red-500 text-black transition hover:brightness-105"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center text-sm text-muted-foreground">Select a thread</div>
          )}
        </div>
      )}
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   MY SAMPLE PACKS TAB
   ───────────────────────────────────────────────────────────────────────────── */
interface SamplePack {
  id: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  preview_url: string | null;
  zip_url: string;
  price: number;
  is_published: boolean;
  created_at: string;
}

function MySamplePacks({ userId }: { userId?: string }) {
  const [packs, setPacks] = useState<SamplePack[]>([]);
  const [loading, setLoading] = useState(true);
  const [packToDelete, setPackToDelete] = useState<{ id: string; title: string } | null>(null);
  const [deletingPack, setDeletingPack] = useState(false);

  useEffect(() => {
    if (!userId) return;
    loadPacks();
  }, [userId]);

  const loadPacks = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("sample_packs")
        .select("*")
        .eq("producer_id", userId)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setPacks(data as SamplePack[]);
      }
    } catch (err) {
      console.error("Error loading sample packs:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDeletePack = async () => {
    if (!packToDelete) return;
    setDeletingPack(true);
    try {
      await (supabase as any).from("sample_packs").delete().eq("id", packToDelete.id);
      loadPacks();
    } catch (err) {
      console.error("Error deleting pack:", err);
    } finally {
      setDeletingPack(false);
      setPackToDelete(null);
    }
  };

  const resolveCoverUrl = async (path: string | null): Promise<string> => {
    if (!path) return "/placeholder-pack.png";
    if (path.startsWith("http")) return path;

    try {
      const { data } = await supabase.storage
        .from("sample-pack-covers")
        .createSignedUrl(path, 3600);
      return data?.signedUrl || "/placeholder-pack.png";
    } catch {
      return "/placeholder-pack.png";
    }
  };

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">My Sample Packs</h1>
          <p className="text-sm text-muted-foreground">
            Manage your sound collections and track sales performance.
          </p>
        </div>
        <Link
          to="/producer/upload-sample-pack"
          className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-red-500 px-4 text-sm font-semibold text-red-500-foreground"
        >
          <UploadIcon className="h-4 w-4" /> Upload Pack
        </Link>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : packs.length === 0 ? (
        <Empty
          title="No sample packs yet"
          desc="Upload your first sample pack to start selling sound collections."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {packs.map((pack) => (
            <SamplePackCard
              key={pack.id}
              pack={pack}
              onDelete={(id, title) => setPackToDelete({ id, title })}
            />
          ))}
        </div>
      )}

      <DeleteConfirmModal
        open={!!packToDelete}
        itemName={packToDelete?.title || ""}
        itemType="sample pack"
        loading={deletingPack}
        onConfirm={handleConfirmDeletePack}
        onClose={() => setPackToDelete(null)}
      />
    </>
  );
}

function SamplePackCard({
  pack,
  onDelete,
}: {
  pack: SamplePack;
  onDelete: (id: string, title: string) => void;
}) {
  const [coverUrl, setCoverUrl] = useState<string>("/placeholder-pack.png");

  useEffect(() => {
    if (pack.cover_url) {
      if (pack.cover_url.startsWith("http")) {
        setCoverUrl(pack.cover_url);
      } else {
        supabase.storage
          .from("sample-pack-covers")
          .createSignedUrl(pack.cover_url, 3600)
          .then(({ data }) => {
            if (data?.signedUrl) setCoverUrl(data.signedUrl);
          });
      }
    }
  }, [pack.cover_url]);

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/8 bg-surface/50 transition hover:border-red-500/40">
      <div className="aspect-square overflow-hidden bg-white/5">
        <img
          src={coverUrl}
          alt={pack.title}
          className="h-full w-full object-cover transition group-hover:scale-105"
        />
      </div>
      <div className="p-4">
        <h3 className="truncate font-semibold">{pack.title}</h3>
        {pack.description && (
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {pack.description}
          </p>
        )}
        <div className="mt-3 flex items-center justify-between">
          <span className="font-display font-bold text-red-500">{fmtNaira(pack.price)}</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onDelete(pack.id, pack.title)}
              className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-white/5 hover:text-crimson"
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <span
            className={`inline-block h-2 w-2 rounded-full ${pack.is_published ? "bg-teal" : "bg-muted-foreground"}`}
          />
          {pack.is_published ? "Published" : "Draft"}
        </div>
      </div>
    </div>
  );
}

function Empty({ title, desc, cta }: { title: string; desc: string; cta?: boolean }) {
  return (
    <div className="mx-auto max-w-lg rounded-3xl border border-dashed border-white/10 bg-surface/30 p-10 text-center">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-white/5">
        <Music4 className="h-6 w-6 text-muted-foreground" />
      </div>
      <h2 className="mt-4 font-display text-xl font-bold">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
      {cta && (
        <Link
          to="/producer/upload"
          className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-red-500 px-5 text-sm font-semibold text-red-500-foreground"
        >
          <UploadIcon className="h-4 w-4" /> Upload beat
        </Link>
      )}
    </div>
  );
}


/* ─────────────────────────────────────────────────────────────────────────────
   PURCHASED BEATS TAB (Producers can also buy beats!)
   ───────────────────────────────────────────────────────────────────────────── */
function PurchasedBeats({ userId }: { userId?: string }) {
  const [purchases, setPurchases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function loadPurchases() {
      if (!userId) return;
      setLoading(true);
      try {
        // Fetch orders where this producer is the buyer
        const { data: orders, error } = await supabase
          .from("orders")
          .select("*")
          .eq("buyer_id", userId)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error fetching purchases:", error);
          setPurchases([]);
          setLoading(false);
          return;
        }

        if (!orders || orders.length === 0) {
          setPurchases([]);
          setLoading(false);
          return;
        }

        // Get beat IDs and producer IDs
        const beatIds = orders.map((o: any) => o.beat_id).filter(Boolean);
        const producerIds = orders.map((o: any) => o.producer_id).filter(Boolean);

        // Fetch beat details
        const { data: beats } = await supabase
          .from("beats")
          .select("id, title, cover_url, audio_url, genre, bpm, producer_id")
          .in("id", beatIds);

        // Create signed URLs for covers and audio
        const beatsWithUrls = await Promise.all((beats || []).map(async (beat: any) => {
          let coverUrl = "";
          let audioUrl = "";

          if (beat.cover_url) {
            const { data: coverData } = await supabase.storage
              .from('beat-covers')
              .createSignedUrl(beat.cover_url, 60 * 60 * 24 * 365); // 1 year
            coverUrl = coverData?.signedUrl || "";
          }

          if (beat.audio_url) {
            const { data: audioData } = await supabase.storage
              .from('beat-audio')
              .createSignedUrl(beat.audio_url, 60 * 60 * 24 * 365); // 1 year
            audioUrl = audioData?.signedUrl || "";
          }

          return {
            ...beat,
            cover_url: coverUrl,
            audio_url: audioUrl,
          };
        }));

        // Fetch producer profiles
        const { data: profiles } = await supabase
          .from("producer_profiles")
          .select("user_id, producer_name, username")
          .in("user_id", producerIds);

        // Map data together
        const formatted = orders.map((o: any) => {
          const beat = beatsWithUrls?.find((b: any) => b.id === o.beat_id);
          const producer = profiles?.find((p: any) => p.user_id === o.producer_id);

          return {
            id: o.id,
            beatId: o.beat_id,
            beatTitle: beat?.title || "Unknown Beat",
            beatCover: beat?.cover_url,
            beatAudio: beat?.audio_url,
            genre: beat?.genre || "Unknown",
            bpm: beat?.bpm || 0,
            producerName: producer?.producer_name || "Unknown Producer",
            producerUsername: producer?.username,
            licenseType: o.license_type,
            licenseName: o.license_name,
            price: o.price,
            status: o.status,
            purchasedAt: o.created_at,
          };
        });

        setPurchases(formatted);
      } catch (error) {
        console.error("Error loading purchases:", error);
        setPurchases([]);
      } finally {
        setLoading(false);
      }
    }

    loadPurchases();
  }, [userId]);

  const filtered = useMemo(() => {
    if (!search) return purchases;
    return purchases.filter((p) =>
      p.beatTitle.toLowerCase().includes(search.toLowerCase()) ||
      p.producerName.toLowerCase().includes(search.toLowerCase()) ||
      p.licenseName.toLowerCase().includes(search.toLowerCase())
    );
  }, [purchases, search]);

  const totalSpent = purchases.reduce((sum, p) => sum + Number(p.price || 0), 0);

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Purchased Beats</h1>
          <p className="text-sm text-muted-foreground">
            Beats you've purchased from other producers for sampling, inspiration, or projects.
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-white/8 bg-surface/50 p-4">
          <div className="text-xs text-muted-foreground">Total Purchases</div>
          <div className="mt-1 font-display text-2xl font-bold text-foreground">{purchases.length}</div>
        </div>
        <div className="rounded-xl border border-white/8 bg-surface/50 p-4">
          <div className="text-xs text-muted-foreground">Total Spent</div>
          <div className="mt-1 font-display text-2xl font-bold text-red-500">{fmtNaira(totalSpent)}</div>
        </div>
        <div className="rounded-xl border border-white/8 bg-surface/50 p-4">
          <div className="text-xs text-muted-foreground">Unique Producers</div>
          <div className="mt-1 font-display text-2xl font-bold text-teal">
            {new Set(purchases.map((p) => p.producerName)).size}
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by beat title, producer, or license…"
            className="h-11 w-full rounded-xl border border-white/10 bg-surface/60 pl-10 pr-4 text-sm outline-none transition focus:border-red-500/40 focus:ring-1 focus:ring-red-500/20"
          />
        </div>
      </div>

      {/* Purchases List */}
      {loading ? (
        <div className="p-8 text-center text-sm text-muted-foreground">Loading your purchases…</div>
      ) : filtered.length === 0 ? (
        <Empty
          title={search ? "No matching purchases" : "No purchases yet"}
          desc={search ? "Try searching for a different beat or producer." : "When you purchase beats from other producers, they'll appear here with download links and license details."}
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/8">
          <table className="w-full text-sm">
            <thead className="bg-surface/60 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Beat</th>
                <th className="px-4 py-3 hidden md:table-cell">Producer</th>
                <th className="px-4 py-3 hidden sm:table-cell">License</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3 hidden lg:table-cell">Purchased</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map((p) => (
                <tr key={p.id} className="bg-surface/30 hover:bg-surface/60 transition">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {p.beatCover ? (
                        <img
                          src={p.beatCover}
                          alt={p.beatTitle}
                          className="h-10 w-10 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="grid h-10 w-10 place-items-center rounded-lg bg-white/5">
                          <Music4 className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="truncate font-semibold">{p.beatTitle}</div>
                        <div className="truncate text-xs text-muted-foreground">
                          {p.genre} • {p.bpm} BPM
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                    {p.producerUsername ? (
                      <Link
                        to="/producer/$username"
                        params={{ username: p.producerUsername }}
                        className="hover:text-red-500 hover:underline"
                      >
                        @{p.producerUsername}
                      </Link>
                    ) : (
                      p.producerName
                    )}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className="inline-flex rounded-full bg-teal/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-teal">
                      {p.licenseName}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-display font-bold text-red-500">
                    {fmtNaira(p.price)}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground hidden lg:table-cell">
                    {new Date(p.purchasedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {p.beatAudio && (
                        <a
                          href={p.beatAudio}
                          download
                          className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-white/5 hover:text-teal"
                          title="Download"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                      )}
                      <Link
                        to="/dashboard/library"
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 text-xs font-semibold text-foreground transition hover:bg-white/10 hover:border-red-500/40"
                      >
                        <ExternalLink className="h-3.5 w-3.5" /> View in Library
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function DeleteConfirmModal({
  open,
  itemName,
  itemType,
  loading,
  onConfirm,
  onClose,
}: {
  open: boolean;
  itemName: string;
  itemType: "beat" | "sample pack";
  loading: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={(val) => !val && onClose()}>
      <AlertDialogContent className="border border-white/10 bg-[#121318] p-6 text-foreground shadow-2xl backdrop-blur-2xl sm:max-w-md sm:rounded-2xl">
        <AlertDialogHeader className="flex flex-col items-center text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-red-500/30 bg-red-500/10 text-red-500 shadow-lg shadow-red-500/10">
            <Trash2 className="h-7 w-7" />
          </div>
          <AlertDialogTitle className="font-display text-2xl font-bold">
            Delete {itemType === "beat" ? "Beat" : "Sample Pack"}?
          </AlertDialogTitle>
          <AlertDialogDescription className="mt-2 text-sm text-muted-foreground">
            Are you sure you want to delete <span className="font-semibold text-foreground">"{itemName}"</span>? This action cannot be undone and will permanently remove it from your catalog.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <AlertDialogCancel
            disabled={loading}
            onClick={onClose}
            className="h-11 rounded-xl border border-white/10 bg-white/5 px-5 text-sm font-semibold text-foreground hover:bg-white/10 hover:text-white transition disabled:opacity-40"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={loading}
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            className="h-11 rounded-xl bg-gradient-to-b from-[#EF4444] to-[#DC2626] px-6 text-sm font-semibold text-black transition hover:brightness-105 disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Yes, Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   WHATSAPP-STYLE CHAT INTERFACE FOR PRODUCERS
   ───────────────────────────────────────────────────────────────────────────── */
function ChatInterfaceProducer({ 
  messages, 
  currentUserId
}: { 
  messages: any[]; 
  currentUserId?: string;
}) {
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const chatBoxRef = useRef<HTMLDivElement>(null);

  // Group messages by conversation (other person)
  const conversations = useMemo(() => {
    const convMap = new Map<string, any[]>();
    
    messages.forEach((msg) => {
      const otherPersonId = msg.sender_id === currentUserId ? msg.receiver_id : msg.sender_id;
      if (!convMap.has(otherPersonId)) {
        convMap.set(otherPersonId, []);
      }
      convMap.get(otherPersonId)!.push(msg);
    });

    // Sort messages within each conversation
    convMap.forEach((msgs) => {
      msgs.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    });

    return Array.from(convMap.entries()).map(([otherPersonId, msgs]) => {
      const lastMsg = msgs[msgs.length - 1];
      const otherPerson = lastMsg.sender_id === currentUserId ? lastMsg.receiver : lastMsg.sender;
      const unreadCount = msgs.filter(m => m.receiver_id === currentUserId && !m.read).length;
      
      return {
        otherPersonId,
        otherPerson,
        messages: msgs,
        lastMessage: lastMsg,
        unreadCount,
      };
    }).sort((a, b) => 
      new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime()
    );
  }, [messages, currentUserId]);

  // Auto-scroll to bottom when conversation changes or new message
  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [activeConversation, conversations]);

  // Auto-select first conversation
  useEffect(() => {
    if (!activeConversation && conversations.length > 0) {
      setActiveConversation(conversations[0].otherPersonId);
    }
  }, [conversations, activeConversation]);

  const activeConv = conversations.find(c => c.otherPersonId === activeConversation);

  const handleSendMessage = async () => {
    if (!replyText.trim() || !activeConversation || !currentUserId) return;

    setSending(true);
    try {
      const { error } = await (supabase as any)
        .from("direct_messages")
        .insert({
          sender_id: currentUserId,
          receiver_id: activeConversation,
          message: replyText.trim(),
        });

      if (error) throw error;

      setReplyText("");
      // Messages will refresh automatically
    } catch (error: any) {
      console.error("Send message error:", error);
      alert("Could not send message. Please try again.");
    } finally {
      setSending(false);
    }
  };

  if (conversations.length === 0) {
    return (
      <div className="py-12 text-center">
        <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground/40" />
        <p className="mt-4 text-sm text-muted-foreground">No conversations yet</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4 h-[600px]">
      {/* Conversations List */}
      <div className="rounded-xl border border-white/10 bg-surface/60 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-white/10">
          <h3 className="font-semibold">Conversations</h3>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.map((conv) => (
            <button
              key={conv.otherPersonId}
              onClick={() => setActiveConversation(conv.otherPersonId)}
              className={`w-full p-4 text-left border-b border-white/5 hover:bg-white/5 transition ${
                activeConversation === conv.otherPersonId ? "bg-white/10" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">
                    {conv.otherPerson?.name || "Unknown User"}
                  </div>
                  <div className="text-xs text-muted-foreground truncate mt-1">
                    {conv.lastMessage.message}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                    {new Date(conv.lastMessage.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </span>
                  {conv.unreadCount > 0 && (
                    <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {conv.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Box */}
      {activeConv && (
        <div className="rounded-xl border border-white/10 bg-surface/60 overflow-hidden flex flex-col">
          {/* Chat Header */}
          <div className="p-4 border-b border-white/10 bg-surface/80">
            <div className="font-semibold">{activeConv.otherPerson?.name || "Unknown User"}</div>
            <div className="text-xs text-muted-foreground">Artist</div>
          </div>

          {/* Messages */}
          <div 
            ref={chatBoxRef}
            className="flex-1 overflow-y-auto p-4 space-y-3"
            style={{ maxHeight: "400px" }}
          >
            {activeConv.messages.map((msg) => {
              const isMine = msg.sender_id === currentUserId;
              
              return (
                <div
                  key={msg.id}
                  className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                      isMine
                        ? "bg-blue-600 text-white rounded-br-sm"
                        : "bg-white/10 text-foreground rounded-bl-sm"
                    }`}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                      {msg.message}
                    </p>
                    <span className={`text-[10px] mt-1 block ${isMine ? "text-blue-100" : "text-muted-foreground"}`}>
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Message Input */}
          <div className="p-4 border-t border-white/10">
            <div className="flex gap-2">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Type a message..."
                className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm outline-none focus:border-blue-500"
                disabled={sending}
              />
              <button
                onClick={handleSendMessage}
                disabled={sending || !replyText.trim()}
                className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50 transition"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
