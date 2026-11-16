import React, { useCallback, useEffect, useRef, useState } from 'react';
import './Events.css';
import {
  getAllEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  getEventStatus,
  formatEventDate,
  formatEventTime
} from '../../services/eventService';
import { validateImage, MAX_EVENT_PHOTO_MB } from '../../services/storageService';
import { toUserMessage } from '../../lib/supabase';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useAuth } from '../../contexts/AuthContext';
import { useConfirm, useFeedback } from '../common/Feedback';
import { Event as EventType, EventFormData, UploadProgress } from '../../types';

type Status = 'ongoing' | 'upcoming' | 'past';

const EMPTY_FORM = {
  name: '',
  type: 'g-body' as 'g-body' | 'major',
  date: '',
  startTime: '',
  endTime: '',
  description: '',
  link: '',
};

// ----------------------------------------------------------------------------
// One event card. Defined at module level so React keeps the same component
// between renders (a component created inside Events would be remounted on
// every state change, which is what made cards vanish after Cancel).
// ----------------------------------------------------------------------------
interface EventCardProps {
  event: EventType;
  status: Status;
  isAdmin: boolean;
  onEdit: (event: EventType) => void;
  onDelete: (event: EventType) => void;
}

const EventCard: React.FC<EventCardProps> = ({ event, status, isAdmin, onEdit, onDelete }) => (
  <article className={`event-card ${event.type === 'major' ? 'major-event' : 'gbody-event'}`}>
    <div className="event-image-container">
      <img src={event.photoUrl} alt={event.name} className="event-image" loading="lazy" />
      {event.type === 'major' && <div className="major-badge">MAJOR EVENT</div>}
      {status === 'ongoing' && <div className="live-badge">LIVE NOW</div>}
      {isAdmin && (
        <div className="event-actions">
          <button
            type="button"
            className="edit-btn"
            onClick={() => onEdit(event)}
            title="Edit event"
            aria-label={`Edit ${event.name}`}
          >
            ✏️
          </button>
          <button
            type="button"
            className="delete-btn"
            onClick={() => onDelete(event)}
            title="Delete event"
            aria-label={`Delete ${event.name}`}
          >
            🗑️
          </button>
        </div>
      )}
    </div>
    <div className="event-details">
      <h3 className="event-name">{event.name}</h3>
      <div className="event-datetime">
        <span className="event-date">📅 {formatEventDate(event.date)}</span>
        <span className="event-time">
          🕐 {formatEventTime(event.startTime)} – {formatEventTime(event.endTime)}
        </span>
      </div>
      {event.description && <p className="event-description">{event.description}</p>}
      {event.link && (
        <a href={event.link} target="_blank" rel="noopener noreferrer" className="event-link">
          View event details →
        </a>
      )}
    </div>
  </article>
);

