# Insightify Architecture Diagram

## System Overview
```
┌─────────────────────────────────────────────────────────────────┐
│                         USER BROWSER                             │
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    FRONTEND (Port 5500)                    │  │
│  │                                                             │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │  │
│  │  │  HTML    │  │   CSS    │  │JavaScript│  │Chart.js  │  │  │
│  │  │  Pages   │  │  Styles  │  │  Logic   │  │  Viz     │  │  │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │  │
│  │                       │                                     │  │
│  │                       ▼                                     │  │
│  │                  ┌──────────┐                              │  │
│  │                  │ api.js   │  ◄── Centralized API layer  │  │
│  │                  └──────────┘                              │  │
│  └─────────────────────┼────────────────────────────────────┘  │
│                        │ HTTP Requests                          │
│                        │ (fetch API)                            │
└────────────────────────┼────────────────────────────────────────┘
                         │
                         │ CORS-enabled
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND API (Port 5000)                       │
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    Flask Application                       │  │
│  │                                                             │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐           │  │
│  │  │  Products  │  │ Community  │  │  Analysis  │           │  │
│  │  │   Routes   │  │   Routes   │  │   Routes   │           │  │
│  │  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘           │  │
│  │        │               │                │                   │  │
│  │        └───────────────┴────────────────┘                   │  │
│  │                        │                                     │  │
│  │                        ▼                                     │  │
│  │                ┌───────────────┐                            │  │
│  │                │  SQLAlchemy   │  ◄── ORM Layer            │  │
│  │                │    Models     │                            │  │
│  │                └───────┬───────┘                            │  │
│  │                        │                                     │  │
│  │        ┌───────────────┼───────────────┐                    │  │
│  │        │               │               │                    │  │
│  │        ▼               ▼               ▼                    │  │
│  │  ┌─────────┐    ┌──────────┐    ┌──────────┐              │  │
│  │  │Scraper  │    │Sentiment │    │  Utils   │              │  │
│  │  │  Utils  │    │ Analysis │    │ Helpers  │              │  │
│  │  └─────────┘    └──────────┘    └──────────┘              │  │
│  │                                                             │  │
│  └─────────────────────┼────────────────────────────────────┘  │
│                        │                                        │
│                        ▼                                        │
│              ┌──────────────────┐                              │
│              │  SQLite Database │                              │
│              │  (insightify.db) │                              │
│              └──────────────────┘                              │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

### Product Analysis Flow
```
1. User submits product URL
   │
   ▼
2. Frontend validates input
   │
   ▼
3. POST /api/products/analyze
   │
   ▼
4. Backend scrapes product data
   │
   ▼
5. Backend scrapes reviews
   │
   ▼
6. Sentiment analysis on reviews
   │
   ▼
7. Calculate insight score & specs
   │
   ▼
8. Save to database (Product, Reviews, Topics)
   │
   ▼
9. Return product ID to frontend
   │
   ▼
10. Redirect to analysis page
```

### Browse Products Flow
```
1. User opens browse page
   │
   ▼
2. GET /api/products?filters
   │
   ▼
3. Backend queries database with filters
   │
   ▼
4. Return paginated results
   │
   ▼
5. Frontend displays products
   │
   ▼
6. User applies filters/sort
   │
   ▼
7. Repeat from step 2
```

### Community Post Flow
```
1. User creates post
   │
   ▼
2. Frontend validates form
   │
   ▼
3. POST /api/community/posts
   │
   ▼
4. Backend saves post to database
   │
   ▼
5. Return created post
   │
   ▼
6. Frontend adds to list
   │
   ▼
7. User votes on posts
   │
   ▼
8. POST /api/community/posts/:id/vote
   │
   ▼
9. Update vote count in database
```

## File Structure Map

### Frontend Files
```
frontend/
├── index.html              ──┐
├── submit.html               │
├── browse.html               │
├── analysis.html             ├── HTML Pages (7 files)
├── compare.html              │
├── community.html            │
└── 404.html                ──┘
├── css/
│   ├── global.css          ──┐
│   ├── components.css        │
│   ├── pages.css             ├── Stylesheets (5 files)
│   ├── utilities.css         │
│   └── loading.css         ──┘
└── js/
    ├── main.js             ──┐
    ├── submit.js             │
    ├── browse.js             │
    ├── analysis.js           ├── JavaScript (7 files)
    ├── compare.js            │
    ├── community.js          │
    └── api.js              ──┘ ◄── API Service Layer
