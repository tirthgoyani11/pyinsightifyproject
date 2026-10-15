# Report chart component

The analysis page mounts an isolated React component using MUI X Charts. The rest
of the application remains plain HTML and JavaScript.

Rebuild after editing `sentiment-chart.jsx`:

```sh
npm ci
npm run build:charts
```

Serve the checked-in `js/vendor/sentiment-chart.min.js` and accompanying license
file with the application. No CDN or browser-side JSX compiler is required.

`js/analysis.js` publishes `{ sentiment, totalCount, reviews }` through
`window.insightifyChartData` and the `insightify:chart-data` event. This also handles
the component loading before or after the API response.

When reviews are loaded, both rings use those same reviews: the inner ring groups
by sentiment or star rating, and the outer ring subdivides each group by the
other dimension. Unrated reviews remain visible in the sentiment view and are
excluded from the star-rating view. With no reviews, only the backend's aggregate
sentiment is shown. Missing values do not become sample data.

Motion follows `prefers-reduced-motion`. Chart values are repeated as readable
text, and a text fallback is available if the component bundle fails to load.
