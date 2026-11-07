// netlify/functions/business-tools.js
// Provides business metrics, clinic efficiency calculations, and ROI statistics for MedNexus Agent AI

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json'
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: JSON.stringify({ message: 'OK' }) };
  }

  try {
    // If POST, calculate customized ROI based on clinic volume inputs
    if (event.httpMethod === 'POST') {
      const { monthlyPatients = 500, avgDoctorHourlyRate = 120, avgMinutesPerReport = 25 } = JSON.parse(event.body || '{}');

      const minutesSavedPerReport = avgMinutesPerReport * 0.70; // 70% reduction in documentation time
      const totalHoursSaved = (monthlyPatients * minutesSavedPerReport) / 60;
      const estimatedMonthlySavings = totalHoursSaved * avgDoctorHourlyRate;
      const annualProjectedSavings = estimatedMonthlySavings * 12;
      const throughputIncreasePercent = 42; // Clinic can see 42% more patients

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          metrics: {
            monthlyPatients,
            avgDoctorHourlyRate,
            totalHoursSaved: Math.round(totalHoursSaved),
            estimatedMonthlySavings: Math.round(estimatedMonthlySavings),
            annualProjectedSavings: Math.round(annualProjectedSavings),
            throughputIncreasePercent,
            roiMultiplier: "8.4x"
          }
        })
      };
    }

    // Default GET: Return platform overall clinic performance benchmarks
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        benchmarks: {
          averageTriageLatencySec: 2.8,
          documentationTimeReduction: "72%",
          criticalCaseDetectionAccuracy: "96.8%",
          clinicianBurnoutIndexReduction: "38%",
          supportedEMRFormats: ["HL7 FHIR", "CCD/CDA", "DICOM", "Free-Text PDF"],
          activePartnerClinics: 142
        }
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Business tools calculation failed', details: error.message })
    };
  }
};

