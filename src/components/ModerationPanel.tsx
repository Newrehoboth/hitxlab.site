import { useState } from "react";
import {
  ShieldAlert,
  AlertTriangle,
  Ban,
  Play,
  X,
  Check,
  Clock,
  FileWarning,
  UserX,
  Music,
} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import {
  takedownBeatFn,
  giveUserStrikeFn,
  getAllModerationActionsFn,
} from "@/lib/moderation.functions";

type ModerationReason =
  | "copyright_claim"
  | "uploaded_music_not_beat"
  | "inappropriate_content"
  | "spam"
  | "terms_violation"
  | "other";

type StrikeReason =
  | "copyright_violation"
  | "uploaded_music_instead_of_beat"
  | "inappropriate_content"
  | "spam"
  | "terms_violation"
  | "multiple_violations"
  | "other";

type TakedownAction = "takedown_temporary" | "takedown_permanent" | "restore" | "warning";
type StrikeType = "warning" | "violation" | "severe_violation";

type Beat = {
  id: string;
  title: string;
  producer_id: string;
  cover_url?: string;
};

type User = {
  id: string;
  name: string;
  email: string;
};

// ═══════════════════════════════════════════════════════════════════════════
// TAKEDOWN BEAT MODAL
// ═══════════════════════════════════════════════════════════════════════════

