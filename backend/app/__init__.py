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
    import os
    PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    app = Flask(__name__, static_folder=PROJECT_ROOT, static_url_path='')
    app.config.from_object(config[config_name])
    
    # Allow all origins — the app is served from the same Flask server,
    # but the browser still enforces same-origin on fetch() if the port/host
    # differs (e.g. 127.0.0.1 vs localhost).
    CORS(app, resources={r"/api/*": {"origins": "*"}})
    db.init_app(app)
    
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

    # Root endpoint — serve index.html
    @app.route('/')
    def index():
        import os
        html_file = os.path.join(app.static_folder, 'index.html')
        if os.path.isfile(html_file):
            with open(html_file, 'r', encoding='utf-8') as f:
                return f.read()
        return jsonify({'error': 'index.html not found', 'path': app.static_folder})

    return app
