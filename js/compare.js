// ========================================
// COMPARE PAGE JAVASCRIPT
// Handles product comparison with charts
// ========================================

// Mock product database (prices in INR)
const mockProducts = [
  {
    id: 'prod_1699564800_abc123',
    name: 'iPhone 15 Pro Max',
    category: 'Smartphones',
    retailer: 'Amazon',
    insightScore: 92,
    rating: 4.7,
    totalReviews: 15234,
    price: 99517,
    image: 'https://via.placeholder.com/280x200?text=iPhone+15+Pro',
    analyzedAt: new Date('2024-11-05'),
    specs: { quality: 95, value: 85, durability: 92, features: 94, performance: 96 },
    sentiment: { positive: 82, neutral: 12, negative: 6 }
  },
  {
    id: 'prod_1699478400_def456',
    name: 'Sony WH-1000XM5 Headphones',
    category: 'Audio',
    retailer: 'Amazon',
    insightScore: 89,
    rating: 4.6,
    totalReviews: 8932,
    price: 33199,
    image: 'https://via.placeholder.com/280x200?text=Sony+Headphones',
    analyzedAt: new Date('2024-11-03'),
    specs: { quality: 92, value: 88, durability: 85, features: 90, performance: 91 },
    sentiment: { positive: 78, neutral: 15, negative: 7 }
  },
  {
    id: 'prod_1699392000_ghi789',
    name: 'Samsung 65" QLED TV',
    category: 'Electronics',
    retailer: 'Walmart',
    insightScore: 85,
    rating: 4.4,
    totalReviews: 5621,
    price: 107899,
    image: 'https://via.placeholder.com/280x200?text=Samsung+TV',
    analyzedAt: new Date('2024-11-01'),
    specs: { quality: 88, value: 82, durability: 84, features: 87, performance: 86 },
    sentiment: { positive: 72, neutral: 20, negative: 8 }
  },
  {
    id: 'prod_1699305600_jkl012',
    name: 'Ninja Air Fryer',
    category: 'Home & Kitchen',
    retailer: 'Amazon',
    insightScore: 91,
    rating: 4.8,
    totalReviews: 12456,
    price: 10789,
    image: 'https://via.placeholder.com/280x200?text=Ninja+Air+Fryer',
    analyzedAt: new Date('2024-10-30'),
    specs: { quality: 90, value: 95, durability: 88, features: 89, performance: 92 },
    sentiment: { positive: 85, neutral: 10, negative: 5 }
  },
  {
    id: 'prod_1699219200_mno345',
    name: 'Dyson V15 Vacuum',
    category: 'Home & Kitchen',
    retailer: 'Flipkart',
    insightScore: 88,
    rating: 4.5,
    totalReviews: 6789,
    price: 53949,
    image: 'https://via.placeholder.com/280x200?text=Dyson+Vacuum',
    analyzedAt: new Date('2024-10-28'),
    specs: { quality: 93, value: 80, durability: 90, features: 91, performance: 89 },
    sentiment: { positive: 75, neutral: 18, negative: 7 }
  },
  {
    id: 'prod_1699132800_pqr678',
    name: 'Nike Air Max Shoes',
    category: 'Fashion',
    retailer: 'Amazon',
    insightScore: 82,
    rating: 4.3,
    totalReviews: 9876,
    price: 12449,
    image: 'https://via.placeholder.com/280x200?text=Nike+Shoes',
    analyzedAt: new Date('2024-10-26'),
    specs: { quality: 85, value: 88, durability: 78, features: 80, performance: 84 },
    sentiment: { positive: 70, neutral: 22, negative: 8 }
  },
  {
    id: 'prod_1699046400_stu901',
    name: 'MacBook Pro M3',
    category: 'Laptops',
    retailer: 'Amazon',
    insightScore: 94,
    rating: 4.9,
    totalReviews: 4521,
    price: 165917,
    image: 'https://via.placeholder.com/280x200?text=MacBook+Pro',
    analyzedAt: new Date('2024-10-24'),
    specs: { quality: 97, value: 87, durability: 95, features: 96, performance: 98 },
    sentiment: { positive: 88, neutral: 9, negative: 3 }
  },
  {
    id: 'prod_1698960000_vwx234',
    name: 'L\'Oréal Face Serum',
    category: 'Beauty',
    retailer: 'Walmart',
    insightScore: 76,
    rating: 4.0,
    totalReviews: 3245,
    price: 2074,
    image: 'https://via.placeholder.com/280x200?text=Face+Serum',
    analyzedAt: new Date('2024-10-22'),
    specs: { quality: 78, value: 82, durability: 70, features: 75, performance: 77 },
    sentiment: { positive: 65, neutral: 25, negative: 10 }
  }
];

