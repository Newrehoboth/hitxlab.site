// ═══════════════════════════════════════════════════════════════════════════
// COPY THIS INTO YOUR src/routes/admin/index.tsx
// ═══════════════════════════════════════════════════════════════════════════

// 1. ADD THESE IMPORTS AT THE TOP:
import { TakedownBeatModal, GiveStrikeModal } from "@/components/ModerationPanel";
import { Ban, ShieldAlert } from "lucide-react";

// 2. ADD THESE STATE VARIABLES INSIDE AdminDashboard() FUNCTION:
const [selectedBeatForTakedown, setSelectedBeatForTakedown] = useState<any>(null);
const [selectedUserForStrike, setSelectedUserForStrike] = useState<any>(null);

// 3. ADD THESE BUTTONS TO YOUR BEAT LIST (where you map over beats):
{data?.beats?.map((beat: any) => (
  <div key={beat.id} className="...existing classes...">
    {/* ...existing beat info... */}
    
    {/* ADD THESE MODERATION BUTTONS: */}
    <div className="flex gap-2">
      <button
        onClick={() => setSelectedBeatForTakedown(beat)}
        className="flex items-center gap-1 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs text-red-500 hover:bg-red-500/20"
      >
        <Ban className="h-3 w-3" />
        Takedown
      </button>
      
      <button
        onClick={() => setSelectedUserForStrike({
          id: beat.producer_id,
          name: data.producerProfiles?.find((p: any) => p.user_id === beat.producer_id)?.producer_name || 'Producer',
          email: data.users?.find((u: any) => u.id === beat.producer_id)?.email || '',
        })}
        className="flex items-center gap-1 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-1.5 text-xs text-yellow-500 hover:bg-yellow-500/20"
      >
        <ShieldAlert className="h-3 w-3" />
        Strike
      </button>
    </div>
  </div>
))}

// 4. ADD THESE MODALS AT THE VERY BOTTOM (before closing </div> of AdminDashboard):
{/* Moderation Modals */}
{selectedBeatForTakedown && (
  <TakedownBeatModal
    beat={selectedBeatForTakedown}
    onClose={() => setSelectedBeatForTakedown(null)}
    onSuccess={() => {
      setSelectedBeatForTakedown(null);
      refreshData();
    }}
  />
)}

{selectedUserForStrike && (
  <GiveStrikeModal
    user={selectedUserForStrike}
    relatedBeatId={undefined}
    onClose={() => setSelectedUserForStrike(null)}
    onSuccess={() => {
      setSelectedUserForStrike(null);
      refreshData();
    }}
  />
)}

// ═══════════════════════════════════════════════════════════════════════════
// ALTERNATIVE: Quick Test Version (for testing without full integration)
// ═══════════════════════════════════════════════════════════════════════════
// Add this simple button somewhere in your admin dashboard to test:

<button
  onClick={() => setSelectedBeatForTakedown({
    id: 'paste-a-real-beat-id-here',
    title: 'Test Beat',
    producer_id: 'paste-producer-id-here',
  })}
  className="rounded-lg bg-red-500 px-4 py-2 text-white"
>
  Test Takedown Modal
</button>

// ═══════════════════════════════════════════════════════════════════════════
// That's it! Save the file and your moderation system is ready to use.
// ═══════════════════════════════════════════════════════════════════════════
