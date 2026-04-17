// ========================================
// COMMUNITY PAGE - FULL CRUD OPERATIONS
// Handles posts, comments, voting, filtering
// ========================================

// API endpoints
const API_BASE = 'http://localhost:5000/api/community';

// State management
let currentPosts = [];
let currentFilter = 'recent';
let currentCategory = null;

// ========================================
// INITIALIZATION
// ========================================
document.addEventListener('DOMContentLoaded', () => {
  initializeCommunity();
});

async function initializeCommunity() {
  await loadPosts();
  await loadStats();
  initializeEventListeners();
}

// ========================================
// LOAD POSTS FROM API
// ========================================
async function loadPosts(sortBy = 'recent', category = null) {
  try {
    const params = new URLSearchParams();
    if (sortBy) params.append('sortBy', sortBy);
    if (category) params.append('category', category);
    
    const response = await fetch(`${API_BASE}/posts?${params}`);
    const data = await response.json();
    
    if (data.success) {
      currentPosts = data.posts;
      renderPosts(data.posts);
    } else {
      showNotification('Failed to load posts', 'error');
    }
  } catch (error) {
    console.error('Error loading posts:', error);
    showNotification('Error loading posts. Please try again.', 'error');
  }
}

// ========================================
// RENDER POSTS
// ========================================
function renderPosts(posts) {
  const postsContainer = document.getElementById('postsContainer');
  
  if (!postsContainer) return;
  
  if (posts.length === 0) {
    postsContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📭</div>
        <h3>No posts yet</h3>
        <p>Be the first to start a discussion!</p>
        <button class="btn btn-primary" onclick="openCreatePostModal()">Create Post</button>
      </div>
    `;
    return;
  }
  
  postsContainer.innerHTML = posts.map(post => `
    <div class="post-card" data-post-id="${post.id}">
      <div class="post-votes">
        <button class="vote-btn upvote" onclick="votePost(${post.id}, 'up')" aria-label="Upvote">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M10 4L14 12H6L10 4Z" fill="currentColor"/>
          </svg>
        </button>
        <span class="vote-count">${post.votes}</span>
        <button class="vote-btn downvote" onclick="votePost(${post.id}, 'down')" aria-label="Downvote">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M10 16L6 8H14L10 16Z" fill="currentColor"/>
          </svg>
        </button>
      </div>
      
      <div class="post-content">
        <div class="post-header">
          <div class="post-meta">
            <span class="post-category badge badge-${getCategoryColor(post.category)}">${post.category || 'General'}</span>
            <span class="post-author">
              ${post.verified ? '<span class="verified-badge" title="Verified">✓</span>' : ''}
              ${post.author}
            </span>
            <span class="post-date">${formatRelativeTime(post.date)}</span>
          </div>
          
          ${post.author === 'You' ? `
            <div class="post-actions">
              <button class="btn-icon" onclick="editPost(${post.id})" title="Edit">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M11.333 2L14 4.667L5.333 13.333H2.667V10.667L11.333 2Z" stroke="currentColor" stroke-width="1.5"/>
                </svg>
              </button>
              <button class="btn-icon" onclick="deletePost(${post.id})" title="Delete">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3.333 4H12.667M6.667 7.333V11.333M9.333 7.333V11.333M4 4L4.667 13.333H11.333L12 4H4Z" stroke="currentColor" stroke-width="1.5"/>
                </svg>
              </button>
            </div>
          ` : ''}
        </div>
        
        <h3 class="post-title">
          <a href="#" onclick="viewPost(${post.id}); return false;">${escapeHtml(post.title)}</a>
        </h3>
        
        <p class="post-excerpt">${escapeHtml(truncate(post.content, 200))}</p>
        
        ${post.tags && post.tags.length > 0 ? `
          <div class="post-tags">
            ${post.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
          </div>
        ` : ''}
        
        <div class="post-stats">
          <span class="stat-item">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M14 10.667C14 11.403 13.403 12 12.667 12H4.667L2 14.667V3.333C2 2.597 2.597 2 3.333 2H12.667C13.403 2 14 2.597 14 3.333V10.667Z" stroke="currentColor" stroke-width="1.5"/>
            </svg>
            ${post.comments} comments
          </span>
          <span class="stat-item">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5"/>
              <circle cx="8" cy="8" r="2" fill="currentColor"/>
            </svg>
            ${post.views} views
          </span>
        </div>
      </div>
    </div>
  `).join('');
}

// ========================================
// CREATE POST
// ========================================
function openCreatePostModal() {
  const modal = document.getElementById('createPostModal');
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    document.getElementById('postTitle')?.focus();
  }
}

function closeCreatePostModal() {
  const modal = document.getElementById('createPostModal');
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
    document.getElementById('createPostForm')?.reset();
  }
}

async function submitPost(event) {
  event.preventDefault();
  
  const title = document.getElementById('postTitle')?.value.trim();
  const content = document.getElementById('postContent')?.value.trim();
  const category = document.getElementById('postCategory')?.value;
  const tags = document.getElementById('postTags')?.value.split(',').map(t => t.trim()).filter(t => t);
  
  if (!title || !content) {
    showNotification('Please fill in all required fields', 'error');
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE}/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title,
        content,
        category,
        tags,
        author: 'You'
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      showNotification('Post created successfully!', 'success');
      closeCreatePostModal();
      await loadPosts(currentFilter, currentCategory);
    } else {
      showNotification(data.error || 'Failed to create post', 'error');
    }
  } catch (error) {
    console.error('Error creating post:', error);
    showNotification('Error creating post. Please try again.', 'error');
  }
}

// ========================================
// EDIT POST
// ========================================
async function editPost(postId) {
  const post = currentPosts.find(p => p.id === postId);
  if (!post) return;
  
  const newTitle = prompt('Edit title:', post.title);
  if (newTitle === null) return;
  
  const newContent = prompt('Edit content:', post.content);
  if (newContent === null) return;
  
  try {
    const response = await fetch(`${API_BASE}/posts/${postId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: newTitle.trim(),
        content: newContent.trim()
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      showNotification('Post updated successfully!', 'success');
      await loadPosts(currentFilter, currentCategory);
    } else {
      showNotification(data.error || 'Failed to update post', 'error');
    }
  } catch (error) {
    console.error('Error updating post:', error);
    showNotification('Error updating post. Please try again.', 'error');
  }
}

