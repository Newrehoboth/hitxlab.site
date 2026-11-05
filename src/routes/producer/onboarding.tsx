import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Camera,
  Image as ImageIcon,
  Instagram,
  Youtube,
  Globe,
  Check,
  ChevronRight,
  ChevronLeft,
  Music4,
  Sparkles,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/lib/store";
import { useProducerProfile, toRow, type ProducerProfile } from "@/lib/producer-profile";
import { supabase } from "@/integrations/supabase/client";
import hitxlabLogo from "@/assets/hitxlabLogo.png";

export const Route = createFileRoute("/producer/onboarding")({
  head: () => ({
    meta: [
      { title: "Set up your Producer Profile · HITXLAB" },
      {
        name: "description",
        content: "Complete your producer profile to start selling on HITXLAB.",
      },
      { property: "og:title", content: "Producer Onboarding · HITXLAB" },
      { property: "og:description", content: "Set up your studio profile on HITXLAB." },
    ],
  }),
  component: Onboarding,
});

const COLORS = [
  "oklch(0.8 0.155 72)",
  "oklch(0.72 0.13 195)",
  "oklch(0.65 0.22 22)",
  "oklch(0.7 0.18 300)",
  "oklch(0.75 0.18 140)",
  "oklch(0.7 0.18 240)",
];

