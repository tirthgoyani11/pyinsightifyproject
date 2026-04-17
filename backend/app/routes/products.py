"""
Product-related API routes
"""
from flask import Blueprint, request, jsonify
from app import db
from app.models import Product, Review
from app.utils.scraper import scrape_product_data, scrape_product_reviews
from app.utils.gemini import (
    analyze_review_sentiment,
    calculate_specs,
    generate_summary,
    analyze_sentiment
)
from app.utils.sentiment import (
    calculate_insight_score,
    extract_topics
)
from datetime import datetime
import hashlib

bp = Blueprint('products', __name__)


def generate_product_id(url):
    """Generate unique product ID from URL"""
    return hashlib.md5(url.encode()).hexdigest()[:12]


@bp.route('', methods=['GET'])
def get_products():
    """Get all products with optional filters"""
    try:
        # Get query parameters
        category = request.args.get('category')
        retailer = request.args.get('retailer')
        min_score = request.args.get('minScore', type=float)
        max_score = request.args.get('maxScore', type=float)
        sort_by = request.args.get('sortBy', 'recent')
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('limit', 10, type=int)
        
        # Build query
        query = Product.query
        
        if category:
            query = query.filter(Product.category == category)
        
        if retailer:
            query = query.filter(Product.retailer == retailer)
        
        if min_score is not None:
            query = query.filter(Product.insight_score >= min_score)
        
        if max_score is not None:
            query = query.filter(Product.insight_score <= max_score)
        
        # Sorting
        if sort_by == 'score-high':
            query = query.order_by(Product.insight_score.desc())
        elif sort_by == 'score-low':
            query = query.order_by(Product.insight_score.asc())
        elif sort_by == 'rating':
            query = query.order_by(Product.rating.desc())
        elif sort_by == 'reviews':
            query = query.order_by(Product.total_reviews.desc())
        else:  # recent
            query = query.order_by(Product.analyzed_at.desc())
        
        # Paginate
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        
        return jsonify({
            'success': True,
            'products': [p.to_dict() for p in pagination.items],
            'total': pagination.total,
            'page': page,
            'pages': pagination.pages
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@bp.route('/<product_id>', methods=['GET'])
def get_product(product_id):
    """Get single product with detailed analysis"""
    try:
        product = Product.query.filter_by(product_id=product_id).first()
        
        if not product:
            return jsonify({'success': False, 'error': 'Product not found'}), 404
        
        # Get reviews
        reviews = Review.query.filter_by(product_id=product.id).limit(100).all()
        
        # Get topics
        topics = product.topics.all()
        
        return jsonify({
            'success': True,
            'product': product.to_dict(),
            'reviews': [r.to_dict() for r in reviews],
            'topics': [t.to_dict() for t in topics]
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@bp.route('/analyze', methods=['POST'])
def analyze_product():
    """Analyze a product from URL"""
    try:
        data = request.get_json()
        url = data.get('url')
        
        if not url:
            return jsonify({'success': False, 'error': 'URL is required'}), 400
        
        # Generate product ID
        product_id = generate_product_id(url)
        
        # Check if already analyzed
        existing = Product.query.filter_by(product_id=product_id).first()
        if existing:
            return jsonify({
                'success': True,
                'message': 'Product already analyzed',
                'productId': product_id,
                'product': existing.to_dict()
            })
        
        # Scrape product data
        product_data = scrape_product_data(url)
        if not product_data:
            return jsonify({'success': False, 'error': 'Failed to scrape product'}), 500
        
        # Scrape reviews
        reviews_data = scrape_product_reviews(url, max_reviews=100)
        
        # Analyze sentiment with Gemini AI
        sentiment_analysis = analyze_review_sentiment(reviews_data)
        
        # Calculate specs with Gemini AI
        specs = calculate_specs(reviews_data)
        
        # Generate AI summary
        ai_summary = generate_summary(product_data['name'], reviews_data)
                # Calculate insight score
        insight_score = calculate_insight_score(
            sentiment_analysis,
            product_data.get('rating', 0),
            product_data.get('total_reviews', 0)
        )
        
        # Extract topics (using Gemini's topic analysis if available)
        topics_data = sentiment_analysis.get('topics', []) or extract_topics(reviews_data)
        
        # Extract strengths and weaknesses from Gemini analysis
        import json
        strengths = sentiment_analysis.get('strengths', [])
        weaknesses = sentiment_analysis.get('weaknesses', [])
        
        # Create product
        product = Product(
            product_id=product_id,
            name=product_data['name'],
            url=url,
            retailer=product_data['retailer'],
            price=product_data.get('price'),
            image_url=product_data.get('image_url'),
            rating=product_data.get('rating'),
            total_reviews=len(reviews_data),
            insight_score=insight_score,
            sentiment_positive=sentiment_analysis['positive'],
            sentiment_neutral=sentiment_analysis['neutral'],
            sentiment_negative=sentiment_analysis['negative'],
            spec_quality=specs.get('quality', 0),
            spec_value=specs.get('value', 0),
            spec_durability=specs.get('durability', 0),
            spec_features=specs.get('features', 0),
            spec_performance=specs.get('performance', 0),
            ai_summary=ai_summary,
            strengths=json.dumps(strengths),
            weaknesses=json.dumps(weaknesses),
            analyzed_at=datetime.utcnow()
        )
        
        db.session.add(product)
        db.session.flush()
        
        # Add reviews
        for review_data in reviews_data[:50]:  # Limit stored reviews
            review = Review(
                product_id=product.id,
                author=review_data.get('author', 'Anonymous'),
                rating=review_data.get('rating'),
                text=review_data.get('text'),
                verified=review_data.get('verified', False),
                helpful_count=review_data.get('helpful_count', 0),
                sentiment=review_data.get('sentiment'),
                sentiment_score=review_data.get('score', 0),
                review_date=datetime.utcnow()
            )
            db.session.add(review)
        
        # Add topics
        from app.models import Topic
        for topic_data in topics_data:
            topic = Topic(
                product_id=product.id,
                name=topic_data['name'],
                sentiment=topic_data['sentiment'],
                mention_count=topic_data.get('mentions', topic_data.get('mention_count', 0)),
                score=topic_data.get('score', 0)
            )
            db.session.add(topic)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Product analyzed successfully',
            'productId': product_id,
            'product': product.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


@bp.route('/recent', methods=['GET'])
def get_recent_products():
    """Get recently analyzed products"""
    try:
        limit = request.args.get('limit', 10, type=int)
        
        products = Product.query.order_by(Product.analyzed_at.desc()).limit(limit).all()
        
        return jsonify({
            'success': True,
            'products': [p.to_dict() for p in products]
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@bp.route('/categories', methods=['GET'])
def get_categories():
    """Get all product categories"""
    try:
        categories = db.session.query(Product.category).distinct().all()
        categories = [c[0] for c in categories if c[0]]
        
        return jsonify({
            'success': True,
            'categories': categories
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@bp.route('/retailers', methods=['GET'])
def get_retailers():
    """Get all retailers"""
    try:
        retailers = db.session.query(Product.retailer).distinct().all()
        retailers = [r[0] for r in retailers if r[0]]
        
        return jsonify({
            'success': True,
            'retailers': retailers
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
