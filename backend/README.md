# Insightify Backend

Flask-based backend API for the Insightify product review analysis platform.

## Features

- Product analysis with sentiment analysis
- Review scraping and processing
- Community posts and discussions
- RESTful API endpoints
- SQLite database (development)

## Setup

1. **Create virtual environment:**
   ```bash
   python -m venv venv
   venv\Scripts\activate  # Windows
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Download TextBlob corpora:**
   ```bash
   python -m textblob.download_corpora
   ```

4. **Set up environment:**
   ```bash
   copy .env.example .env
   ```

5. **Initialize database:**
   ```bash
   flask init-db
   flask seed-db  # Optional: add sample data
   ```

6. **Run server:**
   ```bash
   python run.py
   ```

Server runs on `http://localhost:5000`

## API Endpoints

### Products
- `POST /api/products/analyze` - Analyze product from URL
- `GET /api/products` - Get all products (with filters)
- `GET /api/products/<id>` - Get single product
- `GET /api/products/recent` - Get recent products

### Community
- `GET /api/community/posts` - Get all posts
- `POST /api/community/posts` - Create new post
- `GET /api/community/posts/<id>` - Get single post
- `POST /api/community/posts/<id>/vote` - Vote on post

### Analysis
- `GET /api/analysis/<product_id>` - Get detailed analysis
- `POST /api/analysis/compare` - Compare products

## Database Schema

- **Product** - Product information and analysis
- **Review** - Customer reviews
- **Topic** - Extracted topics/themes
- **Post** - Community posts
- **Comment** - Post comments
- **Favorite** - User favorites

## Tech Stack

- Flask 3.0
- SQLAlchemy (ORM)
- TextBlob (Sentiment Analysis)
- BeautifulSoup4 (Web Scraping)
- Flask-CORS
- SQLite/PostgreSQL
