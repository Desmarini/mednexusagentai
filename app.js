// app.js - Main Application Orchestration for MedNexus Agent AI

document.addEventListener('DOMContentLoaded', () => {
  console.log('MedNexus Agent AI initializing...');

  // Navigation tab switching
  const navButtons = document.querySelectorAll('.nav-btn');
  const sections = {
    'dashboard': document.getElementById('section-dashboard'),
    'history': document.getElementById('section-history'),
    'pricing': document.getElementById('section-pricing'),
    'business': document.getElementById('section-business')
  };

  window.switchView = function(viewId) {
    Object.keys(sections).forEach(key => {
      const sec = sections[key];
      if (sec) {
        if (key === viewId) {
          sec.classList.remove('hidden');
        } else {
          sec.classList.add('hidden');
        }
      }
    });

    navButtons.forEach(btn => {
      if (btn.getAttribute('data-view') === viewId) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-view');
      if (target) window.switchView(target);
    });
  });

  // Login form handler
  const formLogin = document.getElementById('form-login');
  if (formLogin) {
    formLogin.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value;
      const pass = document.getElementById('login-password').value;
      const errorEl = document.getElementById('login-error');

      try {
        if (errorEl) errorEl.classList.add('hidden');
        await window.auth.login(email, pass);
        window.auth.closeAuthModal();
      } catch (err) {
        if (errorEl) {
          errorEl.textContent = err.message;
          errorEl.classList.remove('hidden');
        }
      }
    });
  }

  // Register form handler
  const formRegister = document.getElementById('form-register');
  if (formRegister) {
    formRegister.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('register-name').value;
      const email = document.getElementById('register-email').value;
      const pass = document.getElementById('register-password').value;
      const clinic = document.getElementById('register-clinic').value;
      const errorEl = document.getElementById('register-error');

      try {
        if (errorEl) errorEl.classList.add('hidden');
        await window.auth.register(name, email, pass, clinic);
        window.auth.closeAuthModal();
      } catch (err) {
        if (errorEl) {
          errorEl.textContent = err.message;
          errorEl.classList.remove('hidden');
        }
      }
    });
  }

  // History search input listener
  const historySearch = document.getElementById('history-search');
  if (historySearch) {
    let debounceTimer;
    historySearch.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (window.dashboard) {
          window.dashboard.loadHistory(e.target.value.trim());
        }
      }, 300);
    });
  }
});

