// auth.js - Authentication & Session State Management for MedNexus Agent AI

class AuthManager {
  constructor() {
    this.currentUser = null;
    this.init();
  }

  async init() {
    // Check if cached token exists
    const token = localStorage.getItem('mednexus_token');
    if (token) {
      try {
        const response = await window.api.getMe();
        if (response.success && response.user) {
          this.currentUser = response.user;
          localStorage.setItem('mednexus_user', JSON.stringify(response.user));
        }
      } catch (e) {
        console.warn('Session expired or invalid, clearing local session.');
        window.api.logout();
        this.currentUser = null;
      }
    }
    this.updateUI();
  }

  getUser() {
    return this.currentUser;
  }

  isLoggedIn() {
    return !!this.currentUser;
  }

  async login(email, password) {
    const res = await window.api.login(email, password);
    if (res.success && res.user) {
      this.currentUser = res.user;
      localStorage.setItem('mednexus_user', JSON.stringify(res.user));
      this.updateUI();
      return res.user;
    }
    throw new Error(res.error || 'Login failed');
  }

  async register(name, email, password, clinicName) {
    const res = await window.api.register(name, email, password, clinicName);
    if (res.success && res.user) {
      this.currentUser = res.user;
      localStorage.setItem('mednexus_user', JSON.stringify(res.user));
      this.updateUI();
      return res.user;
    }
    throw new Error(res.error || 'Registration failed');
  }

  logout() {
    window.api.logout();
    this.currentUser = null;
    this.updateUI();
    window.location.reload();
  }

  updateUI() {
    const authActions = document.getElementById('auth-actions');
    const userProfile = document.getElementById('user-profile');
    const userNameEl = document.getElementById('user-display-name');
    const userCreditsEl = document.getElementById('user-credits');
    const userPlanEl = document.getElementById('user-plan-badge');

    if (this.currentUser) {
      if (authActions) authActions.classList.add('hidden');
      if (userProfile) userProfile.classList.remove('hidden');
      if (userNameEl) userNameEl.textContent = this.currentUser.name;
      if (userCreditsEl) userCreditsEl.textContent = `${this.currentUser.credits || 0} Credits`;
      if (userPlanEl) userPlanEl.textContent = this.currentUser.plan || 'Free';
    } else {
      if (authActions) authActions.classList.remove('hidden');
      if (userProfile) userProfile.classList.add('hidden');
    }
  }

  openAuthModal(mode = 'login') {
    const modal = document.getElementById('auth-modal');
    const loginTab = document.getElementById('tab-login');
    const registerTab = document.getElementById('tab-register');
    const loginForm = document.getElementById('form-login');
    const registerForm = document.getElementById('form-register');

    if (!modal) return;
    modal.classList.remove('hidden');

    if (mode === 'register') {
      loginTab.classList.remove('active');
      registerTab.classList.add('active');
      loginForm.classList.add('hidden');
      registerForm.classList.remove('hidden');
    } else {
      loginTab.classList.add('active');
      registerTab.classList.remove('active');
      loginForm.classList.remove('hidden');
      registerForm.classList.add('hidden');
    }
  }

  closeAuthModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) modal.classList.add('hidden');
  }
}

window.auth = new AuthManager();

