"""
Add Sample Products to Database
Populates the database with real-looking sample products for the browse page
"""
from app import create_app, db
from app.models import Product, Review, Topic
from datetime import datetime, timedelta
import random

app = create_app()

sample_products = [
    {
        'product_id': 'sample001',
        'name': 'Apple iPhone 15 Pro Max',
        'url': 'https://www.amazon.com/dp/sample001',
        'category': 'Electronics',
        'retailer': 'Amazon',
        'price': 1199.00,
        'rating': 4.7,
        'total_reviews': 2847,
        'image_url': 'https://m.media-amazon.com/images/I/81SigpJN1KL._AC_SX679_.jpg',
        'insight_score': 92,
        'ai_summary': 'Premium flagship smartphone with advanced camera system, powerful A17 Pro chip, and titanium design. Customers praise the excellent camera quality and performance, though some mention the high price point.',
        'strengths': '["Exceptional camera quality with 5x telephoto zoom", "Industry-leading A17 Pro chip performance", "Premium titanium design and build quality"]',
        'weaknesses': '["Premium price point", "Heavy device weight", "Limited customization compared to Android"]',
        'analyzed_at': datetime.utcnow() - timedelta(days=2)
    },
    {
        'product_id': 'sample002',
        'name': 'Sony WH-1000XM5 Wireless Headphones',
        'url': 'https://www.amazon.com/dp/sample002',
        'category': 'Electronics',
        'retailer': 'Amazon',
        'price': 399.99,
        'rating': 4.6,
        'total_reviews': 1523,
        'image_url': 'https://m.media-amazon.com/images/I/61vFO3Nl9PL._AC_SX679_.jpg',
        'insight_score': 89,
        'ai_summary': 'Industry-leading noise cancellation headphones with exceptional sound quality. Users love the comfort for long listening sessions and impressive battery life, making them perfect for travel and daily use.',
        'strengths': '["Best-in-class active noise cancellation", "Superb audio quality and clarity", "30-hour battery life with quick charging"]',
        'weaknesses': '["Not foldable design", "Touch controls can be sensitive", "Premium pricing"]',
        'analyzed_at': datetime.utcnow() - timedelta(days=5)
    },
    {
        'product_id': 'sample003',
        'name': 'Ninja Air Fryer Pro 4-in-1',
        'url': 'https://www.amazon.com/dp/sample003',
        'category': 'Home',
        'retailer': 'Amazon',
        'price': 129.99,
        'rating': 4.8,
        'total_reviews': 3421,
        'image_url': 'https://m.media-amazon.com/images/I/71Jy4371a7L._AC_SX679_.jpg',
        'insight_score': 91,
        'ai_summary': 'Versatile 4-in-1 air fryer that roasts, broils, and dehydrates. Customers appreciate the healthy cooking results, easy cleanup, and compact design that fits on countertops without taking up too much space.',
        'strengths': '["Crispy results with minimal oil", "Easy to clean non-stick basket", "Compact design for small kitchens"]',
        'weaknesses': '["Small capacity for large families", "Can be noisy during operation", "Learning curve for cooking times"]',
        'analyzed_at': datetime.utcnow() - timedelta(days=1)
    },
    {
        'product_id': 'sample004',
        'name': 'Samsung 65" QLED 4K Smart TV',
        'url': 'https://www.amazon.com/dp/sample004',
        'category': 'Electronics',
        'retailer': 'Amazon',
        'price': 1299.99,
        'rating': 4.5,
        'total_reviews': 892,
        'image_url': 'https://m.media-amazon.com/images/I/81fC7nDJ+pL._AC_SX679_.jpg',
        'insight_score': 85,
        'ai_summary': 'Premium QLED TV with stunning picture quality and smart features. Viewers praise the vibrant colors and deep blacks, though some mention the smart interface could be more intuitive.',
        'strengths': '["Excellent QLED picture quality", "Great gaming features with low input lag", "Sleek and modern design"]',
        'weaknesses': '["Smart TV interface can be slow", "Viewing angles not as wide as OLED", "Requires calibration for best picture"]',
        'analyzed_at': datetime.utcnow() - timedelta(days=7)
    },
    {
        'product_id': 'sample005',
        'name': 'Dyson V15 Detect Cordless Vacuum',
        'url': 'https://www.amazon.com/dp/sample005',
        'category': 'Home',
        'retailer': 'Amazon',
        'price': 649.99,
        'rating': 4.7,
        'total_reviews': 678,
        'image_url': 'https://m.media-amazon.com/images/I/61D9S9iBpJL._AC_SX679_.jpg',
        'insight_score': 88,
        'ai_summary': 'Advanced cordless vacuum with laser detection and intelligent suction. Users love the powerful cleaning performance and scientific approach to dust detection, though the premium price is noted.',
        'strengths': '["Powerful suction with intelligent auto-adjust", "Laser reveals hidden dust particles", "Versatile attachments for all surfaces"]',
        'weaknesses': '["High price point", "Battery life could be longer", "Heavy to use on stairs"]',
        'analyzed_at': datetime.utcnow() - timedelta(days=3)
    },
    {
        'product_id': 'sample006',
        'name': 'MacBook Pro 14" M3 Pro',
        'url': 'https://www.amazon.com/dp/sample006',
        'category': 'Electronics',
        'retailer': 'Amazon',
        'price': 1999.00,
        'rating': 4.9,
        'total_reviews': 456,
        'image_url': 'https://m.media-amazon.com/images/I/61L5HCurYCL._AC_SX679_.jpg',
        'insight_score': 94,
        'ai_summary': 'Professional laptop with blazing M3 Pro performance and stunning Liquid Retina XDR display. Developers and creatives praise the incredible battery life and silent operation under load.',
        'strengths': '["Exceptional M3 Pro chip performance", "All-day battery life (18+ hours)", "Stunning XDR display with ProMotion"]',
        'weaknesses': '["Premium pricing", "Limited port selection", "Notch design may bother some users"]',
        'analyzed_at': datetime.utcnow() - timedelta(days=1)
    },
    {
        'product_id': 'sample007',
        'name': 'Nike Air Max 2024 Running Shoes',
        'url': 'https://www.amazon.com/dp/sample007',
        'category': 'Fashion',
        'retailer': 'Amazon',
        'price': 149.99,
        'rating': 4.4,
        'total_reviews': 1245,
        'image_url': 'https://m.media-amazon.com/images/I/71Q7kAX0bQL._AC_SX679_.jpg',
        'insight_score': 82,
        'ai_summary': 'Modern running shoes with responsive cushioning and breathable design. Runners appreciate the comfortable fit and style, though sizing can run slightly large for some users.',
        'strengths': '["Excellent cushioning for long runs", "Stylish design for everyday wear", "Good arch support"]',
        'weaknesses': '["Sizing runs large", "Not ideal for wide feet", "Durability issues after 6+ months"]',
        'analyzed_at': datetime.utcnow() - timedelta(days=10)
    },
    {
        'product_id': 'sample008',
        'name': 'L\'Oréal Revitalift Triple Power Serum',
        'url': 'https://www.amazon.com/dp/sample008',
        'category': 'Beauty',
        'retailer': 'Amazon',
        'price': 24.99,
        'rating': 4.2,
        'total_reviews': 892,
        'image_url': 'https://m.media-amazon.com/images/I/71xczKt3eaL._AC_SX679_.jpg',
        'insight_score': 76,
        'ai_summary': 'Anti-aging face serum with vitamin C, hyaluronic acid, and pro-retinol. Users notice improvements in skin texture and tone, though results vary and some experience sensitivity.',
        'strengths': '["Affordable anti-aging solution", "Visible results within 4-6 weeks", "Non-greasy formula absorbs quickly"]',
        'weaknesses': '["May cause irritation on sensitive skin", "Results vary by skin type", "Strong fragrance"]',
        'analyzed_at': datetime.utcnow() - timedelta(days=4)
    },
    {
        'product_id': 'sample009',
        'name': 'Instant Pot Duo Plus 9-in-1',
        'url': 'https://www.amazon.com/dp/sample009',
        'category': 'Home',
        'retailer': 'Amazon',
        'price': 99.99,
        'rating': 4.7,
        'total_reviews': 5234,
        'image_url': 'https://m.media-amazon.com/images/I/71Xcc7AP8ZL._AC_SX679_.jpg',
        'insight_score': 90,
        'ai_summary': 'Versatile 9-in-1 multi-cooker that pressure cooks, slow cooks, sterilizes, and more. Home cooks love the time-saving convenience and consistent results for various recipes.',
        'strengths': '["9 cooking functions in one appliance", "Huge time saver for busy families", "Easy to use with preset programs"]',
        'weaknesses': '["Learning curve for beginners", "Inner pot can stick if not properly maintained", "Large footprint on counter"]',
        'analyzed_at': datetime.utcnow() - timedelta(days=6)
    },
    {
        'product_id': 'sample010',
        'name': 'Kindle Paperwhite (11th Gen)',
        'url': 'https://www.amazon.com/dp/sample010',
        'category': 'Electronics',
        'retailer': 'Amazon',
        'price': 139.99,
        'rating': 4.6,
        'total_reviews': 3892,
        'image_url': 'https://m.media-amazon.com/images/I/71eiIP3mYlL._AC_SX679_.jpg',
        'insight_score': 87,
        'ai_summary': 'E-reader with adjustable warm light and waterproof design. Book lovers praise the eye-friendly display and weeks-long battery life, making it perfect for reading anywhere.',
        'strengths': '["Glare-free display perfect for sunlight", "Waterproof for bath/beach reading", "Battery lasts weeks on single charge"]',
        'weaknesses': '["No physical page turn buttons", "Cloud storage could be more generous", "PDF reading experience could be better"]',
        'analyzed_at': datetime.utcnow() - timedelta(days=8)
    }
]

def add_sample_products():
    """Add sample products to the database"""
    with app.app_context():
        print("🌱 Adding sample products to database...")
        
        added_count = 0
        skipped_count = 0
        
        for product_data in sample_products:
            # Check if product already exists
            existing = Product.query.filter_by(product_id=product_data['product_id']).first()
            if existing:
                print(f"⏭️  Skipping '{product_data['name']}' - already exists")
                skipped_count += 1
                continue
            
            # Create new product
            product = Product(**product_data)
            db.session.add(product)
            added_count += 1
            print(f"✅ Added '{product_data['name']}'")
        
        # Commit all changes
        db.session.commit()
        
        print(f"\n🎉 Done!")
        print(f"   Added: {added_count} products")
        print(f"   Skipped: {skipped_count} products (already exist)")
        print(f"   Total in DB: {Product.query.count()} products")
        print(f"\n✨ Browse page should now show {Product.query.count()} products!")

if __name__ == '__main__':
    add_sample_products()
