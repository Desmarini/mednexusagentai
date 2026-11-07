// netlify/functions/paypal-webhook.js
// Handles PayPal asynchronous webhooks for MedNexus Agent AI

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: JSON.stringify({ message: 'OK' }) };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const payload = JSON.parse(event.body || '{}');
    const eventType = payload.event_type || 'TEST_WEBHOOK_EVENT';

    console.log(`[PayPal Webhook Received]: ${eventType}`, payload.id);

    switch (eventType) {
      case 'PAYMENT.CAPTURE.COMPLETED':
        // Handle successful payment capture
        const capture = payload.resource;
        console.log(`Payment captured: ${capture?.id}, Amount: ${capture?.amount?.value}`);
        break;
      case 'BILLING.SUBSCRIPTION.CANCELLED':
        console.log(`Subscription cancelled: ${payload.resource?.id}`);
        break;
      default:
        console.log(`Unhandled webhook event: ${eventType}`);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        received: true,
        eventType,
        timestamp: new Date().toISOString()
      })
    };
  } catch (err) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Webhook processing failed', details: err.message })
    };
  }
};

