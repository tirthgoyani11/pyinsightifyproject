# Common Terms Feature - Product-Specific Keywords

## Overview
Enhanced the analysis page to display product-specific positive and negative terms extracted by Gemini AI from actual reviews, replacing generic mock data.

## Changes Made

### 1. Backend - Gemini AI Integration
**File:** `backend/app/utils/gemini.py`

Added new method `extract_common_terms()`:
- Analyzes up to 50 reviews to extract commonly mentioned terms
- Uses Gemini AI to identify 8 positive and 6 negative keywords
- Returns product-specific terms, not generic adjectives
- Falls back to template terms if AI unavailable

```python
def extract_common_terms(product_name: str, reviews: List[str], limit: int = 8) -> Dict:
    """Extract most common positive and negative terms from reviews"""
```

**Features:**
- Extracts actual words/phrases from customer reviews
- Positive terms: qualities, features, benefits
- Negative terms: complaints, issues, problems
- Smart prompt engineering for relevant results

### 2. Backend - Analysis Endpoint
**File:** `backend/app/routes/analysis.py`

Updated `get_analysis()` endpoint:
- Imports `extract_common_terms` from Gemini utility
- Calls Gemini to extract terms from product reviews
- Adds `common_terms` field to API response

**API Response Structure:**
```json
{
  "analysis": {
    "common_terms": {
      "positive_terms": ["fast", "reliable", "quality", ...],
      "negative_terms": ["expensive", "overpriced", "hot", ...]
    }
  }
}
```

### 3. Frontend - Dynamic Display
**File:** `js/analysis.js`

Added `displayCommonTerms()` function:
- Receives terms from API
- Dynamically renders word clouds
- Applies font-size scaling (larger = more important)
- Updates both positive and negative term clouds

**Visual Features:**
- Font sizes range from 2.2rem to 0.8rem (positive)
- Font sizes range from 1.9rem to 0.5rem (negative)
- Uses CSS custom properties for colors
- Smooth, visually appealing layout

### 4. AI Review Generation Limit
**File:** `backend/app/utils/scraper.py`

Limited AI-generated reviews to **25 maximum**:
```python
count = min(count, 25)  # Limit to 25 reviews
```

**Reasons:**
- Reduces Gemini API costs
- Faster response times
- Still statistically significant for analysis
- 25 reviews provide enough data for sentiment analysis

## How It Works

### Flow:
1. User views product analysis page
2. Frontend calls `/api/analysis/<product_id>`
3. Backend retrieves product reviews from database
4. Gemini AI analyzes review texts
5. Extracts 8 positive + 6 negative terms
6. Returns terms in API response
7. Frontend dynamically renders word clouds

### Example Output:

**Positive Terms (for Samsung 990 PRO SSD):**
- fast
- excellent performance
- reliable
- great value
- premium build
- smooth operation
- blazing speed
- worth it

**Negative Terms:**
- expensive
- runs hot
- overpriced
- thermal issues
- pricey
- warranty concerns

## Testing

### Test the Feature:
1. Start backend server: `cd backend && start.bat`
2. Open `analysis.html?id=<product_id>` in browser
3. Check browser console for: `🤖 Extracting common terms using Gemini AI...`
4. Verify "Most Common Terms" section shows product-specific words
5. Compare to previous generic terms (excellent, fast, expensive, poor)

### Expected Console Output:
```
🤖 Extracting common terms for Samsung 990 PRO SSD using Gemini AI...
✅ Extracted 8 positive and 6 negative terms
```

## Benefits

### Before (Mock Data):
- Generic terms: excellent, fast, beautiful, amazing
- Not product-specific
- Same for all products
- No AI analysis

### After (Gemini-Powered):
- Product-specific: "blazing speed", "thermal issues"
- Extracted from actual reviews
- Unique for each product
- AI-powered insights

## Configuration

### Gemini API Key:
Set in `backend/config.py`:
```python
GEMINI_API_KEY = "AIzaSyDIjG..."
```

### Adjust Term Count:
In `backend/app/utils/gemini.py`:
```python
def extract_common_terms(self, product_name: str, reviews: List[str], limit: int = 8)
```
Change `limit=8` to desired number of positive terms.

### Adjust Review Limit:
In `backend/app/utils/scraper.py`:
```python
count = min(count, 25)  # Change 25 to desired max
```

## Troubleshooting

### Terms not showing:
1. Check browser console for errors
2. Verify Gemini API key is set
3. Check backend logs for AI extraction errors
4. Ensure product has reviews in database

### Generic terms appearing:
- Fallback terms used when Gemini unavailable
- Check API key validity
- Review backend logs for API errors

### Slow loading:
- Gemini analysis takes 2-5 seconds
- Shows loading state during extraction
- Consider caching terms in database

## Future Enhancements

1. **Cache Terms:** Store extracted terms in database
2. **Multi-Language:** Support Hindi/regional languages
3. **Frequency Scores:** Show how often each term appears
4. **Hover Details:** Show example reviews containing term
5. **Trend Analysis:** Track term changes over time
6. **Visual Improvements:** Add hover effects, animations

## Related Documentation

- `AI_REVIEW_GENERATION.md` - AI-powered review generation
- `API_DOCUMENTATION.md` - API endpoints reference
- `ARCHITECTURE.md` - System architecture overview
