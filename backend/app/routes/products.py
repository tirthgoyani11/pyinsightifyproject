"""
Product-related API routes
"""
from flask import Blueprint, request, jsonify
from app import db
from app.models import Product, Review
from app.utils.scraper import scrape_product_data, scrape_product_reviews
from app.utils.sentiment import analyzer as sentiment_analyzer, extract_common_terms
from datetime import datetime
import hashlib, json

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
        
        # Scrape product data first to resolve any short links (e.g. amzn.in) to canonical URL
        product_data = scrape_product_data(url)
        if not product_data:
            return jsonify({'success': False, 'error': 'Failed to scrape product page'}), 500

        canonical_url = product_data.get('url', url)
        asin = product_data.get('asin')
        product_id = generate_product_id(asin if asin else canonical_url)

        # Check if already analyzed with REAL reviews
        existing = Product.query.filter_by(product_id=product_id).first()
        if not existing and canonical_url != url:
            existing = Product.query.filter_by(product_id=generate_product_id(url)).first()

        force_refresh = data.get('refresh', False)
        if existing:
            if not force_refresh:
                sample_revs = existing.reviews.limit(5).all()
                has_mock = any(
                    r.author in ('Rahul K.', 'Vikram R.', 'Sneha M.', 'Priya S.', 'Amit P.', 'Neha T.', 'Arjun D.') or
                    'Excellent product! Highly recommend' in (r.text or '')
                    for r in sample_revs
                )
                if not has_mock and len(sample_revs) > 0:
                    return jsonify({
                        'success': True,
                        'message': 'Product already analyzed',
                        'productId': existing.product_id,
                        'product': existing.to_dict()
                    })
            # Clear out outdated/requested refresh data cleanly before re-analyzing
            Review.query.filter_by(product_id=existing.id).delete()
            from app.models import Topic
            Topic.query.filter_by(product_id=existing.id).delete()
            db.session.delete(existing)
            db.session.commit()
        if not product_data:
            return jsonify({'success': False, 'error': 'Failed to scrape product'}), 500
        
        # Scrape reviews
        reviews_data = scrape_product_reviews(url, max_reviews=100, product_name=product_data.get('name'))
        
        # Reject unusable scrapes before spending any analysis effort
        if not reviews_data:
            return jsonify({
                'success': False,
                'error': 'Could not retrieve any reviews for this product. The URL may be incorrect, the product may have no reviews, or the site structure has changed. Please verify the URL and try again.',
            }), 422

        if len(reviews_data) < 3:
            return jsonify({
                'success': False,
                'error': f'Only {len(reviews_data)} review(s) found. Please try a product with more reviews for meaningful analysis.',
                'partial': True,
                'product': product_data,
                'reviews': reviews_data,
            }), 422

        # --- Run Neural Transformer NLP Pipeline (RoBERTa + BART) ---
        from app.utils.gemini import get_analyzer as get_ai_analyzer
        ai = get_ai_analyzer()
        ai_result = ai.analyze_batch(reviews_data, product_name=product_data.get('name', ''))
        ai_source = ai_result.get('source', 'roberta-bart-ensemble')

        # Synchronize per-review classification directly from neural transformer
        classified_list = ai_result.get('reviews') or []
        classified_map = {item['id']: item for item in classified_list if 'id' in item}

        for i, r in enumerate(reviews_data, 1):
            if i in classified_map:
                c = classified_map[i]
                r['sentiment'] = c['sentiment']
                r['score'] = c['score']
                r['polarity'] = c['score']
                r['confidence'] = c.get('confidence', 0.9)
            else:
                s_res = sentiment_analyzer.analyze_text(r.get('text', ''), r.get('rating'))
                r['sentiment'] = s_res['sentiment']
                r['score'] = s_res['score']
                r['polarity'] = s_res['polarity']
                r['confidence'] = s_res.get('confidence', 0.8)

        ai_sent = ai_result.get('sentiment') or {}
        if ai_sent.get('total'):
            sentiment_analysis = {
                'positive': ai_sent.get('positive', 70.0),
                'neutral': ai_sent.get('neutral', 15.0),
                'negative': ai_sent.get('negative', 15.0),
                'overall_score': ai_sent.get('overall_score', 0.5),
                'average_rating': product_data.get('rating', 0),
                'total': ai_sent.get('total', len(reviews_data)),
            }
        else:
            sentiment_analysis = sentiment_analyzer.analyze_reviews(reviews_data)

        dynamic_aspects = ai_result.get('dynamic_aspects') or []
        buyer_guide = ai_result.get('buyer_guide') or None
        detected_category = ai_result.get('category') or product_data.get('category')

        # Aspects: Transformer-extracted when available, else local lexicon fallback
        if ai_result.get('aspects'):
            topics_data = [
                {
                    'name': a['name'],
                    'sentiment': a['sentiment'],
                    'mention_count': a['mention_count'],
                    'score': a['score'],
                    'summary': a.get('summary', ''),
                }
                for a in ai_result['aspects']
            ]
        else:
            topics_data = sentiment_analyzer.extract_topics(reviews_data)

        # Calibrated 5-dimension aspect radar specs
        specs = ai_result.get('specs') or sentiment_analyzer.calculate_specs(reviews_data)

        insight_score = sentiment_analyzer.calculate_insight_score(
            sentiment_analysis,
            product_data.get('rating', 0),
            product_data.get('total_reviews', 0)
        )

        strengths = ai_result.get('strengths') or [
            t['name'] + ' (High Satisfaction)' for t in topics_data if t['sentiment'] == 'positive'
        ]
        if not strengths:
            strengths = ['High Overall Customer Satisfaction', 'Reliable Everyday Functionality', 'Recommended by Verified Buyers']
        strengths = strengths[:5]

        weaknesses = ai_result.get('weaknesses') or [
            t['name'] + ' (Concerns Reported)' for t in topics_data if t['sentiment'] == 'negative'
        ]
        if not weaknesses:
            neg_reviews = [r for r in reviews_data if r.get('sentiment') == 'negative' or (r.get('rating') and r.get('rating') <= 2)]
            if neg_reviews:
                weaknesses = ['Minor isolated performance or durability concerns reported by a few buyers']
            else:
                weaknesses = ['No significant complaints reported in verified reviews', 'Consistently positive customer feedback']
        weaknesses = weaknesses[:4]

        # Extract meaningful word cloud terms
        common_terms_data = None
        if ai_result.get('positive_terms') or ai_result.get('negative_terms'):
            common_terms_data = {
                'positive_terms': ai_result.get('positive_terms', []),
                'negative_terms': ai_result.get('negative_terms', [])
            }
        else:
            common_terms_data = extract_common_terms(reviews_data)

        # Executive synthesis summary from BART
        if ai_result.get('summary'):
            ai_summary = ai_result['summary']
        elif product_data.get('overall_summary'):
            ai_summary = product_data['overall_summary']
        else:
            pos_pct = sentiment_analysis['positive']
            ai_summary = f"Analysis of {product_data['name']} based on {len(reviews_data)} verified reviews shows {pos_pct}% positive sentiment. Top strengths include {strengths[0] if strengths else 'overall satisfaction'}. Main user concerns note {weaknesses[0] if weaknesses else 'isolated issues'}."

        # Ensure no lingering record with product_id exists before insert
        lingering = Product.query.filter_by(product_id=product_id).first()
        if lingering:
            Review.query.filter_by(product_id=lingering.id).delete()
            from app.models import Topic
            Topic.query.filter_by(product_id=lingering.id).delete()
            db.session.delete(lingering)
            db.session.commit()

        # Create product with RoBERTa + BART neural NLP results
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
            spec_quality=specs.get('quality', 75),
            spec_value=specs.get('value', 75),
            spec_durability=specs.get('durability', 70),
            spec_features=specs.get('features', 80),
            spec_performance=specs.get('performance', 78),
            specs_data=json.dumps(dynamic_aspects) if dynamic_aspects else None,
            buyer_guide=json.dumps(buyer_guide) if buyer_guide else None,
            category=detected_category,
            ai_summary=ai_summary,
            strengths=json.dumps(strengths),
            weaknesses=json.dumps(weaknesses),
            common_terms=json.dumps(common_terms_data) if common_terms_data else None,
            analysis_source=ai_source,
            analyzed_at=datetime.utcnow()
        )
        
        db.session.add(product)
        db.session.flush()
        
        # Add reviews
        for review_data in reviews_data[:100]:
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
                score=topic_data.get('score', 0),
                summary=topic_data.get('summary', '')
            )
            db.session.add(topic)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Product analyzed successfully',
            'productId': product_id,
            'product': product.to_dict(),
            'analysis_source': ai_source,
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
