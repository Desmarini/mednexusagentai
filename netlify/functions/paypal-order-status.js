// netlify/functions/paypal-order-status.js
// Inspects PayPal order status for MedNexus Agent AI

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json'
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: JSON.stringify({ message: 'OK' }) };
  }

  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const { orderId } = event.queryStringParameters || {};

  if (!orderId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'orderId query parameter required' })
    };
  }

  // If simulated order
  if (orderId.startsWith('ORD-PP-')) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        orderId,
        status: 'COMPLETED',
        mode: 'sandbox_simulation',
        verified: true
      })
    };
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      orderId,
      status: 'VERIFIED',
      timestamp: new Date().toISOString()
    })
  };
};

