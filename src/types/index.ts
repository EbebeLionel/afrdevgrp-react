import { Timestamp } from 'firebase/firestore';

// ==========================================
// EVENT TYPES
// ==========================================

export interface Event {
  id: string;
  name: string;
  type: 'g-body' | 'major';
  date: string;              // ISO date string
  startTime: string;         // HH:MM format
  endTime: string;           // HH:MM format
  description: string;
  link?: string;
  photoUrl: string;          // Firebase Storage URL
  uploadedBy: string;        // User UID
  uploadedAt: Timestamp;
}

export type EventFormData = Omit<Event, 'id' | 'photoUrl' | 'uploadedAt' | 'uploadedBy'>;

// ==========================================
// REEL TYPES
// ==========================================

export interface MediaItem {
  id: string;
  type: 'photo' | 'video';
  url: string;              // Firebase Storage URL
  thumbnailUrl?: string;    // For videos
  order: number;            // Display order
}

export interface Comment {
  id: string;
  userId: string;
  username: string;
  text: string;
  createdAt: Timestamp;
}

export interface Reel {
  id: string;
  media: MediaItem[];       // Array of photos/videos
  caption: string;
  uploadedBy: string;       // User UID
  uploaderName: string;
  likes: number;
  likedBy: string[];
  comments: Comment[];
  views: number;
  createdAt: Timestamp;
}

export type ReelFormData = {
  caption: string;
  mediaFiles: File[];
};

// ==========================================
// STORAGE TYPES
// ==========================================

export interface UploadProgress {
  progress: number;
  status: 'uploading' | 'complete' | 'error';
  error?: string;
}

export interface MultiUploadProgress {
  [fileIndex: number]: UploadProgress;
}