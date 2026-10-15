// ========================================
// ANALYSIS PAGE JAVASCRIPT
// Handles analysis results page interactions with real NLP data
// ========================================

let currentProductData = null;
let allReviews = [];
let currentFilter = 'all';
let currentSort = 'helpful';
let currentPage = 1;

document.addEventListener('DOMContentLoaded', () => {
  
  // Setup review filter buttons and search
  setupReviewControls();

  // Load product data from backend
  loadProductData();
});

/**
 * Setup review filter buttons, sort, and search
 */
function setupReviewControls() {
  const filterButtons = document.querySelectorAll('[data-filter]');
  const sortSelect = document.getElementById('sortReviews');
  const reviewSearch = document.getElementById('reviewSearch');

  if (filterButtons.length > 0) {
    filterButtons.forEach(button => {
      button.addEventListener('click', () => {
        filterButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        currentFilter = button.getAttribute('data-filter');
        currentPage = 1;
        loadReviews();
      });
    });
  }

  if (sortSelect) {
    sortSelect.addEventListener('change', () => {
      currentSort = sortSelect.value;
      currentPage = 1;
      loadReviews();
    });
  }

  if (reviewSearch) {
    const debouncedSearch = (window.InsightifyUtils && window.InsightifyUtils.debounce)
      ? window.InsightifyUtils.debounce(() => { currentPage = 1; loadReviews(); }, 300)
      : () => { currentPage = 1; loadReviews(); };

    reviewSearch.addEventListener('input', debouncedSearch);
  }
}

/**
 * Load product data from backend API
 */
async function loadProductData() {
  const urlParams = new URLSearchParams(window.location.search);
  let productId = urlParams.get('id');

  // If no product ID is in URL, fetch the latest analyzed product
  if (!productId) {
    try {
      const recent = JSON.parse(localStorage.getItem('recentProducts') || '[]');
      if (recent && recent.length > 0 && recent[0].id) {
        productId = recent[0].id;
      } else if (typeof API !== 'undefined' && API.products && API.products.getAll) {
        const allRes = await API.products.getAll({ limit: 1 });
        if (allRes.success && allRes.products && allRes.products.length > 0) {
          productId = allRes.products[0].id;
        }
      }
      if (productId) {
        window.history.replaceState({}, '', `analysis.html?id=${productId}`);
      }
    } catch (e) {
      console.warn('Could not auto-detect recent product ID:', e);
    }
  }

  if (!productId) {
    console.warn('No product ID found in URL or recent cache');
    showError('No product selected for analysis. Please submit a product URL first.');
    return;
  }

  try {
    if (typeof API === 'undefined' || !API.products) {
      throw new Error('API service layer not loaded');
    }

    const response = await API.products.getById(productId);


    if (response.success && response.product) {
      const product = response.product;
      currentProductData = product;

      // Store real reviews
      allReviews = response.reviews || product.reviews || [];

      // 1. Populate main DOM elements (title, score, badge, specs, takeaways)
      populateProductData(product);
      document.body.classList.remove('report-loading');
      document.body.setAttribute('aria-busy', 'false');

      displayTopics(response.topics || []);
      displayCommonTerms({});
      // 2. Populate topics immediately from product response
      if (response.topics && response.topics.length > 0) {
        displayTopics(response.topics);
      }

      // 3. Populate sample reviews immediately from loaded reviews
      displaySampleReviewsFromReviews(allReviews);

      // 4. Render all reviews in the full reviews tab
      loadReviews();

      // 5. Load detailed sentiment & dynamic word clouds asynchronously
      loadProductAnalysis(productId);
    } else {
      console.error('Failed to load product:', response.error);
      showError('Failed to load product data: ' + (response.error || 'Product not found'));
    }
  } catch (error) {
    console.error('Error loading product:', error);
    showError('An error occurred while loading the product: ' + error.message);
  }
}

/**
 * Populate product data in the page
 */
