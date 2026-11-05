import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Beat } from "@/data/beats";
import type { License } from "@/lib/licenses";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";
import { recordBeatPlay, getBeatPlays } from "@/lib/plays-store";

/* ---------------- Auth ---------------- */

export type Role = "producer" | "artist" | "admin";
export type User = { id: string; name: string; email: string; role: Role };

type AuthCtx = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<User>;
  signUp: (name: string, email: string, password: string, role: Role) => Promise<User | { needsVerification: true; email: string }>;
  verifyOtp: (email: string, token: string) => Promise<User>;
  resendOtp: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
};
const AuthContext = createContext<AuthCtx | null>(null);

/* ---------------- Cart ---------------- */

export type CartItem = {
  id: string;
  beat: Beat;
  license: License;
  contractVersion: number;
  acceptedAt: string;
};

type CartCtx = {
  items: CartItem[];
  addWithLicense: (beat: Beat, license: License) => void;
  remove: (id: string) => void;
  clear: () => void;
  open: boolean;
  setOpen: (v: boolean) => void;
  total: number;
};
const CartContext = createContext<CartCtx | null>(null);

/* ---------------- Player ---------------- */

type PlayerCtx = {
  current: Beat | null;
  queue: Beat[];
  isPlaying: boolean;
  progress: number;
  currentTime: number;
  duration: number;
  volume: number;
  queueOpen: boolean;
  setQueueOpen: (v: boolean) => void;
  play: (beat: Beat, queue?: Beat[]) => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  seek: (fraction: number) => void;
  setVolume: (v: number) => void;
  addToQueue: (b: Beat) => void;
  removeFromQueue: (id: string) => void;
};
const PlayerContext = createContext<PlayerCtx | null>(null);

async function loadUser(session: Session | null): Promise<User | null> {
  if (!session?.user) return null;
  const meta = session.user.user_metadata ?? {};
  // Try DB profile; if not yet there (trigger race), fall back to metadata.
  const { data } = await supabase
    .from("profiles")
    .select("id, name, email, account_type")
    .eq("id", session.user.id)
    .maybeSingle();
  
  const user = {
    id: session.user.id,
    email: session.user.email ?? data?.email ?? "",
    name: data?.name || meta.name || (session.user.email ?? "").split("@")[0] || "User",
    role: (data?.account_type as Role) ?? (meta.account_type as Role) ?? "artist",
  };
  
  console.log("🔍 loadUser - DB data:", data);
  console.log("🔍 loadUser - metadata:", meta);
  console.log("🔍 loadUser - final user:", user);
  
  return user;
}

