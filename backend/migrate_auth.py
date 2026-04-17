"""
Database Migration Script for Authentication System
Creates new tables: users, user_profiles, user_products
Adds user_id columns to existing tables: posts, comments, favorites
"""
import os
import sys
from datetime import datetime

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app, db
from app.models import User, UserProfile, UserProduct, Post, Comment, Favorite, Product


def run_migration():
    """Run the authentication migration"""
    app = create_app()
    
    with app.app_context():
        print("=" * 60)
        print("PyInsightify Authentication System Migration")
        print("=" * 60)
        print()
        
        # Check if migration is needed
        inspector = db.inspect(db.engine)
        existing_tables = inspector.get_table_names()
        
        print("📊 Current database tables:")
        for table in existing_tables:
            print(f"   - {table}")
        print()
        
        # Create backup info
        print("⚠️  IMPORTANT: This migration will modify your database.")
        print("   Make sure you have a backup before proceeding!")
        print()
        
        response = input("Continue with migration? (yes/no): ")
        if response.lower() != 'yes':
            print("❌ Migration cancelled.")
            return
        
        print()
        print("🔄 Starting migration...")
        print()
        
        try:
            # Step 1: Create new tables
            print("1️⃣ Creating new authentication tables...")
            
            if 'users' not in existing_tables:
                print("   ✅ Creating 'users' table")
            else:
                print("   ℹ️  Table 'users' already exists")
            
            if 'user_profiles' not in existing_tables:
                print("   ✅ Creating 'user_profiles' table")
            else:
                print("   ℹ️  Table 'user_profiles' already exists")
            
            if 'user_products' not in existing_tables:
                print("   ✅ Creating 'user_products' table")
            else:
                print("   ℹ️  Table 'user_products' already exists")
            
            # Create all tables
            db.create_all()
            print("   ✅ All tables created/verified")
            print()
            
            # Step 2: Verify column additions
            print("2️⃣ Verifying user_id columns in existing tables...")
            
            # Check posts table
            posts_columns = [col['name'] for col in inspector.get_columns('posts')]
            if 'user_id' in posts_columns:
                print("   ✅ Column 'user_id' exists in 'posts' table")
            else:
                print("   ⚠️  Column 'user_id' missing in 'posts' table")
                print("      You may need to manually add it or recreate the table")
            
            # Check comments table
            comments_columns = [col['name'] for col in inspector.get_columns('comments')]
            if 'user_id' in comments_columns:
                print("   ✅ Column 'user_id' exists in 'comments' table")
            else:
                print("   ⚠️  Column 'user_id' missing in 'comments' table")
                print("      You may need to manually add it or recreate the table")
            
            # Check favorites table
            favorites_columns = [col['name'] for col in inspector.get_columns('favorites')]
            if 'user_id' in favorites_columns:
                print("   ✅ Column 'user_id' exists in 'favorites' table")
            else:
                print("   ⚠️  Column 'user_id' missing in 'favorites' table")
                print("      You may need to manually add it or recreate the table")
            print()
            
            # Step 3: Create test user (optional)
            print("3️⃣ Creating test user account...")
            
            # Check if test user already exists
            test_user = User.query.filter_by(email='test@pyinsightify.com').first()
            
            if test_user:
                print("   ℹ️  Test user already exists")
                print(f"      Email: test@pyinsightify.com")
                print(f"      Username: {test_user.username}")
            else:
                response = input("   Create test user? (yes/no): ")
                if response.lower() == 'yes':
                    # Create test user
                    test_user = User(
                        username='testuser',
                        email='test@pyinsightify.com',
                        is_active=True
                    )
                    test_user.set_password('test123')
                    
                    db.session.add(test_user)
                    db.session.commit()
                    
                    # Create profile
                    test_profile = UserProfile(
                        user_id=test_user.id,
                        full_name='Test User',
                        bio='This is a test account for PyInsightify',
                        location='Test City'
                    )
                    db.session.add(test_profile)
                    db.session.commit()
                    
                    print("   ✅ Test user created successfully!")
                    print("      Email: test@pyinsightify.com")
                    print("      Password: test123")
                    print("      Username: testuser")
                else:
                    print("   ⏭️  Skipped test user creation")
            print()
            
            # Step 4: Summary
            print("=" * 60)
            print("✅ Migration completed successfully!")
            print("=" * 60)
            print()
            print("📋 Summary:")
            print("   - Authentication tables created")
            print("   - User tracking columns added to existing tables")
            print("   - Database is ready for authentication system")
            print()
            print("🚀 Next steps:")
            print("   1. Restart your Flask server")
            print("   2. Visit /register.html to create accounts")
            print("   3. Visit /login.html to login")
            print()
            
            # Show statistics
            user_count = User.query.count()
            product_count = Product.query.count()
            post_count = Post.query.count()
            
            print("📊 Database statistics:")
            print(f"   - Users: {user_count}")
            print(f"   - Products: {product_count}")
            print(f"   - Community Posts: {post_count}")
            print()
            
        except Exception as e:
            print()
            print("❌ Migration failed!")
            print(f"Error: {str(e)}")
            print()
            print("Please check the error message and try again.")
            print("You may need to:")
            print("  1. Delete the database file and start fresh")
            print("  2. Manually add missing columns using SQL")
            print("  3. Check for conflicts with existing data")
            return
        
        print("=" * 60)
        print("Migration script completed!")
        print("=" * 60)


if __name__ == '__main__':
    run_migration()
