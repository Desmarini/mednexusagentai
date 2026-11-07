// ==============================================================================
// MedNexus AI — Main Application Orchestrator
// ==============================================================================

import { api } from './api.js';
import { initAuth, getCurrentUser, getCurrentPlanInfo, getSystemConfig, registerUser, loginUser, logoutUser } from './auth.js';
import { loadDashboard, loadDatasetView } from './dashboard.js';
import { setupPayPalButton, checkPaymentUrlParams, getEffectiveConfig, loadPayPalSdk } from './paypal.js';
import { initBusinessTools } from './business-tools.js';

window.navigateTo = navigateTo;

export function navigateTo(sectionId) {
  // Hide all sections
  document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));

  // Update nav link active state
  document.querySelectorAll('.nav-link').forEach(link => {
    if (link.dataset.target === sectionId) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  // Show target section
  const targetSec = document.getElementById(`section-${sectionId}`);
  if (targetSec) {
    targetSec.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Trigger section specific initializers
  if (sectionId === 'dashboard') {
    loadDashboard();
  } else if (sectionId === 'pricing') {
    initPricingView();
  } else if (sectionId === 'history') {
    loadHistoryView();
  } else if (sectionId === 'account') {
    loadAccountView();
  } else if (sectionId === 'ai') {
    loadAiView();
  } else if (sectionId === 'dataset') {
    loadDatasetView();
  } else if (sectionId === 'business-tools') {
    initBusinessTools();
  }
}

// ---------------------------------------------------------
// Navigation Event Bindings
// ---------------------------------------------------------
function initNavigation() {
  document.querySelectorAll('[data-nav]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      const target = el.dataset.nav;
      navigateTo(target);
    });
  });

  // Handle browser back/forward or hash
  window.addEventListener('hashchange', () => {
    const hash = window.location.hash.replace('#', '');
    if (hash && document.getElementById(`section-${hash}`)) {
      navigateTo(hash);
    }
  });
}

// ---------------------------------------------------------
// Auth Form Handlers
// ---------------------------------------------------------
function initAuthForms() {
  // Register Form
  const regForm = document.getElementById('form-register');
  if (regForm) {
    regForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('reg-name').value;
      const email = document.getElementById('reg-email').value;
      const pass = document.getElementById('reg-password').value;
      const alertBox = document.getElementById('reg-alert');

      alertBox.style.display = 'none';

      try {
        await registerUser(name, email, pass);
        alertBox.className = 'alert alert-success';
        alertBox.textContent = 'Account created successfully! Redirecting...';
        alertBox.style.display = 'block';
        setTimeout(() => navigateTo('dashboard'), 800);
      } catch (err) {
        alertBox.className = 'alert alert-danger';
        alertBox.textContent = err.message;
        alertBox.style.display = 'block';
      }
    });
  }

  // Login Form
  const loginForm = document.getElementById('form-login');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value;
      const pass = document.getElementById('login-password').value;
      const alertBox = document.getElementById('login-alert');

      alertBox.style.display = 'none';

      try {
        await loginUser(email, pass);
        alertBox.className = 'alert alert-success';
        alertBox.textContent = 'Login successful! Redirecting...';
        alertBox.style.display = 'block';
        setTimeout(() => navigateTo('dashboard'), 800);
      } catch (err) {
        alertBox.className = 'alert alert-danger';
        alertBox.textContent = err.message;
        alertBox.style.display = 'block';
      }
    });
  }

  // Logout Button
  const btnLogout = document.getElementById('btn-logout');
  if (btnLogout) {
    btnLogout.addEventListener('click', (e) => {
      e.preventDefault();
      logoutUser();
      navigateTo('landing');
    });
  }
}

// ---------------------------------------------------------
// AI Assistant Handlers
// ---------------------------------------------------------
function initAiAssistant() {
  const formAi = document.getElementById('form-ai-query');
  const promptInput = document.getElementById('ai-prompt-input');
  const btnSubmit = document.getElementById('btn-ai-submit');
  const outputBox = document.getElementById('ai-output-text');
  const alertBox = document.getElementById('ai-alert');

  // Quick Chips
  document.querySelectorAll('.chip-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (promptInput) {
        promptInput.value = btn.textContent.trim().replace(/^"|"$/g, '');
        promptInput.focus();
      }
    });
  });

  if (formAi) {
    formAi.addEventListener('submit', async (e) => {
      e.preventDefault();
      const prompt = promptInput.value.trim();
      if (!prompt) return;

      const user = getCurrentUser();
      if (!user) {
        alert('Please register or log in first to use the AI Sales Assistant.');
        navigateTo('login');
        return;
      }

      btnSubmit.disabled = true;
      btnSubmit.innerHTML = `<span class="spinner"></span> Analyzing dataset...`;
      alertBox.style.display = 'none';
      outputBox.innerHTML = `<em>Consulting Gemini AI with 2024 synthetic medical device sales metrics...</em>`;

      try {
        const res = await api.analyze(prompt);
        // Format markdown basic bold/lists
        outputBox.innerHTML = formatMarkdown(res.analysis);
        updateQuotaDisplay(res.usage);
      } catch (err) {
        alertBox.style.display = 'block';
        alertBox.className = 'alert alert-danger';
        alertBox.textContent = err.message;
        outputBox.innerHTML = `<span style="color:#dc2626;">Analysis could not be completed.</span>`;
      } finally {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = `Run AI Analysis`;
      }
    });
  }
}