let selectedProducts = {
  1: null,
  2: null,
  3: null
};

let charts = {
  scores: null,
  radar: null,
  sentiment: null
};

let availableProducts = [...mockProducts];

function populateSelectors() {
  const selectors = document.querySelectorAll('.product-selector');
  selectors.forEach(selector => {
    const currentValue = selector.value;
    selector.innerHTML = '<option value="">Choose a product...</option>';
    
    availableProducts.forEach(product => {
      const option = document.createElement('option');
      option.value = product.id;
      const priceText = product.price ? ` - ₹${Math.round(product.price).toLocaleString('en-IN')}` : '';
      option.textContent = `${product.name}${priceText}`;
      selector.appendChild(option);
    });
    
    if (currentValue) {
      selector.value = currentValue;
    }
  });
}

function handleSelectorChange(selector) {
  const slot = parseInt(selector.dataset.slot);
  const productId = selector.value;
  
  if (productId) {
    const product = availableProducts.find(p => String(p.id) === String(productId));
    selectedProducts[slot] = product;
    if (product) updateSlotDisplay(slot, product);
  } else {
    selectedProducts[slot] = null;
    resetSlot(slot);
  }
  
  updateCompareButton();
}

document.addEventListener('DOMContentLoaded', async () => {
  populateSelectors();
  
  const selectors = document.querySelectorAll('.product-selector');
  selectors.forEach(selector => {
    selector.addEventListener('change', function() {
      handleSelectorChange(this);
    });
  });

  // Try loading real analyzed products from database
  try {
    if (typeof API !== 'undefined' && API.products && API.products.getAll) {
      const response = await API.products.getAll({ limit: 50 });
      if (response && response.success && Array.isArray(response.products) && response.products.length > 0) {
        const dbProducts = response.products.map(p => ({
          id: p.id || p.productId,
          name: p.name,
          category: p.category || 'General',
          retailer: p.retailer || 'Amazon',
          insightScore: p.insightScore || 0,
          rating: p.rating || 0,
          totalReviews: p.reviewCount || p.totalReviews || 0,
          price: parseFloat(p.price) || 0,
          image: p.imageUrl || `https://via.placeholder.com/280x200?text=${encodeURIComponent(p.name.substring(0, 15))}`,
          analyzedAt: p.analyzedAt,
          specs: p.specs || { quality: 80, value: 80, durability: 80, features: 80, performance: 80 },
          specsData: p.specsData || null,
          sentiment: p.sentiment || { positive: 75, neutral: 15, negative: 10 }
        }));
        
        availableProducts = [...dbProducts, ...mockProducts];
        populateSelectors();
      }
    }
  } catch (err) {
    console.warn('Could not load products for comparison:', err);
  }

  // Pre-select via URL parameters if present
  const urlParams = new URLSearchParams(window.location.search);
  const id1 = urlParams.get('id1') || urlParams.get('id');
  const id2 = urlParams.get('id2');
  const id3 = urlParams.get('id3');

  if (id1) {
    const sel1 = document.querySelector('.product-selector[data-slot="1"]');
    if (sel1) { sel1.value = id1; handleSelectorChange(sel1); }
  }
  if (id2) {
    const sel2 = document.querySelector('.product-selector[data-slot="2"]');
    if (sel2) { sel2.value = id2; handleSelectorChange(sel2); }
  }
  if (id3) {
    const sel3 = document.querySelector('.product-selector[data-slot="3"]');
    if (sel3) { sel3.value = id3; handleSelectorChange(sel3); }
  }
  if (id1 && id2) {
    performComparison();
  }
  
  // Compare button
  document.getElementById('compareBtn').addEventListener('click', () => {
    performComparison();
  });
});

