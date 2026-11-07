// paypal.js - Client-Side PayPal Integration for MedNexus Agent AI

class PayPalClient {
  constructor() {
    this.selectedPlan = 'pro';
    this.init();
  }

  init() {
    // Listen for pricing tier buttons
    document.querySelectorAll('[data-plan-tier]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tier = e.currentTarget.getAttribute('data-plan-tier');
        this.openCheckout(tier);
      });
    });
  }

  openCheckout(planId = 'pro') {
    this.selectedPlan = planId;
    const modal = document.getElementById('paypal-modal');
    if (!modal) return;

    const titleEl = document.getElementById('paypal-plan-title');
    const priceEl = document.getElementById('paypal-plan-price');

    if (planId === 'enterprise') {
      if (titleEl) titleEl.textContent = 'Enterprise Clinic Plan (1,500 Credits/mo)';
      if (priceEl) priceEl.textContent = '$99.00 USD';
    } else {
      if (titleEl) titleEl.textContent = 'Pro Clinician Plan (250 Credits/mo)';
      if (priceEl) priceEl.textContent = '$29.99 USD';
    }

    modal.classList.remove('hidden');
  }

  closeCheckout() {
    const modal = document.getElementById('paypal-modal');
    if (modal) modal.classList.add('hidden');
  }

  async executePayment() {
    const btn = document.getElementById('btn-paypal-confirm');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<span class="live-dot"></span> Processing PayPal Transaction...`;

    try {
      const amount = this.selectedPlan === 'enterprise' ? '99.00' : '29.99';
      
      // 1. Create Order
      const createRes = await window.api.createPayPalOrder(this.selectedPlan, amount);
      if (!createRes.success || !createRes.orderId) {
        throw new Error(createRes.error || "Failed to create PayPal order.");
      }

      const orderId = createRes.orderId;

      // 2. Capture Order
      const user = window.auth ? window.auth.getUser() : null;
      const userEmail = user ? user.email : 'clinician@hospital.org';

      const captureRes = await window.api.capturePayPalOrder(orderId, this.selectedPlan, userEmail);
      if (!captureRes.success) {
        throw new Error(captureRes.error || "Failed to capture payment.");
      }

      // 3. Update User UI
      alert(`🎉 Payment Successful!\n\nOrder ID: ${orderId}\nTransaction: ${captureRes.captureId}\nAdded: ${captureRes.creditsAdded} Credits\nPlan: ${captureRes.newPlan}`);
      
      if (window.auth && window.auth.currentUser) {
        window.auth.currentUser.credits = (window.auth.currentUser.credits || 0) + captureRes.creditsAdded;
        window.auth.currentUser.plan = captureRes.newPlan;
        window.auth.updateUI();
      }

      this.closeCheckout();
    } catch (err) {
      alert(`Payment Processing Notice: ${err.message}`);
    } finally {
      btn.disabled = false;
      btn.innerHTML = originalText;
    }
  }
}

window.paypalClient = new PayPalClient();

