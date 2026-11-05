import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import {
  Mail,
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  ArrowLeft,
  Music4,
  Mic2,
  Headphones,
  Loader2,
  Sparkles,
  KeyRound,
  CheckCircle2,
} from "lucide-react";
import { useAuth, type Role } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { sendWelcomeEmailFn } from "@/lib/email.functions";
import hitxlabLogo from "@/assets/hitxlabLogo.png";

const searchSchema = z.object({
  mode: z.enum(["signin", "signup"]).optional().default("signin"),
});

export const Route = createFileRoute("/auth")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [
      { title: "Sign in · HITXLAB" },
      { name: "description", content: "Sign in or join HITXLAB — the premium beats marketplace." },
      { property: "og:title", content: "Sign in · HITXLAB" },
      { property: "og:description", content: "Join the premium beats marketplace." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { mode } = Route.useSearch();
  const nav = useNavigate();
  const { signIn, signUp, verifyOtp, resendOtp } = useAuth();
  const sendWelcome = useServerFn(sendWelcomeEmailFn);
  const isSignup = mode === "signup";

  const [step, setStep] = useState<"role" | "form" | "verify">(isSignup ? "role" : "form");
  const [role, setRole] = useState<Role>("artist");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [otp, setOtp] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const routeAfter = async (accountType: Role, userId: string) => {
    if (accountType === "producer") {
      // Check if producer has profile
      const { data: profile } = await supabase
        .from("producer_profiles")
        .select("user_id")
        .eq("user_id", userId)
        .maybeSingle();
      
      // If profile exists, go to dashboard; otherwise onboarding
      if (profile) {
        nav({ to: "/producer/dashboard", search: { tab: "overview" } });
      } else {
        nav({ to: "/producer/onboarding" });
      }
    } else {
      nav({ to: "/artist/dashboard", search: { tab: "overview" } });
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setInfo(null);
    setLoading(true);
    try {
      if (isSignup) {
        const result = await signUp(name || email.split("@")[0], email, pw, role);
        
        // Check if user was auto-confirmed and signed in immediately
        if ('id' in result) {
          // User is auto-confirmed, route them immediately
          console.log("🔍 Sign-up successful (auto-confirmed). User:", result);
          console.log("🔍 User role:", result.role);
          
          // Send welcome email
          sendWelcome({ data: { role: result.role } }).catch((e) => console.error("[welcome-email]", e));
          
          await routeAfter(result.role, result.id);
        } else {
          // Fallback: needs verification (shouldn't happen with auto-confirm enabled)
          setStep("verify");
          setInfo("We sent a 6-digit code to your email. Enter it below to activate your account.");
        }
      } else {
        const u = await signIn(email, pw);
        console.log("🔍 Sign-in successful. User:", u);
        console.log("🔍 User role:", u.role);
        console.log("🔍 Routing to:", u.role === "producer" ? "/producer/dashboard or /producer/onboarding" : "/artist/dashboard");
        await routeAfter(u.role, u.id);
      }
    } catch (e: any) {
      setErr(e?.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const u = await verifyOtp(email, otp.trim());
      // Fire welcome email — don't block routing
      sendWelcome({ data: { role: u.role } }).catch((e) => console.error("[welcome-email]", e));
      await routeAfter(u.role, u.id);
    } catch (e: any) {
      setErr(e?.message ?? "Invalid or expired code");
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    setErr(null);
    setInfo(null);
    try {
      await resendOtp(email);
      setInfo("New code sent — check your inbox.");
    } catch (e: any) {
      setErr(e?.message ?? "Failed to resend");
    }
  };

  return (
    <div className="relative flex min-h-screen">
      <div className="relative hidden overflow-hidden lg:flex lg:w-1/2">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,oklch(0.6_0.2_35/0.5),transparent_55%),radial-gradient(circle_at_80%_80%,oklch(0.55_0.18_210/0.55),transparent_55%),linear-gradient(180deg,oklch(0.15_0.02_265),oklch(0.1_0.015_265))]" />
        <div className="relative z-10 flex w-full flex-col justify-between p-12">
          <Link to="/" className="flex w-fit items-center">
            <img src={hitxlabLogo} alt="HITXLAB" className="h-8 w-auto object-contain" />
          </Link>
          <div>
            <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white/80 backdrop-blur">
              <Sparkles className="h-3 w-3 text-red-500" /> Trusted by Warner, Sony & Universal
            </div>
            <h2 className="font-display text-5xl font-bold leading-[1.05] text-white">
              Your first hit
              <br />
              starts <span className="text-gradient-red">here.</span>
            </h2>
            <p className="mt-4 max-w-md text-white/70">
              Join thousands of producers and artists shaping tomorrow's sound.
            </p>
          </div>
          <div className="text-xs text-white/40">© 2026 HITXLAB, Inc.</div>
        </div>
      </div>

      <div className="flex w-full flex-col justify-center px-6 py-10 lg:w-1/2 lg:px-16">
        <Link to="/" className="mb-8 inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to marketplace
        </Link>

        <div className="mx-auto w-full max-w-md">
          {step !== "verify" && (
            <div className="mb-6 grid grid-cols-2 rounded-xl border border-white/8 bg-surface/50 p-1">
              <button
                onClick={() => {
                  nav({ to: "/auth", search: { mode: "signin" } });
                  setStep("form");
                }}
                className={`h-10 rounded-lg text-sm font-semibold transition ${
                  !isSignup ? "bg-surface-2 text-foreground shadow-sm" : "text-muted-foreground"
                }`}
              >
                Sign in
              </button>
              <button
                onClick={() => {
                  nav({ to: "/auth", search: { mode: "signup" } });
                  setStep("role");
                }}
                className={`h-10 rounded-lg text-sm font-semibold transition ${
                  isSignup ? "bg-surface-2 text-foreground shadow-sm" : "text-muted-foreground"
                }`}
              >
                Create account
              </button>
            </div>
          )}

          {isSignup && step === "role" && (
            <>
              <h1 className="font-display text-3xl font-bold">Choose your path</h1>
              <p className="mt-2 text-sm text-muted-foreground">You can change this later in settings.</p>
              <div className="mt-6 grid gap-3">
                <RoleCard active={role === "producer"} onClick={() => setRole("producer")} icon={<Headphones className="h-5 w-5" />} title="I'm a Producer" desc="Upload beats, manage licenses, grow your audience." />
                <RoleCard active={role === "artist"} onClick={() => setRole("artist")} icon={<Mic2 className="h-5 w-5" />} title="I'm an Artist" desc="Discover beats, follow producers, purchase licenses." />
              </div>
              <button onClick={() => setStep("form")} className="mt-6 h-12 w-full rounded-xl bg-gradient-to-b from-[#EF4444] to-[#DC2626] font-semibold text-black shadow-[0_15px_35px_-10px_rgb(239_68_68/0.6)] transition hover:brightness-105">
                Continue as {role === "producer" ? "Producer" : "Artist"}
              </button>
            </>
          )}

          {step === "form" && (
            <>
              <h1 className="font-display text-3xl font-bold">{isSignup ? "Create your account" : "Welcome back"}</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {isSignup ? "Join thousands of producers and artists on HITXLAB." : "Sign in to continue."}
              </p>
              <form onSubmit={submit} className="mt-6 space-y-3">
                {isSignup && (
                  <Field icon={<UserIcon className="h-4 w-4" />} placeholder="Your name or stage name" value={name} onChange={setName} required />
                )}
                <Field icon={<Mail className="h-4 w-4" />} type="email" placeholder="you@studio.com" value={email} onChange={setEmail} required />
                <div className="relative">
                  <Field icon={<Lock className="h-4 w-4" />} type={showPw ? "text" : "password"} placeholder={isSignup ? "Create a password (min 8 chars)" : "Password"} value={pw} onChange={setPw} required minLength={isSignup ? 8 : undefined} />
                  <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {err && <div className="rounded-lg border border-crimson/30 bg-crimson/10 px-3 py-2 text-xs text-crimson">{err}</div>}
                <button disabled={loading} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#EF4444] to-[#DC2626] font-semibold text-black shadow-[0_15px_35px_-10px_rgb(239_68_68/0.6)] transition hover:brightness-105 disabled:opacity-70">
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {isSignup ? "Create account" : "Sign in"}
                </button>
              </form>
              <p className="mt-6 text-center text-xs text-muted-foreground">
                By continuing you agree to our Terms and Privacy Policy.
              </p>
            </>
          )}

          {step === "verify" && (
            <>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-teal/30 bg-teal/10 px-3 py-1 text-xs font-semibold text-teal">
                <CheckCircle2 className="h-3.5 w-3.5" /> Almost there
              </div>
              <h1 className="font-display text-3xl font-bold">Verify your email</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                We sent a 6-digit code to <span className="font-semibold text-foreground">{email}</span>. Paste it below — or click the link in the email.
              </p>
              <form onSubmit={verify} className="mt-6 space-y-3">
                <Field icon={<KeyRound className="h-4 w-4" />} placeholder="6-digit code" value={otp} onChange={setOtp} required inputMode="numeric" maxLength={6} />
                {info && <div className="rounded-lg border border-teal/30 bg-teal/10 px-3 py-2 text-xs text-teal">{info}</div>}
                {err && <div className="rounded-lg border border-crimson/30 bg-crimson/10 px-3 py-2 text-xs text-crimson">{err}</div>}
                <button disabled={loading || otp.length < 6} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#EF4444] to-[#DC2626] font-semibold text-black transition hover:brightness-105 disabled:opacity-70">
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Verify & continue
                </button>
              </form>
              <div className="mt-4 flex items-center justify-between text-xs">
                <button onClick={resend} className="text-red-500 hover:underline">Resend code</button>
                <button onClick={() => setStep("form")} className="text-muted-foreground hover:text-foreground">Use a different email</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

type FieldProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> & {
  icon: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
};
function Field({ icon, value, onChange, ...rest }: FieldProps) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">{icon}</span>
      <input {...rest} value={value} onChange={(e) => onChange(e.target.value)} className="h-12 w-full rounded-xl border border-white/10 bg-surface/60 pl-10 pr-10 text-sm outline-none transition placeholder:text-muted-foreground/60 focus:border-red-500/40 focus:bg-surface focus:ring-4 focus:ring-red-500/15" />
    </div>
  );
}

function RoleCard({ active, onClick, icon, title, desc }: { active: boolean; onClick: () => void; icon: React.ReactNode; title: string; desc: string }) {
  return (
    <button onClick={onClick} className={`flex items-start gap-4 rounded-2xl border p-4 text-left transition ${active ? "border-red-500/50 bg-red-500/5 ring-2 ring-red-500/20" : "border-white/10 bg-surface/40 hover:border-white/20 hover:bg-surface/70"}`}>
      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${active ? "bg-red-500 text-white" : "bg-white/5 text-foreground"}`}>{icon}</span>
      <div>
        <div className="font-semibold">{title}</div>
        <div className="mt-0.5 text-sm text-muted-foreground">{desc}</div>
      </div>
    </button>
  );
}
