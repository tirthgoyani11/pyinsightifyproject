"""
Sentiment and Aspect Analysis for Insightify
Deterministic, self-contained NLP engine (no external model downloads).

Pipeline per review:
  1. Tokenisation with negation + intensifier + contrast handling
  2. Lexicon polarity with a valence-shifting grammar
  3. TextBlob polarity as a secondary general-English signal
  4. Star-rating calibration
  5. Signal fusion → sentiment / score / confidence / aspects
"""
from .review_quality import clean_review_text
import math
import re
import statistics
from collections import Counter

try:
    from textblob import TextBlob
    _HAS_TEXTBLOB = True
except Exception:  # pragma: no cover - textblob always present in prod
    _HAS_TEXTBLOB = False

try:
    from nltk.sentiment.vader import SentimentIntensityAnalyzer as _Vader
    _VADER = _Vader()
except Exception:
    _VADER = None


# ---------------------------------------------------------------------------
# Lexicons
# ---------------------------------------------------------------------------

# Weighted positive lexicon. Weight = strength of positive valence (0.2-1.0)
POSITIVE_LEXICON = {
    # strong
    'excellent': 1.0, 'outstanding': 1.0, 'amazing': 0.95, 'awesome': 0.9,
    'superb': 0.95, 'fantastic': 0.95, 'perfect': 1.0, 'brilliant': 0.9,
    'phenomenal': 1.0, 'incredible': 0.9, 'flawless': 1.0,
    # medium-strong
    'great': 0.7, 'wonderful': 0.8, 'fabulous': 0.85, 'terrific': 0.8,
    'lovely': 0.6, 'beautiful': 0.6, 'best': 0.85, 'favorite': 0.6,
    'loved': 0.7, 'love': 0.7, 'adore': 0.7, 'impressed': 0.6,
    'recommend': 0.6, 'recommended': 0.6, 'recommendable': 0.6,
    'premium': 0.5, 'authentic': 0.5, 'genuine': 0.5, 'original': 0.3,
    'reliable': 0.5, 'durable': 0.5, 'sturdy': 0.45, 'solid': 0.4,
    'smooth': 0.35, 'seamless': 0.4, 'fast': 0.3, 'quick': 0.3,
    'worth': 0.35, 'worthy': 0.35, 'satisfied': 0.5, 'satisfying': 0.5,
    'happy': 0.55, 'pleased': 0.55, 'delighted': 0.7, 'glad': 0.4,
    'comfortable': 0.45, 'comfy': 0.45, 'stylish': 0.45, 'sleek': 0.4,
    'nice': 0.4, 'good': 0.4, 'decent': 0.2, 'fine': 0.2, 'okay': 0.1,
    'ok': 0.1, 'works': 0.15, 'working': 0.15, 'helped': 0.3,
    'exceeded': 0.5, 'surpassed': 0.5, 'value': 0.3, 'affordable': 0.35,
    'cheap': 0.05,  # context-dependent, mildly positive in "cheap and good"
    'mustbuy': 0.8, 'go': 0.15, 'gem': 0.6, 'steal': 0.5, 'bargain': 0.5,
    'fantastically': 0.9, 'highly': 0.3, 'super': 0.6, 'mast': 0.9,
    'otima': 0.9, 'otimo': 0.9, 'perfeito': 0.9, 'recomendo': 0.8,
}