// ========================================
// DELETE POST
// ========================================
async function deletePost(postId) {
  if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE}/posts/${postId}`, {
      method: 'DELETE'
    });
    
    const data = await response.json();
    
    if (data.success) {
      showNotification('Post deleted successfully!', 'success');
      await loadPosts(currentFilter, currentCategory);
    } else {
      showNotification(data.error || 'Failed to delete post', 'error');
    }
  } catch (error) {
    console.error('Error deleting post:', error);
    showNotification('Error deleting post. Please try again.', 'error');
  }
}

// ========================================
// VOTE ON POST
// ========================================
async function votePost(postId, type) {
  try {
    const response = await fetch(`${API_BASE}/posts/${postId}/vote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ type })
    });
    
    const data = await response.json();
    
    if (data.success) {
      // Update UI
      const postCard = document.querySelector(`[data-post-id="${postId}"]`);
      if (postCard) {
        const voteCount = postCard.querySelector('.vote-count');
        if (voteCount) {
          voteCount.textContent = data.votes;
        }
      }
      
      // Update local state
      const post = currentPosts.find(p => p.id === postId);
      if (post) {
        post.votes = data.votes;
      }
    } else {
      showNotification(data.error || 'Failed to vote', 'error');
    }
  } catch (error) {
    console.error('Error voting:', error);
    showNotification('Error voting. Please try again.', 'error');
  }
}

// ========================================
// VIEW POST DETAILS
// ========================================
async function viewPost(postId) {
  try {
    const response = await fetch(`${API_BASE}/posts/${postId}`);
    const data = await response.json();
    
    if (data.success) {
      showPostModal(data.post, data.comments);
    } else {
      showNotification(data.error || 'Failed to load post', 'error');
    }
  } catch (error) {
    console.error('Error loading post:', error);
    showNotification('Error loading post. Please try again.', 'error');
  }
}

