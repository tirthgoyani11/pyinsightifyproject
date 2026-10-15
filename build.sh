#!/usr/bin/env bash
set -o errexit

echo "📦 Installing Python dependencies..."
pip install -r backend/requirements.txt

echo "🧠 Downloading NLTK models..."
python -c "import nltk; nltk.download('vader_lexicon'); nltk.download('punkt'); nltk.download('punkt_tab')"

echo "🗄️ Initializing and seeding database..."
python -c "
import sys
sys.path.insert(0, 'backend')
from app import create_app, db
app = create_app('production')
with app.app_context():
    db.create_all()
    try:
        from add_sample_products import add_sample_products
        add_sample_products()
    except Exception as e:
        print('Sample products seed notice:', e)
    try:
        from seed_community import seed_community
        seed_community()
    except Exception as e:
        print('Community seed notice:', e)
"
echo "✨ Build completed successfully!"
