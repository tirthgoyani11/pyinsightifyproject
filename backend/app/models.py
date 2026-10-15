"""
Database models for Insightify
"""
from datetime import datetime
from app.utils.review_quality import clean_review_text
from werkzeug.security import generate_password_hash, check_password_hash
from app import db


class User(db.Model):
    """User authentication model"""
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    
    is_active = db.Column(db.Boolean, default=True)
    is_admin = db.Column(db.Boolean, default=False)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_login = db.Column(db.DateTime)
    
    # Relationships
    profile = db.relationship('UserProfile', backref='user', uselist=False, cascade='all, delete-orphan')
    posts = db.relationship('Post', backref='user', lazy='dynamic', cascade='all, delete-orphan')
    comments = db.relationship('Comment', backref='user', lazy='dynamic', cascade='all, delete-orphan')
    analyzed_products = db.relationship('UserProduct', backref='user', lazy='dynamic', cascade='all, delete-orphan')
    favorites = db.relationship('Favorite', backref='user', lazy='dynamic', cascade='all, delete-orphan')
    
    def set_password(self, password):
        """Hash and set password"""
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        """Check if password matches hash"""
        return check_password_hash(self.password_hash, password)
    
    def to_dict(self, include_email=False):
        """Convert to dictionary"""
        data = {
            'id': self.id,
            'username': self.username,
            'isActive': self.is_active,
            'isAdmin': self.is_admin,
            'createdAt': self.created_at.isoformat(),
            'lastLogin': self.last_login.isoformat() if self.last_login else None
        }
        if include_email:
            data['email'] = self.email
        if self.profile:
            data['profile'] = self.profile.to_dict()
        return data


class UserProfile(db.Model):
    """User profile information"""
    __tablename__ = 'user_profiles'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, unique=True)
    
    full_name = db.Column(db.String(200))
    bio = db.Column(db.Text)
    avatar_url = db.Column(db.Text)
    location = db.Column(db.String(200))
    website = db.Column(db.String(500))
    
    # Statistics
    total_posts = db.Column(db.Integer, default=0)
    total_comments = db.Column(db.Integer, default=0)
    total_products_analyzed = db.Column(db.Integer, default=0)
    reputation_score = db.Column(db.Integer, default=0)
    
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            'fullName': self.full_name,
            'bio': self.bio,
            'avatarUrl': self.avatar_url,
            'location': self.location,
            'website': self.website,
            'stats': {
                'posts': self.total_posts,
                'comments': self.total_comments,
                'productsAnalyzed': self.total_products_analyzed,
                'reputation': self.reputation_score
            }
        }


class UserProduct(db.Model):
    """Track user's analyzed products"""
    __tablename__ = 'user_products'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False, index=True)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    __table_args__ = (db.UniqueConstraint('user_id', 'product_id'),)
    
    product = db.relationship('Product', backref='user_analyses')


class Product(db.Model):
    """Product model"""
    __tablename__ = 'products'
    
    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.String(100), unique=True, nullable=False, index=True)
    name = db.Column(db.String(500), nullable=False)
    url = db.Column(db.Text, nullable=False)
    category = db.Column(db.String(100))
    retailer = db.Column(db.String(100), nullable=False)
    price = db.Column(db.String(50))
    image_url = db.Column(db.Text)
    
    # Analysis results
    insight_score = db.Column(db.Float, default=0.0)
    rating = db.Column(db.Float)
    total_reviews = db.Column(db.Integer, default=0)
    
    # Sentiment breakdown
    sentiment_positive = db.Column(db.Float, default=0.0)
    sentiment_neutral = db.Column(db.Float, default=0.0)
    sentiment_negative = db.Column(db.Float, default=0.0)
    
    # Performance specs
    spec_quality = db.Column(db.Float, default=0.0)
    spec_value = db.Column(db.Float, default=0.0)
    spec_durability = db.Column(db.Float, default=0.0)
    spec_features = db.Column(db.Float, default=0.0)
    spec_performance = db.Column(db.Float, default=0.0)
    
    # AI-generated insights
    ai_summary = db.Column(db.Text)
    strengths = db.Column(db.Text)  # JSON array as text
    weaknesses = db.Column(db.Text)  # JSON array as text

    # Which engine produced the analysis: 'roberta-bart-ensemble' or 'roberta-lite-heuristic'
    analysis_source = db.Column(db.String(50), default='roberta-bart-ensemble')
    common_terms = db.Column(db.Text)  # JSON {positive_terms, negative_terms}
    specs_data = db.Column(db.Text)    # Dynamic aspect dimensions: JSON list of [{name, key, score, icon, summary}]
    buyer_guide = db.Column(db.Text)   # Buyer persona & guidance: JSON dict {best_for, avoid_if, verdict, fit_feedback}

    analyzed_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    reviews = db.relationship('Review', backref='product', lazy='dynamic', cascade='all, delete-orphan')
    topics = db.relationship('Topic', backref='product', lazy='dynamic', cascade='all, delete-orphan')
    
    def to_dict(self):
        """Convert to dictionary"""
        import json
        
        return {
            'id': self.product_id,
            'name': self.name,
            'url': self.url,
            'category': self.category,
            'retailer': self.retailer,
            'price': self.price,
            'image': self.image_url,
            'insightScore': round(self.insight_score, 1),
            'rating': round(self.rating, 1) if self.rating else 0,
            'totalReviews': self.total_reviews,
            'sentiment': {
                'positive': round(self.sentiment_positive, 1),
                'neutral': round(self.sentiment_neutral, 1),
                'negative': round(self.sentiment_negative, 1)
            },
            'specs': {
                'quality': round(self.spec_quality, 1) if self.spec_quality is not None else None,
                'value': round(self.spec_value, 1) if self.spec_value is not None else None,
                'durability': round(self.spec_durability, 1) if self.spec_durability is not None else None,
                'features': round(self.spec_features, 1) if self.spec_features is not None else None,
                'performance': round(self.spec_performance, 1) if self.spec_performance is not None else None
            },
            'specsData': (json.loads(self.specs_data) if getattr(self, 'specs_data', None) else []),
            'buyerGuide': (json.loads(self.buyer_guide) if getattr(self, 'buyer_guide', None) else None),
            'aiSummary': self.ai_summary,
            'strengths': json.loads(self.strengths) if self.strengths else [],
            'weaknesses': json.loads(self.weaknesses) if self.weaknesses else [],
            'commonTerms': (json.loads(self.common_terms) if getattr(self, 'common_terms', None) else None),
            'analysisSource': self.analysis_source or 'unknown',
            'analyzedAt': self.analyzed_at.isoformat() if self.analyzed_at else None
        }


