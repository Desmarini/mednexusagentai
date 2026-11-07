// ==============================================================================
// MedNexus AI — Authentication Management
// ==============================================================================

import { api } from './api.js';

let currentUser = null;
let currentPlanInfo = null;
let systemConfig = null;

const authChangeListeners = [];

export function onAuthChange(callback) {
  if (typeof callback === 'function') {
    authChangeListeners.push(callback);
  }
}

function notifyAuthChange() {
  for (const listener of authChangeListeners) {
    try {
      listener(currentUser, currentPlanInfo);
    } catch (e) {
      console.warn('Auth change listener error:', e);
    }
  }
}

export async function initAuth() {
  if (!systemConfig) {
    try {
      systemConfig = await api.getConfig();
    } catch (e) {
      console.warn('Could not load public system config:', e.message);
    }
  }

  const token = api.getToken();
  if (!token) {
    currentUser = null;
    currentPlanInfo = null;
    updateAuthUI(null, null, systemConfig);
    notifyAuthChange();
    return null;
  }

  try {
    const data = await api.getMe();
    currentUser = data.user;
    currentPlanInfo = data.plan;
    if (data.systemConfig) {
      systemConfig = data.systemConfig;
    }
    updateAuthUI(currentUser, currentPlanInfo, systemConfig);
    notifyAuthChange();
    return currentUser;
  } catch (err) {
    console.warn('Session expired or invalid:', err.message);
    api.logout();
    currentUser = null;
    currentPlanInfo = null;
    updateAuthUI(null, null, systemConfig);
    notifyAuthChange();
    return null;
  }
}

export function getCurrentUser() {
  return currentUser;
}

export function getCurrentPlanInfo() {
  return currentPlanInfo;
}

export function getSystemConfig() {
  return systemConfig;
}

export async function registerUser(fullName, email, password) {
  const res = await api.register(fullName, email, password);
  currentUser = res.user;
  await initAuth();
  return res;
}

export async function loginUser(email, password) {
  const res = await api.login(email, password);
  currentUser = res.user;
  await initAuth();
  return res;
}

export function logoutUser() {
  api.logout();
  currentUser = null;
  currentPlanInfo = null;
  updateAuthUI(null, null, null);
  notifyAuthChange();
}

export function updateAuthUI(user, planInfo, config) {
  const unauthNav = document.getElementById('unauth-nav');
  const authNav = document.getElementById('auth-nav');
  const userPill = document.getElementById('user-pill-name');
  const userPlanPill = document.getElementById('user-pill-plan');

  if (user) {
    if (unauthNav) unauthNav.style.display = 'none';
    if (authNav) authNav.style.display = 'flex';
    if (userPill) userPill.textContent = user.fullName || user.email;
    if (userPlanPill) {
      userPlanPill.textContent = (user.plan || 'FREE').toUpperCase();
      userPlanPill.className = `plan-tag ${(user.plan || 'free').toLowerCase()}`;
    }
  } else {
    if (unauthNav) unauthNav.style.display = 'flex';
    if (authNav) authNav.style.display = 'none';
  }
}
