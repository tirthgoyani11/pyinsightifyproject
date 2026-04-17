// ========================================
// ANALYSIS PAGE JAVASCRIPT
// Handles analysis results page interactions
// ========================================

let sentimentChart = null;
let currentProductData = null;  // Store loaded product data

document.addEventListener('DOMContentLoaded', () => {
  
  // ===== INITIALIZE CHARTS =====
  initializeSentimentChart();
  
  // ===== LOAD PRODUCT DATA FROM BACKEND =====
  loadProductData();
  
  // ===== MOCK DATA (for fallback) =====
  const mockReviews = [
    {
      id: 1,
      author: 'Sarah M.',
      date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      rating: 5,
      sentiment: 'positive',
      text: 'Absolutely love this phone! The battery lasts me two full days with moderate use. The display is stunning and the camera takes incredible photos in daylight.',
      helpful: 124
    },
    {
      id: 2,
      author: 'Mike T.',
      date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      rating: 2,
      sentiment: 'negative',
      text: 'Disappointed with the camera performance in low light. Photos come out grainy and lack detail. Expected better at this price point.',
      helpful: 43
    },
    {
      id: 3,
      author: 'James K.',
      date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      rating: 5,
      sentiment: 'positive',
      text: 'Best Android phone I\'ve owned. Fast, smooth, and the build quality feels premium. Worth every penny.',
      helpful: 89
    },
    {
      id: 4,
      author: 'Lisa P.',
      date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      rating: 2,
      sentiment: 'negative',
      text: 'Too much pre-installed bloatware that I can\'t remove. Also, no headphone jack is a deal breaker for me.',
      helpful: 38
    },
    {
      id: 5,
      author: 'Emily R.',
      date: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000),
      rating: 4,
      sentiment: 'positive',
      text: 'Great phone overall. The screen is beautiful and it handles multitasking like a champ. Only minor gripe is it gets a bit warm during intensive tasks.',
      helpful: 67
    },
    {
      id: 6,
      author: 'David L.',
      date: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000),
      rating: 3,
      sentiment: 'neutral',
      text: 'It\'s okay but overpriced. There are cheaper alternatives that offer similar features. Build quality is good though.',
      helpful: 29
    }
  ];
  
  // ===== REVIEW FILTERING =====
  let currentFilter = 'all';
  let currentSort = 'helpful';
  let currentPage = 1;
  const reviewsPerPage = 50;
  
  const filterButtons = document.querySelectorAll('[data-filter]');
  const sortSelect = document.getElementById('sortReviews');
  const reviewSearch = document.getElementById('reviewSearch');
  const reviewsList = document.getElementById('reviewsList');
  
  // Filter button click handlers
  if (filterButtons.length > 0) {
    filterButtons.forEach(button => {
      button.addEventListener('click', () => {
        // Update active state
        filterButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        
        // Update filter and reload reviews
        currentFilter = button.getAttribute('data-filter');
        currentPage = 1;
        loadReviews();
      });
    });
  }
  
  // Sort select handler
  if (sortSelect) {
    sortSelect.addEventListener('change', () => {
      currentSort = sortSelect.value;
      currentPage = 1;
      loadReviews();
    });
  }
  
  // Search handler with debounce
  if (reviewSearch) {
    const debouncedSearch = window.InsightifyUtils.debounce(() => {
      currentPage = 1;
      loadReviews();
    }, 300);
    
    reviewSearch.addEventListener('input', debouncedSearch);
  }
  
  // Load and display reviews
  function loadReviews() {
    if (!reviewsList) return;
    
    let filteredReviews = [...mockReviews];
    
    // Apply sentiment filter
    if (currentFilter !== 'all') {
      filteredReviews = filteredReviews.filter(review => review.sentiment === currentFilter);
    }
    
    // Apply search filter
    const searchTerm = reviewSearch ? reviewSearch.value.toLowerCase() : '';
    if (searchTerm) {
      filteredReviews = filteredReviews.filter(review =>
        review.text.toLowerCase().includes(searchTerm) ||
        review.author.toLowerCase().includes(searchTerm)
      );
    }
    
    // Apply sorting
    filteredReviews.sort((a, b) => {
      switch (currentSort) {
        case 'helpful':
          return b.helpful - a.helpful;
        case 'recent':
          return b.date - a.date;
        case 'rating-high':
          return b.rating - a.rating;
        case 'rating-low':
          return a.rating - b.rating;
        default:
          return 0;
      }
    });
    
    // Render reviews
    if (filteredReviews.length === 0) {
      reviewsList.innerHTML = `
        <p class="text-center text-secondary" style="padding: var(--space-8);">
          No reviews found matching your criteria.
        </p>
      `;
    } else {
      reviewsList.innerHTML = filteredReviews.map(review => `
        <div class="review-item">
          <div class="review-header">
            <span class="review-author">${review.author}</span>
            <span class="review-date">${window.InsightifyUtils.formatRelativeTime(review.date)}</span>
          </div>
          <div class="review-rating">${'⭐'.repeat(review.rating)}</div>
          <p class="review-text">${review.text}</p>
          <div class="review-footer">
            <span class="helpful-count">👍 ${review.helpful} found helpful</span>
            <button class="btn btn-sm" onclick="markHelpful(${review.id})">Helpful</button>
          </div>
        </div>
      `).join('');
    }
  }
  
  // Initial load
  if (reviewsList) {
    loadReviews();
  }
  
  // ===== SCORE ANIMATION =====
  const scoreValue = document.getElementById('insightScore');
  if (scoreValue) {
    const targetScore = parseInt(scoreValue.textContent);
    let currentScore = 0;
    const duration = 2000; // 2 seconds
    const increment = targetScore / (duration / 16); // 60fps
    
    const animateScore = () => {
      currentScore += increment;
      if (currentScore < targetScore) {
        scoreValue.textContent = Math.floor(currentScore);
        requestAnimationFrame(animateScore);
      } else {
        scoreValue.textContent = targetScore;
      }
    };
    
    // Trigger animation when score comes into view
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateScore();
          observer.unobserve(entry.target);
        }
      });
    });
    
    observer.observe(scoreValue);
  }
  
  // ===== SENTIMENT BAR ANIMATION =====
  const sentimentBar = document.querySelector('.sentiment-bar');
  if (sentimentBar) {
    const segments = sentimentBar.querySelectorAll('.sentiment-segment');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          segments.forEach((segment, index) => {
            setTimeout(() => {
              segment.style.opacity = '0';
              segment.style.transform = 'scaleX(0)';
              segment.style.transformOrigin = 'left';
              segment.style.transition = 'all 0.5s ease-out';
              
              setTimeout(() => {
                segment.style.opacity = '1';
                segment.style.transform = 'scaleX(1)';
              }, 50);
            }, index * 100);
          });
          observer.unobserve(entry.target);
        }
      });
    });
    
    observer.observe(sentimentBar);
  }
  
  // ===== TOPIC BARS ANIMATION =====
  const topicBars = document.querySelectorAll('.topic-bar-fill');
  if (topicBars.length > 0) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const bar = entry.target;
          const width = bar.style.width;
          bar.style.width = '0';
          setTimeout(() => {
            bar.style.width = width;
          }, 100);
          observer.unobserve(bar);
        }
      });
    });
    
    topicBars.forEach(bar => observer.observe(bar));
  }
  
});

