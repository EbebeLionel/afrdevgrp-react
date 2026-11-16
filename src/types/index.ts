// ==========================================
// EVENTS
// ==========================================

export type EventKind = 'g-body' | 'major';

export interface Event {
  id: string;
  name: string;
  type: EventKind;
  date: string;        // YYYY-MM-DD
  startTime: string;   // HH:MM
  endTime: string;     // HH:MM
  description: string;
  link?: string;
  photoUrl: string;    // public URL
  photoPath: string;   // object name in the event-photos bucket
  createdBy: string | null;
  createdAt: string;   // ISO timestamp
  updatedAt: string;
}

export interface EventFormData {
  name: string;
  type: EventKind;
  date: string;
  startTime: string;
  endTime: string;
  description: string;
  link?: string;
}

// ==========================================
// REELS
// ==========================================

export interface MediaItem {
  id: string;
  type: 'photo' | 'video';
  url: string;         // public URL
  path: string;        // object name in the reel-media bucket
  order: number;
}

export interface Comment {
  id: string;
  userId: string;
  username: string;
  avatarUrl?: string;
  text: string;
  createdAt: string;
}

export interface Reel {
  id: string;
  media: MediaItem[];
  caption: string;
  uploadedBy: string | null;
  uploaderName: string;
  likes: number;
  likedByMe: boolean;
  commentCount: number;
  views: number;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// UPLOADS
// ==========================================

export interface UploadProgress {
  progress: number; // 0-100
  status: 'uploading' | 'complete' | 'error';
  error?: string;
}

export interface MultiUploadProgress {
  [fileIndex: number]: UploadProgress;
}

// ==========================================
// USERS
// ==========================================

export interface Profile {
  id: string;
  fullName: string | null;
  avatarUrl: string | null;
}
