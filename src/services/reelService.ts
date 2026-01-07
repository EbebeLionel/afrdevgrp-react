import { db } from '../firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  Timestamp,
  query,
  orderBy,
  increment,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { uploadMultipleFiles, deleteFile } from './storageService';
import { Reel, MediaItem, Comment } from '../types';

const REELS_COLLECTION = 'reels';

/**
 * Upload media files for a reel (photos and/or videos)
 * @param userId - User ID of the uploader
 * @param reelId - Reel ID
 * @param mediaFiles - Array of media files (photos and videos)
 * @param onProgress - Optional callback for upload progress
 * @returns Array of MediaItem objects with download URLs
 */
export async function uploadReelMedia(
  userId: string,
  reelId: string,
  mediaFiles: File[],
  onProgress?: (index: number, progress: { progress: number; status: string }) => void
): Promise<MediaItem[]> {
  const basePath = `reels/${userId}/${reelId}/media`;
  
  // Upload all files with progress tracking
  const urls = await uploadMultipleFiles(mediaFiles, basePath, onProgress);
  
  // Create MediaItem objects
  return mediaFiles.map((file, index) => {
    const mediaItem: MediaItem = {
      id: `${reelId}_${index}`,
      type: file.type.startsWith('video') ? 'video' : 'photo',
      url: urls[index],
      order: index
    };
    // Only add thumbnailUrl if we have one (omit if undefined)
    // For now, we don't generate thumbnails, so we just omit this field
    return mediaItem;
  });
}

/**
 * Create a new reel
 * @param caption - Reel caption
 * @param mediaFiles - Array of media files (photos and/or videos)
 * @param userId - User ID of the uploader
 * @param userName - Display name of the uploader
 * @param onProgress - Optional callback for upload progress
 * @returns Reel ID of the created reel
 */
export async function createReel(
  caption: string,
  mediaFiles: File[],
  userId: string,
  userName: string,
  onProgress?: (index: number, progress: { progress: number; status: string }) => void
): Promise<string> {
  try {
    if (mediaFiles.length === 0) {
      throw new Error('At least one media file is required');
    }
    
    // Generate new reel ID
    const reelId = doc(collection(db, REELS_COLLECTION)).id;
    
    // Upload media to Firebase Storage with progress tracking
    const media = await uploadReelMedia(userId, reelId, mediaFiles, onProgress);
    
    // Create reel document
    const reel: Reel = {
      id: reelId,
      media,
      caption,
      uploadedBy: userId,
      uploaderName: userName,
      likes: 0,
      likedBy: [],
      comments: [],
      views: 0,
      createdAt: Timestamp.now()
    };
    
    await setDoc(doc(db, REELS_COLLECTION, reelId), reel);
    return reelId;
  } catch (error) {
    console.error('Error creating reel:', error);
    throw error;
  }
}

/**
 * Get reel by ID
 * @param reelId - Reel ID
 * @returns Reel object or null if not found
 */
export async function getReel(reelId: string): Promise<Reel | null> {
  try {
    const docSnap = await getDoc(doc(db, REELS_COLLECTION, reelId));
    if (docSnap.exists()) {
      return docSnap.data() as Reel;
    }
    return null;
  } catch (error) {
    console.error('Error fetching reel:', error);
    throw error;
  }
}

/**
 * Get all reels ordered by creation date
 * @returns Array of all reels
 */
export async function getAllReels(): Promise<Reel[]> {
  try {
    const q = query(
      collection(db, REELS_COLLECTION), 
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data() as Reel);
  } catch (error) {
    console.error('Error fetching all reels:', error);
    throw error;
  }
}

/**
 * Get reels by user ID
 * @param userId - User ID of the uploader
 * @returns Array of reels uploaded by the user
 */
