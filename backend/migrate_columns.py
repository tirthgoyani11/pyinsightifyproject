"""
Simple SQL Migration for Adding user_id columns
"""
import os
import sys
import sqlite3

# Get database path
basedir = os.path.dirname(os.path.abspath(__file__))
db_path = os.path.join(basedir, 'instance', 'insightify.db')

print("=" * 60)
print("Adding user_id columns to existing tables")
print("=" * 60)
print()
print(f"Database: {db_path}")
print()

if not os.path.exists(db_path):
    print("❌ Database file not found!")
    sys.exit(1)

# Connect to database
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    # Check and add user_id to posts table
    print("1️⃣ Adding user_id to posts table...")
    try:
        cursor.execute("ALTER TABLE posts ADD COLUMN user_id INTEGER")
        cursor.execute("CREATE INDEX IF NOT EXISTS ix_posts_user_id ON posts (user_id)")
        print("   ✅ Added user_id column to posts")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e).lower():
            print("   ℹ️  Column already exists")
        else:
            raise
    
    # Check and add user_id to comments table
    print("2️⃣ Adding user_id to comments table...")
    try:
        cursor.execute("ALTER TABLE comments ADD COLUMN user_id INTEGER")
        cursor.execute("CREATE INDEX IF NOT EXISTS ix_comments_user_id ON comments (user_id)")
        print("   ✅ Added user_id column to comments")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e).lower():
            print("   ℹ️  Column already exists")
        else:
            raise
    
    # Check and add user_id to favorites table
    print("3️⃣ Adding user_id to favorites table...")
    try:
        cursor.execute("ALTER TABLE favorites ADD COLUMN user_id INTEGER")
        cursor.execute("CREATE INDEX IF NOT EXISTS ix_favorites_user_id ON favorites (user_id)")
        print("   ✅ Added user_id column to favorites")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e).lower():
            print("   ℹ️  Column already exists")
        else:
            raise
    
    # Commit changes
    conn.commit()
    print()
    print("=" * 60)
    print("✅ Migration completed successfully!")
    print("=" * 60)
    print()
    print("Next steps:")
    print("  1. The Flask server should auto-reload")
    print("  2. Visit http://localhost:5000/register.html to test registration")
    print("  3. Visit http://localhost:5000/login.html to test login")
    print()
    
except Exception as e:
    print()
    print(f"❌ Error: {str(e)}")
    conn.rollback()
    sys.exit(1)
finally:
    conn.close()
