import { Link } from "@tanstack/react-router";
import { Bell, Heart, UserPlus, CheckCheck } from "lucide-react";
import { useNotifications } from "@/lib/engagement";

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function NotificationsPanel() {
  const { items, loading, error, unread, markAllRead, markRead } = useNotifications();

  return (
    <>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Notifications</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            New followers and likes on your beats show up here.
          </p>
        </div>
        {unread > 0 && (
          <button
            onClick={markAllRead}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-muted-foreground transition hover:text-white"
          >
            <CheckCheck className="h-4 w-4" /> Mark all as read ({unread})
          </button>
        )}
      </div>

      <div className="rounded-2xl border border-white/8 bg-surface/40">
        {error ? (
          <div className="p-8 text-center">
            <Bell className="mx-auto h-8 w-8 text-muted-foreground/50" />
            <p className="mt-3 text-sm text-muted-foreground">
              Could not load notifications. Please refresh the page.
            </p>
          </div>
        ) : loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading notifications…</div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center">
            <Bell className="mx-auto h-8 w-8 text-muted-foreground/50" />
            <p className="mt-3 text-sm text-muted-foreground">
              No notifications yet. When someone follows you or likes a beat, you'll see it here.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-white/5">
            {items.map((n) => {
              const Icon = n.type === "like" ? Heart : UserPlus;
              const body = (
                <div className="flex items-start gap-3 px-4 py-4 sm:px-5">
                  <span
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${
                      n.type === "like" ? "bg-red-500/15 text-red-400" : "bg-teal/15 text-teal"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{n.title}</span>
                      {!n.is_read && <span className="h-2 w-2 rounded-full bg-red-500" />}
                    </div>
                    <p className="mt-0.5 truncate text-sm text-muted-foreground">{n.message}</p>
                  </div>
                  <span className="shrink-0 text-[11px] text-muted-foreground/70">
                    {timeAgo(n.created_at)}
                  </span>
                </div>
              );
              return (
                <li key={n.id} onClick={() => !n.is_read && markRead(n.id)}>
                  {n.link && n.link.startsWith("/beat/") ? (
                    <Link
                      to="/beat/$id"
                      params={{ id: n.link.replace("/beat/", "") }}
                      className="block transition hover:bg-white/[0.03]"
                    >
                      {body}
                    </Link>
                  ) : (
                    <div className="transition hover:bg-white/[0.03]">{body}</div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
