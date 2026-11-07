// netlify/functions/history.js
// Retrieves clinical analysis history for MedNexus Agent AI

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json'
};

global.mednexusHistory = global.mednexusHistory || [
  {
    id: "ana_9042",
    patientName: "James Harrison",
    patientAge: 58,
    patientGender: "Male",
    primaryDiagnosis: "Severe Community-Acquired Bacterial Pneumonia",
    severity: "CRITICAL",
    icd10: ["J18.9", "R65.20"],
    confidence: 94.2,
    date: new Date(Date.now() - 3600000 * 4).toISOString(),
    status: "Completed",
    alertDispatched: true
  },
  {
    id: "ana_7811",
    patientName: "Elena Rodriguez",
    patientAge: 44,
    patientGender: "Female",
    primaryDiagnosis: "Type 2 Diabetes with Peripheral Neuropathy",
    severity: "MODERATE",
    icd10: ["E11.40", "E11.65"],
    confidence: 91.0,
    date: new Date(Date.now() - 86400000 * 2).toISOString(),
    status: "Completed",
    alertDispatched: false
  },
  {
    id: "ana_3319",
    patientName: "Robert Chen",
    patientAge: 63,
    patientGender: "Male",
    primaryDiagnosis: "Acute Anterior Wall STEMI",
    severity: "CRITICAL",
    icd10: ["I21.0"],
    confidence: 98.1,
    date: new Date(Date.now() - 86400000 * 4).toISOString(),
    status: "Completed",
    alertDispatched: true
  }
];

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: JSON.stringify({ message: 'OK' }) };
  }

  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const params = event.queryStringParameters || {};
    const search = (params.search || '').toLowerCase();
    const limit = parseInt(params.limit) || 20;

    let items = global.mednexusHistory;

    if (search) {
      items = items.filter(i => 
        i.patientName.toLowerCase().includes(search) ||
        i.primaryDiagnosis.toLowerCase().includes(search) ||
        i.severity.toLowerCase().includes(search)
      );
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        count: items.length,
        history: items.slice(0, limit)
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to retrieve history', details: error.message })
    };
  }
};

