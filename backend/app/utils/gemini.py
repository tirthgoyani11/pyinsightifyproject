"""
Gemini AI Integration for Advanced Analysis
Uses Google's Gemini 2.5 Flash for sentiment analysis and text processing
"""
import os
import re
import json
import google.generativeai as genai
from typing import List, Dict, Optional


class GeminiAnalyzer:
    """Gemini AI analyzer for product reviews and sentiment analysis"""
    
    def __init__(self, api_key: Optional[str] = None):
        """Initialize Gemini with API key"""
        self.api_key = api_key or os.getenv('GEMINI_API_KEY')
        
        if not self.api_key or self.api_key == 'your-gemini-api-key-here':
            print("⚠️  Warning: Gemini API key not configured. Using fallback analysis.")
            self.enabled = False
        else:
            genai.configure(api_key=self.api_key)
            self.model = genai.GenerativeModel('gemini-2.5-flash')
            self.enabled = True
            print("✅ Gemini AI enabled for advanced analysis")
    
    def analyze_review_sentiment(self, review_text: str) -> Dict:
        """
        Analyze sentiment of a single review using Gemini
        Returns: dict with sentiment, score, and reasoning
        """
        if not self.enabled:
            return self._fallback_sentiment(review_text)
        
        try:
            prompt = f"""Analyze the sentiment of this product review and provide a JSON response.

Review: "{review_text}"

Return ONLY a valid JSON object with this exact structure:
{{
  "sentiment": "positive" | "negative" | "neutral",
  "score": <number between -1 and 1>,
  "confidence": <number between 0 and 1>,
  "reasoning": "<brief explanation>"
}}

Rules:
- sentiment: "positive" if score > 0.1, "negative" if score < -0.1, else "neutral"
- score: -1 (very negative) to +1 (very positive)
- confidence: how certain you are (0-1)
- reasoning: one sentence explaining the classification
"""
            
            response = self.model.generate_content(prompt)
            result = json.loads(response.text.strip())
            
            return {
                'sentiment': result.get('sentiment', 'neutral'),
                'score': float(result.get('score', 0)),
                'confidence': float(result.get('confidence', 0)),
                'reasoning': result.get('reasoning', ''),
                'polarity': float(result.get('score', 0))
            }
            
        except Exception as e:
            print(f"Gemini sentiment analysis error: {e}")
            return self._fallback_sentiment(review_text)
    
    def analyze_multiple_reviews(self, reviews: List[str], max_reviews: int = 50) -> Dict:
        """
        Analyze multiple reviews and get aggregate insights
        Returns: dict with sentiment breakdown, topics, and summary
        """
        if not self.enabled:
            print("⚠️  Gemini disabled, using fallback analysis for multiple reviews")
            return self._fallback_multiple_analysis(reviews)
        
        try:
            # Limit reviews for API efficiency
            review_sample = reviews[:max_reviews]
            reviews_text = "\n\n".join([f"{i+1}. {r}" for i, r in enumerate(review_sample)])
            
            print(f"🤖 Analyzing {len(review_sample)} reviews with Gemini AI...")
            
            prompt = f"""Analyze these {len(review_sample)} product reviews and provide comprehensive insights.

Reviews:
{reviews_text}

Return ONLY a valid JSON object with this exact structure:
{{
  "sentiment_breakdown": {{
    "positive": <percentage 0-100>,
    "neutral": <percentage 0-100>,
    "negative": <percentage 0-100>
  }},
  "overall_score": <number between -1 and 1>,
  "top_topics": [
    {{"name": "<topic>", "sentiment": "positive|negative|mixed", "mentions": <count>}},
    ...5 topics max
  ],
  "key_strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "key_weaknesses": ["<weakness 1>", "<weakness 2>", "<weakness 3>"],
  "summary": "<2-3 sentence overall summary>"
}}

Ensure percentages add up to 100.
"""
            
            response = self.model.generate_content(prompt)
            response_text = response.text.strip()
            
            # Try to extract JSON from response (in case it has markdown code blocks)
            if '```json' in response_text:
                response_text = response_text.split('```json')[1].split('```')[0].strip()
            elif '```' in response_text:
                response_text = response_text.split('```')[1].split('```')[0].strip()
            
            result = json.loads(response_text)
            
            print(f"✅ Gemini analysis complete - {len(result.get('key_strengths', []))} strengths, {len(result.get('key_weaknesses', []))} weaknesses found")
            
            return {
                'positive': float(result['sentiment_breakdown'].get('positive', 0)),
                'neutral': float(result['sentiment_breakdown'].get('neutral', 0)),
                'negative': float(result['sentiment_breakdown'].get('negative', 0)),
                'overall_score': float(result.get('overall_score', 0)),
                'total': len(reviews),
                'topics': result.get('top_topics', []),
                'strengths': result.get('key_strengths', []),
                'weaknesses': result.get('key_weaknesses', []),
                'summary': result.get('summary', '')
            }
            
        except json.JSONDecodeError as e:
            print(f"❌ Gemini returned invalid JSON: {e}")
            print(f"   Response was: {response_text[:200]}...")
            print("   Falling back to keyword analysis")
            return self._fallback_multiple_analysis(reviews)
        except Exception as e:
            print(f"❌ Gemini multiple review analysis error: {e}")
            print("   Falling back to keyword analysis")
            return self._fallback_multiple_analysis(reviews)
    
    def extract_product_specs(self, reviews: List[str]) -> Dict:
        """
        Extract quality, value, durability, features, performance scores from reviews
        Returns: dict with spec scores 0-100
        """
        if not self.enabled:
            return self._fallback_specs()
        
        try:
            review_sample = reviews[:30]
            reviews_text = "\n".join(review_sample)
            
            prompt = f"""Based on these product reviews, rate the product on these 5 dimensions (0-100):

Reviews:
{reviews_text}

Return ONLY a valid JSON object:
{{
  "quality": <score 0-100>,
  "value": <score 0-100>,
  "durability": <score 0-100>,
  "features": <score 0-100>,
  "performance": <score 0-100>
}}

Guidelines:
- 0-40: Poor
- 41-60: Average
- 61-80: Good
- 81-100: Excellent
"""
            
            response = self.model.generate_content(prompt)
            
            # Extract JSON from response (handle markdown-wrapped responses)
            response_text = response.text.strip()
            if '```json' in response_text:
                json_match = re.search(r'```json\s*(.*?)\s*```', response_text, re.DOTALL)
                if json_match:
                    response_text = json_match.group(1).strip()
            elif '```' in response_text:
                # Handle plain code blocks
                response_text = response_text.replace('```', '').strip()
            
            result = json.loads(response_text)
            
            return {
                'quality': float(result.get('quality', 50)),
                'value': float(result.get('value', 50)),
                'durability': float(result.get('durability', 50)),
                'features': float(result.get('features', 50)),
                'performance': float(result.get('performance', 50))
            }
            
        except Exception as e:
            print(f"Gemini specs extraction error: {e}")
            return self._fallback_specs()
    
    def generate_insight_summary(self, product_name: str, reviews: List[str]) -> str:
        """
        Generate a concise insight summary for the product
        """
        if not self.enabled:
            return f"Analysis of {product_name} based on customer reviews."
        
        try:
            review_sample = reviews[:20]
            reviews_text = "\n".join(review_sample)
            
            prompt = f"""Create a concise 2-3 sentence insight summary for this product based on customer reviews.

Product: {product_name}

Reviews:
{reviews_text}

Write a professional summary highlighting the overall sentiment and key points.
Do not use JSON, just return plain text.
"""
            
            response = self.model.generate_content(prompt)
            return response.text.strip()
            
        except Exception as e:
            print(f"Gemini summary generation error: {e}")
            return f"Analysis of {product_name} based on {len(reviews)} customer reviews."
    
    # Fallback methods (when Gemini is not available)
    
    def _fallback_sentiment(self, text: str) -> Dict:
        """Simple fallback sentiment analysis"""
        positive_words = ['good', 'great', 'excellent', 'amazing', 'love', 'best', 'perfect']
        negative_words = ['bad', 'poor', 'terrible', 'waste', 'disappointed', 'worst', 'awful']
        
        text_lower = text.lower()
        pos_count = sum(1 for word in positive_words if word in text_lower)
        neg_count = sum(1 for word in negative_words if word in text_lower)
        
        score = (pos_count - neg_count) / max(len(text.split()), 1)
        score = max(-1, min(1, score))
        
        if score > 0.1:
            sentiment = 'positive'
        elif score < -0.1:
            sentiment = 'negative'
        else:
            sentiment = 'neutral'
        
        return {
            'sentiment': sentiment,
            'score': score,
            'confidence': 0.5,
            'reasoning': 'Fallback keyword analysis',
            'polarity': score
        }
    
    def _fallback_multiple_analysis(self, reviews: List[str]) -> Dict:
        """Fallback for multiple review analysis with basic keyword extraction"""
        sentiments = [self._fallback_sentiment(r) for r in reviews[:50]]
        
        pos = sum(1 for s in sentiments if s['sentiment'] == 'positive')
        neg = sum(1 for s in sentiments if s['sentiment'] == 'negative')
        neu = len(sentiments) - pos - neg
        
        total = len(sentiments)
        
        # Extract basic strengths and weaknesses using keyword analysis
        strengths = []
        weaknesses = []
        
        # Positive keywords for strengths
        strength_keywords = [
            ('great quality', 'excellent'), ('good value', 'affordable'), 
            ('fast delivery', 'quick shipping'), ('works well', 'performs great'),
            ('highly recommend', 'worth buying'), ('love', 'amazing'),
            ('perfect', 'fantastic'), ('best', 'superb'), ('easy to use', 'simple')
        ]
        
        # Negative keywords for weaknesses
        weakness_keywords = [
            ('poor quality', 'bad quality'), ('overpriced', 'expensive'),
            ('late delivery', 'slow shipping'), ('doesn\'t work', 'broken'),
            ('not recommend', 'waste of money'), ('terrible', 'awful'),
            ('defective', 'faulty'), ('disappointed', 'poor'), ('issues', 'problems')
        ]
        
        # Analyze positive reviews for strengths
        positive_reviews = [r for r, s in zip(reviews, sentiments) if s['sentiment'] == 'positive']
        strength_counts = {}
        for review in positive_reviews[:20]:
            review_lower = review.lower()
            for keywords in strength_keywords:
                for keyword in keywords:
                    if keyword in review_lower:
                        strength_counts[keywords[0]] = strength_counts.get(keywords[0], 0) + 1
                        break
        
        # Get top 3-5 strengths
        top_strengths = sorted(strength_counts.items(), key=lambda x: x[1], reverse=True)[:5]
        strengths = [s[0].title() for s in top_strengths if s[1] > 1]
        
        # If no strengths found, provide generic ones based on sentiment
        if not strengths and pos > total * 0.5:
            strengths = ['Good customer satisfaction', 'Positive overall reviews', 'Recommended by users']
        
        # Analyze negative reviews for weaknesses
        negative_reviews = [r for r, s in zip(reviews, sentiments) if s['sentiment'] == 'negative']
        weakness_counts = {}
        for review in negative_reviews[:20]:
            review_lower = review.lower()
            for keywords in weakness_keywords:
                for keyword in keywords:
                    if keyword in review_lower:
                        weakness_counts[keywords[0]] = weakness_counts.get(keywords[0], 0) + 1
                        break
        
        # Get top 3-5 weaknesses
        top_weaknesses = sorted(weakness_counts.items(), key=lambda x: x[1], reverse=True)[:5]
        weaknesses = [w[0].title() for w in top_weaknesses if w[1] > 1]
        
        # If no weaknesses found but there are negative reviews, provide generic ones
        if not weaknesses and neg > total * 0.1:
            weaknesses = ['Some customer complaints', 'Mixed feedback on certain aspects']
        
        return {
            'positive': round((pos / total) * 100, 1) if total > 0 else 0,
            'neutral': round((neu / total) * 100, 1) if total > 0 else 0,
            'negative': round((neg / total) * 100, 1) if total > 0 else 0,
            'overall_score': sum(s['score'] for s in sentiments) / total if total > 0 else 0,
            'total': len(reviews),
            'topics': [],
            'strengths': strengths,
            'weaknesses': weaknesses,
            'summary': f'Analysis based on {len(reviews)} customer reviews showing {round((pos/total)*100) if total > 0 else 0}% positive sentiment.'
        }
    
    def _fallback_specs(self) -> Dict:
        """Fallback specs (neutral scores)"""
        return {
            'quality': 50.0,
            'value': 50.0,
            'durability': 50.0,
            'features': 50.0,
            'performance': 50.0
        }
    
    def extract_common_terms(self, product_name: str, reviews: List[str], limit: int = 8) -> Dict:
        """
        Extract most common positive and negative terms from reviews
        Returns: dict with positive_terms and negative_terms lists
        """
        if not self.enabled:
            return self._fallback_common_terms()
        
        try:
            review_sample = reviews[:50]  # Use first 50 reviews
            reviews_text = "\n".join(review_sample)
            
            print(f"🤖 Extracting common terms for {product_name} using Gemini AI...")
            
            prompt = f"""Analyze these reviews for "{product_name}" and extract the most frequently mentioned positive and negative terms.

Reviews:
{reviews_text}

Return ONLY a valid JSON object with this structure:
{{
  "positive_terms": ["term1", "term2", "term3", "term4", "term5", "term6", "term7", "term8"],
  "negative_terms": ["term1", "term2", "term3", "term4", "term5", "term6"]
}}

Guidelines:
- Extract ACTUAL words/phrases used in the reviews
- Positive terms: qualities, features, benefits mentioned positively
- Negative terms: complaints, issues, problems mentioned
- Use single words or short 2-word phrases
- Make them specific to this product type
- Examples of good terms: "fast", "excellent quality", "great value", "expensive", "poor battery", "overpriced"
- Avoid generic terms like "good" or "bad" - be specific
- Return exactly {limit} positive terms and 6 negative terms
"""
            
            response = self.model.generate_content(prompt)
            
            # Extract JSON from response
            response_text = response.text.strip()
            if '```json' in response_text:
                json_match = re.search(r'```json\s*(.*?)\s*```', response_text, re.DOTALL)
                if json_match:
                    response_text = json_match.group(1).strip()
            elif '```' in response_text:
                response_text = response_text.replace('```', '').strip()
            
            result = json.loads(response_text)
            
            print(f"✅ Extracted {len(result.get('positive_terms', []))} positive and {len(result.get('negative_terms', []))} negative terms")
            
            return {
                'positive_terms': result.get('positive_terms', [])[:limit],
                'negative_terms': result.get('negative_terms', [])[:6]
            }
            
        except Exception as e:
            print(f"❌ Term extraction failed: {e}")
            return self._fallback_common_terms()
    
    def _fallback_common_terms(self) -> Dict:
        """Fallback common terms when Gemini is unavailable"""
        return {
            'positive_terms': ['excellent', 'fast', 'beautiful', 'amazing', 'smooth', 'premium', 'love', 'great value'],
            'negative_terms': ['expensive', 'bloatware', 'disappointing', 'overpriced', 'warm', 'poor']
        }