// ===== MARK REVIEW AS HELPFUL =====
function markHelpful(reviewId) {
  window.InsightifyUtils.showNotification('Thank you for your feedback!', 'success');
  window.InsightifyUtils.trackEvent('Review', 'Mark Helpful', reviewId.toString());
}

// ===== SHARE ANALYSIS =====
function shareAnalysis() {
  if (navigator.share) {
    navigator.share({
      title: 'Product Analysis - Insightify',
      text: 'Check out this product analysis on Insightify',
      url: window.location.href
    }).catch(() => {
      // User cancelled or error occurred
    });
  } else {
    // Fallback: copy to clipboard
    navigator.clipboard.writeText(window.location.href).then(() => {
      window.InsightifyUtils.showNotification('Link copied to clipboard!', 'success');
    });
  }
}

// Export functions
window.markHelpful = markHelpful;
window.shareAnalysis = shareAnalysis;

// ===== LOAD PRODUCT DATA FROM BACKEND =====

/**
 * Load product data from backend
 */
async function loadProductData() {
  // Get product ID from URL parameter
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get('id');
  
  if (!productId) {
    console.warn('No product ID found in URL');
    return;
  }
  
  try {
    // Fetch product data from backend
    const response = await API.products.getById(productId);
    
    console.log('Backend response:', response);
    
    if (response.success && response.product) {
      const product = response.product;
      currentProductData = product;
      populateProductData(product);
      
      // Load detailed analysis
      loadProductAnalysis(productId);
    } else {
      console.error('Failed to load product:', response.error);
      showError('Failed to load product data. Error: ' + (response.error || 'Unknown error'));
    }
  } catch (error) {
    console.error('Error loading product:', error);
    showError('An error occurred while loading the product: ' + error.message);
  }
}

/**
 * Load detailed product analysis
 */
