"""Integration checks with isolated storage and deterministic NLP (no paid API calls)."""
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).parents[1]))
from app import create_app, db
from app.models import Product, Review
from app.utils.gemini import RoBERTaBARTAnalyzer
from app.utils.scraper import ScrapingError


class AnalysisRouteTests(unittest.TestCase):
    def setUp(self):
        self.app = create_app('testing')
        self.context = self.app.app_context()
        self.context.push()
        db.create_all()
        self.client = self.app.test_client()
        self.engine = RoBERTaBARTAnalyzer(api_key='test-key')
        self.engine.enabled = False
        self.product = {'name': 'Review test computer', 'url': 'https://www.flipkart.com/computer/p/itm123?pid=COM123',
                        'retailer': 'Flipkart', 'rating': 4, 'total_reviews': 300, 'price': 14990, 'category': 'computer'}
        self.reviews = [
            {'author': 'One', 'text': 'Battery life is excellent. Screen is terrible.', 'rating': 5, 'verified': True, 'date': '2026-10-12', 'source': 'real'},
            {'author': 'Two', 'text': 'Excellent battery life and clear sound.', 'rating': 5, 'verified': False, 'date': 'Unknown', 'source': 'real'},
            {'author': 'Three', 'text': 'Terrible screen and broken display.', 'rating': 1, 'verified': True, 'source': 'real'},
            {'author': 'Three', 'text': 'Terrible screen and broken display.', 'rating': 1, 'source': 'real'},
        ]

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        db.engine.dispose()
        self.context.pop()

    def analyze(self, refresh=False):
        with patch('app.routes.products.scrape_product_data', return_value=self.product), patch('app.routes.products.scrape_product_reviews', return_value=self.reviews), patch('app.utils.gemini.get_analyzer', return_value=self.engine):
            return self.client.post('/api/products/analyze', json={'url': self.product['url'], 'refresh': refresh})

    def test_both_retailers_store_clean_unique_reviews_and_exact_totals(self):
        for retailer, url in [('Flipkart', self.product['url']), ('Amazon India', 'https://www.amazon.in/dp/B012345678')]:
            self.product = {**self.product, 'url': url, 'retailer': retailer}
            response = self.analyze()
            self.assertEqual(response.status_code, 201, response.json)
            self.assertEqual(response.json['quality']['duplicates_removed'], 1)
            self.assertEqual(response.json['quality']['analyzed'], 3)
            pid = response.json['productId']
            report = self.client.get('/api/products/' + pid).json
            self.assertEqual(len(report['reviews']), 3)
            self.assertEqual(report['quality']['verified'], 2)
            self.assertEqual(report['product']['analysisSource'], 'local-lexicon-v2')
            self.assertIsNone(next(r['date'] for r in report['reviews'] if r['author'] == 'Two'))
            analysis = self.client.get('/api/analysis/' + pid).json['analysis']
            self.assertTrue(analysis['common_terms']['positive_evidence'])
            self.assertAlmostEqual(sum(report['product']['sentiment'].values()), 100, delta=.2)

    def test_failed_refresh_preserves_old_report(self):
        first = self.analyze()
        self.assertEqual(first.status_code, 201, first.json)
        old_id, old_text = Product.query.one().id, Review.query.first().text
        with patch('app.routes.products.scrape_product_data', return_value=self.product), patch('app.routes.products.scrape_product_reviews', side_effect=ScrapingError('Retailer unavailable')):
            response = self.client.post('/api/products/analyze', json={'url': self.product['url'], 'refresh': True})
        self.assertEqual(response.status_code, 422)
        self.assertEqual(Product.query.one().id, old_id)
        self.assertEqual(Review.query.first().text, old_text)
        self.assertEqual(Review.query.count(), 3)

    def test_successful_refresh_preserves_product_identity(self):
        first = self.analyze()
        self.assertEqual(first.status_code, 201, first.json)
        old_id = Product.query.one().id
        second = self.analyze(refresh=True)
        self.assertEqual(second.status_code, 201, second.json)
        self.assertEqual(Product.query.one().id, old_id)
        self.assertEqual(Review.query.count(), 3)


if __name__ == '__main__':
    unittest.main()
