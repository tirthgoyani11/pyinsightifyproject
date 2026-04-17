    # Insightify

    Insightify is a full-stack product intelligence platform that helps users analyze product reviews, compare alternatives, and discuss buying decisions with the community.

    The repository includes:
    - A static frontend (HTML, CSS, vanilla JavaScript)
    - A Flask backend API (Python)
    - SQLite for local development

    ## What You Can Do

    - Analyze a product URL and generate sentiment-backed insights
    - Browse products with filters and sorting
    - Compare products side by side
    - Post and vote in community discussions
    - Save and review favorite items

    ## Tech Stack

    - Frontend: HTML, CSS, JavaScript (no framework)
    - Backend: Flask, Flask-SQLAlchemy, Flask-CORS
    - Data: SQLite (development)
    - Analysis utilities: BeautifulSoup, requests, selenium, TextBlob, Gemini API integration

    ## Repository Structure

    ```text
    pyinsightifyproject/
    |-- index.html
    |-- submit.html
    |-- browse.html
    |-- analysis.html
    |-- compare.html
    |-- community.html
    |-- login.html
    |-- register.html
    |-- profile.html
    |-- css/
    |-- js/
    |-- backend/
    |   |-- app/
    |   |   |-- routes/
    |   |   |-- utils/
    |   |   `-- models.py
    |   |-- requirements.txt
    |   |-- run.py
    |   |-- setup.bat
    |   `-- start.bat
    `-- README.md
    ```

    ## Quick Start

    ### Prerequisites

    - Python 3.8+
    - Git
    - (Optional) VS Code Live Server extension for frontend hosting

    ### 1) Start Backend (Windows)

    ```powershell
    cd backend
    .\setup.bat
    .\start.bat
    ```

    Backend runs at:
    - http://localhost:5000

    ### 2) Start Frontend

    Option A (recommended): open [index.html](index.html) with Live Server.

    Option B:

    ```powershell
    cd ..
    python -m http.server 3000
    ```

    Frontend runs at:
    - http://localhost:3000

    ### 3) Verify Backend Health

    Open:
    - http://localhost:5000/api/health

    ## Environment Configuration

    Create a backend environment file from the example:

    ```powershell
    cd backend
    copy .env.example .env
    ```

    Key variables in [backend/.env.example](backend/.env.example):
    - FLASK_APP
    - FLASK_ENV
    - SECRET_KEY
    - DATABASE_URL
    - CORS_ORIGINS
    - GEMINI_API_KEY

    ## API Overview

    Core route groups:
    - /api/products
    - /api/analysis
    - /api/community
    - /api/auth
    - /api/favorites

    Detailed API docs are available in [API_DOCUMENTATION.md](API_DOCUMENTATION.md).

    ## Useful Development Commands

    ```powershell
    # initialize database
    cd backend
    flask init-db

    # seed sample data
    flask seed-db

    # run backend directly
    python run.py
    ```

    ## Documentation

    - [QUICK_START.md](QUICK_START.md)
    - [API_DOCUMENTATION.md](API_DOCUMENTATION.md)
    - [ARCHITECTURE.md](ARCHITECTURE.md)
    - [AUTHENTICATION.md](AUTHENTICATION.md)
    - [backend/README.md](backend/README.md)

    ## Publishing To GitHub

    Use these commands from the project root after creating your GitHub repository:

    ```powershell
    git init
    git add .
    git commit -m "Initial commit: Insightify full-stack app"
    git branch -M main
    git remote add origin <YOUR_GITHUB_REPO_URL>
    git push -u origin main
    ```

    If this repository is already initialized, skip `git init` and only run the remaining commands.

    ## Notes

    - This project is configured for local development by default.
    - Do not commit secrets in `.env` files.
    - Commit sample data only when intentionally needed.
- WAVE Accessibility Checker
- Lighthouse Accessibility Audit
```

---

## ⚡ Performance

### Optimization Features

- **Minimal Dependencies**: No frameworks, pure vanilla JS
- **Lazy Loading**: Images load as they enter viewport
- **CSS Animations**: Hardware-accelerated transforms
- **Debounced Search**: Reduces unnecessary re-renders
- **Efficient Selectors**: Optimized CSS for fast rendering

### Performance Metrics (Target)

- First Contentful Paint: < 1.5s
- Time to Interactive: < 3.0s
- Lighthouse Score: 90+

---

## 🎨 Customization

### Changing Colors

Edit `css/design-system.css`:

```css
:root {
  --color-primary: #YOUR_COLOR;      /* Change brand color */
  --color-positive: #YOUR_COLOR;     /* Change positive sentiment */
  --color-negative: #YOUR_COLOR;     /* Change negative sentiment */
}
```

### Changing Fonts

Replace font imports in `css/design-system.css`:

```css
@import url('https://fonts.googleapis.com/css2?family=YOUR_FONT');

:root {
  --font-heading: 'YOUR_FONT', sans-serif;
  --font-body: 'YOUR_FONT', sans-serif;
}
```

### Adjusting Spacing

Modify the spacing scale:

```css
:root {
  --space-4: 1rem;      /* Base spacing unit */
  --space-8: 2rem;      /* Double spacing */
  /* Adjust all spacing variables as needed */
}
```

---

## 📊 Charts & Data Visualization

### Current Implementation

The design system includes styled containers for charts. For production:

**Recommended Libraries**:
- **Chart.js**: Simple, responsive charts
- **D3.js**: Advanced, customizable visualizations
- **ApexCharts**: Modern, interactive charts

### Example Integration (Chart.js)

```html
<canvas id="sentimentChart"></canvas>

<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<script>
new Chart(document.getElementById('sentimentChart'), {
  type: 'doughnut',
  data: {
    labels: ['Positive', 'Negative', 'Neutral'],
    datasets: [{
      data: [75, 15, 10],
      backgroundColor: ['#198754', '#DC3545', '#FFC107']
    }]
  }
});
</script>
```

---

## 🔧 JavaScript Utilities

### Available Utilities (`window.InsightifyUtils`)

```javascript
// Show notification
InsightifyUtils.showNotification('Message', 'success');

// Debounce function
const debouncedFn = InsightifyUtils.debounce(() => {}, 300);

// Format numbers
InsightifyUtils.formatNumber(1234567); // "1,234,567"

// Format relative time
InsightifyUtils.formatRelativeTime(new Date()); // "just now"

// Track events (integrate with analytics)
InsightifyUtils.trackEvent('Category', 'Action', 'Label');
```

---

## 📝 Future Enhancements

### Planned Features
- [ ] Dark mode toggle
- [ ] Multi-language support (i18n)
- [ ] PWA capabilities (offline support)
- [ ] Advanced filtering (price range, brand, etc.)
- [ ] User authentication flow
- [ ] Real-time notifications
- [ ] Product comparison side-by-side
- [ ] Export analysis to PDF

---

## 🤝 Contributing

This is a static design system. To extend:

1. Add new components to `css/components.css`
2. Add new pages following the existing structure
3. Update this README with new components
4. Maintain accessibility and performance standards

---

## 📄 License

This design system is provided as-is for the Insightify project.

---

## 🙏 Credits

**Design System**: Built with modern web standards  
**Icons**: Inline SVGs for performance  
**Fonts**: Google Fonts (Poppins, Inter)

---

## 📞 Support

For questions or issues with the design system, please review:
- Component examples in the HTML files
- CSS comments in the stylesheets
- JavaScript documentation in the JS files

---

**Built with ❤️ for Insightify**