function updateSlotDisplay(slot, product) {
  const slotElement = document.querySelector(`.compare-slot[data-slot="${slot}"]`);
  const emptyState = slotElement.querySelector('.compare-slot-empty');
  
  let filledState = slotElement.querySelector('.compare-slot-filled');
  if (!filledState) {
    filledState = document.createElement('div');
    filledState.className = 'compare-slot-filled';
    slotElement.appendChild(filledState);
  }
  
  filledState.innerHTML = `
    <img src="${product.image}" alt="${escapeHtml(product.name)}" style="width: 100%; height: 150px; object-fit: cover; border-radius: var(--radius-md); margin-bottom: var(--space-3);" onerror="this.src='https://via.placeholder.com/280x200?text=Product'">
    <h3 style="font-size: var(--text-lg); margin-bottom: var(--space-2);">${escapeHtml(product.name)}</h3>
    <p class="text-secondary" style="margin-bottom: var(--space-2);">₹${Math.round(product.price || 0).toLocaleString('en-IN')}</p>
    <div style="display: flex; align-items: center; gap: var(--space-2); justify-content: center;">
      <span class="badge badge-primary" style="font-size: var(--text-sm);">Score: ${product.insightScore}</span>
      <span style="color: var(--color-warning);">★ ${product.rating}</span>
    </div>
  `;
  
  emptyState.style.display = 'none';
  filledState.style.display = 'block';
}

function resetSlot(slot) {
  const slotElement = document.querySelector(`.compare-slot[data-slot="${slot}"]`);
  const emptyState = slotElement.querySelector('.compare-slot-empty');
  const filledState = slotElement.querySelector('.compare-slot-filled');
  
  if (emptyState) emptyState.style.display = 'block';
  if (filledState) filledState.style.display = 'none';
}

function updateCompareButton() {
  const compareBtn = document.getElementById('compareBtn');
  const hasMinimumProducts = selectedProducts[1] && selectedProducts[2];
  compareBtn.disabled = !hasMinimumProducts;
}

function performComparison() {
  const products = [selectedProducts[1], selectedProducts[2], selectedProducts[3]].filter(p => p);
  
  if (products.length < 2) {
    if (window.InsightifyUtils) {
      window.InsightifyUtils.showNotification('Please select at least 2 products to compare', 'error');
    }
    return;
  }
  
  const resultsSection = document.getElementById('comparisonResults');
  resultsSection.style.display = 'block';
  resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  
  generateScoresChart(products);
  generateComparisonTable(products);
  generateRadarChart(products);
  generateSentimentChart(products);
}

function generateScoresChart(products) {
  const ctx = document.getElementById('scoresCanvas').getContext('2d');
  
  if (charts.scores) {
    charts.scores.destroy();
  }
  
  charts.scores = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: products.map(p => p.name.length > 25 ? p.name.substring(0, 22) + '...' : p.name),
      datasets: [{
        label: 'Insight Score',
        data: products.map(p => p.insightScore),
        backgroundColor: products.map(p => {
          if (p.insightScore >= 90) return 'rgba(25, 135, 84, 0.8)';
          if (p.insightScore >= 75) return 'rgba(74, 105, 255, 0.8)';
          if (p.insightScore >= 60) return 'rgba(255, 193, 7, 0.8)';
          return 'rgba(220, 53, 69, 0.8)';
        }),
        borderColor: products.map(p => {
          if (p.insightScore >= 90) return 'rgb(25, 135, 84)';
          if (p.insightScore >= 75) return 'rgb(74, 105, 255)';
          if (p.insightScore >= 60) return 'rgb(255, 193, 7)';
          return 'rgb(220, 53, 69)';
        }),
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function(context) { return 'Score: ' + context.parsed.y + '/100'; }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          ticks: { callback: v => v }
        }
      }
    }
  });
}

