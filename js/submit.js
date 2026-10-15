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
    
    let selectedRetailer = retailer;
    if (!selectedRetailer) {
      const lower = url.toLowerCase();
      if (lower.includes('amazon') || lower.includes('amzn') || lower.includes('a.co')) {
        selectedRetailer = 'Amazon';
      } else if (lower.includes('flipkart')) {
        selectedRetailer = 'Flipkart';
      } else {
        showNotification('Please select a retailer', 'error');
        return;
      }
      document.getElementById('retailer').value = selectedRetailer;
    }
    
    // Start analysis
    await analyzeProduct({
      url,
      retailer: selectedRetailer,
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
  
  const detect = (val) => {
    if (!val) return;
    const url = val.toLowerCase();
    if (url.includes('amazon') || url.includes('amzn') || url.includes('a.co')) {
      retailerSelect.value = 'Amazon';
    } else if (url.includes('flipkart')) {
      retailerSelect.value = 'Flipkart';
    } else if (url.includes('walmart')) {
      retailerSelect.value = 'Walmart';
    } else if (url.includes('target')) {
      retailerSelect.value = 'Target';
    } else if (url.includes('bestbuy')) {
      retailerSelect.value = 'BestBuy';
    }
  };
  
  urlInput.addEventListener('blur', function() {
    detect(this.value);
  });
  urlInput.addEventListener('input', function() {
    detect(this.value);
  });
  
  // Check URL parameter if passed
  try {
    const params = new URLSearchParams(window.location.search);
    const urlParam = params.get('url');
    if (urlParam) {
      urlInput.value = urlParam;
      detect(urlParam);
    }
  } catch (e) {}
}

/**
 * Analyze product with retry and polling
 */
async function analyzeProduct(productData) {
  const { url, retailer, name, category } = productData;
  const loadingOverlay = document.getElementById('loadingOverlay');
  const btn = document.getElementById('analyzeBtn');
  const btnText = document.getElementById('analyzeBtnText');

  // Show loading
  showLoadingOverlay();
  resetProgressSteps();
  animateProgress();

  try {
    updateStepText('step1', '⏳ Scraping product page...');
    updateStepText('step2', '⏳ Collecting reviews...');

    // Call the real backend API
    const response = await API.products.analyze(url, retailer, name, category);

    if (!response || !response.success) {
      throw new Error(response?.error || 'Analysis failed');
    }

    // Already analyzed
    if (response.message && response.message.includes('already analyzed')) {
      updateStepText('step4', '✓ Already analyzed');
      completeProgress();
      const pid = response.productId || (response.product && response.product.id);
      if (pid) {
        saveToRecentProducts({
          id: pid,
          name: (response.product && response.product.name) || name || 'Analyzed Product',
          url: url,
          retailer: (response.product && response.product.retailer) || retailer,
          category: (response.product && response.product.category) || category,
          analyzedAt: new Date().toISOString()
        });
        showNotification('Product already analyzed! Redirecting...', 'success');
        setTimeout(() => { window.location.href = `analysis.html?id=${pid}`; }, 1000);
      }
      return;
    }

    const productId = response.productId;
    if (!productId) {
      throw new Error('No product ID returned from analysis');
    }

    updateStepText('step2', '✓ Reviews collected');
    updateStepText('step3', '⏳ Analyzing sentiment...');

    // Poll for completed analysis
    const completed = await pollForProduct(productId, url);
    if (!completed) {
      throw new Error('Analysis timed out. The backend is still processing — please try again in a moment.');
    }

    updateStepText('step3', '✓ Sentiment analyzed');
    updateStepText('step4', '✓ Insights generated');
    completeProgress();

    // Save to recent
    saveToRecentProducts({
      id: productId,
      name: completed.name || name || 'Analyzed Product',
      url: url,
      retailer: completed.retailer || retailer,
      category: completed.category || category,
      analyzedAt: new Date().toISOString()
    });

    showNotification('Analysis complete! Redirecting...', 'success');
    setTimeout(() => {
      window.location.href = `analysis.html?id=${productId}`;
    }, 1500);

  } catch (error) {
    hideLoadingOverlay();
    showNotification(`Analysis failed: ${error.message}`, 'error');
    console.error('Analysis error:', error);
    resetProgressSteps();
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

// ===== ANALYSIS PROGRESS HELPERS =====

/**
 * Poll /api/products/recent until the product appears
 */
async function pollForProduct(productId, url) {
  const maxPolls = 30;
  const interval = 3000;

  for (let i = 0; i < maxPolls; i++) {
    try {
      const data = await API.products.getRecent(50);
      if (data && data.success && data.products) {
        const found = data.products.find(p => p.product_id === productId || p.id === productId);
        if (found) {
          return found;
        }
      }
    } catch (e) {
      // Ignore polling errors, keep trying
    }
    const dots = '.'.repeat((i % 3) + 1);
    updateStepText('step4', `⏳ Still processing${dots}`);
    await new Promise(r => setTimeout(r, interval));
  }
  return null;
}

/**
 * Update a specific step's text
 */
function updateStepText(stepId, text) {
  const el = document.getElementById(stepId);
  if (el) {
    el.textContent = text;
    if (text.startsWith('✓')) {
      el.classList.add('completed');
    }
  }
}

/**
 * Reset all progress steps
 */
function resetProgressSteps() {
  const steps = [
    { id: 'step1', default: '⏳ Scraping product page...' },
    { id: 'step2', default: '⏳ Collecting reviews...' },
    { id: 'step3', default: '⏳ Analyzing sentiment...' },
    { id: 'step4', default: '⏳ Generating insights...' },
  ];
  steps.forEach(s => {
    const el = document.getElementById(s.id);
    if (el) {
      el.textContent = s.default;
      el.classList.remove('completed');
    }
  });
}

/**
 * Mark all steps as completed
 */
function completeProgress() {
  const steps = ['step1', 'step2', 'step3', 'step4'];
  steps.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = el.textContent.replace('⏳ ', '✓ ');
      el.classList.add('completed');
    }
  });
}

/**
 * Animate progress steps sequentially
 */
function animateProgress() {
  const steps = [
    { id: 'step1', delay: 600 },
    { id: 'step2', delay: 1400 },
    { id: 'step3', delay: 2000 },
    { id: 'step4', delay: 2800 },
  ];

  steps.forEach(({ id, delay }) => {
    setTimeout(() => {
      const el = document.getElementById(id);
      if (el && !el.classList.contains('completed')) {
        el.classList.add('active');
      }
    }, delay);
  });
}
