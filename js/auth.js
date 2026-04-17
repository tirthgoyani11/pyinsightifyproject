/**
 * Authentication Module
 * Centralized authentication logic for Insightify
 */

const Auth = {
  // Check if user is authenticated
  async checkAuth() {
    try {
      const response = await fetch('http://localhost:5000/api/auth/check', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.authenticated;
      }
      return false;
    } catch (error) {
      console.error('Auth check error:', error);
      return false;
    }
  },

  // Get current user data
  async getCurrentUser() {
    try {
      const response = await fetch('http://localhost:5000/api/auth/me', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.user;
      }
      return null;
    } catch (error) {
      console.error('Get user error:', error);
      return null;
    }
  },

  // Register new user
  async register(userData) {
    try {
      const response = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(userData)
      });
      
      const data = await response.json();
      
      if (response.ok) {
        return { success: true, user: data.user };
      } else {
        return { success: false, error: data.error || 'Registration failed' };
      }
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  },

  // Login user
  async login(email, password) {
    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        return { success: true, user: data.user };
      } else {
        return { success: false, error: data.error || 'Login failed' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  },

  // Logout user
  async logout() {
    try {
      const response = await fetch('http://localhost:5000/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
      
      if (response.ok) {
        // Dispatch logout event for other components
        window.dispatchEvent(new Event('userLoggedOut'));
        return { success: true };
      }
      return { success: false };
    } catch (error) {
      console.error('Logout error:', error);
      return { success: false };
    }
  },

  // Update user profile
  async updateProfile(profileData) {
    try {
      const response = await fetch('http://localhost:5000/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(profileData)
      });
      
      const data = await response.json();
      
      if (response.ok) {
        return { success: true, user: data.user };
      } else {
        return { success: false, error: data.error || 'Update failed' };
      }
    } catch (error) {
      console.error('Update profile error:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  },

  // Change password
  async changePassword(currentPassword, newPassword) {
    try {
      const response = await fetch('http://localhost:5000/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        return { success: true, message: data.message };
      } else {
        return { success: false, error: data.error || 'Password change failed' };
      }
    } catch (error) {
      console.error('Change password error:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  },

  // Initialize auth-dependent UI elements on page load
  async initializeAuthUI() {
    const isAuthenticated = await this.checkAuth();
    const authButtons = document.getElementById('authButtons');
    const userMenu = document.getElementById('userMenu');
    
    if (!authButtons || !userMenu) return;
    
    if (isAuthenticated) {
      const user = await this.getCurrentUser();
      
      // Hide auth buttons, show user menu
      authButtons.style.display = 'none';
      userMenu.style.display = 'flex';
      
      if (user) {
        // Update user display
        const userDisplay = document.getElementById('userDisplay');
        if (userDisplay) {
          userDisplay.textContent = user.username;
        }
        
        // Update avatar if exists
        const userAvatar = document.getElementById('userAvatar');
        if (userAvatar && user.profile?.avatar_url) {
          userAvatar.innerHTML = `<img src="${user.profile.avatar_url}" alt="${user.username}" style="width: 100%; height: 100%; object-fit: cover;">`;
        } else if (userAvatar) {
          userAvatar.textContent = user.username.charAt(0).toUpperCase();
        }
      }
    } else {
      // Show auth buttons, hide user menu
      authButtons.style.display = 'flex';
      userMenu.style.display = 'none';
    }
  }
};

// Listen for logout events to update UI
window.addEventListener('userLoggedOut', () => {
  // Reload the page to reset UI
  window.location.reload();
});

// Listen for login events to update UI
window.addEventListener('userLoggedIn', async () => {
  await Auth.initializeAuthUI();
});
