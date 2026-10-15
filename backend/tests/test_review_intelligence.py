"""Behavioral regressions for evidence, classification, and hosted-model batching."""
import json
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).parents[1]))
from app.utils.sentiment import analyzer, extract_common_terms
from app.utils.review_quality import clean_review_text, prepare_reviews, parse_review_date, review_quality
from app.utils.gemini import RoBERTaBARTAnalyzer


class ReviewIntelligenceTests(unittest.TestCase):
    def test_nested_html_entities_and_tags_are_cleaned(self):
        self.assertEqual(clean_review_text('<b>It isn&amp;rsquo;t good</b> READ MORE'), 'It isn’t good')

    def test_duplicate_empty_and_synthetic_reviews_are_removed(self):
        reviews, stats = prepare_reviews([
            {'author': 'Buyer', 'text': 'Great battery!', 'rating': 5},
            {'author': 'Buyer', 'text': 'Great battery', 'rating': 5},
            {'author': 'Other buyer', 'text': 'Great battery', 'rating': 9},
            {'text': ''}, {'text': 'Fake example', 'source': 'mock'}])
        self.assertEqual(len(reviews), 2)
        self.assertIsNone(reviews[1]['rating'])
        self.assertEqual(stats['duplicates_removed'], 1)
        self.assertEqual(stats['synthetic_removed'], 1)
        self.assertEqual(stats['empty_removed'], 1)

    def test_empty_terms_do_not_invent_feedback(self):
        result = extract_common_terms([])
        self.assertEqual(result['positive_terms'], [])
        self.assertEqual(result['negative_terms'], [])

    def test_phrase_counts_are_per_review_not_repetitions(self):
        reviews = [{'text': 'Battery life battery life battery life', 'sentiment': 'positive'},
                   {'text': 'Excellent battery life', 'sentiment': 'positive'}]
        evidence = extract_common_terms(reviews)['positive_evidence']
        self.assertEqual(next(item for item in evidence if item['term'] == 'battery life')['count'], 2)

    def test_noise_does_not_enter_terms(self):
        result = extract_common_terms([{'text': 'rsquo laptop money online', 'sentiment': 'negative'}] * 3)
        self.assertEqual(result['negative_terms'], [])

    def test_saved_sentiment_is_used_without_reclassifying_terms(self):
        result = extract_common_terms([{'text': 'Battery life is poor', 'rating': 5, 'sentiment': 'negative'}] * 2)
        self.assertTrue(result['negative_terms'])
        self.assertFalse(result['positive_terms'])

    def test_contradictory_stars_do_not_override_clear_text(self):
        for text, stars, expected in [('Terrible battery, broken screen and waste of money', 5, 'negative'),
                                      ('Excellent quality and very comfortable', 1, 'positive'),
                                      ('Not good at all', 5, 'negative'), ('Not bad at all', 1, 'positive')]:
            with self.subTest(text=text):
                self.assertEqual(analyzer.analyze_text(text, stars)['sentiment'], expected)

    def test_aspects_keep_opposite_sentence_sentiments(self):
        topics = {item['name']: item for item in analyzer.extract_topics([
            {'text': 'Battery is excellent. Screen is terrible.', 'rating': 4}])}
        self.assertEqual(topics['Battery & Charging']['sentiment'], 'positive')
        self.assertEqual(topics['Display & Screen']['sentiment'], 'negative')

    def test_negation_and_entities(self):
        self.assertEqual(analyzer.analyze_text('It isn&amp;rsquo;t good', 2)['sentiment'], 'negative')

    def test_unknown_dates_do_not_become_today(self):
        self.assertIsNone(parse_review_date('Verified Purchase'))
        self.assertEqual(parse_review_date('Reviewed in India on 13 October 2026').isoformat(), '2026-10-13T00:00:00')

    def test_sample_metadata_is_not_a_claim_of_accuracy(self):
        metadata = review_quality([{'text': 'Good', 'verified': False, 'sentiment': 'positive'}], 'local-lexicon-v2')
        self.assertEqual(metadata['short_reviews'], 1)
        self.assertEqual(metadata['verified'], 0)
        self.assertEqual(metadata['source_label'], 'Local sentiment engine')
        self.assertNotIn('accuracy', metadata)

    def test_unmentioned_aspects_stay_unscored(self):
        specs = analyzer.calculate_specs([{'text': 'Battery life is excellent', 'rating': 5}])
        self.assertIsNone(specs['quality'])
        self.assertIsNotNone(specs['performance'])

    def test_fallback_does_not_invent_camera_or_sizing_advice(self):
        engine = RoBERTaBARTAnalyzer(api_key='test-key')
        result = engine._fallback_batch([{'text': 'Battery is excellent. Screen is terrible.', 'rating': 4}])
        names = [aspect['name'] for aspect in result['dynamic_aspects']]
        self.assertNotIn('Camera Quality', names)
        self.assertIsNone(result['buyer_guide']['fit_feedback'])
        self.assertTrue(all('mention_count' in item for item in result['dynamic_aspects']))

    def test_absent_evidence_does_not_become_positive_score(self):
        self.assertEqual(analyzer.calculate_insight_score({}, None, 0), 0)

    def test_hosted_batches_cover_every_review_and_ignore_foreign_ids(self):
        engine = RoBERTaBARTAnalyzer(api_key='test-key')
        reviews = [{'text': 'Battery is excellent', 'rating': 5} for _ in range(47)]
        starts = []
        def classify(items, start_id):
            starts.append(start_id)
            return [{'id': i, 'sentiment': 'positive', 'score': .8, 'confidence': .7}
                    for i in range(start_id, start_id + len(items))] + [{'id': 999, 'sentiment': 'negative', 'score': -.9}]
        primary = {'reviews': [{'id': i, 'sentiment': 'positive', 'score': .8, 'confidence': .7} for i in range(1, 21)] +
                   [{'id': 1, 'sentiment': 'positive', 'score': .8, 'confidence': .7}, {'id': 999, 'sentiment': 'negative', 'score': -.9}]}
        with patch.object(engine, '_chat', return_value=json.dumps(primary)), patch.object(engine, '_classify_remaining', side_effect=classify):
            result = engine.analyze_batch(reviews, 'Computer')
        self.assertEqual(starts, [21, 41])
        self.assertEqual([r['id'] for r in result['reviews']], list(range(1, 48)))
        self.assertEqual(result['sentiment']['total'], 47)
        self.assertEqual(result['sentiment']['positive'], 100)
        self.assertTrue(result['source'].startswith('groq:'))


if __name__ == '__main__':
    unittest.main()
