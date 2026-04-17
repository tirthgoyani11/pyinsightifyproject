"""
Add sample community posts and comments
Run this to populate the community page with sample data
"""
from app import create_app, db
from app.models import Post, Comment
from datetime import datetime, timedelta
import random

app = create_app()

with app.app_context():
    print("🌱 Seeding community posts...")
    
    # Sample posts
    sample_posts = [
        {
            'title': 'My 6-month review of the iPhone 15 Pro - Worth the upgrade?',
            'content': 'After using the iPhone 15 Pro for half a year, here\'s my honest take on battery life, camera quality, and whether it\'s worth upgrading from the iPhone 13 Pro. The camera improvements are noticeable, especially in low light. Battery life is solid but not groundbreaking. The Action Button is more useful than I expected. Overall, a worthy upgrade if you\'re 2+ generations behind.',
            'category': 'Reviews',
            'tags': 'iPhone,Apple,smartphones,review',
            'author': 'TechEnthusiast_92',
            'verified': True,
            'votes': 247,
            'comment_count': 45,
            'view_count': 1234
        },
        {
            'title': 'Best noise cancelling headphones I\'ve ever used - Sony WH-1000XM5',
            'content': 'I\'ve owned Bose, Apple, and now Sony headphones. The WH-1000XM5 are hands down the best for noise cancellation. Comfort is excellent for long flights. Battery lasts forever. Only downside is the price, but worth every penny if you travel frequently or work in noisy environments.',
            'category': 'Reviews',
            'tags': 'Sony,headphones,audio,noise-cancelling',
            'author': 'AudioPhile123',
            'verified': True,
            'votes': 189,
            'comment_count': 32,
            'view_count': 892
        },
        {
            'title': 'Looking for budget laptop recommendations for college - Under ₹50,000',
            'content': 'Starting college next month and need a reliable laptop for programming and general use. Budget is around ₹50,000. Don\'t need gaming performance, but want good battery life and a decent screen. Considering Asus Vivobook or HP Pavilion. Any suggestions?',
            'category': 'Questions',
            'tags': 'laptop,budget,college,recommendations',
            'author': 'StudentLife_2024',
            'verified': False,
            'votes': 67,
            'comment_count': 28,
            'view_count': 543
        },
        {
            'title': 'PSA: MacBook Air M2 is ₹10,000 off on Flipkart right now!',
            'content': 'Just saw the MacBook Air M2 (256GB) is on sale for ₹99,900 on Flipkart. That\'s ₹10,000 off! Great deal if you\'ve been waiting. I bought one last year at full price and it\'s been fantastic for development work and video editing.',
            'category': 'Recommendations',
            'tags': 'MacBook,Apple,deals,sale',
            'author': 'DealHunter_Pro',
            'verified': False,
            'votes': 156,
            'comment_count': 19,
            'view_count': 2341
        },
        {
            'title': 'Anyone else experiencing battery drain issues with Pixel 8?',
            'content': 'My Pixel 8 battery has been draining faster than usual after the latest update. Used to get 6-7 hours SOT, now barely getting 4 hours. Tried clearing cache, safe mode, etc. Anyone else having this issue? Any solutions?',
            'category': 'Questions',
            'tags': 'Pixel,Google,battery,troubleshooting',
            'author': 'AndroidUser_2024',
            'verified': True,
            'votes': 93,
            'comment_count': 41,
            'view_count': 678
        },
        {
            'title': 'Comparison: iPhone 15 Pro vs Samsung S24 Ultra - Real world usage',
            'content': 'Used both phones for 2 weeks each. Here\'s my detailed comparison:\n\nCamera: S24 wins for zoom, iPhone for video\nBattery: S24 lasts longer\nDisplay: S24 is brighter and smoother\nSoftware: Personal preference, both are excellent\nEcosystem: Depends on what you already own\n\nOverall: S24 offers more features, iPhone is more polished. Both are flagship quality.',
            'category': 'Reviews',
            'tags': 'iPhone,Samsung,comparison,flagship',
            'author': 'MobileTech_Reviewer',
            'verified': True,
            'votes': 312,
            'comment_count': 67,
            'view_count': 3421
        },
        {
            'title': 'Is the Apple Watch Ultra 2 worth it for non-athletes?',
            'content': 'I\'m not a serious athlete but love the design and battery life of the Ultra 2. Is it overkill for someone who just tracks basic workouts and wants good battery? Or should I stick with the Series 9?',
            'category': 'Questions',
            'tags': 'Apple Watch,wearables,fitness',
            'author': 'CasualFitness_Guy',
            'verified': False,
            'votes': 78,
            'comment_count': 24,
            'view_count': 456
        },
        {
            'title': 'My Dyson V15 stopped working after 8 months - Warranty nightmare',
            'content': 'Spent ₹58,000 on this vacuum and it died after just 8 months. Customer service has been terrible - they keep asking for receipts I\'ve already sent. Anyone else have issues with Dyson India warranty? This is extremely disappointing for such an expensive product.',
            'category': 'Discussion',
            'tags': 'Dyson,vacuum,warranty,customer-service',
            'author': 'FrustratedBuyer_2024',
            'verified': True,
            'votes': 234,
            'comment_count': 53,
            'view_count': 1876
        },
        {
            'title': 'Best budget TWS earbuds in 2024? (₹3000-5000 range)',
            'content': 'Looking for recommendations for true wireless earbuds under ₹5000. Main use is for calls and music during commute. Good battery life is essential. Have been looking at Boat, Noise, and Realme. Which ones would you recommend?',
            'category': 'Recommendations',
            'tags': 'earbuds,TWS,budget,audio',
            'author': 'BudgetAudioLover',
            'verified': False,
            'votes': 145,
            'comment_count': 38,
            'view_count': 987
        },
        {
            'title': 'Nintendo Switch or Steam Deck for casual gaming?',
            'content': 'Can\'t decide between Nintendo Switch OLED and Steam Deck. I mostly play indie games and older titles, not into AAA games. Switch has better exclusives but Steam Deck seems more versatile. What would you choose and why?',
            'category': 'Discussion',
            'tags': 'gaming,Nintendo,Steam Deck,handheld',
            'author': 'IndieGamer_2024',
            'verified': False,
            'votes': 112,
            'comment_count': 29,
            'view_count': 765
        }
    ]
    
    # Clear existing posts
    print("🗑️  Clearing existing posts...")
    Comment.query.delete()
    Post.query.delete()
    db.session.commit()
    
    # Add posts
    created_posts = []
    for i, post_data in enumerate(sample_posts):
        # Create posts with varying timestamps
        created_at = datetime.utcnow() - timedelta(hours=random.randint(1, 72))
        
        post = Post(
            title=post_data['title'],
            content=post_data['content'],
            category=post_data['category'],
            tags=post_data['tags'],
            author=post_data['author'],
            verified=post_data['verified'],
            votes=post_data['votes'],
            comment_count=post_data['comment_count'],
            view_count=post_data['view_count'],
            created_at=created_at,
            updated_at=created_at
        )
        db.session.add(post)
        created_posts.append(post)
        print(f"✅ Added post: {post_data['title'][:50]}...")
    
    db.session.commit()
    
    # Add sample comments
    print("\n💬 Adding sample comments...")
    sample_comments = [
        {
            'post_idx': 0,
            'content': 'Great review! I was considering the upgrade and this helped a lot.',
            'author': 'MobileUser_123',
            'votes': 12
        },
        {
            'post_idx': 0,
            'content': 'How\'s the heating issue? I heard some people complaining about it.',
            'author': 'TechCurious',
            'votes': 8
        },
        {
            'post_idx': 1,
            'content': 'Totally agree! Best headphones for the price.',
            'author': 'MusicLover_2024',
            'votes': 5
        },
        {
            'post_idx': 2,
            'content': 'Check out the Lenovo IdeaPad Slim 3. Great value for money!',
            'author': 'LaptopExpert_99',
            'votes': 15
        },
        {
            'post_idx': 2,
            'content': 'HP Pavilion is solid for programming. Good keyboard and battery life.',
            'author': 'CodeMaster_2024',
            'votes': 11
        },
        {
            'post_idx': 3,
            'content': 'Thanks for the heads up! Just ordered one.',
            'author': 'AppleFan_2024',
            'votes': 3
        },
        {
            'post_idx': 4,
            'content': 'Same issue here! Factory reset helped a bit but not completely.',
            'author': 'PixelOwner_123',
            'votes': 9
        },
        {
            'post_idx': 5,
            'content': 'S24 Ultra is the way to go if you want the best specs.',
            'author': 'AndroidFanboy',
            'votes': 18
        },
        {
            'post_idx': 5,
            'content': 'iPhone is better for video content creation though.',
            'author': 'ContentCreator_Pro',
            'votes': 14
        },
        {
            'post_idx': 7,
            'content': 'Contact them on Twitter, they respond faster there.',
            'author': 'HelpfulUser_123',
            'votes': 22
        }
    ]
    
    for comment_data in sample_comments:
        post = created_posts[comment_data['post_idx']]
        comment = Comment(
            post_id=post.id,
            content=comment_data['content'],
            author=comment_data['author'],
            votes=comment_data['votes'],
            created_at=datetime.utcnow() - timedelta(hours=random.randint(1, 24))
        )
        db.session.add(comment)
        print(f"  💬 Added comment to: {post.title[:40]}...")
    
    db.session.commit()
    
    # Print summary
    total_posts = Post.query.count()
    total_comments = Comment.query.count()
    
    print("\n" + "="*60)
    print("✅ Community seeding complete!")
    print(f"📝 Total posts: {total_posts}")
    print(f"💬 Total comments: {total_comments}")
    print("="*60)
    print("\n🌐 Visit http://localhost:5000/community.html to see the posts!")
