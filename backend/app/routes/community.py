"""
Community-related API routes
"""
from flask import Blueprint, request, jsonify
from app import db
from app.models import Post, Comment, Product
from datetime import datetime

bp = Blueprint('community', __name__)


@bp.route('/posts', methods=['GET'])
def get_posts():
    """Get all community posts"""
    try:
        # Get query parameters
        sort_by = request.args.get('sortBy', 'recent')
        category = request.args.get('category')
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('limit', 20, type=int)
        
        # Build query
        query = Post.query
        
        if category:
            query = query.filter(Post.category == category)
        
        # Sorting
        if sort_by == 'popular':
            query = query.order_by(Post.votes.desc())
        elif sort_by == 'discussed':
            query = query.order_by(Post.comment_count.desc())
        else:  # recent
            query = query.order_by(Post.created_at.desc())
        
        # Paginate
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        
        return jsonify({
            'success': True,
            'posts': [p.to_dict() for p in pagination.items],
            'total': pagination.total,
            'page': page,
            'pages': pagination.pages
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@bp.route('/posts', methods=['POST'])
def create_post():
    """Create a new community post"""
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data.get('title'):
            return jsonify({'success': False, 'error': 'Title is required'}), 400
        
        if not data.get('content'):
            return jsonify({'success': False, 'error': 'Content is required'}), 400
        
        # Check if product exists
        product_id = None
        if data.get('productId'):
            product = Product.query.filter_by(product_id=data['productId']).first()
            if product:
                product_id = product.id
        
        # Create post
        post = Post(
            title=data['title'],
            content=data['content'],
            category=data.get('category', 'General'),
            tags=','.join(data.get('tags', [])),
            product_id=product_id,
            author=data.get('author', 'Anonymous'),
            verified=False
        )
        
        db.session.add(post)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Post created successfully',
            'post': post.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


@bp.route('/posts/<int:post_id>', methods=['GET'])
def get_post(post_id):
    """Get a single post with comments"""
    try:
        post = Post.query.get(post_id)
        
        if not post:
            return jsonify({'success': False, 'error': 'Post not found'}), 404
        
        # Increment view count
        post.view_count += 1
        db.session.commit()
        
        # Get comments
        comments = Comment.query.filter_by(post_id=post.id).order_by(Comment.created_at.desc()).all()
        
        return jsonify({
            'success': True,
            'post': post.to_dict(),
            'comments': [c.to_dict() for c in comments]
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@bp.route('/posts/<int:post_id>/vote', methods=['POST'])
def vote_post(post_id):
    """Vote on a post"""
    try:
        data = request.get_json()
        vote_type = data.get('type')  # 'up' or 'down'
        
        if vote_type not in ['up', 'down']:
            return jsonify({'success': False, 'error': 'Invalid vote type'}), 400
        
        post = Post.query.get(post_id)
        
        if not post:
            return jsonify({'success': False, 'error': 'Post not found'}), 404
        
        # Update votes
        if vote_type == 'up':
            post.votes += 1
        else:
            post.votes -= 1
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'votes': post.votes
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


@bp.route('/posts/<int:post_id>/comments', methods=['POST'])
def create_comment(post_id):
    """Create a comment on a post"""
    try:
        data = request.get_json()
        
        if not data.get('content'):
            return jsonify({'success': False, 'error': 'Content is required'}), 400
        
        post = Post.query.get(post_id)
        
        if not post:
            return jsonify({'success': False, 'error': 'Post not found'}), 404
        
        # Create comment
        comment = Comment(
            post_id=post.id,
            content=data['content'],
            author=data.get('author', 'Anonymous')
        )
        
        db.session.add(comment)
        
        # Update comment count
        post.comment_count += 1
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Comment created successfully',
            'comment': comment.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


@bp.route('/posts/<int:post_id>', methods=['PUT'])
def update_post(post_id):
    """Update a post"""
    try:
        data = request.get_json()
        
        post = Post.query.get(post_id)
        
        if not post:
            return jsonify({'success': False, 'error': 'Post not found'}), 404
        
        # Update fields
        if 'title' in data:
            post.title = data['title']
        if 'content' in data:
            post.content = data['content']
        if 'category' in data:
            post.category = data['category']
        if 'tags' in data:
            post.tags = ','.join(data['tags']) if isinstance(data['tags'], list) else data['tags']
        
        post.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Post updated successfully',
            'post': post.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


@bp.route('/posts/<int:post_id>', methods=['DELETE'])
def delete_post(post_id):
    """Delete a post"""
    try:
        post = Post.query.get(post_id)
        
        if not post:
            return jsonify({'success': False, 'error': 'Post not found'}), 404
        
        db.session.delete(post)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Post deleted successfully'
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


@bp.route('/comments/<int:comment_id>', methods=['PUT'])
def update_comment(comment_id):
    """Update a comment"""
    try:
        data = request.get_json()
        
        if not data.get('content'):
            return jsonify({'success': False, 'error': 'Content is required'}), 400
        
        comment = Comment.query.get(comment_id)
        
        if not comment:
            return jsonify({'success': False, 'error': 'Comment not found'}), 404
        
        comment.content = data['content']
        comment.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Comment updated successfully',
            'comment': comment.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


@bp.route('/comments/<int:comment_id>', methods=['DELETE'])
def delete_comment(comment_id):
    """Delete a comment"""
    try:
        comment = Comment.query.get(comment_id)
        
        if not comment:
            return jsonify({'success': False, 'error': 'Comment not found'}), 404
        
        # Update post comment count
        post = Post.query.get(comment.post_id)
        if post:
            post.comment_count = max(0, post.comment_count - 1)
        
        db.session.delete(comment)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Comment deleted successfully'
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


@bp.route('/comments/<int:comment_id>/vote', methods=['POST'])
def vote_comment(comment_id):
    """Vote on a comment"""
    try:
        data = request.get_json()
        vote_type = data.get('type')  # 'up' or 'down'
        
        if vote_type not in ['up', 'down']:
            return jsonify({'success': False, 'error': 'Invalid vote type'}), 400
        
        comment = Comment.query.get(comment_id)
        
        if not comment:
            return jsonify({'success': False, 'error': 'Comment not found'}), 404
        
        # Update votes
        if vote_type == 'up':
            comment.votes += 1
        else:
            comment.votes -= 1
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'votes': comment.votes
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


@bp.route('/categories', methods=['GET'])
def get_categories():
    """Get all post categories"""
    try:
        categories = db.session.query(Post.category).distinct().all()
        categories = [c[0] for c in categories if c[0]]
        
        # Add default categories if none exist
        if not categories:
            categories = ['General', 'Questions', 'Reviews', 'Recommendations']
        
        return jsonify({
            'success': True,
            'categories': categories
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@bp.route('/stats', methods=['GET'])
def get_stats():
    """Get community statistics"""
    try:
        total_posts = Post.query.count()
        total_comments = Comment.query.count()
        total_votes = db.session.query(db.func.sum(Post.votes)).scalar() or 0
        
        # Get active discussions (posts with comments in last 7 days)
        from datetime import timedelta
        week_ago = datetime.utcnow() - timedelta(days=7)
        active_discussions = Post.query.filter(Post.updated_at >= week_ago).count()
        
        return jsonify({
            'success': True,
            'stats': {
                'totalPosts': total_posts,
                'totalComments': total_comments,
                'totalVotes': total_votes,
                'activeDiscussions': active_discussions
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
