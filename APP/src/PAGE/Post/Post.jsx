// Post.jsx - Modern Redesigned Social Feed
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../utils/api';
import styles from './Post.module.css';
import Card from '../../COMPONENTS/Card/Card';
import Button from '../../COMPONENTS/Button/Button';
import FileUpload from '../../COMPONENTS/FileUpload';
import LazyImage from '../../COMPONENTS/LazyImage';
import { 
  FiEdit, FiImage, FiFile, FiShare2, FiMessageSquare, 
  FiHeart, FiX, FiCheck, FiPlus, FiLink, FiSend,
  FiFilter, FiGrid, FiList, FiMoreHorizontal, FiBookmark,
  FiTrash2, FiEdit2
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { FaChalkboardTeacher, FaUserGraduate, FaUserShield, FaHeart } from 'react-icons/fa';
import { useApp } from '../../context/AppContext';

const API_BASE_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || '';

const Post = () => {
  const { profile, t: appT } = useApp();
  const { t } = useTranslation();
  const [posts, setPosts] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    body: '',
    link: '',
    author_name: profile?.name || 'Administrator',
    author_type: 'staff',
    author_id: 1,
    audiences: JSON.stringify([{ type: 'all' }]),
    media: []
  });
  const [activeFilter, setActiveFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [viewMode, setViewMode] = useState('grid');
  const [likedPosts, setLikedPosts] = useState(new Set());

  // Edit & Delete states
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [postToDelete, setPostToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [editFormData, setEditFormData] = useState({
    title: '',
    body: '',
    link: '',
    audiences: JSON.stringify([{ type: 'all' }]),
    existingMedia: [],
    newMedia: []
  });
  const [editUploading, setEditUploading] = useState(false);

  useEffect(() => {
    const closeMenu = () => setMenuOpenId(null);
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, []);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const response = await api.get('/posts/feed?role=staff');
      setPosts(response.data);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleAudienceToggle = (audience) => {
    let audiences = JSON.parse(formData.audiences || '[]');
    const index = audiences.findIndex((a) => a.type === audience);
    if (index > -1) {
      audiences.splice(index, 1);
    } else {
      audiences.push({ type: audience });
    }
    setFormData({ ...formData, audiences: JSON.stringify(audiences) });
  };

  const handleMediaChange = (e) => {
    const files = Array.from(e.target.files);
    setFormData({ ...formData, media: [...formData.media, ...files] });
  };

  const removeMedia = (index) => {
    const updatedMedia = formData.media.filter((_, i) => i !== index);
    setFormData({ ...formData, media: updatedMedia });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const audiences = JSON.parse(formData.audiences || '[]');
    if (audiences.length === 0) {
      alert('Please select at least one audience.');
      return;
    }

    const adminUser = JSON.parse(localStorage.getItem('adminUser') || '{}');
    const staffUser = JSON.parse(localStorage.getItem('staffUser') || '{}');
    
    let authorName = profile?.name || adminUser.name || staffUser.name || 'Administrator';
    if (authorName.toLowerCase() === 'current user') {
      authorName = 'Administrator';
    }
    
    const authorId = adminUser.id || staffUser.id || 1;
    const authorType = adminUser.role || staffUser.staffType || 'staff';

    const data = new FormData();
    data.append('title', formData.title);
    data.append('body', formData.body || formData.title || ' ');
    data.append('link', formData.link || '');
    data.append('author_name', authorName);
    data.append('author_type', authorType);
    data.append('author_id', authorId);
    data.append('audiences', formData.audiences);

    formData.media.forEach((file) => {
      data.append('media', file);
    });

    setUploading(true);
    try {
      await api.post('/posts', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setIsCreating(false);
      fetchPosts();
      setFormData({
        title: '',
        body: '',
        link: '',
        author_name: authorName,
        author_type: 'staff',
        author_id: 1,
        audiences: JSON.stringify([{ type: 'all' }]),
        media: []
      });
    } catch (error) {
      console.error('Error creating post:', error);
      alert(`Failed to create post: ${error.response?.data?.error || error.response?.data?.details || error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleLike = async (postId) => {
    try {
      await api.put(`/posts/${postId}/like`);
      setLikedPosts(prev => new Set([...prev, postId]));
      fetchPosts();
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  const handleDeletePost = async () => {
    if (!postToDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/posts/${postToDelete.id}`);
      setPosts(prev => prev.filter(p => p.id !== postToDelete.id));
      setPostToDelete(null);
    } catch (error) {
      console.error('Error deleting post:', error);
      alert(`Failed to delete post: ${error.response?.data?.error || error.message}`);
    } finally {
      setDeleting(false);
    }
  };

  const startEditPost = (post) => {
    setEditingPost(post);
    let postAudiences = [{ type: 'all' }];
    if (Array.isArray(post.audiences) && post.audiences.length > 0) {
      postAudiences = post.audiences.map(a => typeof a === 'string' ? { type: a } : a);
    }
    setEditFormData({
      title: post.title || '',
      body: post.body || '',
      link: post.link || '',
      audiences: JSON.stringify(postAudiences),
      existingMedia: Array.isArray(post.media) ? [...post.media] : [],
      newMedia: []
    });
  };

  const handleEditAudienceToggle = (audience) => {
    let audiences = JSON.parse(editFormData.audiences || '[]');
    const index = audiences.findIndex((a) => a.type === audience);
    if (index > -1) {
      audiences.splice(index, 1);
    } else {
      audiences.push({ type: audience });
    }
    setEditFormData({ ...editFormData, audiences: JSON.stringify(audiences) });
  };

  const handleEditMediaChange = (e) => {
    const files = Array.from(e.target.files);
    setEditFormData({ ...editFormData, newMedia: [...editFormData.newMedia, ...files] });
  };

  const removeExistingMedia = (index) => {
    const updated = editFormData.existingMedia.filter((_, i) => i !== index);
    setEditFormData({ ...editFormData, existingMedia: updated });
  };

  const removeNewMedia = (index) => {
    const updated = editFormData.newMedia.filter((_, i) => i !== index);
    setEditFormData({ ...editFormData, newMedia: updated });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingPost) return;
    const audiences = JSON.parse(editFormData.audiences || '[]');
    if (audiences.length === 0) {
      alert('Please select at least one audience.');
      return;
    }

    setEditUploading(true);
    try {
      const data = new FormData();
      data.append('title', editFormData.title);
      data.append('body', editFormData.body || editFormData.title || ' ');
      data.append('link', editFormData.link || '');
      data.append('audiences', editFormData.audiences);
      data.append('existing_media', JSON.stringify(editFormData.existingMedia));

      editFormData.newMedia.forEach(file => {
        data.append('media', file);
      });

      await api.put(`/posts/${editingPost.id}`, data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setEditingPost(null);
      fetchPosts();
    } catch (error) {
      console.error('Error updating post:', error);
      alert(`Failed to update post: ${error.response?.data?.error || error.message}`);
    } finally {
      setEditUploading(false);
    }
  };

  const filteredPosts = posts.filter(post => 
    activeFilter === 'All' || (post.audiences && post.audiences.includes(activeFilter.toLowerCase()))
  );

  const getAuthorIcon = (role) => {
    switch(role) {
      case 'student': return <FaUserGraduate />;
      case 'guardian': return <FaUserShield />;
      case 'staff': return <FaChalkboardTeacher />;
      default: return <FaChalkboardTeacher />;
    }
  };

  const getAuthorColor = (role) => {
    switch(role) {
      case 'student': return '#3498db';
      case 'guardian': return '#9b59b6';
      case 'staff': return '#e67e22';
      default: return '#667eea';
    }
  };

  const renderMedia = (media) => {
    if (!media || media.length === 0) return null;
    return (
      <div className={styles.mediaGrid}>
        {media.slice(0, 4).map((item, index) => {
          if (item.mimetype?.startsWith('image/')) {
            return (
              <div key={index} className={styles.mediaItem}>
                <LazyImage
                  src={`${API_BASE_URL}/Uploads/posts/${item.filename}`}
                  alt={t('communication.postMedia', { defaultValue: 'Post media' })}
                />
                {media.length > 4 && index === 3 && (
                  <div className={styles.moreMedia}>+{media.length - 4}</div>
                )}
              </div>
            );
          } else if (item.mimetype?.startsWith('video/')) {
            return (
              <div key={index} className={styles.mediaItem}>
                <video controls src={`${API_BASE_URL}/Uploads/posts/${item.filename}`} />
              </div>
            );
          } else {
            return (
              <a 
                key={index} 
                href={`${API_BASE_URL}/Uploads/posts/${item.filename}`} 
                download 
                className={styles.fileAttachment}
              >
                <FiFile /> {item.originalname || item.filename}
              </a>
            );
          }
        })}
      </div>
    );
  };

  const formatDate = (date) => {
    const now = new Date();
    const postDate = new Date(date);
    const diff = now - postDate;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return postDate.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p>{t('communication.posts.loading', 'Loading posts...')}</p>
      </div>
    );
  }

  return (
    <main className={styles.postPage} aria-label={t('communication.posts.title', 'Posts')}>
      <motion.div 
        className={styles.pageHeader}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className={styles.headerContent}>
          <div className={styles.headerTitle}>
            <FiEdit className={styles.headerIcon} />
            <div>
              <h1>{t('communication.posts.title', 'Posts')}</h1>
              <p>{t('communication.posts.subtitle', 'Share updates and stay connected')}</p>
            </div>
          </div>
          <motion.button 
            className={styles.createBtn}
            onClick={() => setIsCreating(true)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <FiPlus /> Create Post
          </motion.button>
        </div>
      </motion.div>

      {/* Create Post Modal */}
      <AnimatePresence>
        {isCreating && (
          <motion.div 
            className={styles.modalOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsCreating(false)}
          >
            <motion.div 
              className={styles.createModal}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.modalHeader}>
                <h2>Create New Post</h2>
                <button onClick={() => setIsCreating(false)} className={styles.closeBtn}>
                  <FiX />
                </button>
              </div>

              <form onSubmit={handleSubmit} className={styles.createForm}>
                <div className={styles.formGroup}>
                  <input 
                    type="text" 
                    name="title" 
                    value={formData.title} 
                    onChange={handleInputChange} 
                    required 
                    placeholder="What's on your mind?"
                    className={styles.titleInput}
                  />
                </div>

                <div className={styles.formGroup}>
                  <textarea 
                    name="body" 
                    value={formData.body} 
                    onChange={handleInputChange} 
                    placeholder="Share more details..."
                    rows={4}
                  />
                </div>

                <div className={styles.formGroup}>
                  <div className={styles.linkInput}>
                    <FiLink />
                    <input 
                      type="url" 
                      name="link" 
                      value={formData.link} 
                      onChange={handleInputChange} 
                      placeholder="Add a link (optional)"
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.sectionLabel}>Who can see this?</label>
                  <div className={styles.audienceGrid}>
                    {['all', 'students', 'guardians', 'teachers', 'staff'].map(aud => (
                      <motion.label 
                        key={aud} 
                        className={`${styles.audienceChip} ${
                          JSON.parse(formData.audiences || '[]').some(a => a.type === aud) 
                            ? styles.selected 
                            : ''
                        }`}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <input 
                          type="checkbox" 
                          checked={JSON.parse(formData.audiences || '[]').some(a => a.type === aud)}
                          onChange={() => handleAudienceToggle(aud)}
                        />
                        {aud === 'all' ? 'Everyone' : aud.charAt(0).toUpperCase() + aud.slice(1)}
                      </motion.label>
                    ))}
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.mediaUpload}>
                    <FiImage /> Add Photos/Videos
                    <input 
                      type="file" 
                      multiple 
                      onChange={handleMediaChange} 
                      accept="image/*,video/*,application/pdf,.doc,.docx"
                    />
                  </label>
                  {formData.media.length > 0 && (
                    <div className={styles.mediaPreview}>
                      {formData.media.map((file, index) => (
                        <div key={index} className={styles.previewItem}>
                          <span>{file.name}</span>
                          <button type="button" onClick={() => removeMedia(index)}>
                            <FiX />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className={styles.formActions}>
                  <button 
                    type="button" 
                    className={styles.cancelBtn}
                    onClick={() => setIsCreating(false)}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className={styles.submitBtn}
                    disabled={uploading || !formData.title}
                  >
                    {uploading ? 'Publishing...' : <><FiSend /> Publish</>}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Post Modal */}
      <AnimatePresence>
        {editingPost && (
          <motion.div 
            className={styles.modalOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setEditingPost(null)}
          >
            <motion.div 
              className={styles.createModal}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.modalHeader}>
                <h2>Edit Post</h2>
                <button type="button" onClick={() => setEditingPost(null)} className={styles.closeBtn}>
                  <FiX />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className={styles.createForm}>
                <div className={styles.formGroup}>
                  <input 
                    type="text" 
                    name="title" 
                    value={editFormData.title} 
                    onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })} 
                    required 
                    placeholder="Post title"
                    className={styles.titleInput}
                  />
                </div>

                <div className={styles.formGroup}>
                  <textarea 
                    name="body" 
                    value={editFormData.body} 
                    onChange={(e) => setEditFormData({ ...editFormData, body: e.target.value })} 
                    placeholder="Post content..."
                    rows={4}
                  />
                </div>

                <div className={styles.formGroup}>
                  <div className={styles.linkInput}>
                    <FiLink />
                    <input 
                      type="url" 
                      name="link" 
                      value={editFormData.link} 
                      onChange={(e) => setEditFormData({ ...editFormData, link: e.target.value })} 
                      placeholder="Add a link (optional)"
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.sectionLabel}>Who can see this?</label>
                  <div className={styles.audienceGrid}>
                    {['all', 'students', 'guardians', 'teachers', 'staff'].map(aud => (
                      <motion.label 
                        key={aud} 
                        className={`${styles.audienceChip} ${
                          JSON.parse(editFormData.audiences || '[]').some(a => a.type === aud) 
                            ? styles.selected 
                            : ''
                        }`}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <input 
                          type="checkbox" 
                          checked={JSON.parse(editFormData.audiences || '[]').some(a => a.type === aud)}
                          onChange={() => handleEditAudienceToggle(aud)}
                        />
                        {aud === 'all' ? 'Everyone' : aud.charAt(0).toUpperCase() + aud.slice(1)}
                      </motion.label>
                    ))}
                  </div>
                </div>

                {/* Existing media attached */}
                {editFormData.existingMedia.length > 0 && (
                  <div className={styles.formGroup}>
                    <label className={styles.sectionLabel}>Current Attachments</label>
                    <div className={styles.mediaPreview}>
                      {editFormData.existingMedia.map((file, index) => (
                        <div key={index} className={styles.previewItem}>
                          <span>{file.originalname || file.filename}</span>
                          <button type="button" onClick={() => removeExistingMedia(index)} title="Remove attachment">
                            <FiX />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className={styles.formGroup}>
                  <label className={styles.mediaUpload}>
                    <FiImage /> Add More Photos/Videos
                    <input 
                      type="file" 
                      multiple 
                      onChange={handleEditMediaChange} 
                      accept="image/*,video/*,application/pdf,.doc,.docx"
                    />
                  </label>
                  {editFormData.newMedia.length > 0 && (
                    <div className={styles.mediaPreview}>
                      {editFormData.newMedia.map((file, index) => (
                        <div key={index} className={styles.previewItem}>
                          <span>{file.name}</span>
                          <button type="button" onClick={() => removeNewMedia(index)}>
                            <FiX />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className={styles.formActions}>
                  <button 
                    type="button" 
                    className={styles.cancelBtn}
                    onClick={() => setEditingPost(null)}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className={styles.submitBtn}
                    disabled={editUploading || !editFormData.title}
                  >
                    {editUploading ? 'Saving...' : <><FiCheck /> Save Changes</>}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {postToDelete && (
          <motion.div 
            className={styles.modalOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPostToDelete(null)}
          >
            <motion.div 
              className={styles.confirmModal}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.confirmIcon}>
                <FiTrash2 />
              </div>
              <h3>Delete Post?</h3>
              <p>Are you sure you want to delete &ldquo;{postToDelete.title}&rdquo;? This will permanently remove the post and its media.</p>
              <div className={styles.confirmActions}>
                <button 
                  type="button" 
                  className={styles.cancelBtn} 
                  onClick={() => setPostToDelete(null)}
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className={styles.deleteConfirmBtn} 
                  onClick={handleDeletePost}
                  disabled={deleting}
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filters and View Toggle */}
      <div className={styles.toolbar}>
        <div className={styles.filterSection}>
          <FiFilter className={styles.filterIcon} />
          <div className={styles.filterTabs}>
            {['All', 'Students', 'Guardians', 'Teachers', 'Staff'].map(filter => (
              <motion.button
                key={filter}
                className={`${styles.filterTab} ${activeFilter === filter ? styles.active : ''}`}
                onClick={() => setActiveFilter(filter)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {filter}
              </motion.button>
            ))}
          </div>
        </div>
        <div className={styles.viewToggle}>
          <button 
            className={viewMode === 'grid' ? styles.active : ''}
            onClick={() => setViewMode('grid')}
          >
            <FiGrid />
          </button>
          <button 
            className={viewMode === 'list' ? styles.active : ''}
            onClick={() => setViewMode('list')}
          >
            <FiList />
          </button>
        </div>
      </div>

      {/* Posts Feed */}
      <div className={`${styles.postFeed} ${styles[viewMode]}`}>
        {filteredPosts.length === 0 ? (
          <motion.div 
            className={styles.emptyState}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <FiEdit className={styles.emptyIcon} />
            <h3>No posts yet</h3>
            <p>Be the first to share something!</p>
            <button onClick={() => setIsCreating(true)}>
              <FiPlus /> Create Post
            </button>
          </motion.div>
        ) : (
          <AnimatePresence>
            {filteredPosts.map((post, index) => (
              <motion.article
                key={post.id}
                className={styles.postCard}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ y: -4 }}
              >
                {/* Post Header */}
                <div className={styles.postHeader}>
                  <div className={styles.authorInfo}>
                    <div 
                      className={styles.authorAvatar}
                      style={{ background: getAuthorColor(post.author_type) }}
                    >
                      {post.author_image ? (
                        <img src={post.author_image} alt={post.author_name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                      ) : (
                        <span style={{ color: 'white', fontWeight: 'bold', fontSize: '1.2rem' }}>
                          {(post.author_name && post.author_name.toLowerCase() !== 'current user' && post.author_name.toLowerCase() !== 'administrator') ? post.author_name.charAt(0).toUpperCase() : ((profile?.name && profile.name.toLowerCase() !== 'current user') ? profile.name.charAt(0).toUpperCase() : 'A')}
                        </span>
                      )}
                    </div>
                    <div className={styles.authorDetails}>
                      <span className={styles.authorName}>
                        {(post.author_name && post.author_name.toLowerCase() !== 'current user' && post.author_name.toLowerCase() !== 'administrator') ? post.author_name : ((profile?.name && profile.name.toLowerCase() !== 'current user') ? profile.name : 'Administrator')}
                      </span>
                      <span className={styles.postTime}>{formatDate(post.created_at)}</span>
                    </div>
                  </div>
                  <div className={styles.moreMenuContainer}>
                    <button 
                      className={styles.moreBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpenId(menuOpenId === post.id ? null : post.id);
                      }}
                      title="Post options"
                    >
                      <FiMoreHorizontal />
                    </button>
                    {menuOpenId === post.id && (
                      <div className={styles.dropdownMenu} onClick={(e) => e.stopPropagation()}>
                        <button 
                          type="button"
                          className={styles.dropdownItem}
                          onClick={() => {
                            setMenuOpenId(null);
                            startEditPost(post);
                          }}
                        >
                          <FiEdit2 /> <span>Edit Post</span>
                        </button>
                        <button 
                          type="button"
                          className={`${styles.dropdownItem} ${styles.deleteItem}`}
                          onClick={() => {
                            setMenuOpenId(null);
                            setPostToDelete(post);
                          }}
                        >
                          <FiTrash2 /> <span>Delete Post</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Audience Tags */}
                <div className={styles.audienceTags}>
                  {Array.isArray(post.audiences) && post.audiences.map((aud, i) => (
                    <span key={i} className={styles.audienceTag}>
                      {aud === 'all' ? 'Everyone' : aud.charAt(0).toUpperCase() + aud.slice(1)}
                    </span>
                  ))}
                </div>

                {/* Post Content */}
                <div className={styles.postContent}>
                  <h3>{post.title}</h3>
                  {post.body && <p>{post.body}</p>}
                  {post.link && (
                    <a href={post.link} target="_blank" rel="noopener noreferrer" className={styles.postLink}>
                      <FiLink /> {post.link}
                    </a>
                  )}
                </div>

                {/* Media */}
                {post.media && post.media.length > 0 && renderMedia(post.media)}

                {/* Post Actions */}
                <div className={styles.postActions}>
                  <motion.button 
                    className={`${styles.actionBtn} ${likedPosts.has(post.id) ? styles.liked : ''}`}
                    onClick={() => handleLike(post.id)}
                    whileTap={{ scale: 0.9 }}
                  >
                    {likedPosts.has(post.id) ? <FaHeart /> : <FiHeart />}
                    <span>{post.likes || 0}</span>
                  </motion.button>
                  <button className={styles.actionBtn}>
                    <FiMessageSquare />
                    <span>{post.comments || 0}</span>
                  </button>
                  <button className={styles.actionBtn}>
                    <FiShare2 />
                    <span>Share</span>
                  </button>
                  <button className={styles.actionBtn}>
                    <FiBookmark />
                  </button>
                </div>
              </motion.article>
            ))}
          </AnimatePresence>
        )}
      </div>
    </main>
  );
};

export default Post;