function generateComparisonTable(products) {
  const thead = document.querySelector('#comparisonTable thead tr');
  const tbody = document.getElementById('comparisonTableBody');
  
  thead.innerHTML = '<th style="padding: var(--space-4); text-align: left; font-weight: var(--font-semibold); position: sticky; left: 0; background: var(--color-gray-50); z-index: 1;">Feature</th>';
  tbody.innerHTML = '';
  
  products.forEach(product => {
    const th = document.createElement('th');
    th.style.cssText = 'padding: var(--space-4); text-align: center; font-weight: var(--font-semibold); min-width: 200px;';
    th.innerHTML = `
      <div>${escapeHtml(product.name)}</div>
      <div class="text-secondary" style="font-weight: normal; font-size: var(--text-sm); margin-top: var(--space-2);">₹${Math.round(product.price || 0).toLocaleString('en-IN')}</div>
    `;
    thead.appendChild(th);
  });
  
  const rows = [
    { label: 'Insight Score', getVal: p => `${p.insightScore || 0}/100` },
    { label: 'Rating', getVal: p => `${p.rating || 0} ★` },
    { label: 'Total Reviews', getVal: p => (p.totalReviews || 0).toLocaleString() },
    { label: 'Category', getVal: p => p.category || 'General' },
    { label: 'Retailer', getVal: p => p.retailer || 'Online' }
  ];

  // Dynamic aspect rows across products
  const aspectMap = new Map();
  products.forEach(p => {
    const sData = p.specsData || p.specs_data;
    if (Array.isArray(sData)) {
      sData.forEach(spec => {
        if (!aspectMap.has(spec.name)) {
          aspectMap.set(spec.name, spec.icon ? `${spec.icon} ${spec.name}` : spec.name);
        }
      });
    }
  });

  if (aspectMap.size > 0) {
    aspectMap.forEach((displayLabel, rawName) => {
      rows.push({
        label: `${displayLabel} Score`,
        getVal: (p) => {
          const sData = p.specsData || p.specs_data;
          if (Array.isArray(sData)) {
            const match = sData.find(s => s.name === rawName);
            if (match) return `${match.score}%`;
          }
          return '—';
        }
      });
    });
  } else {
    rows.push(
      { label: 'Quality Score', getVal: p => `${(p.specs && p.specs.quality) || 75}%` },
      { label: 'Value Score', getVal: p => `${(p.specs && p.specs.value) || 75}%` },
      { label: 'Durability Score', getVal: p => `${(p.specs && p.specs.durability) || 75}%` },
      { label: 'Features Score', getVal: p => `${(p.specs && p.specs.features) || 75}%` },
      { label: 'Performance Score', getVal: p => `${(p.specs && p.specs.performance) || 75}%` }
    );
  }

  rows.forEach(row => {
    const tr = document.createElement('tr');
    tr.style.borderBottom = '1px solid var(--color-border)';
    
    const labelTd = document.createElement('td');
    labelTd.style.cssText = 'padding: var(--space-4); font-weight: var(--font-medium); position: sticky; left: 0; background: white; border-right: 1px solid var(--color-border);';
    labelTd.textContent = row.label;
    tr.appendChild(labelTd);
    
    products.forEach(product => {
      const td = document.createElement('td');
      td.style.cssText = 'padding: var(--space-4); text-align: center;';
      td.textContent = row.getVal(product);
      tr.appendChild(td);
    });
    
    tbody.appendChild(tr);
  });
}

