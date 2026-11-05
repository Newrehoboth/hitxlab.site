import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState, useEffect } from "react";
import { Upload as UploadIcon, Image as ImageIcon, FileAudio, Check, ChevronRight, ChevronLeft, FileText, Loader2, X } from "lucide-react";
import { ProducerLayout } from "@/components/ProducerLayout";
import { useAuth } from "@/lib/store";
import { defaultLicenses, type License } from "@/lib/licenses";
import { fmtLicensePrice } from "@/lib/currency";
import { supabase } from "@/integrations/supabase/client";
import { fetchBeatById } from "@/lib/beats-api";
import type { Beat } from "@/data/beats";
import { uploadWithProgress } from "@/lib/storage-upload";

export const Route = createFileRoute("/producer/edit/$id")({
  head: () => ({
    meta: [
      { title: "Edit Beat · HITXLAB" },
      { name: "description", content: "Edit your beat details and licenses on HITXLAB." },
      { property: "og:title", content: "Edit Beat · HITXLAB" },
      { property: "og:description", content: "Update your beat information." },
    ],
  }),
  component: EditBeat,
});

const steps = ["Beat information", "Update files", "Licensing"];
const GENRES = ["Afrobeats", "Trap", "Drill", "R&B", "Boom Bap", "Phonk", "Latin Trap", "House"];
const MOODS = ["Dark", "Sad", "Aggressive", "Chill", "Ethereal", "Uplifting", "Romantic", "Cinematic"];
const KEYS = ["C maj", "C min", "D maj", "D min", "E maj", "E min", "F maj", "F min", "F# min", "G maj", "G min", "A maj", "A min", "B maj", "B min"];

