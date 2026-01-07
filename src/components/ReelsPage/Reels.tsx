import React, { useState, useEffect, useRef } from 'react';
import './Reels.css';
import {
  getAllReels,
  createReel,
  deleteReel,
  toggleReelLike,
  addReelComment,
  incrementReelViews
} from '../../services/reelService';
import { validateMediaFile } from '../../services/storageService';
import { checkContentCreationPermission } from '../../services/authorizationService';
import { useAuth } from '../../contexts/AuthContext';
import { Reel, MultiUploadProgress } from '../../types';

const Reels: React.FC = () => {
  const { currentUser: authUser, userData } = useAuth();
  const [reels, setReels] = useState<Reel[]>([]);
  const [currentReelIndex, setCurrentReelIndex] = useState<number | null>(null);
  const [currentMediaIndex, setCurrentMediaIndex] = useState<{ [reelId: string]: number }>({});
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showAuthorizationMessage, setShowAuthorizationMessage] = useState(false);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Check user authorization
  const userEmail = authUser?.email || null;
  const { authorized: isAuthorized, message: authMessage } = checkContentCreationPermission(userEmail);
  const isAuthenticated = authUser !== null;
  const currentUserId = authUser?.uid || '';
  const currentUserName = userData?.name || authUser?.email || 'Anonymous';
  
  // Upload form state
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<string[]>([]);
  const [caption, setCaption] = useState('');
  const [uploadProgress, setUploadProgress] = useState<MultiUploadProgress>({});
  const [uploading, setUploading] = useState(false);
  
  // Comments state
  const [currentReelForComments, setCurrentReelForComments] = useState<Reel | null>(null);
  const [commentText, setCommentText] = useState('');
  
  // Video refs for auto-play
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const reelRefs = useRef<(HTMLDivElement | null)[]>([]);
  const hasScrolledToInitialReel = useRef(false);
  
  // Determine if in full view
  const isFullView = currentReelIndex !== null;
  
  // Load reels from Firebase
  useEffect(() => {
    loadReels();
  }, []);
  
  // Scroll-in animation observer
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
    
    // Observe all reel cards
    const cards = document.querySelectorAll('.reel-card');
    cards.forEach((card, index) => {
      (card as HTMLElement).style.transitionDelay = `${index * 0.1}s`;
      observer.observe(card);
    });
    
    return () => observer.disconnect();
  }, [reels]);
  
  const loadReels = async () => {
    try {
      setLoading(true);
      const fetchedReels = await getAllReels();
      setReels(fetchedReels);
      
      // Initialize media index for each reel
      const initialMediaIndex: { [key: string]: number } = {};
      fetchedReels.forEach(reel => {
        initialMediaIndex[reel.id] = 0;
      });
      setCurrentMediaIndex(initialMediaIndex);
    } catch (error) {
      console.error('Error loading reels:', error);
      const storedReels = localStorage.getItem('adg-reels');
      if (storedReels) {
        try {
          const parsedReels = JSON.parse(storedReels);
          setReels(parsedReels);
        } catch (e) {
          console.error('Error parsing stored reels:', e);
        }
      }
    } finally {
      setLoading(false);
    }
  };
  
  // Scroll to the clicked reel when entering full view
  useEffect(() => {
    if (isFullView && currentReelIndex !== null && !hasScrolledToInitialReel.current) {
      const scrollToReel = () => {
        const reelElement = reelRefs.current[currentReelIndex];
        const container = containerRef.current;
        
        if (reelElement && container) {
          // Scroll to the clicked reel
          reelElement.scrollIntoView({ behavior: 'auto', block: 'start' });
          hasScrolledToInitialReel.current = true;
          
          // Play the video if it exists
          const video = videoRefs.current[currentReelIndex];
          if (video) {
            video.play().catch(err => console.log('Autoplay prevented:', err));
          }
        }
      };
      
      // Small delay to ensure DOM is ready
      setTimeout(scrollToReel, 50);
    }
  }, [isFullView, currentReelIndex]);
  
  // Handle scroll-based navigation and auto-play
  useEffect(() => {
    if (!isFullView || !containerRef.current) return;
    
    const handleScroll = () => {
      if (!containerRef.current || !hasScrolledToInitialReel.current) return;
      
      const container = containerRef.current;
      const scrollTop = container.scrollTop;
      const itemHeight = container.clientHeight;
      const newIndex = Math.round(scrollTop / itemHeight);
      
      if (newIndex !== currentReelIndex && newIndex >= 0 && newIndex < reels.length) {
        setCurrentReelIndex(newIndex);
        
        // Pause all videos
        videoRefs.current.forEach(video => {
          if (video) video.pause();
        });
        
        // Play current video
        const video = videoRefs.current[newIndex];
        if (video) {
          video.play().catch(err => console.log('Autoplay prevented:', err));
        }
      }
    };
    
    const container = containerRef.current;
    container.addEventListener('scroll', handleScroll);
    
    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [isFullView, currentReelIndex, reels.length]);
  
  // Track views when entering full view
  useEffect(() => {
    if (currentReelIndex !== null && reels[currentReelIndex]) {
      incrementReelViews(reels[currentReelIndex].id);
    }
  }, [currentReelIndex, reels]);
  
  const openFullView = (index: number) => {
    hasScrolledToInitialReel.current = false;
    setCurrentReelIndex(index);
  };
  
  const closeFullView = () => {
    setCurrentReelIndex(null);
    hasScrolledToInitialReel.current = false;
    // Pause all videos
    videoRefs.current.forEach(video => {
      if (video) video.pause();
    });
  };
  
  const handleUploadClick = () => {
    if (!isAuthenticated) {
      alert('Please sign in to upload reels');
      return;
    }
    
    if (!isAuthorized) {
      setShowAuthorizationMessage(true);
      return;
    }
    
    setShowUploadModal(true);
  };
  
  const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    const validFiles: File[] = [];
    const previews: string[] = [];
    
    for (const file of files) {
      const validation = validateMediaFile(file);
      if (!validation.valid) {
        alert(`${file.name}: ${validation.error}`);
        continue;
      }
      validFiles.push(file);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        previews.push(reader.result as string);
        if (previews.length === validFiles.length) {
          setFilePreviews([...previews]);
        }
      };
      reader.readAsDataURL(file);
    }
    
    setSelectedFiles(validFiles);
  };
  
  const handleReelUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedFiles.length === 0 || !caption.trim()) {
      alert('Please select at least one media file and add a caption');
      return;
    }
    
    if (!currentUserId || !isAuthorized) {
      alert('You are not authorized to upload content');
      return;
    }
    
    try {
      setUploading(true);
      
      const initialProgress: MultiUploadProgress = {};
      selectedFiles.forEach((_, index) => {
        initialProgress[index] = { progress: 0, status: 'uploading' };
      });
      setUploadProgress(initialProgress);
      
      // Create reel with progress tracking
      await createReel(
        caption,
        selectedFiles,
        currentUserId,
        currentUserName,
        (index, progressData) => {
          setUploadProgress(prev => ({
            ...prev,
            [index]: {
              progress: progressData.progress,
              status: progressData.status as 'uploading' | 'complete' | 'error',
              ...((progressData as any).error && { error: (progressData as any).error })
            }
          }));
        }
      );
      
      // Mark all as complete
      const completeProgress: MultiUploadProgress = {};
      selectedFiles.forEach((_, index) => {
        completeProgress[index] = { progress: 100, status: 'complete' };
      });
      setUploadProgress(completeProgress);
      
      alert('Reel uploaded successfully!');
      await loadReels();
      
      setSelectedFiles([]);
      setFilePreviews([]);
      setCaption('');
      setUploading(false);
      setShowUploadModal(false);
      setUploadProgress({});
    } catch (error) {
      console.error('Error uploading reel:', error);
      setUploading(false);
      alert('Failed to upload reel. Please try again.');
    }
  };
  
  const handleLike = async (reelId: string) => {
    try {
      const userId = currentUserId || 'guest';
      await toggleReelLike(reelId, userId);
      
      setReels(reels.map(reel => {
        if (reel.id === reelId) {
          const hasLiked = reel.likedBy.includes(userId);
          return {
            ...reel,
            likes: hasLiked ? reel.likes - 1 : reel.likes + 1,
            likedBy: hasLiked 
              ? reel.likedBy.filter(id => id !== userId)
              : [...reel.likedBy, userId]
          };
        }
        return reel;
      }));
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };
  
  const handleComment = async (reelId: string, text: string) => {
    if (!text.trim()) return;
    
    try {
      const userId = currentUserId || 'guest';
      const username = currentUserName || 'Anonymous';
      
      await addReelComment(reelId, userId, username, text);
      await loadReels();
      setCommentText('');
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };
  
  
  const handleMediaNavigation = (reelId: string, direction: 'prev' | 'next') => {
    const reel = reels.find(r => r.id === reelId);
    if (!reel) return;
    
    const currentIndex = currentMediaIndex[reelId] || 0;
    
    if (direction === 'next' && currentIndex < reel.media.length - 1) {
      setCurrentMediaIndex({ ...currentMediaIndex, [reelId]: currentIndex + 1 });
    } else if (direction === 'prev' && currentIndex > 0) {
      setCurrentMediaIndex({ ...currentMediaIndex, [reelId]: currentIndex - 1 });
    }
  };
  
  const openComments = (reel: Reel) => {
    setCurrentReelForComments(reel);
    setShowCommentsModal(true);
  };
  
  const handleDeleteReel = async (reelId: string, uploadedBy: string) => {
    if (!isAuthenticated || !isAuthorized) {
      setShowAuthorizationMessage(true);
      return;
    }
    
    if (window.confirm('Are you sure you want to delete this reel?')) {
      try {
        await deleteReel(reelId, uploadedBy);
        alert('Reel deleted successfully!');
        await loadReels();
        
        if (currentReelIndex !== null && currentReelIndex >= reels.length - 1) {
          setCurrentReelIndex(Math.max(0, currentReelIndex - 1));
        }
      } catch (error) {
        console.error('Error deleting reel:', error);
        alert('Failed to delete reel. Please try again.');
      }
    }
  };
  
  const removeFileFromSelection = (index: number) => {
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
    setFilePreviews(filePreviews.filter((_, i) => i !== index));
  };
  
  return (
    <div className="reels-page">
      <div className="reels-content">
        {!isFullView && <h1 className="reels-title">ADG Reels</h1>}
        
        <button
          className="upload-reel-btn"
          onClick={handleUploadClick}
          title="Upload Reel"
        >
          +
        </button>
        
        {loading ? (
          <div className="loading-container">
            <p>Loading reels...</p>
          </div>
        ) : reels.length === 0 ? (
          <div className="no-reels">
            <p>No reels yet. Be the first to upload!</p>
          </div>
        ) : !isFullView ? (
          /* Card Grid View */
          <div className="reels-grid">
            {reels.map((reel, index) => {
              const mediaIndex = currentMediaIndex[reel.id] || 0;
              const currentMedia = reel.media[mediaIndex];
              
              return (
                <div
                  key={reel.id}
                  className="reel-card"
                  onClick={() => openFullView(index)}
                >
                  <div className="reel-card-media">
                    {currentMedia.type === 'video' ? (
                      <video
                        src={currentMedia.url}
                        className="reel-card-video"
                      />
                    ) : (
                      <img
                        src={currentMedia.url}
                        alt="Reel content"
                        className="reel-card-image"
                      />
                    )}
                    <div className="reel-card-overlay">
                      <div className="reel-card-type">
                        {currentMedia.type === 'video' ? '🎥' : '📷'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="reel-card-info">
                    <div className="reel-card-creator">
                      <div className="reel-card-avatar">
                        {reel.uploaderName.charAt(0)}
                      </div>
                      <span className="reel-card-name">{reel.uploaderName}</span>
                    </div>
                    <p className="reel-card-caption">{reel.caption}</p>
                    
                    <div className="reel-card-stats">
                      <span>❤️ {reel.likes}</span>
                      <span>💬 {reel.comments.length}</span>
                      <span>👁️ {reel.views}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Full View with Scroll */
          <div className="reels-fullview" ref={containerRef}>
            <button className="close-fullview-btn" onClick={closeFullView}>
              ✕
            </button>
            
            {reels.map((reel, index) => {
              const mediaIndex = currentMediaIndex[reel.id] || 0;
              const currentMedia = reel.media[mediaIndex];
              
              return (
                <div
                  key={reel.id}
                  className="fullview-item"
                  ref={el => { reelRefs.current[index] = el; }}
                >
                  <div className="fullview-media-container">
                    {currentMedia.type === 'video' ? (
                      <video
                        ref={el => { videoRefs.current[index] = el; }}
                        src={currentMedia.url}
                        loop
                        playsInline
                        className="fullview-video"
                        onClick={(e) => {
                          const video = e.currentTarget;
                          if (video.paused) {
                            video.play();
                          } else {
                            video.pause();
                          }
                        }}
                      />
                    ) : (
                      <img
                        src={currentMedia.url}
                        alt="Reel content"
                        className="fullview-photo"
                      />
                    )}
                    
                    {/* Media navigation for multiple items */}
                    {reel.media.length > 1 && (
                      <>
                        {mediaIndex > 0 && (
                          <button 
                            className="media-nav-arrow media-nav-left"
                            onClick={() => handleMediaNavigation(reel.id, 'prev')}
                          >
                            ←
                          </button>
                        )}
                        {mediaIndex < reel.media.length - 1 && (
                          <button 
                            className="media-nav-arrow media-nav-right"
                            onClick={() => handleMediaNavigation(reel.id, 'next')}
                          >
                            →
                          </button>
                        )}
                        
                        {/* Progress dots */}
                        <div className="media-progress-dots">
                          {reel.media.map((_, idx) => (
                            <span 
                              key={idx}
                              className={`progress-dot ${idx === mediaIndex ? 'active' : ''}`}
                              onClick={() => setCurrentMediaIndex({ ...currentMediaIndex, [reel.id]: idx })}
                            />
                          ))}
                        </div>
                        
                        {/* Media counter */}
                        <div className="media-counter">
                          {mediaIndex + 1} / {reel.media.length}
                        </div>
                      </>
                    )}
                  </div>
                  
                  <div className="fullview-overlay">
                    <div className="fullview-info">
                      <div className="fullview-creator">
                        <div className="creator-avatar">
                          {reel.uploaderName.charAt(0)}
                        </div>
                        <span className="creator-name">{reel.uploaderName}</span>
                      </div>
                      <p className="fullview-caption">{reel.caption}</p>
                    </div>
                    
                    <div className="fullview-actions">
                      <button
                        className={`action-btn like-btn ${reel.likedBy.includes(currentUserId || 'guest') ? 'liked' : ''}`}
                        onClick={() => handleLike(reel.id)}
                      >
                        <span className="action-icon">
                          {reel.likedBy.includes(currentUserId || 'guest') ? '❤️' : '🤍'}
                        </span>
                        <span className="action-count">{reel.likes}</span>
                      </button>
                      
                      <button 
                        className="action-btn comment-btn"
                        onClick={() => openComments(reel)}
                      >
                        <span className="action-icon">💬</span>
                        <span className="action-count">{reel.comments.length}</span>
                      </button>
                      
                      <button className="action-btn view-btn">
                        <span className="action-icon">👁️</span>
                        <span className="action-count">{reel.views}</span>
                      </button>
                      
                      {isAuthenticated && isAuthorized && (
                        <button 
                          className="action-btn delete-btn"
                          onClick={() => handleDeleteReel(reel.id, reel.uploadedBy)}
                        >
                          <span className="action-icon">🗑️</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
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
      
      {/* Upload Modal */}
      {showUploadModal && (
        <div className="modal-overlay" onClick={() => !uploading && setShowUploadModal(false)}>
          <div className="modal-content upload-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => !uploading && setShowUploadModal(false)} disabled={uploading}>×</button>
            <h2>Upload New Reel</h2>
            <form onSubmit={handleReelUpload}>
              <div className="form-group">
                <label>Media Files (Photos & Videos) *</label>
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileSelection}
                  multiple
                  required={selectedFiles.length === 0}
                  disabled={uploading}
                />
                <small>Select multiple photos and/or videos.</small>
                
                {filePreviews.length > 0 && (
                  <div className="file-previews">
                    {filePreviews.map((preview, index) => (
                      <div key={index} className="file-preview-item">
                        {selectedFiles[index].type.startsWith('video') ? (
                          <video src={preview} className="preview-video" />
                        ) : (
                          <img src={preview} alt={`Preview ${index + 1}`} className="preview-image" />
                        )}
                        <button 
                          type="button"
                          className="remove-file-btn"
                          onClick={() => removeFileFromSelection(index)}
                          disabled={uploading}
                        >
                          ×
                        </button>
                        <span className="file-type-badge">
                          {selectedFiles[index].type.startsWith('video') ? '🎥' : '📷'}
                        </span>
                        {uploadProgress[index] && (
                          <div className="file-upload-progress">
                            <div 
                              className="file-progress-bar"
                              style={{ width: `${uploadProgress[index].progress}%` }}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="form-group">
                <label>Caption *</label>
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Write a caption for your reel..."
                  rows={3}
                  required
                  disabled={uploading}
                />
              </div>
              
              <button 
                type="submit" 
                className="upload-submit-btn"
                disabled={uploading || selectedFiles.length === 0}
              >
                {uploading ? 'Uploading...' : `Upload Reel (${selectedFiles.length} file${selectedFiles.length !== 1 ? 's' : ''})`}
              </button>
            </form>
          </div>
        </div>
      )}
      
      {/* Comments Modal */}
      {showCommentsModal && currentReelForComments && (
        <div className="modal-overlay" onClick={() => setShowCommentsModal(false)}>
          <div className="modal-content comments-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowCommentsModal(false)}>×</button>
            <h2>Comments</h2>
            
            <div className="comments-list">
              {currentReelForComments.comments.length === 0 ? (
                <p className="no-comments">No comments yet. Be the first to comment!</p>
              ) : (
                currentReelForComments.comments.map(comment => (
                  <div key={comment.id} className="comment-item">
                    <div className="comment-avatar">
                      {comment.username.charAt(0)}
                    </div>
                    <div className="comment-content">
                      <span className="comment-username">{comment.username}</span>
                      <p className="comment-text">{comment.text}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <div className="comment-input-container">
              <input
                type="text"
                className="comment-input"
                placeholder="Add a comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleComment(currentReelForComments.id, commentText);
                  }
                }}
              />
              <button 
                className="comment-submit-btn"
                onClick={() => handleComment(currentReelForComments.id, commentText)}
              >
                Post
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reels;