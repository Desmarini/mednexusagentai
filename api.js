// api.js - Centralized API Client for MedNexus Agent AI

const API_BASE = '/.netlify/functions';

class MedNexusAPI {
  constructor() {
    this.token = localStorage.getItem('mednexus_token') || null;
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('mednexus_token', token);
    } else {
      localStorage.removeItem('mednexus_token');
    }
  }

  getHeaders() {
    const headers = {
      'Content-Type': 'application/json'
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  async request(endpoint, options = {}) {
    const url = `${API_BASE}/${endpoint}`;
    const config = {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...(options.headers || {})
      }
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error ${response.status}`);
      }

      return data;
    } catch (err) {
      console.error(`API Error [${endpoint}]:`, err.message);
      throw err;
    }
  }

  // --- Auth Endpoints ---
  async register(name, email, password, clinicName) {
    const data = await this.request('register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, clinicName })
    });
    if (data.token) this.setToken(data.token);
    return data;
  }

  async login(email, password) {
    const data = await this.request('login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    if (data.token) this.setToken(data.token);
    return data;
  }

  async getMe() {
    return await this.request('me', { method: 'GET' });
  }

  logout() {
    this.setToken(null);
    localStorage.removeItem('mednexus_user');
  }

  // --- Clinical Analysis & Data ---
  async analyze(patientData) {
    return await this.request('analyze', {
      method: 'POST',
      body: JSON.stringify(patientData)
    });
  }

  async getHistory(search = '', limit = 20) {
    const query = new URLSearchParams({ search, limit }).toString();
    return await this.request(`history?${query}`, { method: 'GET' });
  }

  async getReferenceData() {
    return await this.request('data', { method: 'GET' });
  }

  async geminiAnalysis(prompt) {
    return await this.request('gemini', {
      method: 'POST',
      body: JSON.stringify({ prompt })
    });
  }

  // --- PayPal Subscriptions & Orders ---
  async createPayPalOrder(planId, amount) {
    return await this.request('paypal-create-order', {
      method: 'POST',
      body: JSON.stringify({ planId, amount })
    });
  }

  async capturePayPalOrder(orderId, planId, userEmail) {
    return await this.request('paypal-capture-order', {
      method: 'POST',
      body: JSON.stringify({ orderId, planId, userEmail })
    });
  }

  async getOrderStatus(orderId) {
    return await this.request(`paypal-order-status?orderId=${encodeURIComponent(orderId)}`, {
      method: 'GET'
    });
  }

  // --- Business & Clinic Tools ---
  async calculateROI(clinicData) {
    return await this.request('business-tools', {
      method: 'POST',
      body: JSON.stringify(clinicData)
    });
  }

  async getClinicBenchmarks() {
    return await this.request('business-tools', { method: 'GET' });
  }
}

// Global singleton instance
window.api = new MedNexusAPI();