# Singleton instance
_gemini_analyzer = None


def get_gemini_analyzer() -> GeminiAnalyzer:
    """Get or create Gemini analyzer singleton"""
    global _gemini_analyzer
    if _gemini_analyzer is None:
        _gemini_analyzer = GeminiAnalyzer()
    return _gemini_analyzer


# Convenience functions

def analyze_sentiment(text: str) -> Dict:
    """Analyze sentiment of single text"""
    analyzer = get_gemini_analyzer()
    return analyzer.analyze_review_sentiment(text)


def analyze_review_sentiment(reviews: List[Dict]) -> Dict:
    """Analyze sentiment of multiple reviews"""
    analyzer = get_gemini_analyzer()
    review_texts = [r.get('text', '') for r in reviews if r.get('text')]
    return analyzer.analyze_multiple_reviews(review_texts)


def calculate_specs(reviews: List[Dict]) -> Dict:
    """Calculate performance specs from reviews"""
    analyzer = get_gemini_analyzer()
    review_texts = [r.get('text', '') for r in reviews if r.get('text')]
    return analyzer.extract_product_specs(review_texts)


def generate_summary(product_name: str, reviews: List[Dict]) -> str:
    """Generate insight summary"""
    analyzer = get_gemini_analyzer()
    review_texts = [r.get('text', '') for r in reviews if r.get('text')]
    return analyzer.generate_insight_summary(product_name, review_texts)


def extract_common_terms(product_name: str, reviews: List[Dict], limit: int = 8) -> Dict:
    """Extract common positive and negative terms from reviews"""
    analyzer = get_gemini_analyzer()
    review_texts = [r.get('text', '') for r in reviews if r.get('text')]
    return analyzer.extract_common_terms(product_name, review_texts, limit)
