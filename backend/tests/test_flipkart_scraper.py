"""Offline regression checks for the live Flipkart layouts and share links.

Run: backend/venv/bin/python -m unittest discover -s backend/tests -v
"""
import importlib.util
import json
from pathlib import Path
import unittest
from unittest.mock import Mock, patch

from bs4 import BeautifulSoup
import requests

SPEC = importlib.util.spec_from_file_location('retailer_scraper', Path(__file__).parents[1] / 'app/utils/scraper.py')
scraper = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(scraper)
PRODUCT_URL = 'https://www.flipkart.com/lenovo-chromebook/p/itm041aea27f1885?pid=COMHA9FK8YXVUUWA'
REVIEW_URL = PRODUCT_URL.replace('/p/', '/product-reviews/')


def response(html, url=PRODUCT_URL):
    result = requests.Response()
    result.status_code = 200
    result.url = url
    result._content = html.encode()
    return result


def review_page(*reviews):
    state = {'multiWidgetState': {'widgetsData': {'slots': [
        {'slotData': {'widget': {'data': {'value': review}}}} for review in reviews
    ]}}}
    return '<script id="is_script">window.__INITIAL_STATE__ = ' + json.dumps(state) + ';</script>'


def review(number, text=None):
    return {'type': 'ProductReviewValue', 'id': str(number), 'text': text or f'Real review number {number}',
            'author': f'Buyer {number}', 'rating': 4, 'certifiedBuyer': True,
            'created': 'Jun, 2025', 'helpfulCount': 7, 'title': 'Useful computer'}


class FlipkartScraperTests(unittest.TestCase):
    def setUp(self):
        self.scraper = scraper.FlipkartScraper()

    def test_short_link_resolves_and_closes_response(self):
        session = Mock()
        session.get.return_value = Mock(url=PRODUCT_URL)
        self.assertEqual(scraper._resolve_short_url(session, 'https://dl.flipkart.com/s/qHl!2nNNNN'), PRODUCT_URL)
        session.get.return_value.close.assert_called_once()

    def test_encoding_only_advertises_available_decoders(self):
        scraper._rotate_ua(self.scraper.session)
        self.assertEqual(self.scraper.session.headers['Accept-Encoding'], requests.utils.DEFAULT_ACCEPT_ENCODING)

    def test_review_and_product_links_share_canonical_identity(self):
        noisy = REVIEW_URL + '&lid=listing&marketplace=FLIPKART&page=4'
        self.assertEqual(self.scraper._canonical_url(noisy), PRODUCT_URL)
        self.assertEqual(self.scraper._canonical_url(PRODUCT_URL.replace('www.', 'dl.').replace('/lenovo', '/dl/lenovo')), PRODUCT_URL)

    def test_rejects_unresolved_or_unrelated_links(self):
        for url in ('https://dl.flipkart.com/s/invalid', 'https://fakeflipkart.com/item/p/itm123'):
            with self.subTest(url=url), self.assertRaises(scraper.ScrapingError):
                self.scraper._canonical_url(url)

    def test_product_schema_keeps_full_title_and_real_metadata(self):
        schema = {'@type': 'Product', 'name': 'Lenovo Chromebook full title', 'image': ['https://example.org/computer.png'],
                  'category': 'computer', 'offers': {'price': 14990, 'availability': 'https://schema.org/InStock'},
                  'aggregateRating': {'ratingValue': 4, 'ratingCount': 3721, 'reviewCount': 365}}
        html = '<h1>Truncated title ...more</h1><script type="application/ld+json">' + json.dumps([schema]) + '</script>'
        with patch.object(self.scraper, '_fetch_product', return_value=(BeautifulSoup(html, 'lxml'), PRODUCT_URL)):
            product = self.scraper.scrape_product(PRODUCT_URL)
        self.assertEqual(product['name'], schema['name'])
        self.assertEqual(product['price'], 14990)
        self.assertEqual(product['total_reviews'], 365)
        self.assertEqual(product['rating_count'], 3721)
        self.assertEqual(product['url'], PRODUCT_URL)

    def test_reads_modern_review_state_without_executing_javascript(self):
        html = review_page(review(1))
        parsed = self.scraper._parse_reviews(BeautifulSoup(html, 'lxml'))
        self.assertEqual(len(parsed), 1)
        self.assertEqual(parsed[0]['source'], 'real')
        self.assertEqual(parsed[0]['helpful_count'], 7)
        self.assertTrue(parsed[0]['verified'])

    def test_unverified_review_stays_unverified(self):
        item = review(1)
        item['certifiedBuyer'] = False
        parsed = self.scraper._parse_reviews(BeautifulSoup(review_page(item), 'lxml'))
        self.assertFalse(parsed[0]['verified'])

    def test_review_pages_are_followed_and_deduplicated(self):
        product = BeautifulSoup('<h1>Computer</h1>', 'lxml')
        pages = [response(review_page(review(1), review(2)), REVIEW_URL),
                 response(review_page(review(2), review(3)), REVIEW_URL),
                 response(review_page(review(3)), REVIEW_URL)]
        with patch.object(self.scraper, '_fetch_product', return_value=(product, PRODUCT_URL)), patch.object(scraper, '_request_with_retry', side_effect=pages) as fetch:
            reviews = self.scraper.scrape_reviews(PRODUCT_URL, max_reviews=30)
        self.assertEqual(len(reviews), 3)
        self.assertEqual(fetch.call_count, 3)
        self.assertIn('page=2', fetch.call_args_list[1].args[1])
        self.assertTrue(all(item['source'] == 'real' for item in reviews))

    def test_review_limit_stops_further_network_requests(self):
        product = BeautifulSoup('<h1>Computer</h1>', 'lxml')
        with patch.object(self.scraper, '_fetch_product', return_value=(product, PRODUCT_URL)), patch.object(scraper, '_request_with_retry', return_value=response(review_page(review(1), review(2)))) as fetch:
            self.assertEqual(len(self.scraper.scrape_reviews(PRODUCT_URL, max_reviews=1)), 1)
        self.assertEqual(fetch.call_count, 1)

    def test_blocked_product_raises_instead_of_inventing_product(self):
        with patch.object(scraper, '_request_with_retry', return_value=None), self.assertRaises(scraper.ScrapingError):
            self.scraper.scrape_product(PRODUCT_URL)

    def test_missing_reviews_do_not_generate_mock_reviews(self):
        product = BeautifulSoup('<h1>Computer</h1>', 'lxml')
        with patch.object(self.scraper, '_fetch_product', return_value=(product, PRODUCT_URL)), patch.object(scraper, '_request_with_retry', return_value=None):
            self.assertEqual(self.scraper.scrape_reviews(PRODUCT_URL), [])

    def test_classic_markup_remains_supported(self):
        html = '<div class="_27M-vq"><div class="_3LWZlK">2</div><p class="_2sc7ZR">Buyer</p><div class="t-ZTKy">Battery does not last long enough</div><span>Certified Buyer</span></div>'
        parsed = self.scraper._parse_reviews(BeautifulSoup(html, 'lxml'))
        self.assertEqual(parsed[0]['rating'], 2)
        self.assertEqual(parsed[0]['author'], 'Buyer')
        self.assertTrue(parsed[0]['verified'])


if __name__ == '__main__':
    unittest.main()
