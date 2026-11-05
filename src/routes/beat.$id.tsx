import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, BadgeCheck, Check, FileText, Music4, Play, Pause, ShoppingBag, Star, X, Sparkles, ShieldCheck, Loader2, MessageSquare } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Player } from "@/components/Player";
import { CartDrawer } from "@/components/CartDrawer";
import { BeatCard } from "@/components/BeatCard";
import { LikeButton } from "@/components/LikeButton";
import { ShareMenu } from "@/components/ShareMenu";
import { useCart, usePlayer, useAuth, fmtPlays } from "@/lib/store";
import { useBeatPlays } from "@/lib/plays-store";
import { fmtNaira, fmtLicensePrice } from "@/lib/currency";
import type { License } from "@/lib/licenses";
import type { Beat } from "@/data/beats";
import { fetchBeatById, fetchPublishedBeats } from "@/lib/beats-api";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/beat/$id")({
  loader: async ({ params }) => {
    try {
      const beat = await fetchBeatById(params.id);
      return { beat };
    } catch {
      return { beat: null };
    }
  },
  head: ({ loaderData }) => {
    const beat = loaderData?.beat;
    const title = beat ? `${beat.title} by ${beat.producer} · HITXLAB` : "Beat · HITXLAB";
    const desc = beat
      ? `Listen to and license "${beat.title}" (${beat.genre}, ${beat.bpm} BPM) by ${beat.producer} on HITXLAB.`
      : "Preview and license premium beats on HITXLAB.";
    const cover = beat?.cover || "https://hitxlab.com.ng/favicon-512.png";

    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:type", content: "music.song" },
        { property: "og:site_name", content: "HITXLAB" },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:image", content: cover },
        { property: "og:image:secure_url", content: cover },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: desc },
        { name: "twitter:image", content: cover },
      ],
    };
  },
  component: BeatDetails,
});

