import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY, BucketName } from '../lib/supabase';
import { UploadProgress } from '../types';

// Keep these in sync with the bucket limits in supabase/migrations.
export const MAX_EVENT_PHOTO_MB = 10;
export const MAX_REEL_FILE_MB = 50;

const EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'video/webm': 'webm',
};

export function getFileExtension(file: File): string {
  const fromMime = EXTENSION_BY_MIME[file.type];
  if (fromMime) return fromMime;
  const fromName = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '');
  return fromName || 'bin';
}

/** `<folder>/<random>.<ext>` — unique, so uploads never overwrite each other. */
export function buildObjectPath(folder: string, file: File): string {
  return `${folder}/${crypto.randomUUID()}.${getFileExtension(file)}`;
}

export function getPublicUrl(bucket: BucketName, path: string): string {
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

/**
 * Upload one file. Uses XMLHttpRequest against the Storage REST endpoint
 * because supabase-js uploads don't report progress. The request carries the
 * signed-in user's token, so the storage RLS policies decide if it's allowed.
 */
export async function uploadFile(
  bucket: BucketName,
  path: string,
  file: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const token = data.session?.access_token;
  if (!token) throw new Error('Please sign in to upload.');

  const encodedPath = path.split('/').map(encodeURIComponent).join('/');
  const endpoint = `${SUPABASE_URL}/storage/v1/object/${bucket}/${encodedPath}`;

  return new Promise<string>((resolve, reject) => {
    const fail = (message: string, statusCode?: number) => {
      onProgress?.({ progress: 0, status: 'error', error: message });
      reject(Object.assign(new Error(message), { statusCode }));
    };

    const xhr = new XMLHttpRequest();
    xhr.open('POST', endpoint);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.setRequestHeader('apikey', SUPABASE_ANON_KEY);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    xhr.setRequestHeader('Cache-Control', 'max-age=31536000'); // paths are unique, so cache forever
    xhr.setRequestHeader('x-upsert', 'false');
    xhr.timeout = 10 * 60 * 1000;

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        // Hold at 99 until the server confirms.
        onProgress?.({
          progress: Math.min(99, Math.round((e.loaded / e.total) * 100)),
          status: 'uploading',
        });
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.({ progress: 100, status: 'complete' });
        resolve(path);
        return;
      }
      let message = `Upload failed (${xhr.status})`;
      try {
        const body = JSON.parse(xhr.responseText);
        if (body && body.message) message = body.message;
      } catch {
        /* non-JSON error body */
      }
      if (xhr.status === 403 || /row-level security/i.test(message)) {
        message = 'Your account is not authorized to upload.';
      } else if (xhr.status === 413 || /exceeded the maximum allowed size/i.test(message)) {
        message = 'That file is too large.';
      }
      fail(message, xhr.status);
    };
    xhr.onerror = () => fail('Network error during upload. Check your connection and try again.');
    xhr.ontimeout = () => fail('Upload timed out. Try a smaller file or a faster connection.');

    onProgress?.({ progress: 0, status: 'uploading' });
    xhr.send(file);
  });
}

/** Best-effort delete. Never throws: a leftover file must not block the UI. */
export async function deleteFiles(bucket: BucketName, paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  const { error } = await supabase.storage.from(bucket).remove(paths);
  if (error) {
    console.warn(`Could not remove ${paths.length} file(s) from ${bucket}:`, error.message);
  }
}

// ---------- validation (client-side convenience; the bucket enforces it) ----------

type Validation = { valid: boolean; error?: string };

const tooBig = (file: File, maxMB: number) => file.size > maxMB * 1024 * 1024;
const sizeMB = (file: File) => (file.size / (1024 * 1024)).toFixed(1);

export function validateImage(file: File, maxMB = MAX_EVENT_PHOTO_MB): Validation {
  if (!file.type.startsWith('image/')) return { valid: false, error: 'File must be an image' };
  if (tooBig(file, maxMB)) {
    return { valid: false, error: `Image is ${sizeMB(file)} MB; the limit is ${maxMB} MB` };
  }
  return { valid: true };
}

export function validateVideo(file: File, maxMB = MAX_REEL_FILE_MB): Validation {
  if (!file.type.startsWith('video/')) return { valid: false, error: 'File must be a video' };
  if (tooBig(file, maxMB)) {
    return { valid: false, error: `Video is ${sizeMB(file)} MB; the limit is ${maxMB} MB` };
  }
  return { valid: true };
}

export function validateMediaFile(file: File): Validation {
  if (file.type.startsWith('image/')) return validateImage(file, MAX_REEL_FILE_MB);
  if (file.type.startsWith('video/')) return validateVideo(file);
  return { valid: false, error: 'File must be an image or video' };
}
