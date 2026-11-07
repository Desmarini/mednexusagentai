// netlify/functions/login.js
// Handles user login and session generation for MedNexus Agent AI

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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

function generateToken(user) {
  try {
    const jwt = require('jsonwebtoken');
    const secret = process.env.JWT_SECRET || 'mednexus-super-secret-key-2026';
    return jwt.sign({ id: user.id, email: user.email, role: user.role, plan: user.plan }, secret, { expiresIn: '7d' });
  } catch (err) {
    const payload = { id: user.id, email: user.email, role: user.role, plan: user.plan, exp: Date.now() + 7 * 86400000 };
    return Buffer.from(JSON.stringify(payload)).toString('base64');
  }
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: JSON.stringify({ message: 'OK' }) };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { email, password } = body;

    if (!email || !password) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Email and password are required.' })
      };
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = global.mednexusUsers.find(u => u.email === normalizedEmail);

    if (!user || user.passwordHash !== password) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid email or password.' })
      };
    }

    const token = generateToken(user);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Login successful.',
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          clinicName: user.clinicName,
          role: user.role,
          credits: user.credits,
          plan: user.plan
        }
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal login error', details: error.message })
    };
  }
};