function showPostModal(post, comments) {
  // Create modal
  const modal = document.createElement('div');
  modal.className = 'modal active';
  modal.innerHTML = `
    <div class="modal-overlay" onclick="this.parentElement.remove(); document.body.style.overflow = '';"></div>
    <div class="modal-container" style="max-width: 800px;">
      <div class="modal-header">
        <h2>${escapeHtml(post.title)}</h2>
        <button class="modal-close" onclick="this.closest('.modal').remove(); document.body.style.overflow = '';">&times;</button>
      </div>
      <div class="modal-body">
        <div class="post-detail-meta">
          <span class="badge badge-${getCategoryColor(post.category)}">${post.category}</span>
          <span>${post.verified ? '<span class="verified-badge">✓</span>' : ''} ${post.author}</span>
          <span>${formatRelativeTime(post.date)}</span>
        </div>
        
        <div class="post-detail-content">
          ${escapeHtml(post.content).replace(/\n/g, '<br>')}
        </div>
        
        <div class="post-detail-stats">
          <button class="vote-btn upvote" onclick="votePost(${post.id}, 'up')">↑</button>
          <span>${post.votes} votes</span>
          <button class="vote-btn downvote" onclick="votePost(${post.id}, 'down')">↓</button>
          <span style="margin-left: 1rem;">${post.comments} comments</span>
          <span>${post.views} views</span>
        </div>
        
        <hr style="margin: 2rem 0;">
        
        <h3>Comments (${comments.length})</h3>
        
        <div class="comment-form">
          <textarea id="newCommentContent" class="textarea" placeholder="Add a comment..." rows="3"></textarea>
          <button class="btn btn-primary" onclick="submitComment(${post.id})">Post Comment</button>
        </div>
        
        <div class="comments-list" id="commentsList-${post.id}">
          ${comments.length > 0 ? renderComments(comments, post.id) : '<p class="text-secondary">No comments yet. Be the first!</p>'}
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  document.body.style.overflow = 'hidden';
}

function renderComments(comments, postId) {
  return comments.map(comment => `
    <div class="comment-item" data-comment-id="${comment.id}">
      <div class="comment-header">
        <strong>${comment.author}</strong>
        <span class="text-secondary">${formatRelativeTime(comment.date)}</span>
      </div>
      <div class="comment-content">
        ${escapeHtml(comment.content)}
      </div>
      <div class="comment-actions">
        <button class="btn-text" onclick="voteComment(${comment.id}, 'up')">
          ↑ ${comment.votes > 0 ? comment.votes : ''}
        </button>
        ${comment.author === 'You' ? `
          <button class="btn-text" onclick="editComment(${comment.id}, ${postId})">Edit</button>
          <button class="btn-text" onclick="deleteComment(${comment.id}, ${postId})">Delete</button>
        ` : ''}
      </div>
    </div>
  `).join('');
}

// ========================================
// COMMENT OPERATIONS
// ========================================
async function submitComment(postId) {
  const content = document.getElementById('newCommentContent')?.value.trim();
  
  if (!content) {
    showNotification('Please enter a comment', 'error');
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE}/posts/${postId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        content,
        author: 'You'
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      showNotification('Comment posted!', 'success');
      // Reload post details
      viewPost(postId);
    } else {
      showNotification(data.error || 'Failed to post comment', 'error');
    }
  } catch (error) {
    console.error('Error posting comment:', error);
    showNotification('Error posting comment. Please try again.', 'error');
  }
}

async function editComment(commentId, postId) {
  const newContent = prompt('Edit your comment:');
  if (!newContent) return;
  
  try {
    const response = await fetch(`${API_BASE}/comments/${commentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ content: newContent.trim() })
    });
    
    const data = await response.json();
    
    if (data.success) {
      showNotification('Comment updated!', 'success');
      viewPost(postId);
    } else {
      showNotification(data.error || 'Failed to update comment', 'error');
    }
  } catch (error) {
    console.error('Error updating comment:', error);
    showNotification('Error updating comment. Please try again.', 'error');
  }
}

async function deleteComment(commentId, postId) {
  if (!confirm('Delete this comment?')) return;
  
  try {
    const response = await fetch(`${API_BASE}/comments/${commentId}`, {
      method: 'DELETE'
    });
    
    const data = await response.json();
    
    if (data.success) {
      showNotification('Comment deleted!', 'success');
      viewPost(postId);
    } else {
      showNotification(data.error || 'Failed to delete comment', 'error');
    }
  } catch (error) {
    console.error('Error deleting comment:', error);
    showNotification('Error deleting comment. Please try again.', 'error');
  }
}

