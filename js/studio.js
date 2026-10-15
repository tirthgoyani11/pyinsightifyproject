/** Motion runs only for visible elements; animated media is loaded on demand. */
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const words = [...document.querySelectorAll('[data-words]')];
  const visibleWords = new Set();
  let timer;
  const flips = new Map();
  function stop() {
    clearInterval(timer);
    timer = undefined;
    flips.forEach((timeout, el) => {
      clearTimeout(timeout);
      el.classList.remove('flipping');
    });
    flips.clear();
  }
  function schedule() {
    stop();
    if (reduced.matches || document.hidden || !visibleWords.size) return;
    timer = setInterval(() => visibleWords.forEach(el => {
      const list = el.dataset.words.split(',');
      el.classList.add('flipping');
      flips.set(el, setTimeout(() => {
        el.textContent = list[(list.indexOf(el.textContent) + 1) % list.length];
        el.classList.remove('flipping');
        flips.delete(el);
      }, 280));
    }), 3200);
  }
  function updateMedia() {
    document.querySelectorAll('[data-motion-src]').forEach(img => {
      const loading = document.getElementById('loadingOverlay');
      const active = loading && loading.style.display !== 'none' && !document.hidden && !reduced.matches;
      const source = active ? img.dataset.motionSrc : img.dataset.stillSrc;
      if (img.getAttribute('src') !== source) img.src = source;
    });
    schedule();
  }
  document.addEventListener('visibilitychange', updateMedia);
  document.addEventListener('studio:loading', updateMedia);
  reduced.addEventListener('change', updateMedia);
  window.addEventListener('pagehide', stop);
  if ('IntersectionObserver' in window) {
    const wordObserver = new IntersectionObserver(entries => {
      entries.forEach(({target, isIntersecting}) => isIntersecting ? visibleWords.add(target) : visibleWords.delete(target));
      schedule();
    });
    words.forEach(el => wordObserver.observe(el));
    const storyObserver = new IntersectionObserver(entries => entries.forEach(({target, isIntersecting}) => {
      if (isIntersecting) { target.classList.add('revealed'); storyObserver.unobserve(target); }
    }), {threshold: .4});
    document.querySelectorAll('.split-story').forEach(el => storyObserver.observe(el));
  }
  // Follow the WAI-ARIA tab keyboard pattern without changing shared navigation.
  const tabs = [...document.querySelectorAll('[role="tab"]')];
  tabs.forEach((tab, index) => {
    tab.id = `report-tab-${tab.dataset.tab}`;
    tab.setAttribute('aria-controls', tab.dataset.tab);
    tab.tabIndex = tab.classList.contains('active') ? 0 : -1;
    const panel = document.getElementById(tab.dataset.tab);
    if (panel) panel.setAttribute('aria-labelledby', tab.id);
    tab.addEventListener('click', () => tabs.forEach(t => { t.tabIndex = t === tab ? 0 : -1; }));
    tab.addEventListener('keydown', event => {
      let target;
      if (event.key === 'ArrowRight') target = tabs[(index + 1) % tabs.length];
      if (event.key === 'ArrowLeft') target = tabs[(index + tabs.length - 1) % tabs.length];
      if (event.key === 'Home') target = tabs[0];
      if (event.key === 'End') target = tabs[tabs.length - 1];
      if (target) { event.preventDefault(); target.click(); target.focus(); }
    });
  });
})();
