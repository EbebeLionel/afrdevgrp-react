import { createClient } from '@supabase/supabase-js';

const url = process.env.REACT_APP_SUPABASE_URL;
const anonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

if (!isSupabaseConfigured) {
  // Keep the public pages rendering, but make the cause obvious.
  console.error(
    'Supabase is not configured. Copy .env.example to .env.local and set ' +
      'REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY (see docs/SETUP.md).'
  );
}

export const SUPABASE_URL = url || 'http://localhost:54321';
export const SUPABASE_ANON_KEY = anonKey || 'missing-anon-key';

/**
 * The anon key is safe to ship in the browser: it only identifies the project.
 * Every permission is enforced by Row Level Security in the database
 * (supabase/migrations). Never put the service_role key in this app.
 */
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    flowType: 'pkce',
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export const BUCKETS = {
  eventPhotos: 'event-photos',
  reelMedia: 'reel-media',
} as const;

export type BucketName = (typeof BUCKETS)[keyof typeof BUCKETS];

/** Turn a Supabase/PostgREST/Storage error into a message worth showing. */
export function toUserMessage(
  error: unknown,
  fallback = 'Something went wrong. Please try again.'
): string {
  const e = error as { code?: string; message?: string; statusCode?: string | number } | null;
  if (!e) return fallback;
  if (e.code === '42501' || String(e.statusCode) === '403') {
    return 'Your account is not authorized to do that.';
  }
  if (String(e.statusCode) === '413') {
    return 'That file is too large.';
  }
  return e.message || fallback;
}