async function loadProductAnalysis(productId) {
  try {
    // Safety check - ensure API.analysis exists
    if (!API.analysis || !API.analysis.getById) {
      console.error('❌ API.analysis module not found! Make sure api.js is loaded.');
      console.log('Available API modules:', Object.keys(API));
      return;
    }
    
    const response = await API.analysis.getById(productId);
    
    console.log('📊 Analysis API Response:', response);
    
    if (response.success && response.analysis) {
      const analysis = response.analysis;
      
      console.log('📊 Analysis data:', analysis);
      console.log('🔑 Common terms:', analysis.common_terms);
      
      // Update topics
      if (analysis.topics && analysis.topics.length > 0) {
        displayTopics(analysis.topics);
      }
      
      // Update reviews
      if (analysis.reviews && analysis.reviews.samples) {
        displayReviews(analysis.reviews.samples);
      }
      
      // Update common terms
      if (analysis.common_terms) {
        console.log('✅ Displaying common terms:', analysis.common_terms);
        displayCommonTerms(analysis.common_terms);
      } else {
        console.warn('⚠️ No common_terms in analysis response');
      }
    }
  } catch (error) {
    console.error('Error loading analysis:', error);
  }
}

/**
 * Display common terms (word clouds)
 */
function displayCommonTerms(commonTerms) {
  console.log('🎨 displayCommonTerms called with:', commonTerms);
  
  // Display positive terms
  const positiveCloud = document.getElementById('positiveWordCloud');
  console.log('🎨 Positive cloud element:', positiveCloud);
  
  if (positiveCloud && commonTerms.positive_terms) {
    console.log('✅ Rendering positive terms:', commonTerms.positive_terms);
    positiveCloud.innerHTML = commonTerms.positive_terms.map((term, index) => {
      const fontSize = 2.2 - (index * 0.15); // Decreasing size
      return `<span class="cloud-word" style="font-size: ${fontSize}rem; color: var(--color-positive);">${term}</span>`;
    }).join('\n');
  } else {
    console.warn('⚠️ Positive cloud not rendered:', {
      hasElement: !!positiveCloud,
      hasTerms: !!commonTerms.positive_terms
    });
  }
  
  // Display negative terms
  const negativeCloud = document.getElementById('negativeWordCloud');
  console.log('🎨 Negative cloud element:', negativeCloud);
  
  if (negativeCloud && commonTerms.negative_terms) {
    console.log('✅ Rendering negative terms:', commonTerms.negative_terms);
    negativeCloud.innerHTML = commonTerms.negative_terms.map((term, index) => {
      const fontSize = 1.9 - (index * 0.15); // Decreasing size
      return `<span class="cloud-word" style="font-size: ${fontSize}rem; color: var(--color-negative);">${term}</span>`;
    }).join('\n');
  } else {
    console.warn('⚠️ Negative cloud not rendered:', {
      hasElement: !!negativeCloud,
      hasTerms: !!commonTerms.negative_terms
    });
  }
}

/**
 * Populate product data in the page
 */
function populateProductData(product) {
  // Update product image
  const productImage = document.querySelector('.product-image');
  if (productImage && product.image) {
    productImage.src = product.image;
    productImage.alt = product.name;
  }
  
  // Update product name
  const productName = document.querySelector('.product-header h1');
  if (productName) {
    productName.textContent = product.name;
  }
  
  // Update retailer
  const retailer = document.querySelector('.product-retailer');
  if (retailer) {
    retailer.textContent = product.retailer;
  }
  
  // Update price
  const price = document.querySelector('.product-price');
  if (price && product.price) {
    price.textContent = `₹${Math.round(parseFloat(product.price)).toLocaleString('en-IN')}`;
  }
  
  // Update rating
  const rating = document.querySelector('.product-rating');
  if (rating) {
    rating.innerHTML = `
      <span class="rating-value">${product.rating.toFixed(1)}</span>
      <span class="rating-stars">${'⭐'.repeat(Math.round(product.rating))}</span>
      <span class="review-count">(${product.totalReviews.toLocaleString()} reviews)</span>
    `;
  }
  
  // Update insight score
  const insightScore = document.getElementById('insightScore');
  if (insightScore) {
    insightScore.textContent = Math.round(product.insightScore);
  }
  
  // Update sentiment chart
  if (product.sentiment && sentimentChart) {
    sentimentChart.data.datasets[0].data = [
      product.sentiment.positive,
      product.sentiment.neutral,
      product.sentiment.negative
    ];
    sentimentChart.update();
  }
  
  // Update specs
  if (product.specs) {
    updateSpecBar('quality', product.specs.quality);
    updateSpecBar('value', product.specs.value);
    updateSpecBar('durability', product.specs.durability);
    updateSpecBar('features', product.specs.features);
    updateSpecBar('performance', product.specs.performance);
  }
  
  // Update AI summary
  const summaryElement = document.querySelector('.ai-summary-text');
  if (summaryElement) {
    if (product.aiSummary) {
      summaryElement.textContent = product.aiSummary;
    } else {
      summaryElement.innerHTML = '<em style="color: #999;">AI summary not available for this product. Try re-analyzing it from the submit page.</em>';
    }
  }
  
  // Update strengths
  const strengthsList = document.querySelector('.strengths-list');
  if (strengthsList) {
    if (product.strengths && Array.isArray(product.strengths) && product.strengths.length > 0) {
      strengthsList.innerHTML = product.strengths
        .map(strength => `<li><span class="icon">✓</span> ${strength}</li>`)
        .join('');
    } else {
      strengthsList.innerHTML = '<li style="color: #999;"><em>No strengths data available. Re-analyze this product to get AI insights.</em></li>';
    }
  }
  
  // Update weaknesses
  const weaknessesList = document.querySelector('.weaknesses-list');
  if (weaknessesList) {
    if (product.weaknesses && Array.isArray(product.weaknesses) && product.weaknesses.length > 0) {
      weaknessesList.innerHTML = product.weaknesses
        .map(weakness => `<li><span class="icon">✗</span> ${weakness}</li>`)
        .join('');
    } else {
      weaknessesList.innerHTML = '<li style="color: #999;"><em>No weaknesses data available. Re-analyze this product to get AI insights.</em></li>';
    }
  }
}