# Weighted negative lexicon. Weight = strength of negative valence.
NEGATIVE_LEXICON = {
    # strong
    'terrible': 1.0, 'horrible': 0.95, 'awful': 0.95, 'worst': 1.0,
    'pathetic': 0.9, 'useless': 0.9, 'garbage': 0.95, 'trash': 0.95,
    'dreadful': 0.9, 'atrocious': 0.95, 'abysmal': 0.95, 'appalling': 0.95,
    # medium-strong
    'poor': 0.65, 'bad': 0.6, 'disappointing': 0.7, 'disappointed': 0.7,
    'disappointment': 0.7, 'defective': 0.8, 'faulty': 0.8, 'broken': 0.75,
    'broke': 0.6, 'damaged': 0.7, 'cracked': 0.6, 'torn': 0.55,
    'waste': 0.8, 'regret': 0.75, 'refund': 0.4, 'returned': 0.4,
    'returning': 0.4, 'replaced': 0.3, 'replacement': 0.25,
    'fake': 0.75, 'duplicate': 0.7, 'counterfeit': 0.8, 'scam': 0.85,
    'cheat': 0.8, 'misleading': 0.6, 'unreliable': 0.6, 'flimsy': 0.5,
    'uncomfortable': 0.5, 'unusable': 0.7, 'unacceptable': 0.7,
    'overpriced': 0.5, 'overprice': 0.5, 'expensive': 0.35,
    'faded': 0.5, 'shrunk': 0.5, 'shrink': 0.5, 'pilling': 0.45,
    'stitching': 0.15, 'unstitched': 0.6, 'unstiched': 0.6, 'unravel': 0.55,
    'lag': 0.5, 'laggy': 0.6, 'slow': 0.35, 'heating': 0.45,
    'overheat': 0.65, 'overheating': 0.65, 'drain': 0.4, 'draining': 0.45,
    'discharging': 0.5, 'stopped': 0.5, 'fails': 0.6, 'failed': 0.65,
    'failing': 0.6, 'malfunction': 0.7, 'defect': 0.65,
    'late': 0.35, 'delayed': 0.4, 'delay': 0.4, 'never': 0.35,
    'problem': 0.45, 'problems': 0.45, 'issue': 0.35, 'issues': 0.35,
    'concern': 0.3, 'concerns': 0.3, 'complaint': 0.4, 'poorly': 0.6,
    'worse': 0.6, 'worsen': 0.6, 'awfully': 0.9, 'badly': 0.6,
    'unfortunately': 0.35, 'sadly': 0.35, 'meh': 0.3, 'bland': 0.35,
    'notchy': 0.4, 'rough': 0.3, 'stiff': 0.3, 'itchy': 0.4,
    'oversized': 0.3, 'undersized': 0.3, 'illfitting': 0.5, 'shedding': 0.5,
}

# Negation cues (checked as standalone tokens after apostrophe normalisation)
NEGATION_WORDS = {
    'not', 'no', 'never', 'none', 'nobody', 'nothing', 'nowhere', 'neither',
    'nor', 'cannot', 'cant', 'dont', 'doesnt', 'didnt', 'wont', 'wouldnt',
    'shouldnt', 'couldnt', 'isnt', 'arent', 'wasnt', 'werent', 'havent',
    'hasnt', 'hadnt', 'without', 'lacks', 'lacking', 'lack', 'hardly',
    'barely', 'scarcely', 'rarely', 'seldom', 'aint', 'nah',
}

# Intensifiers scale the following word's valence
INTENSIFIERS = {
    'very': 1.6, 'really': 1.4, 'extremely': 1.8, 'super': 1.5,
    'so': 1.3, 'highly': 1.5, 'absolutely': 1.7, 'completely': 1.5,
    'totally': 1.4, 'utterly': 1.7, 'incredibly': 1.6, 'truly': 1.4,
    'genuinely': 1.4, 'exceptionally': 1.7, 'remarkably': 1.5, 'especially': 1.3,
    'particularly': 1.3, 'damn': 1.5, 'way': 1.3, 'far': 1.3, 'much': 1.2,
    'too': 1.2, 'quite': 0.9, 'pretty': 0.95, 'rather': 0.95, 'slightly': 0.6,
    'somewhat': 0.7, 'kinda': 0.8, 'kind': 0.85, 'bit': 0.75, 'little': 0.75,
    'barely': 0.4, 'hardly': 0.4,
}

# Downtoners that reduce valence
DOWNTONERS = {
    'barely': 0.4, 'hardly': 0.4, 'scarcely': 0.4, 'slightly': 0.5,
    'somewhat': 0.65, 'kinda': 0.7, 'sort': 0.75, 'marginally': 0.5,
}

# Contrast markers: the clause after these words carries the dominant sentiment
CONTRAST_MARKERS = {
    'but', 'however', 'although', 'though', 'yet', 'except', 'unfortunately',
    'nevertheless', 'nonetheless', 'whereas', 'while', 'still', 'despite',
    'inspite',
}

