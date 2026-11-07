// netlify/functions/data.js
// Clinical reference data, sample cases, and pricing tiers for MedNexus Agent AI

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json'
};

const medicalReferenceData = {
  symptoms: [
    { id: "symp_1", name: "Fever / Pyrexia", category: "Systemic" },
    { id: "symp_2", name: "Shortness of Breath (Dyspnea)", category: "Respiratory" },
    { id: "symp_3", name: "Retrosternal Chest Pressure", category: "Cardiovascular" },
    { id: "symp_4", name: "Productive Cough / Sputum", category: "Respiratory" },
    { id: "symp_5", name: "Severe Throbbing Headache", category: "Neurological" },
    { id: "symp_6", name: "Right Lower Quadrant Abdominal Pain", category: "Gastrointestinal" },
    { id: "symp_7", name: "Bilateral Lower Extremity Edema", category: "Cardiovascular" },
    { id: "symp_8", name: "Peripheral Numbness / Tingling", category: "Endocrine/Neurological" }
  ],
  sampleCases: [
    {
      id: "case_1",
      title: "James Harrison - Suspected Pneumonia",
      patient: { name: "James Harrison", age: 58, gender: "Male" },
      text: `Patient 58yo M presenting with acute fever 39.1C, productive rust-colored sputum, and sharp pleuritic right-sided chest pain for 4 days.
Vitals: BP 95/62, HR 112, RR 28, SpO2 89% room air.
Labs: WBC 18.4 x10^9/L, CRP 142 mg/L, Serum Creatinine 1.6 mg/dL.
Chest Exam: Bronchial breathing and dullness over right lower lobe.`,
      symptoms: ["Fever / Pyrexia", "Shortness of Breath (Dyspnea)", "Productive Cough / Sputum"]
    },
    {
      id: "case_2",
      title: "Robert Chen - Crushing Chest Pain",
      patient: { name: "Robert Chen", age: 63, gender: "Male" },
      text: `Patient 63yo M sudden onset substernal heavy pressure radiating to left arm and neck at rest. Diaphoretic, pale, dyspneic.
Vitals: BP 164/98, HR 98, SpO2 95%.
ECG: 2.5mm ST elevations in V2-V5.
Cardiac Troponin I: 1.84 ng/mL.`,
      symptoms: ["Retrosternal Chest Pressure", "Shortness of Breath (Dyspnea)"]
    },
    {
      id: "case_3",
      title: "Elena Rodriguez - Type 2 Diabetes Follow-up",
      patient: { name: "Elena Rodriguez", age: 44, gender: "Female" },
      text: `Endocrine follow-up for 44yo F with 6-year history of Type 2 DM.
Current Rx: Metformin 1000mg BID.
Complaints: Burning neuropathic paresthesias in bilateral feet.
Labs: HbA1c 8.9%, Fasting Glucose 178 mg/dL, Urine Microalbumin 45 mg/g, eGFR 72 mL/min.`,
      symptoms: ["Peripheral Numbness / Tingling"]
    }
  ],
  pricingTiers: [
    {
      id: "starter",
      name: "Starter Clinician",
      priceUSD: 0,
      period: "Forever Free",
      credits: 10,
      features: [
        "10 Clinical AI Analyses / mo",
        "Basic EHR Note Parsing",
        "Differential Diagnosis Engine",
        "Community Support"
      ]
    },
    {
      id: "pro",
      name: "Pro Clinician",
      priceUSD: 29.99,
      period: "per month",
      credits: 250,
      features: [
        "250 Clinical AI Analyses / mo",
        "Gemini Multimodal Diagnostics",
        "Instant Physician Emergency Email Alert",
        "Exportable PDF Radiology Reports",
        "Priority Model Latency (< 1s)"
      ]
    },
    {
      id: "clinic_enterprise",
      name: "Enterprise Clinic",
      priceUSD: 99.00,
      period: "per month",
      credits: 1500,
      features: [
        "1,500 Clinical AI Analyses / mo",
        "Full Clinical Business Tools & ROI Analytics",
        "Custom EHR API Webhook Integration",
        "Unlimited Staff Seats",
        "HIPAA-Compliant SLA & Dedicated Support"
      ]
    }
  ]
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: JSON.stringify({ message: 'OK' }) };
  }

  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      data: medicalReferenceData
    })
  };
};

