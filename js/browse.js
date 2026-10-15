/**
 * Browse Products Page JavaScript
 * Handles product listing, filtering, and sorting
 */

// Mock product database (prices in INR)
const mockProducts = [
  {
    id: 1,
    name: "iPhone 15 Pro Max",
    category: "Electronics",
    retailer: "Amazon",
    insightScore: 92,
    rating: 4.7,
    reviews: 2847,
    price: 99517,
    image: "https://via.placeholder.com/300x200/4A69FF/ffffff?text=iPhone+15+Pro",
    analyzedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 2,
    name: "Sony WH-1000XM5 Headphones",
    category: "Electronics",
    retailer: "Amazon",
    insightScore: 89,
    rating: 4.6,
    reviews: 1523,
    price: 33199,
    image: "https://via.placeholder.com/300x200/198754/ffffff?text=Sony+Headphones",
    analyzedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 3,
    name: "Samsung 65\" QLED TV",
    category: "Electronics",
    retailer: "Walmart",
    insightScore: 85,
    rating: 4.5,
    reviews: 892,
    price: 107899,
    image: "https://via.placeholder.com/300x200/6B8AFF/ffffff?text=Samsung+TV",
    analyzedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 4,
    name: "Ninja Air Fryer",
    category: "Home",
    retailer: "Amazon",
    insightScore: 91,
    rating: 4.8,
    reviews: 3421,
    price: 10789,
    image: "https://via.placeholder.com/300x200/198754/ffffff?text=Air+Fryer",
    analyzedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 5,
    name: "Dyson V15 Vacuum Cleaner",
    category: "Home",
    retailer: "Flipkart",
    insightScore: 88,
    rating: 4.7,
    reviews: 678,
    price: 53949,
    image: "https://via.placeholder.com/300x200/4A69FF/ffffff?text=Dyson+Vacuum",
    analyzedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 6,
    name: "Nike Air Max Running Shoes",
    category: "Fashion",
    retailer: "Amazon",
    insightScore: 82,
    rating: 4.4,
    reviews: 1245,
    price: 12449,
    image: "https://via.placeholder.com/300x200/DC3545/ffffff?text=Nike+Shoes",
    analyzedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 7,
    name: "MacBook Pro M3",
    category: "Electronics",
    retailer: "Amazon",
    insightScore: 94,
    rating: 4.9,
    reviews: 456,
    price: 165917,
    image: "https://via.placeholder.com/300x200/4A69FF/ffffff?text=MacBook+Pro",
    analyzedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 8,
    name: "L'Oréal Face Serum",
    category: "Beauty",
    retailer: "Walmart",
    insightScore: 76,
    rating: 4.2,
    reviews: 892,
    price: 2074,
    image: "https://via.placeholder.com/300x200/FFC107/ffffff?text=Face+Serum",
    analyzedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
  }
];

let allProducts = [...mockProducts]; // Fallback to mock data
let filteredProducts = [];
let currentPage = 1;
const productsPerPage = 6;

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
  setupFilters();
  setupSearch();
  setupSort();
  loadProductsFromAPI();
});

/**
 * Load products from backend API
 */
async function loadProductsFromAPI() {
  try {
    console.log('🔄 Loading products from API...');
    const response = await API.products.getAll({ limit: 50 });
    
    if (response.success && response.products && response.products.length > 0) {
      console.log(`✅ Loaded ${response.products.length} products from database`);
      
      // Transform API products to match UI format
      allProducts = response.products.map(p => ({
        id: p.id || p.productId,
        name: p.name,
        category: p.category || 'Electronics',
        retailer: p.retailer || 'Amazon',
        insightScore: p.insightScore || 0,
        rating: p.rating || 0,
        reviews: p.reviewCount || p.totalReviews || 0,
        price: parseFloat(p.price) || 0,
        image: p.image || p.imageUrl || `https://via.placeholder.com/300x200/4A69FF/ffffff?text=${encodeURIComponent(p.name.substring(0, 20))}`,
        analyzedAt: p.analyzedAt
      }));
      
      filteredProducts = [...allProducts];
      renderProducts();
    } else {
      console.log('⚠️  No products in database, using mock data');
      allProducts = [...mockProducts];
      filteredProducts = [...allProducts];
      renderProducts();
    }
  } catch (error) {
    console.error('❌ Error loading products:', error);
    console.log('⚠️  Falling back to mock data');
    allProducts = [...mockProducts];
    filteredProducts = [...allProducts];
    renderProducts();
  }
}

/**
 * Setup filter functionality
 */
