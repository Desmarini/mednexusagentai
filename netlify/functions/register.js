// netlify/functions/register.js
// Handles user registration for MedNexus Agent AI

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json'
};

// In-memory demo store (in production connect to MongoDB / Supabase / Fauna)
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
    // Fallback lightweight safe token
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
    const { name, email, password, clinicName } = body;

    if (!name || !email || !password) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Name, email, and password are required.' })
      };
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if user already exists
    const existing = global.mednexusUsers.find(u => u.email === normalizedEmail);
    if (existing) {
      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({ error: 'User with this email already exists.' })
      };
    }

    const newUser = {
      id: `usr_${Date.now()}`,
      name: name.trim(),
      email: normalizedEmail,
      passwordHash: password, // In production, hash with bcrypt
      clinicName: (clinicName || 'Independent Clinic').trim(),
      role: 'Clinician',
      credits: 10, // 10 Free AI analyses on signup
      plan: 'Free Starter',
      createdAt: new Date().toISOString()
    };

    global.mednexusUsers.push(newUser);

    const token = generateToken(newUser);

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Account successfully registered.',
        token,
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          clinicName: newUser.clinicName,
          role: newUser.role,
          credits: newUser.credits,
          plan: newUser.plan
        }
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal registration error', details: error.message })
    };
  }
};