class Review(db.Model):
    """Review model"""
    __tablename__ = 'reviews'
    
    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False, index=True)
    
    author = db.Column(db.String(200))
    rating = db.Column(db.Integer)
    text = db.Column(db.Text)
    verified = db.Column(db.Boolean, default=False)
    helpful_count = db.Column(db.Integer, default=0)
    
    # Sentiment analysis
    sentiment = db.Column(db.String(20))  # positive, negative, neutral
    sentiment_score = db.Column(db.Float)
    
    review_date = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            'id': self.id,
            'author': self.author,
            'rating': self.rating,
            'text': clean_review_text(self.text),
            'verified': self.verified,
            'helpful': self.helpful_count,
            'sentiment': self.sentiment,
            'sentiment_score': round(self.sentiment_score, 2) if self.sentiment_score is not None else 0.0,
            'date': self.review_date.isoformat() if self.review_date else None
        }


class Topic(db.Model):
    """Topic/Theme model for analysis"""
    __tablename__ = 'topics'
    
    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False, index=True)
    
    name = db.Column(db.String(100), nullable=False)
    sentiment = db.Column(db.String(20))  # positive, negative, mixed
    mention_count = db.Column(db.Integer, default=0)
    score = db.Column(db.Float)
    summary = db.Column(db.Text)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            'name': self.name,
            'sentiment': self.sentiment,
            'count': self.mention_count,
            'score': round(self.score, 1) if self.score else 0,
            'summary': self.summary or ''
        }


class Post(db.Model):
    """Community post model"""
    __tablename__ = 'posts'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True, index=True)  # Nullable for migration
    title = db.Column(db.String(500), nullable=False)
    content = db.Column(db.Text, nullable=False)
    category = db.Column(db.String(100))
    tags = db.Column(db.Text)  # Comma-separated
    
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'))
    product = db.relationship('Product', backref='posts')
    
    author = db.Column(db.String(200), default='Anonymous')  # Keep for backward compatibility
    verified = db.Column(db.Boolean, default=False)
    
    votes = db.Column(db.Integer, default=0)
    comment_count = db.Column(db.Integer, default=0)
    view_count = db.Column(db.Integer, default=0)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    comments = db.relationship('Comment', backref='post', lazy='dynamic', cascade='all, delete-orphan')
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            'id': self.id,
            'title': self.title,
            'content': self.content,
            'category': self.category,
            'tags': self.tags.split(',') if self.tags else [],
            'author': self.author,
            'verified': self.verified,
            'votes': self.votes,
            'comments': self.comment_count,
            'views': self.view_count,
            'date': self.created_at.isoformat(),
            'productId': self.product_id
        }


class Comment(db.Model):
    """Comment model for posts"""
    __tablename__ = 'comments'
    
    id = db.Column(db.Integer, primary_key=True)
    post_id = db.Column(db.Integer, db.ForeignKey('posts.id'), nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True, index=True)  # Nullable for migration
    
    content = db.Column(db.Text, nullable=False)
    author = db.Column(db.String(200), default='Anonymous')  # Keep for backward compatibility
    votes = db.Column(db.Integer, default=0)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            'id': self.id,
            'content': self.content,
            'author': self.author,
            'votes': self.votes,
            'date': self.created_at.isoformat()
        }


class Favorite(db.Model):
    """User favorites model"""
    __tablename__ = 'favorites'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True, index=True)  # Nullable for migration
    session_id = db.Column(db.String(100), nullable=True, index=True)  # Keep for backward compatibility
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationship
    product = db.relationship('Product', backref='favorited_by')
