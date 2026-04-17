/**
 * Submit Product Page JavaScript
 * Handles product URL submission and analysis
 */

// Initialize page when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  loadRecentProducts();
  setupFormSubmission();
  autoDetectRetailer();
});

/**
 * Setup form submission handler
 */
function setupFormSubmission() {
  const form = document.getElementById('submitProductForm');
  
  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const url = document.getElementById('productUrl').value.trim();
    const retailer = document.getElementById('retailer').value;
    const productName = document.getElementById('productName').value.trim();
    const category = document.getElementById('category').value;
    
    // Validate URL
    if (!isValidURL(url)) {
      showNotification('Please enter a valid product URL', 'error');
      return;
    }
    
    if (!retailer) {
      showNotification('Please select a retailer', 'error');
      return;
    }
    
    // Start analysis
    await analyzeProduct({
      url,
      retailer,
      name: productName,
      category
    });
  });
}

/**
 * Auto-detect retailer from URL
 */
function autoDetectRetailer() {
  const urlInput = document.getElementById('productUrl');
  const retailerSelect = document.getElementById('retailer');
  
  urlInput.addEventListener('blur', function() {
    const url = this.value.toLowerCase();
    
    if (url.includes('amazon.')) {
      retailerSelect.value = 'Amazon';
    } else if (url.includes('flipkart.')) {
      retailerSelect.value = 'Flipkart';
    } else if (url.includes('walmart.')) {
      retailerSelect.value = 'Walmart';
    } else if (url.includes('target.')) {
      retailerSelect.value = 'Target';
    } else if (url.includes('bestbuy.')) {
      retailerSelect.value = 'BestBuy';
    }
  });
}

/**
 * Analyze product
 */
async function analyzeProduct(productData) {
  // Show loading overlay
  showLoadingOverlay();
  
  try {
    // Call the real backend API
    const response = await API.products.analyze(
      productData.url,
      productData.retailer,
      productData.name,
      productData.category
    );
    
    if (response.success) {
      const productId = response.productId || response.product.id;
      
      // Save to recent products
      saveToRecentProducts({
        id: productId,
        name: response.product.name,
        url: response.product.url,
        retailer: response.product.retailer,
        category: response.product.category,
        analyzedAt: response.product.analyzedAt || new Date().toISOString()
      });
      
      // Redirect to analysis page
      showNotification('Analysis complete! Redirecting...', 'success');
      setTimeout(() => {
        window.location.href = `analysis.html?id=${productId}`;
      }, 1500);
    } else {
      throw new Error(response.error || 'Analysis failed');
    }
  } catch (error) {
    hideLoadingOverlay();
    showNotification(`Analysis failed: ${error.message}`, 'error');
    console.error('Analysis error:', error);
  }
}

/**
 * Simulate analysis with progressive steps (LEGACY - for reference)
 */
async function simulateAnalysis() {
  const steps = [
    { id: 'step1', delay: 800, text: '✓ Product details fetched' },
    { id: 'step2', delay: 1200, text: '✓ Reviews collected (2,847 reviews)' },
    { id: 'step3', delay: 1500, text: '✓ Sentiment analyzed' },
    { id: 'step4', delay: 1000, text: '✓ Insights generated' }
  ];
  
  for (const step of steps) {
    await new Promise(resolve => setTimeout(resolve, step.delay));
    const stepElement = document.getElementById(step.id);
    stepElement.textContent = step.text;
    stepElement.classList.add('completed');
  }
}

/**
 * Show loading overlay
 */
function showLoadingOverlay() {
  const overlay = document.getElementById('loadingOverlay');
  overlay.style.display = 'flex';
  
  // Disable submit button
  const btn = document.getElementById('analyzeBtn');
  btn.disabled = true;
  document.getElementById('analyzeBtnText').style.display = 'none';
  document.getElementById('analyzeBtnLoader').style.display = 'inline';
  
  // Reset progress steps
  ['step1', 'step2', 'step3', 'step4'].forEach(id => {
    const el = document.getElementById(id);
    el.classList.remove('completed');
    el.textContent = el.textContent.replace('✓ ', '⏳ ');
  });
}