function setupFilters() {
  // Category filters
  document.querySelectorAll('#categoryFilters input').forEach(checkbox => {
    checkbox.addEventListener('change', applyFilters);
  });
  
  // Retailer filters
  document.querySelectorAll('#retailerFilters input').forEach(checkbox => {
    checkbox.addEventListener('change', applyFilters);
  });
  
  // Score range
  const scoreRange = document.getElementById('scoreRange');
  scoreRange.addEventListener('input', function() {
    document.getElementById('scoreValue').textContent = this.value + '+';
  });
  scoreRange.addEventListener('change', applyFilters);
}

/**
 * Setup search functionality
 */
function setupSearch() {
  const searchInput = document.getElementById('searchInput');
  let searchTimeout;
  
  searchInput.addEventListener('input', function() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      applyFilters();
    }, 300); // Debounce
  });
}

/**
 * Setup sort functionality
 */
function setupSort() {
  document.getElementById('sortBy').addEventListener('change', function() {
    sortProducts(this.value);
    renderProducts();
  });
}

/**
 * Apply all filters
 */
function applyFilters() {
  const searchQuery = document.getElementById('searchInput').value.toLowerCase();
  const minScore = parseInt(document.getElementById('scoreRange').value);
  
  // Get selected categories
  const selectedCategories = Array.from(document.querySelectorAll('#categoryFilters input:checked'))
    .map(cb => cb.value)
    .filter(v => v !== 'all');
  
  // Get selected retailers
  const selectedRetailers = Array.from(document.querySelectorAll('#retailerFilters input:checked'))
    .map(cb => cb.value);
  
  // Filter products
  filteredProducts = allProducts.filter(product => {
    // Search filter
    if (searchQuery && !product.name.toLowerCase().includes(searchQuery)) {
      return false;
    }
    
    // Category filter
    if (selectedCategories.length > 0 && !selectedCategories.includes(product.category)) {
      return false;
    }
    
    // Retailer filter
    if (selectedRetailers.length > 0 && !selectedRetailers.includes(product.retailer)) {
      return false;
    }
    
    // Score filter
    if (product.insightScore < minScore) {
      return false;
    }
    
    return true;
  });
  
  currentPage = 1;
  renderProducts();
}

/**
 * Sort products
 */
function sortProducts(sortBy) {
  switch (sortBy) {
    case 'recent':
      filteredProducts.sort((a, b) => new Date(b.analyzedAt) - new Date(a.analyzedAt));
      break;
    case 'score':
      filteredProducts.sort((a, b) => b.insightScore - a.insightScore);
      break;
    case 'reviews':
      filteredProducts.sort((a, b) => b.reviews - a.reviews);
      break;
    case 'name':
      filteredProducts.sort((a, b) => a.name.localeCompare(b.name));
      break;
  }
}

/**
 * Render products
 */
