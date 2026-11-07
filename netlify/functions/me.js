// netlify/functions/me.js
// Fetches the current authenticated user's profile and subscription status

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json'
};

global.mednexusUsers = global.mednexusUsers || [
  {
    id: "usr_admin",
    name: "Dr. Sarah Lin",
    email: "doctor@mednexus.org",
    passwordHash: "demo123",
    role: "Clinician",
    clinicName: "Metro General Hospital",
    credits: 50,
    plan: "Pro Clinician",
    createdAt: new Date().toISOString()
  }
];

function verifyToken(token) {
  try {
    const jwt = require('jsonwebtoken');
    const secret = process.env.JWT_SECRET || 'mednexus-super-secret-key-2026';
    return jwt.verify(token, secret);
  } catch (err) {
    try {
      const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
      if (decoded.exp && decoded.exp > Date.now()) {
        return decoded;
      }
      return null;
    } catch (e) {
      return null;
    }
  }
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: JSON.stringify({ message: 'OK' }) };
  }

  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const authHeader = event.headers.authorization || event.headers.Authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Missing or malformed Authorization header.' })
    };
  }

  const token = authHeader.replace('Bearer ', '').trim();
  const decoded = verifyToken(token);

  if (!decoded || !decoded.id) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Invalid or expired token.' })
    };
  }

  const user = global.mednexusUsers.find(u => u.id === decoded.id || u.email === decoded.email);
  if (!user) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'User record not found.' })
    };
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        clinicName: user.clinicName,
        role: user.role,
        credits: user.credits,
        plan: user.plan,
        createdAt: user.createdAt
      }
    })
  };
};

