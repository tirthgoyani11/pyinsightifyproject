# Authentication System Documentation

## Overview
Complete authentication system with user registration, login, and session management.

## Features Implemented

### 1. Database Models
- **User**: Core authentication model with username, email, password (hashed)
- **UserProfile**: Extended user information (name, bio, location, stats)
- **UserProduct**: Tracks which products each user has analyzed
- **Updated Models**: Added `user_id` foreign keys to Post, Comment, Favorite

### 2. Backend API Endpoints

#### Authentication Routes (`/api/auth/`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/register` | POST | Create new user account |
| `/login` | POST | Authenticate user |
| `/logout` | POST | Clear session |
| `/me` | GET | Get current logged-in user |
| `/check` | GET | Check authentication status |
| `/profile` | PUT | Update user profile |
| `/change-password` | POST | Change user password |

### 3. Frontend Pages

#### Registration Page (`register.html`)
- Username, email, password fields
- Password strength indicator
- Optional fields: full name, location, bio
- Real-time validation
- Auto-login after successful registration

#### Login Page (`login.html`)
- Email and password authentication
- "Remember me" functionality
- Forgot password link (placeholder)
- Pre-fill email if remembered
- Redirect support via URL parameter

### 4. Security Features
- Password hashing using Werkzeug (bcrypt-based)
- Session-based authentication
- CSRF protection via session signing
- Secure cookie configuration (HTTPOnly, SameSite)
- Input validation (username 3+, password 6+, email format)
- Duplicate username/email checking

## Database Schema

### Users Table
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(80) UNIQUE NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT 1,
    is_admin BOOLEAN DEFAULT 0,
    created_at DATETIME,
    last_login DATETIME
);
```

### User Profiles Table
```sql
CREATE TABLE user_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE NOT NULL,
    full_name VARCHAR(120),
    bio TEXT,
    avatar_url VARCHAR(255),
    location VARCHAR(100),
    website VARCHAR(255),
    total_posts INTEGER DEFAULT 0,
    total_comments INTEGER DEFAULT 0,
    total_products_analyzed INTEGER DEFAULT 0,
    reputation_score INTEGER DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### User Products Table
```sql
CREATE TABLE user_products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    analyzed_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (product_id) REFERENCES products(id),
    UNIQUE (user_id, product_id)
);
```

## Usage Examples

### Registering a New User
```javascript
const response = await fetch('http://localhost:5000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
        username: 'johndoe',
        email: 'john@example.com',
        password: 'securepass123',
        fullName: 'John Doe',
        location: 'New York, USA'
    })
});
```

### Logging In
```javascript
const response = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
        email: 'john@example.com',
        password: 'securepass123'
    })
});
```

### Checking Authentication
```javascript
const response = await fetch('http://localhost:5000/api/auth/check', {
    credentials: 'include'
});
const data = await response.json();
// { authenticated: true, userId: 1 }
```

### Getting Current User
```javascript
const response = await fetch('http://localhost:5000/api/auth/me', {
    credentials: 'include'
});
const data = await response.json();
// { user: { id: 1, username: 'johndoe', email: '...', profile: {...} } }
```

## Test Credentials

A test account has been created during migration:

- **Email**: test@pyinsightify.com
- **Password**: test123
- **Username**: testuser

## Configuration

### Session Settings (config.py)
```python
SESSION_TYPE = 'filesystem'
SESSION_PERMANENT = True
SESSION_USE_SIGNER = True
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'
PERMANENT_SESSION_LIFETIME = 86400  # 24 hours
```

### CORS Settings
```python
CORS(app, resources={
    r"/api/*": {
        "origins": ["*"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True
    }
})
```

## Migration Scripts

### 1. migrate_auth.py
Creates new authentication tables and test user.

### 2. migrate_columns.py
Adds user_id columns to existing tables (posts, comments, favorites).

**To run migrations:**
```bash
cd backend
python migrate_columns.py
```

## Next Steps (To Complete Full Integration)

### 1. Update Navigation
- [ ] Add login/register buttons when not authenticated
- [ ] Add user dropdown with profile link and logout when authenticated
- [ ] Update all HTML pages (index, browse, submit, analysis, community, compare)

### 2. Create Auth JavaScript Module (js/auth.js)
- [ ] Wrap all auth API calls
- [ ] Manage authentication state
- [ ] Handle login/logout events
- [ ] Store user info in localStorage/sessionStorage

### 3. Protect Routes
- [ ] Add @login_required decorator
- [ ] Require authentication for:
  - Creating posts
  - Adding comments
  - Favoriting products
  - Accessing profile page

### 4. Update Existing Routes
- [ ] Use session user_id instead of anonymous sessions
- [ ] Track analyzed products in user_products table
- [ ] Link posts/comments to user accounts
- [ ] Update favorites to use user_id

### 5. Create User Profile Page (profile.html)
- [ ] Display user info and stats
- [ ] Show analyzed products
- [ ] List user's posts and comments
- [ ] Edit profile functionality
- [ ] Change password form

### 6. Add User Context to Pages
- [ ] Show "analyzed by you" indicator on products
- [ ] Display username on posts/comments
- [ ] Show user avatars
- [ ] Enable edit/delete for own content

## File Structure

```
backend/
├── app/
│   ├── models.py           # User, UserProfile, UserProduct models
│   ├── routes/
│   │   └── auth.py         # Authentication endpoints
│   └── __init__.py         # Auth blueprint registered
├── config.py               # Session configuration
├── migrate_auth.py         # Creates auth tables
└── migrate_columns.py      # Adds user_id columns

frontend/
├── login.html              # Login page
├── register.html           # Registration page
└── js/
    └── auth.js (pending)   # Auth API wrapper
```

## Security Considerations

1. **Password Security**: Passwords are hashed using Werkzeug's `generate_password_hash` which uses bcrypt
2. **Session Security**: Sessions are signed and use HTTPOnly cookies
3. **CORS**: Configured to support credentials for session cookies
4. **Input Validation**: All inputs validated on both frontend and backend
5. **SQL Injection**: Protected by SQLAlchemy parameterized queries
6. **XSS Protection**: HTML entities should be escaped in templates (add in future)

## Testing Checklist

- [x] User registration works
- [x] User login works
- [x] Session persistence works
- [x] Logout clears session
- [x] Password hashing secure
- [x] Duplicate prevention works
- [ ] Navigation updates (pending)
- [ ] Protected routes work (pending)
- [ ] Profile page works (pending)
- [ ] User content tracking works (pending)

## Known Limitations

1. No password reset functionality (forgot password is placeholder)
2. No email verification
3. No rate limiting on login attempts
4. No account deletion functionality
5. No admin panel
6. No user search/directory
7. No profile pictures (avatar_url field exists but not implemented)
8. No social login (Google, GitHub, etc.)

## Future Enhancements

1. Email verification on registration
2. Password reset via email
3. Two-factor authentication (2FA)
4. OAuth integration (Google, GitHub)
5. Profile picture upload
6. User reputation system
7. Admin dashboard
8. User roles and permissions
9. Account suspension/banning
10. Activity logging and audit trail
