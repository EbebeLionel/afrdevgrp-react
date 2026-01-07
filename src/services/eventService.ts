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
  where
} from 'firebase/firestore';
import { uploadFile, deleteFile, getFileExtension } from './storageService';
import { Event, EventFormData } from '../types';

const EVENTS_COLLECTION = 'events';

/**
 * Upload event photo to Firebase Storage
 * @param userId - User ID of the uploader
 * @param eventId - Event ID
 * @param photoFile - Photo file to upload
 * @returns Download URL of the uploaded photo
 */
export async function uploadEventPhoto(
  userId: string,
  eventId: string,
  photoFile: File
): Promise<string> {
  const extension = getFileExtension(photoFile);
  const path = `events/${userId}/${eventId}/photo.${extension}`;
  return await uploadFile(photoFile, path);
}

/**
 * Create a new event
 * @param eventData - Event form data
 * @param photoFile - Photo file to upload
 * @param userId - User ID of the uploader
 * @returns Event ID of the created event
 */
export async function createEvent(
  eventData: EventFormData,
  photoFile: File,
  userId: string
): Promise<string> {
  try {
    // Generate new event ID
    const eventId = doc(collection(db, EVENTS_COLLECTION)).id;
    
    // Upload photo to Firebase Storage
    const photoUrl = await uploadEventPhoto(userId, eventId, photoFile);
    
    // Create event document - remove undefined fields
    const event: any = {
      ...eventData,
      id: eventId,
      photoUrl,
      uploadedBy: userId,
      uploadedAt: Timestamp.now()
    };
    
    // Remove undefined fields (Firestore doesn't accept undefined)
    Object.keys(event).forEach(key => {
      if (event[key] === undefined) {
        delete event[key];
      }
    });
    
    await setDoc(doc(db, EVENTS_COLLECTION, eventId), event);
    return eventId;
  } catch (error) {
    console.error('Error creating event:', error);
    throw error;
  }
}

/**
 * Get event by ID
 * @param eventId - Event ID
 * @returns Event object or null if not found
 */
export async function getEvent(eventId: string): Promise<Event | null> {
  try {
    const docSnap = await getDoc(doc(db, EVENTS_COLLECTION, eventId));
    if (docSnap.exists()) {
      return docSnap.data() as Event;
    }
    return null;
  } catch (error) {
    console.error('Error fetching event:', error);
    throw error;
  }
}

/**
 * Get all events ordered by date
 * @returns Array of all events
 */
