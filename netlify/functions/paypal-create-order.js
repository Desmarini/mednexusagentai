// netlify/functions/paypal-create-order.js
// Creates a PayPal checkout order for MedNexus Agent AI subscriptions/credits

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json'
};

const PAYPAL_API_BASE = process.env.PAYPAL_ENV === 'production' 
  ? 'https://api-m.paypal.com' 
  : 'https://api-m.sandbox.paypal.com';

async function getPayPalAccessToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) return null;

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });

  if (!response.ok) {
    throw new Error('Failed to retrieve PayPal access token');
  }

  const data = await response.json();
  return data.access_token;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: JSON.stringify({ message: 'OK' }) };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { planId, amount, currency = 'USD' } = JSON.parse(event.body || '{}');
    const orderAmount = amount || (planId === 'pro' ? '29.99' : '99.00');

    let accessToken = null;
    try {
      accessToken = await getPayPalAccessToken();
    } catch (e) {
      console.warn("PayPal credentials not set or invalid, falling back to simulated sandbox order:", e.message);
    }

    if (accessToken) {
      // Live / Sandbox PayPal REST API Order
      const res = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          intent: 'CAPTURE',
          purchase_units: [
            {
              reference_id: planId || 'pro_monthly',
              description: `MedNexus Agent AI - ${planId === 'pro' ? 'Pro Clinician' : 'Enterprise Clinic'} Plan`,
              amount: {
                currency_code: currency,
                value: orderAmount
              }
            }
          ]
        })
      });

      const orderData = await res.json();
      return {
        statusCode: res.status,
        headers,
        body: JSON.stringify({
          success: true,
          orderId: orderData.id,
          status: orderData.status,
          links: orderData.links
        })
      };
    } else {
      // Simulated Sandbox Order for seamless local & demo testing
      const mockOrderId = `ORD-PP-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          mode: 'sandbox_simulation',
          orderId: mockOrderId,
          status: 'CREATED',
          planId: planId || 'pro',
          amount: orderAmount,
          currency,
          message: 'Simulated sandbox PayPal order initialized. Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET for live production keys.'
        })
      };
    }
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to create PayPal order', details: error.message })
    };
  }
};

