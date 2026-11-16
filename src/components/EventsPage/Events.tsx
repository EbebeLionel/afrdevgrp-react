import React, { useState, useEffect } from 'react';
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
import { Event as EventType, EventFormData, UploadProgress } from '../../types';

const Events: React.FC = () => {
  usePageTitle('Events');
  // isAdmin only decides which controls are shown; the database enforces it.
  const { isAdmin } = useAuth();
  const [events, setEvents] = useState<EventType[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  
  // Upload form state
  const [eventName, setEventName] = useState('');
  const [eventType, setEventType] = useState<'g-body' | 'major'>('g-body');
  const [eventDate, setEventDate] = useState('');
  const [eventStartTime, setEventStartTime] = useState('');
  const [eventEndTime, setEventEndTime] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventLink, setEventLink] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState('');
  
  // Editing state
  const [editingEvent, setEditingEvent] = useState<EventType | null>(null);
  
  // Load events on mount
  useEffect(() => {
    loadEvents();
  }, []);
  
  // Scroll-in animation observer for sections and cards
  useEffect(() => {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-in');
          observer.unobserve(entry.target);
        }
      });
    }, observerOptions);
    
    // Observe event sections
    const sections = document.querySelectorAll('.events-section');
    sections.forEach((section) => {
      observer.observe(section);
    });
    
    // Observe event cards with staggered delays
    const cards = document.querySelectorAll('.event-card');
    cards.forEach((card, index) => {
      (card as HTMLElement).style.transitionDelay = `${(index % 3) * 0.1}s`;
      observer.observe(card);
    });
    
    return () => observer.disconnect();
  }, [events]);
  
  const loadEvents = async () => {
    try {
      setLoading(true);
      setLoadError('');
      setEvents(await getAllEvents());
    } catch (error) {
      console.error('Error loading events:', error);
      setLoadError('Could not load events. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleUploadClick = () => {
    resetForm();
    setShowUploadModal(true);
  };
  
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate image
      const validation = validateImage(file);
      if (!validation.valid) {
        alert(validation.error || 'Invalid image file');
        return;
      }
      
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleEventUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const eventData: EventFormData = {
      name: eventName,
      type: eventType,
      date: eventDate,
      startTime: eventStartTime,
      endTime: eventEndTime,
      description: eventDescription,
      link: eventLink || undefined
    };
    
    if (!editingEvent && !photoFile) {
      alert('Please select a photo');
      return;
    }
    
    try {
      setUploadProgress({ progress: 0, status: 'uploading' });
      
      if (editingEvent) {
        await updateEvent(editingEvent, eventData, photoFile || undefined, setUploadProgress);
      } else {
        await createEvent(eventData, photoFile as File, setUploadProgress);
      }
      
      await loadEvents();
      resetForm();
      setShowUploadModal(false);
    } catch (error) {
      console.error('Error saving event:', error);
      setUploadProgress({
        progress: 0,
        status: 'error',
        error: toUserMessage(error, 'Could not save the event. Please try again.')
      });
    }
  };
  
  const resetForm = () => {
    setEventName('');
    setEventType('g-body');
    setEventDate('');
    setEventStartTime('');
    setEventEndTime('');
    setEventDescription('');
    setEventLink('');
    setPhotoFile(null);
    setPhotoPreview('');
    setEditingEvent(null);
    setUploadProgress(null);
  };
  
  const handleEditEvent = (event: EventType) => {
    setUploadProgress(null);
    setPhotoFile(null);
    setEventName(event.name);
    setEventType(event.type);
    setEventDate(event.date);
    setEventStartTime(event.startTime);
    setEventEndTime(event.endTime);
    setEventDescription(event.description);
    setEventLink(event.link || '');
    setPhotoPreview(event.photoUrl);
    setEditingEvent(event);
    setShowUploadModal(true);
  };
  
  const handleDeleteEvent = async (event: EventType) => {
    if (!window.confirm(`Delete "${event.name}"? This cannot be undone.`)) return;
    try {
      await deleteEvent(event);
      setEvents((current) => current.filter((e) => e.id !== event.id));
    } catch (error) {
      console.error('Error deleting event:', error);
      alert(toUserMessage(error, 'Failed to delete event. Please try again.'));
    }
  };
  
  const ongoingEvents = events.filter(event => 
    getEventStatus(event.date, event.startTime, event.endTime) === 'ongoing'
  );
  const upcomingEvents = events.filter(event => 
    getEventStatus(event.date, event.startTime, event.endTime) === 'upcoming'
  );
  const pastEvents = events.filter(event => 
    getEventStatus(event.date, event.startTime, event.endTime) === 'past'
  );
  
  const EventCard: React.FC<{ event: EventType; status: 'ongoing' | 'upcoming' | 'past' }> = ({ event, status }) => (
    <div className={`event-card ${event.type === 'major' ? 'major-event' : 'gbody-event'}`}>
      <div className="event-image-container">
        <img src={event.photoUrl} alt={event.name} className="event-image" />
        {event.type === 'major' && <div className="major-badge">MAJOR EVENT</div>}
        {isAdmin && (
          <div className="event-actions">
            <button className="edit-btn" onClick={() => handleEditEvent(event)} title="Edit event">
              ✏️
            </button>
            <button className="delete-btn" onClick={() => handleDeleteEvent(event)} title="Delete event">
              🗑️
            </button>
          </div>
        )}
      </div>
      <div className="event-details">
        <div className="event-header">
          {status === 'ongoing' && <span className="status-indicator ongoing"></span>}
          <h3 className="event-name">{event.name}</h3>
        </div>
        <div className="event-datetime">
          <span className="event-date">📅 {formatEventDate(event.date)}</span>
          <span className="event-time">🕐 {formatEventTime(event.startTime)} - {formatEventTime(event.endTime)}</span>
        </div>
        <p className="event-description">{event.description}</p>
        {event.link && (
          <a href={event.link} target="_blank" rel="noopener noreferrer" className="event-link">
            View Event Details →
          </a>
        )}
      </div>
    </div>
  );
  
  return (
    <div className="events-page">
      <div className="events-content">
        <h1 className="events-title">ADG Events</h1>
        
        {isAdmin && (
          <button
            className="upload-event-btn"
            onClick={handleUploadClick}
          >
            + Upload Event
          </button>
        )}
        
        {loading ? (
          <div className="loading-container">
            <p>Loading events...</p>
          </div>
        ) : loadError ? (
          <div className="no-events">
            <p>{loadError}</p>
          </div>
        ) : (
          <>
            {/* Ongoing Events Section */}
            {ongoingEvents.length > 0 && (
              <section className="events-section">
                <h2 className="section-title ongoing-title">🔴 Currently Ongoing</h2>
                <div className="events-grid">
                  {ongoingEvents.map((event) => (
                    <EventCard key={event.id} event={event} status="ongoing" />
                  ))}
                </div>
              </section>
            )}
            
            {/* Upcoming Events Section */}
            {upcomingEvents.length > 0 && (
              <section className="events-section">
                <h2 className="section-title upcoming-title">📆 Upcoming Events</h2>
                <div className="events-grid">
                  {upcomingEvents.map((event) => (
                    <EventCard key={event.id} event={event} status="upcoming" />
                  ))}
                </div>
              </section>
            )}
            
            {/* Past Events Section */}
            {pastEvents.length > 0 && (
              <section className="events-section">
                <h2 className="section-title past-title">📜 Past Events</h2>
                <div className="events-grid">
                  {pastEvents.map((event) => (
                    <EventCard key={event.id} event={event} status="past" />
                  ))}
                </div>
              </section>
            )}
            
            {events.length === 0 && (
              <div className="no-events">
                <p>No events yet. Check back soon!</p>
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Upload / Edit Event Modal (admins only) */}
      {showUploadModal && isAdmin && (
        <div className="modal-overlay" onClick={() => { if (uploadProgress?.status === 'uploading') return; setShowUploadModal(false); resetForm(); }}>
          <div className="modal-content upload-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" disabled={uploadProgress?.status === 'uploading'} onClick={() => { setShowUploadModal(false); resetForm(); }}>×</button>
            <h2>{editingEvent ? 'Edit Event' : 'Upload New Event'}</h2>
            <form onSubmit={handleEventUpload}>
              <div className="form-group">
                <label>Event Photo *</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  required={!editingEvent}
                />
                {photoPreview && (
                  <div className="photo-preview">
                    <img src={photoPreview} alt="Preview" />
                  </div>
                )}
                <small>Maximum size: {MAX_EVENT_PHOTO_MB}MB. Supported formats: JPG, PNG, GIF, WebP</small>
              </div>
              
              <div className="form-group">
                <label>Event Name *</label>
                <input
                  type="text"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  placeholder="Enter event name"
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Event Type *</label>
                <select value={eventType} onChange={(e) => setEventType(e.target.value as 'g-body' | 'major')}>
                  <option value="g-body">G-Body Event</option>
                  <option value="major">Major Event</option>
                </select>
              </div>
              
              <div className="form-group">
                <label>Date *</label>
                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  required
                />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Start Time *</label>
                  <input
                    type="time"
                    value={eventStartTime}
                    onChange={(e) => setEventStartTime(e.target.value)}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label>End Time *</label>
                  <input
                    type="time"
                    value={eventEndTime}
                    onChange={(e) => setEventEndTime(e.target.value)}
                    required
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label>Description *</label>
                <textarea
                  value={eventDescription}
                  onChange={(e) => setEventDescription(e.target.value)}
                  placeholder="Describe the event..."
                  rows={4}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Event Link (Optional)</label>
                <input
                  type="url"
                  value={eventLink}
                  onChange={(e) => setEventLink(e.target.value)}
                  placeholder="https://example.com/event"
                />
              </div>
              
              {uploadProgress && (
                <div className="upload-progress">
                  {uploadProgress.status === 'uploading' && (
                    <div className="progress-bar">
                      <div 
                        className="progress-fill" 
                        style={{ width: `${uploadProgress.progress}%` }}
                      ></div>
                      <span className="progress-text">{uploadProgress.progress}%</span>
                    </div>
                  )}
                  {uploadProgress.status === 'error' && (
                    <p className="upload-error">Error: {uploadProgress.error}</p>
                  )}
                </div>
              )}
              
              <button 
                type="submit" 
                className="upload-submit-btn"
                disabled={uploadProgress?.status === 'uploading'}
              >
                {uploadProgress?.status === 'uploading' 
                  ? 'Uploading...' 
                  : editingEvent ? 'Update Event' : 'Upload Event'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Events;