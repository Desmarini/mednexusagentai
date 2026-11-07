// ==============================================================================
// MedNexus AI — PayPal Sandbox Integration Controller
// ==============================================================================
// Handles PayPal JS SDK button rendering and server-side capture verification.
// Never fakes payment or confirmation; validates tokens and capture IDs.
// Includes singleton SDK promise caching, sequential rendering, and resilient error recovery.
// ==============================================================================

import { api } from './api.js';
import { getCurrentUser, getSystemConfig, initAuth, onAuthChange } from './auth.js';

let sdkPromise = null;
let currentLoadingClientId = null;
let publicConfig = null;

// Track active rendering promises and rendered states per container
const inFlightRenders = new Map(); // containerId -> Promise
const renderedContainers = new Map(); // containerId -> { planId, userPlan }

if (typeof onAuthChange === 'function') {
  onAuthChange(() => {
    renderedContainers.clear();
  });
}

/**
 * Safely retrieve system config with PayPal Client ID
 */
export async function getEffectiveConfig() {
  const sessionConfig = getSystemConfig();
  if (sessionConfig?.paypalClientId) {
    publicConfig = sessionConfig;
    return sessionConfig;
  }
  if (publicConfig?.paypalClientId) {
    return publicConfig;
  }
  try {
    publicConfig = await api.getConfig();
    return publicConfig;
  } catch (err) {
    console.warn('Could not load public system config:', err?.message || err);
    return null;
  }
}

/**
 * Load PayPal JavaScript SDK dynamically using singleton Promise pattern
 */
