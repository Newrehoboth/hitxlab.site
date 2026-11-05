import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  ShieldAlert,
  Loader2,
  Lock,
  Mail,
  User,
  Users,
  Music4,
  DollarSign,
  TrendingUp,
  Package,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  RefreshCw,
  LogOut,
  ShieldCheck,
  ExternalLink,
  ChevronRight,
  Sparkles,
  BarChart3,
  Layers,
  ArrowUpRight,
  Eye,
  SlidersHorizontal,
  UserX,
  UserCheck,
  Trash2,
  AlertTriangle,
  GraduationCap,
  Phone,
  MapPin,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { useAuth } from "@/lib/store";
import { fmtNaira } from "@/lib/currency";
import { supabase } from "@/integrations/supabase/client";
import {
  adminFullOverviewFn,
  adminSettleWithdrawalFn,
  adminToggleSuspendUserFn,
  adminDeleteUserFn,
} from "@/lib/payouts.functions";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "HITXLAB Admin · Platform Dashboard" },
      { name: "description", content: "HITXLAB master administration panel. Monitor users, beats, revenue, and payouts." },
    ],
  }),
  component: AdminDashboard,
});

type TabType = "overview" | "academy" | "beats" | "users" | "sales" | "payouts" | "packs";

function AdminDashboard() {
  const { user, session, signIn, signUp, signOut, loading: authLoading } = useAuth();
  const loadFullAdmin = useServerFn(adminFullOverviewFn);
  const settleWithdrawal = useServerFn(adminSettleWithdrawalFn);
  const toggleSuspendUser = useServerFn(adminToggleSuspendUserFn);
  const deleteUser = useServerFn(adminDeleteUserFn);

  // Login Form State
  const [adminEmail, setAdminEmail] = useState("hixlabadmin@gmail.com");
  const [adminPw, setAdminPw] = useState("HitxlabAdmin123!!");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginErr, setLoginErr] = useState<string | null>(null);

  // Dashboard Data State
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [busyWithdrawal, setBusyWithdrawal] = useState<string | null>(null);
  const [busyUserAction, setBusyUserAction] = useState<string | null>(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState<"all" | "producer" | "artist">("all");

  const isAdmin = useMemo(() => {
    if (!user) return false;
    return user.email.toLowerCase() === "hixlabadmin@gmail.com" || user.role === "admin";
  }, [user]);

  const refreshData = async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const res = await loadFullAdmin(undefined as never);
      setData(res);
      setErr(null);
    } catch (e: any) {
      console.error("Admin data fetch error:", e);
      setErr(e?.message ?? "Failed to load admin data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      void refreshData();
    } else {
      setLoading(false);
    }
  }, [isAdmin]);

  // Handle Admin Direct Sign In / Auto Provisioning
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginErr(null);

    try {
      // 1. Try normal sign in first
      await signIn(adminEmail.trim(), adminPw);
    } catch (signInErr: any) {
      console.warn("Direct sign-in failed, attempting admin account provisioning:", signInErr);
      try {
        // 2. If account does not exist, provision admin account automatically
        const signUpRes = await signUp("HITXLAB Admin", adminEmail.trim(), adminPw, "producer");
        if ("id" in signUpRes) {
          // Update profile role to admin in DB if trigger allowed
          await supabase
            .from("profiles")
            .update({ account_type: "producer" })
            .eq("id", signUpRes.id);
        }
      } catch (signUpErr: any) {
        setLoginErr(signUpErr?.message || signInErr?.message || "Invalid admin credentials");
      }
    } finally {
      setLoginLoading(false);
    }
  };

  const handleSettle = async (withdrawalId: string, status: "processing" | "paid" | "failed" | "reversed") => {
    setBusyWithdrawal(withdrawalId);
    try {
      await settleWithdrawal({ data: { withdrawalId, status, note: `Updated by Admin (${user?.email})` } });
      await refreshData();
    } catch (e: any) {
      alert("Error updating withdrawal: " + (e?.message || "Failed"));
    } finally {
      setBusyWithdrawal(null);
    }
  };

  const handleToggleSuspend = async (targetUserId: string, currentSuspended: boolean, targetEmail: string) => {
    if (targetEmail.toLowerCase() === "hixlabadmin@gmail.com") {
      alert("Cannot suspend the primary admin account!");
      return;
    }
    const actionName = currentSuspended ? "unsuspend" : "suspend";
    if (!confirm(`Are you sure you want to ${actionName} user ${targetEmail}?`)) return;

    setBusyUserAction(targetUserId);
    try {
      await toggleSuspendUser({ data: { targetUserId, suspend: !currentSuspended } });
      await refreshData();
    } catch (e: any) {
      alert(`Failed to ${actionName} user: ` + (e?.message || "Error"));
    } finally {
      setBusyUserAction(null);
    }
  };

  const handleDeleteUser = async (targetUserId: string, targetEmail: string) => {
    if (targetEmail.toLowerCase() === "hixlabadmin@gmail.com") {
      alert("Cannot delete the primary admin account!");
      return;
    }
    if (!confirm(`DANGER: Are you sure you want to permanently delete user ${targetEmail}? This action cannot be undone.`)) return;

    setBusyUserAction(targetUserId);
    try {
      await deleteUser({ data: { targetUserId } });
      await refreshData();
    } catch (e: any) {
      alert("Failed to delete user: " + (e?.message || "Error"));
    } finally {
      setBusyUserAction(null);
    }
  };

  if (authLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-red-500" />
          <p className="text-sm font-semibold text-muted-foreground">Verifying admin session...</p>
        </div>
      </div>
    );
  }

  // Render Login Screen if not logged in as Admin
  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="mx-auto flex max-w-md flex-col justify-center px-4 py-20">
          <div className="rounded-3xl border border-white/10 bg-surface/90 p-8 shadow-2xl backdrop-blur-xl">
            <div className="text-center">
              <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-red-500/10 text-red-500">
                <ShieldCheck className="h-7 w-7" />
              </div>
              <h1 className="font-display text-3xl font-bold text-white">Admin Access</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Enter your master credentials to view platform control dashboard.
              </p>
            </div>

            {loginErr && (
              <div className="mt-6 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-400">
                <ShieldAlert className="h-4 w-4 shrink-0" />
                <span>{loginErr}</span>
              </div>
            )}

            <form onSubmit={handleAdminLogin} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Admin Email
                </label>
                <div className="relative mt-1.5">
                  <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="email"
                    required
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="hixlabadmin@gmail.com"
                    className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-10 pr-4 text-sm text-white placeholder-muted-foreground focus:border-red-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Password
                </label>
                <div className="relative mt-1.5">
                  <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="password"
                    required
                    value={adminPw}
                    onChange={(e) => setAdminPw(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-10 pr-4 text-sm text-white placeholder-muted-foreground focus:border-red-500 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="mt-2 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#EF4444] to-[#DC2626] py-3.5 text-sm font-bold text-black shadow-xl transition hover:brightness-110 disabled:opacity-50"
              >
                {loginLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                Sign In to Admin Panel
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Admin Dashboard Main Content
  const totals = data?.totals ?? {
    grossVolume: 0,
    commissionEarned: 0,
    producerPayouts: 0,
    totalSales: 0,
    totalUsers: 0,
    totalBeats: 0,
    totalSamplePacks: 0,
    pendingWithdrawals: 0,
    pendingWithdrawalAmount: 0,
  };

  const beatsList = (data?.beats ?? []).filter((b: any) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return b.title?.toLowerCase().includes(q) || b.producer?.toLowerCase().includes(q) || b.genre?.toLowerCase().includes(q);
  });

  const usersList = (data?.users ?? []).filter((u: any) => {
    if (userRoleFilter !== "all" && u.account_type !== userRoleFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
  });

  const purchasesList = (data?.purchases ?? []).filter((p: any) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return p.beat_title?.toLowerCase().includes(q) || p.id?.toLowerCase().includes(q);
  });

  const academyAppsList = (data?.academyApplications ?? []).filter((app: any) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      app.full_name?.toLowerCase().includes(q) ||
      app.email?.toLowerCase().includes(q) ||
      app.whatsapp_number?.toLowerCase().includes(q) ||
      app.address?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Admin Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-red-500/20 bg-surface/60 p-6 backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-red-500/10 text-red-500">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-2xl font-bold text-white">HITXLAB Master Control</h1>
                <span className="rounded-full bg-red-500/20 px-2.5 py-0.5 text-xs font-bold text-red-400">
                  ADMIN
                </span>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Logged in as <span className="font-semibold text-white">{user.email}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => void refreshData()}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-white/10 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh Data
            </button>
            <button
              onClick={() => void signOut()}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-red-500/10 px-4 py-2.5 text-xs font-semibold text-red-400 transition hover:bg-red-500/20"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign Out
            </button>
          </div>
        </div>

        {/* Platform Overview Metrics Cards */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-surface/50 p-5">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-bold uppercase tracking-wider">Gross Sales Volume</span>
              <DollarSign className="h-4 w-4 text-emerald-400" />
            </div>
            <p className="mt-3 font-display text-2xl font-bold text-white">{fmtNaira(totals.grossVolume)}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">{totals.totalSales} total completed purchases</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-surface/50 p-5">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-bold uppercase tracking-wider">Platform Commission</span>
              <TrendingUp className="h-4 w-4 text-red-500" />
            </div>
            <p className="mt-3 font-display text-2xl font-bold text-red-500">{fmtNaira(totals.commissionEarned)}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">HITXLAB 10% platform revenue</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-surface/50 p-5">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-bold uppercase tracking-wider">Registered Users</span>
              <Users className="h-4 w-4 text-teal" />
            </div>
            <p className="mt-3 font-display text-2xl font-bold text-white">{totals.totalUsers}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">Producers and Artists</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-surface/50 p-5">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-bold uppercase tracking-wider">Beats & Packs</span>
              <Music4 className="h-4 w-4 text-amber-400" />
            </div>
            <p className="mt-3 font-display text-2xl font-bold text-white">{totals.totalBeats + totals.totalSamplePacks}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">{totals.totalBeats} Beats · {totals.totalSamplePacks} Sample Packs</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mt-8 flex flex-wrap items-center gap-2 border-b border-white/10 pb-4">
          {[
            { id: "overview", label: "Overview", icon: BarChart3 },
            { id: "academy", label: `Academy Apps (${totals.totalAcademyApps ?? 0})`, icon: GraduationCap },
            { id: "beats", label: `Beats (${totals.totalBeats})`, icon: Music4 },
            { id: "users", label: `Users (${totals.totalUsers})`, icon: Users },
            { id: "sales", label: `Sales (${totals.totalSales})`, icon: DollarSign },
            { id: "payouts", label: `Payouts (${totals.pendingWithdrawals})`, icon: TrendingUp },
            { id: "packs", label: `Sample Packs (${totals.totalSamplePacks})`, icon: Package },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as TabType)}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
                activeTab === t.id
                  ? "bg-red-500 text-black shadow-lg"
                  : "bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-white"
              }`}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex min-h-[300px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-red-500" />
          </div>
        ) : err ? (
          <div className="mt-8 rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-center">
            <ShieldAlert className="mx-auto h-8 w-8 text-red-500" />
            <h3 className="mt-2 text-lg font-bold text-white">Access Warning</h3>
            <p className="mt-1 text-sm text-muted-foreground">{err}</p>
            <button
              onClick={() => void refreshData()}
              className="mt-4 rounded-xl bg-red-500 px-4 py-2 text-xs font-bold text-black"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="mt-6">
            {/* Search Input for Data Tables */}
            {activeTab !== "overview" && (
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by title, name, email, genre..."
                    className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-xs text-white placeholder-muted-foreground focus:border-red-500 focus:outline-none"
                  />
                </div>

                {activeTab === "users" && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setUserRoleFilter("all")}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${userRoleFilter === "all" ? "bg-white/20 text-white" : "bg-white/5 text-muted-foreground"}`}
                    >
                      All Users
                    </button>
                    <button
                      onClick={() => setUserRoleFilter("producer")}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${userRoleFilter === "producer" ? "bg-red-500/20 text-red-400" : "bg-white/5 text-muted-foreground"}`}
                    >
                      Producers Only
                    </button>
                    <button
                      onClick={() => setUserRoleFilter("artist")}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${userRoleFilter === "artist" ? "bg-teal/20 text-teal" : "bg-white/5 text-muted-foreground"}`}
                    >
                      Artists Only
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TAB 1: OVERVIEW */}
            {activeTab === "overview" && (
              <div className="space-y-8">
                {/* Top Statistics Overview */}
                <div className="grid gap-6 lg:grid-cols-2">
                  {/* Top Selling Beats */}
                  <div className="rounded-3xl border border-white/10 bg-surface/50 p-6">
                    <h3 className="font-display text-lg font-bold text-white">Top Beats</h3>
                    <div className="mt-4 space-y-3">
                      {(data?.topBeats ?? []).length === 0 ? (
                        <p className="text-xs text-muted-foreground">No purchases recorded yet.</p>
                      ) : (
                        (data?.topBeats ?? []).map((b: any, idx: number) => (
                          <div key={b.id || idx} className="flex items-center justify-between rounded-xl bg-white/5 p-3 text-xs">
                            <div>
                              <p className="font-bold text-white">{b.title}</p>
                              <p className="text-muted-foreground">{b.sales} sales</p>
                            </div>
                            <p className="font-bold text-emerald-400">{fmtNaira(b.gross)}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Top Earning Producers */}
                  <div className="rounded-3xl border border-white/10 bg-surface/50 p-6">
                    <h3 className="font-display text-lg font-bold text-white">Top Producers</h3>
                    <div className="mt-4 space-y-3">
                      {(data?.topProducers ?? []).length === 0 ? (
                        <p className="text-xs text-muted-foreground">No earnings recorded yet.</p>
                      ) : (
                        (data?.topProducers ?? []).map((p: any, idx: number) => (
                          <div key={p.id || idx} className="flex items-center justify-between rounded-xl bg-white/5 p-3 text-xs">
                            <div>
                              <p className="font-bold text-white">{p.name}</p>
                              <p className="text-muted-foreground">{p.sales} sales</p>
                            </div>
                            <p className="font-bold text-teal">{fmtNaira(p.earnings)}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Recent Purchases Feed */}
                <div className="rounded-3xl border border-white/10 bg-surface/50 p-6">
                  <h3 className="font-display text-lg font-bold text-white">Recent Transactions</h3>
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-white/10 text-muted-foreground">
                        <tr>
                          <th className="pb-3 font-semibold">Beat Title</th>
                          <th className="pb-3 font-semibold">Gross Amount</th>
                          <th className="pb-3 font-semibold">HITXLAB Cut</th>
                          <th className="pb-3 font-semibold">Producer Earned</th>
                          <th className="pb-3 font-semibold">Status</th>
                          <th className="pb-3 font-semibold">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {(data?.recentTransactions ?? []).map((t: any) => (
                          <tr key={t.id}>
                            <td className="py-3 font-medium text-white">{t.beat_title || "Beat Purchase"}</td>
                            <td className="py-3 font-bold text-white">{fmtNaira(Number(t.gross_amount))}</td>
                            <td className="py-3 text-red-400">{fmtNaira(Number(t.platform_commission))}</td>
                            <td className="py-3 text-teal">{fmtNaira(Number(t.producer_earnings))}</td>
                            <td className="py-3">
                              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                                {t.payment_status}
                              </span>
                            </td>
                            <td className="py-3 text-muted-foreground">{new Date(t.created_at).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: ACADEMY APPLICATIONS */}
            {activeTab === "academy" && (
              <div className="rounded-3xl border border-white/10 bg-surface/50 p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="font-display text-lg font-bold text-white">Academy Applications</h2>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {academyAppsList.length} application{academyAppsList.length !== 1 ? "s" : ""} · Founding Cohort · ₦850,000 Program
                    </p>
                  </div>
                  <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400">
                    {academyAppsList.filter((a: any) => a.payment_status === "Paid").length} Paid
                  </span>
                </div>

                {academyAppsList.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <GraduationCap className="h-12 w-12 text-muted-foreground/40" />
                    <p className="mt-4 text-sm font-semibold text-white">No Applications Yet</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Academy applications will appear here once students submit the form.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-white/10 text-muted-foreground">
                        <tr>
                          <th className="pb-3 pr-4 font-semibold">Student Name</th>
                          <th className="pb-3 pr-4 font-semibold">Email</th>
                          <th className="pb-3 pr-4 font-semibold">WhatsApp</th>
                          <th className="pb-3 pr-4 font-semibold">Address</th>
                          <th className="pb-3 pr-4 font-semibold">Fee</th>
                          <th className="pb-3 pr-4 font-semibold">Payment</th>
                          <th className="pb-3 font-semibold">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {academyAppsList.map((app: any) => {
                          const cleanPhone = (app.whatsapp_number ?? "").replace(/\D/g, "");
                          const waLink = `https://wa.me/${cleanPhone}`;
                          const isPaid = app.payment_status === "Paid";

                          return (
                            <tr key={app.id} className="group">
                              <td className="py-3 pr-4 font-bold text-white">{app.full_name || "—"}</td>
                              <td className="py-3 pr-4 text-muted-foreground">
                                <a href={`mailto:${app.email}`} className="hover:text-white hover:underline">
                                  {app.email}
                                </a>
                              </td>
                              <td className="py-3 pr-4">
                                {cleanPhone ? (
                                  <a
                                    href={waLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-400 transition hover:bg-emerald-500/20"
                                  >
                                    <Phone className="h-3 w-3" />
                                    Chat on WhatsApp
                                  </a>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </td>
                              <td className="py-3 pr-4 max-w-[180px]">
                                <div className="flex items-start gap-1.5 text-muted-foreground">
                                  <MapPin className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground/60" />
                                  <span className="line-clamp-2">{app.address || "—"}</span>
                                </div>
                              </td>
                              <td className="py-3 pr-4 font-bold text-emerald-400">
                                {app.amount ? `₦${Number(app.amount).toLocaleString()}` : "₦850,000"}
                              </td>
                              <td className="py-3 pr-4">
                                <span
                                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                                    isPaid
                                      ? "bg-emerald-500/20 text-emerald-400"
                                      : "bg-amber-500/20 text-amber-400"
                                  }`}
                                >
                                  {app.payment_status || "Pending"}
                                </span>
                              </td>
                              <td className="py-3 text-muted-foreground">
                                {app.created_at
                                  ? new Date(app.created_at).toLocaleDateString("en-NG", {
                                      day: "numeric",
                                      month: "short",
                                      year: "numeric",
                                    })
                                  : "—"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: BEATS */}
            {activeTab === "beats" && (
              <div className="rounded-3xl border border-white/10 bg-surface/50 p-6">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-white/10 text-muted-foreground">
                      <tr>
                        <th className="pb-3 font-semibold">Cover</th>
                        <th className="pb-3 font-semibold">Title</th>
                        <th className="pb-3 font-semibold">Producer</th>
                        <th className="pb-3 font-semibold">Genre</th>
                        <th className="pb-3 font-semibold">BPM / Key</th>
                        <th className="pb-3 font-semibold">Price</th>
                        <th className="pb-3 font-semibold">Plays</th>
                        <th className="pb-3 font-semibold">Link</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {beatsList.map((b: any) => (
                        <tr key={b.id}>
                          <td className="py-3">
                            <CoverImage src={b.cover} alt={b.title} />
                          </td>
                          <td className="py-3 font-bold text-white">{b.title}</td>
                          <td className="py-3 text-muted-foreground">{b.producer}</td>
                          <td className="py-3 text-white/80">{b.genre}</td>
                          <td className="py-3 text-muted-foreground">{b.bpm} BPM · {b.key}</td>
                          <td className="py-3 font-bold text-emerald-400">{fmtNaira(b.price)}</td>
                          <td className="py-3 text-muted-foreground">{b.plays ?? 0}</td>
                          <td className="py-3">
                            <Link to={`/beat/${b.id}`} className="text-red-500 hover:underline flex items-center gap-1">
                              View <ExternalLink className="h-3 w-3" />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 3: USERS */}
            {activeTab === "users" && (
              <div className="rounded-3xl border border-white/10 bg-surface/50 p-6">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-white/10 text-muted-foreground">
                      <tr>
                        <th className="pb-3 font-semibold">User</th>
                        <th className="pb-3 font-semibold">Email</th>
                        <th className="pb-3 font-semibold">Role</th>
                        <th className="pb-3 font-semibold">Joined Date</th>
                        <th className="pb-3 font-semibold">Status</th>
                        <th className="pb-3 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {usersList.map((u: any) => {
                        const isPrimaryAdmin = u.email?.toLowerCase() === "hixlabadmin@gmail.com";
                        const isBusy = busyUserAction === u.id;

                        return (
                          <tr key={u.id}>
                            <td className="py-3 font-bold text-white">{u.name || "User"}</td>
                            <td className="py-3 text-muted-foreground">{u.email}</td>
                            <td className="py-3">
                              <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                                isPrimaryAdmin
                                  ? "bg-amber-500/20 text-amber-400"
                                  : u.account_type === "producer"
                                  ? "bg-red-500/20 text-red-400"
                                  : "bg-teal/20 text-teal"
                              }`}>
                                {isPrimaryAdmin ? "admin" : (u.account_type || "artist")}
                              </span>
                            </td>
                            <td className="py-3 text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</td>
                            <td className="py-3">
                              {u.is_suspended ? (
                                <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-bold text-red-400">
                                  Suspended
                                </span>
                              ) : (
                                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                                  Active
                                </span>
                              )}
                            </td>
                            <td className="py-3 text-right">
                              {isPrimaryAdmin ? (
                                <span className="text-[10px] italic text-muted-foreground">Primary Admin</span>
                              ) : isBusy ? (
                                <Loader2 className="ml-auto h-4 w-4 animate-spin text-red-500" />
                              ) : (
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => handleToggleSuspend(u.id, Boolean(u.is_suspended), u.email)}
                                    className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-bold transition ${
                                      u.is_suspended
                                        ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                                        : "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
                                    }`}
                                  >
                                    {u.is_suspended ? (
                                      <>
                                        <UserCheck className="h-3 w-3" /> Unsuspend
                                      </>
                                    ) : (
                                      <>
                                        <UserX className="h-3 w-3" /> Suspend
                                      </>
                                    )}
                                  </button>

                                  <button
                                    onClick={() => handleDeleteUser(u.id, u.email)}
                                    className="inline-flex items-center gap-1 rounded-lg bg-red-500/20 px-2.5 py-1 text-[10px] font-bold text-red-400 hover:bg-red-500/30 transition"
                                  >
                                    <Trash2 className="h-3 w-3" /> Delete
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 4: SALES */}
            {activeTab === "sales" && (
              <div className="rounded-3xl border border-white/10 bg-surface/50 p-6">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-white/10 text-muted-foreground">
                      <tr>
                        <th className="pb-3 font-semibold">Order ID</th>
                        <th className="pb-3 font-semibold">Beat</th>
                        <th className="pb-3 font-semibold">Gross</th>
                        <th className="pb-3 font-semibold">HITXLAB 10%</th>
                        <th className="pb-3 font-semibold">Producer Net</th>
                        <th className="pb-3 font-semibold">Status</th>
                        <th className="pb-3 font-semibold">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {purchasesList.map((p: any) => (
                        <tr key={p.id}>
                          <td className="py-3 font-mono text-[10px] text-muted-foreground">{p.id.slice(0, 8)}...</td>
                          <td className="py-3 font-bold text-white">{p.beat_title || "Beat"}</td>
                          <td className="py-3 font-bold text-white">{fmtNaira(Number(p.gross_amount))}</td>
                          <td className="py-3 text-red-400">{fmtNaira(Number(p.platform_commission))}</td>
                          <td className="py-3 text-teal">{fmtNaira(Number(p.producer_earnings))}</td>
                          <td className="py-3">
                            <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                              {p.payment_status}
                            </span>
                          </td>
                          <td className="py-3 text-muted-foreground">{new Date(p.created_at).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 5: PAYOUTS */}
            {activeTab === "payouts" && (
              <div className="rounded-3xl border border-white/10 bg-surface/50 p-6">
                <h3 className="mb-4 font-display text-lg font-bold text-white">Withdrawal Approval Queue</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-white/10 text-muted-foreground">
                      <tr>
                        <th className="pb-3 font-semibold">Requested At</th>
                        <th className="pb-3 font-semibold">Producer ID</th>
                        <th className="pb-3 font-semibold">Amount</th>
                        <th className="pb-3 font-semibold">Status</th>
                        <th className="pb-3 font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {(data?.withdrawals ?? []).map((w: any) => (
                        <tr key={w.id}>
                          <td className="py-3 text-muted-foreground">{new Date(w.requested_at).toLocaleString()}</td>
                          <td className="py-3 font-mono text-muted-foreground">{w.producer_id.slice(0, 8)}...</td>
                          <td className="py-3 font-bold text-emerald-400">{fmtNaira(Number(w.amount))}</td>
                          <td className="py-3">
                            <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                              w.status === "paid"
                                ? "bg-emerald-500/20 text-emerald-400"
                                : w.status === "pending"
                                ? "bg-amber-500/20 text-amber-400"
                                : "bg-red-500/20 text-red-400"
                            }`}>
                              {w.status}
                            </span>
                          </td>
                          <td className="py-3">
                            {busyWithdrawal === w.id ? (
                              <Loader2 className="h-4 w-4 animate-spin text-red-500" />
                            ) : (
                              <div className="flex items-center gap-1.5">
                                {w.status !== "paid" && (
                                  <button
                                    onClick={() => handleSettle(w.id, "paid")}
                                    className="rounded-lg bg-emerald-500/20 px-2.5 py-1 text-[10px] font-bold text-emerald-400 hover:bg-emerald-500/30"
                                  >
                                    Approve & Mark Paid
                                  </button>
                                )}
                                {w.status === "pending" && (
                                  <button
                                    onClick={() => handleSettle(w.id, "processing")}
                                    className="rounded-lg bg-amber-500/20 px-2.5 py-1 text-[10px] font-bold text-amber-400 hover:bg-amber-500/30"
                                  >
                                    Processing
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 6: SAMPLE PACKS */}
            {activeTab === "packs" && (
              <div className="rounded-3xl border border-white/10 bg-surface/50 p-6">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-white/10 text-muted-foreground">
                      <tr>
                        <th className="pb-3 font-semibold">Cover</th>
                        <th className="pb-3 font-semibold">Title</th>
                        <th className="pb-3 font-semibold">Author</th>
                        <th className="pb-3 font-semibold">Price</th>
                        <th className="pb-3 font-semibold">Link</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {(data?.samplePacks ?? []).map((pack: any) => (
                        <tr key={pack.id}>
                          <td className="py-3">
                            <CoverImage src={pack.cover} alt={pack.title} />
                          </td>
                          <td className="py-3 font-bold text-white">{pack.title}</td>
                          <td className="py-3 text-muted-foreground">{pack.author || "HITXLAB"}</td>
                          <td className="py-3 font-bold text-emerald-400">{fmtNaira(pack.price)}</td>
                          <td className="py-3">
                            <Link to={`/sample-pack/${pack.id}`} className="text-red-500 hover:underline flex items-center gap-1">
                              View <ExternalLink className="h-3 w-3" />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function CoverImage({ src, alt }: { src?: string; alt: string }) {
  const [imgErr, setImgErr] = useState(false);

  if (!src || imgErr) {
    return (
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/5 text-red-500">
        <Music4 className="h-5 w-5" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setImgErr(true)}
      className="h-10 w-10 shrink-0 rounded-lg object-cover"
    />
  );
}
