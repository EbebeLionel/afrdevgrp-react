import { supabase, BUCKETS } from '../lib/supabase';
import { buildObjectPath, deleteFiles, getPublicUrl, uploadFile } from './storageService';
import { Comment, MediaItem, Reel, UploadProgress } from '../types';

/**
 * Reels data access.
 *
 * Permissions live in Postgres (Row Level Security):
 *   - anyone can view reels and comments
 *   - signed-in users can like, comment, and delete their own comments
 *   - admins can upload reels, edit captions, delete reels and any comment
 */

interface FeedMedia {
  id: string;
  kind: 'photo' | 'video';
  path: string;
  position: number;
}

interface FeedRow {
  id: string;
  caption: string;
  view_count: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  author_name: string;
  like_count: number;
  comment_count: number;
  liked_by_me: boolean;
  media: FeedMedia[];
}

function toReel(row: FeedRow): Reel {
  const media: MediaItem[] = (row.media || []).map((m) => ({
    id: m.id,
    type: m.kind,
    url: getPublicUrl(BUCKETS.reelMedia, m.path),
    path: m.path,
    order: m.position,
  }));
  return {
    id: row.id,
    media,
    caption: row.caption,
    uploadedBy: row.created_by,
    uploaderName: row.author_name,
    likes: row.like_count,
    likedByMe: row.liked_by_me,
    commentCount: row.comment_count,
    views: row.view_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Newest reels first. One query: media, counts and "did I like it" included. */
export async function getAllReels(): Promise<Reel[]> {
  const { data, error } = await supabase
    .from('reel_feed')
    .select('*')
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(100);
  if (error) throw error;
  // A reel with no media can't be displayed; skip rather than crash the page.
  return (data as FeedRow[]).map(toReel).filter((reel) => reel.media.length > 0);
}

/**
 * Create a reel from photos and/or videos (admins only).
 *
 * Files upload in parallel under `<reelId>/…`, then one RPC writes the reel
 * and all media rows in a single transaction. If anything fails, every file
 * uploaded for this attempt is removed.
 */
export async function createReel(
  caption: string,
  mediaFiles: File[],
  onProgress?: (index: number, progress: UploadProgress) => void
): Promise<string> {
  if (mediaFiles.length === 0) {
    throw new Error('At least one photo or video is required');
  }

  const reelId = crypto.randomUUID();
  const items = mediaFiles.map((file) => ({
    file,
    kind: file.type.startsWith('video/') ? 'video' : 'photo',
    path: buildObjectPath(reelId, file),
  }));

  const results = await Promise.allSettled(
    items.map((item, index) =>
      uploadFile(BUCKETS.reelMedia, item.path, item.file, (p) => onProgress?.(index, p))
    )
  );

  const cleanup = () =>
    deleteFiles(
      BUCKETS.reelMedia,
      items.filter((_, i) => results[i].status === 'fulfilled').map((item) => item.path)
    );

  const failed = results.find((r) => r.status === 'rejected') as PromiseRejectedResult | undefined;
  if (failed) {
    await cleanup();
    throw failed.reason;
  }

  const { error } = await supabase.rpc('create_reel', {
    p_id: reelId,
    p_caption: caption,
    p_media: items.map(({ kind, path }) => ({ kind, path })),
  });
  if (error) {
    await cleanup();
    throw error;
  }
  return reelId;
}

/** Edit a reel's caption (admins only — any admin, any reel). */
export async function updateReelCaption(reelId: string, caption: string): Promise<void> {
  const { data, error } = await supabase
    .from('reels')
    .update({ caption: caption.trim() })
    .eq('id', reelId)
    .select('id');
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('Reel not found, or your account is not authorized to edit it.');
  }
}

/** Delete a reel, its likes/comments (cascade) and its files (admins only). */
export async function deleteReel(reel: Pick<Reel, 'id' | 'media'>): Promise<void> {
  const { data, error } = await supabase.from('reels').delete().eq('id', reel.id).select('id');
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('Reel not found, or your account is not authorized to delete it.');
  }
  await deleteFiles(
    BUCKETS.reelMedia,
    reel.media.map((m) => m.path)
  );
}

/**
 * Like or unlike as the signed-in user. Idempotent: liking twice or
 * unliking something you never liked is not an error.
 */
export async function setReelLike(reelId: string, liked: boolean): Promise<void> {
  if (liked) {
    const { error } = await supabase.from('reel_likes').insert({ reel_id: reelId });
    if (error && error.code !== '23505') throw error; // 23505 = already liked
  } else {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw new Error('Please sign in.');
    const { error } = await supabase
      .from('reel_likes')
      .delete()
      .eq('reel_id', reelId)
      .eq('user_id', data.user.id);
    if (error) throw error;
  }
}

const COMMENT_COLUMNS = 'id, user_id, body, created_at, author:profiles(full_name, avatar_url)';

function toComment(row: any): Comment {
  const author = Array.isArray(row.author) ? row.author[0] : row.author;
  return {
    id: row.id,
    userId: row.user_id,
    username: author?.full_name || 'ADG member',
    avatarUrl: author?.avatar_url || undefined,
    text: row.body,
    createdAt: row.created_at,
  };
}

export async function getReelComments(reelId: string): Promise<Comment[]> {
  const { data, error } = await supabase
    .from('reel_comments')
    .select(COMMENT_COLUMNS)
    .eq('reel_id', reelId)
    .order('created_at', { ascending: true })
    .limit(200);
  if (error) throw error;
  return (data || []).map(toComment);
}

/** Post a comment as the signed-in user. */
export async function addReelComment(reelId: string, text: string): Promise<Comment> {
  const { data, error } = await supabase
    .from('reel_comments')
    .insert({ reel_id: reelId, body: text.trim() })
    .select(COMMENT_COLUMNS)
    .single();
  if (error) throw error;
  return toComment(data);
}

/** Delete a comment: its author, or any admin. */
export async function deleteReelComment(commentId: string): Promise<void> {
  const { data, error } = await supabase
    .from('reel_comments')
    .delete()
    .eq('id', commentId)
    .select('id');
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('Comment not found, or you are not allowed to delete it.');
  }
}

/** Count a view. Not critical, so failures are swallowed. */
export async function incrementReelViews(reelId: string): Promise<void> {
  const { error } = await supabase.rpc('increment_reel_view', { p_reel_id: reelId });
  if (error) console.warn('Could not record view:', error.message);
}

export function formatReelTimestamp(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMins = Math.floor((now.getTime() - date.getTime()) / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}
