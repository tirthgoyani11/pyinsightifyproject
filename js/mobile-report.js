/** Adaptive report workspace. Move the existing live DOM; restore it on desktop. */
(() => {
  const media = matchMedia('(max-width: 767px)');
  const header = document.querySelector('.product-header');
  if (!header) return;
  let workspace, metrics, activeView = 'overview';
  let placements = [];
  const views = [['overview', 'Overview'], ['details', 'Details'], ['reviews', 'Reviews'], ['insights', 'Insights']];
  const panels = new Map();
  let updateFrame;

  function move(selector, destination) {
    const node = document.querySelector(selector);
    if (!node) return;
    const marker = document.createComment('desktop report position');
    node.before(marker);
    placements.push({node, marker});
    destination.append(node);
  }

  function selectView(name, focus = false, scroll = false) {
    activeView = name;
    workspace.querySelectorAll('[role="tab"]').forEach(button => {
      const selected = button.dataset.view === name;
      button.setAttribute('aria-selected', String(selected));
      button.tabIndex = selected ? 0 : -1;
      if (selected && focus) button.focus();
    });
    panels.forEach((panel, key) => { panel.hidden = key !== name; });
    if (scroll) requestAnimationFrame(() => workspace?.scrollIntoView({block: 'start', behavior: 'instant'}));
  }

  function updateMetrics() {
    if (!metrics) return;
    const product = typeof currentProductData !== 'undefined' ? currentProductData : null;
    const reviews = typeof allReviews !== 'undefined' ? allReviews : [];
    const count = product?.totalReviews ?? product?.total_reviews ?? reviews.length;
    const positive = Number(product?.sentiment?.positive);
    const text = Number.isFinite(positive) ? positive.toFixed(0) + '%' : '—';
    const countText = product ? Number(count).toLocaleString() + ' reviews analyzed' : 'Loading review sample…';
    if (metrics.querySelector('strong').textContent !== text) metrics.querySelector('strong').textContent = text;
    if (metrics.querySelector('small').textContent !== countText) metrics.querySelector('small').textContent = countText;
  }

  function mount() {
    if (workspace) return;
    workspace = document.createElement('section');
    workspace.className = 'mobile-report-workspace container';
    workspace.setAttribute('aria-label', 'Product analysis');
    const nav = document.createElement('div');
    nav.className = 'mobile-report-nav';
    nav.setAttribute('role', 'tablist');
    nav.setAttribute('aria-label', 'Explore product report');
    workspace.append(nav);
    views.forEach(([key, label]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'mobile-report-tab';
      button.dataset.view = key;
      button.id = 'mobile-tab-' + key;
      button.setAttribute('role', 'tab');
      button.setAttribute('aria-controls', 'mobile-panel-' + key);
      button.textContent = label;
      button.addEventListener('click', () => selectView(key, false, true));
      button.addEventListener('keydown', event => {
        const index = views.findIndex(([name]) => name === key);
        let target;
        if (event.key === 'ArrowRight') target = views[(index + 1) % views.length][0];
        if (event.key === 'ArrowLeft') target = views[(index + views.length - 1) % views.length][0];
        if (event.key === 'Home') target = views[0][0];
        if (event.key === 'End') target = views.at(-1)[0];
        if (target) { event.preventDefault(); selectView(target, true, true); }
      });
      nav.append(button);
      const panel = document.createElement('div');
      panel.className = 'mobile-report-panel';
      panel.id = 'mobile-panel-' + key;
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', button.id);
      panel.tabIndex = 0;
      panels.set(key, panel);
      workspace.append(panel);
    });
    header.after(workspace);
    const overview = panels.get('overview');
    const grid = document.createElement('div');
    grid.className = 'mobile-report-metrics';
    overview.append(grid);
    move('.score-card', grid);
    metrics = document.createElement('div');
    metrics.className = 'mobile-positive-metric';
    metrics.innerHTML = '<span>Positive sentiment</span><strong>—</strong><small>Loading review sample…</small><span class="mobile-metric-note">From retrieved reviews</span>';
    grid.append(metrics);
    move('#reportSummary', overview);
    move('.takeaways-section', overview);
    const detailLink = document.createElement('button');
    detailLink.type = 'button';
    detailLink.className = 'mobile-details-link';
    detailLink.textContent = 'Explore aspect scores & buying guide →';
    detailLink.addEventListener('click', () => selectView('details', true, true));
    overview.append(detailLink);
    move('#reportAspects', panels.get('details'));
    move('#buyerGuideCard', panels.get('details'));
    move('.reviews-browser', panels.get('reviews'));
    move('.sentiment-card', panels.get('insights'));
    move('.word-clouds', panels.get('insights'));
    move('.review-quality-panel', panels.get('insights'));
    const samples = document.createElement('details');
    samples.className = 'mobile-sample-reviews';
    samples.innerHTML = '<summary>Read sample praise & concerns</summary>';
    panels.get('insights').append(samples);
    move('.review-comparison', samples);
    const originalDetails = document.getElementById('reportReviews')?.closest('section');
    if (originalDetails) originalDetails.classList.add('mobile-report-original-details');
    document.body.classList.add('mobile-report-ready');
    selectView(activeView);
    updateMetrics();
  }

  function unmount() {
    if (!workspace) return;
    placements.forEach(({node, marker}) => { if (marker.parentNode) marker.replaceWith(node); });
    placements = [];
    workspace.remove();
    workspace = metrics = null;
    panels.clear();
    document.body.classList.remove('mobile-report-ready');
  }

  // Keep normal report links, and existing phrase-to-review navigation, functional.
  document.addEventListener('click', event => {
    if (!workspace) return;
    const originalTab = event.target.closest('[data-tab="reviews"]');
    if (originalTab) { selectView('reviews', false, true); return; }
    const link = event.target.closest('a[href^="#"]');
    if (!link) return;
    const routes = { '#reportOverview': 'overview', '#reportSummary': 'overview', '#reportAspects': 'details', '#buyerGuideCard': 'details', '#reportReviews': 'reviews' };
    if (routes[link.getAttribute('href')]) selectView(routes[link.getAttribute('href')], false, true);
  });
  // Make the reportReviews scroll target visible after phrase-filter navigation.
  document.querySelector('.word-clouds')?.addEventListener('click', event => {
    if (workspace && event.target.closest('[data-evidence-term], .word-cloud-item')) {
      selectView('reviews', false, true);
    }
  });
  const score = document.getElementById('insightScore');
  const observer = new MutationObserver(() => {
    cancelAnimationFrame(updateFrame);
    updateFrame = requestAnimationFrame(updateMetrics);
  });
  if (score) observer.observe(score, {childList: true, characterData: true, subtree: true});
  function sync() { if (media.matches) mount(); else unmount(); }
  media.addEventListener('change', sync);
  sync();
})();
