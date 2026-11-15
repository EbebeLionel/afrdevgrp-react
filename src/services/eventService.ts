import { supabase, BUCKETS } from '../lib/supabase';
import { buildObjectPath, deleteFiles, getPublicUrl, uploadFile } from './storageService';
import { Event, EventFormData, UploadProgress } from '../types';

/**
 * Events data access.
 *
 * Who may write is decided by Row Level Security in Postgres (admins only),
 * not here. Any admin can edit or delete any event, whoever uploaded it.
 */

interface EventRow {
  id: string;
  name: string;
  type: 'g-body' | 'major';
  event_date: string;
  start_time: string; // HH:MM:SS
  end_time: string;
  description: string;
  link: string | null;
  photo_path: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

const hhmm = (time: string) => time.slice(0, 5);

function toEvent(row: EventRow): Event {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    date: row.event_date,
    startTime: hhmm(row.start_time),
    endTime: hhmm(row.end_time),
    description: row.description,
    link: row.link || undefined,
    photoUrl: getPublicUrl(BUCKETS.eventPhotos, row.photo_path),
    photoPath: row.photo_path,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toRowFields(data: EventFormData) {
  return {
    name: data.name.trim(),
    type: data.type,
    event_date: data.date,
    start_time: data.startTime,
    end_time: data.endTime,
    description: data.description.trim(),
    link: data.link?.trim() || null,
  };
}

/** All events, newest date first. */
export async function getAllEvents(): Promise<Event[]> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('event_date', { ascending: false })
    .order('start_time', { ascending: false })
    .limit(500);
  if (error) throw error;
  return (data as EventRow[]).map(toEvent);
}

/**
 * Create an event (admins only).
 * The photo is uploaded first; if saving the event then fails, the photo is
 * removed again so no orphan file is left behind.
 */
export async function createEvent(
  eventData: EventFormData,
  photoFile: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<Event> {
  const id = crypto.randomUUID();
  const photoPath = buildObjectPath(id, photoFile);
  await uploadFile(BUCKETS.eventPhotos, photoPath, photoFile, onProgress);

  const { data, error } = await supabase
    .from('events')
    .insert({ id, ...toRowFields(eventData), photo_path: photoPath })
    .select()
    .single();

  if (error) {
    await deleteFiles(BUCKETS.eventPhotos, [photoPath]);
    throw error;
  }
  return toEvent(data as EventRow);
}

/**
 * Edit an event (admins only), optionally replacing its photo.
 * Order matters: upload new photo → save row → delete old photo, so the row
 * never points at a file that doesn't exist.
 */
export async function updateEvent(
  event: Pick<Event, 'id' | 'photoPath'>,
  eventData: EventFormData,
  newPhotoFile?: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<Event> {
  let newPhotoPath: string | undefined;
  if (newPhotoFile) {
    newPhotoPath = buildObjectPath(event.id, newPhotoFile);
    await uploadFile(BUCKETS.eventPhotos, newPhotoPath, newPhotoFile, onProgress);
  }

  const { data, error } = await supabase
    .from('events')
    .update({ ...toRowFields(eventData), ...(newPhotoPath ? { photo_path: newPhotoPath } : {}) })
    .eq('id', event.id)
    .select()
    .maybeSingle();

  if (error || !data) {
    if (newPhotoPath) await deleteFiles(BUCKETS.eventPhotos, [newPhotoPath]);
    // RLS hides rows you may not edit, so "no row" means not allowed or gone.
    throw error || new Error('Event not found, or your account is not authorized to edit it.');
  }

  if (newPhotoPath && event.photoPath && event.photoPath !== newPhotoPath) {
    await deleteFiles(BUCKETS.eventPhotos, [event.photoPath]);
  }
  return toEvent(data as EventRow);
}

/** Delete an event and its photo (admins only). */
export async function deleteEvent(event: Pick<Event, 'id' | 'photoPath'>): Promise<void> {
  const { data, error } = await supabase
    .from('events')
    .delete()
    .eq('id', event.id)
    .select('id, photo_path');
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('Event not found, or your account is not authorized to delete it.');
  }
  // Row first, file second: a failed file delete leaves a harmless orphan,
  // never an event with a broken image.
  await deleteFiles(BUCKETS.eventPhotos, [data[0].photo_path]);
}

// ==========================================
// DISPLAY HELPERS
// ==========================================

/** Determine event status from its date and times (viewer's local clock). */
export function getEventStatus(
  date: string,
  startTime: string,
  endTime: string
): 'ongoing' | 'upcoming' | 'past' {
  // Parse components by hand to avoid UTC date-shift issues.
  const [year, month, day] = date.split('-').map(Number);
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);

  const start = new Date(year, month - 1, day, startHour, startMinute, 0, 0);
  const end = new Date(year, month - 1, day, endHour, endMinute, 0, 0);
  // An end time earlier than the start means the event runs past midnight.
  if (end <= start) end.setDate(end.getDate() + 1);

  const now = new Date();
  if (now >= start && now <= end) return 'ongoing';
  return now < start ? 'upcoming' : 'past';
}

export function formatEventDate(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatEventTime(time: string): string {
  if (!time || typeof time !== 'string') return 'N/A';
  const parts = time.split(':');
  if (parts.length < 2) return time;
  const hour = parseInt(parts[0], 10);
  if (isNaN(hour)) return time;
  const ampm = hour >= 12 ? 'PM' : 'AM';
  return `${hour % 12 || 12}:${parts[1]} ${ampm}`;
}
