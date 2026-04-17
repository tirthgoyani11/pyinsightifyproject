# 📚 Complete API Reference - Insightify Backend

## Base URL
```
http://localhost:5000/api
```

---

## 🔍 Products API

### 1. Analyze Product
**Endpoint:** `POST /products/analyze`

Scrape and analyze a product from URL (Amazon, Flipkart, etc.)

**Request Body:**
```json
{
  "url": "https://amzn.in/d/09ECDYo"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "product": {
    "id": "prod_abc123",
    "name": "Wireless Bluetooth Headphones",
    "url": "https://amzn.in/d/09ECDYo",
    "price": 2999.00,
    "rating": 4.3,
    "total_reviews": 1523,
    "image_url": "https://...",
    "retailer": "Amazon India",
    "insight_score": 87.5,
    "sentiment": {
      "positive": 72.5,
      "neutral": 18.0,
      "negative": 9.5
    },
    "specs": {
      "quality": 85.0,
      "value": 88.0,
      "durability": 82.0,
      "features": 90.0,
      "performance": 87.0
    },
    "aiSummary": "Highly rated headphones praised for sound quality...",
    "topics": [
      {
        "name": "Sound Quality",
        "sentiment": "positive",
        "mentions": 245
      }
    ],
    "strengths": [
      "Excellent sound quality",
      "Long battery life"
    ],
    "weaknesses": [
      "Plastic build",
      "Expensive"
    ]
  }
}
```

### 2. Get All Products
**Endpoint:** `GET /products`

**Query Parameters:**
- `page` (int, default: 1)
- `per_page` (int, default: 20)
- `sort_by` (string: `rating`, `price`, `reviews`, `date`)
- `min_rating` (float: 0-5)
- `max_price` (float)
- `retailer` (string)

**Example:**
```
GET /products?page=1&sort_by=rating&min_rating=4.0
```

**Response (200 OK):**
```json
{
  "success": true,
  "products": [...],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 150,
    "pages": 8
  }
}
```

### 3. Get Product Details
**Endpoint:** `GET /products/{product_id}`

**Response (200 OK):**
```json
{
  "success": true,
  "product": {
    "id": "prod_abc123",
    "name": "...",
    "reviews": [
      {
        "id": 1,
        "rating": 5,
        "text": "Excellent product!",
        "author": "Rahul K.",
        "date": "2024-01-15",
        "helpful_count": 25,
        "verified": true
      }
    ]
  }
}
```

### 4. Get Recent Products
**Endpoint:** `GET /products/recent`

**Query Parameters:**
- `limit` (int, default: 10)

**Response (200 OK):**
```json
{
  "success": true,
  "products": [...]
}
```

---

## 📊 Analysis API

### 1. Get Detailed Analysis
**Endpoint:** `GET /analysis/{product_id}`

**Response (200 OK):**
```json
{
  "success": true,
  "analysis": {
    "product_id": "prod_abc123",
    "insight_score": 87.5,
    "sentiment_breakdown": {
      "positive": 72.5,
      "neutral": 18.0,
      "negative": 9.5
    },
    "rating_distribution": {
      "5_star": 65.5,
      "4_star": 20.0,
      "3_star": 8.5,
      "2_star": 3.0,
      "1_star": 3.0
    },
    "topics": [...],
    "trends": {
      "sentiment_trend": "improving",
      "recent_rating": 4.5
    }
  }
}
```

### 2. Compare Products
**Endpoint:** `POST /analysis/compare`

**Request Body:**
```json
{
  "product_ids": ["prod_abc123", "prod_xyz789"]
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "comparison": {
    "products": [
      {
        "id": "prod_abc123",
        "name": "Product A",
        "rating": 4.3,
        "price": 2999,
        "insight_score": 87.5,
        "sentiment_positive": 72.5
      },
      {
        "id": "prod_xyz789",
        "name": "Product B",
        "rating": 4.1,
        "price": 2499,
        "insight_score": 82.0,
        "sentiment_positive": 68.0
      }
    ],
    "winner": {
      "by_rating": "prod_abc123",
      "by_price": "prod_xyz789",
      "by_sentiment": "prod_abc123",
      "overall": "prod_abc123"
    },
    "differences": {
      "rating_diff": 0.2,
      "price_diff": 500,
      "sentiment_diff": 4.5
    }
  }
}
```

---

## 💬 Community API

### 1. Get All Posts
**Endpoint:** `GET /community/posts`

**Query Parameters:**
- `page` (int, default: 1)
- `per_page` (int, default: 20)
- `sort_by` (string: `popular`, `recent`, `controversial`)

**Response (200 OK):**
```json
{
  "success": true,
  "posts": [
    {
      "id": 1,
      "title": "Best budget headphones?",
      "content": "Looking for recommendations...",
      "author": "User123",
      "category": "Discussion",
      "upvotes": 15,
      "downvotes": 2,
      "comment_count": 8,
      "created_at": "2024-01-15T10:30:00"
    }
  ],
  "pagination": {...}
}
```

### 2. Create Post
**Endpoint:** `POST /community/posts`

