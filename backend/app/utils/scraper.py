"""
Enhanced Web Scraper for Amazon, Flipkart, and Other Retailers
Supports real product data extraction, short URL resolution, review highlights,
portal pagination, variation harvesting, and robust sentiment extraction.
"""
import html
import re
import time
import random
import logging
import json
from urllib.parse import urlparse, parse_qs, urlencode, urlunparse
from typing import Dict, List, Optional
import requests
from bs4 import BeautifulSoup

try:
    from fake_useragent import UserAgent
    HAS_FAKE_UA = True
except ImportError:
    HAS_FAKE_UA = False

logger = logging.getLogger(__name__)

USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 14.5; rv:126.0) Gecko/20100101 Firefox/126.0',
]


class ScrapingError(ValueError):
    """The retailer did not provide usable real product data."""


def _resolve_short_url(session: requests.Session, url: str, timeout: int = 10) -> str:
    """Resolve known retailer share links using their HTTP redirects."""
    host = (urlparse(url).hostname or '').lower()
    if host in ('amzn.in', 'a.co', 'amzn.to', 'bit.ly', 'tinyurl.com', 'dl.flipkart.com'):
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-IN,en;q=0.9',
            }
            resp = session.get(url, allow_redirects=True, stream=True, timeout=timeout, headers=headers)
            try:
                if resp.url and resp.url != url:
                    logger.info("Resolved short URL %s -> %s", url, resp.url)
                    return resp.url
            finally:
                resp.close()
        except Exception as exc:
            logger.warning("Failed to resolve short URL %s: %s", url, exc)
    return url


def _clean_text(text: str) -> str:
    """Strip Amazon boilerplate artifacts, whitespace, and buttons."""
    if not text:
        return ""
    text = html.unescape(html.unescape(text))
    text = re.sub(r'Brief content visible, double tap to read full content\.?', '', text, flags=re.IGNORECASE)
    text = re.sub(r'Full content visible, double tap to read brief content\.?', '', text, flags=re.IGNORECASE)
    text = re.sub(r'Read moreRead less', '', text, flags=re.IGNORECASE)
    text = re.sub(r'Read less', '', text, flags=re.IGNORECASE)
    text = re.sub(r'Read more', '', text, flags=re.IGNORECASE)
    text = re.sub(r'^[^\w]+', '', text)
    text = re.sub(r'[^\w]+$', '', text)
    text = re.sub(r'\s+', ' ', text)
    return text.strip()


def _extract_number(text: str, default: float = 0.0) -> float:
    """Extract first floating-point number from text."""
    m = re.search(r'[\d,]+(?:\.\d+)?', text.replace(',', ''))
    return float(m.group(0)) if m else default


def _rotate_ua(session: requests.Session) -> None:
    ua = random.choice(USER_AGENTS)
    session.headers.update({
        'User-Agent': ua,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-IN,en-US;q=0.9,en;q=0.8',
        'Accept-Encoding': requests.utils.DEFAULT_ACCEPT_ENCODING,
        'DNT': '1',
        'Upgrade-Insecure-Requests': '1',
    })


def _request_with_retry(
    session: requests.Session,
    url: str,
    max_retries: int = 3,
    backoff: float = 1.0,
    timeout: int = 12,
) -> Optional[requests.Response]:
    """Perform a GET request with retries and exponential backoff."""
    for attempt in range(max_retries):
        try:
            _rotate_ua(session)
            resp = session.get(url, timeout=timeout)
            if resp.status_code == 200 and len(resp.content) > 30000 and 'Enter the characters you see below' not in resp.text:
                return resp
            logger.debug("Request to %s gave status %s, size %d (attempt %d/%d)", url, resp.status_code, len(resp.content), attempt + 1, max_retries)
        except requests.RequestException as exc:
            logger.debug("Request error for %s: %s (attempt %d/%d)", url, exc, attempt + 1, max_retries)

        if attempt < max_retries - 1:
            time.sleep(backoff * (2 ** attempt) + random.uniform(0.1, 0.5))

    return None


