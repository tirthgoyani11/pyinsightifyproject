# 🚀 Quick Start Guide

## Ready to Run Your Full-Stack Application!

Your Insightify project is now complete with both frontend and backend. Here's how to get started:

---

## ⚡ Quick Start (5 Minutes)

### Step 1: Setup Backend (One-Time)

1. Open **PowerShell** or **Command Prompt**

2. Navigate to backend folder:
   ```powershell
   cd c:\Users\tirth\OneDrive\Desktop\pyinsightifyproject\backend
   ```

3. Run the setup script:
   ```powershell
   .\setup.bat
   ```

   This automatically:
   - ✅ Creates Python virtual environment
   - ✅ Installs Flask, SQLAlchemy, TextBlob, and all dependencies
   - ✅ Downloads language corpora for sentiment analysis
   - ✅ Creates SQLite database
   - ✅ Seeds sample products and community posts

   **⏱️ Takes about 2-3 minutes**

### Step 2: Start Backend Server

```powershell
.\start.bat
```

You should see:
```
* Running on http://localhost:5000
* Debug mode: on
```

✅ **Backend is running!** Keep this window open.

### Step 3: Start Frontend

**Option A: VS Code Live Server (Recommended)**
1. Open project in VS Code
2. Right-click `index.html`
3. Select **"Open with Live Server"**
4. Opens at `http://127.0.0.1:5500`

**Option B: Python HTTP Server**
```powershell
# In NEW PowerShell window (not backend folder)
cd c:\Users\tirth\OneDrive\Desktop\pyinsightifyproject
python -m http.server 3000
```
Opens at `http://localhost:3000`

### Step 4: Test It Works! 🎉

1. **Open browser**: Your frontend URL (from Step 3)

2. **Health check**: Visit `http://localhost:5000/api/health`
   - Should show: `{"status": "healthy", "message": "Insightify API is running"}`

3. **Try features**:
   - ✨ Click "Analyze Product" → Paste any Amazon URL
   - 🔍 Browse existing products
   - 👥 Create a community post
   - 📊 Compare products

---

## 📁 Project Structure

```
pyinsightifyproject/
├── frontend (19 files)
│   ├── index.html              # Landing page
│   ├── submit.html             # Product submission
│   ├── browse.html             # Product browsing
│   ├── analysis.html           # Analysis results
│   ├── compare.html            # Product comparison
│   ├── community.html          # Community discussions
│   ├── 404.html                # Error page
│   ├── css/                    # Stylesheets
│   └── js/                     # JavaScript (includes api.js)
│
├── backend/ (16 files)
│   ├── app/
│   │   ├── models.py           # Database models
│   │   ├── routes/             # API endpoints
│   │   └── utils/              # Scraper, sentiment analysis
│   ├── config.py               # Configuration
│   ├── run.py                  # Flask app entry
│   ├── requirements.txt        # Dependencies
│   ├── setup.bat               # Setup script
│   └── start.bat               # Start script
│
└── Documentation
    ├── FRONTEND_COMPLETE.md    # Frontend summary
    ├── BACKEND_INTEGRATION.md  # Detailed backend guide
    └── QUICK_START.md          # This file
```

---

## 🔧 Configuration

### Switch Between Mock Data and Real Backend

Edit `js/api.js` line 7:

```javascript
// Use real backend (default)
useMockData: false,

// Use mock data (for testing without backend)
useMockData: true,
```

---

## 🎯 Features You Can Test

### 1. Product Analysis
- Submit any product URL
- Backend scrapes data (currently uses mock data)
- Sentiment analysis on reviews
- Generates insight score (0-100)
- Extracts topics and themes

### 2. Browse Products
- Filter by category, retailer, score
- Sort by score, rating, reviews, date
- Pagination (10 per page)
- Add to favorites

### 3. Product Comparison
- Select up to 3 products
- Side-by-side charts (Bar, Radar, Stacked)
- Compare 10 metrics
- Visual sentiment breakdown

### 4. Community
- Create posts with titles, content, tags
- Link posts to products
- Upvote/downvote posts
- Sort by recent, popular, discussed
- Filter by category

### 5. Analysis Page
- Detailed product insights
- Sentiment donut chart (Chart.js)
- Topic breakdown
- Review samples
- Performance specs

---

## 🔍 API Endpoints Available

Test these in browser or with curl:

```bash
# Health check
http://localhost:5000/api/health

# Get all products
http://localhost:5000/api/products

# Get recent products
http://localhost:5000/api/products/recent?limit=5

# Get community posts
http://localhost:5000/api/community/posts

# Get sample product
http://localhost:5000/api/products/prod001
```

---

## 🛠️ Common Commands

```powershell
# Start backend
cd backend
.\start.bat

# Stop backend
Ctrl + C (in backend terminal)

# Restart backend
Ctrl + C, then .\start.bat

# Reset database
cd backend
venv\Scripts\activate
rm insightify.db
flask init-db
flask seed-db

# View logs
# They appear in the terminal where backend is running

# Check Python version
python --version
# Should be 3.8 or higher
```

---

## 🐛 Troubleshooting

### Backend won't start
```
Error: Python not found
```
**Fix**: Install Python 3.8+ from https://python.org

### Import errors
```
ModuleNotFoundError: No module named 'flask'
```
**Fix**: Run `setup.bat` again

### Port already in use
```
Address already in use: Port 5000
```
**Fix**: 
```powershell
# Find and kill process
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

### CORS errors in browser
```
Access to fetch blocked by CORS policy
```
**Fix**:
1. Ensure backend is running
2. Use Live Server (not file:// protocol)
3. Check `backend/.env` has `CORS_ORIGINS=*`

### No products showing
**Fix**:
1. Check backend terminal for errors
2. Run `flask seed-db` to add sample data
3. Check browser console (F12) for errors

---

## 📊 Sample Data Included

After running `setup.bat`, you'll have:

- **2 Sample Products**:
  - Premium Wireless Headphones
  - Smart Fitness Watch

- **2 Community Posts**:
  - "Best wireless headphones under $200?"
  - "My experience with the Smart Fitness Watch"

---

## 🎨 Technologies Used

### Frontend
- Pure HTML5, CSS3, JavaScript (ES6+)
- Chart.js 4.4.0 for visualizations
- No frameworks (as requested)
- Responsive design (mobile-first)

### Backend
- Flask 3.0 (Python web framework)
- SQLAlchemy (ORM for database)
- TextBlob (Sentiment analysis)
- BeautifulSoup4 (Web scraping)
- SQLite (Development database)
- Flask-CORS (Cross-origin requests)

---

## ✅ Next Steps

1. **✅ Backend setup** → Run `setup.bat`
2. **✅ Start servers** → Backend + Live Server
3. **🎯 Test features** → Analyze product, browse, compare
4. **📝 Create content** → Add posts, analyze products
5. **🔐 Add auth** → Last step (as you planned)

---

## 📚 Full Documentation

- **Frontend Details**: See `FRONTEND_COMPLETE.md`
- **Backend Details**: See `BACKEND_INTEGRATION.md`
- **API Reference**: See `backend/README.md`

---

## 🎉 You're All Set!

Your full-stack Insightify application is ready to run!

**Remember**: 
- Backend runs on `http://localhost:5000`
- Frontend runs on `http://127.0.0.1:5500` (Live Server)
- Keep backend terminal open while using the app

---

**Need help?** Check the error messages in:
1. Backend terminal (Flask errors)
2. Browser console (F12) (Frontend errors)
3. `BACKEND_INTEGRATION.md` (Detailed troubleshooting)

Happy coding! 🚀
