import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject, uploadBytesResumable } from 'firebase/storage';
import { app } from '../firebase';
import { UploadProgress } from '../types';

const storage = getStorage(app);

/**
 * Upload a single file to Firebase Storage
 * @param file - File to upload
 * @param path - Storage path (e.g., 'events/userId/eventId/photo.jpg')
 * @param onProgress - Optional callback for upload progress
 * @returns Download URL of uploaded file
 */
export async function uploadFile(
  file: File,
  path: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<string> {
  try {
    const storageRef = ref(storage, path);
    
    if (onProgress) {
      // Use resumable upload for progress tracking
      const uploadTask = uploadBytesResumable(storageRef, file);
      
      return new Promise((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            onProgress({
              progress: Math.round(progress),
              status: 'uploading'
            });
          },
          (error) => {
            onProgress({
              progress: 0,
              status: 'error',
              error: error.message
            });
            reject(error);
          },
          async () => {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            onProgress({
              progress: 100,
              status: 'complete'
            });
            resolve(downloadURL);
          }
        );
      });
    } else {
      // Simple upload without progress tracking
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      return downloadURL;
    }
  } catch (error) {
    if (onProgress) {
      onProgress({
        progress: 0,
        status: 'error',
        error: error instanceof Error ? error.message : 'Upload failed'
      });
    }
    throw error;
  }
}

/**
 * Upload multiple files to Firebase Storage
 * @param files - Array of files to upload
 * @param basePath - Base storage path (file index will be appended)
 * @param onProgress - Optional callback for individual file progress
 * @returns Array of download URLs
 */
export async function uploadMultipleFiles(
  files: File[],
  basePath: string,
  onProgress?: (index: number, progress: UploadProgress) => void
): Promise<string[]> {
  const uploadPromises = files.map((file, index) => {
    const extension = file.name.split('.').pop() || 'bin';
    const path = `${basePath}/${index}.${extension}`;
    
    return uploadFile(file, path, onProgress ? (progress) => {
      onProgress(index, progress);
    } : undefined);
  });
  
  return Promise.all(uploadPromises);
}

/**
 * Delete a file from Firebase Storage
 * @param path - Storage path of file to delete
 */
export async function deleteFile(path: string): Promise<void> {
  try {
    const storageRef = ref(storage, path);
    await deleteObject(storageRef);
  } catch (error) {
    console.error('Error deleting file:', error);
    throw error;
  }
}

/**
 * Delete multiple files from Firebase Storage
 * @param paths - Array of storage paths to delete
 */
export async function deleteMultipleFiles(paths: string[]): Promise<void> {
  const deletePromises = paths.map(path => deleteFile(path).catch(err => {
    console.warn(`Failed to delete ${path}:`, err);
    // Don't throw, continue with other deletions
  }));
  
  await Promise.all(deletePromises);
}

/**
 * Get the file extension from a File object
 */
export function getFileExtension(file: File): string {
  return file.name.split('.').pop() || 'bin';
}

/**
 * Validate file size
 * @param file - File to validate
 * @param maxSizeMB - Maximum size in megabytes
 * @returns true if valid, false otherwise
 */
export function validateFileSize(file: File, maxSizeMB: number): boolean {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxSizeBytes;
}

/**
 * Validate file type
 * @param file - File to validate
 * @param allowedTypes - Array of allowed MIME types or extensions
 * @returns true if valid, false otherwise
 */
export function validateFileType(file: File, allowedTypes: string[]): boolean {
  return allowedTypes.some(type => {
    if (type.startsWith('.')) {
      return file.name.toLowerCase().endsWith(type.toLowerCase());
    }
    return file.type.startsWith(type);
  });
}

/**
 * Validate image file
 */
export function validateImage(file: File): { valid: boolean; error?: string } {
  if (!validateFileType(file, ['image/'])) {
    return { valid: false, error: 'File must be an image' };
  }
  // No size limit - removed restriction
  return { valid: true };
}

/**
 * Validate video file
 */
export function validateVideo(file: File): { valid: boolean; error?: string } {
  if (!validateFileType(file, ['video/'])) {
    return { valid: false, error: 'File must be a video' };
  }
  // No size limit - removed restriction
  return { valid: true };
}

/**
 * Validate media file (image or video)
 */
export function validateMediaFile(file: File): { valid: boolean; error?: string } {
  if (file.type.startsWith('image/')) {
    return validateImage(file);
  } else if (file.type.startsWith('video/')) {
    return validateVideo(file);
  } else {
    return { valid: false, error: 'File must be an image or video' };
  }
}