# Aspect definitions with word-boundary-safe multi-word patterns.
# Ordered dict — first match wins for primary aspect attribution.
ASPECT_PATTERNS = {
    'Build & Durability': [
        'build', 'build quality', 'quality', 'material', 'fabric', 'cloth',
        'stitching', 'stitch', 'seam', 'hem', 'zip', 'zipper', 'button',
        'buttons', 'sturdy', 'durable', 'durability', 'finish', 'thick',
        'thin', 'heavy', 'lightweight', 'soft', 'rough', 'texture', 'weave',
        'lint', 'shrink', 'shrank', 'shrunk', 'faded', 'fade', 'torn', 'tear',
        'rip', 'ripped', 'hole', 'holes', 'wore', 'worn', 'wash', 'washed',
        'washing', 'colour', 'color', 'dye', 'print', 'loose', 'tight',
    ],
    'Design & Fit': [
        'design', 'look', 'looks', 'looking', 'style', 'stylish', 'fit',
        'fits', 'fitting', 'size', 'sizing', 'length', 'sleeve', 'sleeves',
        'collar', 'hood', 'pocket', 'pockets', 'cut', 'shape', 'pattern',
        'colour combination', 'appearance', 'attractive', 'smart', 'trendy',
        'fashionable', 'oversized', 'undersized', 'baggy', 'slim',
    ],
    'Comfort & Wearability': [
        'comfort', 'comfortable', 'comfy', 'wear', 'wearing', 'wore', 'feel',
        'feels', 'feeling', 'softness', 'breathable', 'breathability',
        'itchy', 'stiff', 'warm', 'warmth', 'summer', 'winter', 'sweat',
        'sweaty', 'cotton', 'wool', 'polyester', 'blend',
    ],
    'Value & Price': [
        'price', 'pricing', 'value', 'money', 'worth', 'cost', 'costs',
        'expensive', 'cheap', 'affordable', 'budget', 'deal', 'discount',
        'overpriced', 'bargain', 'mrp', 'rate',
    ],
    'Delivery & Service': [
        'delivery', 'delivered', 'shipping', 'shipment', 'courier', 'packaging',
        'package', 'packing', 'packed', 'seller', 'service', 'support',
        'return', 'returns', 'replacement', 'exchange', 'refund', 'warranty',
        'guarantee', 'customer care', 'response', 'late', 'delay', 'delayed',
    ],
    'Authenticity': [
        'authentic', 'original', 'genuine', 'fake', 'duplicate', 'copy',
        'counterfeit', 'tag', 'tags', 'label', 'brand', 'branded', 'logo',
        'mislabeled', 'mislabeled',
    ],
    'Battery & Charging': [
        'battery', 'charging', 'charge', 'charger', 'cable', 'cord', 'power',
        'backup', 'drain', 'discharge', 'discharging', 'mah', 'usb', 'port',
        'adapter', 'plug', 'outlet', 'recharge', 'powerbank',
    ],
    'Performance': [
        'performance', 'speed', 'fast', 'slow', 'lag', 'laggy', 'responsive',
        'efficient', 'efficiency', 'works', 'working', 'worked', 'function',
        'functional', 'output', 'result', 'results', 'accurate', 'accuracy',
        'reliable', 'reliability', 'consistent', 'stable', 'stability',
    ],
    'Sound & Audio': [
        'sound', 'audio', 'bass', 'treble', 'volume', 'loud', 'clarity',
        'mic', 'microphone', 'noise', 'cancellation', 'speaker', 'earbuds',
        'headphones', 'sound quality',
    ],
    'Display & Screen': [
        'display', 'screen', 'resolution', 'brightness', 'pixel', 'pixels',
        'panel', 'lcd', 'oled', 'refresh', 'colour accuracy', 'bezel',
        'touch', 'touchscreen', 'gorilla',
    ],
}

# Domain-aware noise words excluded from aspect matching entirely
_STOPWORDS = {
    'the', 'and', 'for', 'that', 'this', 'with', 'from', 'have', 'has',
    'had', 'was', 'were', 'is', 'it', 'its', 'are', 'been', 'being', 'of',
    'to', 'in', 'on', 'at', 'by', 'an', 'as', 'be', 'or', 'if', 'so', 'do',
    'did', 'does', 'done', 'a', 'i', 'me', 'my', 'you', 'your', 'they',
    'their', 'them', 'he', 'she', 'his', 'her', 'we', 'our', 'us', 'who',
    'what', 'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each',
    'few', 'more', 'most', 'other', 'some', 'such', 'than', 'then', 'too',
    'very', 'just', 'also', 'about', 'after', 'before', 'between', 'into',
    'through', 'during', 'above', 'below', 'up', 'down', 'out', 'off',
    'over', 'under', 'again', 'further', 'once', 'here', 'there', 'amazon',
    'flipkart', 'product', 'item', 'thing', 'things', 'one', 'get', 'got',
    'buy', 'bought', 'order', 'ordered', 'use', 'used', 'using', 'would',
    'could', 'should', 'will', 'can', 'may', 'might', 'must', 'shall',
    'star', 'stars', 'review', 'reviews', 'verified', 'purchase', 'day',
    'days', 'week', 'weeks', 'month', 'months', 'time', 'people', 'person',
}