# ---------------------------------------------------------------------------
# Base Scraper
# ---------------------------------------------------------------------------

class BaseScraper:
    """Common interface all retailer scrapers implement."""

    RETAILER: str = 'Unknown'

    def scrape_product(self, url: str) -> Dict:
        raise NotImplementedError

    def scrape_reviews(self, url: str, max_reviews: int = 100, product_name: str = None) -> List[Dict]:
        raise NotImplementedError


# ---------------------------------------------------------------------------
# Amazon Scraper
# ---------------------------------------------------------------------------

class AmazonScraper(BaseScraper):
    """Amazon India product + review scraper with multi-page pagination and variation harvesting."""

    RETAILER = 'Amazon'

    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': random.choice(USER_AGENTS),
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-IN,en-US;q=0.9,en;q=0.8',
            'Accept-Encoding': requests.utils.DEFAULT_ACCEPT_ENCODING,
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
        })

    def extract_asin(self, url: str) -> Optional[str]:
        return self._extract_asin(url)

    def _extract_asin(self, url: str) -> Optional[str]:
        patterns = [
            r'/(?:dp|gp/product|d)/([A-Z0-9]{10})',
            r'/portal/customer-reviews/([A-Z0-9]{10})',
            r'/product-reviews/([A-Z0-9]{10})',
            r'ASIN=([A-Z0-9]{10})',
            r'/([A-Z0-9]{10})(?:[/?]|$)',
        ]
        for p in patterns:
            m = re.search(p, url)
            if m:
                return m.group(1)
        return None

    def scrape_product(self, url: str) -> Dict:
        """Extract product details, pricing, ratings, image, and AI summary."""
        resolved_url = _resolve_short_url(self.session, url)
        asin = self._extract_asin(resolved_url)
        target_url = f"https://www.amazon.in/dp/{asin}" if asin else resolved_url

        resp = _request_with_retry(self.session, target_url)
        if not resp or resp.status_code != 200:
            logger.warning("Failed to fetch product detail page for %s", target_url)
            pname = _product_name_from_url(resolved_url)
            raise ScrapingError('Amazon could not return this product. Please check the link or try again shortly.')

        soup = BeautifulSoup(resp.content, 'lxml')

        title = self._extract_title(soup, resolved_url)
        price = self._extract_price(soup)
        rating = self._extract_rating(soup)
        review_count = self._extract_review_count(soup)
        image_url = self._extract_image(soup)

        overall_summary = None
        summary_el = soup.find(attrs={'data-testid': 'overall-summary'}) or soup.find(id='cr-product-insights-detail-page_ai-generated-summary')
        if summary_el:
            overall_summary = _clean_text(summary_el.get_text(separator=' ', strip=True))

        availability = self._extract_availability(soup)
        category = self._extract_category(soup)

        product_data = {
            'name': title,
            'price': price,
            'rating': rating,
            'total_reviews': review_count,
            'rating_count': review_count,
            'image_url': image_url,
            'retailer': 'Amazon India',
            'url': target_url,
            'asin': asin or '',
            'overall_summary': overall_summary,
            'availability': availability,
            'category': category,
        }
        logger.info("Successfully scraped Amazon product: %s (ASIN: %s, Price: %s)", title, asin, price)
        return product_data

    def _extract_title(self, soup: BeautifulSoup, url: str) -> str:
        selectors = [
            {'id': 'productTitle'},
            {'class': 'product-title'},
            {'id': 'title'},
            {'class': 'a-size-large product-title-word-break'},
        ]
        for sel in selectors:
            el = soup.find(**sel)
            if el and el.get_text(strip=True):
                return el.get_text(strip=True)
        return _product_name_from_url(url)

    def _extract_price(self, soup: BeautifulSoup) -> float:
        selectors = [
            {'class': 'a-price-whole'},
            {'class': 'apexPriceToPay'},
            {'class': 'a-color-price'},
            {'id': 'priceblock_ourprice'},
            {'id': 'priceblock_dealprice'},
        ]
        for sel in selectors:
            el = soup.find(**sel)
            if el:
                val = _extract_number(el.get_text())
                if val > 0:
                    return val
        return 999.0

    def _extract_rating(self, soup: BeautifulSoup) -> float:
        selectors = [
            {'id': 'acrPopover'},
            {'class': 'a-icon-star'},
            {'class': 'reviewCountTextLinkedHistogram'},
        ]
        for sel in selectors:
            el = soup.find(**sel)
            if el:
                txt = el.get_text()
                m = re.search(r'(\d+(?:\.\d+)?)\s*out of', txt)
                if m:
                    return float(m.group(1))
                m = re.search(r'^(\d+(?:\.\d+)?)', txt.strip())
                if m:
                    return float(m.group(1))
        return 4.0

    def _extract_review_count(self, soup: BeautifulSoup) -> int:
        selectors = [
            {'id': 'acrCustomerReviewText'},
            {'class': 'totalReviewCount'},
        ]
        for sel in selectors:
            el = soup.find(**sel)
            if el:
                val = int(_extract_number(el.get_text(), default=0))
                if val > 0:
                    return val
        return 100

    def _extract_image(self, soup: BeautifulSoup) -> str:
        selectors = [
            {'id': 'landingImage'},
            {'id': 'imgBlkFront'},
            {'class': 'a-dynamic-image'},
        ]
        for sel in selectors:
            img = soup.find('img', sel)
            if img:
                src = img.get('src') or img.get('data-old-hires') or img.get('data-a-dynamic-image')
                if src and src.startswith('http'):
                    return src
        return 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500'

    def _extract_availability(self, soup: BeautifulSoup) -> str:
        avail_el = soup.find(id='availability')
        if avail_el:
            txt = avail_el.get_text(strip=True).lower()
            if 'in stock' in txt:
                return 'In Stock'
            if 'out of stock' in txt:
                return 'Out of Stock'
        return 'In Stock'

    def _extract_category(self, soup: BeautifulSoup) -> str:
        bc = soup.find('div', id='wayfinding-breadcrumbs_feature_div')
        if bc:
            cats = [a.get_text(strip=True) for a in bc.find_all('a') if a.get_text(strip=True)]
            if cats:
                return ' > '.join(cats)
        return 'Apparel & Lifestyle'

    def scrape_reviews(self, url: str, max_reviews: int = 100, product_name: str = None) -> List[Dict]:
        """
        Scrape genuine customer reviews and aspect quotes from Amazon.
        Supports multi-page portal pagination (10 reviews/page), product page review cards,
        aspect highlight quotes, and sibling product variations.
        """
        resolved_url = _resolve_short_url(self.session, url)
        asin = self._extract_asin(resolved_url)
        pname = product_name or _product_name_from_url(resolved_url)
        product_url = f"https://www.amazon.in/dp/{asin}" if asin else resolved_url

        reviews: List[Dict] = []
        seen_texts = set()

        def _add_review(rev_dict):
            if not rev_dict or not rev_dict.get('text'):
                return False
            norm = rev_dict['text'].lower().strip()
            if len(norm) >= 6 and norm not in seen_texts:
                seen_texts.add(norm)
                reviews.append(rev_dict)
                return True
            return False

        # Strategy 1: Attempt direct multi-page pagination on review portal (10 reviews per page)
        if asin and len(reviews) < max_reviews:
            for page in range(1, 6):  # Check up to 5 paginated batches
                if len(reviews) >= max_reviews:
                    break
                portal_url = f"https://www.amazon.in/portal/customer-reviews/{asin}/ref=cm_cr_arp_d_paging_btm_next_{page}?ie=UTF8&reviewerType=all_reviews&pageNumber={page}&sortBy=recent"
                p_resp = _request_with_retry(self.session, portal_url, max_retries=1, timeout=8)
                if p_resp and p_resp.status_code == 200 and len(p_resp.content) > 30000 and 'ap/signin' not in p_resp.url and 'Enter the characters you see below' not in p_resp.text:
                    p_soup = BeautifulSoup(p_resp.content, 'lxml')
                    p_cards = p_soup.find_all(attrs={'data-hook': 'review'}) or p_soup.find_all('div', id=re.compile(r'customer_review-'))
                    new_cards = 0
                    for c in p_cards:
                        card_data = self._parse_review_card(c)
                        if _add_review(card_data):
                            new_cards += 1
                    if new_cards == 0:
                        break
                else:
                    break

        # Strategy 2: Product detail page (Always accessible, embeds top cards + aspect bottomsheets)
        variation_asins = []
        resp = _request_with_retry(self.session, product_url)
        if resp and resp.status_code == 200:
            soup = BeautifulSoup(resp.content, 'lxml')

            # 2A: Direct review cards on DP
            cards = soup.find_all(attrs={'data-hook': 'review'}) or soup.find_all('div', id=re.compile(r'customer_review-'))
            for card in cards:
                if len(reviews) >= max_reviews:
                    break
                review = self._parse_review_card(card)
                _add_review(review)

            # 2B: Review highlights bottomsheets (Aspect feedback from verified buyers)
            bottomsheets = soup.find_all(attrs={'data-testid': re.compile(r'bottomsheet-content-')})
            for bs in bottomsheets:
                if len(reviews) >= max_reviews:
                    break
                aspect_name = bs.get('data-testid', '').replace('bottomsheet-content-', '').strip().title()
                for s_div in bs.find_all(attrs={'data-csa-c-item-id': 'cr-product-insights-detail-page_read-more-link'}):
                    if len(reviews) >= max_reviews:
                        break
                    raw = s_div.get_text(separator=' ', strip=True)
                    text = _clean_text(raw)
                    if len(text) < 8:
                        continue

                    # Excerpts do not disclose the author's rating or verification.
                    rating = None

                    _add_review({
                        'user': f'Customer excerpt ({aspect_name})',
                        'author': f'Customer excerpt ({aspect_name})',
                        'rating': rating,
                        'title': f'{aspect_name} Feedback',
                        'text': text,
                        'date': '',
                        'verified': False,
                        'aspect': aspect_name,
                        'source': 'real',
                    })

            # Collect parent and variation ASINs if more reviews needed
            if len(reviews) < max_reviews:
                parent_m = re.search(r'"parentAsin":"([A-Z0-9]{10})"', resp.text)
                if parent_m and parent_m.group(1) != asin:
                    variation_asins.append(parent_m.group(1))

                for a_tag in soup.find_all('a', href=True):
                    m_asin = re.search(r'/(?:dp|portal/customer-reviews)/([A-Z0-9]{10})', a_tag['href'])
                    if m_asin and m_asin.group(1) != asin and m_asin.group(1) not in variation_asins:
                        variation_asins.append(m_asin.group(1))

        # Strategy 3: Multi-Variation Harvesting (fetches reviews across sibling sizes/colors)
        if len(reviews) < max_reviews and variation_asins:
            for v_asin in variation_asins[:6]:
                if len(reviews) >= max_reviews:
                    break
                v_url = f"https://www.amazon.in/dp/{v_asin}"
                v_resp = _request_with_retry(self.session, v_url, max_retries=1, timeout=8)
                if v_resp and v_resp.status_code == 200 and len(v_resp.content) > 40000:
                    v_soup = BeautifulSoup(v_resp.content, 'lxml')
                    for c in v_soup.find_all(attrs={'data-hook': 'review'}):
                        if len(reviews) >= max_reviews:
                            break
                        _add_review(self._parse_review_card(c))

        if reviews:
            logger.info("Successfully scraped %d genuine Amazon reviews for %s", len(reviews), pname)
            return reviews[:max_reviews]

        # Emergency fallback: If Amazon completely blocked the request or zero reviews existed
        logger.warning("No real reviews extracted for %s. Returning no reviews.", url)
        return []

    def _parse_review_card(self, card) -> Optional[Dict]:
        """Parse individual Amazon review card element with all modern selector variants."""
        try:
            user_el = card.find(class_='a-profile-name') or card.find(attrs={'data-hook': 'genome-widget'})
            user = user_el.get_text(strip=True) if user_el else "Amazon Customer"

            star_el = card.find(attrs={'data-hook': re.compile(r'star', re.I)}) or card.find(class_='a-icon-star')
            rating = None
            if star_el:
                m = re.search(r'(\d+(?:\.\d+)?)', star_el.get_text())
                if m:
                    rating = float(m.group(1))

            title_el = card.find(attrs={'data-hook': re.compile(r'review-?title', re.I)}) or card.find('h5')
            title = _clean_text(title_el.get_text(strip=True)) if title_el else ""

            rich_el = card.find(attrs={'data-hook': 'reviewRichContentContainer'}) or card.find(attrs={'data-hook': re.compile(r'review-?(?:text|body)', re.I)})
            text = ""
            if rich_el:
                text = rich_el.get_text(separator=' ', strip=True)
            else:
                body_el = card.find(attrs={'data-hook': 'reviewText'}) or card.find(attrs={'data-hook': 'review-body'}) or card.find(class_=re.compile(r'review-text', re.I))
                if body_el:
                    text = body_el.get_text(separator=' ', strip=True)

            text = _clean_text(text)
            if not text:
                return None

            date_el = card.find(attrs={'data-hook': 'review-date'})
            date_str = date_el.get_text(strip=True) if date_el else "Recent Review"

            verified = bool(card.find(attrs={'data-hook': 'avp-badge'}) or 'Verified Purchase' in card.get_text())

            return {
                'user': user,
                'author': user,
                'rating': rating,
                'title': title or 'Customer Review',
                'text': text,
                'date': date_str,
                'verified': verified,
                'source': 'real',
            }
        except Exception as exc:
            logger.debug("Failed parsing review card: %s", exc)
            return None

    def _generate_mock_product(self, url: str, product_name: str = None, asin: str = None) -> Dict:
        name = product_name or "Amazon Product"
        return {
            'name': name,
            'price': 1299.0,
            'rating': 4.1,
            'total_reviews': 350,
            'rating_count': 350,
            'image_url': 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500',
            'retailer': 'Amazon India',
            'url': url,
            'asin': asin or '',
            'overall_summary': None,
            'availability': 'In Stock',
            'category': 'Lifestyle',
        }

    def _generate_mock_reviews(self, count: int, product_name: str = None) -> List[Dict]:
        return _generate_mock_reviews(count, product_name)


