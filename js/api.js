// ==============================================================================
// MedNexus AI — API Client Module
// ==============================================================================

const API_BASE = '/.netlify/functions';

class ApiClient {
  constructor() {
    this.token = localStorage.getItem('medinsight_token') || null;
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('medinsight_token', token);
    } else {
      localStorage.removeItem('medinsight_token');
    }
  }

  getToken() {
    return this.token;
  }

  async request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers
      });

      const contentType = response.headers.get('content-type') || '';
      let data = {};
      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        data = { message: text };
      }

      if (!response.ok) {
        const errorMsg = data.details ? `${data.error || 'Error'}: ${data.details}` : (data.error || data.message || `Request failed with status ${response.status}`);
        const error = new Error(errorMsg);
        error.status = response.status;
        error.data = data;
        throw error;
      }

      return data;
    } catch (err) {
      console.error(`API Error on ${endpoint}:`, err);
      throw err;
    }
  }

  // Auth methods
  async register(fullName, email, password) {
    const res = await this.request('/register', {
      method: 'POST',
      body: JSON.stringify({ fullName, email, password })
    });
    if (res.token) {
      this.setToken(res.token);
    }
    return res;
  }

  async login(email, password) {
    const res = await this.request('/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    if (res.token) {
      this.setToken(res.token);
    }
    return res;
  }

  logout() {
    this.setToken(null);
  }

  async getMe() {
    return await this.request('/me', { method: 'GET' });
  }

  async getConfig() {
    return await this.request('/config', { method: 'GET' });
  }

  // Dataset
  async getDataset() {
    return await this.request('/data', { method: 'GET' });
  }

  // AI Analysis
  async analyze(prompt) {
    return await this.request('/analyze', {
      method: 'POST',
      body: JSON.stringify({ prompt })
    });
  }

  // Analysis History
  async getHistory() {
    return await this.request('/history', { method: 'GET' });
  }

  async clearHistory() {
    return await this.request('/history', { method: 'DELETE' });
  }

  // MedNexus Business Intelligence modules
  async getBusinessItems(type) {
    return await this.request(`/business-tools?type=${encodeURIComponent(type)}`, { method: 'GET' });
  }
  async saveBusinessItem(type, item) {
    return await this.request('/business-tools', { method: 'POST', body: JSON.stringify({ type, ...item }) });
  }
  async deleteBusinessItem(type, id) {
    return await this.request('/business-tools', { method: 'DELETE', body: JSON.stringify({ type, id }) });
  }

  // PayPal Sandbox Endpoints
  async paypalCreateOrder(planId) {
    return await this.request('/paypal-create-order', {
      method: 'POST',
      body: JSON.stringify({ planId })
    });
  }

  async paypalCaptureOrder(orderId) {
    return await this.request('/paypal-capture-order', {
      method: 'POST',
      body: JSON.stringify({ orderId })
    });
  }

  async paypalOrderStatus(orderId) {
    return await this.request(`/paypal-order-status?orderId=${encodeURIComponent(orderId)}`, {
      method: 'GET'
    });
  }
}

export const api = new ApiClient();