const Events: React.FC = () => {
  usePageTitle('Events');
  // isAdmin only decides which controls are shown; the database enforces it.
  const { isAdmin } = useAuth();
  const { show } = useFeedback();
  const confirm = useConfirm();

  const [events, setEvents] = useState<EventType[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const hasLoaded = useRef(false);

  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventType | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoError, setPhotoError] = useState('');
  const [objectUrl, setObjectUrl] = useState('');
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const saving = progress?.status === 'uploading';

  // ---- loading -------------------------------------------------------------

  const loadEvents = useCallback(async () => {
    // Only show the loading state the first time. Refreshing after a save or
    // cancel keeps the current list on screen, so nothing flickers or vanishes.
    if (!hasLoaded.current) setLoading(true);
    try {
      setLoadError('');
      setEvents(await getAllEvents());
      hasLoaded.current = true;
    } catch (error) {
      console.error('Error loading events:', error);
      setLoadError('We could not load events. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // ---- photo preview -------------------------------------------------------

  // Preview a newly chosen photo, and release its memory when it changes.
  useEffect(() => {
    if (!photoFile) {
      setObjectUrl('');
      return;
    }
    const url = URL.createObjectURL(photoFile);
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [photoFile]);

  const previewSrc = objectUrl || editingEvent?.photoUrl || '';

  // ---- modal ---------------------------------------------------------------

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setPhotoFile(null);
    setPhotoError('');
    setEditingEvent(null);
    setProgress(null);
  };

  /**
   * Closes the form without saving. Cancel, the × button, clicking outside and
   * Escape all go through here. It reloads the list, the same as a save does,
   * so the events are back on screen straight away.
   */
  const closeModal = useCallback(() => {
    if (saving) return;
    setShowModal(false);
    resetForm();
    loadEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saving, loadEvents]);

  useEffect(() => {
    if (!showModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [showModal, closeModal]);

  const openNewEvent = () => {
    resetForm();
    setShowModal(true);
  };

  const openEdit = (event: EventType) => {
    resetForm();
    setForm({
      name: event.name,
      type: event.type,
      date: event.date,
      startTime: event.startTime,
      endTime: event.endTime,
      description: event.description,
      link: event.link || '',
    });
    setEditingEvent(event);
    setShowModal(true);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setPhotoError('');
    if (!file) {
      setPhotoFile(null);
      return;
    }
    const validation = validateImage(file);
    if (!validation.valid) {
      setPhotoError(validation.error || 'Choose an image file.');
      setPhotoFile(null);
      e.target.value = '';
      return;
    }
    setPhotoFile(file);
  };

  const setField = (field: keyof typeof EMPTY_FORM) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setForm((current) => ({ ...current, [field]: e.target.value }));

  // ---- save / delete -------------------------------------------------------

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    if (form.endTime <= form.startTime) {
      setProgress({ progress: 0, status: 'error', error: 'The end time must be after the start time.' });
      return;
    }

    const eventData: EventFormData = {
      name: form.name,
      type: form.type,
      date: form.date,
      startTime: form.startTime,
      endTime: form.endTime,
      description: form.description,
      link: form.link || undefined,
    };

    try {
      setProgress({ progress: 0, status: 'uploading' });
      if (editingEvent) {
        await updateEvent(editingEvent, eventData, photoFile || undefined, setProgress);
        show(`“${form.name}” was updated.`, 'success');
      } else {
        await createEvent(eventData, photoFile as File, setProgress);
        show(`“${form.name}” was added to Events.`, 'success');
      }
      setShowModal(false);
      resetForm();
      await loadEvents();
    } catch (error) {
      console.error('Error saving event:', error);
      setProgress({
        progress: 0,
        status: 'error',
        error: toUserMessage(error, 'Could not save the event. Your changes are still here, so try again.'),
      });
    }
  };

  const handleDelete = async (event: EventType) => {
    const ok = await confirm({
      title: 'Delete this event?',
      message: `“${event.name}” and its photo will be removed for everyone. This cannot be undone.`,
      confirmLabel: 'Delete event',
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteEvent(event);
      setEvents((current) => current.filter((e) => e.id !== event.id));
      show(`“${event.name}” was deleted.`, 'success');
    } catch (error) {
      console.error('Error deleting event:', error);
      show(toUserMessage(error, 'The event could not be deleted. Please try again.'), 'error');
    }
  };

  // ---- derived lists -------------------------------------------------------

  const statusOf = (event: EventType): Status => getEventStatus(event.date, event.startTime, event.endTime);
  const ongoing = events.filter((e) => statusOf(e) === 'ongoing');
  const upcoming = events.filter((e) => statusOf(e) === 'upcoming');
  const past = events.filter((e) => statusOf(e) === 'past');

  const section = (title: string, items: EventType[], status: Status, tone: string) =>
    items.length > 0 && (
      <section className="events-section" aria-labelledby={`events-${status}`}>
        <h2 id={`events-${status}`} className={`section-title ${tone}`}>
          {title} <span className="section-count">{items.length}</span>
        </h2>
        <div className="events-grid">
          {items.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              status={status}
              isAdmin={isAdmin}
              onEdit={openEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      </section>
    );

  // ---- render --------------------------------------------------------------

  return (
    <div className="events-page">
      <div className="events-content">
        <h1 className="events-title">ADG Events</h1>
        <p className="events-intro">
          Talks, cultural nights and community gatherings from African Development Group Columbia.
        </p>

        {isAdmin && (
          <button type="button" className="upload-event-btn" onClick={openNewEvent}>
            + Add event
          </button>
        )}

        {loading ? (
          <div className="loading-container" role="status" aria-live="polite">
            <div className="spinner" aria-hidden="true" />
            <p>Loading events…</p>
          </div>
        ) : loadError ? (
          <div className="no-events" role="alert">
            <p>{loadError}</p>
            <button type="button" className="retry-btn" onClick={loadEvents}>
              Try again
            </button>
          </div>
        ) : events.length === 0 ? (
          <div className="no-events">
            <p>No events are scheduled yet.</p>
            <p className="empty-hint">New events are posted by ADG board members. Check back soon.</p>
          </div>
        ) : (
          <>
            {section('🔴 Happening now', ongoing, 'ongoing', 'ongoing-title')}
            {section('📆 Upcoming', upcoming, 'upcoming', 'upcoming-title')}
            {section('📜 Past events', past, 'past', 'past-title')}
          </>
        )}
      </div>

      {showModal && isAdmin && (
        <div className="modal-overlay" onClick={closeModal}>
          <div
            className="modal-content upload-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="event-form-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="modal-close"
              aria-label="Close without saving"
              disabled={saving}
              onClick={closeModal}
            >
              ×
            </button>
            <h2 id="event-form-title">{editingEvent ? `Edit “${editingEvent.name}”` : 'Add a new event'}</h2>
            <p className="form-intro">
              {editingEvent
                ? 'Change the details you need, then press Save changes. Cancel leaves the event as it was.'
                : 'Fields marked * are required. Every admin can edit or delete this event later.'}
            </p>

            <form onSubmit={handleSave} noValidate={false}>
              <div className="form-group">
                <label htmlFor="ev-photo">Event photo {editingEvent ? '' : '*'}</label>
                <input
                  id="ev-photo"
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  required={!editingEvent}
                  disabled={saving}
                  aria-describedby="ev-photo-help"
                />
                {photoError && <p className="field-error" role="alert">{photoError}</p>}
                {previewSrc && (
                  <div className="photo-preview">
                    <img src={previewSrc} alt="Preview" />
                    <span className="photo-preview__note">
                      {photoFile ? 'New photo selected' : 'Current photo. Choose a file to replace it.'}
                    </span>
                  </div>
                )}
                <small id="ev-photo-help">Up to {MAX_EVENT_PHOTO_MB} MB. JPG, PNG, GIF or WebP.</small>
              </div>

              <div className="form-group">
                <label htmlFor="ev-name">Event name *</label>
                <input id="ev-name" type="text" value={form.name} onChange={setField('name')} placeholder="For example, Open Mic Night" maxLength={200} required disabled={saving} />
              </div>

              <div className="form-group">
                <label htmlFor="ev-type">Event type *</label>
                <select id="ev-type" value={form.type} onChange={setField('type')} disabled={saving}>
                  <option value="g-body">G-Body event</option>
                  <option value="major">Major event</option>
                </select>
                <small>Major events are highlighted on the page.</small>
              </div>

              <div className="form-group">
                <label htmlFor="ev-date">Date *</label>
                <input id="ev-date" type="date" value={form.date} onChange={setField('date')} required disabled={saving} />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="ev-start">Start time *</label>
                  <input id="ev-start" type="time" value={form.startTime} onChange={setField('startTime')} required disabled={saving} />
                </div>
                <div className="form-group">
                  <label htmlFor="ev-end">End time *</label>
                  <input id="ev-end" type="time" value={form.endTime} onChange={setField('endTime')} required disabled={saving} />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="ev-desc">Description *</label>
                <textarea id="ev-desc" value={form.description} onChange={setField('description')} placeholder="What is this event about, and who should come?" rows={4} maxLength={5000} required disabled={saving} />
              </div>

              <div className="form-group">
                <label htmlFor="ev-link">Link (optional)</label>
                <input id="ev-link" type="url" value={form.link} onChange={setField('link')} placeholder="https://example.com/event" disabled={saving} />
                <small>Add a registration or details page, starting with https://</small>
              </div>

              {progress?.status === 'uploading' && (
                <div className="upload-progress" role="status" aria-live="polite">
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${progress.progress}%` }} />
                    <span className="progress-text">{progress.progress}%</span>
                  </div>
                </div>
              )}
              {progress?.status === 'error' && (
                <p className="upload-error" role="alert">{progress.error}</p>
              )}

              <div className="form-actions">
                <button type="button" className="secondary-btn" onClick={closeModal} disabled={saving}>
                  Cancel
                </button>
                <button type="submit" className="upload-submit-btn" disabled={saving}>
                  {saving ? 'Saving…' : editingEvent ? 'Save changes' : 'Add event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Events;
