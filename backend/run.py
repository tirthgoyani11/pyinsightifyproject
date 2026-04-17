"""
Main application entry point
"""
import os
from app import create_app, db

app = create_app(os.getenv('FLASK_ENV', 'development'))


@app.cli.command()
def init_db():
    """Initialize the database"""
    db.create_all()
    print("Database initialized successfully!")


@app.cli.command()
def seed_db():
    """Seed database with sample data"""
    from app.models import Product, Review, Post
    from datetime import datetime, timedelta
    import random
    
    print("Seeding database...")
    
    # Sample products
    sample_products = [
        {
            'product_id': 'prod001',
            'name': 'Premium Wireless Headphones',
            'url': 'https://amazon.com/product/wireless-headphones',
            'retailer': 'Amazon',
            'category': 'Electronics',
            'price': '$199.99',
            'image_url': 'https://via.placeholder.com/400x300?text=Headphones',
            'rating': 4.5,
            'total_reviews': 1250,
            'insight_score': 85.5,
            'sentiment_positive': 75.0,
            'sentiment_neutral': 15.0,
            'sentiment_negative': 10.0,
            'spec_quality': 88.0,
            'spec_value': 82.0,
            'spec_durability': 85.0,
            'spec_features': 90.0,
            'spec_performance': 87.0
        },
        {
            'product_id': 'prod002',
            'name': 'Smart Fitness Watch',
            'url': 'https://amazon.com/product/fitness-watch',
            'retailer': 'Amazon',
            'category': 'Wearables',
            'price': '$299.99',
            'image_url': 'https://via.placeholder.com/400x300?text=Fitness+Watch',
            'rating': 4.2,
            'total_reviews': 890,
            'insight_score': 78.3,
            'sentiment_positive': 68.0,
            'sentiment_neutral': 20.0,
            'sentiment_negative': 12.0,
            'spec_quality': 85.0,
            'spec_value': 75.0,
            'spec_durability': 80.0,
            'spec_features': 88.0,
            'spec_performance': 82.0
        }
    ]
    
    for prod_data in sample_products:
        product = Product(**prod_data, analyzed_at=datetime.utcnow())
        db.session.add(product)
    
    db.session.commit()
    
    # Sample posts
    sample_posts = [
        {
            'title': 'Best wireless headphones under $200?',
            'content': 'Looking for recommendations for wireless headphones with good battery life.',
            'category': 'Questions',
            'tags': 'headphones,wireless,recommendations',
            'author': 'TechEnthusiast',
            'votes': 15,
            'comment_count': 8,
            'view_count': 234
        },
        {
            'title': 'My experience with the Smart Fitness Watch',
            'content': 'After using this watch for 3 months, here are my thoughts...',
            'category': 'Reviews',
            'tags': 'fitness,smartwatch,review',
            'author': 'FitnessGuru',
            'votes': 23,
            'comment_count': 12,
            'view_count': 456
        }
    ]
    
    for post_data in sample_posts:
        post = Post(**post_data, created_at=datetime.utcnow())
        db.session.add(post)
    
    db.session.commit()
    
    print("Database seeded successfully!")


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
