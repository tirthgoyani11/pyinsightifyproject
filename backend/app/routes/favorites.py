"""
Favorites/Watchlist API routes
"""
from flask import Blueprint, request, jsonify
from app import db
from app.models import Favorite, Product
from datetime import datetime

bp = Blueprint('favorites', __name__, url_prefix='/api/favorites')


@bp.route('', methods=['GET'])
def get_favorites():
    """Get all favorited products"""
    try:
        # Get query parameters
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        sort_by = request.args.get('sort_by', 'date_added')  # date_added, rating, price
        
        # Build query
        query = Favorite.query.join(Product)
        
        # Apply sorting
        if sort_by == 'date_added':
            query = query.order_by(Favorite.created_at.desc())
        elif sort_by == 'rating':
            query = query.order_by(Product.rating.desc())
        elif sort_by == 'price':
            query = query.order_by(Product.price.asc())
        
        # Paginate
        favorites = query.paginate(page=page, per_page=per_page, error_out=False)
        
        return jsonify({
            'success': True,
            'favorites': [{
                'id': fav.id,
                'product': {
                    'id': fav.product.id,
                    'name': fav.product.name,
                    'price': fav.product.price,
                    'rating': fav.product.rating,
                    'total_reviews': fav.product.total_reviews,
                    'image_url': fav.product.image_url,
                    'insight_score': fav.product.insight_score,
                    'sentiment_positive': fav.product.sentiment_positive,
                    'retailer': fav.product.retailer
                },
                'notes': fav.notes,
                'date_added': fav.created_at.isoformat()
            } for fav in favorites.items],
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': favorites.total,
                'pages': favorites.pages
            }
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@bp.route('', methods=['POST'])
def add_favorite():
    """Add product to favorites"""
    try:
        data = request.get_json()
        product_id = data.get('product_id')
        notes = data.get('notes', '')
        
        if not product_id:
            return jsonify({
                'success': False,
                'error': 'Product ID is required'
            }), 400
        
        # Check if product exists
        product = Product.query.get(product_id)
        if not product:
            return jsonify({
                'success': False,
                'error': 'Product not found'
            }), 404
        
        # Check if already favorited
        existing = Favorite.query.filter_by(product_id=product_id).first()
        if existing:
            return jsonify({
                'success': False,
                'error': 'Product already in favorites'
            }), 400
        
        # Create favorite
        favorite = Favorite(
            product_id=product_id,
            notes=notes
        )
        
        db.session.add(favorite)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'favorite': {
                'id': favorite.id,
                'product_id': product_id,
                'notes': notes,
                'date_added': favorite.created_at.isoformat()
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@bp.route('/<int:favorite_id>', methods=['DELETE'])
def remove_favorite(favorite_id):
    """Remove product from favorites"""
    try:
        favorite = Favorite.query.get(favorite_id)
        
        if not favorite:
            return jsonify({
                'success': False,
                'error': 'Favorite not found'
            }), 404
        
        db.session.delete(favorite)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Product removed from favorites'
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@bp.route('/check/<product_id>', methods=['GET'])
def check_favorite(product_id):
    """Check if product is favorited"""
    try:
        favorite = Favorite.query.filter_by(product_id=product_id).first()
        
        return jsonify({
            'success': True,
            'is_favorite': favorite is not None,
            'favorite_id': favorite.id if favorite else None
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@bp.route('/<int:favorite_id>/notes', methods=['PUT'])
def update_notes(favorite_id):
    """Update favorite notes"""
    try:
        data = request.get_json()
        notes = data.get('notes', '')
        
        favorite = Favorite.query.get(favorite_id)
        
        if not favorite:
            return jsonify({
                'success': False,
                'error': 'Favorite not found'
            }), 404
        
        favorite.notes = notes
        db.session.commit()
        
        return jsonify({
            'success': True,
            'favorite': {
                'id': favorite.id,
                'notes': notes
            }
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