function Onboarding() {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading, refresh } = useProducerProfile();
  const nav = useNavigate();

  useEffect(() => {
    if (authLoading || profileLoading) return;
    if (!user) nav({ to: "/auth", search: { mode: "signup" } });
    else if (user.role !== "producer") nav({ to: "/" });
    // Removed automatic redirect to dashboard - let dashboard handle its own protection
  }, [user, authLoading, profileLoading, nav]);

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [profilePicUrl, setProfilePicUrl] = useState<string | null>(null);
  const [coverBannerUrl, setCoverBannerUrl] = useState<string | null>(null);
  const [data, setData] = useState<ProducerProfile>({
    userId: "",
    producerName: user?.name ?? "",
    username: (user?.name ?? "").toLowerCase().replace(/[^a-z0-9]+/g, ""),
    bio: "",
    country: "",
    city: "",
    instagram: "",
    tiktok: "",
    youtube: "",
    spotify: "",
    website: "",
    brandColor: COLORS[0],
    producerTag: "prod. by " + (user?.name ?? "").toLowerCase(),
  });

  useEffect(() => {
    if (user)
      setData((d) => ({
        ...d,
        userId: user.id,
        producerName: d.producerName || user.name,
        producerTag: d.producerTag || "prod. by " + user.name.toLowerCase(),
      }));
  }, [user?.id]);

  const patch = (k: keyof ProducerProfile, v: any) => setData((d) => ({ ...d, [k]: v }));
  const steps = ["Basic info", "Social links", "Branding"];
  const canNext =
    (step === 0 && data.producerName && data.username) ||
    step === 1 ||
    (step === 2 && data.brandColor && data.producerTag);

  const resizeImage = (file: File, maxDim = 400): Promise<string> => {
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

  const uploadImage = async (file: File, type: "profile" | "cover") => {
    if (!user) return;
    setUploading(true);
    setErr(null);
    try {
      const base64Url = await resizeImage(file);
      if (type === "profile") {
        setProfilePicUrl(base64Url);
      } else {
        setCoverBannerUrl(base64Url);
      }
    } catch (e: any) {
      setErr(e?.message ?? "Failed to process image");
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: "profile" | "cover") => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setErr("Image must be less than 5MB");
        return;
      }
      uploadImage(file, type);
    }
  };

  const finish = async () => {
    if (!user) return;
    setErr(null);
    setSaving(true);
    try {
      const { error } = await supabase.from("producer_profiles").insert(
        toRow({
          ...data,
          userId: user.id,
          avatarUrl: profilePicUrl,
          bannerUrl: coverBannerUrl,
        }),
      );
      if (error) throw error;
      // Ensure profile row account_type is producer
      await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          account_type: "producer",
          name: data.producerName,
          email: user.email,
        });
      await refresh();
      nav({ to: "/producer/dashboard", search: { tab: "overview" } });
    } catch (e: any) {
      setErr(e?.message ?? "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen">
      <header className="border-b border-white/8 bg-surface/40 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center">
            <img src={hitxlabLogo} alt="HITXLAB" className="h-7 w-auto object-contain" />
          </Link>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] text-muted-foreground">
            <Sparkles className="h-3 w-3 text-red-500" /> Producer onboarding
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="mb-8 flex items-center gap-2 sm:gap-4">
          {steps.map((s, i) => (
            <div key={s} className="flex flex-1 items-center gap-2 sm:gap-3">
              <div
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold transition ${i < step ? "bg-teal text-black" : i === step ? "bg-red-500 text-red-500-foreground" : "bg-white/5 text-muted-foreground"}`}
              >
                {i < step ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <div className="hidden text-sm sm:block">
                <div
                  className={`font-semibold ${i === step ? "text-foreground" : "text-muted-foreground"}`}
                >
                  {s}
                </div>
              </div>
              {i < steps.length - 1 && <div className="h-px flex-1 bg-white/8" />}
            </div>
          ))}
        </div>

        <div className="rounded-3xl border border-white/8 bg-surface/50 p-6 sm:p-8">
          <h1 className="font-display text-2xl font-bold sm:text-3xl">{steps[step]}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {step === 0 &&
              "Tell artists who you are. This appears on every beat and your producer page."}
            {step === 1 &&
              "Link your channels so buyers can follow you across platforms. Optional."}
            {step === 2 && "Own your brand across the marketplace with a signature color and tag."}
          </p>

          <div className="mt-6 grid gap-5">
            {step === 0 && (
              <>
                <div className="grid gap-4 sm:grid-cols-[112px_1fr]">
                  <div>
                    <div className="text-xs font-semibold text-muted-foreground">
                      Profile picture
                    </div>
                    <label className="mt-2 grid h-24 w-24 cursor-pointer place-items-center rounded-2xl border border-dashed border-white/15 bg-white/[0.02] text-muted-foreground hover:border-red-500/40 hover:text-red-500 relative overflow-hidden">
                      {uploading && <Loader2 className="h-5 w-5 animate-spin absolute" />}
                      {profilePicUrl ? (
                        <img
                          src={profilePicUrl}
                          alt="Profile"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Camera className="h-5 w-5" />
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileSelect(e, "profile")}
                        className="hidden"
                        disabled={uploading}
                      />
                    </label>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-muted-foreground">Cover banner</div>
                    <label className="mt-2 flex h-24 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-white/15 bg-white/[0.02] text-sm text-muted-foreground hover:border-red-500/40 hover:text-red-500 relative overflow-hidden">
                      {uploading && <Loader2 className="h-5 w-5 animate-spin absolute" />}
                      {coverBannerUrl ? (
                        <img
                          src={coverBannerUrl}
                          alt="Cover"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <>
                          <ImageIcon className="h-4 w-4" /> Upload cover
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileSelect(e, "cover")}
                        className="hidden"
                        disabled={uploading}
                      />
                    </label>
                  </div>
                </div>
                <TwoCol>
                  <TextField
                    label="Producer name"
                    value={data.producerName}
                    onChange={(v) => patch("producerName", v)}
                    required
                  />
                  <TextField
                    label="Username"
                    value={data.username}
                    onChange={(v) => patch("username", v.toLowerCase().replace(/[^a-z0-9]+/g, ""))}
                    required
                    prefix="@"
                  />
                </TwoCol>
                <TextArea
                  label="Bio"
                  value={data.bio}
                  onChange={(v) => patch("bio", v)}
                  placeholder="A one-paragraph intro. Genres, credits, vibe."
                />
                <TwoCol>
                  <TextField
                    label="Country"
                    value={data.country}
                    onChange={(v) => patch("country", v)}
                  />
                  <TextField label="City" value={data.city} onChange={(v) => patch("city", v)} />
                </TwoCol>
              </>
            )}

            {step === 1 && (
              <div className="grid gap-3">
                <TextField
                  label="Instagram"
                  icon={<Instagram className="h-4 w-4" />}
                  placeholder="@handle"
                  value={data.instagram ?? ""}
                  onChange={(v) => patch("instagram", v)}
                />
                <TextField
                  label="TikTok"
                  placeholder="@handle"
                  value={data.tiktok ?? ""}
                  onChange={(v) => patch("tiktok", v)}
                />
                <TextField
                  label="YouTube"
                  icon={<Youtube className="h-4 w-4" />}
                  placeholder="Channel URL"
                  value={data.youtube ?? ""}
                  onChange={(v) => patch("youtube", v)}
                />
                <TextField
                  label="Spotify"
                  placeholder="Artist URL"
                  value={data.spotify ?? ""}
                  onChange={(v) => patch("spotify", v)}
                />
                <TextField
                  label="Website"
                  icon={<Globe className="h-4 w-4" />}
                  placeholder="https://"
                  value={data.website ?? ""}
                  onChange={(v) => patch("website", v)}
                />
              </div>
            )}

            {step === 2 && (
              <>
                <div>
                  <div className="text-xs font-semibold text-muted-foreground">
                    Primary brand color
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => patch("brandColor", c)}
                        className={`h-10 w-10 rounded-xl ring-offset-2 ring-offset-surface transition ${data.brandColor === c ? "ring-2 ring-white" : ""}`}
                        style={{ background: c }}
                      />
                    ))}
                  </div>
                </div>
                <TextField
                  label="Producer tag"
                  value={data.producerTag}
                  onChange={(v) => patch("producerTag", v)}
                  placeholder="prod. by yourname"
                  required
                />
              </>
            )}
          </div>

          {err && (
            <div className="mt-4 rounded-lg border border-crimson/30 bg-crimson/10 px-3 py-2 text-xs text-crimson">
              {err}
            </div>
          )}

          <div className="mt-8 flex items-center justify-between gap-3">
            <button
              onClick={() => (step === 0 ? nav({ to: "/" }) : setStep(step - 1))}
              className="inline-flex h-11 items-center gap-1 rounded-xl border border-white/10 px-4 text-sm font-medium hover:bg-white/5"
            >
              <ChevronLeft className="h-4 w-4" /> Back
            </button>
            {step < 2 ? (
              <button
                disabled={!canNext}
                onClick={() => setStep(step + 1)}
                className="inline-flex h-11 items-center gap-1 rounded-xl bg-gradient-to-b from-[#EF4444] to-[#DC2626] px-5 text-sm font-semibold text-black transition hover:brightness-105 disabled:opacity-40"
              >
                Continue <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={finish}
                disabled={saving}
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-b from-[#EF4444] to-[#DC2626] px-6 text-sm font-semibold text-black transition hover:brightness-105 disabled:opacity-70"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Enter dashboard <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TwoCol({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2">{children}</div>;
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  required,
  icon,
  prefix,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  icon?: React.ReactNode;
  prefix?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">
        {label} {required && <span className="text-crimson">*</span>}
      </span>
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {icon}
          </span>
        )}
        {prefix && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            {prefix}
          </span>
        )}
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`h-11 w-full rounded-xl border border-white/10 bg-background/50 text-sm outline-none transition placeholder:text-muted-foreground/50 focus:border-red-500/40 focus:ring-4 focus:ring-red-500/15 ${icon || prefix ? "pl-9 pr-3" : "px-3"}`}
        />
      </div>
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={4}
        className="w-full rounded-xl border border-white/10 bg-background/50 p-3 text-sm outline-none transition placeholder:text-muted-foreground/50 focus:border-red-500/40 focus:ring-4 focus:ring-red-500/15"
      />
    </label>
  );
}