function escapeHtml(text) {
  if (!text) return '';
  return text.replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  })[m]);
}

function generateRadarChart(products) {
  const ctx = document.getElementById('radarCanvas').getContext('2d');
  
  if (charts.radar) {
    charts.radar.destroy();
  }
  
  const colors = [
    { bg: 'rgba(74, 105, 255, 0.2)', border: 'rgb(74, 105, 255)' },
    { bg: 'rgba(25, 135, 84, 0.2)', border: 'rgb(25, 135, 84)' },
    { bg: 'rgba(255, 193, 7, 0.2)', border: 'rgb(255, 193, 7)' }
  ];

  let radarLabels = [];
  const hasDynamic = products.some(p => Array.isArray(p.specsData || p.specs_data));
  if (hasDynamic) {
    const labelSet = new Set();
    products.forEach(p => {
      const sData = p.specsData || p.specs_data;
      if (Array.isArray(sData)) {
        sData.forEach(s => labelSet.add(s.name));
      }
    });
    radarLabels = Array.from(labelSet).slice(0, 6);
  }
  if (radarLabels.length < 3) {
    radarLabels = ['Quality', 'Value', 'Durability', 'Features', 'Satisfaction'];
  }

  charts.radar = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: radarLabels,
      datasets: products.map((product, index) => {
        const sData = product.specsData || product.specs_data;
        const dataValues = radarLabels.map(label => {
          if (Array.isArray(sData)) {
            const found = sData.find(s => s.name === label);
            if (found) return found.score;
          }
          if (product.specs) {
            const key = label.toLowerCase();
            if (product.specs[key] !== undefined) return product.specs[key];
          }
          return product.insightScore || 75;
        });

        return {
          label: product.name,
          data: dataValues,
          backgroundColor: colors[index % colors.length].bg,
          borderColor: colors[index % colors.length].border,
          borderWidth: 2,
          pointBackgroundColor: colors[index % colors.length].border,
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: colors[index % colors.length].border
        };
      })
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      scales: {
        r: {
          beginAtZero: true,
          max: 100,
          ticks: { stepSize: 20 }
        }
      },
      plugins: {
        legend: { position: 'bottom' }
      }
    }
  });
}

function generateSentimentChart(products) {
  const ctx = document.getElementById('sentimentCanvas').getContext('2d');
  
  if (charts.sentiment) {
    charts.sentiment.destroy();
  }
  
  charts.sentiment = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: products.map(p => p.name.length > 25 ? p.name.substring(0, 22) + '...' : p.name),
      datasets: [
        {
          label: 'Positive',
          data: products.map(p => (p.sentiment && p.sentiment.positive) || 70),
          backgroundColor: 'rgba(25, 135, 84, 0.8)',
          borderColor: 'rgb(25, 135, 84)',
          borderWidth: 2
        },
        {
          label: 'Neutral',
          data: products.map(p => (p.sentiment && p.sentiment.neutral) || 15),
          backgroundColor: 'rgba(108, 117, 125, 0.8)',
          borderColor: 'rgb(108, 117, 125)',
          borderWidth: 2
        },
        {
          label: 'Negative',
          data: products.map(p => (p.sentiment && p.sentiment.negative) || 15),
          backgroundColor: 'rgba(220, 53, 69, 0.8)',
          borderColor: 'rgb(220, 53, 69)',
          borderWidth: 2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      scales: {
        x: { stacked: true },
        y: {
          stacked: true,
          beginAtZero: true,
          max: 100,
          ticks: { callback: v => v + '%' }
        }
      },
      plugins: {
        legend: { position: 'bottom' },
        tooltip: {
          callbacks: {
            label: ctx => ctx.dataset.label + ': ' + ctx.parsed.y + '%'
          }
        }
      }
    }
  });
}