_WORD_RE = re.compile(r"[a-z']+")


def _normalise(text: str) -> str:
    """Lowercase and unify apostrophes so 'don't' / 'dont' both tokenise cleanly."""
    text = clean_review_text(text)
    text = text.replace('’', "'").replace('‘', "'")
    text = text.replace('`', "'")
    return text.lower()


def _tokenise(text: str) -> list:
    """Split into word tokens, stripping apostrophes: don't -> dont."""
    return [t.replace("'", '') for t in _WORD_RE.findall(_normalise(text)) if t.replace("'", '')]


class SentimentAnalyzer:
    """Aspect-aware sentiment engine with valence-shifting grammar."""

    POSITIVE_THRESHOLD = 0.10
    NEGATIVE_THRESHOLD = -0.10
    NEUTRAL_BAND = 0.06

    def __init__(self):
        self._pos = dict(POSITIVE_LEXICON)
        self._neg = dict(NEGATIVE_LEXICON)
        self._aspects = {k: [p for p in v] for k, v in ASPECT_PATTERNS.items()}

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def analyze_text(self, text: str, rating=None) -> dict:
        """Full sentiment analysis for a single review."""
        if not text or not isinstance(text, str) or not text.strip():
            return self._neutral_result()

        text = clean_review_text(text)
        tokens = _tokenise(text)
        if not tokens:
            return self._neutral_result()

        lexicon_score = self._lexicon_score(tokens)
        tb_score = self._textblob_score(text)
        vader_score = self._vader_score(text)
        rating_score = self._rating_score(rating)

        combined = self._fuse(lexicon_score, tb_score, vader_score, rating_score, tokens, rating)

        if combined > self.POSITIVE_THRESHOLD:
            sentiment = 'positive'
        elif combined < self.NEGATIVE_THRESHOLD:
            sentiment = 'negative'
        else:
            sentiment = 'neutral'

        clauses = [_tokenise(clause) for clause in re.split(r'[.!?;]+|\b(?:but|however|although|yet)\b', text, flags=re.I) if clause.strip()]
        aspects = self._aspect_sentiment(tokens, rating, clauses)

        return {
            'sentiment': sentiment,
            'score': round(combined, 3),
            'polarity': round(combined, 3),
            'confidence': round(self._confidence(combined, tokens, rating, sentiment), 2),
            'aspects': aspects,
        }

    def analyze_reviews(self, reviews: list) -> dict:
        """Aggregate sentiment across reviews."""
        if not reviews:
            return {'positive': 0, 'neutral': 0, 'negative': 0,
                    'overall_score': 0, 'total': 0, 'average_rating': 0}

        counts = {'positive': 0, 'neutral': 0, 'negative': 0}
        scores, ratings = [], []

        for r in reviews:
            text = r.get('text', '') if isinstance(r, dict) else str(r)
            rating = r.get('rating') if isinstance(r, dict) else None
            res = self.analyze_text(text, rating)
            counts[res['sentiment']] += 1
            scores.append(res['score'])
            if rating:
                ratings.append(float(rating))

        total = len(reviews)
        return {
            'positive': round(counts['positive'] / total * 100, 1),
            'neutral': round(counts['neutral'] / total * 100, 1),
            'negative': round(counts['negative'] / total * 100, 1),
            'overall_score': round(statistics.mean(scores), 3) if scores else 0,
            'average_rating': round(statistics.mean(ratings), 2) if ratings else 0,
            'total': total,
        }

    def calculate_insight_score(self, sentiment_data: dict, rating: float, total_reviews: int) -> float:
        """0-100 composite score: rating (45) + sentiment (40) + volume (15)."""
        try:
            rating_val = float(rating) if rating else 0
            rating_part = (min(max(rating_val, 0), 5) / 5.0) * 45

            pos = float(sentiment_data.get('positive', 0))
            neg = float(sentiment_data.get('negative', 0))
            neu = float(sentiment_data.get('neutral', 0))
            total_pct = pos + neg + neu
            if total_pct > 0:
                pos_n = pos / total_pct
                neg_n = neg / total_pct
            else:
                pos_n, neg_n = 0.0, 0.0
            sentiment_part = max(0.0, min(40.0, (pos_n - 0.5 * neg_n) * 50))

            # Volume: logarithmic — 10 reviews → ~7.5, 100 → ~15
            vol = float(total_reviews or 0)
            volume_part = min(15.0, math.log10(vol + 1) / 2.0 * 15.0) if vol > 0 else 0.0

            return round(min(max(rating_part + sentiment_part + volume_part, 0), 100), 1)
        except Exception:
            return 0.0

    def extract_topics(self, reviews: list, top_n: int = 6) -> list:
        """Rank aspects by mention volume, with net sentiment per aspect."""
        buckets = {}
        for r in reviews:
            text = r.get('text', '') if isinstance(r, dict) else str(r)
            rating = r.get('rating') if isinstance(r, dict) else None
            tokens = _tokenise(text)
            if not tokens:
                continue

            res = self.analyze_text(text, rating)
            for aspect in res['aspects']:
                name = aspect['name']
                b = buckets.setdefault(name, {'scores': [], 'ratings': [], 'pos': 0, 'neg': 0})
                b['scores'].append(aspect['score'])
                if aspect['sentiment'] == 'positive':
                    b['pos'] += 1
                elif aspect['sentiment'] == 'negative':
                    b['neg'] += 1
                if rating:
                    b['ratings'].append(float(rating))

        topics = []
        for name, b in buckets.items():
            avg = statistics.mean(b['scores'])
            if avg > self.POSITIVE_THRESHOLD:
                sent = 'positive'
            elif avg < self.NEGATIVE_THRESHOLD:
                sent = 'negative'
            else:
                sent = 'mixed'
            topics.append({
                'name': name,
                'sentiment': sent,
                'mention_count': len(b['scores']),
                'positive_mentions': b['pos'],
                'negative_mentions': b['neg'],
                'average_rating': round(statistics.mean(b['ratings']), 2) if b['ratings'] else 0,
                'score': round(avg, 2),
            })

        topics.sort(key=lambda t: t['mention_count'], reverse=True)
        return topics[:top_n]

    def calculate_specs(self, reviews: list) -> dict:
        """Per-dimension 0-100 scores derived from aspect sentiment."""
        default = {'quality': 65, 'value': 65, 'durability': 65,
                   'features': 65, 'performance': 65, 'comfort': 65}

        if not reviews:
            return default

        topics = {t['name']: t for t in self.extract_topics(reviews, top_n=len(self._aspects))}

        spec_map = {
            'quality': ['Build & Durability', 'Authenticity'],
            'value': ['Value & Price'],
            'durability': ['Build & Durability'],
            'features': ['Design & Fit', 'Display & Screen', 'Sound & Audio'],
            'performance': ['Performance', 'Battery & Charging'],
            'comfort': ['Comfort & Wearability', 'Design & Fit'],
        }

        ratings = [float(r['rating']) for r in reviews
                   if isinstance(r, dict) and r.get('rating')]
        base = (statistics.mean(ratings) / 5.0) * 100 if ratings else 70.0

        specs = {}
        for spec, aspects in spec_map.items():
            scores = [topics[a]['score'] for a in aspects if a in topics]
            if scores:
                mapped = [(s + 1) / 2 * 100 for s in scores]
                # blend with the global rating baseline so thin data stays sane
                specs[spec] = round(0.75 * statistics.mean(mapped) + 0.25 * base, 1)
            else:
                specs[spec] = round(base, 1)

        for k in specs:
            specs[k] = max(30.0, min(98.0, specs[k]))
        return specs

    def extract_common_terms(self, reviews: list, limit: int = 8) -> dict:
        return extract_common_terms(reviews, limit=limit)

    # ------------------------------------------------------------------
    # Scoring internals
    # ------------------------------------------------------------------

    def _score_span(self, tokens: list, apply_contrast: bool = True) -> float:
        """Valence-shifting lexicon score over a token sequence.

        Negation: a NEGATION_WORD flips the polarity of sentiment words that
        follow within a 5-token window, so "not worth the money" scores
        negative ("not" at distance 1 from "worth").

        Contrast: when a CONTRAST_MARKER is present, the clause after it
        carries 70% of the weight and the clause before it 30% — "Good
        product but zipper broke" leans negative.
        """
        if not tokens:
            return 0.0

        raw = self._score_tokens(tokens)

        if apply_contrast:
            split = self._split_on_contrast(tokens)
            if split is not None:
                head, tail = split
                return 0.3 * self._score_span(head, apply_contrast=False) \
                     + 0.7 * self._score_span(tail, apply_contrast=False)

        return self._normalise(raw)

    def _score_tokens(self, tokens: list) -> float:
        """Sum valence over tokens, applying negation and intensifiers."""
        if not tokens:
            return 0.0

        n = len(tokens)

        # Distance since the most recent negation word (0 = the word itself)
        neg_distance = [None] * n
        last = None
        for i, tok in enumerate(tokens):
            last = 0 if tok in NEGATION_WORDS else (None if last is None else last + 1)
            neg_distance[i] = last

        # Multiplier from intensifiers / downtoners in the 3 preceding tokens
        multipliers = []
        for i in range(n):
            mult = 1.0
            for j in range(max(0, i - 3), i):
                prev = tokens[j]
                if prev in INTENSIFIERS:
                    mult *= INTENSIFIERS[prev]
                elif prev in DOWNTONERS:
                    mult *= DOWNTONERS[prev]
            multipliers.append(mult)

        raw = 0.0
        for i, tok in enumerate(tokens):
            weight = self._pos.get(tok) or self._neg.get(tok)
            if not weight:
                continue
            sign = 1.0 if tok in self._pos else -1.0
            # Negated within window → flip. Negating a negative ("not bad") is positive.
            if neg_distance[i] is not None and 0 < neg_distance[i] <= 5:
                sign *= -1.0
            raw += sign * weight * multipliers[i]

        return raw

    @staticmethod
    def _split_on_contrast(tokens: list):
        """Split at the LAST contrast marker: (head, tail) or None."""
        idx = None
        for i, tok in enumerate(tokens):
            if tok in CONTRAST_MARKERS:
                idx = i
        if idx is None or idx == len(tokens) - 1:
            return None
        return tokens[:idx], tokens[idx + 1:]

    def _lexicon_score(self, tokens: list) -> float:
        """Whole-review lexicon score (contrast handled inside)."""
        return self._score_span(tokens)

    @staticmethod
    def _normalise(raw: float) -> float:
        """Squash raw lexicon sum into [-1, 1] with a soft saturation curve."""
        if raw == 0:
            return 0.0
        return max(-1.0, min(1.0, raw / (1.0 + abs(raw)) * 1.6))

    def _textblob_score(self, text: str) -> float:
        if not _HAS_TEXTBLOB:
            return 0.0
        try:
            return max(-1.0, min(1.0, TextBlob(text).sentiment.polarity))
        except Exception:
            return 0.0

    def _vader_score(self, text: str) -> float:
        if _VADER is None:
            return 0.0
        try:
            return _VADER.polarity_scores(text)['compound']
        except Exception:
            return 0.0

    def _rating_score(self, rating) -> float:
        try:
            r = float(rating)
        except (TypeError, ValueError):
            return 0.0
        if r <= 0:
            return 0.0
        # 1 → -0.9, 3 → 0, 5 → +0.9
        return max(-1.0, min(1.0, ((r - 3) / 2.0) * 0.9))

    def _fuse(self, lexicon, textblob, vader, rating, tokens, rating_raw) -> float:
        """Weighted fusion with star-rating calibration.

        The domain lexicon carries the most weight (0.55) because it is the
        only signal that understands negation, intensifiers and contrast.
        TextBlob and VADER are general-purpose and blind to contrast — they
        read "Good product but the zipper broke" as positive — so they get
        smaller weights and the lexicon breaks ties between them.
        """
        signals = [(lexicon, 0.55)]
        if textblob:
            signals.append((textblob, 0.20))
        if vader:
            signals.append((vader, 0.25))

        wsum = sum(w for _, w in signals)
        text_signal = sum(s * w for s, w in signals) / wsum if wsum else 0.0

        # Disagreement resolution: the lexicon is contrast-aware, the general
        # models are not. If the review contains a contrast marker and they
        # point opposite ways, defer to the lexicon — it saw the "but".
        if self._has_contrast(tokens) and abs(lexicon) > 0.15:
            others = [s for s, _ in signals[1:]]
            if others:
                avg_others = sum(others) / len(others)
                if (lexicon > 0) != (avg_others > 0):
                    text_signal = lexicon

        has_text = len(tokens) >= 3
        try:
            r = float(rating_raw) if rating_raw is not None else None
        except (TypeError, ValueError):
            r = None

        if r is not None and has_text:
            combined = 0.85 * text_signal + 0.15 * rating
            if abs(text_signal) >= 0.25 and text_signal * rating < 0:
                combined = text_signal
        elif r is not None and not text_signal:
            combined = rating
        else:
            combined = 0.9 * text_signal + 0.1 * rating if r is not None else text_signal

        return max(-1.0, min(1.0, combined))

    @staticmethod
    def _has_contrast(tokens: list) -> bool:
        return any(t in CONTRAST_MARKERS for t in tokens)

    def _confidence(self, score, tokens, rating, sentiment) -> float:
        text_conf = min(len(tokens) / 15.0, 1.0)
        magnitude_conf = min(abs(score) / 0.7, 1.0)
        try:
            rating_conf = 0.7 if rating and float(rating) > 0 else 0.0
        except (TypeError, ValueError):
            rating_conf = 0.0
        conf = text_conf * 0.30 + magnitude_conf * 0.40 + rating_conf * 0.30
        return round(max(0.0, min(1.0, conf)), 2)

    # ------------------------------------------------------------------
    # Aspect internals
    # ------------------------------------------------------------------

    def _mentioned_aspects(self, tokens: list) -> list:
        """Aspects whose keywords appear in this review (word-boundary safe)."""
        token_set = set(t for t in tokens if t not in _STOPWORDS)
        mentioned = []
        for name, keywords in self._aspects.items():
            for kw in keywords:
                kw_parts = kw.split()
                if len(kw_parts) == 1:
                    if kw in token_set:
                        mentioned.append(name)
                        break
                else:
                    if self._phrase_in_tokens(kw_parts, tokens):
                        mentioned.append(name)
                        break
        return mentioned

    @staticmethod
    def _phrase_in_tokens(phrase_parts: list, tokens: list) -> bool:
        n = len(phrase_parts)
        for i in range(len(tokens) - n + 1):
            if tokens[i:i + n] == phrase_parts:
                return True
        return False

    def _aspect_sentiment(self, tokens: list, rating=None, clauses=None) -> list:
        """Aspects in this review, each with its own locally-scored sentiment.

        Scores the sentence/clause containing the aspect keyword rather than
        reusing the whole-review score — that is what makes a jacket stop
        showing 'Battery / Charging'.
        """
        if not tokens:
            return []

        # Split into clauses on contrast markers and sentence punctuation
        clauses = clauses or self._split_clauses(tokens)
        rating_score = self._rating_score(rating)
        results = []

        for name, keywords in self._aspects.items():
            relevant = [c for c in clauses if self._clause_mentions(c, keywords)]
            if not relevant:
                continue

            scores = [self._score_span(c) for c in relevant]
            avg = statistics.mean(scores)
            # Blend lightly with the star rating for stability
            blended = 0.8 * avg + 0.2 * rating_score

            if blended > self.POSITIVE_THRESHOLD:
                sent = 'positive'
            elif blended < self.NEGATIVE_THRESHOLD:
                sent = 'negative'
            else:
                sent = 'mixed'

            results.append({'name': name, 'sentiment': sent, 'score': round(blended, 2)})

        return results

    @staticmethod
    def _split_clauses(tokens: list) -> list:
        """Split a token list into clauses at contrast markers.

        Sentence punctuation is already gone by tokenisation, so clauses here
        are bounded by contrast words ("but", "however", ...).  Each aspect is
        scored only against the clauses that actually mention it, which is what
        keeps "Battery / Charging" off a jacket.
        """
        clauses, current = [], []
        for tok in tokens:
            if tok in CONTRAST_MARKERS:
                if current:
                    clauses.append(current)
                current = []
            else:
                current.append(tok)
        if current:
            clauses.append(current)
        return [c for c in clauses if c] or [tokens]

    @staticmethod
    def _clause_mentions(clause: list, keywords: list) -> bool:
        cs = set(clause)
        for kw in keywords:
            parts = kw.split()
            if len(parts) == 1:
                if kw in cs:
                    return True
            elif any(clause[i:i + len(parts)] == parts
                     for i in range(len(clause) - len(parts) + 1)):
                return True
        return False

    # ------------------------------------------------------------------

    def _neutral_result(self) -> dict:
        return {'sentiment': 'neutral', 'score': 0.0, 'polarity': 0.0,
                'confidence': 0.0, 'aspects': []}