export async function loadPayPalSdk(clientId) {
  if (!clientId || clientId === 'YOUR_SANDBOX_CLIENT_ID') {
    return false;
  }

  // Already loaded and ready on window
  if (window.paypal && typeof window.paypal.Buttons === 'function' && currentLoadingClientId === clientId) {
    return true;
  }

  // Loading already in-flight for this exact client ID — reuse the active promise
  if (sdkPromise && currentLoadingClientId === clientId) {
    return sdkPromise;
  }

  currentLoadingClientId = clientId;

  sdkPromise = new Promise((resolve) => {
    // Check if script element already exists in DOM
    const existingScript = document.getElementById('paypal-sdk-script');
    if (existingScript) {
      if (existingScript.dataset.clientId === clientId) {
        if (window.paypal && typeof window.paypal.Buttons === 'function') {
          resolve(true);
          return;
        }
        existingScript.addEventListener('load', () => resolve(true), { once: true });
        existingScript.addEventListener('error', () => {
          sdkPromise = null;
          currentLoadingClientId = null;
          resolve(false);
        }, { once: true });
        return;
      }
      existingScript.remove();
    }

    const script = document.createElement('script');
    script.id = 'paypal-sdk-script';
    script.dataset.clientId = clientId;
    script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=USD&intent=capture&disable-funding=credit,card`;
    script.async = true;

    script.onload = () => {
      resolve(true);
    };

    script.onerror = (err) => {
      console.error('Failed to load PayPal JS SDK script:', err);
      sdkPromise = null;
      currentLoadingClientId = null;
      resolve(false);
    };

    document.head.appendChild(script);
  });

  return sdkPromise;
}

/**
 * Clear cached button renders so they can re-render on demand
 */
export function resetPayPalButtons() {
  renderedContainers.clear();
}

/**
 * Render PayPal button for a specific plan (BASIC or PRO)
 */
export async function setupPayPalButton(planId, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const user = getCurrentUser();
  const userPlan = (user?.plan || 'FREE').toUpperCase();

  // If user is already on this plan or higher, show active plan badge instead of purchase button
  if (userPlan === planId) {
    container.innerHTML = `
      <div style="margin-top:auto;">
        <button class="btn btn-outline" style="width:100%;cursor:default;border-color:#10b981;color:#059669;font-weight:700;" disabled>
          ✓ Paket Aktif Anda
        </button>
      </div>
    `;
    renderedContainers.set(containerId, { planId, userPlan });
    return;
  }

  if (userPlan === 'PRO' && planId === 'BASIC') {
    container.innerHTML = `
      <div style="margin-top:auto;">
        <button class="btn btn-outline" style="width:100%;cursor:default;opacity:0.75;" disabled>
          ✓ Termasuk dalam Pro
        </button>
      </div>
    `;
    renderedContainers.set(containerId, { planId, userPlan });
    return;
  }

  // If already rendered cleanly for this container and user state, do not wipe DOM
  const existingRender = renderedContainers.get(containerId);
  if (existingRender && existingRender.planId === planId && existingRender.userPlan === userPlan && container.childElementCount > 0) {
    return;
  }

  // If this container is currently rendering in-flight, await the ongoing render instead of wiping container
  if (inFlightRenders.has(containerId)) {
    return await inFlightRenders.get(containerId);
  }

  const renderPromise = (async () => {
    try {
      const config = await getEffectiveConfig();
      const clientId = config?.paypalClientId;

      if (!clientId || !config?.isPayPalConfigured) {
        container.innerHTML = `
          <div class="alert alert-warning" style="font-size:0.8rem;padding:8px 12px;margin:0;">
            <strong>PayPal Sandbox Not Configured:</strong> Set <code>PAYPAL_CLIENT_ID</code> and <code>PAYPAL_CLIENT_SECRET</code> in Netlify.
          </div>
        `;
        return;
      }

      // Display clean loading spinner while preparing button
      container.innerHTML = `<div class="spinner" style="border-top-color:#0284c7;margin:10px auto;"></div>`;

      const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(false), 15000));
      const loaded = await Promise.race([loadPayPalSdk(clientId), timeoutPromise]);

      if (!loaded || typeof window.paypal === 'undefined' || !window.paypal.Buttons) {
        container.innerHTML = `
          <div class="alert alert-danger" style="font-size:0.8rem;padding:8px 12px;margin:0;line-height:1.4;">
            <strong>PayPal SDK Connection Error:</strong><br>
            Tidak dapat memuat komponen PayPal Sandbox. Silakan muat ulang halaman atau periksa koneksi internet.
          </div>
        `;
        return;
      }

      // Clear spinner before rendering PayPal button iframe
      container.innerHTML = '';

      const buttons = window.paypal.Buttons({
        style: {
          layout: 'vertical',
          color: 'gold',
          shape: 'rect',
          label: 'pay'
        },

        // Validate authentication on click without throwing unhandled exceptions to onError
        onClick: (data, actions) => {
          const currentUser = getCurrentUser();
          if (!currentUser) {
            alert('Silakan masuk (login) atau daftar akun terlebih dahulu untuk melanjutkan upgrade paket.');
            if (window.navigateTo) window.navigateTo('login');
            return actions.reject();
          }
          return actions.resolve();
        },

        // Call our Netlify serverless function to create order
        createOrder: async () => {
          const currentUser = getCurrentUser();
          if (!currentUser) {
            if (window.navigateTo) window.navigateTo('login');
            throw new Error('User not authenticated. Please log in first.');
          }
          try {
            const res = await api.paypalCreateOrder(planId);
            return res.orderId;
          } catch (err) {
            alert(`Gagal membuat pesanan PayPal: ${err.message}`);
            throw err;
          }
        },

        // User approved in PayPal popup -> capture on our server
        onApprove: async (data) => {
          const orderId = data.orderID;
          showPaymentProcessingModal(orderId);

          try {
            const captureRes = await api.paypalCaptureOrder(orderId);
            if (captureRes?.token) {
              api.setToken(captureRes.token);
            }
            await initAuth();
            renderedContainers.clear();
            showPaymentSuccessModal(captureRes);
          } catch (err) {
            showPaymentErrorModal(err.message);
          }
        },

        onCancel: () => {
          console.log(`PayPal Checkout for ${planId} cancelled by user. No plan change was made.`);
        },

        onError: (err) => {
          console.error(`PayPal Buttons Error (${planId}):`, err);
          const msg = err?.message || String(err || '');
          // Skip user-cancelled, harmless popup closes, or auth-abort popups
          if (msg.includes('User not authenticated') || msg.includes('close') || msg.includes('popup') || msg.includes('reject') || msg.includes('cancel')) {
            return;
          }

          // Render non-destructive error below the button container so the button never vanishes
          let errBanner = document.getElementById(`${containerId}-error`);
          if (!errBanner) {
            errBanner = document.createElement('div');
            errBanner.id = `${containerId}-error`;
            errBanner.className = 'alert alert-danger';
            errBanner.style.cssText = 'font-size:0.75rem;padding:6px 10px;margin-top:8px;line-height:1.3;';
            container.parentNode.appendChild(errBanner);
          }
          errBanner.textContent = `PayPal Sandbox: ${msg || 'Gagal memproses transaksi.'}`;
        }
      });

      if (buttons.isEligible && !buttons.isEligible()) {
        container.innerHTML = `
          <div class="alert alert-warning" style="font-size:0.8rem;padding:8px 12px;margin:0;">
            Metode pembayaran ini tidak tersedia pada browser ini.
          </div>
        `;
        return;
      }

      await buttons.render(container);
      renderedContainers.set(containerId, { planId, userPlan });
    } catch (err) {
      console.error(`Error rendering PayPal button for ${planId} into #${containerId}:`, err);
      container.innerHTML = `
        <div class="alert alert-danger" style="font-size:0.8rem;padding:8px 12px;margin:0;">
          Gagal memuat tombol PayPal Sandbox. Silakan coba refresh halaman.
        </div>
      `;
    } finally {
      inFlightRenders.delete(containerId);
    }
  })();

  inFlightRenders.set(containerId, renderPromise);
  return await renderPromise;
}

