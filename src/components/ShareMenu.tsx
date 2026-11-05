import { useState, useEffect, useRef, useCallback } from "react";
import { Share2, Link2, Check } from "lucide-react";
import { FaXTwitter, FaFacebookF, FaWhatsapp, FaInstagram } from "react-icons/fa6";

export function ShareMenu({
  url,
  title,
  coverUrl,
  className = "",
}: {
  url: string;
  title: string;
  coverUrl?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, right: 0 });

  const rawOrigin = typeof window !== "undefined" ? window.location.origin : "";
  let formattedUrl = url.startsWith("http")
    ? url
    : `${rawOrigin}${url.startsWith("/") ? "" : "/"}${url}`;

  // Upgrade http:// to https:// on live/remote domains
  if (formattedUrl.startsWith("http://") && !formattedUrl.includes("localhost") && !formattedUrl.includes("127.0.0.1")) {
    formattedUrl = formattedUrl.replace("http://", "https://");
  }

  // Strip 'www.' if present, as www.hitxlab.com.ng triggers X security filter whereas hitxlab.com.ng is clean
  const cleanUrl = formattedUrl.replace("://www.", "://");

  const enc = encodeURIComponent;
  const text = `Check out "${title}" on HITXLAB`;

  const canNativeShare = typeof navigator !== "undefined" && !!(navigator as any).share;

  const handleNativeShare = async () => {
    try {
      await (navigator as any).share({
        title: `Check out "${title}" on HITXLAB`,
        text: text,
        url: cleanUrl,
      });
      setOpen(false);
    } catch {/* user closed */}
  };

  const platforms = [
    {
      label: "X (Twitter)",
      icon: FaXTwitter,
      href: `https://twitter.com/intent/tweet?url=${enc(cleanUrl)}&text=${enc(text)}`,
      bg: "hover:bg-white/10",
      iconColor: "text-white",
    },
    {
      label: "Facebook",
      icon: FaFacebookF,
      href: `https://www.facebook.com/sharer/sharer.php?u=${enc(cleanUrl)}`,
      bg: "hover:bg-[#1877F2]/20",
      iconColor: "text-[#4a9bff]",
    },
    {
      label: "WhatsApp",
      icon: FaWhatsapp,
      href: `https://wa.me/?text=${enc(`${text}\n\n${cleanUrl}`)}`,
      bg: "hover:bg-[#25D366]/20",
      iconColor: "text-[#4ade80]",
    },
    {
      label: "Instagram",
      icon: FaInstagram,
      href: `https://www.instagram.com/`,
      bg: "hover:bg-[#E1306C]/20",
      iconColor: "text-[#ff7aa8]",
      hint: "Link auto-copied — paste it on Instagram",
    },
  ];

  // Set OpenGraph image dynamically when coverUrl is available
  useEffect(() => {
    if (!coverUrl) return;
    const setMeta = (attr: "property" | "name", key: string, content: string) => {
      let tag = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
      if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute(attr, key);
        document.head.appendChild(tag);
      }
      tag.setAttribute("content", content);
    };
    setMeta("property", "og:image", coverUrl);
    setMeta("name", "twitter:image", coverUrl);
    setMeta("name", "twitter:card", "summary_large_image");
  }, [coverUrl]);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(cleanUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {/* ignore */}
  }, [cleanUrl]);

  // Calculate fixed position from the trigger button
  const openMenu = () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
    setOpen((o) => !o);
  };

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        id="share-menu-trigger"
        onClick={openMenu}
        className={`inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-muted-foreground transition-all duration-200 hover:border-white/25 hover:bg-white/10 hover:text-white active:scale-95 ${className}`}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Share2 className="h-4 w-4" />
        Share
      </button>

      {open && (
        <div
          ref={menuRef}
          role="menu"
          style={{
            position: "fixed",
            top: pos.top,
            right: pos.right,
            zIndex: 9999,
            animation: "shareMenuIn 0.18s cubic-bezier(0.34,1.3,0.64,1) both",
          }}
          className="w-64 overflow-hidden rounded-2xl border border-white/10 bg-[#141414]/95 shadow-[0_24px_60px_-12px_rgba(0,0,0,0.9)] backdrop-blur-xl"
        >
          {/* Header */}
          <div className="border-b border-white/8 px-4 py-3">
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              Share this beat
            </p>
            <p className="mt-0.5 truncate text-xs font-semibold text-white/70">{title}</p>
          </div>

          {/* Native Share on devices */}
          {canNativeShare && (
            <div className="border-b border-white/8 p-2">
              <button
                type="button"
                onClick={handleNativeShare}
                className="flex w-full items-center gap-3 rounded-xl bg-white/5 px-3 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                <Share2 className="h-4 w-4 text-red-500" />
                Share via Apps...
              </button>
            </div>
          )}

          {/* Platform links */}
          <div className="p-2">
            {platforms.map((p) => (
              <a
                key={p.label}
                href={p.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  if (p.label === "Instagram") copy();
                  setOpen(false);
                }}
                role="menuitem"
                className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-muted-foreground transition-all duration-150 ${p.bg} hover:text-white`}
              >
                <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/5 ${p.iconColor}`}>
                  <p.icon className="h-4 w-4" />
                </span>
                <span className="flex-1 min-w-0">
                  {p.label}
                  {p.hint && (
                    <span className="block text-[10px] text-muted-foreground/60 font-normal">
                      {p.hint}
                    </span>
                  )}
                </span>
              </a>
            ))}
          </div>

          {/* Copy link — stays open while copying */}
          <div className="border-t border-white/8 p-2">
            <button
              type="button"
              role="menuitem"
              onClick={copy}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-muted-foreground transition-all duration-150 hover:bg-white/8 hover:text-white"
            >
              <span
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg transition-colors duration-300 ${
                  copied ? "bg-teal/20 text-teal" : "bg-white/5 text-white"
                }`}
              >
                {copied ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
              </span>
              <span className="flex-1 text-left">
                {copied ? (
                  <span className="text-teal">Link copied!</span>
                ) : (
                  "Copy link"
                )}
                <span className="block truncate text-[10px] font-normal text-muted-foreground/50">
                  {cleanUrl}
                </span>
              </span>
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes shareMenuIn {
          from { opacity: 0; transform: scale(0.95) translateY(-6px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);     }
        }
      `}</style>
    </>
  );
}