function renderProducts() {
  const grid = document.getElementById('productsGrid');
  const startIndex = (currentPage - 1) * productsPerPage;
  const endIndex = startIndex + productsPerPage;
  const pageProducts = filteredProducts.slice(startIndex, endIndex);
  
  // Update result count
  document.getElementById('resultCount').innerHTML = 
    `Showing <strong>${filteredProducts.length}</strong> product${filteredProducts.length !== 1 ? 's' : ''}`;
  
  if (pageProducts.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: var(--space-10);">
        <p class="text-secondary">No products found matching your filters.</p>
        <button class="btn btn-outline" onclick="resetFilters()">Clear Filters</button>
      </div>
    `;
    document.getElementById('pagination').innerHTML = '';
    return;
  }
  
  grid.innerHTML = pageProducts.map(product => createProductCard(product)).join('');
  renderPagination();
}

/**
 * Create product card HTML
 */
function createProductCard(product) {
  const scoreColor = getScoreColor(product.insightScore);
  
  return `
    <a href="analysis.html?id=${product.id}" class="card liquid-glass-card" style="text-decoration: none; color: inherit; padding: var(--space-4); position: relative; transition: transform 0.2s, box-shadow 0.2s;">
      <div style="position: relative;">
        <div class="product-card-img" style="background: linear-gradient(135deg, ${scoreColor}22 0%, ${scoreColor}44 100%); display: flex; align-items: center; justify-content: center; font-size: 3rem;">
          ${getCategoryIcon(product.category)}
        </div>
        <div class="score-badge" style="color: ${scoreColor};">
          ${product.insightScore}
        </div>
      </div>
      
      <div>
        <div class="badge badge-sm" style="margin-bottom: var(--space-2);">${product.retailer}</div>
        <h3 title="${product.name}" style="font-size: 1rem; margin: 0 0 var(--space-2) 0; overflow: hidden; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; line-clamp: 2; line-height: 1.4; max-height: 2.8em; min-height: 2.8em;">
          ${product.name}
        </h3>
        
        <div style="display: flex; align-items: center; gap: var(--space-2); margin-bottom: var(--space-2);">
          <div style="display: flex; gap: 2px;">
            ${renderStars(product.rating)}
          </div>
          <span style="font-size: 0.875rem; color: var(--color-text-secondary);">
            ${product.rating}
          </span>
          <span style="font-size: 0.75rem; color: var(--color-text-secondary);">
            (${product.reviews.toLocaleString()})
          </span>
        </div>
        
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 1.125rem; font-weight: 600; color: var(--color-primary);">
            ₹${Math.round(product.price).toLocaleString('en-IN')}
          </span>
          <span style="font-size: 0.75rem; color: var(--color-text-secondary);">
            ${formatRelativeTime(product.analyzedAt)}
          </span>
        </div>
      </div>
    </a>
  `;
}

/**
 * Render pagination
 */
function renderPagination() {
  const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
  const pagination = document.getElementById('pagination');
  
  if (totalPages <= 1) {
    pagination.innerHTML = '';
    return;
  }
  
  let html = '';
  
  // Previous button
  html += `
    <button class="btn btn-outline btn-sm" ${currentPage === 1 ? 'disabled' : ''} onclick="goToPage(${currentPage - 1})">
      Previous
    </button>
  `;
  
  // Page numbers
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
      html += `
        <button class="btn ${i === currentPage ? 'btn-primary' : 'btn-outline'} btn-sm" onclick="goToPage(${i})">
          ${i}
        </button>
      `;
    } else if (i === currentPage - 2 || i === currentPage + 2) {
      html += `<span style="padding: 0 var(--space-2);">...</span>`;
    }
  }
  
  // Next button
  html += `
    <button class="btn btn-outline btn-sm" ${currentPage === totalPages ? 'disabled' : ''} onclick="goToPage(${currentPage + 1})">
      Next
    </button>
  `;
  
  pagination.innerHTML = html;
}

/**
 * Go to specific page
 */
function goToPage(page) {
  currentPage = page;
  renderProducts();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Reset all filters
 */
function resetFilters() {
  document.getElementById('searchInput').value = '';
  document.getElementById('scoreRange').value = 0;
  document.getElementById('scoreValue').textContent = '0+';
  document.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.checked = cb.value === 'all';
  });
  document.getElementById('sortBy').value = 'recent';
  
  filteredProducts = [...mockProducts];
  sortProducts('recent');
  currentPage = 1;
  renderProducts();
}

/**
 * Get score color
 */
function getScoreColor(score) {
  if (score >= 90) return '#198754';
  if (score >= 75) return '#1d4ed8';
  if (score >= 60) return '#FFC107';
  return '#DC3545';
}

/**
 * Get category icon
 */
function getCategoryIcon(category) {
  const icons = {
    'Electronics': '📱',
    'Home': '🏠',
    'Fashion': '👕',
    'Beauty': '💄',
    'Sports': '⚽'
  };
  return icons[category] || '📦';
}

/**
 * Render star rating
 */
function renderStars(rating) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  let html = '';
  
  for (let i = 0; i < 5; i++) {
    if (i < fullStars) {
      html += '<span style="color: #FFC107;">★</span>';
    } else if (i === fullStars && hasHalfStar) {
      html += '<span style="color: #FFC107;">⯨</span>';
    } else {
      html += '<span style="color: #ddd;">★</span>';
    }
  }
  
  return html;
}

/**
 * Format relative time
 */
function formatRelativeTime(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
  if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago';
  if (seconds < 604800) return Math.floor(seconds / 86400) + 'd ago';
  
  return date.toLocaleDateString();
}

// Add hover effect to product cards
document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('productsGrid').addEventListener('mouseover', function(e) {
    const card = e.target.closest('.card');
    if (card) {
      card.style.transform = 'translateY(-4px)';
      card.style.boxShadow = 'var(--shadow-lg)';
    }
  });
  
  document.getElementById('productsGrid').addEventListener('mouseout', function(e) {
    const card = e.target.closest('.card');
    if (card) {
      card.style.transform = 'translateY(0)';
      card.style.boxShadow = 'var(--shadow-sm)';
    }
  });
});