export function TakedownBeatModal({
  beat,
  onClose,
  onSuccess,
}: {
  beat: Beat;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const takedownBeat = useServerFn(takedownBeatFn);
  const [actionType, setActionType] = useState<TakedownAction>("takedown_temporary");
  const [reason, setReason] = useState<ModerationReason>("uploaded_music_not_beat");
  const [customReason, setCustomReason] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [expiryDays, setExpiryDays] = useState("7");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const expiresAt =
        actionType === "takedown_temporary" && expiryDays
          ? new Date(Date.now() + Number(expiryDays) * 24 * 60 * 60 * 1000).toISOString()
          : undefined;

      console.log("[Takedown] Submitting:", {
        beatId: beat.id,
        actionType,
        reason,
        expiresAt,
      });

      const result = await takedownBeat({
        data: {
          beatId: beat.id,
          actionType,
          reason,
          customReason: customReason || undefined,
          adminNotes: adminNotes || undefined,
          expiresAt,
        },
      });

      console.log("[Takedown] Success:", result);

      const isPermanent = actionType === "takedown_permanent";
      alert(
        isPermanent
          ? "✅ Beat permanently deleted! Email sent to producer."
          : "✅ Beat taken down successfully! Email sent to producer."
      );
      
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error("[Takedown] Error:", err);
      alert(`❌ Error: ${err.message || "Takedown failed"}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-2xl rounded-xl border border-white/8 bg-background p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-bold">Takedown Beat</h2>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded hover:bg-white/5">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Beat Info */}
        <div className="mb-6 flex gap-3 rounded-lg border border-white/8 bg-surface/60 p-3">
          {beat.cover_url && (
            <img src={beat.cover_url} alt="" className="h-16 w-16 rounded-lg object-cover" />
          )}
          <div>
            <div className="font-semibold">{beat.title}</div>
            <div className="text-xs text-muted-foreground">ID: {beat.id}</div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Action Type */}
          <div>
            <label className="mb-2 block text-sm font-medium">Action Type</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setActionType("takedown_temporary")}
                className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm transition ${
                  actionType === "takedown_temporary"
                    ? "border-yellow-500 bg-yellow-500/10 text-yellow-500"
                    : "border-white/8 hover:bg-white/5"
                }`}
              >
                <Clock className="h-4 w-4" />
                Temporary
              </button>
              <button
                type="button"
                onClick={() => setActionType("takedown_permanent")}
                className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm transition ${
                  actionType === "takedown_permanent"
                    ? "border-red-500 bg-red-500/10 text-red-500"
                    : "border-white/8 hover:bg-white/5"
                }`}
              >
                <Ban className="h-4 w-4" />
                Permanent
              </button>
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="mb-2 block text-sm font-medium">Reason</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as ModerationReason)}
              className="h-10 w-full rounded-lg border border-white/8 bg-background px-3 text-sm"
              required
            >
              <option value="copyright_claim">Copyright Claim</option>
              <option value="uploaded_music_not_beat">Uploaded Music Instead of Beat</option>
              <option value="inappropriate_content">Inappropriate Content</option>
              <option value="spam">Spam</option>
              <option value="terms_violation">Terms of Service Violation</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Custom Reason */}
          <div>
            <label className="mb-2 block text-sm font-medium">
              Additional Details (shown to user)
            </label>
            <textarea
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder="E.g., 'This appears to be a full song with vocals, not an instrumental beat.'"
              className="w-full rounded-lg border border-white/8 bg-background px-3 py-2 text-sm"
              rows={3}
            />
          </div>

          {/* Expiry (for temporary) */}
          {actionType === "takedown_temporary" && (
            <div>
              <label className="mb-2 block text-sm font-medium">Expires In (days)</label>
              <input
                type="number"
                value={expiryDays}
                onChange={(e) => setExpiryDays(e.target.value)}
                min="1"
                max="365"
                className="h-10 w-full rounded-lg border border-white/8 bg-background px-3 text-sm"
              />
            </div>
          )}

          {/* Admin Notes */}
          <div>
            <label className="mb-2 block text-sm font-medium">
              Internal Notes (not shown to user)
            </label>
            <textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Internal notes for moderation team..."
              className="w-full rounded-lg border border-white/8 bg-background px-3 py-2 text-sm"
              rows={2}
            />
          </div>

          {/* Submit */}
          <div className="flex gap-2 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-gradient-to-b from-[#EF4444] to-[#DC2626] font-semibold text-black disabled:opacity-50"
            >
              {loading ? (
                "Processing..."
              ) : (
                <>
                  <Ban className="h-4 w-4" />
                  Takedown & Send Email
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="h-10 rounded-lg border border-white/8 px-4 text-sm hover:bg-white/5"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// GIVE STRIKE MODAL
// ═══════════════════════════════════════════════════════════════════════════

export function GiveStrikeModal({
  user,
  relatedBeatId,
  onClose,
  onSuccess,
}: {
  user: User;
  relatedBeatId?: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const giveUserStrike = useServerFn(giveUserStrikeFn);
  const [strikeType, setStrikeType] = useState<StrikeType>("warning");
  const [reason, setReason] = useState<StrikeReason>("uploaded_music_instead_of_beat");
  const [customReason, setCustomReason] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await giveUserStrike({
        data: {
          userId: user.id,
          strikeType,
          reason,
          customReason: customReason || undefined,
          adminNotes: adminNotes || undefined,
          relatedBeatId: relatedBeatId || undefined,
        },
      });

      if (result.suspended) {
        alert(
          `⚠️ Strike given! User now has ${result.total_strikes} strikes and has been AUTO-SUSPENDED. Email sent.`,
        );
      } else {
        alert(
          `✅ Strike given! User now has ${result.total_strikes}/2 strikes. Email sent.`,
        );
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      alert(`❌ Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-2xl rounded-xl border border-white/8 bg-background p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-bold">Give User Strike</h2>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded hover:bg-white/5">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* User Info */}
        <div className="mb-6 rounded-lg border border-white/8 bg-surface/60 p-3">
          <div className="font-semibold">{user.name}</div>
          <div className="text-sm text-muted-foreground">{user.email}</div>
        </div>

        {/* Warning */}
        <div className="mb-6 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-500">
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-4 w-4" />
            Strike System
          </div>
          <ul className="ml-6 mt-2 list-disc space-y-1 text-xs">
            <li>Strike 1: Warning - User put under close watch</li>
            <li>Strike 2: Auto-suspension - Account disabled until further notice</li>
          </ul>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Strike Type */}
          <div>
            <label className="mb-2 block text-sm font-medium">Strike Severity</label>
            <div className="grid grid-cols-3 gap-2">
              {(["warning", "violation", "severe_violation"] as StrikeType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setStrikeType(type)}
                  className={`rounded-lg border px-3 py-2 text-xs transition ${
                    strikeType === type
                      ? "border-red-500 bg-red-500/10 text-red-500"
                      : "border-white/8 hover:bg-white/5"
                  }`}
                >
                  {type.replace("_", " ").toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="mb-2 block text-sm font-medium">Reason</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as StrikeReason)}
              className="h-10 w-full rounded-lg border border-white/8 bg-background px-3 text-sm"
              required
            >
              <option value="copyright_violation">Copyright Violation</option>
              <option value="uploaded_music_instead_of_beat">
                Uploaded Music Instead of Beat
              </option>
              <option value="inappropriate_content">Inappropriate Content</option>
              <option value="spam">Spam</option>
              <option value="terms_violation">Terms of Service Violation</option>
              <option value="multiple_violations">Multiple Violations</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Custom Reason */}
          <div>
            <label className="mb-2 block text-sm font-medium">
              Additional Details (shown to user)
            </label>
            <textarea
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder="Explain the violation to the user..."
              className="w-full rounded-lg border border-white/8 bg-background px-3 py-2 text-sm"
              rows={3}
            />
          </div>

          {/* Admin Notes */}
          <div>
            <label className="mb-2 block text-sm font-medium">
              Internal Notes (not shown to user)
            </label>
            <textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Internal notes for moderation team..."
              className="w-full rounded-lg border border-white/8 bg-background px-3 py-2 text-sm"
              rows={2}
            />
          </div>

          {/* Submit */}
          <div className="flex gap-2 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-gradient-to-b from-[#EF4444] to-[#DC2626] font-semibold text-black disabled:opacity-50"
            >
              {loading ? (
                "Processing..."
              ) : (
                <>
                  <ShieldAlert className="h-4 w-4" />
                  Give Strike & Send Email
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="h-10 rounded-lg border border-white/8 px-4 text-sm hover:bg-white/5"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
