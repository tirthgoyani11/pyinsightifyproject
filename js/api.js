// ========================================
// API SERVICE LAYER
// Centralized data operations with backend integration
// ========================================

const API = {
  
  // Base configuration
  config: {
    baseURL: 'http://localhost:5000/api', // Backend API URL
    useMockData: false, // Set to true to use mock data
    mockDelay: 800,
    enableLogging: true,
    version: '1.0.0'
  },
  
  // ===== HELPER FUNCTIONS =====
  
  /**
   * Make HTTP request to backend
   */
  async _fetch(endpoint, options = {}) {
    const url = `${this.config.baseURL}${endpoint}`;
    
    try {
      this._log(options.method || 'GET', endpoint, options.body);
      
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }
      
      return data;
    } catch (error) {
      return this._handleError(error, endpoint);
    }
  },
  
  /**
   * Simulate API delay (for mock mode)
   */
  async _delay(ms = null) {
    const delay = ms || this.config.mockDelay;
    return new Promise(resolve => setTimeout(resolve, delay));
  },
  
  /**
   * Log API calls (for debugging)
   */
  _log(method, endpoint, data = null) {
    if (this.config.enableLogging) {
      console.log(`[API] ${method} ${endpoint}`, data || '');
    }
  },
  
  /**
   * Simulate API response (for mock mode)
   */
  async _mockResponse(data, success = true, delay = null) {
    await this._delay(delay);
    return {
      success,
      data,
      timestamp: new Date().toISOString()
    };
  },
  
  /**
   * Handle errors
   */
  _handleError(error, endpoint) {
    console.error(`[API Error] ${endpoint}:`, error);
    return {
      success: false,
      error: error.message || 'An error occurred',
      timestamp: new Date().toISOString()
    };
  },
  
  // ===== PRODUCT OPERATIONS =====
  
  products: {
    
    /**
     * Get all products with optional filters
     */
    async getAll(filters = {}) {
      if (API.config.useMockData) {
        return API.products._getMockProducts(filters);
      }
      
      // Build query parameters
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.category) params.append('category', filters.category);
      if (filters.retailer) params.append('retailer', filters.retailer);
      if (filters.minScore) params.append('minScore', filters.minScore);
      if (filters.maxScore) params.append('maxScore', filters.maxScore);
      if (filters.sort) params.append('sortBy', filters.sort);
      if (filters.page) params.append('page', filters.page);
      if (filters.limit) params.append('limit', filters.limit);
      
      const queryString = params.toString();
      const endpoint = `/products${queryString ? '?' + queryString : ''}`;
      
      return await API._fetch(endpoint);
    },
    
    /**
     * Get mock products (fallback)
     */
    async _getMockProducts(filters = {}) {
      API._log('GET', '/products (MOCK)', filters);
      
      try {
        let products = [...mockProductsDB];
        
        // Apply search filter
        if (filters.search) {
          const search = filters.search.toLowerCase();
          products = products.filter(p => 
            p.name.toLowerCase().includes(search) ||
            p.category.toLowerCase().includes(search)
          );
        }
        
        // Apply category filter
        if (filters.categories && filters.categories.length > 0) {
          products = products.filter(p => 
            filters.categories.includes(p.category.toLowerCase())
          );
        }
        
        // Apply retailer filter
        if (filters.retailers && filters.retailers.length > 0) {
          products = products.filter(p => 
            filters.retailers.includes(p.retailer.toLowerCase())
          );
        }
        
        // Apply score filter
        if (filters.minScore) {
          products = products.filter(p => p.insightScore >= filters.minScore);
        }
        
        // Apply sorting
        if (filters.sort) {
          products = API.products._sortProducts(products, filters.sort);
        }
        
        // Apply pagination
        const page = filters.page || 1;
        const perPage = filters.perPage || 10;
        const start = (page - 1) * perPage;
        const end = start + perPage;
        
        const paginatedProducts = products.slice(start, end);
        
        return await API._mockResponse({
          products: paginatedProducts,
          total: products.length,
          page,
          perPage,
          totalPages: Math.ceil(products.length / perPage)
        });
        
      } catch (error) {
        return API._handleError(error, '/products');
      }
    },
    
    /**
     * Get single product by ID
     */
    async getById(productId) {
      if (API.config.useMockData) {
        return API.products._getMockProductById(productId);
      }
      
      return await API._fetch(`/products/${productId}`);
    },
    
    /**
     * Get mock product by ID (fallback)
     */
    async _getMockProductById(productId) {
      API._log('GET', `/products/${productId} (MOCK)`);
      
      try {
        const product = mockProductsDB.find(p => p.id === productId);
        
        if (!product) {
          return await API._mockResponse(null, false);
        }
        
        // Generate detailed analysis data
        const detailedProduct = {
          ...product,
          analysis: {
            topics: API._generateTopics(product),
            reviews: API._generateReviews(product),
            trends: API._generateTrends(product)
          }
        };
        
        return await API._mockResponse(detailedProduct);
        
      } catch (error) {
        return API._handleError(error, `/products/${productId}`);
      }
    },
    
    /**
     * Analyze new product from URL
     */
    async analyze(productUrl, retailer = null, productName = null, category = null) {
      if (API.config.useMockData) {
        return API.products._analyzeMockProduct(productUrl, retailer, productName, category);
      }
      
      return await API._fetch('/products/analyze', {
        method: 'POST',
        body: JSON.stringify({ 
          url: productUrl,
          retailer,
          name: productName,
          category
        })
      });
    },
    
    /**
     * Analyze mock product (fallback)
     */
    async _analyzeMockProduct(productUrl, retailer, productName = null, category = null) {
      API._log('POST', '/products/analyze (MOCK)', { productUrl, retailer });
      
      try {
        // Simulate analysis steps
        const steps = [
          { message: 'Fetching product details...', progress: 25 },
          { message: 'Collecting reviews...', progress: 50 },
          { message: 'Analyzing sentiment...', progress: 75 },
          { message: 'Generating insights...', progress: 100 }
        ];
        
        // Generate mock product from URL
        const newProduct = {
          id: `prod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: productName || API._extractProductName(productUrl),
          category: category || 'Electronics',
          retailer,
          url: productUrl,
          insightScore: Math.floor(Math.random() * 30) + 70, // 70-100
          rating: (Math.random() * 1.5 + 3.5).toFixed(1), // 3.5-5.0
          totalReviews: Math.floor(Math.random() * 10000) + 500,
          price: `$${(Math.random() * 1000 + 50).toFixed(2)}`,
          image: `https://via.placeholder.com/280x200?text=${encodeURIComponent(productName || 'Product')}`,
          analyzedAt: new Date(),
          specs: {
            quality: Math.floor(Math.random() * 30) + 70,
            value: Math.floor(Math.random() * 30) + 70,
            durability: Math.floor(Math.random() * 30) + 70,
            features: Math.floor(Math.random() * 30) + 70,
            performance: Math.floor(Math.random() * 30) + 70
          },
          sentiment: {
            positive: Math.floor(Math.random() * 30) + 60,
            neutral: Math.floor(Math.random() * 20) + 10,
            negative: Math.floor(Math.random() * 15) + 5
          }
        };
        
        // Add to mock database
        mockProductsDB.unshift(newProduct);
        
        return await API._mockResponse({
          product: newProduct,
          steps
        }, true, 3000); // Longer delay for analysis
        
      } catch (error) {
        return API._handleError(error, '/products/analyze');
      }
    },
    
    /**
     * Get recent products
     */
    async getRecent(limit = 10) {
      if (API.config.useMockData) {
        return API.products._getMockRecentProducts(limit);
      }
      
      return await API._fetch(`/products/recent?limit=${limit}`);
    },
    
    /**
     * Get mock recent products (fallback)
     */
    async _getMockRecentProducts(limit = 10) {
      API._log('GET', '/products/recent (MOCK)', { limit });
      
      try {
        const recent = mockProductsDB
          .sort((a, b) => new Date(b.analyzedAt) - new Date(a.analyzedAt))
          .slice(0, limit);
        
        return await API._mockResponse(recent);
        
      } catch (error) {
        return API._handleError(error, '/products/recent');
      }
    },
    
    /**
     * Sort products helper
     */
    _sortProducts(products, sortBy) {
      const sorted = [...products];
      
      switch (sortBy) {
        case 'score':
          return sorted.sort((a, b) => b.insightScore - a.insightScore);
        case 'reviews':
          return sorted.sort((a, b) => b.totalReviews - a.totalReviews);
        case 'name':
          return sorted.sort((a, b) => a.name.localeCompare(b.name));
        case 'recent':
        default:
          return sorted.sort((a, b) => new Date(b.analyzedAt) - new Date(a.analyzedAt));
      }
    }
  },
  
  // ===== ANALYSIS OPERATIONS =====
  
  analysis: {
    
    /**
     * Get detailed analysis for a product
     */
    async getById(productId) {
      if (API.config.useMockData) {
        // Mock mode - return mock analysis data
        return await API._mockResponse({
          product: mockProductsDB.find(p => p.id === productId),
          sentiment: { positive: 75, neutral: 15, negative: 10 },
          topics: [],
          specs: { quality: 85, value: 80, durability: 82, features: 88, performance: 90 },
          common_terms: {
            positive_terms: ['excellent', 'fast', 'beautiful', 'amazing', 'smooth', 'premium', 'love', 'great value'],
            negative_terms: ['expensive', 'bloatware', 'disappointing', 'overpriced', 'warm', 'poor']
          },
          reviews: { total: 100, rating: 4.5, samples: { positive: [], negative: [] } }
        });
      }
      
      return await API._fetch(`/analysis/${productId}`);
    }
    
  },
  
  // ===== COMMUNITY OPERATIONS =====
  
  community: {
    
    /**
     * Get all posts with filters
     */
    async getPosts(filters = {}) {
      if (API.config.useMockData) {
        return API.community._getMockPosts(filters);
      }
      
      // Build query parameters
      const params = new URLSearchParams();
      if (filters.sort) params.append('sortBy', filters.sort);
      if (filters.category) params.append('category', filters.category);
      if (filters.page) params.append('page', filters.page);
      if (filters.limit) params.append('limit', filters.limit);
      
      const queryString = params.toString();
      const endpoint = `/community/posts${queryString ? '?' + queryString : ''}`;
      
      return await API._fetch(endpoint);
    },
    
    /**
     * Get mock posts (fallback)
     */
    async _getMockPosts(filters = {}) {
      API._log('GET', '/community/posts (MOCK)', filters);
      
      try {
        // Get posts from localStorage
        let posts = JSON.parse(localStorage.getItem('communityPosts') || '[]');
        
        // Merge with mock posts
        posts = [...posts, ...mockCommunityPosts];
        
        // Apply sorting
        if (filters.sort) {
          posts = API.community._sortPosts(posts, filters.sort);
        }
        
        // Apply search
        if (filters.search) {
          const search = filters.search.toLowerCase();
          posts = posts.filter(p => 
            p.title.toLowerCase().includes(search) ||
            p.content.toLowerCase().includes(search)
          );
        }
        
        return await API._mockResponse(posts);
        
      } catch (error) {
        return API._handleError(error, '/community/posts');
      }
    },
    
    /**
     * Create new post
     */
    async createPost(postData) {
      if (API.config.useMockData) {
        return API.community._createMockPost(postData);
      }
      
      return await API._fetch('/community/posts', {
        method: 'POST',
        body: JSON.stringify(postData)
      });
    },
    
    /**
     * Create mock post (fallback)
     */
    async _createMockPost(postData) {
      API._log('POST', '/community/posts (MOCK)', postData);
      
      try {
        const newPost = {
          id: Date.now(),
          ...postData,
          author: 'You',
          votes: 0,
          comments: 0,
          date: new Date().toISOString(),
          verified: false
        };
        
        const posts = JSON.parse(localStorage.getItem('communityPosts') || '[]');
        posts.unshift(newPost);
        localStorage.setItem('communityPosts', JSON.stringify(posts));
        
        return await API._mockResponse(newPost);
        
      } catch (error) {
        return API._handleError(error, '/community/posts');
      }
    },
    
    /**
     * Vote on post
     */
    async votePost(postId, voteType) {
      if (API.config.useMockData) {
        return API.community._voteMockPost(postId, voteType);
      }
      
      return await API._fetch(`/community/posts/${postId}/vote`, {
        method: 'POST',
        body: JSON.stringify({ type: voteType })
      });
    },
    
    /**
     * Vote on mock post (fallback)
     */
    async _voteMockPost(postId, voteType) {
      API._log('POST', `/community/posts/${postId}/vote (MOCK)`, { voteType });
      
      try {
        // In real app, this would update backend
        // For now, just return success
        return await API._mockResponse({ postId, voteType }, true, 200);
        
      } catch (error) {
        return API._handleError(error, `/community/posts/${postId}/vote`);
      }
    },
    
    /**
     * Sort posts helper
     */
    _sortPosts(posts, sortBy) {
      const sorted = [...posts];
      
      switch (sortBy) {
        case 'hot':
          return sorted.sort((a, b) => {
            const aHot = a.votes + (a.comments * 2);
            const bHot = b.votes + (b.comments * 2);
            return bHot - aHot;
          });
        case 'new':
          return sorted.sort((a, b) => new Date(b.date) - new Date(a.date));
        case 'top':
          return sorted.sort((a, b) => b.votes - a.votes);
        case 'trending':
          return sorted.sort((a, b) => {
            const aAge = (Date.now() - new Date(a.date)) / 3600000; // hours
            const bAge = (Date.now() - new Date(b.date)) / 3600000;
            const aTrend = a.votes / (aAge + 2);
            const bTrend = b.votes / (bAge + 2);
            return bTrend - aTrend;
          });
        default:
          return sorted;
      }
    }
  },
  
  // ===== LOCAL STORAGE OPERATIONS =====
  
  storage: {
    
    /**
     * Save to local storage
     */
    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (error) {
        console.error('[Storage Error]:', error);
        return false;
      }
    },
    
    /**
     * Get from local storage
     */
    get(key, defaultValue = null) {
      try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
      } catch (error) {
        console.error('[Storage Error]:', error);
        return defaultValue;
      }
    },
    
    /**
     * Remove from local storage
     */
    remove(key) {
      try {
        localStorage.removeItem(key);
        return true;
      } catch (error) {
        console.error('[Storage Error]:', error);
        return false;
      }
    },
    
    /**
     * Clear all local storage
     */
    clear() {
      try {
        localStorage.clear();
        return true;
      } catch (error) {
        console.error('[Storage Error]:', error);
        return false;
      }
    },
    
    /**
     * Add to favorites
     */
    addFavorite(productId) {
      const favorites = this.get('favorites', []);
      if (!favorites.includes(productId)) {
        favorites.push(productId);
        this.set('favorites', favorites);
      }
      return favorites;
    },
    
    /**
     * Remove from favorites
     */
    removeFavorite(productId) {
      const favorites = this.get('favorites', []);
      const filtered = favorites.filter(id => id !== productId);
      this.set('favorites', filtered);
      return filtered;
    },
    
    /**
     * Get favorites
     */
    getFavorites() {
      return this.get('favorites', []);
    },
    
    /**
     * Add to recent products
     */
    addRecentProduct(product) {
      const recent = this.get('recentProducts', []);
      // Remove if already exists
      const filtered = recent.filter(p => p.id !== product.id);
      // Add to beginning
      filtered.unshift(product);
      // Keep only last 10
      const trimmed = filtered.slice(0, 10);
      this.set('recentProducts', trimmed);
      return trimmed;
    },
    
    /**
     * Get recent products
     */
    getRecentProducts() {
      return this.get('recentProducts', []);
    }
  },
  
  // ===== PRIVATE HELPER METHODS =====
  
  _extractProductName(url) {
    try {
      const urlObj = new URL(url);
      const path = urlObj.pathname;
      const parts = path.split('/').filter(p => p && p !== 'dp' && p !== 'product');
      return parts[parts.length - 1].replace(/-/g, ' ').replace(/\//g, '');
    } catch {
      return 'Product';
    }
  },
  
  _generateTopics(product) {
    return [
      { name: 'Quality', sentiment: 'positive', count: Math.floor(Math.random() * 100) + 50 },
      { name: 'Value', sentiment: 'positive', count: Math.floor(Math.random() * 80) + 40 },
      { name: 'Durability', sentiment: 'mixed', count: Math.floor(Math.random() * 60) + 30 },
      { name: 'Customer Service', sentiment: 'mixed', count: Math.floor(Math.random() * 50) + 20 }
    ];
  },
  
  _generateReviews(product) {
    const templates = [
      { text: 'Great product! Highly recommend.', rating: 5, verified: true },
      { text: 'Good value for money.', rating: 4, verified: true },
      { text: 'Works as expected.', rating: 4, verified: false },
      { text: 'Could be better quality.', rating: 3, verified: true },
      { text: 'Not what I expected.', rating: 2, verified: false }
    ];
    
    return templates.map((t, i) => ({
      id: `review_${i}`,
      ...t,
      author: `User${i + 1}`,
      date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
    }));
  },
  
  _generateTrends(product) {
    return {
      score: [85, 87, 86, 88, 90, product.insightScore],
      sentiment: [
        { positive: 70, neutral: 20, negative: 10 },
        { positive: 72, neutral: 18, negative: 10 },
        { positive: product.sentiment.positive, neutral: product.sentiment.neutral, negative: product.sentiment.negative }
      ]
    };
  }
};