function BeatDetails() {
  const { id } = Route.useParams();
  const loaderData = Route.useLoaderData();
  const nav = useNavigate();
  const { user } = useAuth();
  const { play, current, isPlaying, toggle } = usePlayer();
  const { addWithLicense } = useCart();

  const [beat, setBeat] = useState<Beat | null>(loaderData?.beat ?? null);
  const [related, setRelated] = useState<Beat[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<License | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [viewing, setViewing] = useState<License | null>(null);
  const [negotiateOpen, setNegotiateOpen] = useState(false);

  const livePlays = useBeatPlays(beat?.id ?? id, beat?.plays ?? 0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    (async () => {
      const b = await fetchBeatById(id);
      if (!alive) return;
      setBeat(b);
      setSelected(b?.licenses[1] ?? b?.licenses[0] ?? null);
      if (b) {
        const all = await fetchPublishedBeats(20);
        if (!alive) return;
        const rel = all.filter((x) => x.id !== b.id && x.genre === b.genre).slice(0, 4);
        const fill = rel.length < 4 ? [...rel, ...all.filter((x) => !rel.find((r) => r.id === x.id) && x.id !== b.id)].slice(0, 4) : rel;
        setRelated(fill);
      }
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [id]);

  // Update dynamic page head meta tags for social media link previews (X, Facebook, WhatsApp, etc.)
  useEffect(() => {
    if (!beat) return;

    document.title = `${beat.title} by ${beat.producer} · HITXLAB`;

    const setMeta = (attr: "property" | "name", key: string, content: string) => {
      let tag = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
      if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute(attr, key);
        document.head.appendChild(tag);
      }
      tag.setAttribute("content", content);
    };

    const titleText = `Check out "${beat.title}" by ${beat.producer} on HITXLAB`;
    const descText = `Listen and license "${beat.title}" (${beat.genre}, ${beat.bpm} BPM, Key: ${beat.key}) by ${beat.producer} on HITXLAB.`;

    setMeta("property", "og:title", titleText);
    setMeta("name", "twitter:title", titleText);
    setMeta("property", "og:description", descText);
    setMeta("name", "twitter:description", descText);
    setMeta("name", "twitter:card", "summary_large_image");

    if (beat.cover) {
      setMeta("property", "og:image", beat.cover);
      setMeta("name", "twitter:image", beat.cover);
    }
  }, [beat]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!beat) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white/5"><Music4 className="h-6 w-6 text-muted-foreground" /></div>
        <h1 className="font-display text-2xl font-bold">Beat not found</h1>
        <Link to="/" className="text-sm text-red-500 hover:underline">Back to marketplace</Link>
      </div>
    );
  }

  const isCurrent = current?.id === beat.id;
  const canAdd = selected && accepted;

  return (
    <div className="flex min-h-screen flex-col pb-40">
      <Navbar />
      <CartDrawer />

      <div className="mx-auto w-full max-w-7xl px-4 pt-6 sm:px-6">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to marketplace
        </Link>
      </div>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 opacity-40" style={{ backgroundImage: `url(${beat.cover})`, backgroundSize: "cover", backgroundPosition: "center", filter: "blur(80px) saturate(1.4)" }} />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-background/50 via-background/80 to-background" />

        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[420px_1fr] lg:gap-12 lg:py-14">
          <div className="relative">
            <div className="absolute -inset-6 -z-10 rounded-[36px] bg-[radial-gradient(circle_at_30%_20%,oklch(0.75_0.17_60/0.35),transparent_60%)] blur-2xl" />
            <div className="relative overflow-hidden rounded-3xl shadow-[0_40px_100px_-30px_rgba(0,0,0,0.8)]">
              <img src={beat.cover} alt={beat.title} className="aspect-square w-full object-cover" />
              <button onClick={() => (isCurrent ? toggle() : play(beat))} className="absolute bottom-5 right-5 grid h-16 w-16 place-items-center rounded-full bg-red-500 text-red-500-foreground shadow-[0_15px_40px_-8px_oklch(0.75_0.16_65/0.7)] transition hover:scale-105 active:scale-95">
                {isCurrent && isPlaying ? <Pause className="h-7 w-7 fill-current" /> : <Play className="ml-0.5 h-7 w-7 fill-current" />}
              </button>
            </div>
          </div>

          <div>
            <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-muted-foreground">
              <Sparkles className="h-3 w-3 text-red-500" /> {beat.genre} · {beat.bpm} BPM · {beat.key}
            </div>
            <h1 className="font-display text-4xl font-bold leading-tight sm:text-6xl">{beat.title}</h1>
            <div className="mt-3 inline-flex items-center gap-2 text-base text-muted-foreground">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-teal to-red-600 text-xs font-bold text-black">{beat.producer.slice(0, 1)}</span>
              <span>{beat.producer}</span>
              {beat.producerVerified && <BadgeCheck className="h-4 w-4 text-teal" />}
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[{ k: "BPM", v: String(beat.bpm) }, { k: "Key", v: beat.key }, { k: "Plays", v: fmtPlays(livePlays) }, { k: "Genre", v: beat.genre }].map((s) => (
                <div key={s.k} className="rounded-xl border border-white/8 bg-surface/50 px-3 py-2.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{s.k}</div>
                  <div className="mt-0.5 text-sm font-semibold">{s.v}</div>
                </div>
              ))}
            </div>

            {beat.tags.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-1.5">
                {beat.tags.map((t) => (<span key={t} className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs text-muted-foreground">#{t}</span>))}
              </div>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <LikeButton beatId={beat.id} size="lg" />
              <ShareMenu url={`/beat/${beat.id}`} title={beat.title} coverUrl={beat.cover} />
            </div>

            {beat.description && <p className="mt-6 max-w-2xl text-sm leading-relaxed text-muted-foreground">{beat.description}</p>}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6">
        <div className="mb-6">
          <div className="mb-2 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-red-500">
            <FileText className="h-3.5 w-3.5" /> Choose your license
          </div>
          <h2 className="font-display text-3xl font-bold sm:text-4xl">Pick the rights that fit your release</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {beat.licenses.map((lic) => {
            const active = selected?.type === lic.type;
            return (
              <div key={lic.id} className={`relative flex flex-col rounded-2xl border p-5 transition ${active ? "border-red-500/60 bg-red-500/[0.06] shadow-[0_20px_50px_-20px_oklch(0.7_0.17_55/0.5)]" : "border-white/10 bg-surface/50 hover:border-white/20"}`}>
                {lic.exclusive && <span className="absolute -top-2.5 right-4 rounded-full bg-crimson px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">Exclusive</span>}
                <div className="flex items-baseline justify-between">
                  <div className="font-display text-lg font-bold">{lic.name}</div>
                  <div className="font-display text-xl font-bold text-red-500">{fmtLicensePrice(lic)}</div>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">{lic.commercialRights}</div>
                <ul className="mt-4 space-y-2 text-sm">
                  <Row label="Files" value={lic.files.join(" · ")} />
                  <Row label="Streaming" value={lic.streamingLimit} />
                  <Row label="Distribution" value={lic.distributionLimit} />
                </ul>
                <div className="mt-5 flex flex-col gap-2">
                  <button onClick={() => setViewing(lic)} className="flex h-9 items-center justify-center gap-1.5 rounded-lg border border-white/10 text-xs font-semibold hover:bg-white/5">
                    <FileText className="h-3.5 w-3.5" /> View agreement
                  </button>
                  <button onClick={() => { setSelected(lic); setAccepted(false); }} className={`flex h-10 items-center justify-center gap-1.5 rounded-lg text-sm font-bold transition ${active ? "bg-red-500 text-red-500-foreground" : "border border-white/15 text-foreground hover:bg-white/5"}`}>
                    {active ? (<><Check className="h-4 w-4" /> Selected</>) : "Select license"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {selected && (
          <div className="mt-8 rounded-2xl border border-white/10 bg-surface/60 p-5 sm:p-6">
            <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-red-500">Selected</div>
                <div className="mt-1 font-display text-xl font-bold">{selected.name} License · {fmtLicensePrice(selected)}</div>
                <label className="mt-3 flex cursor-pointer items-start gap-2.5 text-sm">
                  <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 rounded accent-[oklch(0.8_0.155_72)]" />
                  <span className="text-muted-foreground">
                    I have read and agree to this <button onClick={() => setViewing(selected)} className="font-semibold text-red-500 underline underline-offset-2">License Agreement</button>.
                  </span>
                </label>
              </div>

              {selected.isNegotiable ? (
                <button
                  disabled={!accepted}
                  onClick={() => {
                    if (!user) {
                      nav({ to: "/auth", search: { mode: "signin" } });
                    } else {
                      setNegotiateOpen(true);
                    }
                  }}
                  className="flex h-14 items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-blue-600 to-indigo-600 px-8 font-semibold text-white shadow-lg transition hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <MessageSquare className="h-4 w-4" /> Make an Offer / Negotiate Price
                </button>
              ) : (
                <button disabled={!canAdd} onClick={() => selected && addWithLicense(beat, selected)} className="flex h-14 items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#EF4444] to-[#DC2626] px-8 font-semibold text-black shadow-[0_15px_35px_-10px_oklch(0.7_0.17_55/0.6)] transition hover:brightness-105 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40">
                  <ShoppingBag className="h-4 w-4" /> Add to cart · {fmtNaira(selected.price)}
                </button>
              )}
            </div>
            {!accepted && (
              <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-teal" /> Accept the agreement to unlock purchase or negotiation.
              </div>
            )}
          </div>
        )}
      </section>

      {related.length > 0 && (
        <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
          <h2 className="mb-4 font-display text-2xl font-bold">Related beats</h2>
          <div className="flex gap-4 overflow-x-auto pb-4 pt-1 snap-x snap-mandatory scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-3 lg:grid-cols-4 sm:overflow-visible sm:pb-0">
            {related.map((b) => (
              <div key={b.id} className="w-[250px] shrink-0 snap-start sm:w-auto">
                <BeatCard beat={b} />
              </div>
            ))}
          </div>
        </section>
      )}

      {viewing && <ContractModal license={viewing} beat={beat.title} producer={beat.producer} onClose={() => setViewing(null)} />}
      {negotiateOpen && selected && (
        <NegotiateModal
          beat={beat}
          license={selected}
          producer={beat.producer}
          onClose={() => setNegotiateOpen(false)}
        />
      )}
      <Player />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex items-start gap-2">
      <Check className="mt-0.5 h-4 w-4 shrink-0 text-teal" />
      <span className="text-muted-foreground"><span className="font-semibold text-foreground">{label}:</span> {value}</span>
    </li>
  );
}

function ContractModal({ license, beat, producer, onClose }: { license: License; beat: string; producer: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-background shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/8 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-red-500/15 text-red-500"><Music4 className="h-4 w-4" /></span>
            <div>
              <div className="font-display text-base font-bold">{license.name} License Agreement</div>
              <div className="text-xs text-muted-foreground">{beat} · Prod. {producer} · v{license.version}</div>
            </div>
          </div>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-lg hover:bg-white/5"><X className="h-4 w-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-8 py-6">
          <article className="whitespace-pre-wrap font-sans text-[13.5px] leading-7 text-foreground/90">{license.contract}</article>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-white/8 px-6 py-4">
          <div className="text-xs text-muted-foreground">Included files: <span className="font-semibold text-foreground">{license.files.join(" · ")}</span></div>
          <button onClick={onClose} className="h-10 rounded-xl bg-foreground px-5 text-sm font-semibold text-background hover:brightness-95">Close</button>
        </div>
      </div>
    </div>
  );
}

function NegotiateModal({
  beat,
  license,
  producer,
  onClose,
}: {
  beat: Beat;
  license: License;
  producer: string;
  onClose: () => void;
}) {
  const [offerAmount, setOfferAmount] = useState<string>("250000");
  const [message, setMessage] = useState<string>("");
  const [sent, setSent] = useState(false);

  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);

    if (user) {
      const numericPrice = parseFloat(offerAmount) || 0;
      const initialMsg = message || `Submitted an offer of ₦${numericPrice.toLocaleString()} for ${license.name} license.`;

      // Save local state fallback
      const newOffer = {
        id: "off-" + Date.now(),
        beat_title: beat.title,
        producer,
        producer_id: beat.producerId ?? "",
        offer_amount: numericPrice,
        status: "pending",
        date: "Just now",
        messages: [
          {
            sender: "artist" as const,
            text: initialMsg,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ],
      };

      try {
        const key = `artist_offers_${user.id}`;
        const existing = JSON.parse(localStorage.getItem(key) || "[]");
        localStorage.setItem(key, JSON.stringify([newOffer, ...existing]));
      } catch (err) {
        console.error("Error saving offer:", err);
      }

      // Sync to Supabase negotiations table
      try {
        console.log("🔍 Artist creating negotiation for beat:", beat.id);
        let prodId = beat.producerId;
        if (!prodId) {
          const { data: bRow } = await supabase.from("beats").select("producer_id").eq("id", beat.id).maybeSingle();
          if (bRow) prodId = bRow.producer_id;
        }
        console.log("🔍 Producer ID:", prodId);
        console.log("🔍 Artist ID:", user.id);

        if (prodId) {
          const { data: neg, error: negErr } = await (supabase as any)
            .from("negotiations")
            .insert({
              beat_id: beat.id,
              beat_title: beat.title,
              producer_id: prodId,
              artist_id: user.id,
              artist_name: user.name || user.email?.split("@")[0] || "Artist",
              artist_email: user.email || "",
              license_name: license.name,
              offer_amount: numericPrice,
              status: "pending",
            })
            .select()
            .single();

          console.log("🔍 Negotiation created:", neg);
          console.log("🔍 Negotiation error:", negErr);

          if (!negErr && neg) {
            const { data: msgData, error: msgErr } = await (supabase as any).from("negotiation_messages").insert({
              negotiation_id: neg.id,
              sender_id: user.id,
              sender_role: "artist",
              body: initialMsg,
            });
            console.log("🔍 Message created:", msgData);
            console.log("🔍 Message error:", msgErr);
          }
        }
      } catch (e) {
        console.warn("🔍 Supabase negotiation insert error:", e);
      }
    }

    setTimeout(() => {
      onClose();
    }, 2500);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-white/10 bg-background p-6 shadow-2xl sm:p-8">
        <button
          onClick={onClose}
          className="absolute right-5 top-5 grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-white/5 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>

        {sent ? (
          <div className="space-y-3 py-8 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-teal/20 text-teal">
              <Check className="h-7 w-7" />
            </div>
            <h3 className="font-display text-2xl font-bold">Offer Sent to {producer}!</h3>
            <p className="mx-auto max-w-sm text-sm text-muted-foreground">
              Your proposal for <strong>{fmtNaira(parseFloat(offerAmount) || 0)}</strong> on "{beat.title}" has been sent. The producer will review your offer and contact you directly.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-3 py-1 text-xs font-bold text-red-500">
                <Sparkles className="h-3 w-3" /> Negotiate {license.name} License
              </div>
              <h2 className="font-display text-2xl font-bold">Make an Offer for "{beat.title}"</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Directly negotiate master rights with prod. {producer}
              </p>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                Your Offer Amount (₦)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-red-500">₦</span>
                <input
                  type="number"
                  required
                  min="1000"
                  value={offerAmount}
                  onChange={(e) => setOfferAmount(e.target.value)}
                  placeholder="e.g. 250000"
                  className="h-11 w-full rounded-xl border border-white/10 bg-surface/50 pl-9 pr-3 text-base font-bold text-white outline-none focus:border-red-500/40 focus:ring-2 focus:ring-red-500/20"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                Message & Terms for Producer
              </label>
              <textarea
                required
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe your intended usage, release dates, or custom terms..."
                className="w-full rounded-xl border border-white/10 bg-surface/50 p-3 text-sm outline-none focus:border-red-500/40 focus:ring-2 focus:ring-red-500/20"
              />
            </div>

            <button
              type="submit"
              className="h-12 w-full rounded-xl bg-gradient-to-b from-[#EF4444] to-[#DC2626] font-bold text-black shadow-lg transition hover:brightness-105 active:scale-[0.99]"
            >
              Send Offer to {producer}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
