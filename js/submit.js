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
let analysisInFlight = false;
let elapsedTimer;

async function analyzeProduct({ url, retailer, name, category }) {
  if (analysisInFlight) return;
  analysisInFlight = true;
  const errorBox = document.getElementById('submitError');
  errorBox.hidden = true;
  resetProgressSteps();
  showLoadingOverlay();
  document.getElementById('step1').classList.add('active');
  updateStepText('step1', 'Sending your product for analysis…');
  document.getElementById('step2').classList.add('active');

  try {
    const response = await API.products.analyze(url, retailer, name, category);
    if (!response?.success) throw new Error(response?.error || 'Analysis failed');
    const productId = response.productId || response.product?.product_id || response.product?.id;
    if (!productId) throw new Error('No product ID returned from analysis');

    updateStepText('step1', '✓ Product accepted');
    updateStepText('step2', '✓ Reviews processed');
    document.getElementById('step3').classList.add('active');
    // The current backend returns the completed product. Poll only for async responses.
    const completed = response.product || await pollForProduct(productId);
    if (!completed) throw new Error('Analysis is taking longer than expected. Please try again shortly.');
    completeProgress();

    // Storage failures must not discard an otherwise successful analysis.
    try {
      saveToRecentProducts({ id: productId, name: completed.name || name || 'Analyzed Product',
        url, retailer: completed.retailer || retailer, category: completed.category || category,
        analyzedAt: new Date().toISOString() });
    } catch (error) { console.warn('Recent history unavailable:', error); }
    setTimeout(() => { window.location.href = `analysis.html?id=${encodeURIComponent(productId)}`; }, 500);
  } catch (error) {
    hideLoadingOverlay();
    resetProgressSteps();
    errorBox.textContent = error.message || 'Unable to analyze this product. Please try again.';
    errorBox.hidden = false;
    document.getElementById('productUrl').setAttribute('aria-describedby', 'urlHelp submitError');
    analysisInFlight = false;
  }
}

/**
 * Show loading overlay
 */
function showLoadingOverlay() {
  const overlay = document.getElementById('loadingOverlay');
  overlay.style.display = 'flex';
  overlay.classList.remove('analysis-complete');
  document.dispatchEvent(new Event('studio:loading'));
  const started = Date.now();
  const elapsed = document.getElementById('analysisElapsed');
  elapsed.textContent = '0:00';
  clearInterval(elapsedTimer);
  elapsedTimer = setInterval(() => {
    if (document.hidden) return;
    const seconds = Math.floor((Date.now() - started) / 1000);
    elapsed.textContent = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  }, 1000);
  document.querySelector('main').inert = true;
  document.querySelector('.supaste-navbar-container').inert = true;
  document.querySelector('footer').inert = true;
  overlay.focus();
  document.body.style.overflow = 'hidden';

  // Disable submit button
  const btn = document.getElementById('analyzeBtn');
  btn.disabled = true;
  document.getElementById('analyzeBtnText').style.display = 'none';
  document.getElementById('analyzeBtnLoader').style.display = 'inline';

}

/**
 * Hide loading overlay
 */
function hideLoadingOverlay() {
  const overlay = document.getElementById('loadingOverlay');
  overlay.style.display = 'none';
  clearInterval(elapsedTimer);
  document.dispatchEvent(new Event('studio:loading'));
  document.querySelector('main').inert = false;
  document.querySelector('.supaste-navbar-container').inert = false;
  document.querySelector('footer').inert = false;
  document.body.style.overflow = '';
  document.getElementById('analyzeBtn').focus();

  // Re-enable submit button
  const btn = document.getElementById('analyzeBtn');
  btn.disabled = false;
  document.getElementById('analyzeBtnText').style.display = 'inline-flex';
  document.getElementById('analyzeBtnLoader').style.display = 'none';
}

/**
 * Load recent products from localStorage
 */
function loadRecentProducts() {
  const recent = getRecentProducts();
  const container = document.getElementById('recentProducts');

  if (recent.length === 0) {
    container.innerHTML = '<div class="recent-empty"><span class="empty-mark" aria-hidden="true">↗</span><div><p>Your next discovery starts above.</p><small>Products you analyze will appear here for easy access.</small></div></div>';
    return;
  }

  container.innerHTML = recent.slice(0, 4).map(product => `
    <a href="analysis.html?id=${encodeURIComponent(product.id)}" class="card" style="text-decoration: none; color: inherit; padding: var(--space-4); transition: transform 0.2s;">
      <div style="margin-bottom: var(--space-2);">
        <div class="badge badge-sm" style="margin-bottom: var(--space-3);">${escapeRecentText(product.retailer)}</div>
        <h4 title="${escapeRecentText(product.name)}" style="font-size: 1rem; font-weight: 600; margin: 0; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; word-wrap: break-word; line-height: 1.5; max-height: 3em;">
          ${escapeRecentText(product.name)}
        </h4>
      </div>
      <p class="text-secondary" style="font-size: 0.75rem; margin: 0;">
        ${formatRelativeTime(product.analyzedAt)}
      </p>
    </a>
  `).join('');

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
    const recent = JSON.parse(localStorage.getItem('recentProducts') || '[]');
    return Array.isArray(recent) ? recent.filter(p => p && p.id && p.url) : [];
  } catch {
    return [];
  }
}

/**
 * Reset form
 */
function resetForm() {
  document.getElementById('submitProductForm').reset();
  document.getElementById('submitError').hidden = true;
  document.getElementById('productUrl').setAttribute('aria-describedby', 'urlHelp');
  document.getElementById('productUrl').focus();
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
async function pollForProduct(productId) {
  for (let i = 0; i < 30; i++) {
    try {
      const response = await API.products.getById(productId);
      if (response?.success && response.product) return response.product;
    } catch (error) { /* A queued product may not yet be available. */ }
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
  return null;
}

/**
 * Update a specific step's text
 */
function updateStepText(stepId, text) {
  const el = document.getElementById(stepId);
  if (el) {
    el.textContent = text.replace('⏳ ', '').replace('✓ ', '');
    const status = document.getElementById('analysisLiveStatus');
    if (status) status.textContent = el.textContent;
    if (text.startsWith('✓')) {
      el.classList.remove('active');
      el.classList.add('completed');
    }
  }
}

/**
 * Reset all progress steps
 */
function resetProgressSteps() {
  const steps = [
    { id: 'step1', default: 'Send product for analysis' },
    { id: 'step2', default: 'Process reviews and sentiment' },
    { id: 'step3', default: 'Retrieve completed analysis' },
    { id: 'step4', default: 'Open your report' },
  ];
  steps.forEach(s => {
    const el = document.getElementById(s.id);
    if (el) {
      el.textContent = s.default.replace('⏳ ', '');
      el.classList.remove('completed', 'active');
    }
  });
}

/**
 * Mark all steps as completed
 */
function completeProgress() {
  clearInterval(elapsedTimer);
  updateStepText('step1', '✓ Product accepted');
  updateStepText('step2', '✓ Reviews and sentiment processed');
  updateStepText('step3', '✓ Analysis ready');
  updateStepText('step4', '✓ Opening your report…');
  document.getElementById('loadingOverlay').classList.add('analysis-complete');
}

function escapeRecentText(value) {
  return String(value || '').replace(/[&<>"']/g, char => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[char]));
}
window.addEventListener('pagehide', () => clearInterval(elapsedTimer));
