/** Add mobile-only disclosure to long API-rendered reviews. Desktop text stays full. */
(() => {
  let nextId = 0;
  function enhance(card) {
    const text = card.querySelector('.review-text, .review-quote');
    if (!text || text.textContent.trim().length < 360 || card.querySelector('.review-expand')) return;
    if (!text.id) text.id = `mobile-review-${++nextId}`;
    card.classList.add('mobile-review-collapsible');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'review-expand';
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-controls', text.id);
    button.textContent = 'Read full review';
    text.after(button);
  }
  function scan(node) {
    if (!(node instanceof Element)) return;
    if (node.matches('.review-item, .review-evidence-card')) enhance(node);
    node.querySelectorAll('.review-item, .review-evidence-card').forEach(enhance);
  }
  const root = document.querySelector('.analysis-studio');
  if (!root) return;
  scan(root);
  const observer = new MutationObserver(records => records.forEach(record => record.addedNodes.forEach(scan)));
  observer.observe(root, {childList: true, subtree: true});
  root.addEventListener('click', event => {
    const button = event.target.closest('.review-expand');
    if (!button) return;
    const card = button.closest('.review-item, .review-evidence-card');
    const expanded = button.getAttribute('aria-expanded') !== 'true';
    card.toggleAttribute('data-mobile-expanded', expanded);
    button.setAttribute('aria-expanded', String(expanded));
    button.textContent = expanded ? 'Show less' : 'Read full review';
    if (!expanded) button.closest('.review-item, .review-evidence-card').scrollIntoView({block: 'nearest', behavior: 'instant'});
  });
  window.addEventListener('pagehide', () => observer.disconnect());
  window.addEventListener('pageshow', event => {
    if (event.persisted) { scan(root); observer.observe(root, {childList: true, subtree: true}); }
  });
})();
