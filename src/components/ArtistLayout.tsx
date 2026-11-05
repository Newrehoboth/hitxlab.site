import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import {
  LayoutDashboard,
  ShoppingBag,
  MessageSquare,
  Settings,
  LogOut,
  Menu,
  X,
  Music4,
  ArrowUpRight,
  Sparkles,
  Headphones,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/store";
import hitxlabLogo from "@/assets/hitxlabLogo.png";

const NAV = [
  { to: "/artist/dashboard", label: "Overview", icon: LayoutDashboard, search: undefined },
  { to: "/artist/dashboard", label: "My Purchases", icon: ShoppingBag, search: { tab: "purchases" as const } },
  { to: "/artist/dashboard", label: "Messages", icon: MessageSquare, search: { tab: "messages" as const } },
  { to: "/artist/dashboard", label: "Settings", icon: Settings, search: { tab: "settings" as const } },
];

export function ArtistLayout({ children, active }: { children: ReactNode; active?: string }) {
  const { user, loading, signOut } = useAuth();
  const nav = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const search = useRouterState({ select: (s) => s.location.search }) as { tab?: string };
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      nav({ to: "/auth", search: { mode: "signin" } });
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
        {/* Logo */}
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

        {/* Artist identity card */}
        {user && (
          <div className="border-b border-white/8 p-4">
            <div className="flex items-center gap-3">
              <span
                className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-sm font-bold text-black shadow-md bg-gradient-to-br from-teal to-red-600"
              >
                {user.name.slice(0, 2).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{user.name}</div>
                <div className="truncate text-xs text-muted-foreground">{user.email}</div>
              </div>
            </div>
            <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-teal/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-teal">
              <Headphones className="h-3 w-3" /> Artist
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-3">
          <div className="mb-2 px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            My Account
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
                      ? "bg-teal/10 text-teal ring-1 ring-teal/20"
                      : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>

          {/* Become a Producer CTA */}
          <div className="mt-6 rounded-xl border border-red-500/20 bg-red-500/5 p-3">
            <div className="mb-1 flex items-center gap-1.5 text-xs font-bold text-red-500">
              <Sparkles className="h-3.5 w-3.5" /> Become a Producer
            </div>
            <p className="mb-2.5 text-[11px] leading-relaxed text-muted-foreground">
              Start selling your beats and earn on HITXLAB.
            </p>
            <Link
              to="/producer/onboarding"
              className="block w-full rounded-lg bg-gradient-to-r from-[#EF4444] to-[#DC2626] py-1.5 text-center text-xs font-bold text-black transition hover:brightness-105"
            >
              Set up your studio →
            </Link>
          </div>
        </nav>

        <div className="border-t border-white/8 p-3">
          <Link
            to="/"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-white/5 hover:text-foreground"
          >
            <ArrowUpRight className="h-3.5 w-3.5" /> Browse Marketplace
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