/**
 * Hide loading overlay
 */
function hideLoadingOverlay() {
  const overlay = document.getElementById('loadingOverlay');
  overlay.style.display = 'none';
  
  // Re-enable submit button
  const btn = document.getElementById('analyzeBtn');
  btn.disabled = false;
  document.getElementById('analyzeBtnText').style.display = 'inline';
  document.getElementById('analyzeBtnLoader').style.display = 'none';
}

/**
 * Load recent products from localStorage
 */
function loadRecentProducts() {
  const recent = getRecentProducts();
  const container = document.getElementById('recentProducts');
  
  if (recent.length === 0) {
    container.innerHTML = '<p class="text-secondary">No recently analyzed products yet.</p>';
    return;
  }
  
  container.innerHTML = recent.slice(0, 4).map(product => `
    <a href="analysis.html?id=${product.id}" class="card" style="text-decoration: none; color: inherit; padding: var(--space-4); transition: transform 0.2s;">
      <div style="margin-bottom: var(--space-2);">
        <div class="badge badge-sm" style="margin-bottom: var(--space-3);">${product.retailer}</div>
        <h4 title="${product.name}" style="font-size: 1rem; font-weight: 600; margin: 0; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; word-wrap: break-word; line-height: 1.5; max-height: 3em;">
          ${product.name}
        </h4>
      </div>
      <p class="text-secondary" style="font-size: 0.75rem; margin: 0;">
        ${formatRelativeTime(product.analyzedAt)}
      </p>
    </a>
  `).join('');
  
  // Add hover effect
  container.querySelectorAll('.card').forEach(card => {
    card.addEventListener('mouseenter', function() {
      this.style.transform = 'translateY(-4px)';
    });
    card.addEventListener('mouseleave', function() {
      this.style.transform = 'translateY(0)';
    });
  });
}

/**
 * Save product to recent products
 */
function saveToRecentProducts(product) {
  let recent = getRecentProducts();
  
  // Remove if already exists
  recent = recent.filter(p => p.url !== product.url);
  
  // Add to beginning
  recent.unshift(product);
  
  // Keep only last 10
  recent = recent.slice(0, 10);
  
  localStorage.setItem('recentProducts', JSON.stringify(recent));
}

/**
 * Get recent products from localStorage
 */
function getRecentProducts() {
  try {
    return JSON.parse(localStorage.getItem('recentProducts') || '[]');
  } catch {
    return [];
  }
}

/**
 * Reset form
 */
function resetForm() {
  document.getElementById('submitProductForm').reset();
  showNotification('Form cleared', 'info');
}

/**
 * Validate URL
 */
function isValidURL(string) {
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Extract product name from URL
 */
function extractProductName(url) {
  try {
    const urlObj = new URL(url);
    const path = urlObj.pathname;
    
    // Try to extract from common URL patterns
    const parts = path.split('/').filter(p => p.length > 0);
    
    // Amazon-like: /product-name/dp/B0123
    if (parts.length > 0) {
      const nameCandidate = parts.find(p => p.length > 10 && !p.match(/^[A-Z0-9]{10}$/));
      if (nameCandidate) {
        return nameCandidate.replace(/-/g, ' ')
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ')
          .substring(0, 50);
      }
    }
    
    return 'Product';
  } catch {
    return 'Product';
  }
}

/**
 * Generate mock product ID
 */
function generateMockProductId() {
  return 'prod_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

/**
 * Format relative time (from main.js utility)
 */
function formatRelativeTime(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return Math.floor(seconds / 60) + ' minutes ago';
  if (seconds < 86400) return Math.floor(seconds / 3600) + ' hours ago';
  if (seconds < 604800) return Math.floor(seconds / 86400) + ' days ago';
  
  return date.toLocaleDateString();
}

/**
 * Show notification (from main.js utility)
 */
function showNotification(message, type = 'info') {
  if (window.InsightifyUtils && window.InsightifyUtils.showNotification) {
    window.InsightifyUtils.showNotification(message, type);
  } else {
    alert(message);
  }
}
