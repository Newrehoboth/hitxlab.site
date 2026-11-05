import { supabase } from "@/integrations/supabase/client";

export interface ProgressCallbackInfo {
  loaded: number;
  total: number;
  percentage: number;
}

export interface UploadOptions {
  bucket: string;
  path: string;
  file: File;
  upsert?: boolean;
  onProgress?: (info: ProgressCallbackInfo) => void;
}

/**
 * Uploads a file to Supabase Storage with real-time byte-level progress reporting via XMLHttpRequest.
 */
export async function uploadWithProgress({
  bucket,
  path,
  file,
  upsert = false,
  onProgress,
}: UploadOptions): Promise<{ path: string | null; error: Error | null }> {
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const SUPABASE_PUBLISHABLE_KEY =
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    return { path: null, error: new Error("Supabase configuration missing") };
  }

  // Get active session token
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token || SUPABASE_PUBLISHABLE_KEY;

  // Clean path format
  const sanitizedPath = path.replace(/^\/+/, "");
  const url = `${SUPABASE_URL}/storage/v1/object/${bucket}/${encodeURI(sanitizedPath)}`;

  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url, true);

    xhr.setRequestHeader("apikey", SUPABASE_PUBLISHABLE_KEY);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("x-upsert", upsert ? "true" : "false");
    if (file.type) {
      xhr.setRequestHeader("Content-Type", file.type);
    } else {
      xhr.setRequestHeader("Content-Type", "application/octet-stream");
    }

    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && event.total > 0) {
          const percentage = Math.round((event.loaded / event.total) * 100);
          onProgress({ loaded: event.loaded, total: event.total, percentage });
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const res = JSON.parse(xhr.responseText);
          resolve({ path: res.Key || sanitizedPath, error: null });
        } catch {
          resolve({ path: sanitizedPath, error: null });
        }
      } else {
        let errorMsg = "Upload failed";
        try {
          const res = JSON.parse(xhr.responseText);
          errorMsg =
            res.message ||
            res.error ||
            res.error_description ||
            res.msg ||
            `Server error (HTTP ${xhr.status})`;
        } catch {
          errorMsg = xhr.statusText || `Upload HTTP error ${xhr.status}`;
        }
        resolve({ path: null, error: new Error(errorMsg) });
      }
    };

    xhr.onerror = () => {
      resolve({
        path: null,
        error: new Error(
          "Upload connection dropped or timed out. Large files require a strong data/Wi-Fi connection. Please check your internet connection and try again."
        ),
      });
    };

    xhr.ontimeout = () => {
      resolve({
        path: null,
        error: new Error("Upload request timed out. Please check your network connection and try again."),
      });
    };

    xhr.send(file);
  });
}
