// ========================================
// MAIN JAVASCRIPT
// Core functionality and utilities
// ========================================

// ===== MOBILE MENU =====
document.addEventListener('DOMContentLoaded', () => {
  const mobileToggle = document.querySelector('.mobile-menu-toggle');
  const navMenu = document.querySelector('.nav-menu');
  const body = document.body;
  
  if (mobileToggle && navMenu) {
    // Toggle menu
    mobileToggle.addEventListener('click', () => {
      const isActive = navMenu.classList.toggle('active');
      mobileToggle.classList.toggle('active');
      
      // Prevent body scroll when menu is open
      if (isActive) {
        body.style.overflow = 'hidden';
      } else {
        body.style.overflow = '';
      }
    });
    
    // Close menu when clicking on a link
    const navLinks = navMenu.querySelectorAll('a');
    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        navMenu.classList.remove('active');
        mobileToggle.classList.remove('active');
        body.style.overflow = '';
      });
    });
    
    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (navMenu.classList.contains('active') &&
          !navMenu.contains(e.target) &&
          !mobileToggle.contains(e.target)) {
        navMenu.classList.remove('active');
        mobileToggle.classList.remove('active');
        body.style.overflow = '';
      }
    });
    
    // Close menu on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && navMenu.classList.contains('active')) {
        navMenu.classList.remove('active');
        mobileToggle.classList.remove('active');
        body.style.overflow = '';
      }
    });
  }
  
  // ===== SMOOTH SCROLLING =====
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const href = this.getAttribute('href');
      if (href !== '#' && href !== '#!') {
        e.preventDefault();
        const target = document.querySelector(href);
        if (target) {
          target.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        }
      }
    });
  });
  
  // ===== TABS FUNCTIONALITY =====
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabPanels = document.querySelectorAll('.tab-panel');
  
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const targetTab = button.getAttribute('data-tab');
      
      // Remove active class from all buttons and panels
      tabButtons.forEach(btn => {
        btn.classList.remove('active');
        btn.setAttribute('aria-selected', 'false');
      });
      tabPanels.forEach(panel => {
        panel.classList.remove('active');
      });
      
      // Add active class to clicked button and corresponding panel
      button.classList.add('active');
      button.setAttribute('aria-selected', 'true');
      const targetPanel = document.getElementById(targetTab);
      if (targetPanel) {
        targetPanel.classList.add('active');
      }
    });
  });
  
  // ===== FORM VALIDATION & REAL ANALYSIS =====
  const analyzeForm = document.getElementById('analyzeForm');
  if (analyzeForm) {
    analyzeForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const urlInput = document.getElementById('productUrl');
      const submitBtn = analyzeForm.querySelector('button[type="submit"]');
      const originalBtnText = submitBtn ? submitBtn.innerHTML : 'Analyse Now ✨';
      const url = urlInput ? urlInput.value.trim() : '';
      
      if (!url) {
        showNotification('Please enter a product URL', 'error');
        return;
      }
      
      try {
        new URL(url);
      } catch (error) {
        showNotification('Please enter a valid URL', 'error');
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '⏳ Scraping & Analyzing...';
      }
      showNotification('Analyzing product reviews with NLP... Please wait.', 'info');

      try {
        if (typeof API !== 'undefined' && API.products && API.products.analyze) {
          const response = await API.products.analyze(url);
          if (response && response.success) {
            const productId = response.productId || (response.product && response.product.id);
            try {
              const recent = JSON.parse(localStorage.getItem('recentProducts') || '[]');
              const newProduct = {
                id: productId,
                name: response.product ? response.product.name : 'Analyzed Product',
                url: url,
                retailer: response.product ? response.product.retailer : 'Amazon',
                analyzedAt: new Date().toISOString()
              };
              const filtered = recent.filter(p => p.id !== productId);
              filtered.unshift(newProduct);
              localStorage.setItem('recentProducts', JSON.stringify(filtered.slice(0, 10)));
            } catch (err) {
              console.warn('Could not save recent product:', err);
            }

            showNotification('Analysis complete! Redirecting...', 'success');
            setTimeout(() => {
              window.location.href = `analysis.html?id=${productId}`;
            }, 800);
            return;
          } else {
            throw new Error((response && response.error) || 'Analysis failed');
          }
        } else {
          window.location.href = `submit.html?url=${encodeURIComponent(url)}`;
        }
      } catch (err) {
        console.error('Analysis error:', err);
        showNotification(`Analysis failed: ${err.message}`, 'error');
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnText;
        }
      }
    });
  }
});

// ===== NOTIFICATION SYSTEM =====
function showNotification(message, type = 'info') {
  // Remove existing notifications
  const existingNotification = document.querySelector('.notification');
  if (existingNotification) {
    existingNotification.remove();
  }
  
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.innerHTML = `
    <span>${message}</span>
    <button class="notification-close" aria-label="Close notification">&times;</button>
  `;
  
  // Add styles if not already added
  if (!document.getElementById('notification-styles')) {
    const style = document.createElement('style');
    style.id = 'notification-styles';
    style.textContent = `
      .notification {
        position: fixed;
        top: 80px;
        right: 20px;
        padding: 1rem 1.5rem;
        background: white;
        border-radius: 0.5rem;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        display: flex;
        align-items: center;
        gap: 1rem;
        z-index: 1000;
        animation: slideIn 0.3s ease-out;
      }
      
      .notification-success {
        border-left: 4px solid var(--color-positive);
      }
      
      .notification-error {
        border-left: 4px solid var(--color-negative);
      }
      
      .notification-info {
        border-left: 4px solid var(--color-primary);
      }
      
      .notification-close {
        background: none;
        border: none;
        font-size: 1.5rem;
        color: var(--color-text-light);
        cursor: pointer;
        padding: 0;
        line-height: 1;
      }
      
      @keyframes slideIn {
        from {
          transform: translateX(400px);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
    `;
    document.head.appendChild(style);
  }
  
  document.body.appendChild(notification);
  
  // Close button functionality
  const closeBtn = notification.querySelector('.notification-close');
  closeBtn.addEventListener('click', () => {
    notification.remove();
  });
  
  // Auto-remove after 5 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.remove();
    }
  }, 5000);
}

// ===== UTILITY FUNCTIONS =====

// Debounce function for search inputs
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Format number with commas
function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Format date to relative time
function formatRelativeTime(date) {
  const now = new Date();
  const diff = now - date;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (days < 30) return `${days} day${days > 1 ? 's' : ''} ago`;
  return date.toLocaleDateString();
}

// ===== LAZY LOADING FOR IMAGES =====
if ('IntersectionObserver' in window) {
  const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        img.src = img.dataset.src;
        img.classList.remove('lazy');
        imageObserver.unobserve(img);
      }
    });
  });
  
  document.querySelectorAll('img.lazy').forEach(img => {
    imageObserver.observe(img);
  });
}

// ===== ANALYTICS TRACKING (Placeholder) =====
function trackEvent(category, action, label = '') {
  // This is where you'd integrate Google Analytics, Mixpanel, etc.
  console.log('Track Event:', { category, action, label });
}

// Export functions for use in other scripts
window.InsightifyUtils = {
  showNotification,
  debounce,
  formatNumber,
  formatRelativeTime,
  trackEvent
};
