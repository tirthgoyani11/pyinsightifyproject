"""Shared review hygiene and evidence metadata for both supported retailers."""
import html
import math
import re
from collections import Counter


def clean_review_text(value):
    text = str(value or '')
    for _ in range(2):
        text = html.unescape(text)
    text = re.sub(r'</?[a-zA-Z][^>]*>', ' ', text)
    text = re.sub(r'\b(?:READ MORE|Read more|Read less)\b', '', text)
    text = text.replace('\u200b', '').replace('\xa0', ' ')
    return re.sub(r'\s+', ' ', text).strip()


def prepare_reviews(reviews):
    """Remove empty/synthetic/duplicate records without merging different buyers."""
    cleaned, seen = [], set()
    stats = {'received': len(reviews), 'duplicates_removed': 0, 'empty_removed': 0, 'synthetic_removed': 0}
    for item in reviews:
        if item.get('source') == 'mock':
            stats['synthetic_removed'] += 1
            continue
        record = dict(item)
        record['text'] = clean_review_text(item.get('text'))
        record['author'] = clean_review_text(item.get('author') or item.get('user') or 'Customer')
        if not record['text']:
            stats['empty_removed'] += 1
            continue
        identity = (record['author'].casefold(), re.sub(r'\W+', ' ', record['text'].casefold()).strip())
        if identity in seen:
            stats['duplicates_removed'] += 1
            continue
        seen.add(identity)
        try:
            rating = float(record.get('rating'))
            record['rating'] = rating if math.isfinite(rating) and 1 <= rating <= 5 else None
        except (TypeError, ValueError):
            record['rating'] = None
        cleaned.append(record)
    stats['analyzed'] = len(cleaned)
    return cleaned, stats


def analysis_source_label(source):
    source = str(source or '').lower()
    if any(word in source for word in ('local', 'heuristic', 'lite')):
        return 'Local sentiment engine'
    return 'Neural sentiment engine'


def review_quality(reviews, source=None):
    """Describe the observed sample, never an unmeasured model accuracy."""
    lengths = [len(clean_review_text(r.get('text')).split()) for r in reviews]
    counts = Counter(str(r.get('sentiment') or 'neutral').lower() for r in reviews)
    return {'analyzed': len(reviews), 'verified': sum(bool(r.get('verified')) for r in reviews),
            'short_reviews': sum(length < 5 for length in lengths),
            'positive': counts['positive'], 'negative': counts['negative'], 'neutral': counts['neutral'],
            'source_label': analysis_source_label(source),
            'sample_note': 'This report covers the reviews retrieved, not every buyer. Retailer sorting and availability can affect the sample.',
            'language_note': 'English-focused analysis. Other languages, sarcasm, and very short reviews may be misclassified.'}


def parse_review_date(value):
    """Keep known source dates; unknown dates must not become today's date."""
    from datetime import datetime
    text = clean_review_text(value)
    text = re.split(r'\bon\b', text)[-1].strip()
    for pattern in ('%Y-%m-%d', '%d %B %Y', '%d %b %Y', '%B %d, %Y', '%b, %Y'):
        try:
            return datetime.strptime(text[:10] if pattern == '%Y-%m-%d' else text, pattern)
        except ValueError:
            continue
    return None
