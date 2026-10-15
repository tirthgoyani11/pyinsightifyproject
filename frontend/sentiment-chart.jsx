import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { PieChart } from '@mui/x-charts/PieChart';
import { useDrawingArea } from '@mui/x-charts/hooks';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import { createTheme, ThemeProvider } from '@mui/material/styles';

const colors = { positive: '#399b83', negative: '#e8867b', neutral: '#a3b2c3' };
const names = { positive: 'Positive', negative: 'Negative', neutral: 'Neutral' };
const ratingColors = ['#dc8b80', '#e5b08a', '#b5bd9a', '#7db9af', '#448e86'];
const theme = createTheme({ typography: { fontFamily: 'inherit', fontSize: 12 }, palette: { primary: { main: '#245f80' } }, shape: { borderRadius: 10 } });
const sentimentOf = review => {
  const sentiment = String(review.sentiment || '').toLowerCase();
  return Object.hasOwn(colors, sentiment) ? sentiment : 'neutral';
};
const ratingOf = review => {
  const rating = Number(review.rating);
  return Number.isFinite(rating) && rating >= 1 && rating <= 5 ? Math.round(rating) : null;
};

function CenterLabel({ count, label }) {
  const { width, height, left, top } = useDrawingArea();
  const x = left + width / 2, y = top + height / 2;
  return <g pointerEvents="none"><text x={x} y={y - 4} textAnchor="middle" fill="#213f53" fontSize="26" fontWeight="600">{count.toLocaleString()}</text><text x={x} y={y + 18} textAnchor="middle" fill="#6a7f90" fontSize="10">{label}</text></g>;
}

function ReportChart({ payload }) {
  const [view, setView] = useState('sentiment');
  const [reduced, setReduced] = useState(matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const fallback = document.getElementById('sentimentChartFallback');
    if (fallback) fallback.hidden = true;
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const listener = () => setReduced(media.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, []);
  const { reviews = [], sentiment = {}, totalCount = 0 } = payload;
  const model = useMemo(() => {
    const hasReviews = reviews.length > 0;
    const groups = view === 'sentiment' ? ['positive', 'negative', 'neutral'] : [5, 4, 3, 2, 1];
    const inner = [], outer = [];
    groups.forEach(group => {
      const selected = reviews.filter(review => view === 'sentiment' ? sentimentOf(review) === group : ratingOf(review) === group);
      const value = hasReviews ? selected.length : Math.max(0, Number(sentiment[group]) || 0);
      const color = view === 'sentiment' ? colors[group] : ratingColors[group - 1];
      const label = view === 'sentiment' ? names[group] : `${group} stars`;
      if (!value) return;
      inner.push({ id: String(group), label, value, color });
      const subdivisions = view === 'sentiment' ? [5, 4, 3, 2, 1, null] : ['positive', 'negative', 'neutral'];
      subdivisions.forEach(sub => {
        const count = selected.filter(review => view === 'sentiment' ? ratingOf(review) === sub : sentimentOf(review) === sub).length;
        if (!count) return;
        const childLabel = view === 'sentiment' ? (sub == null ? 'Unrated' : `${sub} stars`) : names[sub];
        outer.push({ id: `${group}-${sub}`, label: `${label} · ${childLabel}`, value: count,
          color: view === 'sentiment' ? (sub == null ? '#d3dce3' : `${color}${['66','88','aa','cc','ff'][sub - 1]}`) : colors[sub] });
      });
    });
    return { inner, outer, count: hasReviews ? (view === 'sentiment' ? reviews.length : reviews.filter(r => ratingOf(r) != null).length) : Number(totalCount) || 0, hasReviews };
  }, [reviews, sentiment, totalCount, view]);
  const total = model.inner.reduce((sum, item) => sum + item.value, 0);
  const formatter = item => `${item.value} ${model.hasReviews ? 'reviews' : '%'} (${total ? (item.value / total * 100).toFixed(1) : 0}% of ${model.hasReviews ? 'shown reviews' : 'sentiment'})`;
  const highlight = { highlightScope: { fade: 'global', highlight: 'item' }, highlighted: { additionalRadius: 3 }, faded: { additionalRadius: -1, color: '#e7edf1' } };
  const series = [{ id: 'overview', innerRadius: '38%', outerRadius: model.outer.length ? '75%' : '93%', paddingAngle: 2, cornerRadius: 4, data: model.inner, arcLabel: item => item.value / total >= .08 ? `${(item.value / total * 100).toFixed(0)}%` : '', valueFormatter: formatter, ...highlight }];
  if (model.outer.length) series.push({ id: 'detail', innerRadius: '80%', outerRadius: '94%', paddingAngle: 1, cornerRadius: 2, data: model.outer, valueFormatter: formatter, ...highlight });
  return <ThemeProvider theme={theme}>
    <div className="chart-toolbar"><span className="chart-caption">EXPLORE THE REVIEWS</span><ToggleButtonGroup exclusive size="small" value={view} onChange={(_, next) => next && setView(next)} aria-label="Group chart by">
      <ToggleButton value="sentiment">Sentiment</ToggleButton><ToggleButton value="rating" disabled={!reviews.some(r => ratingOf(r) != null)}>Star ratings</ToggleButton>
    </ToggleButtonGroup></div>
    {total > 0 ? <PieChart series={series} height={306} margin={{ top: 15, bottom: 15, left: 10, right: 10 }} hideLegend skipAnimation={reduced} aria-label={view === 'sentiment' ? 'Review sentiment with star rating details' : 'Star ratings with sentiment details'} sx={{ width: '100%', '& text': { fontFamily: 'inherit' }, '& .MuiPieArcLabel-root': { fill: '#fff', fontSize: 12, fontWeight: 600 } }}>
      <CenterLabel count={model.count} label={model.hasReviews ? 'reviews shown' : 'total reviews'} />
    </PieChart> : <div className="chart-empty">No sentiment data available yet.</div>}
    <div className="chart-data-key" aria-label="Chart values">{model.inner.map(item => <div key={item.id}><i style={{ background: item.color }} /><span>{item.label}</span><strong>{(item.value / total * 100).toFixed(1)}%</strong></div>)}</div>
    <p className="chart-reading-note">{model.hasReviews ? `Based on ${model.count.toLocaleString()} ${view === 'rating' ? 'rated ' : ''}reviews loaded. Inner ring: ${view === 'sentiment' ? 'sentiment' : 'star rating'}. Outer ring: ${view === 'sentiment' ? 'star ratings' : 'sentiment'}.` : 'Overall sentiment from the product analysis.'} Hover or tap a segment for details.</p>
  </ThemeProvider>;
}
const host = document.getElementById('sentimentChartRoot');
if (host) {
  const root = createRoot(host);
  const render = () => root.render(<ReportChart payload={window.insightifyChartData || {}} />);
  window.addEventListener('insightify:chart-data', render);
  render();
}