async function voteComment(commentId, type) {
  try {
    const response = await fetch(`${API_BASE}/comments/${commentId}/vote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ type })
    });
    
    const data = await response.json();
    
    if (data.success) {
      const commentEl = document.querySelector(`[data-comment-id="${commentId}"]`);
      if (commentEl) {
        const voteBtn = commentEl.querySelector('.btn-text');
        if (voteBtn) {
          voteBtn.textContent = `↑ ${data.votes > 0 ? data.votes : ''}`;
        }
      }
    }
  } catch (error) {
    console.error('Error voting comment:', error);
  }
}

// ========================================
// LOAD STATISTICS
// ========================================
async function loadStats() {
  try {
    const response = await fetch(`${API_BASE}/stats`);
    const data = await response.json();
    
    if (data.success) {
      updateStatsDisplay(data.stats);
    }
  } catch (error) {
    console.error('Error loading stats:', error);
  }
}

function updateStatsDisplay(stats) {
  const statsContainer = document.getElementById('communityStats');
  if (statsContainer) {
    statsContainer.innerHTML = `
      <div class="stat-card">
        <div class="stat-value">${formatNumber(stats.totalPosts)}</div>
        <div class="stat-label">Total Posts</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${formatNumber(stats.totalComments)}</div>
        <div class="stat-label">Comments</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${formatNumber(stats.activeDiscussions)}</div>
        <div class="stat-label">Active Discussions</div>
      </div>
    `;
  }
}

// ========================================
// EVENT LISTENERS
// ========================================
function initializeEventListeners() {
  // Create post button
  const createPostBtn = document.getElementById('createPostBtn');
  if (createPostBtn) {
    createPostBtn.addEventListener('click', (e) => {
      e.preventDefault();
      openCreatePostModal();
    });
  }
  
  // Create post form
  const createPostForm = document.getElementById('createPostForm');
  if (createPostForm) {
    createPostForm.addEventListener('submit', submitPost);
  }
  
  // Modal close buttons
  document.querySelectorAll('.modal-close, .modal-overlay').forEach(el => {
    el.addEventListener('click', function() {
      const modal = this.closest('.modal');
      if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
      }
    });
  });
  
  // Cancel button
  const cancelBtn = document.getElementById('cancelPostBtn');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', closeCreatePostModal);
  }
  
  // Filter buttons
  document.querySelectorAll('[data-sort]').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('[data-sort]').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      
      const sortType = this.getAttribute('data-sort');
      currentFilter = sortType === 'hot' ? 'popular' : sortType === 'new' ? 'recent' : sortType === 'top' ? 'popular' : 'recent';
      
      loadPosts(currentFilter, currentCategory);
    });
  });
  
  // Character counters
  const titleInput = document.getElementById('postTitle');
  const contentInput = document.getElementById('postContent');
  const titleCount = document.getElementById('titleCount');
  const contentCount = document.getElementById('contentCount');
  
  if (titleInput && titleCount) {
    titleInput.addEventListener('input', () => {
      titleCount.textContent = titleInput.value.length;
    });
  }
  
  if (contentInput && contentCount) {
    contentInput.addEventListener('input', () => {
      contentCount.textContent = contentInput.value.length;
    });
  }
  
  // Escape key to close modals
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const activeModal = document.querySelector('.modal.active');
      if (activeModal) {
        activeModal.classList.remove('active');
        document.body.style.overflow = '';
      }
    }
  });
}

// ========================================
// UTILITY FUNCTIONS
// ========================================
function formatRelativeTime(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
  if (seconds < 2592000) return `${Math.floor(seconds / 604800)} weeks ago`;
  return `${Math.floor(seconds / 2592000)} months ago`;
}

function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

function truncate(str, length) {
  if (str.length <= length) return str;
  return str.substring(0, length) + '...';
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function getCategoryColor(category) {
  const colors = {
    'General': 'secondary',
    'Questions': 'info',
    'Reviews': 'success',
    'Recommendations': 'warning',
    'Discussion': 'primary'
  };
  return colors[category] || 'secondary';
}

function showNotification(message, type = 'info') {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 1rem 1.5rem;
    background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
    color: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 10000;
    animation: slideIn 0.3s ease;
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Add animations
if (!document.getElementById('notification-styles')) {
  const style = document.createElement('style');
  style.id = 'notification-styles';
  style.textContent = `
    @keyframes slideIn {
      from { transform: translateX(400px); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
      from { transform: translateX(0); opacity: 1; }
      to { transform: translateX(400px); opacity: 0; }
    }
  `;
  document.head.appendChild(style);
}

// Export functions to window for inline onclick handlers
window.votePost = votePost;
window.viewPost = viewPost;
window.editPost = editPost;
window.deletePost = deletePost;
window.submitComment = submitComment;
window.editComment = editComment;
window.deleteComment = deleteComment;
window.voteComment = voteComment;
window.openCreatePostModal = openCreatePostModal;
window.closeCreatePostModal = closeCreatePostModal;
