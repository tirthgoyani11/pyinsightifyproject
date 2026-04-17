"""
Sentiment analysis utility using TextBlob
"""
from textblob import TextBlob
import statistics


class SentimentAnalyzer:
    """Analyze sentiment of text and reviews"""
    
    def __init__(self):
        self.positive_threshold = 0.1
        self.negative_threshold = -0.1
    
    def analyze_text(self, text):
        """
        Analyze sentiment of a single text
        Returns: dict with sentiment, score, and polarity
        """
        if not text or not isinstance(text, str):
            return {
                'sentiment': 'neutral',
                'score': 0.0,
                'polarity': 0.0
            }
        
        try:
            blob = TextBlob(text)
            polarity = blob.sentiment.polarity
            
            # Classify sentiment
            if polarity > self.positive_threshold:
                sentiment = 'positive'
            elif polarity < self.negative_threshold:
                sentiment = 'negative'
            else:
                sentiment = 'neutral'
            
            return {
                'sentiment': sentiment,
                'score': round(polarity, 3),
                'polarity': round(polarity, 3)
            }
        except Exception as e:
            print(f"Sentiment analysis error: {e}")
            return {
                'sentiment': 'neutral',
                'score': 0.0,
                'polarity': 0.0
            }
    
    def analyze_reviews(self, reviews):
        """
        Analyze multiple reviews and calculate aggregate sentiment
        Returns: dict with sentiment breakdown and overall score
        """
        if not reviews:
            return {
                'positive': 0,
                'neutral': 0,
                'negative': 0,
                'overall_score': 0,
                'total': 0
            }
        
        sentiments = {'positive': 0, 'neutral': 0, 'negative': 0}
        scores = []
        
        for review in reviews:
            text = review.get('text', '')
            result = self.analyze_text(text)
            sentiments[result['sentiment']] += 1
            scores.append(result['score'])
        
        total = len(reviews)
        overall_score = statistics.mean(scores) if scores else 0
        
        return {
            'positive': round((sentiments['positive'] / total) * 100, 1),
            'neutral': round((sentiments['neutral'] / total) * 100, 1),
            'negative': round((sentiments['negative'] / total) * 100, 1),
            'overall_score': round(overall_score, 3),
            'total': total
        }
    
    def calculate_insight_score(self, sentiment_data, rating, total_reviews):
        """
        Calculate overall insight score based on sentiment, rating, and review count
        Score ranges from 0-100
        """
        try:
            # Normalize rating (0-5 to 0-100)
            rating_score = (rating / 5.0) * 40 if rating else 0
            
            # Sentiment contribution (max 40 points)
            sentiment_score = sentiment_data.get('positive', 0) * 0.4
            
            # Review count contribution (max 20 points)
            review_score = min((total_reviews / 1000) * 20, 20)
            
            insight_score = rating_score + sentiment_score + review_score
            
            return round(min(insight_score, 100), 1)
        except:
            return 0.0
    
    def extract_topics(self, reviews, top_n=5):
        """
        Extract common topics/themes from reviews
        Simplified version - in production use NLP libraries like spaCy
        """
        if not reviews:
            return []
        
        # Common product-related keywords
        keywords = {
            'quality': [], 'price': [], 'value': [], 'durability': [],
            'performance': [], 'design': [], 'battery': [], 'size': [],
            'warranty': [], 'customer service': []
        }
        
        for review in reviews:
            text = review.get('text', '').lower()
            sentiment_result = self.analyze_text(text)
            
            for keyword in keywords:
                if keyword in text:
                    keywords[keyword].append(sentiment_result['score'])
        
        # Calculate average sentiment for each topic
        topics = []
        for keyword, scores in keywords.items():
            if scores:
                avg_score = statistics.mean(scores)
                sentiment = 'positive' if avg_score > 0.1 else ('negative' if avg_score < -0.1 else 'mixed')
                topics.append({
                    'name': keyword.title(),
                    'sentiment': sentiment,
                    'mention_count': len(scores),
                    'score': round(avg_score, 2)
                })
        
        # Sort by mention count and return top N
        topics.sort(key=lambda x: x['mention_count'], reverse=True)
        return topics[:top_n]
    
    def calculate_specs_from_reviews(self, reviews):
        """
        Calculate performance specs based on review sentiment
        """
        if not reviews:
            return {
                'quality': 0, 'value': 0, 'durability': 0,
                'features': 0, 'performance': 0
            }
        
        spec_keywords = {
            'quality': ['quality', 'build', 'premium', 'cheap', 'solid'],
            'value': ['value', 'price', 'worth', 'money', 'affordable'],
            'durability': ['durable', 'lasting', 'sturdy', 'broke', 'fragile'],
            'features': ['features', 'functionality', 'options', 'versatile'],
            'performance': ['performance', 'fast', 'slow', 'efficient', 'works']
        }
        
        specs = {}
        
        for spec_name, keywords in spec_keywords.items():
            scores = []
            for review in reviews:
                text = review.get('text', '').lower()
                for keyword in keywords:
                    if keyword in text:
                        result = self.analyze_text(text)
                        scores.append(result['score'])
            
            if scores:
                # Convert -1 to 1 range to 0 to 100
                avg_score = statistics.mean(scores)
                normalized = ((avg_score + 1) / 2) * 100
                specs[spec_name] = round(normalized, 1)
            else:
                specs[spec_name] = 50.0  # Default neutral score
        
        return specs


# Singleton instance
analyzer = SentimentAnalyzer()


def analyze_sentiment(text):
    """Analyze sentiment of single text"""
    return analyzer.analyze_text(text)


def analyze_review_sentiment(reviews):
    """Analyze sentiment of multiple reviews"""
    return analyzer.analyze_reviews(reviews)


def calculate_insight_score(sentiment_data, rating, total_reviews):
    """Calculate overall insight score"""
    return analyzer.calculate_insight_score(sentiment_data, rating, total_reviews)


def extract_topics(reviews, top_n=5):
    """Extract topics from reviews"""
    return analyzer.extract_topics(reviews, top_n)


def calculate_specs(reviews):
    """Calculate performance specs"""
    return analyzer.calculate_specs_from_reviews(reviews)
