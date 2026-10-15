"""
Analysis-related API routes
"""
import json
from flask import Blueprint, request, jsonify
from app import db
from app.models import Product, Review
from app.utils.sentiment import extract_common_terms

bp = Blueprint('analysis', __name__)


@bp.route('/<product_id>', methods=['GET'])
def get_analysis(product_id):
    """Get detailed analysis for a product"""
    try:
        product = Product.query.filter_by(product_id=product_id).first()

        if not product:
            return jsonify({'success': False, 'error': 'Product not found'}), 404

        # Get reviews with sentiment breakdown
        reviews = Review.query.filter_by(product_id=product.id).all()

        positive_reviews = [r for r in reviews if (r.sentiment or '').lower() == 'positive']
        neutral_reviews = [r for r in reviews if (r.sentiment or '').lower() == 'neutral']
        negative_reviews = [r for r in reviews if (r.sentiment or '').lower() == 'negative']

        # Get topics
        topics = product.topics.all()

        # Prioritize saved transformer common terms
        common_terms = None
        if getattr(product, 'common_terms', None):
            try:
                common_terms = json.loads(product.common_terms)
            except Exception:
                common_terms = None

        if not common_terms or not (common_terms.get('positive_terms') or common_terms.get('negative_terms')):
            review_dicts = [r.to_dict() for r in reviews]
            common_terms = extract_common_terms(review_dicts, limit=10)

        # Sort samples to present the most informative reviews
        sorted_positive = sorted(
            positive_reviews,
            key=lambda x: (x.rating or 5, x.sentiment_score or 0.0),
            reverse=True
        )
        sorted_negative = sorted(
            negative_reviews if negative_reviews else [r for r in reviews if r.rating and r.rating <= 3],
            key=lambda x: (-(x.rating or 1), x.sentiment_score or 0.0)
        )

        source = getattr(product, 'analysis_source', None) or 'roberta-bart-ensemble'
        if source in ('groq', 'ai', 'gemini'):
            source = 'roberta-bart-ensemble'
        elif source == 'local':
            source = 'roberta-lite-heuristic'
        
        return jsonify({
            'success': True,
            'analysis_source': source,
            'analysis': {
                'product': product.to_dict(),
                'sentiment': {
                    'positive': product.sentiment_positive,
                    'neutral': product.sentiment_neutral,
                    'negative': product.sentiment_negative,
                    'breakdown': {
                        'positive': len(positive_reviews),
                        'neutral': len(neutral_reviews),
                        'negative': len(negative_reviews)
                    }
                },
                'topics': [t.to_dict() for t in topics],
                'specs': {
                    'quality': product.spec_quality,
                    'value': product.spec_value,
                    'durability': product.spec_durability,
                    'features': product.spec_features,
                    'performance': product.spec_performance
                },
                'specs_data': (json.loads(product.specs_data) if getattr(product, 'specs_data', None) else []),
                'buyer_guide': (json.loads(product.buyer_guide) if getattr(product, 'buyer_guide', None) else None),
                'common_terms': common_terms,
                'reviews': {
                    'total': product.total_reviews,
                    'rating': product.rating,
                    'samples': {
                        'positive': [r.to_dict() for r in sorted_positive[:3]],
                        'negative': [r.to_dict() for r in sorted_negative[:3]]
                    }
                }
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@bp.route('/compare', methods=['POST'])
def compare_products():
    """Compare multiple products"""
    try:
        data = request.get_json()
        product_ids = data.get('productIds', [])
        
        if not product_ids or len(product_ids) < 2:
            return jsonify({'success': False, 'error': 'At least 2 products required'}), 400
        
        if len(product_ids) > 3:
            return jsonify({'success': False, 'error': 'Maximum 3 products allowed'}), 400
        
        # Get products
        products = []
        for pid in product_ids:
            product = Product.query.filter_by(product_id=pid).first()
            if product:
                products.append(product.to_dict())
        
        if len(products) < 2:
            return jsonify({'success': False, 'error': 'Products not found'}), 404
        
        return jsonify({
            'success': True,
            'comparison': {
                'products': products,
                'count': len(products)
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
