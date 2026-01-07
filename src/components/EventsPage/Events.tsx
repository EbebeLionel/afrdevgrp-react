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
import { validateImage } from '../../services/storageService';
import { checkContentCreationPermission } from '../../services/authorizationService';
import { useAuth } from '../../contexts/AuthContext';
import { Event as EventType, EventFormData, UploadProgress } from '../../types';

const Events: React.FC = () => {
  const { currentUser, userData } = useAuth();
  const [events, setEvents] = useState<EventType[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showAuthorizationMessage, setShowAuthorizationMessage] = useState(false);
  const [loading, setLoading] = useState(true);
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
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  
  // Check user authorization
  const userEmail = currentUser?.email || null;
  const { authorized: isAuthorized, message: authMessage } = checkContentCreationPermission(userEmail);
  const isAuthenticated = currentUser !== null;
  const currentUserId = currentUser?.uid || '';
  
  // Load events from Firebase on mount
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
      const fetchedEvents = await getAllEvents();
      setEvents(fetchedEvents);
    } catch (error) {
      console.error('Error loading events:', error);
      // Fallback to localStorage if Firebase fails
      const storedEvents = localStorage.getItem('adg-events');
      if (storedEvents) {
        try {
          const parsedEvents = JSON.parse(storedEvents);
          setEvents(parsedEvents.filter((e: any) => e.id && e.name && e.date));
        } catch (e) {
          console.error('Error parsing stored events:', e);
        }
      }
    } finally {
      setLoading(false);
    }
  };
  
  const handleUploadClick = () => {
    if (!isAuthenticated) {
      // User needs to sign in
      alert('Please sign in to upload events');
      return;
    }
    
    if (!isAuthorized) {
      // User is signed in but not authorized
      setShowAuthorizationMessage(true);
      return;
    }
    
    // User is signed in AND authorized
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
    
    if (!currentUserId) {
      alert('User authentication required');
      return;
    }
    
    try {
      setUploadProgress({ progress: 0, status: 'uploading' });
      
      if (editingEventId) {
        // Update existing event
        const updates: Partial<EventFormData> = {
          name: eventName,
          type: eventType,
          date: eventDate,
          startTime: eventStartTime,
          endTime: eventEndTime,
          description: eventDescription,
          link: eventLink || undefined
        };
        
        await updateEvent(
          editingEventId,
          updates,
          photoFile || undefined,
          currentUserId
        );
        
        setUploadProgress({ progress: 100, status: 'complete' });
        alert('Event updated successfully!');
      } else {
        // Create new event
        if (!photoFile) {
          alert('Please select a photo');
          return;
        }
        
        const eventData: EventFormData = {
          name: eventName,
          type: eventType,
          date: eventDate,
          startTime: eventStartTime,
          endTime: eventEndTime,
          description: eventDescription,
          link: eventLink || undefined
        };
        
        await createEvent(eventData, photoFile, currentUserId);
        
        setUploadProgress({ progress: 100, status: 'complete' });
        alert('Event created successfully!');
      }
      
      // Reload events
      await loadEvents();
      
      // Reset form
      resetForm();
      setShowUploadModal(false);
      setUploadProgress(null);
    } catch (error) {
      console.error('Error uploading event:', error);
      setUploadProgress({ 
        progress: 0, 
        status: 'error',
        error: error instanceof Error ? error.message : 'Upload failed' 
      });
      alert('Failed to upload event. Please try again.');
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
    setEditingEventId(null);
  };
  
  const handleEditEvent = (event: EventType) => {
    if (!isAuthenticated) {
      alert('Please sign in to edit events');
      return;
    }
    
    if (!isAuthorized) {
      setShowAuthorizationMessage(true);
      return;
    }
    
    setEventName(event.name);
    setEventType(event.type);
    setEventDate(event.date);
    setEventStartTime(event.startTime);
    setEventEndTime(event.endTime);
    setEventDescription(event.description);
    setEventLink(event.link || '');
    setPhotoPreview(event.photoUrl);
    setEditingEventId(event.id);
    setShowUploadModal(true);
  };
  
  const handleDeleteEvent = async (eventId: string, uploadedBy: string) => {
    if (!isAuthenticated) {
      alert('Please sign in to delete events');
      return;
    }
    
    if (!isAuthorized) {
      setShowAuthorizationMessage(true);
      return;
    }
    
    if (window.confirm('Are you sure you want to delete this event?')) {
      try {
        await deleteEvent(eventId, uploadedBy);
        alert('Event deleted successfully!');
        await loadEvents();
      } catch (error) {
        console.error('Error deleting event:', error);
        alert('Failed to delete event. Please try again.');
      }
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
        {isAuthenticated && isAuthorized && (
          <div className="event-actions">
            <button className="edit-btn" onClick={() => handleEditEvent(event)} title="Edit event">
              ✏️
            </button>
            <button className="delete-btn" onClick={() => handleDeleteEvent(event.id, event.uploadedBy)} title="Delete event">
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
        
        <button
          className="upload-event-btn"
          onClick={handleUploadClick}
        >
          + Upload Event
        </button>
        
        {loading ? (
          <div className="loading-container">
            <p>Loading events...</p>
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
                <p>No events yet. Be the first to upload an event!</p>
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Authorization Message Modal */}
      {showAuthorizationMessage && (
        <div className="modal-overlay" onClick={() => setShowAuthorizationMessage(false)}>
          <div className="modal-content auth-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowAuthorizationMessage(false)}>×</button>
            <h2>🔒 Authorization Required</h2>
            <div className="auth-message">
              <p>{authMessage}</p>
              <p className="auth-details">
                You are currently signed in as: <strong>{userEmail}</strong>
              </p>
              <p className="auth-contact">
                To request upload access, please contact an ADG administrator.
              </p>
            </div>
            <button
              className="auth-submit-btn"
              onClick={() => setShowAuthorizationMessage(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
      
      {/* Upload Event Modal */}
      {showUploadModal && (
        <div className="modal-overlay" onClick={() => { setShowUploadModal(false); resetForm(); }}>
          <div className="modal-content upload-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => { setShowUploadModal(false); resetForm(); }}>×</button>
            <h2>{editingEventId ? 'Edit Event' : 'Upload New Event'}</h2>
            <form onSubmit={handleEventUpload}>
              <div className="form-group">
                <label>Event Photo *</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  required={!editingEventId}
                />
                {photoPreview && (
                  <div className="photo-preview">
                    <img src={photoPreview} alt="Preview" />
                  </div>
                )}
                <small>Maximum size: 10MB. Supported formats: JPG, PNG, GIF, WebP</small>
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
                  : editingEventId ? 'Update Event' : 'Upload Event'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Events;