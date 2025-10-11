// Authentication Guard Module
// This module provides authentication checking for protected pages

class AuthGuard {
  constructor() {
    this.authManager = null;
  }

  async init(authManager) {
    this.authManager = authManager;
    return this.checkAccess();
  }

  async checkAccess() {
    try {
      // Wait for auth manager to initialize
      await this.authManager.checkAuthStatus();
      
      if (!this.authManager.isAuthenticated()) {
        // Store the current URL to redirect back after login
        sessionStorage.setItem('redirectAfterLogin', window.location.href);
        
        // Show loading state while redirecting
        this.showAuthRequired();
        
        // Redirect to login page
        setTimeout(() => {
          window.location.href = '/login.html';
        }, 1000);
        
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Authentication check failed:', error);
      this.showAuthError();
      return false;
    }
  }

  showAuthRequired() {
    // Create a full-screen overlay with auth required message
    const overlay = document.createElement('div');
    overlay.id = 'auth-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: var(--bg, #ffffff);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      color: var(--text, #333333);
    `;
    
    overlay.innerHTML = `
      <div style="text-align: center; max-width: 400px; padding: 2rem;">
        <div style="width: 64px; height: 64px; margin: 0 auto 2rem; background: var(--primary, #22d3ee); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 28px; font-weight: bold; color: white;">
          M
        </div>
        <h1 style="margin: 0 0 1rem; font-size: 1.5rem; font-weight: 600;">Authentication Required</h1>
        <p style="margin: 0 0 2rem; color: var(--muted, #666666); line-height: 1.5;">
          You need to sign in to access MultiLLM. Redirecting to login page...
        </p>
        <div style="width: 32px; height: 32px; border: 3px solid var(--border, #e5e5e5); border-top-color: var(--primary, #22d3ee); border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto;"></div>
      </div>
      <style>
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      </style>
    `;
    
    document.body.appendChild(overlay);
  }

  showAuthError() {
    // Create error overlay
    const overlay = document.createElement('div');
    overlay.id = 'auth-error-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: var(--bg, #ffffff);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      color: var(--text, #333333);
    `;
    
    overlay.innerHTML = `
      <div style="text-align: center; max-width: 400px; padding: 2rem;">
        <div style="width: 64px; height: 64px; margin: 0 auto 2rem; background: var(--danger, #ef4444); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 28px; font-weight: bold; color: white;">
          !
        </div>
        <h1 style="margin: 0 0 1rem; font-size: 1.5rem; font-weight: 600;">Authentication Error</h1>
        <p style="margin: 0 0 2rem; color: var(--muted, #666666); line-height: 1.5;">
          There was an error checking your authentication status. Please try refreshing the page.
        </p>
        <button onclick="window.location.reload()" style="padding: 0.75rem 1.5rem; background: var(--primary, #22d3ee); color: white; border: none; border-radius: 4px; font-weight: 500; cursor: pointer;">
          Refresh Page
        </button>
      </div>
    `;
    
    document.body.appendChild(overlay);
  }

  // Utility method to easily protect a page
  static async protect(authManager) {
    // Allow ?safe to bypass full blocking auth (still attempts check but won't throw)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('safe')) {
      try {
        await authManager.checkAuthStatus();
      } catch (e) {
        console.warn('[AUTH][SAFE] status check failed, continuing anyway:', e.message);
      }
      return true;
    }
    const guard = new AuthGuard();
    const isAuthenticated = await guard.init(authManager);
    
    if (!isAuthenticated) {
      // Prevent further script execution
      throw new Error('Authentication required - access denied');
    }
    
    return true;
  }

  // Non throwing variant used for graceful degradation
  static async protectIfPossible(authManager) {
    try {
      await AuthGuard.protect(authManager);
      return true;
    } catch (e) {
      console.warn('[AUTH] protectIfPossible suppressed error:', e.message);
      return false;
    }
  }
}

export default AuthGuard;