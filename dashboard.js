// dashboard.js - Clinical Dashboard, EHR Analysis & Medical History for MedNexus Agent AI

class DashboardManager {
  constructor() {
    this.sampleCases = [];
    this.symptomsList = [];
    this.init();
  }

  async init() {
    try {
      const dataRes = await window.api.getReferenceData();
      if (dataRes.success && dataRes.data) {
        this.sampleCases = dataRes.data.sampleCases || [];
        this.symptomsList = dataRes.data.symptoms || [];
        this.renderSampleCaseButtons();
        this.renderSymptomsChecklist();
      }
    } catch (e) {
      console.warn("Could not load initial reference data:", e);
    }

    this.loadHistory();
    this.initBusinessTools();
  }

  renderSampleCaseButtons() {
    const container = document.getElementById('sample-cases-container');
    if (!container) return;

    container.innerHTML = this.sampleCases.map(c => `
      <button type="button" class="btn btn-secondary btn-sm" onclick="window.dashboard.loadCase('${c.id}')">
        ${c.title}
      </button>
    `).join('');
  }

  loadCase(caseId) {
    const selected = this.sampleCases.find(c => c.id === caseId);
    if (!selected) return;

    document.getElementById('patient-name').value = selected.patient.name;
    document.getElementById('patient-age').value = selected.patient.age;
    document.getElementById('patient-gender').value = selected.patient.gender;
    document.getElementById('clinical-note').value = selected.text;

    // Check matching symptoms
    const checkboxes = document.querySelectorAll('input[name="symptom-item"]');
    checkboxes.forEach(cb => {
      cb.checked = selected.symptoms.includes(cb.value);
    });
  }

  renderSymptomsChecklist() {
    const container = document.getElementById('symptoms-checklist');
    if (!container) return;

    container.innerHTML = this.symptomsList.map(s => `
      <label class="form-checkbox-label" style="display: flex; align-items: center; justify-content: space-between; padding: 0.5rem 0.75rem; background: rgba(10, 15, 26, 0.6); border: 1px solid var(--border-color); border-radius: var(--radius-sm); margin-bottom: 0.4rem; font-size: 0.8rem; cursor: pointer;">
        <span>${s.name}</span>
        <input type="checkbox" name="symptom-item" value="${s.name}" style="accent-color: var(--accent-emerald);">
      </label>
    `).join('');
  }

