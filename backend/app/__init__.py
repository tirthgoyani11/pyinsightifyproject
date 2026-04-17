"""
Flask application factory
"""
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from config import config

# Initialize extensions
db = SQLAlchemy()


def create_app(config_name='default'):
    """Create and configure Flask application"""
    app = Flask(__name__)
    app.config.from_object(config[config_name])
    
    # Initialize extensions
    db.init_app(app)
    CORS(app, resources={
        r"/api/*": {
            "origins": app.config['CORS_ORIGINS'],
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"],
            "supports_credentials": True
        }
    })
    
    # Register blueprints
    from app.routes import products, community, analysis, favorites, auth
    
    app.register_blueprint(auth.bp, url_prefix='/api/auth')
    app.register_blueprint(products.bp, url_prefix='/api/products')
    app.register_blueprint(community.bp, url_prefix='/api/community')
    app.register_blueprint(analysis.bp, url_prefix='/api/analysis')
    app.register_blueprint(favorites.bp)
    
    # Health check endpoint
    @app.route('/api/health')
    def health_check():
        return {'status': 'healthy', 'message': 'Insightify API is running'}
    
    # Root endpoint
    @app.route('/')
    def index():
        return {
            'name': 'Insightify API',
            'version': '1.0.0',
            'endpoints': {
                'health': '/api/health',
                'products': '/api/products',
                'community': '/api/community',
                'analysis': '/api/analysis'
            }
        }
    
    return app