# Singleton
analyzer = SentimentAnalyzer()


# ---------------------------------------------------------------------------
# Module-level convenience API (unchanged signatures)
# ---------------------------------------------------------------------------

def analyze_sentiment(text: str, rating: float = None) -> dict:
    return analyzer.analyze_text(text, rating)


def analyze_review_sentiment(reviews: list) -> dict:
    return analyzer.analyze_reviews(reviews)


def calculate_insight_score(sentiment_data: dict, rating: float, total_reviews: int) -> float:
    return analyzer.calculate_insight_score(sentiment_data, rating, total_reviews)


def extract_topics(reviews: list, top_n: int = 6) -> list:
    return analyzer.extract_topics(reviews, top_n)


def calculate_specs(reviews: list) -> dict:
    return analyzer.calculate_specs(reviews)


_TERM_NOISE = _STOPWORDS | {'good', 'great', 'best', 'worst', 'nice', 'bad', 'excellent', 'really', 'like',
    'much', 'well', 'even', 'still', 'only', 'dont', 'cant', 'rsquo', 'lsquo', 'quot', 'amp', 'nbsp',
    'laptop', 'phone', 'bag', 'online', 'thanks', 'thank', 'awesome', 'super', 'money', 'price'}


def extract_common_terms(reviews: list, limit: int = 8) -> dict:
    """Rank observed phrases by review frequency, with traceable supporting text."""
    buckets = {'positive': {}, 'negative': {}}
    for review in reviews:
        record = review if isinstance(review, dict) else {'text': str(review)}
        text = clean_review_text(record.get('text'))
        if not text:
            continue
        sentiment = str(record.get('sentiment') or '').lower()
        if sentiment not in ('positive', 'negative', 'neutral'):
            sentiment = analyzer.analyze_text(text, record.get('rating'))['sentiment']
        if sentiment not in buckets:
            continue
        # Preserve phrase boundaries and count a phrase only once per review.
        candidates = set()
        for clause in re.split(r'[.!?;,]+', text):
            tokens = _tokenise(clause)
            for left, right in zip(tokens, tokens[1:]):
                phrase = left + ' ' + right
                if (len(left) > 2 and len(right) > 2 and left not in _STOPWORDS and right not in _STOPWORDS
                        and left not in {'rsquo', 'lsquo', 'quot', 'nbsp', 'amp'}
                        and right not in {'rsquo', 'lsquo', 'quot', 'nbsp', 'amp'}
                        and any(word not in _TERM_NOISE for word in (left, right))):
                    candidates.add(phrase)
            candidates.update(word for word in tokens if len(word) > 3 and word not in _TERM_NOISE)
        for term in candidates:
            bucket = buckets[sentiment].setdefault(term, {'term': term, 'count': 0, 'examples': []})
            bucket['count'] += 1
            if len(bucket['examples']) < 2:
                bucket['examples'].append(text[:240])
    result = {}
    for sentiment, entries in buckets.items():
        ranked = sorted((entry for entry in entries.values() if entry['count'] >= 2),
                        key=lambda entry: (-entry['count'], -len(entry['term'].split()), entry['term']))
        selected = []
        for entry in ranked:
            if len(entry['term'].split()) == 1 and any(entry['term'] in other['term'].split() for other in selected):
                continue
            selected.append(entry)
            if len(selected) == limit:
                break
        result[sentiment + '_terms'] = [entry['term'] for entry in selected]
        result[sentiment + '_evidence'] = selected
    return result
