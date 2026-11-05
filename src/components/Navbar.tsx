import { Link, useNavigate } from "@tanstack/react-router";
import {
  Search,
  ShoppingBag,
  Menu,
  X,
  Music4,
  Sparkles,
  LogOut,
  User as UserIcon,
} from "lucide-react";
import { useState } from "react";
import { useAuth, useCart } from "@/lib/store";
import { cn } from "@/lib/utils";
import hitxlabLogo from "@/assets/hitxlabLogo.png";

export function Navbar() {
  const { user, signOut } = useAuth();
  const { items, setOpen } = useCart();
  const [mobile, setMobile] = useState(false);
  const [menu, setMenu] = useState(false);
  const nav = useNavigate();

  return (
    <header className="sticky top-0 z-40 glass border-b border-white/5">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
        {/* Logo */}
        <Link to="/" className="flex shrink-0 items-center">
          <img src={hitxlabLogo} alt="HITXLAB" className="h-8 sm:h-9 w-auto object-contain" />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 lg:flex">
          <Link
            to="/browse"
            className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
          >
            Buy Beats
          </Link>
          <Link
            to="/creators-for-you"
            className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
          >
            Producers
          </Link>
          <Link
            to="/sample-packs"
            className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
          >
            Sample Packs
          </Link>
          <Link
            to="/academy"
            className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
          >
            Academy
          </Link>
          <a
            href="https://bigvybz.nile.ng"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
          >
            Merch
          </a>
        </nav>

        {/* Search */}
        <div className="ml-auto hidden max-w-md flex-1 md:block">
          <div className="group relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder="Search beats, producers, moods…"
              className="h-10 w-full rounded-xl border border-white/8 bg-surface/60 pl-10 pr-16 text-sm text-foreground placeholder:text-muted-foreground/70 outline-none transition focus:border-red-500/40 focus:bg-surface focus:ring-2 focus:ring-red-500/20"
            />
            <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline-block">
              ⌘K
            </kbd>
          </div>
        </div>

        {/* Actions */}
        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <button
            onClick={() => setOpen(true)}
            className="relative grid h-10 w-10 place-items-center rounded-xl border border-white/8 bg-surface/60 text-foreground transition hover:bg-surface"
            aria-label="Cart"
          >
            <ShoppingBag className="h-4.5 w-4.5" />
            {items.length > 0 && (
              <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-red-500-foreground">
                {items.length}
              </span>
            )}
          </button>

          {user ? (
            <div className="relative">
              <button
                onClick={() => setMenu((v) => !v)}
                className="flex h-10 items-center gap-2 rounded-xl border border-white/8 bg-surface/60 px-2 pr-3 transition hover:bg-surface"
              >
                <span className="grid h-6 w-6 place-items-center rounded-full bg-gradient-to-br from-teal to-red-600 text-[10px] font-bold text-black">
                  {user.name.slice(0, 1).toUpperCase()}
                </span>
                <span className="hidden text-sm font-medium sm:inline">{user.name}</span>
              </button>
              {menu && (
                <div
                  onMouseLeave={() => setMenu(false)}
                  className="absolute right-0 mt-2 w-52 overflow-hidden rounded-xl border border-white/10 bg-popover shadow-2xl animate-scale-in"
                >
                  <div className="border-b border-white/5 p-3">
                    <div className="text-sm font-semibold">{user.name}</div>
                    <div className="truncate text-xs text-muted-foreground">{user.email}</div>
                    <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-500">
                      <Sparkles className="h-3 w-3" /> {user.role}
                    </div>
                  </div>
                  <Link
                    to="/settings"
                    onClick={() => setMenu(false)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-white/5"
                  >
                    <UserIcon className="h-4 w-4" /> Profile & Settings
                  </Link>
                  {user.role === "producer" ? (
                    <Link
                      to="/producer/dashboard"
                      search={{ tab: "overview" }}
                      onClick={() => setMenu(false)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-white/5"
                    >
                      <Sparkles className="h-4 w-4 text-red-500" /> Studio Dashboard
                    </Link>
                  ) : (
                    <>
                      <Link
                        to="/artist/dashboard"
                        search={{ tab: "overview" }}
                        onClick={() => setMenu(false)}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-white/5"
                      >
                        <Sparkles className="h-4 w-4 text-teal" /> My Dashboard
                      </Link>
                      <Link
                        to="/dashboard/library"
                        onClick={() => setMenu(false)}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-white/5"
                      >
                        <span className="text-sm">📁</span> My Library
                      </Link>
                    </>
                  )}
                  <button
                    onClick={() => {
                      signOut();
                      setMenu(false);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-crimson hover:bg-white/5"
                  >
                    <LogOut className="h-4 w-4" /> Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <button
                onClick={() => nav({ to: "/auth", search: { mode: "signin" } })}
                className="rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                Sign in
              </button>
              <button
                onClick={() => nav({ to: "/auth", search: { mode: "signup" } })}
                className={cn(
                  "h-10 rounded-xl bg-gradient-to-b from-[#EF4444] to-[#DC2626] px-4 text-sm font-semibold text-black shadow-[0_8px_24px_-8px_oklch(0.7_0.17_55/0.6)] transition active:scale-[0.98]",
                )}
              >
                Start selling
              </button>
            </div>
          )}

          <button
            onClick={() => setMobile((v) => !v)}
            className="grid h-10 w-10 place-items-center rounded-xl border border-white/8 bg-surface/60 lg:hidden"
            aria-label="Menu"
          >
            {mobile ? <X className="h-4.5 w-4.5" /> : <Menu className="h-4.5 w-4.5" />}
          </button>
        </div>
      </div>

      {mobile && (
        <div className="border-t border-white/5 bg-surface/95 px-4 py-3 lg:hidden">
          <div className="mb-3 md:hidden">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                placeholder="Search…"
                className="h-11 w-full rounded-xl border border-white/8 bg-background pl-10 pr-3 text-sm outline-none focus:border-red-500/40"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <Link
              to="/browse"
              onClick={() => setMobile(false)}
              className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-white/5 hover:text-foreground"
            >
              Trending
            </Link>
            <Link
              to="/creators-for-you"
              onClick={() => setMobile(false)}
              className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-white/5 hover:text-foreground"
            >
              Producers
            </Link>
            <Link
              to="/sample-packs"
              onClick={() => setMobile(false)}
              className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-white/5 hover:text-foreground"
            >
              Sample Packs
            </Link>
            <Link
              to="/academy"
              onClick={() => setMobile(false)}
              className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-white/5 hover:text-foreground"
            >
              Academy
            </Link>
            <a
              href="https://bigvybz.nile.ng"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-white/5 hover:text-foreground"
            >
              Merch
            </a>
            {!user && (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  onClick={() => nav({ to: "/auth", search: { mode: "signin" } })}
                  className="h-11 rounded-xl border border-white/10 text-sm font-medium"
                >
                  Sign in
                </button>
                <button
                  onClick={() => nav({ to: "/auth", search: { mode: "signup" } })}
                  className="h-11 rounded-xl bg-red-500 text-sm font-semibold text-red-500-foreground"
                >
                  Sign up
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