export function AppProviders({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      // Defer to avoid deadlock
      setTimeout(() => {
        loadUser(s).then((u) => {
          setUser(u);
          setLoading(false);
        });
      }, 0);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      loadUser(data.session).then((u) => {
        setUser(u);
        setLoading(false);
      });
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const auth: AuthCtx = {
    user,
    session,
    loading,
    async signIn(email, password) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const u = await loadUser(data.session);
      if (!u) throw new Error("Sign-in failed");
      return u;
    },
    async signUp(name, email, password, role) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name, account_type: role },
          emailRedirectTo: `${window.location.origin}/`,
        },
      });
      if (error) throw error;
      
      // Since auto-confirm is enabled, user is already confirmed
      // Load the user immediately instead of requiring OTP
      if (data.session) {
        const u = await loadUser(data.session);
        if (u) {
          return u; // Return user directly, no verification needed
        }
      }
      
      // Fallback: if for some reason session not created, ask for verification
      return { needsVerification: true, email };
    },
    async verifyOtp(email, token) {
      const { data, error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
      if (error) throw error;
      const u = await loadUser(data.session);
      if (!u) throw new Error("Verification failed");
      return u;
    },
    async resendOtp(email) {
      const { error } = await supabase.auth.resend({ type: "signup", email });
      if (error) throw error;
    },
    async signOut() {
      await supabase.auth.signOut();
    },
  };

  // Cart (client-only)
  const [items, setItems] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const cart: CartCtx = {
    items,
    open: cartOpen,
    setOpen: setCartOpen,
    total: items.reduce((s, i) => s + i.license.price, 0),
    addWithLicense(beat, license) {
      setItems((prev) => {
        if (prev.find((x) => x.beat.id === beat.id && x.license.type === license.type)) return prev;
        return [
          ...prev,
          {
            id: `${beat.id}-${license.type}-${Date.now()}`,
            beat,
            license,
            contractVersion: license.version,
            acceptedAt: new Date().toISOString(),
          },
        ];
      });
      setCartOpen(true);
    },
    remove(id) {
      setItems((prev) => prev.filter((i) => i.id !== id));
    },
    clear() {
      setItems([]);
    },
  };

  // Player
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [current, setCurrent] = useState<Beat | null>(null);
  const [queue, setQueue] = useState<Beat[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.9);
  const [queueOpen, setQueueOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const el = new Audio();
    el.preload = "metadata";
    el.volume = volume;
    audioRef.current = el;
    const onTime = () => setCurrentTime(el.currentTime);
    const onLoaded = () => setDuration(el.duration || 0);
    const onEnded = () => {
      setQueue((q) => {
        if (q.length === 0) {
          setIsPlaying(false);
          return q;
        }
        const [nextBeat, ...rest] = q;
        setCurrent(nextBeat);
        el.src = nextBeat.audio;
        el.play().catch(() => {});
        setIsPlaying(true);
        return rest;
      });
    };
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("loadedmetadata", onLoaded);
    el.addEventListener("ended", onEnded);
    el.addEventListener("play", () => setIsPlaying(true));
    el.addEventListener("pause", () => setIsPlaying(false));
    return () => {
      el.pause();
      el.src = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const play = (beat: Beat, newQueue?: Beat[]) => {
    const el = audioRef.current;
    if (!el || !beat.audio) return;
    
    // Increment play count (in memory, localStorage, event broadcast, and Supabase DB)
    recordBeatPlay(beat).then((updatedPlays) => {
      setCurrent((c) => (c && c.id === beat.id ? { ...c, plays: updatedPlays } : c));
    });

    const updatedBeat = { ...beat, plays: getBeatPlays(beat.id, beat.plays) };
    setCurrent(updatedBeat);
    if (newQueue) setQueue(newQueue.filter((b) => b.id !== beat.id));
    el.src = beat.audio;
    el.play().catch(() => {});
    setIsPlaying(true);
  };

  const player: PlayerCtx = {
    current,
    queue,
    isPlaying,
    progress: duration ? currentTime / duration : 0,
    currentTime,
    duration,
    volume,
    queueOpen,
    setQueueOpen,
    play,
    toggle() {
      const el = audioRef.current;
      if (!el || !current) return;
      if (el.paused) el.play().catch(() => {});
      else el.pause();
    },
    next() {
      setQueue((q) => {
        if (q.length === 0) return q;
        const [n, ...rest] = q;
        const el = audioRef.current!;
        setCurrent(n);
        el.src = n.audio;
        el.play().catch(() => {});
        return rest;
      });
    },
    prev() {
      const el = audioRef.current;
      if (el) el.currentTime = 0;
    },
    seek(f) {
      const el = audioRef.current;
      if (el && duration) el.currentTime = f * duration;
    },
    setVolume(v) {
      setVolumeState(v);
      if (audioRef.current) audioRef.current.volume = v;
    },
    addToQueue(b) {
      setQueue((q) => (q.find((x) => x.id === b.id) ? q : [...q, b]));
    },
    removeFromQueue(id) {
      setQueue((q) => q.filter((b) => b.id !== id));
    },
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const t = (e.target as HTMLElement)?.tagName;
      if (t === "INPUT" || t === "TEXTAREA") return;
      if (e.code === "Space" && current) {
        e.preventDefault();
        player.toggle();
      }
      if (e.code === "ArrowRight" && e.shiftKey) player.next();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, queue]);

  const authMemo = useMemo(() => auth, [user, session, loading]);
  const cartMemo = useMemo(() => cart, [items, cartOpen]);
  const playerMemo = useMemo(
    () => player,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [current, queue, isPlaying, currentTime, duration, volume, queueOpen],
  );

  return (
    <AuthContext.Provider value={authMemo}>
      <CartContext.Provider value={cartMemo}>
        <PlayerContext.Provider value={playerMemo}>{children}</PlayerContext.Provider>
      </CartContext.Provider>
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const c = useContext(AuthContext);
  if (!c) throw new Error("useAuth outside provider");
  return c;
};
export const useCart = () => {
  const c = useContext(CartContext);
  if (!c) throw new Error("useCart outside provider");
  return c;
};
export const usePlayer = () => {
  const c = useContext(PlayerContext);
  if (!c) throw new Error("usePlayer outside provider");
  return c;
};

export const fmtTime = (s: number) => {
  if (!Number.isFinite(s)) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

export const fmtPlays = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${n}`;
};
