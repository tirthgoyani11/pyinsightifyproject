// ========================================
// COMPARE PAGE JAVASCRIPT
// Handles product comparison with charts
// ========================================

// Mock product data (same as browse.js for consistency)
const mockProducts = [
  {
    id: 'prod_1699564800_abc123',
    name: 'iPhone 15 Pro Max',
    category: 'Smartphones',
    retailer: 'Amazon',
    insightScore: 92,
    rating: 4.7,
    totalReviews: 15234,
    price: '$1,199.00',
    image: 'https://via.placeholder.com/280x200?text=iPhone+15+Pro',
    analyzedAt: new Date('2024-11-05'),
    specs: {
      quality: 95,
      value: 85,
      durability: 92,
      features: 94,
      performance: 96
    },
    sentiment: { positive: 82, neutral: 12, negative: 6 }
  },
  {
    id: 'prod_1699478400_def456',
    name: 'Sony WH-1000XM5 Headphones',
    category: 'Audio',
    retailer: 'Best Buy',
    insightScore: 89,
    rating: 4.6,
    totalReviews: 8932,
    price: '$399.99',
    image: 'https://via.placeholder.com/280x200?text=Sony+Headphones',
    analyzedAt: new Date('2024-11-03'),
    specs: {
      quality: 92,
      value: 88,
      durability: 85,
      features: 90,
      performance: 91
    },
    sentiment: { positive: 78, neutral: 15, negative: 7 }
  },
  {
    id: 'prod_1699392000_ghi789',
    name: 'Samsung 65" QLED TV',
    category: 'Electronics',
    retailer: 'Amazon',
    insightScore: 85,
    rating: 4.4,
    totalReviews: 5621,
    price: '$1,299.00',
    image: 'https://via.placeholder.com/280x200?text=Samsung+TV',
    analyzedAt: new Date('2024-11-01'),
    specs: {
      quality: 88,
      value: 82,
      durability: 84,
      features: 87,
      performance: 86
    },
    sentiment: { positive: 72, neutral: 20, negative: 8 }
  },
  {
    id: 'prod_1699305600_jkl012',
    name: 'Ninja Air Fryer',
    category: 'Home & Kitchen',
    retailer: 'Walmart',
    insightScore: 91,
    rating: 4.8,
    totalReviews: 12456,
    price: '$129.99',
    image: 'https://via.placeholder.com/280x200?text=Ninja+Air+Fryer',
    analyzedAt: new Date('2024-10-30'),
    specs: {
      quality: 90,
      value: 95,
      durability: 88,
      features: 89,
      performance: 92
    },
    sentiment: { positive: 85, neutral: 10, negative: 5 }
  },
  {
    id: 'prod_1699219200_mno345',
    name: 'Dyson V15 Vacuum',
    category: 'Home & Kitchen',
    retailer: 'Target',
    insightScore: 88,
    rating: 4.5,
    totalReviews: 6789,
    price: '$649.99',
    image: 'https://via.placeholder.com/280x200?text=Dyson+Vacuum',
    analyzedAt: new Date('2024-10-28'),
    specs: {
      quality: 93,
      value: 80,
      durability: 90,
      features: 91,
      performance: 89
    },
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
    price: '$149.99',
    image: 'https://via.placeholder.com/280x200?text=Nike+Shoes',
    analyzedAt: new Date('2024-10-26'),
    specs: {
      quality: 85,
      value: 88,
      durability: 78,
      features: 80,
      performance: 84
    },
    sentiment: { positive: 70, neutral: 22, negative: 8 }
  },
  {
    id: 'prod_1699046400_stu901',
    name: 'MacBook Pro M3',
    category: 'Laptops',
    retailer: 'Best Buy',
    insightScore: 94,
    rating: 4.9,
    totalReviews: 4521,
    price: '$1,999.00',
    image: 'https://via.placeholder.com/280x200?text=MacBook+Pro',
    analyzedAt: new Date('2024-10-24'),
    specs: {
      quality: 97,
      value: 87,
      durability: 95,
      features: 96,
      performance: 98
    },
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
    price: '$24.99',
    image: 'https://via.placeholder.com/280x200?text=Face+Serum',
    analyzedAt: new Date('2024-10-22'),
    specs: {
      quality: 78,
      value: 82,
      durability: 70,
      features: 75,
      performance: 77
    },
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

document.addEventListener('DOMContentLoaded', () => {
  
  // Populate product selectors
  const selectors = document.querySelectorAll('.product-selector');
  selectors.forEach(selector => {
    mockProducts.forEach(product => {
      const option = document.createElement('option');
      option.value = product.id;
      option.textContent = `${product.name} - ₹${Math.round(product.price).toLocaleString('en-IN')}`;
      selector.appendChild(option);
    });
    
    // Handle product selection
    selector.addEventListener('change', function() {
      const slot = parseInt(this.dataset.slot);
      const productId = this.value;
      
      if (productId) {
        const product = mockProducts.find(p => p.id === productId);
        selectedProducts[slot] = product;
        updateSlotDisplay(slot, product);
      } else {
        selectedProducts[slot] = null;
        resetSlot(slot);
      }
      
      updateCompareButton();
    });
  });
  
  // Compare button
  document.getElementById('compareBtn').addEventListener('click', () => {
    performComparison();
  });
  
});

function updateSlotDisplay(slot, product) {
  const slotElement = document.querySelector(`.compare-slot[data-slot="${slot}"]`);
  const emptyState = slotElement.querySelector('.compare-slot-empty');
  
  // Create filled state if doesn't exist
  let filledState = slotElement.querySelector('.compare-slot-filled');
  if (!filledState) {
    filledState = document.createElement('div');
    filledState.className = 'compare-slot-filled';
    slotElement.appendChild(filledState);
  }
  
  filledState.innerHTML = `
    <img src="${product.image}" alt="${product.name}" style="width: 100%; height: 150px; object-fit: cover; border-radius: var(--radius-md); margin-bottom: var(--space-3);">
    <h3 style="font-size: var(--text-lg); margin-bottom: var(--space-2);">${product.name}</h3>
    <p class="text-secondary" style="margin-bottom: var(--space-2);">₹${Math.round(product.price).toLocaleString('en-IN')}</p>
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
  // Get selected products
  const products = [selectedProducts[1], selectedProducts[2], selectedProducts[3]].filter(p => p);
  
  if (products.length < 2) {
    if (window.InsightifyUtils) {
      window.InsightifyUtils.showNotification('Please select at least 2 products to compare', 'error');
    }
    return;
  }
  
  // Show results section
  const resultsSection = document.getElementById('comparisonResults');
  resultsSection.style.display = 'block';
  
  // Scroll to results
  resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  
  // Generate comparison
  generateScoresChart(products);
  generateComparisonTable(products);
  generateRadarChart(products);
  generateSentimentChart(products);
  
  // Track event
  if (window.InsightifyUtils) {
    window.InsightifyUtils.trackEvent('Compare', 'Perform Comparison', `${products.length} products`);
  }
}

function generateScoresChart(products) {
  const ctx = document.getElementById('scoresCanvas').getContext('2d');
  
  // Destroy existing chart
  if (charts.scores) {
    charts.scores.destroy();
  }
  
  charts.scores = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: products.map(p => p.name),
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
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return 'Score: ' + context.parsed.y + '/100';
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          ticks: {
            callback: function(value) {
              return value;
            }
          }
        }
      }
    }
  });
}

function generateComparisonTable(products) {
  const thead = document.querySelector('#comparisonTable thead tr');
  const tbody = document.getElementById('comparisonTableBody');
  
  // Clear existing
  thead.innerHTML = '<th style="padding: var(--space-4); text-align: left; font-weight: var(--font-semibold); position: sticky; left: 0; background: var(--color-gray-50); z-index: 1;">Feature</th>';
  tbody.innerHTML = '';
  
  // Add product headers
  products.forEach(product => {
    const th = document.createElement('th');
    th.style.cssText = 'padding: var(--space-4); text-align: center; font-weight: var(--font-semibold); min-width: 200px;';
    th.innerHTML = `
      <div>${product.name}</div>
      <div class="text-secondary" style="font-weight: normal; font-size: var(--text-sm); margin-top: var(--space-2);">₹${product.price.toLocaleString('en-IN')}</div>
    `;
    thead.appendChild(th);
  });
  
  // Comparison rows
  const rows = [
    { label: 'Insight Score', key: 'insightScore', suffix: '/100' },
    { label: 'Rating', key: 'rating', suffix: ' ★' },
    { label: 'Total Reviews', key: 'totalReviews', format: 'number' },
    { label: 'Category', key: 'category' },
    { label: 'Retailer', key: 'retailer' },
    { label: 'Quality Score', key: 'specs.quality', suffix: '%' },
    { label: 'Value Score', key: 'specs.value', suffix: '%' },
    { label: 'Durability Score', key: 'specs.durability', suffix: '%' },
    { label: 'Features Score', key: 'specs.features', suffix: '%' },
    { label: 'Performance Score', key: 'specs.performance', suffix: '%' }
  ];
  
  rows.forEach(row => {
    const tr = document.createElement('tr');
    tr.style.borderBottom = '1px solid var(--color-border)';
    
    // Feature label
    const labelTd = document.createElement('td');
    labelTd.style.cssText = 'padding: var(--space-4); font-weight: var(--font-medium); position: sticky; left: 0; background: white; border-right: 1px solid var(--color-border);';
    labelTd.textContent = row.label;
    tr.appendChild(labelTd);
    
    // Product values
    products.forEach(product => {
      const td = document.createElement('td');
      td.style.cssText = 'padding: var(--space-4); text-align: center;';
      
      let value = row.key.includes('.') 
        ? row.key.split('.').reduce((obj, key) => obj[key], product)
        : product[row.key];
      
      if (row.format === 'number') {
        value = value.toLocaleString();
      }
      
      td.textContent = value + (row.suffix || '');
      tr.appendChild(td);
    });
    
    tbody.appendChild(tr);
  });
}

function generateRadarChart(products) {
  const ctx = document.getElementById('radarCanvas').getContext('2d');
  
  // Destroy existing chart
  if (charts.radar) {
    charts.radar.destroy();
  }
  
  const colors = [
    { bg: 'rgba(74, 105, 255, 0.2)', border: 'rgb(74, 105, 255)' },
    { bg: 'rgba(25, 135, 84, 0.2)', border: 'rgb(25, 135, 84)' },
    { bg: 'rgba(255, 193, 7, 0.2)', border: 'rgb(255, 193, 7)' }
  ];
  
  charts.radar = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: ['Quality', 'Value', 'Durability', 'Features', 'Performance'],
      datasets: products.map((product, index) => ({
        label: product.name,
        data: [
          product.specs.quality,
          product.specs.value,
          product.specs.durability,
          product.specs.features,
          product.specs.performance
        ],
        backgroundColor: colors[index].bg,
        borderColor: colors[index].border,
        borderWidth: 2,
        pointBackgroundColor: colors[index].border,
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: colors[index].border
      }))
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      scales: {
        r: {
          beginAtZero: true,
          max: 100,
          ticks: {
            stepSize: 20
          }
        }
      },
      plugins: {
        legend: {
          position: 'bottom'
        }
      }
    }
  });
}

function generateSentimentChart(products) {
  const ctx = document.getElementById('sentimentCanvas').getContext('2d');
  
  // Destroy existing chart
  if (charts.sentiment) {
    charts.sentiment.destroy();
  }
  
  charts.sentiment = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: products.map(p => p.name),
      datasets: [
        {
          label: 'Positive',
          data: products.map(p => p.sentiment.positive),
          backgroundColor: 'rgba(25, 135, 84, 0.8)',
          borderColor: 'rgb(25, 135, 84)',
          borderWidth: 2
        },
        {
          label: 'Neutral',
          data: products.map(p => p.sentiment.neutral),
          backgroundColor: 'rgba(108, 117, 125, 0.8)',
          borderColor: 'rgb(108, 117, 125)',
          borderWidth: 2
        },
        {
          label: 'Negative',
          data: products.map(p => p.sentiment.negative),
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
        x: {
          stacked: true
        },
        y: {
          stacked: true,
          beginAtZero: true,
          max: 100,
          ticks: {
            callback: function(value) {
              return value + '%';
            }
          }
        }
      },
      plugins: {
        legend: {
          position: 'bottom'
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return context.dataset.label + ': ' + context.parsed.y + '%';
            }
          }
        }
      }
    }
  });
}
