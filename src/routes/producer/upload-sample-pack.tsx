import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Upload as UploadIcon, Image as ImageIcon, FileAudio, Package, Loader2, X } from "lucide-react";
import { ProducerLayout } from "@/components/ProducerLayout";
import { useAuth } from "@/lib/store";
import { fmtNaira } from "@/lib/currency";
import { supabase } from "@/integrations/supabase/client";

import { uploadWithProgress } from "@/lib/storage-upload";

export const Route = createFileRoute("/producer/upload-sample-pack")({
  head: () => ({
    meta: [
      { title: "Upload Sample Pack · HITXLAB" },
      { name: "description", content: "Upload a new sample pack and start selling on HITXLAB." },
    ],
  }),
  component: UploadSamplePack,
});

const input =
  "h-11 w-full rounded-xl border border-white/10 bg-background/50 px-3 text-sm outline-none placeholder:text-muted-foreground/50 focus:border-red-500/40 focus:ring-4 focus:ring-red-500/15";

function UploadSamplePack() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [publishing, setPublishing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadStage, setUploadStage] = useState<string>("");
  const [err, setErr] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string>("");

  // Form fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState(5000);

  // Files
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string>("");

  // File size limits (in bytes)
  const FILE_SIZE_LIMITS = {
    cover: 5 * 1024 * 1024, // 5MB
    preview: 10 * 1024 * 1024, // 10MB
    zip: 1024 * 1024 * 1024, // 1GB
  };

  const validateFile = (file: File, type: 'cover' | 'preview' | 'zip'): boolean => {
    setFileError("");
    if (file.size > FILE_SIZE_LIMITS[type]) {
      const sizeMB = Math.round(FILE_SIZE_LIMITS[type] / 1024 / 1024);
      setFileError(`File too large. ${type.toUpperCase()} files must be under ${sizeMB}MB`);
      return false;
    }
    return true;
  };

  const canPublish = title && zipFile && price > 0;

  const publish = async () => {
    if (!user || !zipFile) return;
    setErr(null);
    setPublishing(true);
    setUploadProgress(0);
    setUploadStage("Preparing sample pack upload...");

    try {
      const stamp = Date.now();

      const totalBytes =
        (zipFile?.size || 0) +
        (previewFile?.size || 0) +
        (coverFile?.size || 0);

      const loadedBytesMap = {
        zip: 0,
        preview: 0,
        cover: 0,
      };

      const updateOverallProgress = () => {
        const sumLoaded =
          loadedBytesMap.zip +
          loadedBytesMap.preview +
          loadedBytesMap.cover;
        const pct = Math.min(95, Math.round((sumLoaded / Math.max(totalBytes, 1)) * 95));
        setUploadProgress(pct);
      };

      // Upload ZIP file (required)
      const zipPath = `${user.id}/${stamp}-${zipFile.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      setUploadStage(`Uploading Sample Pack ZIP (${zipFile.name})...`);
      const { error: zipErr } = await uploadWithProgress({
        bucket: "sample-pack-files",
        path: zipPath,
        file: zipFile,
        onProgress: ({ loaded }) => {
          loadedBytesMap.zip = loaded;
          updateOverallProgress();
        },
      });
      if (zipErr) throw zipErr;

      // Upload preview MP3 (optional)
      let previewPath: string | null = null;
      if (previewFile) {
        previewPath = `${user.id}/${stamp}-preview-${previewFile.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        setUploadStage(`Uploading Audio Preview (${previewFile.name})...`);
        const { error: prevErr } = await uploadWithProgress({
          bucket: "sample-pack-previews",
          path: previewPath,
          file: previewFile,
          onProgress: ({ loaded }) => {
            loadedBytesMap.preview = loaded;
            updateOverallProgress();
          },
        });
        if (prevErr) throw prevErr;
      }

      // Upload cover image (optional)
      let coverPath: string | null = null;
      if (coverFile) {
        coverPath = `${user.id}/${stamp}-${coverFile.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        setUploadStage(`Uploading Cover artwork...`);
        const { error: coverErr } = await uploadWithProgress({
          bucket: "sample-pack-covers",
          path: coverPath,
          file: coverFile,
          onProgress: ({ loaded }) => {
            loadedBytesMap.cover = loaded;
            updateOverallProgress();
          },
        });
        if (coverErr) throw coverErr;
      }

      setUploadProgress(96);
      setUploadStage("Publishing sample pack details...");

      // Insert sample pack record
      const insertData: any = {
        producer_id: user.id,
        title,
        description: description || null,
        cover_url: coverPath,
        preview_url: previewPath,
        zip_url: zipPath,
        price,
        is_published: true,
      };

      const { error: insertErr } = await supabase
        .from("sample_packs")
        .insert(insertData);
      if (insertErr) throw insertErr;

      setUploadProgress(100);
      setUploadStage("Upload complete!");

      // Navigate back to dashboard
      nav({ to: "/producer/dashboard", search: { tab: "sample-packs" } });
    } catch (e: any) {
      console.error("[upload sample pack error]", e);
      let message = e?.message || e?.error_description || "Upload failed";
      
      if (message === "Load failed" || message === "Failed to fetch" || message.includes("NetworkError")) {
        message = "Upload connection dropped or timed out. Large files require a strong data/Wi-Fi connection. Please check your internet connection and try again.";
      } else if (message.includes("jwt") || message.includes("session")) {
        message = "Your session expired. Please refresh the page or log in again.";
      }

      setErr(message);
    } finally {
      setPublishing(false);
    }
  };

  return (
    <ProducerLayout>
      <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-8">
        <div className="mb-6">
          <h1 className="font-display text-3xl font-bold sm:text-4xl">Upload Sample Pack</h1>
          <p className="text-sm text-muted-foreground">
            Share your sound collection with producers worldwide.
          </p>
        </div>

        <div className="rounded-3xl border border-white/8 bg-surface/50 p-6 sm:p-8">
          <div className="grid gap-6">
            {/* Pack Information */}
            <div className="grid gap-4">
              <Field label="Pack Title" required>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="808 Drill Kit Vol. 1"
                  className={input}
                />
              </Field>

              <Field label="Description">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  placeholder="10 hard-hitting 808s, 15 snares, 20 hi-hats, and 5 bonus loops perfect for drill and trap production..."
                  className="w-full rounded-xl border border-white/10 bg-background/50 p-3 text-sm outline-none focus:border-red-500/40 focus:ring-4 focus:ring-red-500/15"
                />
              </Field>

              <Field label="Price (₦)" required>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">₦</span>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(parseInt(e.target.value) || 0)}
                    min="0"
                    step="1000"
                    className={input}
                  />
                  <span className="text-xs text-muted-foreground">
                    You earn: {fmtNaira(price * 0.9)} (90%)
                  </span>
                </div>
              </Field>
            </div>

            {/* File Uploads */}
            {fileError && (
              <div className="rounded-lg border border-crimson/30 bg-crimson/10 px-3 py-2 text-xs text-crimson">
                {fileError}
              </div>
            )}

            <div className="grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <FileZone
                  label="Cover Image"
                  icon={<ImageIcon className="h-6 w-6" />}
                  hint="Square JPG/PNG (max 5MB)"
                  accept="image/*"
                  file={coverFile}
                  onFile={(f) => {
                    if (f && validateFile(f, "cover")) {
                      setCoverFile(f);
                      setCoverPreview(URL.createObjectURL(f));
                    } else if (!f) {
                      setCoverFile(null);
                      setCoverPreview("");
                    }
                  }}
                  preview={coverPreview}
                />

                <FileZone
                  label="Preview MP3"
                  icon={<FileAudio className="h-6 w-6" />}
                  hint="Audio preview (max 10MB)"
                  accept=".mp3,audio/mpeg"
                  file={previewFile}
                  onFile={(f) => {
                    if (f && validateFile(f, "preview")) {
                      setPreviewFile(f);
                    } else if (!f) {
                      setPreviewFile(null);
                    }
                  }}
                />
              </div>

              <FileZone
                label="Sample Pack ZIP *"
                icon={<Package className="h-8 w-8" />}
                hint="ZIP file with all samples (max 1GB)"
                accept=".zip,application/zip,application/x-zip-compressed"
                file={zipFile}
                onFile={(f) => {
                  if (f && validateFile(f, "zip")) {
                    setZipFile(f);
                  } else if (!f) {
                    setZipFile(null);
                  }
                }}
                large
              />
            </div>

            {/* Info Box */}
            <div className="rounded-xl border border-teal/20 bg-teal/5 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-teal">
                <Package className="h-4 w-4" /> What to include in your ZIP
              </div>
              <ul className="space-y-1 text-xs text-teal/80">
                <li>• High-quality WAV samples (24-bit recommended)</li>
                <li>• Organized folders (Drums, Loops, FX, etc.)</li>
                <li>• Clear file naming (kick_01.wav, snare_02.wav)</li>
                <li>• Optional: README.txt with pack info</li>
              </ul>
            </div>
          </div>

          {publishing && (
            <div className="mt-6 rounded-2xl border border-red-500/30 bg-black/40 p-4.5 backdrop-blur-sm shadow-lg shadow-red-500/5">
              <div className="mb-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-red-500" />
                  <span className="text-sm font-semibold text-foreground">{uploadStage || "Uploading files..."}</span>
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

          {err && (
            <div className="mt-4 rounded-lg border border-crimson/30 bg-crimson/10 px-3 py-2 text-xs text-crimson">
              {err}
            </div>
          )}

          <div className="mt-8 flex items-center justify-between gap-3">
            <button
              onClick={() => nav({ to: "/producer/dashboard", search: { tab: "sample-packs" } })}
              disabled={publishing}
              className="inline-flex h-11 items-center gap-1 rounded-xl border border-white/10 px-4 text-sm font-medium hover:bg-white/5 disabled:opacity-40"
            >
              Cancel
            </button>

            <button
              onClick={publish}
              disabled={publishing || !canPublish}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-b from-[#EF4444] to-[#DC2626] px-6 text-sm font-semibold text-black transition hover:brightness-105 disabled:opacity-60"
            >
              {publishing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UploadIcon className="h-4 w-4" />
              )}
              {publishing ? `Uploading ${uploadProgress}%...` : "Publish Sample Pack"}
            </button>
          </div>
        </div>
      </div>
    </ProducerLayout>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">
        {label} {required && <span className="text-crimson">*</span>}
      </span>
      {children}
    </label>
  );
}

function FileZone({
  label,
  icon,
  hint,
  accept,
  file,
  onFile,
  preview,
  large,
}: {
  label: string;
  icon: React.ReactNode;
  hint: string;
  accept: string;
  file: File | null;
  onFile: (f: File | null) => void;
  preview?: string;
  large?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div>
      <div className="mb-1.5 text-xs font-semibold text-muted-foreground">{label}</div>
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className={`flex w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/15 bg-white/[0.02] text-center transition hover:border-red-500/40 hover:bg-red-500/[0.03] ${
          large ? "p-8" : "p-6"
        }`}
      >
        {preview ? (
          <img src={preview} alt="" className="mb-2 h-24 w-24 rounded-xl object-cover" />
        ) : (
          <span className={`grid place-items-center rounded-xl bg-white/5 text-muted-foreground ${large ? "h-16 w-16" : "h-12 w-12"}`}>
            {icon}
          </span>
        )}
        <div className="text-sm font-semibold">{file ? file.name : "Choose file"}</div>
        <div className="text-xs text-muted-foreground">{hint}</div>
        {file && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onFile(null);
            }}
            className="mt-1 inline-flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-[11px] text-muted-foreground hover:text-crimson"
          >
            <X className="h-3 w-3" /> Remove
          </button>
        )}
      </button>
      <input
        ref={ref}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => onFile(e.target.files?.[0] ?? null)}
      />
    </div>
  );
}
