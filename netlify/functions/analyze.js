// netlify/functions/analyze.js
// Main Clinical Agent Analysis Endpoint for MedNexus Agent AI

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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
  }
];

// Helper to invoke gemini engine
const geminiHandler = require('./gemini').handler;

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: JSON.stringify({ message: 'OK' }) };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { patientName, patientAge, patientGender, clinicalNote, symptoms } = body;

    if (!clinicalNote && (!symptoms || symptoms.length === 0)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Please provide clinical notes or presenting symptoms.' })
      };
    }

    const clinicalPrompt = `
Patient: ${patientName || 'Anonymous'}, ${patientAge || 45}yo ${patientGender || 'Unspecified'}
Symptoms: ${Array.isArray(symptoms) ? symptoms.join(', ') : symptoms || 'None specified'}
Clinical Examination / Note:
${clinicalNote || 'None provided'}
`;

    // Execute Gemini analysis
    const geminiResponse = await geminiHandler({
      httpMethod: 'POST',
      body: JSON.stringify({ prompt: clinicalPrompt })
    });

    const parsedGemini = JSON.parse(geminiResponse.body);
    const analysis = parsedGemini.analysis || {};

    const recordId = `ana_${Date.now()}`;
    const newRecord = {
      id: recordId,
      patientName: patientName || 'Anonymous Patient',
      patientAge: patientAge || 45,
      patientGender: patientGender || 'Unspecified',
      primaryDiagnosis: analysis.primaryDiagnosis || 'Clinical Syndrome Under Investigation',
      severity: analysis.severityScore || 'MODERATE',
      icd10: analysis.icd10 || ['R69'],
      confidence: analysis.confidencePercent || 90.0,
      differentialDiagnoses: analysis.differentialDiagnoses || [],
      extractedBiomarkers: analysis.extractedBiomarkers || [],
      recommendations: analysis.recommendations || [],
      alertDispatched: !!analysis.emergencyAlertDispatched,
      date: new Date().toISOString(),
      status: 'Completed'
    };

    // Save to in-memory history
    global.mednexusHistory.unshift(newRecord);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Analysis completed successfully.',
        record: newRecord
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Analysis failed', details: error.message })
    };
  }
};

