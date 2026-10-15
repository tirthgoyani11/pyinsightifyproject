# Review analysis and evidence

Amazon and Flipkart share a review-cleaning step before classification. It decodes
HTML entities, removes empty and synthetic records, validates star ratings, and
removes repeated records from the same author. Missing ratings and unknown dates
stay missing; Amazon excerpts do not acquire inferred stars or verification.

Hosted analysis uses the configured Groq model, with a local lexical fallback.
It does not run RoBERTa or BART. Hosted batches cover every input index, deduplicate
returned IDs, ignore IDs outside the current batch, and locally classify missing
outputs. Saved sentiment percentages are calculated from the per-review labels
that are actually stored.

The local engine handles negation and scores individual sentences/contrast
clauses for aspect sentiment. Clear textual polarity can override conflicting
stars. These are targeted behavioral improvements, not a measured claim of
accuracy on a representative held-out dataset. The engine is English-focused;
non-English reviews and sarcasm remain limitations.

Recurring phrases come from actual review text and require at least two reviews
in the same sentiment group. Counts represent reviews, not raw word occurrences.
Both lists include supporting excerpts in the API. The interface links each
phrase to the corresponding review filter. No phrases are invented for empty
lists. Unmentioned local aspect dimensions remain unscored, and fallback buyer
guidance does not invent product specifications or use cases.

The report displays sample size, verified purchases, brief-review count, actual
engine provenance, and the sample limitations. Existing reports get newly
extracted phrase evidence when opened. Use **Refresh analysis** to reclassify a
saved product. Refresh replaces the report in one transaction and preserves its
identity and the previous report if processing fails.

Run the offline regression suite without external NLP calls:

```sh
backend/venv/bin/python -m unittest discover -s backend/tests -v
```

Tests use isolated in-memory storage. They cover both retailer ingestion paths,
Flipkart pagination, Amazon missing-data behavior, entity handling, deduplication,
negation, mixed aspect sentiment, contradictory stars, hosted-batch coverage, and
successful/failed refreshes. They are not a general sentiment benchmark.