function populateProductData(product) {
  // 1. Update product image (backend uses image_url, fallback to image)
  const productImage = document.getElementById('productImage') || document.querySelector('.product-image');
  if (productImage && (product.image || product.image_url)) {
    productImage.src = product.image_url || product.image;
    productImage.alt = product.name;
    productImage.onerror = () => { productImage.onerror = null; productImage.src = 'images/logo.png'; productImage.alt = 'Product image unavailable'; };
  }

  // 2. Update product name
  const productName = document.getElementById('productTitle') || document.querySelector('.product-title') || document.querySelector('.product-header h1');
  if (productName) {
    productName.textContent = product.name;
    document.title = `${product.name} - Analysis | Insightify`;
  }

  // 3. Update retailer badge
  const retailerBadge = document.getElementById('productRetailerBadge') || document.querySelector('.retailer-badge');
  if (retailerBadge) {
    const retailerName = product.retailer || 'Amazon';
    retailerBadge.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M21 2H3v2l8 9v5H7v2h10v-2h-4v-5l8-9V2z"/>
      </svg>
      Sold on ${retailerName}
    `;
  }

  // 4. Update original product link
  const productLink = document.getElementById('productLink') || document.querySelector('.product-link');
  if (productLink && product.url) {
    productLink.href = product.url;
    productLink.style.display = 'inline-block';
  }

  // 5. Update insight score (backend uses insight_score, fallback to insightScore)
  const insightScoreEl = document.getElementById('insightScore');
  if (insightScoreEl) {
    const rawScore = product.insight_score ?? product.insightScore;
    if (rawScore != null && Number.isFinite(Number(rawScore))) {
      animateScoreValue(insightScoreEl, Math.max(0, Math.min(100, Math.round(Number(rawScore)))));
    } else insightScoreEl.textContent = '—';
  }

  // 6. Update score description / review count
  const scoreDesc = document.querySelector('.score-description');
  if (scoreDesc) {
    const count = product.total_reviews || product.totalReviews || allReviews.length || 0;
    scoreDesc.textContent = `Based on ${count.toLocaleString()} customer reviews`;
  }

  // 6b. Show which engine produced the analysis (RoBERTa + BART Neural Architecture)
  const engineBadge = document.getElementById('engineBadge');
  if (engineBadge) {
    const source = String(product.analysisSource || product.analysis_source || '').toLowerCase();
    const isTransformer = !source.includes('heuristic') && !source.includes('fallback') && source !== 'local';
    engineBadge.hidden = false;
    engineBadge.dataset.engine = isTransformer ? 'transformer' : 'local';
    engineBadge.title = isTransformer
      ? 'Fine-tuned RoBERTa-Large for Sentiment Polarity & BART-Base for Multi-Aspect Extraction and Abstractive Summarization'
      : 'RoBERTa-Lite Heuristic Sentiment Engine';
    const label = document.getElementById('engineLabel');
    if (label) label.textContent = isTransformer ? 'RoBERTa-Large + BART NLP' : 'RoBERTa-Lite Local NLP';
  }

  // 7. Update sentiment chart & legend
  updateSentimentDisplay(product.sentiment || {}, product.total_reviews || product.totalReviews || allReviews.length);

  // 7b. Category badge if available
  const catBadge = document.getElementById('detectedCategoryBadge');
  if (catBadge && product.category) {
    catBadge.textContent = product.category;
    catBadge.style.display = 'inline-block';
  }

  // 8. Render domain-specific aspect dimension evaluation
  renderAspectDimensions(product.specsData || product.specs_data, product.specs);

  // 8b. Render purchase decision guide (BART Recommendation)
  renderBuyerGuide(product.buyerGuide || product.buyer_guide, product);

  // 9. Update takeaways: What People Love (Strengths)
  const strengthsEl = document.getElementById('positiveTakeawaysList') ||
                      document.querySelector('.positive-takeaway .takeaway-list') ||
                      document.querySelector('.strengths-list');
  if (strengthsEl) {
    let strengths = product.strengths;
    // Parse from JSON string if stored as JSON
    if (typeof strengths === 'string') {
      try { strengths = JSON.parse(strengths); } catch(e) { strengths = null; }
    }
    if (strengths && Array.isArray(strengths) && strengths.length > 0) {
      strengthsEl.innerHTML = strengths.map(s => `
        <li>
          <strong>${escapeHtml(s)}</strong>
        </li>
      `).join('');
    } else {
      strengthsEl.innerHTML = '<li>No recurring strengths available in this report.</li>';
    }
  }

  // 10. Update takeaways: What People Complain About (Weaknesses)
  const weaknessesEl = document.getElementById('negativeTakeawaysList') ||
                      document.querySelector('.negative-takeaway .takeaway-list') ||
                      document.querySelector('.weaknesses-list');
  if (weaknessesEl) {
    let weaknesses = product.weaknesses;
    // Parse from JSON string if stored as JSON
    if (typeof weaknesses === 'string') {
      try { weaknesses = JSON.parse(weaknesses); } catch(e) { weaknesses = null; }
    }
    if (weaknesses && Array.isArray(weaknesses) && weaknesses.length > 0) {
      weaknessesEl.innerHTML = weaknesses.map(w => `
        <li>
          <strong>${escapeHtml(w)}</strong>
        </li>
      `).join('');
    } else {
      weaknessesEl.innerHTML = '<li>No recurring concerns available in this report.</li>';
    }
  }

  // 11. Update AI summary if element exists
  const summaryElement = document.querySelector('.ai-summary-text');
  if (summaryElement) summaryElement.textContent = product.ai_summary || product.aiSummary || 'A review summary is not available for this product yet.';
}

/**
 * Animate score counter
 */
function animateScoreValue(element, targetScore) {
  // Show the actual score immediately; animate its entrance rather than counting
  // through values that are not the product's result.
  element.textContent = targetScore;
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches && element.animate) {
    element.animate([{opacity: 0, transform: 'translateY(8px)'}, {opacity: 1, transform: 'translateY(0)'}],
      {duration: 400, easing: 'cubic-bezier(.2,.8,.2,1)'});
  }
}

/**
 * Update sentiment chart and legend
 */
function updateSentimentDisplay(sentiment, totalCount) {
  const pos = parseFloat(sentiment.positive) || 0;
  const neu = parseFloat(sentiment.neutral) || 0;
  const neg = parseFloat(sentiment.negative) || 0;

  window.insightifyChartData = { sentiment: { positive: pos, negative: neg, neutral: neu }, totalCount, reviews: allReviews };
  window.dispatchEvent(new Event('insightify:chart-data'));
  const fallback = document.getElementById('sentimentChartFallback');
  if (fallback) {
    fallback.textContent = `Positive ${pos.toFixed(1)}% · Negative ${neg.toFixed(1)}% · Neutral ${neu.toFixed(1)}%`;
    // Keep an accessible data fallback if the component bundle could not load.
    fallback.hidden = Boolean(document.querySelector('#sentimentChartRoot svg'));
  }
}

/**
 * Render Category-Specific Aspect Dimensions Evaluation
 */
function renderAspectDimensions(specsData, fallbackSpecs) {
  const grid = document.getElementById('specsGrid');
  if (!grid) return;

  grid.innerHTML = '<p class="text-secondary">Aspect scores are not available for this product yet.</p>';

  // If dynamic category-specific aspects are available
  if (Array.isArray(specsData) && specsData.length > 0) {
    grid.innerHTML = specsData.map(aspect => {
      const score = Math.max(0, Math.min(100, Math.round(Number(aspect.score) || 0)));
      let color = 'var(--color-primary)';
      if (score >= 80) {
        color = 'var(--color-positive)';
      } else if (score >= 65) {
        color = 'var(--color-primary)';
      } else if (score >= 50) {
        color = 'var(--color-neutral)';
      } else {
        color = 'var(--color-negative)';
      }

      return `
        <div class="spec-item-card liquid-glass-card" style=" border: 1px solid var(--color-border); border-radius: 14px; padding: 14px 16px; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
          <div>
            <div class="spec-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <span class="spec-label" style="font-weight: 600; font-size: 0.9rem; color: var(--color-text-primary); letter-spacing: -0.01em;">
                <span style="font-size: 1.1rem; margin-right: 5px;">${aspect.icon || '✨'}</span> ${escapeHtml(aspect.name)}
              </span>
              <span class="spec-val" style="font-weight: 600; font-size: 0.9rem; color: ${color}; letter-spacing: -0.01em;">${score}/100</span>
            </div>
            <div class="spec-bar" style="height: 6px; background: rgba(0, 0, 0, 0.05); border-radius: 9999px; overflow: hidden; margin-bottom: 8px;">
              <div class="spec-fill" style="width: ${score}%; height: 100%; background: ${color}; border-radius: 9999px; transition: width 0.8s var(--ease-apple);"></div>
            </div>
          </div>
          ${aspect.summary ? `<div class="spec-summary" style="font-size: 0.82rem; color: var(--color-text-secondary); line-height: 1.4; margin-top: 4px;">${escapeHtml(aspect.summary)}</div>` : ''}
        </div>
      `;
    }).join('');
    return;
  }

  // Fallback to standard 5 specs if dynamic aspects not present
  if (fallbackSpecs) {
    const defaultSpecs = [
      { name: 'Quality & Build', icon: '✨', score: Math.round(fallbackSpecs.quality || 75), gradient: '#6366f1, #4f46e5', color: '#4f46e5', summary: 'Overall construction, materials, and finish satisfaction.' },
      { name: 'Value for Money', icon: '💰', score: Math.round(fallbackSpecs.value || 75), gradient: '#10b981, #059669', color: '#059669', summary: 'Price to performance perception among verified buyers.' },
      { name: 'Durability', icon: '🛡️', score: Math.round(fallbackSpecs.durability || 70), gradient: '#f59e0b, #d97706', color: '#d97706', summary: 'Long-term wear resistance and structural reliability.' },
      { name: 'Features', icon: '⚙️', score: Math.round(fallbackSpecs.features || 80), gradient: '#1d4ed8, #2563eb', color: '#1d4ed8', summary: 'Availability and execution of key promised capabilities.' },
      { name: 'Satisfaction', icon: '⭐', score: Math.round(fallbackSpecs.performance || 78), gradient: '#8b5cf6, #7c3aed', color: '#7c3aed', summary: 'Overall user endorsement and repeat-purchase confidence.' },
    ];
    grid.innerHTML = defaultSpecs.map(s => `
      <div class="spec-item-card" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          <div class="spec-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span class="spec-label" style="font-weight: 600; font-size: 0.9rem; color: var(--color-text);">
              <span style="font-size: 1.1rem; margin-right: 4px;">${s.icon}</span> ${escapeHtml(s.name)}
            </span>
            <span class="spec-val" style="font-weight: 700; font-size: 0.9rem; color: ${s.color};">${s.score}/100</span>
          </div>
          <div class="spec-bar" style="height: 7px; background: #e2e8f0; border-radius: 999px; overflow: hidden; margin-bottom: 6px;">
            <div class="spec-fill" style="width: ${s.score}%; height: 100%; background: linear-gradient(90deg, ${s.gradient}); border-radius: 999px; transition: width 1s ease-in-out;"></div>
          </div>
        </div>
        <div class="spec-summary" style="font-size: 0.8rem; color: var(--color-text-secondary); line-height: 1.35; margin-top: 4px;">${escapeHtml(s.summary)}</div>
      </div>
    `).join('');
  }
}

/**
 * Render Purchase Decision Guide (BART Recommendation)
 */
function renderBuyerGuide(buyerGuide, productFallback) {
  const bestForList = document.getElementById('bestForList');
  const avoidIfList = document.getElementById('avoidIfList');
  const verdictText = document.getElementById('verdictText');
  const fitRow = document.getElementById('fitFeedbackRow');
  const fitText = document.getElementById('fitFeedbackText');

  if (bestForList) bestForList.innerHTML = '<li>No specific buyer profile available.</li>';
  if (avoidIfList) avoidIfList.innerHTML = '<li>No specific limitations available.</li>';
  if (verdictText) verdictText.textContent = 'Read the strengths and concerns above to weigh the trade-offs for your needs.';

  if (buyerGuide) {
    if (bestForList && Array.isArray(buyerGuide.best_for) && buyerGuide.best_for.length > 0) {
      bestForList.innerHTML = buyerGuide.best_for.map(item => `<li>${escapeHtml(item)}</li>`).join('');
    }
    if (avoidIfList && Array.isArray(buyerGuide.avoid_if) && buyerGuide.avoid_if.length > 0) {
      avoidIfList.innerHTML = buyerGuide.avoid_if.map(item => `<li>${escapeHtml(item)}</li>`).join('');
    }
    if (verdictText && buyerGuide.verdict) {
      verdictText.textContent = buyerGuide.verdict;
    }
    if (fitRow && fitText) {
      if (buyerGuide.fit_feedback) {
        fitText.textContent = buyerGuide.fit_feedback;
        fitRow.style.display = 'block';
      } else {
        fitRow.style.display = 'none';
      }
    }
  } else if (productFallback) {
    // Generate intelligent default from strengths & weaknesses
    let strengths = productFallback.strengths;
    if (typeof strengths === 'string') {
      try { strengths = JSON.parse(strengths); } catch(e) { strengths = []; }
    }
    let weaknesses = productFallback.weaknesses;
    if (typeof weaknesses === 'string') {
      try { weaknesses = JSON.parse(weaknesses); } catch(e) { weaknesses = []; }
    }

    if (bestForList && Array.isArray(strengths) && strengths.length > 0) {
      bestForList.innerHTML = strengths.slice(0, 3).map(s => `<li>${escapeHtml(s)}</li>`).join('');
    }
    if (avoidIfList) {
      if (Array.isArray(weaknesses) && weaknesses.length > 0) {
        avoidIfList.innerHTML = weaknesses.slice(0, 2).map(w => `<li>${escapeHtml(w)}</li>`).join('');
      } else {
        avoidIfList.innerHTML = '<li>No specific limitations available.</li>';
      }
    }

  }
}

/**
 * Load detailed product analysis from backend (word clouds)
 */
async function loadProductAnalysis(productId) {
  try {
    if (!API.analysis || !API.analysis.getById) return;

    const response = await API.analysis.getById(productId);
    if (response.success && response.analysis) {
      const analysis = response.analysis;

      // Update topics if not already rendered
      if (analysis.topics && analysis.topics.length > 0) {
        displayTopics(analysis.topics);
      }

      // Update sample reviews if provided in analysis
      if (analysis.reviews && analysis.reviews.samples) {
        displaySampleReviews(analysis.reviews.samples);
      }

      // Update dynamic aspects
      if (analysis.specs_data || (analysis.product && analysis.product.specsData)) {
        renderAspectDimensions(analysis.specs_data || analysis.product.specsData, analysis.specs);
      }

      // Update buyer decision guide
      if (analysis.buyer_guide || (analysis.product && analysis.product.buyerGuide)) {
        renderBuyerGuide(analysis.buyer_guide || analysis.product.buyerGuide, analysis.product);
      }

      // Update common terms / word cloud
      if (analysis.common_terms) {
        displayCommonTerms(analysis.common_terms);
      }
    }
  } catch (error) {
    console.error('Error loading detailed analysis:', error);
  }
}

/**
 * Display word clouds
 */
function displayCommonTerms(commonTerms) {
  const positiveCloud = document.getElementById('positiveWordCloud');
  if (positiveCloud) {
    if (commonTerms.positive_terms && commonTerms.positive_terms.length > 0) {
      positiveCloud.innerHTML = commonTerms.positive_terms.map((term, index) => {
        const fontSize = Math.max(1.1, 2.0 - (index * 0.15));
        return `<span class="cloud-word" style="font-size: ${fontSize.toFixed(2)}rem; color: var(--color-positive); margin: 4px 8px; display: inline-block;">${escapeHtml(term)}</span>`;
      }).join('\n');
    } else {
      positiveCloud.innerHTML = '<p class="text-secondary" style="text-align: center;">No recurring positive terms</p>';
    }
  }

  const negativeCloud = document.getElementById('negativeWordCloud');
  if (negativeCloud) {
    if (commonTerms.negative_terms && commonTerms.negative_terms.length > 0) {
      negativeCloud.innerHTML = commonTerms.negative_terms.map((term, index) => {
        const fontSize = Math.max(1.1, 1.9 - (index * 0.15));
        return `<span class="cloud-word" style="font-size: ${fontSize.toFixed(2)}rem; color: var(--color-negative); margin: 4px 8px; display: inline-block;">${escapeHtml(term)}</span>`;
      }).join('\n');
    } else {
      negativeCloud.innerHTML = '<p class="text-secondary" style="text-align: center;">✓ No recurring negative complaint terms</p>';
    }
  }
}

/**
 * Display topics
 */
function displayTopics(topics) {
  const topicsList = document.getElementById('topicList') || document.querySelector('.topic-list') || document.querySelector('.topics-list');
  if (!topicsList) return;

  if (!topics || topics.length === 0) {
    topicsList.innerHTML = '<p class="text-secondary text-center" style="padding: var(--space-6);">No distinct feature topics extracted from reviews yet.</p>';
    return;
  }

  topicsList.innerHTML = topics.map(topic => {
    const sentimentClass = topic.sentiment || 'positive';
    const scorePct = Math.min(100, Math.max(15, Math.round((topic.score || 0.8) * 100)));
    const count = topic.count || topic.mention_count || 1;
    return `
      <div class="card topic-item" style="margin-bottom: var(--space-4); border-left: 3px solid var(--color-${sentimentClass});">
        <div class="topic-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-2);">
          <h4 style="margin: 0; font-size: 1.05rem;">🏷️ ${escapeHtml(topic.name)}</h4>
          <span class="badge badge-${sentimentClass}" style="text-transform: uppercase; font-size: 0.72rem; padding: 2px 8px;">${sentimentClass}</span>
        </div>
        <div class="topic-bar" style="background: var(--color-gray-100); height: 8px; border-radius: 4px; overflow: hidden;">
          <div class="topic-bar-fill ${sentimentClass}" style="width: ${scorePct}%; height: 100%; background: var(--color-${sentimentClass});"></div>
        </div>
        <div class="topic-stats" style="margin-top: var(--space-2); font-size: 0.85rem; color: var(--color-text-secondary); display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
          <span>💬 Mentioned in ${count} reviews</span>
          ${topic.summary ? `<span style="color: var(--color-text); font-style: italic;">"${escapeHtml(topic.summary)}"</span>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Immediately display sample reviews from the loaded reviews list
 */
function displaySampleReviewsFromReviews(reviews) {
  if (!reviews || reviews.length === 0) return;

  const posReviews = reviews
    .filter(r => (r.sentiment || '').toLowerCase() === 'positive')
    .sort((a, b) => (b.rating || 5) - (a.rating || 5) || (b.sentiment_score || 0) - (a.sentiment_score || 0))
    .slice(0, 3);

  const negReviews = reviews
    .filter(r => (r.sentiment || '').toLowerCase() === 'negative' || (r.rating && r.rating <= 2))
    .sort((a, b) => (a.rating || 1) - (b.rating || 1) || (a.sentiment_score || 0) - (b.sentiment_score || 0))
    .slice(0, 3);

  displaySampleReviews({
    positive: posReviews,
    negative: negReviews
  });
}

/**
 * Display sample reviews in the sentiment deep dive columns
 */
function displaySampleReviews(samples) {
  if (!samples) return;

  // Target positive column
  const posTarget = document.getElementById('samplePositiveReviews') || document.querySelector('.positive-review-column');
  if (posTarget) {
    if (samples.positive && samples.positive.length > 0) {
      posTarget.innerHTML = samples.positive.map(r => formatReviewCard(r)).join('');
    } else {
      posTarget.innerHTML = '<p class="text-secondary" style="padding: var(--space-4); text-align: center;">No positive reviews reported.</p>';
    }
  }

  // Target negative column
  const negTarget = document.getElementById('sampleNegativeReviews') || document.querySelector('.negative-review-column');
  if (negTarget) {
    if (samples.negative && samples.negative.length > 0) {
      negTarget.innerHTML = samples.negative.map(r => formatReviewCard(r)).join('');
    } else {
      negTarget.innerHTML = '<p class="text-secondary" style="padding: var(--space-4); text-align: center;">✓ No negative reviews found among verified buyers.</p>';
    }
  }
}

/**
 * Format single review card HTML
 */
function formatReviewCard(review) {
  const ratingStars = '⭐'.repeat(Math.max(1, Math.min(5, Math.round(review.rating || 4))));
  const author = escapeHtml(review.author || 'Verified Buyer');
  const text = escapeHtml(review.text || '');
  const helpful = review.helpful || review.helpful_count || 0;
  const sentiment = (review.sentiment || 'neutral').toLowerCase();
  const sentimentBadgeClass = sentiment === 'positive' ? 'badge-positive' : (sentiment === 'negative' ? 'badge-negative' : 'badge-neutral');
  const scoreNum = review.sentiment_score !== undefined ? Number(review.sentiment_score) : (sentiment === 'positive' ? 0.85 : (sentiment === 'negative' ? -0.8 : 0.0));
  const scoreText = (scoreNum > 0 ? '+' : '') + scoreNum.toFixed(2);
  const icon = sentiment === 'positive' ? '✓' : (sentiment === 'negative' ? '⚠' : '●');

  return `
    <div class="card review-item" style="margin-bottom: var(--space-4);">
      <div class="review-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-2);">
        <span class="review-author" style="font-weight: 600;">${author}</span>
        <div style="display: flex; align-items: center; gap: 8px;">
          <span class="badge ${sentimentBadgeClass}" style="font-size: 0.72rem; padding: 2px 8px; text-transform: uppercase; font-weight: 600;">
            ${icon} ${escapeHtml(sentiment)} (${scoreText})
          </span>
          <span class="review-date" style="font-size: 0.85rem; color: var(--color-text-secondary);">${review.verified ? '✓ Verified' : ''}</span>
        </div>
      </div>
      <div class="review-rating" style="margin-bottom: var(--space-2);">${ratingStars}</div>
      <p class="review-text" style="font-size: 0.95rem; line-height: 1.5; color: var(--color-text);">"${text}"</p>
      <div class="review-footer" style="margin-top: var(--space-3); font-size: 0.85rem; color: var(--color-text-secondary);">
        <span class="helpful-count">👍 ${helpful} found helpful</span>
      </div>
    </div>
  `;
}

/**
 * Render all reviews in the All Reviews tab with filter/search/sort
 */
function loadReviews() {
  const reviewsList = document.getElementById('reviewsList');
  if (!reviewsList) return;

  let filtered = [...allReviews];

  // 1. Filter by sentiment
  if (currentFilter !== 'all') {
    filtered = filtered.filter(r => (r.sentiment || '').toLowerCase() === currentFilter.toLowerCase());
  }

  // 2. Filter by search term
  const searchInput = document.getElementById('reviewSearch');
  const query = searchInput ? searchInput.value.trim().toLowerCase() : '';
  if (query) {
    filtered = filtered.filter(r =>
      (r.text && r.text.toLowerCase().includes(query)) ||
      (r.author && r.author.toLowerCase().includes(query))
    );
  }

  // 3. Sort
  filtered.sort((a, b) => {
    switch (currentSort) {
      case 'helpful':
        return (b.helpful || 0) - (a.helpful || 0);
      case 'rating-high':
        return (b.rating || 0) - (a.rating || 0);
      case 'rating-low':
        return (a.rating || 0) - (b.rating || 0);
      case 'recent':
      default:
        return new Date(b.date || 0) - new Date(a.date || 0);
    }
  });

  const pageSize = 12;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  currentPage = Math.max(1, Math.min(currentPage, pageCount));
  const previous = document.getElementById('reviewsPrevious');
  const next = document.getElementById('reviewsNext');
  if (previous) { previous.disabled = currentPage === 1; previous.onclick = () => { currentPage--; loadReviews(); }; }
  if (next) { next.disabled = currentPage === pageCount; next.onclick = () => { currentPage++; loadReviews(); }; }
  const pagination = document.querySelector('.pagination-info');
  if (pagination) pagination.textContent = filtered.length ? `Page ${currentPage} of ${pageCount} · ${filtered.length} reviews` : 'No matching reviews';
  filtered = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  // 4. Render
  if (filtered.length === 0) {
    reviewsList.innerHTML = `
      <p class="text-center text-secondary" style="padding: var(--space-8);">
        No customer reviews match your criteria.
      </p>
    `;
  } else {
    reviewsList.innerHTML = filtered.map(r => {
      const sentiment = (r.sentiment || 'neutral').toLowerCase();
      const sentimentBadgeClass = sentiment === 'positive' ? 'badge-positive' : (sentiment === 'negative' ? 'badge-negative' : 'badge-neutral');
      const scoreNum = r.sentiment_score !== undefined ? Number(r.sentiment_score) : (sentiment === 'positive' ? 0.85 : (sentiment === 'negative' ? -0.8 : 0.0));
      const scoreText = (scoreNum > 0 ? '+' : '') + scoreNum.toFixed(2);
      const icon = sentiment === 'positive' ? '✓' : (sentiment === 'negative' ? '⚠' : '●');

      return `
        <div class="card review-item" style="margin-bottom: var(--space-4);">
          <div class="review-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-2);">
            <span class="review-author" style="font-weight: 600;">${escapeHtml(r.author || 'Customer')}</span>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="badge ${sentimentBadgeClass}" style="font-size: 0.72rem; padding: 2px 8px; text-transform: uppercase; font-weight: 600;">
                ${icon} ${escapeHtml(sentiment)} (${scoreText})
              </span>
              <span class="review-date" style="font-size: 0.85rem; color: var(--color-text-secondary);">
                ${r.verified ? '✓ Verified Purchase' : ''}
              </span>
            </div>
          </div>
          <div class="review-rating" style="margin-bottom: var(--space-2);">
            ${'⭐'.repeat(Math.max(1, Math.min(5, Math.round(r.rating || 5))))}
          </div>
          <p class="review-text" style="font-size: 0.95rem; line-height: 1.5;">${escapeHtml(r.text || '')}</p>
          <div class="review-footer" style="display: flex; justify-content: space-between; align-items: center; margin-top: var(--space-3);">
            <span class="helpful-count" style="font-size: 0.85rem; color: var(--color-text-secondary);">👍 ${r.helpful || 0} found helpful</span>
            <button class="btn btn-sm btn-outline" onclick="markHelpful(${r.id})">Helpful</button>
          </div>
        </div>
      `;
    }).join('');
  }
}

/**
 * Mark review as helpful
 */
window.markHelpful = function(reviewId) {
  const item = allReviews.find(r => r.id === reviewId);
  if (item) {
    item.helpful = (item.helpful || 0) + 1;
    loadReviews();
  }
  if (window.InsightifyUtils && window.InsightifyUtils.showNotification) {
    window.InsightifyUtils.showNotification('Marked as helpful!', 'success');
  }
};

function showError(message) {
  document.body.classList.remove('report-loading');
  document.body.setAttribute('aria-busy', 'false');
  document.body.classList.add('report-unavailable');
  const header = document.querySelector('.product-header-content');
  if (header) header.hidden = true;
  const main = document.querySelector('main') || document.querySelector('.product-header');
  if (main) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'container report-error';
    errorDiv.setAttribute('role', 'alert');

    errorDiv.innerHTML = `
      <span class="studio-eyebrow">PRODUCT REPORT</span><h2>Let’s start with a product.</h2>
      <p>${escapeHtml(message)}</p>
      <a href="submit.html" class="btn btn-primary" style="margin-top: 1rem; display: inline-block;">Analyze Another Product</a>
    `;
    main.parentElement.insertBefore(errorDiv, main);
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
