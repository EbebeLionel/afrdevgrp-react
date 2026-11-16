import React, { useState, useEffect, useRef } from 'react';
import './Reels.css';
import { useNavigate } from 'react-router-dom';
import {
  getAllReels,
  createReel,
  deleteReel,
  updateReelCaption,
  setReelLike,
  getReelComments,
  addReelComment,
  deleteReelComment,
  incrementReelViews
} from '../../services/reelService';
import { validateMediaFile, MAX_REEL_FILE_MB } from '../../services/storageService';
import { toUserMessage } from '../../lib/supabase';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useConfirm, useFeedback } from '../common/Feedback';
import { useAuth } from '../../contexts/AuthContext';
import { Reel, Comment, MultiUploadProgress } from '../../types';

const Reels: React.FC = () => {
  usePageTitle('Reels');
  const navigate = useNavigate();
  const { show } = useFeedback();
  const confirm = useConfirm();
  // isAdmin only decides which controls are shown; the database enforces it.
  const { currentUser: authUser, isAdmin } = useAuth();
  const [reels, setReels] = useState<Reel[]>([]);
  const [currentReelIndex, setCurrentReelIndex] = useState<number | null>(null);
  const [currentMediaIndex, setCurrentMediaIndex] = useState<{ [reelId: string]: number }>({});
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  
  const currentUserId = authUser?.id || '';
  
  // Upload form state
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<string[]>([]);
  const [caption, setCaption] = useState('');
  const [uploadProgress, setUploadProgress] = useState<MultiUploadProgress>({});
  const [uploading, setUploading] = useState(false);
  
  // Comments state (loaded when the comments modal opens)
  const [currentReelForComments, setCurrentReelForComments] = useState<Reel | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [postingComment, setPostingComment] = useState(false);

  // Caption editing state (admins)
  const [editingReel, setEditingReel] = useState<Reel | null>(null);
  const [editCaption, setEditCaption] = useState('');
  const [savingCaption, setSavingCaption] = useState(false);

  // Reels already counted as viewed in this visit
  const viewedReelIds = useRef<Set<string>>(new Set());
  
  // Video refs for auto-play
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const reelRefs = useRef<(HTMLDivElement | null)[]>([]);
  const hasScrolledToInitialReel = useRef(false);
  
  // Determine if in full view
  const isFullView = currentReelIndex !== null;
  
  // Load reels; reload when the signed-in user changes so "liked" is correct
  useEffect(() => {
    loadReels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId]);
  
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
      setLoadError('');
      const fetchedReels = await getAllReels();
      setReels(fetchedReels);
      // Keep each reel's current slide; default new ones to the first.
      setCurrentMediaIndex(prev => {
        const next: { [key: string]: number } = {};
        fetchedReels.forEach(reel => {
          next[reel.id] = Math.min(prev[reel.id] || 0, reel.media.length - 1);
        });
        return next;
      });
    } catch (error) {
      console.error('Error loading reels:', error);
      setLoadError('Could not load reels. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  const requireSignIn = () => {
    navigate('/auth', { state: { from: '/reels' } });
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
  
  // Count a view the first time each reel is shown in full view
  const currentReelId = currentReelIndex !== null ? reels[currentReelIndex]?.id : undefined;
  useEffect(() => {
    if (currentReelId && !viewedReelIds.current.has(currentReelId)) {
      viewedReelIds.current.add(currentReelId);
      incrementReelViews(currentReelId);
    }
  }, [currentReelId]);
  
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
    setShowUploadModal(true);
  };

  const clearSelection = () => {
    filePreviews.forEach(url => URL.revokeObjectURL(url));
    setSelectedFiles([]);
    setFilePreviews([]);
    setUploadProgress({});
  };

  const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles: File[] = [];

    for (const file of files) {
      const validation = validateMediaFile(file);
      if (!validation.valid) {
        show(`${file.name}: ${validation.error}`, 'error');
        continue;
      }
      validFiles.push(file);
    }

    // Object URLs preview instantly without reading whole videos into memory.
    filePreviews.forEach(url => URL.revokeObjectURL(url));
    setSelectedFiles(validFiles);
    setFilePreviews(validFiles.map(file => URL.createObjectURL(file)));
    setUploadProgress({});
  };

  const handleReelUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedFiles.length === 0 || !caption.trim()) {
      show('Add at least one photo or video, and write a caption, before uploading.', 'error');
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
      await createReel(caption, selectedFiles, (index, progressData) => {
        setUploadProgress(prev => ({ ...prev, [index]: progressData }));
      });

      await loadReels();
      clearSelection();
      setCaption('');
      setShowUploadModal(false);
    } catch (error) {
      console.error('Error uploading reel:', error);
      show(toUserMessage(error, 'The reel could not be uploaded. Your files are still selected, so try again.'), 'error');
    } finally {
      setUploading(false);
    }
  };
  
  const applyLike = (reelId: string, liked: boolean) => {
    setReels(current => current.map(reel =>
      reel.id === reelId && reel.likedByMe !== liked
        ? { ...reel, likedByMe: liked, likes: Math.max(0, reel.likes + (liked ? 1 : -1)) }
        : reel
    ));
  };

  const handleLike = async (reel: Reel) => {
    if (!currentUserId) {
      requireSignIn();
      return;
    }
    const liked = !reel.likedByMe;
    applyLike(reel.id, liked); // optimistic
    try {
      await setReelLike(reel.id, liked);
    } catch (error) {
      console.error('Error toggling like:', error);
      applyLike(reel.id, !liked); // revert
    }
  };

  const bumpCommentCount = (reelId: string, delta: number) => {
    setReels(current => current.map(reel =>
      reel.id === reelId ? { ...reel, commentCount: Math.max(0, reel.commentCount + delta) } : reel
    ));
  };

  const handleComment = async (reelId: string, text: string) => {
    if (!text.trim() || postingComment) return;
    if (!currentUserId) {
      requireSignIn();
      return;
    }

    try {
      setPostingComment(true);
      const comment = await addReelComment(reelId, text);
      setComments(current => [...current, comment]);
      bumpCommentCount(reelId, 1);
      setCommentText('');
    } catch (error) {
      console.error('Error adding comment:', error);
      show(toUserMessage(error, 'Your comment was not posted. Your text is still in the box.'), 'error');
    } finally {
      setPostingComment(false);
    }
  };

  const handleDeleteComment = async (reelId: string, comment: Comment) => {
    const ok = await confirm({ title: 'Delete this comment?', message: 'It will be removed for everyone.', confirmLabel: 'Delete comment', danger: true });
    if (!ok) return;
    try {
      await deleteReelComment(comment.id);
      setComments(current => current.filter(c => c.id !== comment.id));
      bumpCommentCount(reelId, -1);
    } catch (error) {
      console.error('Error deleting comment:', error);
      show(toUserMessage(error, 'The comment could not be deleted. Please try again.'), 'error');
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
  
  const openComments = async (reel: Reel) => {
    setCurrentReelForComments(reel);
    setComments([]);
    setCommentText('');
    setShowCommentsModal(true);
    try {
      setCommentsLoading(true);
      setComments(await getReelComments(reel.id));
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setCommentsLoading(false);
    }
  };

  const openCaptionEditor = (reel: Reel) => {
    setEditingReel(reel);
    setEditCaption(reel.caption);
  };

  const handleCaptionSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReel) return;
    try {
      setSavingCaption(true);
      const newCaption = editCaption.trim();
      await updateReelCaption(editingReel.id, newCaption);
      setReels(current => current.map(reel =>
        reel.id === editingReel.id ? { ...reel, caption: newCaption } : reel
      ));
      setEditingReel(null);
      show('Caption updated.', 'success');
    } catch (error) {
      console.error('Error updating caption:', error);
      show(toUserMessage(error, 'The caption was not saved. Please try again.'), 'error');
    } finally {
      setSavingCaption(false);
    }
  };

  const handleDeleteReel = async (reel: Reel) => {
    const ok = await confirm({ title: 'Delete this reel?', message: 'Its photos, videos, likes and comments will be removed for everyone. This cannot be undone.', confirmLabel: 'Delete reel', danger: true });
    if (!ok) return;
    try {
      await deleteReel(reel);
      const remaining = reels.filter(r => r.id !== reel.id);
      setReels(remaining);
      show('Reel deleted.', 'success');
      if (remaining.length === 0) {
        closeFullView();
      } else if (currentReelIndex !== null && currentReelIndex >= remaining.length) {
        setCurrentReelIndex(remaining.length - 1);
      }
    } catch (error) {
      console.error('Error deleting reel:', error);
      show(toUserMessage(error, 'The reel could not be deleted. Please try again.'), 'error');
    }
  };

  const removeFileFromSelection = (index: number) => {
    URL.revokeObjectURL(filePreviews[index]);
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
    setFilePreviews(filePreviews.filter((_, i) => i !== index));
    setUploadProgress({});
  };
  
  return (
    <div className="reels-page">
      <div className="reels-content">
        {!isFullView && <h1 className="reels-title">ADG Reels</h1>}
        
        {isAdmin && (
          <button
            className="upload-reel-btn"
            onClick={handleUploadClick}
            title="Upload Reel"
          >
            +
          </button>
        )}
        
        {loading ? (
          <div className="loading-container">
            <p>Loading reels...</p>
          </div>
        ) : loadError ? (
          <div className="no-reels">
            <p>{loadError}</p>
          </div>
        ) : reels.length === 0 ? (
          <div className="no-reels">
            <p>No reels yet. Check back soon!</p>
          </div>
        ) : !isFullView ? (
          /* Card Grid View */
          <div className="reels-grid">
            {reels.map((reel, index) => {
              const mediaIndex = Math.min(currentMediaIndex[reel.id] || 0, reel.media.length - 1);
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
                      <span>💬 {reel.commentCount}</span>
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
              const mediaIndex = Math.min(currentMediaIndex[reel.id] || 0, reel.media.length - 1);
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
                        className={`action-btn like-btn ${reel.likedByMe ? 'liked' : ''}`}
                        onClick={() => handleLike(reel)}
                        title={currentUserId ? 'Like' : 'Sign in to like'}
                      >
                        <span className="action-icon">
                          {reel.likedByMe ? '❤️' : '🤍'}
                        </span>
                        <span className="action-count">{reel.likes}</span>
                      </button>
                      
                      <button 
                        className="action-btn comment-btn"
                        onClick={() => openComments(reel)}
                      >
                        <span className="action-icon">💬</span>
                        <span className="action-count">{reel.commentCount}</span>
                      </button>
                      
                      <button className="action-btn view-btn">
                        <span className="action-icon">👁️</span>
                        <span className="action-count">{reel.views}</span>
                      </button>
                      
                      {isAdmin && (
                        <>
                          <button
                            className="action-btn edit-btn"
                            onClick={() => openCaptionEditor(reel)}
                            title="Edit caption"
                          >
                            <span className="action-icon">✏️</span>
                          </button>
                          <button
                            className="action-btn delete-btn"
                            onClick={() => handleDeleteReel(reel)}
                            title="Delete reel"
                          >
                            <span className="action-icon">🗑️</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      {/* Edit Caption Modal (admins only) */}
      {editingReel && isAdmin && (
        <div className="modal-overlay" onClick={() => !savingCaption && setEditingReel(null)}>
          <div className="modal-content upload-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setEditingReel(null)} disabled={savingCaption}>×</button>
            <h2>Edit Caption</h2>
            <form onSubmit={handleCaptionSave}>
              <div className="form-group">
                <label>Caption *</label>
                <textarea
                  value={editCaption}
                  onChange={(e) => setEditCaption(e.target.value)}
                  rows={4}
                  maxLength={2200}
                  required
                  autoFocus
                  disabled={savingCaption}
                />
              </div>
              <button
                type="submit"
                className="upload-submit-btn"
                disabled={savingCaption || !editCaption.trim() || editCaption.trim() === editingReel.caption}
              >
                {savingCaption ? 'Saving...' : 'Save Caption'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Upload Modal (admins only) */}
      {showUploadModal && isAdmin && (
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
                <small>Select multiple photos and/or videos. Up to {MAX_REEL_FILE_MB}MB per file.</small>
                
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
                  maxLength={2200}
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
              {commentsLoading ? (
                <p className="no-comments">Loading comments...</p>
              ) : comments.length === 0 ? (
                <p className="no-comments">No comments yet. Be the first to comment!</p>
              ) : (
                comments.map(comment => (
                  <div key={comment.id} className="comment-item">
                    <div className="comment-avatar">
                      {comment.username.charAt(0)}
                    </div>
                    <div className="comment-content">
                      <span className="comment-username">{comment.username}</span>
                      <p className="comment-text">{comment.text}</p>
                    </div>
                    {(isAdmin || comment.userId === currentUserId) && (
                      <button
                        className="comment-delete-btn"
                        onClick={() => handleDeleteComment(currentReelForComments.id, comment)}
                        title="Delete comment"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
            
            {currentUserId ? (
              <div className="comment-input-container">
                <input
                  type="text"
                  className="comment-input"
                  placeholder="Add a comment..."
                  value={commentText}
                  maxLength={1000}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleComment(currentReelForComments.id, commentText);
                    }
                  }}
                />
                <button
                  className="comment-submit-btn"
                  disabled={postingComment || !commentText.trim()}
                  onClick={() => handleComment(currentReelForComments.id, commentText)}
                >
                  Post
                </button>
              </div>
            ) : (
              <div className="comment-input-container">
                <button className="comment-submit-btn" onClick={requireSignIn}>
                  Sign in to comment
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Reels;