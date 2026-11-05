import { useState, useEffect } from "react";
import {
  User,
  Camera,
  Bell,
  CreditCard,
  Lock,
  CheckCircle2,
  Globe,
  Instagram,
  Youtube,
  Sparkles,
  Save,
  Loader2,
  Mail,
  Shield,
  DollarSign,
  Building2,
  ExternalLink,
  Check,
  Music,
  KeyRound,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "@/lib/store";
import { useProducerProfile, toRow } from "@/lib/producer-profile";
import { supabase } from "@/integrations/supabase/client";

type SettingsTab = "profile" | "notifications" | "payouts" | "security";

export function SettingsView() {
  const { user } = useAuth();
  const { profile, loading: profileLoading, refresh: refreshProfile } = useProducerProfile();
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");

  // Profile Form State
  const [producerName, setProducerName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [brandColor, setBrandColor] = useState("#3b82f6");
  const [producerTag, setProducerTag] = useState("");

  // Media URLs
  const [avatarUrl, setAvatarUrl] = useState("");

  // Social Links
  const [instagram, setInstagram] = useState("");
  const [tiktok, setTiktok] = useState("");
  const [youtube, setYoutube] = useState("");
  const [spotify, setSpotify] = useState("");
  const [website, setWebsite] = useState("");

  // Notification Toggles
  const [notifySales, setNotifySales] = useState(true);
  const [notifyFollowers, setNotifyFollowers] = useState(true);
  const [notifyMessages, setNotifyMessages] = useState(true);
  const [notifyMilestones, setNotifyMilestones] = useState(true);
  const [notifyDigest, setNotifyDigest] = useState(false);
  const [notifyMarketing, setNotifyMarketing] = useState(true);

  // Payout Settings State
  const [payoutMethod, setPayoutMethod] = useState<"stripe" | "paypal" | "bank">("stripe");
  const [paypalEmail, setPaypalEmail] = useState("");
  const [payoutSchedule, setPayoutSchedule] = useState("weekly");
  const [minPayout, setMinPayout] = useState("50");

  // Security Form State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [securityMsg, setSecurityMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // UI state
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [uploadingMedia, setUploadingMedia] = useState(false);

  // Helper to resize avatar images to compact base64 (~20-30KB)
  const resizeAvatar = (file: File, maxDim = 400): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let { width, height } = img;
          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) return resolve(e.target?.result as string);
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", 0.85));
        };
        img.onerror = () => resolve(e.target?.result as string);
        img.src = e.target?.result as string;
      };
      reader.onerror = () => resolve("");
      reader.readAsDataURL(file);
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 10 * 1024 * 1024) {
      showToast("Image must be less than 10MB");
      return;
    }

    setUploadingMedia(true);
    try {
      // Convert & resize image to lightweight base64 Data URL (~20KB)
      const dataUrl = await resizeAvatar(file);
      if (!dataUrl) {
        showToast("Could not process image file.");
        return;
      }

      // Update state for immediate local display
      setAvatarUrl(dataUrl);

      // Save directly to producer_profiles table in Supabase DB
      const { error: dbError } = await supabase
        .from("producer_profiles")
        .update({ avatar_url: dataUrl })
        .eq("user_id", user.id);

      if (dbError) {
        console.error("Failed to save avatar to DB:", dbError);
        showToast("Error saving image to database: " + dbError.message);
        return;
      }

      await refreshProfile();
      showToast("Profile picture saved successfully!");
    } catch (err: any) {
      console.error("Avatar selection error:", err);
      showToast("Error uploading profile picture.");
    } finally {
      setUploadingMedia(false);
    }
  };

  // Populate profile data when loaded
  useEffect(() => {
    if (profile) {
      setProducerName(profile.producerName ?? user?.name ?? "");
      setUsername(profile.username ?? "");
      setBio(profile.bio ?? "");
      setCountry(profile.country ?? "");
      setCity(profile.city ?? "");
      setBrandColor(profile.brandColor || "#3b82f6");
      setProducerTag(profile.producerTag ?? "");
      setAvatarUrl(profile.avatarUrl ?? "");
      setInstagram(profile.instagram ?? "");
      setTiktok(profile.tiktok ?? "");
      setYoutube(profile.youtube ?? "");
      setSpotify(profile.spotify ?? "");
      setWebsite(profile.website ?? "");
    } else if (user) {
      setProducerName(user.name ?? "");
    }
  }, [profile, user]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);

    try {
      const profileData = {
        userId: user.id,
        producerName: producerName.trim() || user.name || "Producer",
        username: username.trim() || user.name.toLowerCase().replace(/\s+/g, "_"),
        bio: bio.trim(),
        country: country.trim(),
        city: city.trim(),
        avatarUrl: avatarUrl.trim() || null,
        bannerUrl: null,
        instagram: instagram.trim() || null,
        tiktok: tiktok.trim() || null,
        youtube: youtube.trim() || null,
        spotify: spotify.trim() || null,
        website: website.trim() || null,
        brandColor,
        producerTag: producerTag.trim(),
        logoUrl: null,
      };

      const row = toRow(profileData);
      const { error } = await supabase
        .from("producer_profiles")
        .upsert(row, { onConflict: "user_id" });

      if (error) throw error;
      await refreshProfile();
      showToast("Profile settings saved successfully!");
    } catch (err: any) {
      console.error("Save profile error:", err);
      showToast("Error saving profile: " + (err.message || "Unknown error"));
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityMsg(null);
    if (!newPassword) {
      setSecurityMsg({ type: "error", text: "Please enter a new password." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setSecurityMsg({ type: "error", text: "New passwords do not match." });
      return;
    }
    if (newPassword.length < 6) {
      setSecurityMsg({ type: "error", text: "Password must be at least 6 characters long." });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setSecurityMsg({ type: "success", text: "Password updated successfully!" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setSecurityMsg({ type: "error", text: err.message || "Failed to update password." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Account & Studio Settings
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your public producer profile, avatar, cover image, payout channels, and
          notification preferences.
        </p>
      </div>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-red-500 px-4 py-3 text-sm font-bold text-black shadow-2xl animate-in fade-in slide-in-from-bottom-4">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {toastMessage}
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-white/10 overflow-x-auto gap-2 [&::-webkit-scrollbar]:hidden">
        {[
          { id: "profile", label: "Profile & Identity", icon: User },
          { id: "notifications", label: "Notifications", icon: Bell },
          { id: "payouts", label: "Payouts & Earnings", icon: CreditCard },
          { id: "security", label: "Security & Password", icon: Lock },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as SettingsTab)}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-all whitespace-nowrap ${
                isActive
                  ? "border-red-500 text-red-500"
                  : "border-transparent text-muted-foreground hover:border-white/20 hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── TAB 1: Profile & Identity ── */}
      {activeTab === "profile" && (
        <form onSubmit={handleSaveProfile} className="space-y-8">
          {/* Banner & Avatar Header Card */}
          <div className="overflow-hidden rounded-3xl border border-white/10 bg-surface/40 shadow-xl">
            {/* Solid black cover banner — no upload needed */}
            <div className="h-40 w-full bg-black" />

            {/* Avatar & Basic Info Header */}
            <div className="relative px-6 pb-6 pt-0 sm:px-8">
              <div className="flex flex-wrap items-end justify-between gap-4 -mt-14">
                {/* Circular Avatar File Input */}
                <div className="flex items-center gap-4">
                  <label className="relative group cursor-pointer block shrink-0">
                    <div className="h-28 w-28 rounded-full border-4 border-black bg-surface overflow-hidden shadow-2xl relative">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                      ) : (
                        <div className="grid h-full w-full place-items-center bg-gradient-to-br from-blue-600 to-indigo-900 text-2xl font-bold text-white uppercase">
                          {(producerName || user?.name || "P").slice(0, 2)}
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity text-white text-xs font-bold gap-1 backdrop-blur-[1px]">
                        <Camera className="h-5 w-5 text-red-500" />
                        <span>Change Photo</span>
                      </div>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileSelect(e)}
                      className="hidden"
                      disabled={uploadingMedia}
                    />
                  </label>

                  <div>
                    <label className="cursor-pointer inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-semibold hover:bg-white/10 transition active:scale-95">
                      {uploadingMedia ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Camera className="h-3.5 w-3.5 text-red-500" />
                      )}
                      Upload Profile Picture
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileSelect(e)}
                        className="hidden"
                        disabled={uploadingMedia}
                      />
                    </label>
                    <p className="text-[11px] text-muted-foreground mt-1.5">
                      JPEG, PNG or WEBP up to 10MB. Click the circle above or use this button.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Profile Details Form */}
          <div className="rounded-3xl border border-white/10 bg-surface/30 p-6 sm:p-8 space-y-6">
            <h3 className="font-display text-lg font-bold">General Information</h3>

            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
                  Display / Producer Name <span className="text-crimson">*</span>
                </label>
                <input
                  required
                  value={producerName}
                  onChange={(e) => setProducerName(e.target.value)}
                  placeholder="e.g. Metro Boomin"
                  className="h-11 w-full rounded-xl border border-white/10 bg-background/60 px-4 text-sm font-medium outline-none focus:border-red-500/40"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
                  Username <span className="text-crimson">*</span>
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-semibold">
                    @
                  </span>
                  <input
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="producer_handle"
                    className="h-11 w-full rounded-xl border border-white/10 bg-background/60 pl-8 pr-4 text-sm font-medium outline-none focus:border-red-500/40"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
                Bio / Producer Description
              </label>
              <textarea
                rows={4}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell artists about your production style, notable credits, and sample clearance policies..."
                className="w-full rounded-xl border border-white/10 bg-background/60 p-4 text-sm outline-none focus:border-red-500/40"
              />
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
                  Country
                </label>
                <input
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="e.g. United States"
                  className="h-11 w-full rounded-xl border border-white/10 bg-background/60 px-4 text-sm outline-none focus:border-red-500/40"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
                  City
                </label>
                <input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Atlanta, GA"
                  className="h-11 w-full rounded-xl border border-white/10 bg-background/60 px-4 text-sm outline-none focus:border-red-500/40"
                />
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
                  Producer Audio Tag Name
                </label>
                <input
                  value={producerTag}
                  onChange={(e) => setProducerTag(e.target.value)}
                  placeholder="e.g. 'If Young Metro Don't Trust You...'"
                  className="h-11 w-full rounded-xl border border-white/10 bg-background/60 px-4 text-sm outline-none focus:border-red-500/40"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
                  Brand Highlight Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={brandColor}
                    onChange={(e) => setBrandColor(e.target.value)}
                    className="h-11 w-14 rounded-xl border border-white/10 bg-background/60 p-1 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={brandColor}
                    onChange={(e) => setBrandColor(e.target.value)}
                    className="h-11 flex-1 rounded-xl border border-white/10 bg-background/60 px-4 text-sm font-mono outline-none focus:border-red-500/40 uppercase"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Social Accounts */}
          <div className="rounded-3xl border border-white/10 bg-surface/30 p-6 sm:p-8 space-y-6">
            <h3 className="font-display text-lg font-bold">Social Media Handles</h3>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Instagram handle
                </label>
                <div className="relative">
                  <Instagram className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={instagram}
                    onChange={(e) => setInstagram(e.target.value)}
                    placeholder="@instagram_handle"
                    className="h-10 w-full rounded-xl border border-white/10 bg-background/60 pl-10 pr-3 text-xs outline-none focus:border-red-500/40"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  YouTube Channel URL
                </label>
                <div className="relative">
                  <Youtube className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={youtube}
                    onChange={(e) => setYoutube(e.target.value)}
                    placeholder="https://youtube.com/@channel"
                    className="h-10 w-full rounded-xl border border-white/10 bg-background/60 pl-10 pr-3 text-xs outline-none focus:border-red-500/40"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  TikTok handle
                </label>
                <div className="relative">
                  <Music className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={tiktok}
                    onChange={(e) => setTiktok(e.target.value)}
                    placeholder="@tiktok_username"
                    className="h-10 w-full rounded-xl border border-white/10 bg-background/60 pl-10 pr-3 text-xs outline-none focus:border-red-500/40"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Website URL
                </label>
                <div className="relative">
                  <Globe className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://yourwebsite.com"
                    className="h-10 w-full rounded-xl border border-white/10 bg-background/60 pl-10 pr-3 text-xs outline-none focus:border-red-500/40"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Submit button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-12 items-center gap-2 rounded-xl bg-red-500 px-8 text-sm font-bold text-red-500-foreground transition hover:brightness-110 active:scale-95 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Saving Changes...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" /> Save Profile
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* ── TAB 2: Notifications ── */}
      {activeTab === "notifications" && (
        <div className="rounded-3xl border border-white/10 bg-surface/30 p-6 sm:p-8 space-y-8">
          <div>
            <h3 className="font-display text-lg font-bold">Email Notifications</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Choose what notifications you want delivered to{" "}
              <span className="text-white font-medium">{user?.email}</span>.
            </p>
          </div>

          <div className="divide-y divide-white/5">
            {[
              {
                title: "Instant Beat Sales & Payouts",
                desc: "Receive immediate notification whenever an artist purchases a license for your beats.",
                state: notifySales,
                setState: setNotifySales,
              },
              {
                title: "New Follower Alerts",
                desc: "Get an email notification when someone follows your producer profile.",
                state: notifyFollowers,
                setState: setNotifyFollowers,
              },
              {
                title: "Direct Messages & Custom Beat Requests",
                desc: "Get notified when buyers send you messages or request exclusive beats.",
                state: notifyMessages,
                setState: setNotifyMessages,
              },
              {
                title: "Play Count Milestones",
                desc: "Receive alerts when your tracks hit 1,000, 10,000, or 100,000 total plays.",
                state: notifyMilestones,
                setState: setNotifyMilestones,
              },
              {
                title: "Weekly Performance Digest",
                desc: "A weekly summary email of your plays, earnings, top trending genres, and insights.",
                state: notifyDigest,
                setState: setNotifyDigest,
              },
              {
                title: "Product Updates & Creator News",
                desc: "Announcements about new platform features, seller tips, and promotions.",
                state: notifyMarketing,
                setState: setNotifyMarketing,
              },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between gap-4 py-4">
                <div className="space-y-0.5">
                  <div className="text-sm font-semibold text-foreground">{item.title}</div>
                  <div className="text-xs text-muted-foreground max-w-lg">{item.desc}</div>
                </div>
                <button
                  type="button"
                  onClick={() => item.setState(!item.state)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    item.state ? "bg-red-500" : "bg-white/10"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      item.state ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>

          <div className="pt-4 flex justify-end">
            <button
              onClick={() => showToast("Notification preferences updated!")}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-red-500 px-6 text-sm font-bold text-red-500-foreground transition hover:brightness-110 active:scale-95"
            >
              <Save className="h-4 w-4" /> Save Preferences
            </button>
          </div>
        </div>
      )}

      {/* ── TAB 3: Payouts & Earnings ── */}
      {activeTab === "payouts" && (
        <div className="space-y-6">
          {/* Stripe Connect Card */}
          <div className="rounded-3xl border border-white/10 bg-gradient-to-r from-blue-950/40 via-surface/50 to-surface/30 p-6 sm:p-8 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-500/20 text-blue-400">
                  <Building2 className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-lg font-bold">Stripe Connect Account</h3>
                    <span className="inline-flex items-center gap-1 rounded-full bg-teal/15 px-2.5 py-0.5 text-xs font-bold text-teal">
                      <CheckCircle2 className="h-3 w-3" /> Connected & Active
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Instant payouts directly to your bank account or debit card.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => showToast("Redirecting to Stripe dashboard...")}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 text-xs font-semibold hover:bg-white/10 transition"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Manage Stripe Account
              </button>
            </div>
          </div>

          {/* Payout Options */}
          <div className="rounded-3xl border border-white/10 bg-surface/30 p-6 sm:p-8 space-y-6">
            <h3 className="font-display text-lg font-bold">Payout Method & Threshold</h3>

            <div className="grid gap-4 sm:grid-cols-3">
              {[
                {
                  id: "stripe",
                  title: "Stripe Direct",
                  desc: "0% transfer fee · Instant",
                  icon: CreditCard,
                },
                { id: "paypal", title: "PayPal", desc: "Standard PayPal fee", icon: DollarSign },
                {
                  id: "bank",
                  title: "Bank Wire (ACH)",
                  desc: "1-3 business days",
                  icon: Building2,
                },
              ].map((m) => {
                const Icon = m.icon;
                const selected = payoutMethod === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPayoutMethod(m.id as any)}
                    className={`flex flex-col items-start p-4 rounded-2xl border transition text-left ${
                      selected
                        ? "border-red-500 bg-red-500/10 text-foreground"
                        : "border-white/10 bg-background/40 hover:border-white/20 text-muted-foreground"
                    }`}
                  >
                    <Icon
                      className={`h-5 w-5 mb-2 ${selected ? "text-red-500" : "text-muted-foreground"}`}
                    />
                    <div className="text-sm font-bold">{m.title}</div>
                    <div className="text-xs opacity-75 mt-0.5">{m.desc}</div>
                  </button>
                );
              })}
            </div>

            {payoutMethod === "paypal" && (
              <div className="pt-2">
                <label className="text-xs font-semibold text-muted-foreground block mb-2">
                  PayPal Email Address
                </label>
                <input
                  type="email"
                  value={paypalEmail}
                  onChange={(e) => setPaypalEmail(e.target.value)}
                  placeholder="your-paypal-email@domain.com"
                  className="h-11 w-full max-w-md rounded-xl border border-white/10 bg-background/60 px-4 text-sm outline-none focus:border-red-500/40"
                />
              </div>
            )}

            <div className="grid gap-6 sm:grid-cols-2 pt-2">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
                  Payout Schedule
                </label>
                <select
                  value={payoutSchedule}
                  onChange={(e) => setPayoutSchedule(e.target.value)}
                  className="h-11 w-full rounded-xl border border-white/10 bg-background/60 px-4 text-sm font-medium outline-none focus:border-red-500/40"
                >
                  <option value="daily">Daily (Automatic)</option>
                  <option value="weekly">Weekly (Every Monday)</option>
                  <option value="monthly">Monthly (1st of month)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
                  Minimum Payout Threshold
                </label>
                <select
                  value={minPayout}
                  onChange={(e) => setMinPayout(e.target.value)}
                  className="h-11 w-full rounded-xl border border-white/10 bg-background/60 px-4 text-sm font-medium outline-none focus:border-red-500/40"
                >
                  <option value="20">$20.00 Minimum</option>
                  <option value="50">$50.00 Minimum</option>
                  <option value="100">$100.00 Minimum</option>
                  <option value="250">$250.00 Minimum</option>
                </select>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="button"
                onClick={() => showToast("Payout settings updated successfully!")}
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-red-500 px-6 text-sm font-bold text-red-500-foreground transition hover:brightness-110 active:scale-95"
              >
                <Save className="h-4 w-4" /> Save Payout Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 4: Security ── */}
      {activeTab === "security" && (
        <div className="space-y-6">
          {/* Email Info */}
          <div className="rounded-3xl border border-white/10 bg-surface/30 p-6 sm:p-8 space-y-4">
            <h3 className="font-display text-lg font-bold">Account Email</h3>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-red-500 shrink-0" />
                <div>
                  <div className="text-sm font-semibold text-white">{user?.email}</div>
                  <div className="text-xs text-muted-foreground">Primary login email address</div>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-teal/15 px-3 py-1 text-xs font-semibold text-teal">
                <Check className="h-3.5 w-3.5" /> Verified
              </span>
            </div>
          </div>

          {/* Change Password Form */}
          <form
            onSubmit={handleUpdatePassword}
            className="rounded-3xl border border-white/10 bg-surface/30 p-6 sm:p-8 space-y-6"
          >
            <h3 className="font-display text-lg font-bold">Change Password</h3>

            {securityMsg && (
              <div
                className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                  securityMsg.type === "success"
                    ? "bg-teal/10 border border-teal/30 text-teal"
                    : "bg-crimson/10 border border-crimson/30 text-crimson"
                }`}
              >
                {securityMsg.type === "success" ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0" />
                )}
                {securityMsg.text}
              </div>
            )}

            <div className="space-y-4 max-w-md">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="h-11 w-full rounded-xl border border-white/10 bg-background/60 px-4 text-sm outline-none focus:border-red-500/40"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-2">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="h-11 w-full rounded-xl border border-white/10 bg-background/60 px-4 text-sm outline-none focus:border-red-500/40"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-red-500 px-6 text-sm font-bold text-red-500-foreground transition hover:brightness-110 active:scale-95 disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <KeyRound className="h-4 w-4" />
                )}
                Update Password
              </button>
            </div>
          </form>

          {/* 2-Factor Authentication */}
          <div className="rounded-3xl border border-white/10 bg-surface/30 p-6 sm:p-8 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-red-500" />
                  <h3 className="font-display text-lg font-bold">
                    Two-Factor Authentication (2FA)
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground mt-1 max-w-md">
                  Add an extra layer of security to your studio account using an authenticator app.
                </p>
              </div>
              <button
                type="button"
                onClick={() => showToast("2FA setup initiated!")}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 text-xs font-semibold hover:bg-white/10 transition"
              >
                Enable 2FA
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