export async function getAllEvents(): Promise<Event[]> {
  try {
    const q = query(
      collection(db, EVENTS_COLLECTION), 
      orderBy('date', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data() as Event);
  } catch (error) {
    console.error('Error fetching all events:', error);
    throw error;
  }
}

/**
 * Get events by type
 * @param type - Event type ('g-body' or 'major')
 * @returns Array of events of the specified type
 */
export async function getEventsByType(type: 'g-body' | 'major'): Promise<Event[]> {
  try {
    const q = query(
      collection(db, EVENTS_COLLECTION),
      where('type', '==', type),
      orderBy('date', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data() as Event);
  } catch (error) {
    console.error('Error fetching events by type:', error);
    throw error;
  }
}

/**
 * Get events by user ID
 * @param userId - User ID of the uploader
 * @returns Array of events uploaded by the user
 */
export async function getEventsByUser(userId: string): Promise<Event[]> {
  try {
    const q = query(
      collection(db, EVENTS_COLLECTION),
      where('uploadedBy', '==', userId),
      orderBy('uploadedAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data() as Event);
  } catch (error) {
    console.error('Error fetching events by user:', error);
    throw error;
  }
}

/**
 * Update an existing event
 * @param eventId - Event ID
 * @param updates - Partial event data to update
 * @param newPhotoFile - Optional new photo file
 * @param userId - User ID (required if uploading new photo)
 */
export async function updateEvent(
  eventId: string,
  updates: Partial<EventFormData>,
  newPhotoFile?: File,
  userId?: string
): Promise<void> {
  try {
    const updateData: any = { ...updates };
    
    // If new photo is provided, upload it
    if (newPhotoFile && userId) {
      const photoUrl = await uploadEventPhoto(userId, eventId, newPhotoFile);
      updateData.photoUrl = photoUrl;
    }
    
    // Remove undefined fields (Firestore doesn't accept undefined)
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });
    
    await updateDoc(doc(db, EVENTS_COLLECTION, eventId), updateData);
  } catch (error) {
    console.error('Error updating event:', error);
    throw error;
  }
}

/**
 * Delete an event
 * @param eventId - Event ID
 * @param userId - User ID of the uploader
 */
export async function deleteEvent(eventId: string, userId: string): Promise<void> {
  try {
    // Try to delete photo from storage
    // We try common extensions since we don't store the extension
    const extensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    
    for (const ext of extensions) {
      try {
        await deleteFile(`events/${userId}/${eventId}/photo.${ext}`);
        break; // If successful, stop trying
      } catch (error) {
        // Continue to next extension
        continue;
      }
    }
    
    // Delete document from Firestore
    await deleteDoc(doc(db, EVENTS_COLLECTION, eventId));
  } catch (error) {
    console.error('Error deleting event:', error);
    throw error;
  }
}

// ==========================================
// GETTER FUNCTIONS (as requested)
// ==========================================

/**
 * Get event name
 */
export function getEventName(event: Event): string {
  return event.name;
}

/**
 * Get event photo URL
 */
export function getEventPhoto(event: Event): string {
  return event.photoUrl;
}

/**
 * Get event type
 */
export function getEventType(event: Event): 'g-body' | 'major' {
  return event.type;
}

/**
 * Get event date
 */
export function getEventDate(event: Event): string {
  return event.date;
}

/**
 * Get event start time
 */
export function getStartTime(event: Event): string {
  return event.startTime;
}

/**
 * Get event end time
 */
export function getEndTime(event: Event): string {
  return event.endTime;
}

/**
 * Get event description
 */
export function getDescription(event: Event): string {
  return event.description;
}

/**
 * Get event link (optional)
 */
export function getEventLink(event: Event): string | undefined {
  return event.link;
}

/**
 * Get event uploader ID
 */
export function getUploadedBy(event: Event): string {
  return event.uploadedBy;
}

/**
 * Get event upload timestamp
 */
export function getUploadedAt(event: Event): Timestamp {
  return event.uploadedAt;
}

/**
 * Helper: Determine event status based on date and time
 */
export function getEventStatus(
  date: string,
  startTime: string,
  endTime: string
): 'ongoing' | 'upcoming' | 'past' {
  // Parse date components to avoid timezone issues
  const [year, month, day] = date.split('-');
  const eventDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  
  // Parse times
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);
  
  const eventStartDateTime = new Date(eventDate);
  eventStartDateTime.setHours(startHour, startMinute, 0, 0);
  
  const eventEndDateTime = new Date(eventDate);
  eventEndDateTime.setHours(endHour, endMinute, 0, 0);
  
  const now = new Date();
  
  if (now >= eventStartDateTime && now <= eventEndDateTime) {
    return 'ongoing';
  } else if (now < eventStartDateTime) {
    return 'upcoming';
  } else {
    return 'past';
  }
}

/**
 * Helper: Format date for display
 * Fixed to avoid timezone offset issues
 */
export function formatEventDate(date: string): string {
  // Parse date components to avoid timezone issues
  const [year, month, day] = date.split('-');
  const d = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  return d.toLocaleDateString('en-US', { 
    month: 'long', 
    day: 'numeric', 
    year: 'numeric' 
  });
}

/**
 * Helper: Format time for display
 */
export function formatEventTime(time: string): string {
  if (!time || typeof time !== 'string') {
    return 'N/A';
  }
  
  const parts = time.split(':');
  if (parts.length !== 2) {
    return time;
  }
  
  const [hours, minutes] = parts;
  const hour = parseInt(hours);
  
  if (isNaN(hour)) {
    return time;
  }
  
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
}