function EditBeat() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadStage, setUploadStage] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [beat, setBeat] = useState<Beat | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [genre, setGenre] = useState(GENRES[0]);
  const [mood, setMood] = useState(MOODS[0]);
  const [bpm, setBpm] = useState(140);
  const [key, setKey] = useState(KEYS[0]);
  const [tags, setTags] = useState("");
  const [licenses, setLicenses] = useState<License[]>(defaultLicenses(25000));
  const [editingLic, setEditingLic] = useState<string>("");

  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [wavFile, setWavFile] = useState<File | null>(null);
  const [stemsFile, setStemsFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string>("");
  const [fileError, setFileError] = useState<string>("");

  // Load existing beat data
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setErr(null); // Clear any previous errors
      
      // Fetch beat from database to get producer_id
      const { data: dbBeat } = await supabase
        .from("beats")
        .select("producer_id")
        .eq("id", id)
        .maybeSingle();
      
      if (!alive) return;
      
      if (!dbBeat) {
        setErr("Beat not found");
        setLoading(false);
        return;
      }
      
      // Check if user owns this beat
      if (dbBeat.producer_id !== user?.id) {
        setErr("You don't have permission to edit this beat");
        setLoading(false);
        return;
      }
      
      // Now fetch full beat data
      const b = await fetchBeatById(id);
      
      if (!alive) return;
      
      if (!b) {
        setErr("Beat not found");
        setLoading(false);
        return;
      }

      setBeat(b);
      setTitle(b.title);
      setDescription(b.description ?? "");
      setGenre(b.genre);
      setMood(b.mood || MOODS[0]);
      setBpm(b.bpm);
      setKey(b.key);
      setTags(b.tags.join(", "));
      setLicenses(b.licenses as License[]);
      setEditingLic(b.licenses[0]?.id ?? "");
      setCoverPreview(b.cover);
      setErr(null); // Clear error on success
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [id, user?.id]);

  const editing = licenses.find((l) => l.id === editingLic);
  const patchLic = (id: string, patch: Partial<License>) =>
    setLicenses((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));

  // File size limits
  const FILE_SIZE_LIMITS = {
    cover: 10 * 1024 * 1024, // 10MB
    audio: 50 * 1024 * 1024, // 50MB
    wav: 400 * 1024 * 1024, // 400MB
    stems: 1.5 * 1024 * 1024 * 1024, // 1.5GB (for ZIP files with stems)
  };

  const validateFile = (file: File, type: 'cover' | 'audio' | 'wav' | 'stems'): boolean => {
    setFileError("");
    if (file.size > FILE_SIZE_LIMITS[type]) {
      const limitBytes = FILE_SIZE_LIMITS[type];
      const limitStr = limitBytes >= 1024 * 1024 * 1024 
        ? `${(limitBytes / (1024 * 1024 * 1024)).toFixed(1).replace(/\.0$/, "")}GB` 
        : `${Math.round(limitBytes / (1024 * 1024))}MB`;
      setFileError(`File too large. ${type.toUpperCase()} files must be under ${limitStr}`);
      return false;
    }
    return true;
  };

  const canNext =
    (step === 0 && title && genre) ||
    step === 1 ||
    step === 2;

  const save = async () => {
    if (!user || !beat) return;
    setErr(null);
    setSaving(true);
    setUploadProgress(0);
    setUploadStage("Updating beat...");
    
    try {
      const stamp = Date.now();
      let updates: any = {
        title,
        description,
        genre,
        mood,
        bpm,
        key,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        licenses: licenses as any,
      };

      const totalBytes =
        (audioFile?.size || 0) +
        (wavFile?.size || 0) +
        (stemsFile?.size || 0) +
        (coverFile?.size || 0);

      const loadedBytesMap = {
        audio: 0,
        wav: 0,
        stems: 0,
        cover: 0,
      };

      const updateOverallProgress = () => {
        if (totalBytes === 0) {
          setUploadProgress(90);
          return;
        }
        const sumLoaded =
          loadedBytesMap.audio +
          loadedBytesMap.wav +
          loadedBytesMap.stems +
          loadedBytesMap.cover;
        const pct = Math.min(95, Math.round((sumLoaded / Math.max(totalBytes, 1)) * 95));
        setUploadProgress(pct);
      };

      // Upload new files if provided
      if (audioFile) {
        const audioPath = `${user.id}/${stamp}-preview-${audioFile.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        setUploadStage(`Uploading new Preview MP3 (${audioFile.name})...`);
        const { error: aErr } = await uploadWithProgress({
          bucket: "beat-audio",
          path: audioPath,
          file: audioFile,
          onProgress: ({ loaded }: { loaded: number }) => {
            loadedBytesMap.audio = loaded;
            updateOverallProgress();
          },
        });
        if (aErr) throw aErr;
        updates.audio_url = audioPath;

        // Delete old audio file
        if (beat.audioPath) {
          await supabase.storage.from("beat-audio").remove([beat.audioPath]);
        }
      }

      if (wavFile) {
        const wavPath = `${user.id}/${stamp}-wav-${wavFile.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        setUploadStage(`Uploading new WAV file (${wavFile.name})...`);
        const { error: wErr } = await uploadWithProgress({
          bucket: "beat-files",
          path: wavPath,
          file: wavFile,
          onProgress: ({ loaded }: { loaded: number }) => {
            loadedBytesMap.wav = loaded;
            updateOverallProgress();
          },
        });
        if (wErr) throw wErr;
        updates.wav_url = wavPath;

        // Delete old WAV file if exists
        const oldWavUrl = (beat as any).wav_url || (beat as any).wavUrl;
        if (oldWavUrl) {
          await supabase.storage.from("beat-files").remove([oldWavUrl]);
        }
      }

      if (stemsFile) {
        const stemsPath = `${user.id}/${stamp}-stems-${stemsFile.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        setUploadStage(`Uploading new STEMS ZIP (${stemsFile.name})...`);
        const { error: sErr } = await uploadWithProgress({
          bucket: "beat-files",
          path: stemsPath,
          file: stemsFile,
          onProgress: ({ loaded }: { loaded: number }) => {
            loadedBytesMap.stems = loaded;
            updateOverallProgress();
          },
        });
        if (sErr) throw sErr;
        updates.stems_url = stemsPath;

        // Delete old STEMS file if exists
        const oldStemsUrl = (beat as any).stems_url || (beat as any).stemsUrl;
        if (oldStemsUrl) {
          await supabase.storage.from("beat-files").remove([oldStemsUrl]);
        }
      }

      if (coverFile) {
        const coverPath = `${user.id}/${stamp}-${coverFile.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        setUploadStage(`Uploading new Cover artwork...`);
        const { error: cErr } = await uploadWithProgress({
          bucket: "beat-covers",
          path: coverPath,
          file: coverFile,
          onProgress: ({ loaded }: { loaded: number }) => {
            loadedBytesMap.cover = loaded;
            updateOverallProgress();
          },
        });
        if (cErr) throw cErr;
        updates.cover_url = coverPath;

        // Delete old cover
        if (beat.coverPath) {
          await supabase.storage.from("beat-covers").remove([beat.coverPath]);
        }
      }

      setUploadProgress(96);
      setUploadStage("Saving beat details...");

      // Update duration if new audio file
      if (audioFile) {
        const duration = await audioDuration(audioFile);
        updates.duration = Math.round(duration);
      }

      const { error: uErr } = await supabase.from("beats").update(updates).eq("id", id);
      if (uErr) throw uErr;

      setUploadProgress(100);
      setUploadStage("Saved successfully!");

      nav({ to: "/producer/dashboard", search: { tab: "beats" } });
    } catch (e: any) {
      console.error("[edit beat error]", e);
      let message = e?.message || e?.error_description || "Save failed";
      
      if (message === "Load failed" || message === "Failed to fetch" || message.includes("NetworkError")) {
        message = "Connection dropped or timed out during upload. Please check your internet connection and try again.";
      } else if (message.includes("jwt") || message.includes("session")) {
        message = "Your session expired. Please refresh the page or log in again.";
      } else if (message.includes("row-level security") || message.includes("RLS")) {
        message = "Permission denied: Please sign out and sign back in as a Producer to refresh your session permissions.";
      }

      setErr(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ProducerLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </ProducerLayout>
    );
  }

  if (err) {
    return (
      <ProducerLayout>
        <div className="mx-auto flex min-h-[60vh] w-full max-w-4xl flex-col items-center justify-center px-4 text-center">
          <div className="rounded-2xl border border-crimson/30 bg-crimson/10 px-4 py-3 text-sm text-crimson">{err}</div>
          <button onClick={() => nav({ to: "/producer/dashboard", search: { tab: "beats" } })} className="mt-4 text-sm text-red-500 hover:underline">
            Back to dashboard
          </button>
        </div>
      </ProducerLayout>
    );
  }

  if (!beat) {
    return (
      <ProducerLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </ProducerLayout>
    );
  }

  return (
    <ProducerLayout>
      <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-8">
        <div className="mb-6">
          <h1 className="font-display text-3xl font-bold sm:text-4xl">Edit beat</h1>
          <p className="text-sm text-muted-foreground">Update your beat information, files, and licenses.</p>
        </div>

        <div className="mb-6 flex items-center gap-2 sm:gap-4">
          {steps.map((s, i) => (
            <div key={s} className="flex flex-1 items-center gap-2 sm:gap-3">
              <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold ${i < step ? "bg-teal text-black" : i === step ? "bg-red-500 text-red-500-foreground" : "bg-white/5 text-muted-foreground"}`}>
                {i < step ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <div className="hidden sm:block">
                <div className={`text-sm font-semibold ${i === step ? "text-foreground" : "text-muted-foreground"}`}>{s}</div>
              </div>
              {i < steps.length - 1 && <div className="h-px flex-1 bg-white/8" />}
            </div>
          ))}
        </div>

        <div className="rounded-3xl border border-white/8 bg-surface/50 p-6 sm:p-8">
          {step === 0 && (
            <div className="grid gap-4">
              <Field label="Title" required>
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Midnight Bloom" className={input} />
              </Field>
              <Field label="Description">
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="A moody trap beat with cinematic strings…" className="w-full rounded-xl border border-white/10 bg-background/50 p-3 text-sm outline-none focus:border-red-500/40 focus:ring-4 focus:ring-red-500/15" />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Genre" required>
                  <Select value={genre} onChange={setGenre} options={GENRES} />
                </Field>
                <Field label="Mood">
                  <Select value={mood} onChange={setMood} options={MOODS} />
                </Field>
                <Field label="Key">
                  <Select value={key} onChange={setKey} options={KEYS} />
                </Field>
                <Field label="Tempo (BPM)">
                  <input type="number" value={bpm} onChange={(e) => setBpm(parseInt(e.target.value) || 0)} className={input} />
                </Field>
                <Field label="Tags (comma separated)">
                  <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="dark, 808, hard" className={input} />
                </Field>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="grid gap-4">
              {fileError && (
                <div className="rounded-lg border border-crimson/30 bg-crimson/10 px-3 py-2 text-xs text-crimson">
                  {fileError}
                </div>
              )}
              
              <div className="rounded-xl border border-white/10 bg-red-500/5 p-4">
                <p className="text-xs text-muted-foreground">
                  💡 <span className="font-semibold">Tip:</span> Leave file uploads empty to keep existing files. Only upload new files if you want to replace them.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <FileZone 
                  label="Artwork" 
                  icon={<ImageIcon className="h-6 w-6" />} 
                  hint="Square JPG/PNG (max 10MB)" 
                  accept="image/*" 
                  file={coverFile} 
                  onFile={(f) => { 
                    if (f && validateFile(f, 'cover')) {
                      setCoverFile(f); 
                      setCoverPreview(URL.createObjectURL(f)); 
                    } else if (!f) {
                      setCoverFile(null);
                      setCoverPreview(beat?.cover ?? "");
                    }
                  }} 
                  preview={coverPreview} 
                />
                <FileZone 
                  label="Preview Audio (MP3)" 
                  icon={<FileAudio className="h-6 w-6" />} 
                  hint="Tagged MP3 for streaming (max 50MB)" 
                  accept=".mp3,audio/mpeg" 
                  file={audioFile} 
                  onFile={(f) => {
                    if (f && validateFile(f, 'audio')) {
                      setAudioFile(f);
                    } else if (!f) {
                      setAudioFile(null);
                    }
                  }}
                />
              </div>
              
              <div className="rounded-xl border border-white/10 bg-background/20 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <FileAudio className="h-4 w-4 text-red-500" />
                  <span className="text-sm font-semibold">Downloadable Files (for buyers)</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <FileZone 
                    label="WAV File" 
                    icon={<FileAudio className="h-5 w-5" />} 
                    hint="Untagged high-quality WAV (max 400MB)" 
                    accept=".wav,audio/wav,audio/x-wav" 
                    file={wavFile} 
                    onFile={(f) => {
                      if (f && validateFile(f, 'wav')) {
                        setWavFile(f);
                      } else if (!f) {
                        setWavFile(null);
                      }
                    }}
                  />
                  <FileZone 
                    label="Stems (ZIP)" 
                    icon={<FileAudio className="h-5 w-5" />} 
                    hint="ZIP file with trackout stems (max 1.5GB)" 
                    accept=".zip,application/zip,application/x-zip-compressed" 
                    file={stemsFile} 
                    onFile={(f) => {
                      if (f && validateFile(f, 'stems')) {
                        setStemsFile(f);
                      } else if (!f) {
                        setStemsFile(null);
                      }
                    }}
                  />
                </div>
                <p className="mt-3 text-xs text-muted-foreground">💡 Upload new files to replace existing downloadable content</p>
              </div>
            </div>
          )}

          {step === 2 && editing && (
            <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
              <div className="flex flex-col gap-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Licenses</div>
                {licenses.map((l) => (
                  <button key={l.id} onClick={() => setEditingLic(l.id)} className={`flex items-center justify-between rounded-xl border px-3 py-2.5 text-left transition ${editingLic === l.id ? "border-red-500/50 bg-red-500/5" : "border-white/10 hover:border-white/20 hover:bg-white/5"}`}>
                    <div>
                      <div className="text-sm font-semibold">{l.name}</div>
                      <div className="text-[11px] text-muted-foreground">{l.files.join(" · ")}</div>
                    </div>
                    <div className="text-xs font-bold text-red-500">{fmtLicensePrice(l)}</div>
                  </button>
                ))}
              </div>

              <div className="rounded-2xl border border-white/10 bg-background/40 p-5">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="font-display text-lg font-bold">{editing.name}</div>
                    <div className="text-xs text-muted-foreground">{editing.files.join(" · ")}</div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="flex items-center gap-2 text-xs font-semibold text-red-500 cursor-pointer bg-red-500/10 border border-red-500/30 px-3 py-1.5 rounded-lg hover:bg-red-500/15 transition">
                      <input
                        type="checkbox"
                        checked={editing.isNegotiable ?? false}
                        onChange={(e) => patchLic(editing.id, { isNegotiable: e.target.checked })}
                        className="h-4 w-4 rounded accent-[oklch(0.8_0.155_72)]"
                      />
                      <span>Make price negotiable (Make an Offer)</span>
                    </label>
                    {!editing.isNegotiable && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold text-muted-foreground">Price ₦</span>
                        <input
                          type="number"
                          value={editing.price}
                          onChange={(e) => patchLic(editing.id, { price: parseFloat(e.target.value) || 0 })}
                          className="h-9 w-28 rounded-lg border border-white/10 bg-background/50 px-2 text-right text-sm font-bold text-red-500 outline-none focus:border-red-500/40"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Streaming limit">
                    <input value={editing.streamingLimit} onChange={(e) => patchLic(editing.id, { streamingLimit: e.target.value })} className={input} />
                  </Field>
                  <Field label="Distribution limit">
                    <input value={editing.distributionLimit} onChange={(e) => patchLic(editing.id, { distributionLimit: e.target.value })} className={input} />
                  </Field>
                </div>

                <div className="mt-4">
                  <div className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                    <FileText className="h-3.5 w-3.5" /> License Agreement (buyers must accept before purchase)
                  </div>
                  <textarea value={editing.contract} onChange={(e) => patchLic(editing.id, { contract: e.target.value })} rows={12} className="w-full rounded-xl border border-white/10 bg-background/60 p-4 font-sans text-[13px] leading-6 outline-none focus:border-red-500/40 focus:ring-4 focus:ring-red-500/15" />
                </div>
              </div>
            </div>
          )}

          {saving && (
            <div className="mt-6 rounded-2xl border border-red-500/30 bg-black/40 p-4.5 backdrop-blur-sm shadow-lg shadow-red-500/5">
              <div className="mb-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-red-500" />
                  <span className="text-sm font-semibold text-foreground">{uploadStage || "Saving changes..."}</span>
                </div>
                <span className="font-mono text-base font-extrabold text-red-400">{uploadProgress}%</span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-white/10 p-0.5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-red-500 via-amber-500 to-teal-400 transition-all duration-300 ease-out shadow-[0_0_12px_rgba(239,68,68,0.5)]"
                  style={{ width: `${Math.max(uploadProgress, 2)}%` }}
                />
              </div>
            </div>
          )}

          {err && <div className="mt-4 rounded-lg border border-crimson/30 bg-crimson/10 px-3 py-2 text-xs text-crimson">{err}</div>}

          <div className="mt-8 flex items-center justify-between gap-3">
            <button onClick={() => (step === 0 ? nav({ to: "/producer/dashboard", search: { tab: "beats" } }) : setStep(step - 1))} disabled={saving} className="inline-flex h-11 items-center gap-1 rounded-xl border border-white/10 px-4 text-sm font-medium hover:bg-white/5 disabled:opacity-40">
              <ChevronLeft className="h-4 w-4" /> Back
            </button>
            {step < 2 ? (
              <button disabled={!canNext} onClick={() => setStep(step + 1)} className="inline-flex h-11 items-center gap-1 rounded-xl bg-gradient-to-b from-[#EF4444] to-[#DC2626] px-5 text-sm font-semibold text-black transition hover:brightness-105 disabled:opacity-40">
                Continue <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button onClick={save} disabled={saving} className="inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-b from-[#EF4444] to-[#DC2626] px-6 text-sm font-semibold text-black transition hover:brightness-105 disabled:opacity-60">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {saving ? `Saving ${uploadProgress}%...` : "Save changes"}
              </button>
            )}
          </div>
        </div>
      </div>
    </ProducerLayout>
  );
}

function audioDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const el = new Audio();
    el.preload = "metadata";
    el.onloadedmetadata = () => resolve(el.duration || 0);
    el.onerror = () => resolve(0);
    el.src = URL.createObjectURL(file);
  });
}

const input =
  "h-11 w-full rounded-xl border border-white/10 bg-background/50 px-3 text-sm outline-none placeholder:text-muted-foreground/50 focus:border-red-500/40 focus:ring-4 focus:ring-red-500/15";

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">
        {label} {required && <span className="text-crimson">*</span>}
      </span>
      {children}
    </label>
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={input}>
      {options.map((o) => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  );
}

function FileZone({ label, icon, hint, accept, file, onFile, preview }: { label: string; icon: React.ReactNode; hint: string; accept: string; file: File | null; onFile: (f: File | null) => void; preview?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div>
      <div className="mb-1.5 text-xs font-semibold text-muted-foreground">{label}</div>
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-6 text-center transition hover:border-red-500/40 hover:bg-red-500/[0.03]"
      >
        {preview ? (
          <img src={preview} alt="" className="mb-2 h-24 w-24 rounded-xl object-cover" />
        ) : (
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-white/5 text-muted-foreground">{icon}</span>
        )}
        <div className="text-sm font-semibold">{file ? file.name : "Choose file"}</div>
        <div className="text-xs text-muted-foreground">{hint}</div>
        {file && (
          <button type="button" onClick={(e) => { e.stopPropagation(); onFile(null); }} className="mt-1 inline-flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-[11px] text-muted-foreground hover:text-crimson">
            <X className="h-3 w-3" /> Remove
          </button>
        )}
      </button>
      <input ref={ref} type="file" accept={accept} className="hidden" onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
    </div>
  );
}