export async function getReelsByUser(userId: string): Promise<Reel[]> {
  try {
    const q = query(
      collection(db, REELS_COLLECTION),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    const reels = querySnapshot.docs.map(doc => doc.data() as Reel);
    return reels.filter(reel => reel.uploadedBy === userId);
  } catch (error) {
    console.error('Error fetching reels by user:', error);
    throw error;
  }
}

/**
 * Toggle like on a reel
 * @param reelId - Reel ID
 * @param userId - User ID
 */
export async function toggleReelLike(reelId: string, userId: string): Promise<void> {
  try {
    const reelRef = doc(db, REELS_COLLECTION, reelId);
    const reelSnap = await getDoc(reelRef);
    
    if (!reelSnap.exists()) {
      throw new Error('Reel not found');
    }
    
    const reel = reelSnap.data() as Reel;
    const hasLiked = reel.likedBy.includes(userId);
    
    if (hasLiked) {
      // Unlike
      await updateDoc(reelRef, {
        likes: increment(-1),
        likedBy: arrayRemove(userId)
      });
    } else {
      // Like
      await updateDoc(reelRef, {
        likes: increment(1),
        likedBy: arrayUnion(userId)
      });
    }
  } catch (error) {
    console.error('Error toggling reel like:', error);
    throw error;
  }
}

/**
 * Add a comment to a reel
 * @param reelId - Reel ID
 * @param userId - User ID of the commenter
 * @param username - Display name of the commenter
 * @param text - Comment text
 * @returns Comment ID
 */
export async function addReelComment(
  reelId: string,
  userId: string,
  username: string,
  text: string
): Promise<string> {
  try {
    const commentId = `${Date.now()}_${userId}`;
    const newComment: Comment = {
      id: commentId,
      userId,
      username,
      text: text.trim(),
      createdAt: Timestamp.now()
    };
    
    const reelRef = doc(db, REELS_COLLECTION, reelId);
    await updateDoc(reelRef, {
      comments: arrayUnion(newComment)
    });
    
    return commentId;
  } catch (error) {
    console.error('Error adding comment:', error);
    throw error;
  }
}

/**
 * Delete a comment from a reel
 * @param reelId - Reel ID
 * @param commentId - Comment ID
 */
export async function deleteReelComment(
  reelId: string,
  commentId: string
): Promise<void> {
  try {
    const reel = await getReel(reelId);
    if (!reel) {
      throw new Error('Reel not found');
    }
    
    const comment = reel.comments.find(c => c.id === commentId);
    if (!comment) {
      throw new Error('Comment not found');
    }
    
    const reelRef = doc(db, REELS_COLLECTION, reelId);
    await updateDoc(reelRef, {
      comments: arrayRemove(comment)
    });
  } catch (error) {
    console.error('Error deleting comment:', error);
    throw error;
  }
}

/**
 * Increment view count for a reel
 * @param reelId - Reel ID
 */
export async function incrementReelViews(reelId: string): Promise<void> {
  try {
    const reelRef = doc(db, REELS_COLLECTION, reelId);
    await updateDoc(reelRef, {
      views: increment(1)
    });
  } catch (error) {
    console.error('Error incrementing views:', error);
    // Don't throw, views are not critical
  }
}

/**
 * Update reel caption
 * @param reelId - Reel ID
 * @param caption - New caption
 */
export async function updateReelCaption(
  reelId: string,
  caption: string
): Promise<void> {
  try {
    const reelRef = doc(db, REELS_COLLECTION, reelId);
    await updateDoc(reelRef, {
      caption: caption.trim()
    });
  } catch (error) {
    console.error('Error updating caption:', error);
    throw error;
  }
}

/**
 * Delete a reel
 * @param reelId - Reel ID
 * @param userId - User ID of the uploader
 */
export async function deleteReel(reelId: string, userId: string): Promise<void> {
  try {
    const reel = await getReel(reelId);
    if (!reel) {
      throw new Error('Reel not found');
    }
    
    // Delete all media files from storage
    for (let i = 0; i < reel.media.length; i++) {
      // Try common file extensions
      const extensions = ['jpg', 'jpeg', 'png', 'gif', 'mp4', 'mov', 'webm'];
      
      for (const ext of extensions) {
        try {
          await deleteFile(`reels/${userId}/${reelId}/media/${i}.${ext}`);
          break; // If successful, stop trying
        } catch (error) {
          continue; // Try next extension
        }
      }
    }
    
    // Delete document from Firestore
    await deleteDoc(doc(db, REELS_COLLECTION, reelId));
  } catch (error) {
    console.error('Error deleting reel:', error);
    throw error;
  }
}

// ==========================================
// GETTER FUNCTIONS (for backward compatibility)
// ==========================================

/**
 * Get video URL for a reel (returns first video found)
 * @param reelId - Reel ID
 * @returns Video URL or null if no video found
 */
export async function getVideo(reelId: string): Promise<string | null> {
  try {
    const reel = await getReel(reelId);
    if (!reel) return null;
    
    const videoItem = reel.media.find(item => item.type === 'video');
    return videoItem?.url || null;
  } catch (error) {
    console.error('Error fetching video:', error);
    return null;
  }
}

/**
 * Get photo URL for a reel (returns first photo found)
 * @param reelId - Reel ID
 * @returns Photo URL or null if no photo found
 */
export async function getPhoto(reelId: string): Promise<string | null> {
  try {
    const reel = await getReel(reelId);
    if (!reel) return null;
    
    const photoItem = reel.media.find(item => item.type === 'photo');
    return photoItem?.url || null;
  } catch (error) {
    console.error('Error fetching photo:', error);
    return null;
  }
}

/**
 * Get all media items for a reel
 * @param reelId - Reel ID
 * @returns Array of MediaItem objects
 */
export async function getReelMedia(reelId: string): Promise<MediaItem[]> {
  const reel = await getReel(reelId);
  return reel?.media || [];
}

/**
 * Get reel caption
 */
export function getReelCaption(reel: Reel): string {
  return reel.caption;
}

/**
 * Get reel uploader name
 */
export function getUploaderName(reel: Reel): string {
  return reel.uploaderName;
}

/**
 * Get reel likes count
 */
export function getLikesCount(reel: Reel): number {
  return reel.likes;
}

/**
 * Get reel comments
 */
export function getReelComments(reel: Reel): Comment[] {
  return reel.comments;
}

/**
 * Get reel views count
 */
export function getViewsCount(reel: Reel): number {
  return reel.views;
}

/**
 * Check if user has liked a reel
 */
export function hasUserLiked(reel: Reel, userId: string): boolean {
  return reel.likedBy.includes(userId);
}

/**
 * Get comments count
 */
export function getCommentsCount(reel: Reel): number {
  return reel.comments.length;
}

/**
 * Helper: Format timestamp for display
 */
export function formatReelTimestamp(timestamp: Timestamp): string {
  const date = timestamp.toDate();
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  });
}