/**
 * Update spec progress bar
 */
function updateSpecBar(specName, value) {
  const bar = document.querySelector(`.spec-bar[data-spec="${specName}"]`);
  if (bar) {
    const fill = bar.querySelector('.spec-fill');
    const valueEl = bar.querySelector('.spec-value');
    
    if (fill) fill.style.width = `${value}%`;
    if (valueEl) valueEl.textContent = Math.round(value);
  }
}

/**
 * Display topics
 */
function displayTopics(topics) {
  const topicsList = document.querySelector('.topics-list');
  if (!topicsList) return;
  
  topicsList.innerHTML = topics.map(topic => `
    <div class="topic-item ${topic.sentiment}">
      <span class="topic-name">${topic.name}</span>
      <span class="topic-sentiment">${topic.sentiment}</span>
      <span class="topic-count">${topic.mention_count} mentions</span>
    </div>
  `).join('');
}

/**
 * Display reviews
 */
function displayReviews(reviewSamples) {
  if (!reviewSamples) return;
  
  // Display positive reviews
  if (reviewSamples.positive) {
    const positiveList = document.querySelector('.positive-reviews-list');
    if (positiveList) {
      positiveList.innerHTML = reviewSamples.positive
        .map(review => formatReview(review))
        .join('');
    }
  }
  
  // Display negative reviews
  if (reviewSamples.negative) {
    const negativeList = document.querySelector('.negative-reviews-list');
    if (negativeList) {
      negativeList.innerHTML = reviewSamples.negative
        .map(review => formatReview(review))
        .join('');
    }
  }
}

/**
 * Format review HTML
 */
function formatReview(review) {
  return `
    <div class="review-item">
      <div class="review-header">
        <span class="review-author">${review.author}</span>
        <span class="review-rating">${'⭐'.repeat(review.rating)}</span>
      </div>
      <p class="review-text">${review.text}</p>
      <div class="review-footer">
        <span class="helpful-count">👍 ${review.helpful_count || 0} found helpful</span>
      </div>
    </div>
  `;
}

/**
 * Show error message
 */
function showError(message) {
  const main = document.querySelector('main');
  if (main) {
    main.innerHTML = `
      <div class="container" style="text-align: center; padding: var(--space-12);">
        <h2 style="color: var(--color-danger);">Error</h2>
        <p>${message}</p>
        <a href="submit.html" class="btn btn-primary" style="margin-top: var(--space-6);">
          Analyze Another Product
        </a>
      </div>
    `;
  }
}

// ===== CHART INITIALIZATION =====

function initializeSentimentChart() {
  const canvas = document.getElementById('sentimentDonutChart');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  
  // Destroy existing chart if it exists
  if (sentimentChart) {
    sentimentChart.destroy();
  }
  
  sentimentChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Positive', 'Negative', 'Neutral'],
      datasets: [{
        data: [75, 15, 10],
        backgroundColor: [
          'rgba(25, 135, 84, 0.8)',
          'rgba(220, 53, 69, 0.8)',
          'rgba(108, 117, 125, 0.8)'
        ],
        borderColor: [
          'rgb(25, 135, 84)',
          'rgb(220, 53, 69)',
          'rgb(108, 117, 125)'
        ],
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const label = context.label || '';
              const value = context.parsed || 0;
              return label + ': ' + value + '%';
            }
          }
        }
      },
      cutout: '65%'
    }
  });
}