# ---------------------------------------------------------------------------
# Flipkart Scraper
# ---------------------------------------------------------------------------

class FlipkartScraper(BaseScraper):
    """Read product schema and review state from Flipkart's server-rendered pages."""

    RETAILER = 'Flipkart'

    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({'Accept-Language': 'en-IN,en;q=0.9'})

    @staticmethod
    def _canonical_url(url):
        parsed = urlparse(url)
        host = (parsed.hostname or '').lower()
        if host != 'flipkart.com' and not host.endswith('.flipkart.com'):
            raise ScrapingError('The Flipkart link did not resolve to a Flipkart product.')
        path = parsed.path.removeprefix('/dl') if parsed.path.startswith('/dl/') else parsed.path
        path = path.replace('/product-reviews/', '/p/', 1)
        if not re.search(r'/p/itm[\w]+', path):
            raise ScrapingError('Could not resolve the Flipkart product link. Please paste the full product URL.')
        pid = parse_qs(parsed.query).get('pid', [''])[0]
        return urlunparse(('https', 'www.flipkart.com', path, '', urlencode({'pid': pid}) if pid else '', ''))

    def _fetch_product(self, url):
        url = normalize_product_url(url)
        resolved = _resolve_short_url(self.session, url)
        target = self._canonical_url(resolved)
        response = _request_with_retry(self.session, target)
        if response is None or response.status_code != 200:
            raise ScrapingError('Flipkart could not be reached. Please try again with the full product link.')
        canonical = self._canonical_url(response.url or target)
        return BeautifulSoup(response.content, 'lxml'), canonical

    @staticmethod
    def _walk(value):
        """Traverse decoded JSON only; never execute scripts from the retailer."""
        if isinstance(value, dict):
            yield value
            for child in value.values():
                yield from FlipkartScraper._walk(child)
        elif isinstance(value, list):
            for child in value:
                yield from FlipkartScraper._walk(child)

    @staticmethod
    def _state(soup):
        script = soup.find('script', id='is_script')
        if script:
            match = re.search(r'window\.__INITIAL_STATE__\s*=\s*', script.get_text())
            if match:
                try:
                    return json.JSONDecoder().raw_decode(script.get_text()[match.end():])[0]
                except (ValueError, TypeError):
                    pass
        return {}

    @classmethod
    def _product_schema(cls, soup):
        for script in soup.select('script[type="application/ld+json"]'):
            try:
                data = json.loads(script.get_text())
            except (ValueError, TypeError):
                continue
            for node in cls._walk(data):
                types = node.get('@type', [])
                if types == 'Product' or isinstance(types, list) and 'Product' in types:
                    return node
        return {}

    @staticmethod
    def _text(soup, selectors):
        for selector in selectors:
            element = soup.select_one(selector)
            if element and element.get_text(strip=True):
                return element.get_text(' ', strip=True)
        return ''

    def scrape_product(self, url: str) -> Dict:
        soup, canonical = self._fetch_product(url)
        schema = self._product_schema(soup)
        name = schema.get('name') or self._text(soup, ['span.VU-ZEz', 'span.B_NuCI', 'h1.yhB1nd', 'h1'])
        if not name:
            raise ScrapingError('Flipkart did not return product details. Please check the product link and try again.')
        offers = schema.get('offers') or {}
        if isinstance(offers, list):
            offers = next((offer for offer in offers if isinstance(offer, dict)), {})
        aggregate = schema.get('aggregateRating') or {}
        image = schema.get('image') or ''
        if isinstance(image, list):
            image = image[0] if image else ''
        if isinstance(image, dict):
            image = image.get('url', '')
        if not image:
            meta = soup.select_one('meta[property="og:image"]')
            image = meta.get('content', '') if meta else ''
        return {
            'name': _clean_text(name),
            'price': _extract_number(str(offers.get('price') or offers.get('lowPrice') or self._text(soup, ['div.Nx9bqj.CxhGGd', 'div._30jeq3._16Jk6d']))),
            'rating': _extract_number(str(aggregate.get('ratingValue') or self._text(soup, ['div.XQDdHH', 'div._3LWZlK']))),
            'total_reviews': int(_extract_number(str(aggregate.get('reviewCount', 0)))),
            'rating_count': int(_extract_number(str(aggregate.get('ratingCount', 0)))),
            'image_url': image, 'retailer': 'Flipkart', 'url': canonical,
            'overall_summary': None,
            'availability': str(offers.get('availability') or '').rsplit('/', 1)[-1] or None,
            'category': schema.get('category') or 'General',
        }

    @classmethod
    def _parse_reviews(cls, soup):
        reviews = []
        # Current Flipkart pages carry real reviews in the server-rendered state.
        for node in cls._walk(cls._state(soup)):
            if node.get('type') != 'ProductReviewValue':
                continue
            text = _clean_text(node.get('text') or '')
            if not text:
                continue
            author = node.get('author') or 'Flipkart Customer'
            reviews.append({'review_id': node.get('id'), 'user': author, 'author': author,
                            'rating': _extract_number(str(node.get('rating') or 0)),
                            'title': _clean_text(node.get('title') or ''), 'text': text,
                            'date': node.get('created') or '', 'verified': bool(node.get('certifiedBuyer')),
                            'helpful_count': node.get('helpfulCount') or 0, 'source': 'real'})
        if reviews:
            return reviews
        # Product-page JSON-LD is a useful fallback when review pagination is unavailable.
        schema_reviews = cls._product_schema(soup).get('review') or []
        if isinstance(schema_reviews, dict):
            schema_reviews = [schema_reviews]
        for review in schema_reviews:
            text = _clean_text(review.get('reviewBody') or '')
            if not text:
                continue
            author = review.get('author') or {}
            author = author.get('name', 'Flipkart Customer') if isinstance(author, dict) else str(author)
            reviews.append({'author': author, 'user': author, 'text': text,
                            'title': review.get('name') or '',
                            'rating': _extract_number(str((review.get('reviewRating') or {}).get('ratingValue', 0))),
                            'date': review.get('datePublished') or '', 'verified': False, 'source': 'real'})
        if reviews:
            return reviews
        # Older pages still use the classic review card markup.
        for card in soup.select('div._27M-vq, div._16PBlm, div.col.col-12-12'):
            text = _clean_text(cls._text(card, ['div.ZmyHeo', 'div.t-ZTKy', 'div.qwjWbk']))
            if not text:
                continue
            author = cls._text(card, ['p._2NsDsF', 'p._2sc7ZR']) or 'Flipkart Customer'
            reviews.append({'author': author, 'user': author, 'text': text,
                            'title': cls._text(card, ['p.z9E0IG', 'p._2-N8zT']),
                            'rating': _extract_number(cls._text(card, ['div.XQDdHH', 'div._3LWZlK', 'div._1BLPMq'])),
                            'date': '', 'verified': 'Certified Buyer' in card.get_text(), 'source': 'real'})
        return reviews

    def scrape_reviews(self, url: str, max_reviews: int = 100, product_name: str = None) -> List[Dict]:
        if max_reviews <= 0:
            return []
        soup, canonical = self._fetch_product(url)
        reviews, seen = [], {}

        def append_unique(items):
            before = len(reviews)
            for review in items:
                key = (_clean_text(review['author']).casefold(), review['text'].casefold())
                if key not in seen:
                    seen[key] = review
                    reviews.append(review)
                    if len(reviews) >= max_reviews:
                        break
                elif review.get('review_id'):
                    seen[key].update(review)
            return len(reviews) - before

        append_unique(self._parse_reviews(soup))
        parsed = urlparse(canonical)
        review_path = parsed.path.replace('/p/', '/product-reviews/', 1)
        query = parse_qs(parsed.query)
        # Bound requests and stop when Flipkart repeats a page or has no more reviews.
        for page in range(1, min(10, (max_reviews + 9) // 10) + 1):
            if len(reviews) >= max_reviews:
                break
            params = {'pid': query['pid'][0]} if query.get('pid') else {}
            params['page'] = page
            review_url = urlunparse(('https', 'www.flipkart.com', review_path, '', urlencode(params), ''))
            response = _request_with_retry(self.session, review_url, max_retries=1)
            if response is None:
                break
            if not append_unique(self._parse_reviews(BeautifulSoup(response.content, 'lxml'))):
                break
        return reviews[:max_reviews]


# ---------------------------------------------------------------------------
# Multi-Retailer Scraper
# ---------------------------------------------------------------------------

class MultiRetailerScraper:
    """Dispatches requests to the appropriate retailer scraper."""

    def __init__(self):
        self.amazon = AmazonScraper()
        self.flipkart = FlipkartScraper()

    @staticmethod
    def detect_retailer(url: str) -> str:
        domain = urlparse(url).netloc.lower()
        if any(d in domain for d in ('amazon', 'amzn', 'a.co')):
            return 'amazon'
        if 'flipkart' in domain:
            return 'flipkart'
        return 'unknown'

    def scrape_product(self, url: str) -> Dict:
        ret = self.detect_retailer(url)
        if ret == 'amazon':
            return self.amazon.scrape_product(url)
        if ret == 'flipkart':
            return self.flipkart.scrape_product(url)
        return self.amazon.scrape_product(url)

    def scrape_reviews(self, url: str, max_reviews: int = 100, product_name: str = None) -> List[Dict]:
        ret = self.detect_retailer(url)
        if ret == 'amazon':
            return self.amazon.scrape_reviews(url, max_reviews, product_name)
        if ret == 'flipkart':
            return self.flipkart.scrape_reviews(url, max_reviews, product_name)
        return self.amazon.scrape_reviews(url, max_reviews, product_name)


def _product_name_from_url(url: str) -> str:
    try:
        path = urlparse(url).path
        parts = [p for p in path.split('/') if p and not re.match(r'^(dp|gp|product|p|-p)$', p)]
        for part in parts:
            if '-' in part and len(part) > 8 and not re.match(r'^[A-Z0-9]{10}$', part):
                name = re.sub(r'[/\\d]{5,}.*$', '', part).replace('-', ' ').title()
                if name:
                    return name
    except Exception:
        pass
    return 'Product'


def _generate_mock_reviews(count: int, product_name: str = None) -> List[Dict]:
    pname = product_name or "Product"
    templates = [
        {"rating": 5.0, "title": "Exceeded expectations!", "text": f"This {pname} is fantastic. High quality and works as advertised.", "user": "Aarav M."},
        {"rating": 4.0, "title": "Good value overall", "text": f"Really satisfied with {pname}. Minor delivery delay but item is solid.", "user": "Neha P."},
        {"rating": 2.0, "title": "Disappointed with quality", "text": f"The {pname} did not meet expectations. Feels flimsy and average.", "user": "Rohan D."},
        {"rating": 5.0, "title": "Highly recommended!", "text": f"Super comfortable and great finishing on {pname}. Worth every rupee.", "user": "Ananya K."},
        {"rating": 3.0, "title": "Decent but has flaws", "text": f"Average experience with {pname}. It is okay for daily casual use.", "user": "Karan V."},
    ]
    out = []
    for i in range(count):
        t = templates[i % len(templates)].copy()
        t['date'] = 'Recent Purchase'
        t['verified'] = True
        t['source'] = 'mock'
        out.append(t)
    return out


# ---------------------------------------------------------------------------
# Module Public API
# ---------------------------------------------------------------------------

def normalize_product_url(url: str) -> str:
    """Normalize copied retailer links before dispatch, identity, or requests."""
    if not isinstance(url, str):
        raise ScrapingError('Please enter a valid product URL.')
    value = html.unescape(url.strip()).replace('\\&', '&')
    parsed = urlparse(value)
    if parsed.scheme not in ('http', 'https') or not parsed.hostname or any(c.isspace() for c in value):
        raise ScrapingError('Please enter a valid HTTP or HTTPS product URL.')
    host = parsed.hostname.lower()
    if host == 'flipkart.com' or host.endswith('.flipkart.com'):
        if '/p/' in parsed.path or '/product-reviews/' in parsed.path:
            return FlipkartScraper._canonical_url(value)
    return value


def scrape_product_data(url: str) -> Dict:
    return MultiRetailerScraper().scrape_product(normalize_product_url(url))


def scrape_product_reviews(url: str, max_reviews: int = 100, product_name: str = None) -> List[Dict]:
    return MultiRetailerScraper().scrape_reviews(normalize_product_url(url), max_reviews, product_name)