  async runAnalysis() {
    const name = document.getElementById('patient-name').value.trim();
    const age = parseInt(document.getElementById('patient-age').value) || 45;
    const gender = document.getElementById('patient-gender').value;
    const note = document.getElementById('clinical-note').value.trim();

    const selectedSymptoms = [];
    document.querySelectorAll('input[name="symptom-item"]:checked').forEach(cb => {
      selectedSymptoms.push(cb.value);
    });

    if (!note && selectedSymptoms.length === 0) {
      alert("Please enter clinical notes or check presenting symptoms.");
      return;
    }

    const btn = document.getElementById('btn-analyze');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<span class="live-dot"></span> Clinical AI Agent Analyzing...`;

    try {
      const response = await window.api.analyze({
        patientName: name || 'Anonymous',
        patientAge: age,
        patientGender: gender,
        clinicalNote: note,
        symptoms: selectedSymptoms
      });

      if (response.success && response.record) {
        this.renderAnalysisResult(response.record);
        this.loadHistory(); // refresh history table
      }
    } catch (err) {
      alert(`Clinical Analysis Error: ${err.message}`);
    } finally {
      btn.disabled = false;
      btn.innerHTML = originalText;
    }
  }

  renderAnalysisResult(record) {
    const resultContainer = document.getElementById('analysis-result-container');
    if (!resultContainer) return;

    resultContainer.classList.remove('hidden');
    resultContainer.scrollIntoView({ behavior: 'smooth' });

    // Alert Banner
    const alertBox = document.getElementById('result-alert-box');
    if (alertBox) {
      if (record.alertDispatched || record.severity === 'CRITICAL' || record.severity === 'SEVERE') {
        alertBox.classList.remove('hidden');
        alertBox.innerHTML = `
          <div style="font-size: 1.25rem;">⚠️</div>
          <div>
            <strong>Automated Physician Emergency Alert Dispatched</strong>
            <p style="font-size: 0.75rem; margin-top: 0.2rem; opacity: 0.9;">
              Patient exhibits high acuity clinical markers (${record.severity}). On-call hospital physician triage notification triggered automatically.
            </p>
          </div>
        `;
      } else {
        alertBox.classList.add('hidden');
      }
    }

    // Primary Diagnosis & ICD-10
    document.getElementById('result-primary-diag').textContent = record.primaryDiagnosis;
    document.getElementById('result-severity-badge').textContent = `${record.severity} PRIORITY`;
    document.getElementById('result-severity-badge').className = `badge ${
      record.severity === 'CRITICAL' || record.severity === 'SEVERE' ? 'badge-critical' : 'badge-warning'
    }`;
    document.getElementById('result-confidence').textContent = `${record.confidence}% AI Confidence`;

    const icdContainer = document.getElementById('result-icd-tags');
    if (icdContainer) {
      icdContainer.innerHTML = (record.icd10 || []).map(code => `
        <span class="badge badge-cyan" style="font-family: var(--font-mono);">${code}</span>
      `).join('');
    }

    // Biomarkers Table
    const bioBody = document.getElementById('result-biomarkers-body');
    if (bioBody) {
      if (record.extractedBiomarkers && record.extractedBiomarkers.length > 0) {
        bioBody.innerHTML = record.extractedBiomarkers.map(b => `
          <tr>
            <td style="font-weight: 600;">${b.name}</td>
            <td style="font-family: var(--font-mono); font-weight: 700;">${b.value}</td>
            <td><span class="badge ${b.status.includes('Critical') ? 'badge-critical' : b.status.includes('High') ? 'badge-warning' : 'badge-success'}">${b.status}</span></td>
          </tr>
        `).join('');
      } else {
        bioBody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: var(--text-muted);">No abnormal laboratory values flagged.</td></tr>`;
      }
    }

    // Differentials
    const diffContainer = document.getElementById('result-differentials');
    if (diffContainer) {
      diffContainer.innerHTML = (record.differentialDiagnoses || []).map(d => `
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.5rem; background: rgba(0,0,0,0.3); border-radius: var(--radius-sm); margin-bottom: 0.4rem; font-size: 0.8rem;">
          <span>${d.condition}</span>
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <span style="font-family: var(--font-mono); font-weight: 700; color: var(--accent-emerald-light);">${d.probability}%</span>
            <span class="badge ${d.urgency === 'Emergency' ? 'badge-critical' : 'badge-warning'}">${d.urgency}</span>
          </div>
        </div>
      `).join('');
    }

    // Recommendations
    const recContainer = document.getElementById('result-recommendations');
    if (recContainer) {
      recContainer.innerHTML = (record.recommendations || []).map(r => `
        <li style="margin-bottom: 0.35rem;">${r}</li>
      `).join('');
    }
  }

  async loadHistory(search = '') {
    const historyBody = document.getElementById('history-table-body');
    if (!historyBody) return;

    try {
      const res = await window.api.getHistory(search);
      if (res.success && res.history) {
        if (res.history.length === 0) {
          historyBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">No historical records found.</td></tr>`;
          return;
        }

        historyBody.innerHTML = res.history.map(item => `
          <tr>
            <td style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--accent-cyan);">${item.id}</td>
            <td style="font-weight: 600;">${item.patientName} (${item.patientAge}yo)</td>
            <td style="color: var(--accent-emerald-light);">${item.primaryDiagnosis}</td>
            <td><span class="badge ${item.severity === 'CRITICAL' ? 'badge-critical' : 'badge-warning'}">${item.severity}</span></td>
            <td style="font-size: 0.75rem; color: var(--text-muted);">${new Date(item.date).toLocaleString()}</td>
            <td>
              <button class="btn btn-secondary btn-sm" onclick="alert('Viewing record ${item.id}')">View</button>
            </td>
          </tr>
        `).join('');
      }
    } catch (e) {
      console.warn("Failed to load history:", e);
    }
  }

  initBusinessTools() {
    const calcBtn = document.getElementById('btn-calc-roi');
    if (!calcBtn) return;

    calcBtn.addEventListener('click', async () => {
      const patients = parseInt(document.getElementById('calc-patients').value) || 500;
      const rate = parseInt(document.getElementById('calc-rate').value) || 120;
      const minutes = parseInt(document.getElementById('calc-minutes').value) || 25;

      try {
        const res = await window.api.calculateROI({
          monthlyPatients: patients,
          avgDoctorHourlyRate: rate,
          avgMinutesPerReport: minutes
        });

        if (res.success && res.metrics) {
          const m = res.metrics;
          document.getElementById('roi-hours-saved').textContent = `${m.totalHoursSaved} hrs/mo`;
          document.getElementById('roi-monthly-savings').textContent = `$${m.estimatedMonthlySavings.toLocaleString()}`;
          document.getElementById('roi-annual-savings').textContent = `$${m.annualProjectedSavings.toLocaleString()}`;
          document.getElementById('roi-throughput').textContent = `+${m.throughputIncreasePercent}% Capacity`;
        }
      } catch (err) {
        alert("ROI calculation failed: " + err.message);
      }
    });
  }
}

window.dashboard = new DashboardManager();