/**
 * Handle redirect-based PayPal flow (e.g. ?token=... or #payment-success)
 */
export async function checkPaymentUrlParams() {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token'); // PayPal Order ID in redirect flow
  const payerId = urlParams.get('PayerID');

  if (token && payerId) {
    // Clear URL params without reload
    window.history.replaceState({}, document.title, window.location.pathname);
    showPaymentProcessingModal(token);

    try {
      const captureRes = await api.paypalCaptureOrder(token);
      if (captureRes?.token) {
        api.setToken(captureRes.token);
      }
      await initAuth();
      renderedContainers.clear();
      showPaymentSuccessModal(captureRes);
    } catch (err) {
      showPaymentErrorModal(err.message);
    }
  }
}

function showPaymentProcessingModal(orderId) {
  const modal = document.getElementById('payment-modal');
  const modalBody = document.getElementById('payment-modal-body');
  if (modal && modalBody) {
    modal.classList.add('open');
    modalBody.innerHTML = `
      <div style="text-align:center;padding:1.5rem 0;">
        <div class="spinner" style="width:36px;height:36px;border-width:3px;border-top-color:#0284c7;margin-bottom:1rem;"></div>
        <h3 style="color:#0b192c;margin-bottom:0.5rem;">Memverifikasi Pembayaran PayPal</h3>
        <p style="color:#64748b;font-size:0.9rem;">Menghubungkan ke PayPal Sandbox REST API untuk menyelesaikan order <code>${orderId}</code> dan mengaktifkan kuota paket Anda...</p>
      </div>
    `;
  }
}

function showPaymentSuccessModal(result) {
  const modalBody = document.getElementById('payment-modal-body');
  if (modalBody) {
    modalBody.innerHTML = `
      <div style="text-align:center;padding:1rem 0;">
        <div style="width:54px;height:54px;background:#ecfdf5;color:#059669;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1.75rem;margin:0 auto 1rem auto;">✓</div>
        <h3 style="color:#0b192c;margin-bottom:0.5rem;">Pembayaran Berhasil & Paket Aktif!</h3>
        <p style="color:#065f46;font-size:0.92rem;margin-bottom:1.25rem;">
          ${result.message || 'Pembayaran PayPal Sandbox berhasil diverifikasi dan dicapture oleh sistem.'}
        </p>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;font-size:0.8rem;text-align:left;margin-bottom:1.5rem;">
          <div><strong>Order ID:</strong> ${result.orderId}</div>
          <div><strong>Capture ID:</strong> ${result.captureId}</div>
          <div><strong>Paket Aktif:</strong> ${result.plan}</div>
          <div><strong>Jumlah:</strong> $${result.amount} ${result.currency}</div>
          <div><strong>Status:</strong> COMPLETED (PayPal Sandbox)</div>
        </div>
        <button class="btn btn-primary" onclick="document.getElementById('payment-modal').classList.remove('open'); window.navigateTo('dashboard');">
          Buka Dashboard Analitik
        </button>
      </div>
    `;
  }
}

function showPaymentErrorModal(errorMessage) {
  const modalBody = document.getElementById('payment-modal-body');
  if (modalBody) {
    modalBody.innerHTML = `
      <div style="text-align:center;padding:1rem 0;">
        <div style="width:54px;height:54px;background:#fef2f2;color:#dc2626;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1.75rem;margin:0 auto 1rem auto;">✕</div>
        <h3 style="color:#0b192c;margin-bottom:0.5rem;">Verifikasi Pembayaran Gagal</h3>
        <p style="color:#991b1b;font-size:0.9rem;margin-bottom:1.5rem;">
          ${errorMessage}
        </p>
        <button class="btn btn-outline" onclick="document.getElementById('payment-modal').classList.remove('open');">
          Tutup
        </button>
      </div>
    `;
  }
}