**Request Body:**
```json
{
  "title": "Best budget headphones?",
  "content": "Looking for recommendations under ₹3000",
  "author": "User123",
  "category": "Discussion",
  "product_id": "prod_abc123"  // optional
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "post": {
    "id": 1,
    "title": "...",
    "created_at": "2024-01-15T10:30:00"
  }
}
```

### 3. Get Post Details
**Endpoint:** `GET /community/posts/{post_id}`

**Response (200 OK):**
```json
{
  "success": true,
  "post": {
    "id": 1,
    "title": "...",
    "content": "...",
    "comments": [
      {
        "id": 1,
        "content": "I recommend XYZ brand",
        "author": "Helper456",
        "upvotes": 5,
        "created_at": "2024-01-15T11:00:00"
      }
    ]
  }
}
```

### 4. Vote on Post
**Endpoint:** `POST /community/posts/{post_id}/vote`

**Request Body:**
```json
{
  "vote_type": "upvote"  // or "downvote"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "upvotes": 16,
  "downvotes": 2
}
```

### 5. Add Comment
**Endpoint:** `POST /community/posts/{post_id}/comments`

**Request Body:**
```json
{
  "content": "I recommend the Sony WH-1000XM4",
  "author": "Helper456"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "comment": {
    "id": 1,
    "content": "...",
    "author": "Helper456",
    "created_at": "2024-01-15T11:00:00"
  }
}
```

---

## ⭐ Favorites API

### 1. Get All Favorites
**Endpoint:** `GET /favorites`

**Query Parameters:**
- `page` (int, default: 1)
- `per_page` (int, default: 20)
- `sort_by` (string: `date_added`, `rating`, `price`)

**Response (200 OK):**
```json
{
  "success": true,
  "favorites": [
    {
      "id": 1,
      "product": {
        "id": "prod_abc123",
        "name": "Wireless Headphones",
        "price": 2999,
        "rating": 4.3,
        "image_url": "..."
      },
      "notes": "Want to buy during sale",
      "date_added": "2024-01-15T10:00:00"
    }
  ],
  "pagination": {...}
}
```

### 2. Add to Favorites
**Endpoint:** `POST /favorites`

**Request Body:**
```json
{
  "product_id": "prod_abc123",
  "notes": "Wait for sale"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "favorite": {
    "id": 1,
    "product_id": "prod_abc123",
    "notes": "Wait for sale",
    "date_added": "2024-01-15T10:00:00"
  }
}
```

### 3. Remove from Favorites
**Endpoint:** `DELETE /favorites/{favorite_id}`

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Product removed from favorites"
}
```

### 4. Check if Favorited
**Endpoint:** `GET /favorites/check/{product_id}`

**Response (200 OK):**
```json
{
  "success": true,
  "is_favorite": true,
  "favorite_id": 1
}
```

### 5. Update Favorite Notes
**Endpoint:** `PUT /favorites/{favorite_id}/notes`

**Request Body:**
```json
{
  "notes": "Updated notes"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "favorite": {
    "id": 1,
    "notes": "Updated notes"
  }
}
```

---

## 🏥 Health Check

**Endpoint:** `GET /health`

**Response (200 OK):**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T12:00:00"
}
```

---

## ❌ Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "error": "Invalid request data"
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": "Product not found"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Internal server error message"
}
```

---

## 🧪 Testing with cURL

### Analyze Amazon Product
```bash
curl -X POST http://localhost:5000/api/products/analyze \
  -H "Content-Type: application/json" \
  -d '{"url": "https://amzn.in/d/09ECDYo"}'
```

### Get All Products
```bash
curl http://localhost:5000/api/products?page=1&sort_by=rating
```

### Create Community Post
```bash
curl -X POST http://localhost:5000/api/community/posts \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Best budget phones?",
    "content": "Need recommendations",
    "author": "User123",
    "category": "Discussion"
  }'
```

### Add to Favorites
```bash
curl -X POST http://localhost:5000/api/favorites \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": "prod_abc123",
    "notes": "Buy during sale"
  }'
```

---

## 📝 Notes

1. **CORS**: All API endpoints support CORS for frontend access
2. **Pagination**: Most list endpoints support pagination
3. **Sorting**: Multiple sort options available
4. **Filtering**: Products can be filtered by various criteria
5. **Real-time**: Product analysis scrapes live data when possible
6. **AI-Powered**: Sentiment analysis uses Gemini 2.5 Flash
7. **Fallback**: Mock data used if scraping fails

---

## 🚀 Quick Start

1. **Start Backend:**
   ```bash
   cd backend
   .\start.bat
   ```

2. **Test Health:**
   ```bash
   curl http://localhost:5000/api/health
   ```

3. **Analyze Product:**
   ```bash
   curl -X POST http://localhost:5000/api/products/analyze \
     -H "Content-Type: application/json" \
     -d '{"url": "https://amzn.in/d/09ECDYo"}'
   ```

4. **Open Frontend:**
   - Just open `index.html` in browser
   - Frontend automatically connects to `http://localhost:5000/api`

---

**Your complete backend is ready!** 🎉
