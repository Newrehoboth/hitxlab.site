import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/Navbar";
import { Player } from "@/components/Player";
import { SettingsView } from "@/components/SettingsView";
import { useAuth } from "@/lib/store";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Account & Studio Settings — HITXLAB" },
      {
        name: "description",
        content: "Manage your name, avatar, cover image, notifications, and payouts.",
      },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user } = useAuth();

  return (
    <div className="flex min-h-screen flex-col pb-32">
      <Navbar />
      <main className="flex-1 py-8 px-4 sm:px-6">
        {!user ? (
          <div className="mx-auto max-w-md rounded-3xl border border-white/10 bg-surface/30 p-8 text-center mt-12">
            <h2 className="font-display text-xl font-bold">Sign in required</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Please sign in to access your account settings, avatar, and payout options.
            </p>
          </div>
        ) : (
          <SettingsView />
        )}
      </main>
      <Player />
    </div>
  );
}