function updateQuotaDisplay(usage) {
  const quotaEl = document.getElementById('ai-quota-badge');
  if (quotaEl && usage) {
    quotaEl.textContent = `${usage.used} / ${usage.limit} Queries Used`;
  }
}

function formatMarkdown(text) {
  if (!text) return '';
  return text
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*)\*/gim, '<em>$1</em>')
    .replace(/\n\n/gim, '<p></p>')
    .replace(/^\* (.*$)/gim, '<li>$1</li>')
    .replace(/^\- (.*$)/gim, '<li>$1</li>');
}

// ---------------------------------------------------------
// View Specific Initializers
// ---------------------------------------------------------
async function initPricingView() {
  const user = getCurrentUser();
  const currentPlan = (user?.plan || 'FREE').toUpperCase();

  // Free Tier Card Button State
  const freeBtn = document.querySelector('#section-pricing .pricing-card:nth-child(1) button');
  if (freeBtn) {
    if (!user) {
      freeBtn.textContent = 'Daftar Akun Gratis';
      freeBtn.disabled = false;
      freeBtn.style.cursor = 'pointer';
      freeBtn.onclick = (e) => {
        e.preventDefault();
        navigateTo('register');
      };
    } else if (currentPlan === 'FREE') {
      freeBtn.textContent = '✓ Paket Aktif Anda (Free)';
      freeBtn.disabled = true;
      freeBtn.style.cursor = 'default';
      freeBtn.onclick = null;
    } else {
      freeBtn.textContent = 'Paket Dasar (Free)';
      freeBtn.disabled = true;
      freeBtn.style.cursor = 'default';
      freeBtn.onclick = null;
    }
  }

  // Pre-fetch config and preload PayPal SDK once
  const config = await getEffectiveConfig();
  if (config?.paypalClientId && config?.isPayPalConfigured) {
    await loadPayPalSdk(config.paypalClientId);
  }

  // Render buttons independently in parallel so Basic and Pro do not block or interfere with each other
  await Promise.allSettled([
    setupPayPalButton('BASIC', 'paypal-button-container-basic'),
    setupPayPalButton('PRO', 'paypal-button-container-pro')
  ]);
}

async function loadHistoryView() {
  const user = getCurrentUser();
  const listEl = document.getElementById('history-list');
  if (!user) {
    if (listEl) listEl.innerHTML = `<p class="alert alert-warning">Please log in to view analysis history.</p>`;
    return;
  }

  try {
    const data = await api.getHistory();
    const history = data.history || [];
    if (!history.length) {
      listEl.innerHTML = `<p style="color:#64748b;text-align:center;padding:2rem;">No saved analyses yet. Ask a question on the AI Analysis tab!</p>`;
      return;
    }

    listEl.innerHTML = history.map(item => `
      <div class="card" style="margin-bottom:1rem;border-left:4px solid #0284c7;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem;">
          <strong style="color:#0b192c;font-size:1rem;">"${item.prompt}"</strong>
          <span style="font-size:0.75rem;color:#64748b;">${new Date(item.timestamp).toLocaleString()}</span>
        </div>
        <div style="font-size:0.88rem;color:#334155;line-height:1.6;">
          ${formatMarkdown(item.analysis)}
        </div>
      </div>
    `).join('');
  } catch (err) {
    if (listEl) listEl.innerHTML = `<p class="alert alert-danger">${err.message}</p>`;
  }
}

function loadAccountView() {
  const user = getCurrentUser();
  const planInfo = getCurrentPlanInfo();
  if (!user) {
    navigateTo('login');
    return;
  }

  const elEmail = document.getElementById('account-email');
  const elName = document.getElementById('account-name');
  const elPlan = document.getElementById('account-plan');
  const elUsage = document.getElementById('account-usage');
  const elReset = document.getElementById('account-reset');

  if (elEmail) elEmail.textContent = user.email;
  if (elName) elName.textContent = user.fullName || 'User';
  if (elPlan) elPlan.textContent = `${user.plan || 'FREE'} Tier`;
  if (elUsage && planInfo) {
    elUsage.textContent = `${planInfo.currentUsage} / ${planInfo.analysesPerMonth} Analyses Used`;
  }
  if (elReset && planInfo) {
    elReset.textContent = new Date(planInfo.billingPeriodStart).toLocaleDateString();
  }
}

function loadAiView() {
  const planInfo = getCurrentPlanInfo();
  if (planInfo) {
    updateQuotaDisplay({ used: planInfo.currentUsage, limit: planInfo.analysesPerMonth });
  }
}

// ---------------------------------------------------------
// Global DOM Ready Bootstrapper
// ---------------------------------------------------------
document.addEventListener('DOMContentLoaded', async () => {
  initNavigation();
  initAuthForms();
  initAiAssistant();

  // Initialize session and config
  await initAuth();

  // Check URL params for PayPal redirect captures
  await checkPaymentUrlParams();

  // Initial routing
  const hash = window.location.hash.replace('#', '');
  if (hash && document.getElementById(`section-${hash}`)) {
    navigateTo(hash);
  } else {
    navigateTo('landing');
  }
});