```

### Backend Files
```
backend/
├── app/
│   ├── __init__.py         ──── Flask app factory
│   ├── models.py           ──── Database models (6 models)
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── products.py     ──── Product API endpoints
│   │   ├── community.py    ──── Community API endpoints
│   │   └── analysis.py     ──── Analysis API endpoints
│   └── utils/
│       ├── __init__.py
│       ├── scraper.py      ──── Web scraping utility
│       └── sentiment.py    ──── Sentiment analysis
├── config.py               ──── Configuration
├── run.py                  ──── Application entry
├── requirements.txt        ──── Dependencies
├── .env                    ──── Environment variables
├── setup.bat               ──── Setup script
└── start.bat               ──── Start script
```

## Technology Stack Map

```
┌─────────────────────────────────────────────────────────────────┐
│                         PRESENTATION LAYER                       │
├─────────────────────────────────────────────────────────────────┤
│  HTML5  │  CSS3  │  JavaScript ES6+  │  Chart.js 4.4.0         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ HTTP/JSON
┌─────────────────────────────────────────────────────────────────┐
│                         APPLICATION LAYER                        │
├─────────────────────────────────────────────────────────────────┤
│  Flask 3.0  │  Flask-CORS  │  Flask-SQLAlchemy  │ Flask-Migrate │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ SQL
┌─────────────────────────────────────────────────────────────────┐
│                           DATA LAYER                             │
├─────────────────────────────────────────────────────────────────┤
│              SQLite (dev) / PostgreSQL (prod)                    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                         UTILITY SERVICES                         │
├─────────────────────────────────────────────────────────────────┤
│  TextBlob (NLP)  │  BeautifulSoup4 (Scraping)  │  Requests      │
└─────────────────────────────────────────────────────────────────┘
```

## Database Schema Diagram

```
┌──────────────────────┐
│      Product         │
├──────────────────────┤
│ id (PK)             │
│ product_id (unique) │
│ name                │
│ url                 │
│ category            │
│ retailer            │
│ price               │
│ insight_score       │
│ rating              │
│ total_reviews       │
│ sentiment_*         │
│ spec_*              │
│ analyzed_at         │
└──────┬───────────────┘
       │
       │ 1:N
       ▼
┌──────────────────────┐         ┌──────────────────────┐
│      Review          │         │       Topic          │
├──────────────────────┤         ├──────────────────────┤
│ id (PK)             │         │ id (PK)             │
│ product_id (FK)     │         │ product_id (FK)     │
│ author              │         │ name                │
│ rating              │         │ sentiment           │
│ text                │         │ mention_count       │
│ sentiment           │         │ score               │
│ verified            │         └─────────────────────┘
│ helpful_count       │
└─────────────────────┘

┌──────────────────────┐
│        Post          │
├──────────────────────┤
│ id (PK)             │
│ title               │
│ content             │
│ category            │
│ tags                │
│ product_id (FK)     │
│ author              │
│ votes               │
│ comment_count       │
│ view_count          │
└──────┬───────────────┘
       │
       │ 1:N
       ▼
┌──────────────────────┐
│      Comment         │
├──────────────────────┤
│ id (PK)             │
│ post_id (FK)        │
│ content             │
│ author              │
│ votes               │
└─────────────────────┘

┌──────────────────────┐
│      Favorite        │
├──────────────────────┤
│ id (PK)             │
│ session_id          │
│ product_id (FK)     │
└─────────────────────┘
```

## API Endpoint Map

```
/api
├── /products
│   ├── GET    /                  ──── Get all products (with filters)
│   ├── POST   /analyze           ──── Analyze new product
│   ├── GET    /:id               ──── Get single product
│   ├── GET    /recent            ──── Get recent products
│   ├── GET    /categories        ──── Get all categories
│   └── GET    /retailers         ──── Get all retailers
│
├── /community
│   ├── GET    /posts             ──── Get all posts (with filters)
│   ├── POST   /posts             ──── Create new post
│   ├── GET    /posts/:id         ──── Get single post
│   ├── POST   /posts/:id/vote    ──── Vote on post
│   ├── POST   /posts/:id/comments──── Add comment
│   └── GET    /categories        ──── Get post categories
│
└── /analysis
    ├── GET    /:id               ──── Get detailed analysis
    └── POST   /compare           ──── Compare products
```

## Deployment Architecture (Future)

```
┌─────────────────────────────────────────────────────────────────┐
│                         PRODUCTION SETUP                         │
└─────────────────────────────────────────────────────────────────┘

┌──────────────┐
│    Users     │
└──────┬───────┘
       │ HTTPS
       ▼
┌──────────────────┐
│   CDN (Static)   │  ◄── Frontend assets
└──────────────────┘

       │
       ▼
┌──────────────────┐
│  Load Balancer   │
└──────┬───────────┘
       │
       ├─────────┬─────────┐
       ▼         ▼         ▼
┌─────────┐ ┌─────────┐ ┌─────────┐
│ Flask 1 │ │ Flask 2 │ │ Flask 3 │  ◄── Application servers
└────┬────┘ └────┬────┘ └────┬────┘
     │           │           │
     └───────────┴───────────┘
                 │
                 ▼
┌─────────────────────────────┐
│  PostgreSQL Database        │  ◄── Primary database
│  + Redis Cache              │  ◄── Session/cache layer
└─────────────────────────────┘
```

## Security Flow (Future with Auth)

```
1. User Login
   │
   ▼
2. Generate JWT Token
   │
   ▼
3. Store in localStorage
   │
   ▼
4. Include in API requests (Authorization header)
   │
   ▼
5. Backend validates token
   │
   ▼
6. Process request if valid
   │
   ▼
7. Return data
```

## Legend

```
┌─────┐
│ Box │  = Component/Service
└─────┘

  │
  ▼     = Data flow direction

 ◄──    = Points to/refers to

 1:N    = One-to-many relationship

 (PK)   = Primary Key
 (FK)   = Foreign Key
```
