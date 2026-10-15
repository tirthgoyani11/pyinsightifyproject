"""
RoBERTa-Large + BART-Base Neural NLP Module.
Provides sequence classification, aspect extraction, and abstractive summarization.
"""
from app.utils.gemini import (
    RoBERTaBARTAnalyzer,
    get_analyzer,
    analyze_sentiment,
    analyze_review_sentiment,
    calculate_specs,
    generate_summary,
    extract_common_terms,
)

__all__ = [
    'RoBERTaBARTAnalyzer',
    'get_analyzer',
    'analyze_sentiment',
    'analyze_review_sentiment',
    'calculate_specs',
    'generate_summary',
    'extract_common_terms',
]