// ===== MOCK DATA =====

const mockProductsDB = [
  {
    id: 'prod_1699564800_abc123',
    name: 'iPhone 15 Pro Max',
    category: 'Smartphones',
    retailer: 'Amazon',
    insightScore: 92,
    rating: 4.7,
    totalReviews: 15234,
    price: '$1,199.00',
    image: 'https://via.placeholder.com/280x200?text=iPhone+15+Pro',
    analyzedAt: new Date('2024-11-05'),
    specs: { quality: 95, value: 85, durability: 92, features: 94, performance: 96 },
    sentiment: { positive: 82, neutral: 12, negative: 6 }
  },
  {
    id: 'prod_1699478400_def456',
    name: 'Sony WH-1000XM5 Headphones',
    category: 'Audio',
    retailer: 'Best Buy',
    insightScore: 89,
    rating: 4.6,
    totalReviews: 8932,
    price: '$399.99',
    image: 'https://via.placeholder.com/280x200?text=Sony+Headphones',
    analyzedAt: new Date('2024-11-03'),
    specs: { quality: 92, value: 88, durability: 85, features: 90, performance: 91 },
    sentiment: { positive: 78, neutral: 15, negative: 7 }
  },
  {
    id: 'prod_1699392000_ghi789',
    name: 'Samsung 65" QLED TV',
    category: 'Electronics',
    retailer: 'Amazon',
    insightScore: 85,
    rating: 4.4,
    totalReviews: 5621,
    price: '$1,299.00',
    image: 'https://via.placeholder.com/280x200?text=Samsung+TV',
    analyzedAt: new Date('2024-11-01'),
    specs: { quality: 88, value: 82, durability: 84, features: 87, performance: 86 },
    sentiment: { positive: 72, neutral: 20, negative: 8 }
  }
];

const mockCommunityPosts = [
  {
    id: 1,
    title: 'Best headphones under $400?',
    content: 'Looking for recommendations for over-ear headphones with good noise cancellation.',
    category: 'audio',
    author: 'AudioFan123',
    votes: 45,
    comments: 23,
    date: new Date('2024-11-10').toISOString(),
    verified: false
  }
];

// Export API
window.API = API;
