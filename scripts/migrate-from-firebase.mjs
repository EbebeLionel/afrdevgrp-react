/**
 * One-time copy of existing events and reels from the old Firebase project
 * into Supabase. Safe to re-run: anything already copied is skipped.
 *
 *   Copies:  events (+ photo), reels (+ photos/videos, caption, view count, date)
 *   Skips:   likes and comments (they belong to old Firebase accounts, which
 *            do not carry over to Google sign-in) and user accounts.
 *
 * Usage (PowerShell), after running the SQL migration in Supabase:
 *   $env:SUPABASE_URL = "https://YOUR-REF.supabase.co"
 *   $env:SUPABASE_SERVICE_ROLE_KEY = "..."     # Supabase -> Settings -> API
 *   node scripts/migrate-from-firebase.mjs --dry-run   # preview only
 *   node scripts/migrate-from-firebase.mjs
 *
 * The service role key bypasses all security rules. Use it only here, on your
 * own machine; never commit it or add it to Vercel.
 */
import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const FIREBASE_PROJECT = 'adg-columbia-13d72';
const FIRESTORE = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents`;
const DRY_RUN = process.argv.includes('--dry-run');

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!DRY_RUN && (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY)) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY first (see the top of this file).');
  process.exit(1);
}
const supabase = DRY_RUN
  ? null
  : createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

// ---- helpers ---------------------------------------------------------------

/** Same Firebase id always maps to the same UUID, which makes re-runs safe. */
function stableUuid(kind, firebaseId) {
  const h = createHash('sha1').update(`adg:${kind}:${firebaseId}`).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

/** Firestore REST returns typed values ({stringValue: ...}); unwrap them. */
function unwrap(value) {
  if (value == null) return null;
  if ('stringValue' in value) return value.stringValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return value.doubleValue;
  if ('booleanValue' in value) return value.booleanValue;
  if ('timestampValue' in value) return value.timestampValue;
  if ('nullValue' in value) return null;
  if ('arrayValue' in value) return (value.arrayValue.values || []).map(unwrap);
  if ('mapValue' in value) return unwrapFields(value.mapValue.fields || {});
  return null;
}
const unwrapFields = (fields) =>
  Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, unwrap(v)]));

async function readCollection(name) {
  const docs = [];
  let pageToken = '';
  do {
    const res = await fetch(`${FIRESTORE}/${name}?pageSize=100${pageToken ? `&pageToken=${pageToken}` : ''}`);
    if (!res.ok) throw new Error(`Reading Firestore "${name}" failed: ${res.status} ${await res.text()}`);
    const body = await res.json();
    for (const doc of body.documents || []) {
      docs.push({ firebaseId: doc.name.split('/').pop(), ...unwrapFields(doc.fields || {}) });
    }
    pageToken = body.nextPageToken || '';
  } while (pageToken);
  return docs;
}

const EXT = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif',
  'image/heic': 'heic', 'video/mp4': 'mp4', 'video/quicktime': 'mov', 'video/webm': 'webm',
};

async function download(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download failed (${res.status})`);
  const contentType = (res.headers.get('content-type') || 'application/octet-stream').split(';')[0];
  return { bytes: Buffer.from(await res.arrayBuffer()), contentType };
}

async function copyFile(bucket, folder, name, url) {
  const { bytes, contentType } = await download(url);
  const path = `${folder}/${name}.${EXT[contentType] || 'bin'}`;
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, bytes, { contentType, cacheControl: '31536000', upsert: true });
  if (error) throw new Error(`upload to ${bucket}/${path} failed: ${error.message}`);
  return { path, sizeMB: (bytes.length / 1048576).toFixed(1) };
}

async function exists(table, id) {
  const { data, error } = await supabase.from(table).select('id').eq('id', id).maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

const normTime = (t) => (/^\d{1,2}:\d{2}/.test(t || '') ? t : '00:00');

// ---- events ----------------------------------------------------------------

async function migrateEvents() {
  const events = await readCollection('events');
  console.log(`\nEvents: ${events.length} found in Firebase`);
  let copied = 0, skipped = 0, failed = 0;

  for (const e of events) {
    const id = stableUuid('event', e.firebaseId);
    const label = `"${e.name}" (${e.date})`;
    try {
      if (DRY_RUN) { console.log(`  would copy ${label}`); continue; }
      if (await exists('events', id)) { skipped++; console.log(`  skip   ${label} (already copied)`); continue; }
      if (!e.photoUrl) throw new Error('no photo');

      const photo = await copyFile('event-photos', id, 'photo', e.photoUrl);
      const { error } = await supabase.from('events').insert({
        id,
        name: e.name,
        type: e.type === 'major' ? 'major' : 'g-body',
        event_date: e.date,
        start_time: normTime(e.startTime),
        end_time: normTime(e.endTime),
        description: e.description || '',
        link: /^https?:\/\//i.test(e.link || '') ? e.link : null,
        photo_path: photo.path,
        created_at: e.uploadedAt || undefined,
      });
      if (error) throw new Error(error.message);
      copied++; console.log(`  copied ${label} (${photo.sizeMB} MB)`);
    } catch (err) {
      failed++; console.log(`  FAILED ${label}: ${err.message}`);
    }
  }
  return { copied, skipped, failed };
}

// ---- reels -----------------------------------------------------------------

async function migrateReels() {
  const reels = await readCollection('reels');
  console.log(`\nReels: ${reels.length} found in Firebase`);
  let copied = 0, skipped = 0, failed = 0;

  for (const r of reels) {
    const id = stableUuid('reel', r.firebaseId);
    const label = `"${(r.caption || '').slice(0, 40)}"`;
    try {
      const media = [...(r.media || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      if (DRY_RUN) { console.log(`  would copy ${label} (${media.length} file(s))`); continue; }
      if (await exists('reels', id)) { skipped++; console.log(`  skip   ${label} (already copied)`); continue; }
      if (media.length === 0) throw new Error('no media');

      const rows = [];
      for (let i = 0; i < media.length; i++) {
        const file = await copyFile('reel-media', id, String(i), media[i].url);
        rows.push({ reel_id: id, kind: media[i].type === 'video' ? 'video' : 'photo', storage_path: file.path, position: i });
        console.log(`         file ${i + 1}/${media.length} (${file.sizeMB} MB)`);
      }

      const { error: reelError } = await supabase.from('reels').insert({
        id,
        caption: r.caption || '',
        view_count: Number.isFinite(r.views) ? r.views : 0,
        created_at: r.createdAt || undefined,
      });
      if (reelError) throw new Error(reelError.message);

      const { error: mediaError } = await supabase.from('reel_media').insert(rows);
      if (mediaError) {
        await supabase.from('reels').delete().eq('id', id); // don't leave a reel with no media
        throw new Error(mediaError.message);
      }
      copied++; console.log(`  copied ${label}`);
    } catch (err) {
      failed++; console.log(`  FAILED ${label}: ${err.message}`);
    }
  }
  return { copied, skipped, failed };
}

// ---- run -------------------------------------------------------------------

console.log(DRY_RUN ? 'DRY RUN: nothing will be written.' : `Copying into ${SUPABASE_URL}`);
const ev = await migrateEvents();
const re = await migrateReels();
if (!DRY_RUN) {
  console.log(`\nDone. Events: ${ev.copied} copied, ${ev.skipped} skipped, ${ev.failed} failed.`);
  console.log(`      Reels:  ${re.copied} copied, ${re.skipped} skipped, ${re.failed} failed.`);
  if (ev.failed || re.failed) process.exitCode = 1;
}
