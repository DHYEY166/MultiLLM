// Authentication module for MultiLLM
class AuthManager {
  constructor() {
    this.currentUser = null;
    this.authCallbacks = [];
    this.justLoggedIn = false; // Track if this is a fresh login
    this.init();
  }

  async init() {
    await this.checkAuthStatus();
    this.setupAuthUI();
  }

  async checkAuthStatus() {
    try {
      const response = await fetch('/auth/user', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        this.currentUser = data.user;
        this.notifyAuthChange(true, false); // This is just a status check, not a new login
      } else {
        this.currentUser = null;
        this.notifyAuthChange(false, false);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      this.currentUser = null;
      this.notifyAuthChange(false, false);
    }
  }

  async register(email, password, name = '') {
    try {
      const response = await fetch('/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, password, name })
      });

      const data = await response.json();
      
      if (response.ok) {
        this.currentUser = data.user;
        this.notifyAuthChange(true, true); // This is a new registration/login
        
        // Track user registration in Google Analytics
        if (window.analytics) {
          window.analytics.trackUserRegistration('email');
          window.analytics.trackConversion('user_registration');
        }
        
        return { success: true, user: data.user };
      } else {
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.error('Registration failed:', error);
      return { success: false, error: 'Network error occurred' };
    }
  }

  async login(email, password) {
    try {
      const response = await fetch('/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();
      
      if (response.ok) {
        this.currentUser = data.user;
        this.notifyAuthChange(true, true); // This is a new login
        
        // Track user login in Google Analytics
        if (window.analytics) {
          window.analytics.trackUserLogin('email');
          window.analytics.trackConversion('user_login');
        }
        
        return { success: true, user: data.user };
      } else {
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.error('Login failed:', error);
      return { success: false, error: 'Network error occurred' };
    }
  }

  async logout() {
    try {
      const response = await fetch('/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });

      if (response.ok) {
        // Track user logout in Google Analytics before clearing data
        if (window.analytics) {
          window.analytics.trackUserLogout();
        }
        
        this.currentUser = null;
        this.notifyAuthChange(false, false); // Logout, not a new login
        
        // Clear all local storage data to ensure no data persists between users
        this.clearAllUserData();
        
        // Redirect to login page after successful logout
        setTimeout(() => {
          window.location.href = '/login.html';
        }, 100);
        
        return { success: true };
      } else {
        return { success: false, error: 'Logout failed' };
      }
    } catch (error) {
      console.error('Logout failed:', error);
      return { success: false, error: 'Network error occurred' };
    }
  }

  clearAllUserData() {
    try {
      console.log('[AUTH] Clearing all user data from localStorage');
      
      // Clear chat history
      const keys = Object.keys(localStorage);
      for (const key of keys) {
        if (key.startsWith('chatHistory_') || 
            key.startsWith('kb::') || 
            key.includes('session') ||
            key.includes('dataset') ||
            key.includes('file')) {
          localStorage.removeItem(key);
          console.log(`[AUTH] Cleared localStorage key: ${key}`);
        }
      }
      
      // Also clear sessionStorage
      sessionStorage.clear();
      
      console.log('[AUTH] Successfully cleared all user data');
    } catch (error) {
      console.error('[AUTH] Error clearing user data:', error);
    }
  }

  loginWithGoogle() {
    window.location.href = '/auth/google';
  }

  isAuthenticated() {
    return this.currentUser !== null;
  }

  getUser() {
    return this.currentUser;
  }

  onAuthChange(callback) {
    this.authCallbacks.push(callback);
  }

  notifyAuthChange(isAuthenticated, isNewLogin = false) {
    this.authCallbacks.forEach(callback => {
      callback(isAuthenticated, this.currentUser, isNewLogin);
    });
  }

  setupAuthUI() {
    // Update navigation based on auth status
    this.updateNavigation();
    
    // Listen for auth changes
    this.onAuthChange((isAuthenticated, user, isNewLogin) => {
      this.updateNavigation();
      // Only show welcome message for new logins, not status checks
      if (isNewLogin) {
        this.showAuthFeedback(isAuthenticated, user);
      }
      
      // If user becomes unauthenticated (like after logout) and we're on a protected page,
      // redirect to login (but avoid redirect loops on login page)
      if (!isAuthenticated && !window.location.pathname.includes('login.html')) {
        setTimeout(() => {
          window.location.href = '/login.html';
        }, 1000); // Small delay to show any logout message
      }
    });

    // Handle URL parameters for auth feedback
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('auth') === 'success') {
      this.showMessage('Successfully signed in!', 'success');
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (urlParams.get('error') === 'google_auth_failed') {
      this.showMessage('Google authentication failed. Please try again.', 'error');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }

  updateNavigation() {
    const nav = document.querySelector('.nav');
    if (!nav) return;

    // Hide/show main navigation links based on auth status
    const mainNavLinks = nav.querySelectorAll('a[href]:not(.login-link)');
    const isAuthenticated = this.isAuthenticated();
    
    mainNavLinks.forEach(link => {
      const href = link.getAttribute('href');
      const linkText = link.textContent.trim();
      
      // Hide all navigation links when not authenticated (including Chat)
      // Only keep the brand element (which is a div, not an 'a' tag)
      if (!isAuthenticated) {
        link.style.display = 'none';
      } else {
        link.style.display = '';
      }
    });

    // Remove existing auth elements
    const existingAuth = nav.querySelector('.auth-nav');
    if (existingAuth) {
      existingAuth.remove();
    }

    // Create auth navigation
    const authNav = document.createElement('div');
    authNav.className = 'auth-nav';
    authNav.style.marginLeft = 'auto';
    authNav.style.display = 'flex';  
    authNav.style.gap = '10px';
    authNav.style.alignItems = 'center';

    if (isAuthenticated) {
      const user = this.getUser();
      authNav.innerHTML = `
        <span class="user-info">Hello, ${user.name || user.email}</span>
        <button class="logout-btn small">Logout</button>
      `;
      
      authNav.querySelector('.logout-btn').addEventListener('click', async (e) => {
        e.preventDefault();
        const logoutBtn = e.target;
        const originalText = logoutBtn.textContent;
        
        // Show loading state
        logoutBtn.textContent = 'Logging out...';
        logoutBtn.disabled = true;
        
        try {
          const result = await this.logout();
          if (!result.success) {
            // Reset button if logout failed
            logoutBtn.textContent = originalText;
            logoutBtn.disabled = false;
            this.showMessage('Logout failed. Please try again.', 'error');
          }
          // If successful, the logout method will redirect to login page
        } catch (error) {
          // Reset button on error
          logoutBtn.textContent = originalText;
          logoutBtn.disabled = false;
          this.showMessage('Logout failed. Please try again.', 'error');
        }
      });
    } else {
      authNav.innerHTML = `
        <a href="/login.html" class="login-link">Login</a>
      `;
    }

    nav.appendChild(authNav);
  }

  showAuthFeedback(isAuthenticated, user) {
    if (isAuthenticated && user) {
      this.showMessage(`Welcome back, ${user.name || user.email}!`, 'success');
    }
  }

  showMessage(message, type = 'info') {
    // Create or update message element
    let messageEl = document.getElementById('auth-message');
    if (!messageEl) {
      messageEl = document.createElement('div');
      messageEl.id = 'auth-message';
      messageEl.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 4px;
        z-index: 1000;
        font-weight: 500;
        transition: opacity 0.3s ease;
      `;
      document.body.appendChild(messageEl);
    }

    // Set message and style based on type
    messageEl.textContent = message;
    messageEl.className = `message ${type}`;
    
    const colors = {
      success: { bg: '#d4edda', border: '#c3e6cb', text: '#155724' },
      error: { bg: '#f8d7da', border: '#f5c6cb', text: '#721c24' },
      info: { bg: '#d1ecf1', border: '#bee5eb', text: '#0c5460' }
    };
    
    const color = colors[type] || colors.info;
    messageEl.style.backgroundColor = color.bg;
    messageEl.style.border = `1px solid ${color.border}`;
    messageEl.style.color = color.text;
    messageEl.style.opacity = '1';

    // Auto-hide after 5 seconds
    setTimeout(() => {
      messageEl.style.opacity = '0';
      setTimeout(() => {
        if (messageEl.parentNode) {
          messageEl.parentNode.removeChild(messageEl);
        }
      }, 300);
    }, 5000);
  }
}

// Create global auth manager instance
const authManager = new AuthManager();

// Export for use in other modules
export default authManager;