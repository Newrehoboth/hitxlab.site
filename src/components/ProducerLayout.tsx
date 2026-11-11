import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import {
  LayoutDashboard,
  Upload,
  Music4,
  ShoppingBag,
  Users,
  BarChart3,
  MessageSquare,
  FileText,
  Settings,
  Wallet,
  LogOut,
  Menu,
  X,
  Sparkles,
  ArrowUpRight,
  Package,
  Bell,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/store";
import { useProducerProfile } from "@/lib/producer-profile";
import { useNotifications } from "@/lib/engagement";
import hitxlabLogo from "@/assets/hitxlabLogo.png";

const NAV = [
  { to: "/producer/dashboard", label: "Overview", icon: LayoutDashboard, search: undefined },
  { to: "/producer/upload", label: "Upload Beat", icon: Upload, search: undefined },
  { to: "/producer/dashboard", label: "My Beats", icon: Music4, search: { tab: "beats" as const } },
  { to: "/producer/upload-sample-pack", label: "Upload Sample Pack", icon: Package, search: undefined },
  { to: "/producer/dashboard", label: "Sample Packs", icon: Package, search: { tab: "sample-packs" as const } },
  {
    to: "/producer/dashboard",
    label: "Orders",
    icon: ShoppingBag,
    search: { tab: "orders" as const },
  },
  {
    to: "/producer/dashboard",
    label: "Purchased Beats",
    icon: ShoppingBag,
    search: { tab: "purchases" as const },
  },
  {
    to: "/producer/dashboard",
    label: "Followers",
    icon: Users,
    search: { tab: "followers" as const },
  },
  {
    to: "/producer/dashboard",
    label: "Notifications",
    icon: Bell,
    search: { tab: "notifications" as const },
  },
  {
    to: "/producer/dashboard",
    label: "Analytics",
    icon: BarChart3,
    search: { tab: "analytics" as const },
  },
  {
    to: "/producer/dashboard",
    label: "Direct Messages",
    icon: MessageSquare,
    search: { tab: "direct-messages" as const },
  },
  {
    to: "/producer/dashboard",
    label: "Negotiations",
    icon: MessageSquare,
    search: { tab: "messages" as const },
  },
  {
    to: "/producer/dashboard",
    label: "Contracts",
    icon: FileText,
    search: { tab: "contracts" as const },
  },
  {
    to: "/producer/payouts",
    label: "Earnings & Payouts",
    icon: Wallet,
    search: undefined,
  },
  {
    to: "/producer/dashboard",
    label: "Settings",
    icon: Settings,
    search: { tab: "settings" as const },
  },
];


export function ProducerLayout({ children, active }: { children: ReactNode; active?: string }) {
  const { user, loading, signOut } = useAuth();
  const { profile, loading: profileLoading } = useProducerProfile();
  const nav = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const search = useRouterState({ select: (s) => s.location.search }) as { tab?: string };
  const [open, setOpen] = useState(false);
  const { unread } = useNotifications(30);

  useEffect(() => {
    if (loading) return;

    console.log("🔍 ProducerLayout - user:", user);
    console.log("🔍 ProducerLayout - user role:", user?.role);

    // Redirect to auth if not logged in
    if (!user) {
      console.log("🔍 ProducerLayout - No user, redirecting to auth");
      nav({ to: "/auth", search: { mode: "signin" } });
    } else if (user.role !== "producer") {
      // Artists cannot access producer studio unless they switch to producer
      console.log("🔍 ProducerLayout - User is not a producer, redirecting to artist dashboard");
      nav({ to: "/artist/dashboard", search: { tab: "overview" } });
    } else {
      console.log("🔍 ProducerLayout - User is a producer, allowing access");
    }
  }, [user, loading, nav]);

  const currentKey = active ?? `${pathname}?${search?.tab ?? ""}`;

  return (
    <div className="flex min-h-screen bg-background">
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 shrink-0 flex-col border-r border-white/8 bg-surface/95 backdrop-blur transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-white/8 px-5">
          <Link to="/" className="flex items-center">
            <img src={hitxlabLogo} alt="HITXLAB" className="h-7 w-auto object-contain" />
          </Link>
          <button
            onClick={() => setOpen(false)}
            className="grid h-8 w-8 place-items-center rounded-lg hover:bg-white/5 lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {profile && (
          <div className="border-b border-white/8 p-4">
            <div className="flex items-center gap-3">
              {profile.avatarUrl || profile.logoUrl ? (
                <img
                  src={profile.avatarUrl || profile.logoUrl || undefined}
                  alt={profile.producerName}
                  className="h-11 w-11 shrink-0 rounded-xl object-cover border border-white/10 shadow-md"
                />
              ) : (
                <span
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-sm font-bold text-black shadow-md"
                  style={{ background: profile.brandColor || "oklch(0.8 0.155 72)" }}
                >
                  {profile.producerName.slice(0, 2).toUpperCase()}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{profile.producerName}</div>
                <div className="truncate text-xs text-muted-foreground">@{profile.username}</div>
              </div>
            </div>
            <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-500">
              <Sparkles className="h-3 w-3" /> Producer Pro
            </div>
          </div>
        )}

        <nav className="flex-1 overflow-y-auto p-3">
          <div className="mb-2 px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Studio
          </div>
          <div className="flex flex-col gap-0.5">
            {NAV.map((item) => {
              const key = `${item.to}?${item.search?.tab ?? ""}`;
              const isActive = currentKey === key;
              return (
                <Link
                  key={key + item.label}
                  to={item.to as any}
                  search={item.search as any}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                    isActive
                      ? "bg-red-500/10 text-red-500 ring-1 ring-red-500/20"
                      : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  <span className="flex-1">{item.label}</span>
                  {item.label === "Notifications" && unread > 0 && (
                    <span className="grid min-w-5 place-items-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                      {unread}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="border-t border-white/8 p-3">
          <Link
            to="/"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-white/5 hover:text-foreground"
          >
            <ArrowUpRight className="h-3.5 w-3.5" /> Visit marketplace
          </Link>
          <button
            onClick={async () => {
              await signOut();
              nav({ to: "/" });
            }}
            className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-white/5 hover:text-crimson"
          >
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
        </div>
      </aside>

      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-white/8 bg-background/90 px-4 backdrop-blur sm:px-6 lg:hidden">
          <button
            onClick={() => setOpen(true)}
            className="grid h-10 w-10 place-items-center rounded-lg border border-white/10"
          >
            <Menu className="h-4.5 w-4.5" />
          </button>
          <Link to="/" className="flex items-center">
            <img src={hitxlabLogo} alt="HITXLAB" className="h-7 w-auto object-contain" />
          </Link>
        </header>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
