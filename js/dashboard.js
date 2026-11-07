// ==============================================================================
// MedNexus AI — Dashboard & Analytics Controller
// ==============================================================================

import { api } from './api.js';

let monthlyChartInstance = null;
let categoryChartInstance = null;
let productChartInstance = null;
let satisfactionChartInstance = null;

let customDatasetRecords = null;

export async function loadDatasetView() {
  await loadDashboard();
  setupDatasetUploadListeners();
}

export function getActiveDatasetRecords() {
  return customDatasetRecords;
}

export async function loadDashboard() {
  try {
    let records;
    let summary;

    if (customDatasetRecords && customDatasetRecords.length > 0) {
      records = customDatasetRecords;
      summary = computeClientMetrics(records);
    } else {
      const data = await api.getDataset();
      summary = data.summary;
      records = data.records;
    }

    // Render KPI numbers
    renderKPIs(summary);

    // Render Charts
    renderCharts(summary);

    // Render Data Table
    renderTable(records);
  } catch (err) {
    console.error('Failed to load dashboard data:', err);
  }
}

function computeClientMetrics(records) {
  let totalRevenue = 0;
  let totalUnits = 0;
  let scoreSum = 0;
  const prodMap = {};
  const catMap = {};
  const monthlyAgg = {};
  const categoryAgg = {};

  records.forEach(r => {
    const rev = Number(r.revenue || (r.units * r.unitPrice) || 0);
    const units = Number(r.units || 0);
    const score = Number(r.satisfactionScore || 4.5);
    const prod = r.product || 'Unknown Product';
    const cat = r.category || 'General';
    const month = r.month || 'Q1';

    totalRevenue += rev;
    totalUnits += units;
    scoreSum += score;

    prodMap[prod] = (prodMap[prod] || 0) + rev;
    catMap[cat] = (catMap[cat] || 0) + rev;

    if (!monthlyAgg[month]) monthlyAgg[month] = { revenue: 0, units: 0 };
    monthlyAgg[month].revenue += rev;
    monthlyAgg[month].units += units;

    if (!categoryAgg[cat]) categoryAgg[cat] = { revenue: 0, units: 0 };
    categoryAgg[cat].revenue += rev;
    categoryAgg[cat].units += units;
  });

  const bestSellingProduct = Object.entries(prodMap).sort((a,b) => b[1] - a[1])[0]?.[0] || 'N/A';
  const bestCategory = Object.entries(catMap).sort((a,b) => b[1] - a[1])[0]?.[0] || 'N/A';
  const avgSatisfaction = records.length ? Number((scoreSum / records.length).toFixed(2)) : 0;

  return {
    totalRevenue,
    totalUnits,
    bestSellingProduct,
    bestCategory,
    avgSatisfaction,
    monthlyAgg,
    categoryAgg,
    productBreakdown: prodMap,
    satisfactionByProduct: {}
  };
}

let uploadListenersInitialized = false;
function setupDatasetUploadListeners() {
  if (uploadListenersInitialized) return;
  uploadListenersInitialized = true;

  const fileInput = document.getElementById('dataset-file-input');
  const statusEl = document.getElementById('dataset-upload-status');
  const exportBtn = document.getElementById('btn-export-dataset');

  if (exportBtn) {
    exportBtn.addEventListener('click', async () => {
      let recordsToExport = customDatasetRecords;
      if (!recordsToExport) {
        const d = await api.getDataset();
        recordsToExport = d.records;
      }
      const blob = new Blob([JSON.stringify(recordsToExport, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mednexus_dataset_${new Date().toISOString().slice(0,10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const content = event.target.result;
          let parsedRecords = [];

          if (file.name.endsWith('.json')) {
            const json = JSON.parse(content);
            parsedRecords = Array.isArray(json) ? json : (json.records || []);
          } else if (file.name.endsWith('.csv')) {
            parsedRecords = parseCsvToRecords(content);
          } else {
            throw new Error('Unsupported format. Please upload a .csv or .json file.');
          }

          if (!parsedRecords.length) {
            throw new Error('No valid records found in the uploaded file.');
          }

          customDatasetRecords = parsedRecords;
          if (statusEl) {
            statusEl.className = 'alert alert-success';
            statusEl.textContent = `✓ Successfully loaded ${parsedRecords.length} records from ${file.name}. Dashboard and charts updated!`;
            statusEl.style.display = 'block';
          }

          await loadDashboard();
        } catch (err) {
          if (statusEl) {
            statusEl.className = 'alert alert-danger';
            statusEl.textContent = `Upload error: ${err.message}`;
            statusEl.style.display = 'block';
          }
        }
      };
      reader.readAsText(file);
    });
  }
}

function parseCsvToRecords(csvText) {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const records = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
    if (cols.length === headers.length) {
      const rec = {};
      headers.forEach((h, idx) => {
        rec[h] = cols[idx];
      });
      // Normalize types
      rec.id = rec.id || rec.TransactionID || `TX-${i}`;
      rec.month = rec.month || rec.Month || 'Custom';
      rec.category = rec.category || rec.Category || 'General';
      rec.product = rec.product || rec.ProductName || rec.Product || 'Product';
      rec.region = rec.region || rec.Region || 'Global';
      rec.units = Number(rec.units || rec.Units || 1);
      rec.unitPrice = Number(rec.unitPrice || rec.UnitPrice || 0);
      rec.revenue = Number(rec.revenue || rec.Revenue || (rec.units * rec.unitPrice));
      rec.satisfactionScore = Number(rec.satisfactionScore || rec.Satisfaction || 4.5);
      records.push(rec);
    }
  }

  return records;
}

function renderKPIs(summary) {
  const elRevenue = document.getElementById('kpi-revenue');
  const elUnits = document.getElementById('kpi-units');
  const elBestProd = document.getElementById('kpi-best-product');
  const elBestCat = document.getElementById('kpi-best-category');
  const elSatisfaction = document.getElementById('kpi-satisfaction');

  if (elRevenue) elRevenue.textContent = `$${summary.totalRevenue.toLocaleString()}`;
  if (elUnits) elUnits.textContent = summary.totalUnits.toLocaleString();
  if (elBestProd) elBestProd.textContent = summary.bestSellingProduct;
  if (elBestCat) elBestCat.textContent = summary.bestCategory;
  if (elSatisfaction) elSatisfaction.textContent = `${summary.avgSatisfaction} / 5.0`;
}

function renderCharts(summary) {
  if (typeof Chart === 'undefined') {
    console.warn('Chart.js not loaded yet');
    return;
  }

  // 1. Monthly Revenue Trend (Line / Area)
  const ctxMonthly = document.getElementById('chart-monthly')?.getContext('2d');
  if (ctxMonthly) {
    if (monthlyChartInstance) monthlyChartInstance.destroy();
    const labels = Object.keys(summary.monthlyAgg).sort();
    const revData = labels.map(m => summary.monthlyAgg[m].revenue);
    const unitData = labels.map(m => summary.monthlyAgg[m].units);

    monthlyChartInstance = new Chart(ctxMonthly, {
      type: 'line',
      data: {
        labels: labels.map(m => {
          const parts = m.split('-');
          const d = new Date(parts[0], parts[1] - 1);
          return d.toLocaleString('default', { month: 'short', year: 'numeric' });
        }),
        datasets: [
          {
            label: 'Synthetic Revenue ($)',
            data: revData,
            borderColor: '#0284c7',
            backgroundColor: 'rgba(2, 132, 199, 0.12)',
            fill: true,
            tension: 0.35,
            borderWidth: 3,
            pointBackgroundColor: '#0284c7',
            pointRadius: 4,
            yAxisID: 'y'
          },
          {
            label: 'Units Sold',
            data: unitData,
            borderColor: '#06b6d4',
            backgroundColor: 'transparent',
            borderDash: [5, 5],
            tension: 0.35,
            borderWidth: 2,
            pointRadius: 3,
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { boxWidth: 12, font: { weight: 600 } } }
        },
        scales: {
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            ticks: {
              callback: val => `$${val / 1000}k`
            }
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            grid: { drawOnChartArea: false }
          }
        }
      }
    });
  }

  // 2. Sales by Category (Doughnut)
  const ctxCategory = document.getElementById('chart-category')?.getContext('2d');
  if (ctxCategory) {
    if (categoryChartInstance) categoryChartInstance.destroy();
    const catLabels = Object.keys(summary.categoryAgg);
    const catRev = catLabels.map(c => summary.categoryAgg[c].revenue);

    categoryChartInstance = new Chart(ctxCategory, {
      type: 'doughnut',
      data: {
        labels: catLabels,
        datasets: [{
          data: catRev,
          backgroundColor: [
            '#0284c7',
            '#06b6d4',
            '#3b82f6',
            '#10b981',
            '#6366f1'
          ],
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'right', labels: { boxWidth: 12 } },
          tooltip: {
            callbacks: {
              label: (context) => ` ${context.label}: $${context.raw.toLocaleString()}`
            }
          }
        },
        cutout: '68%'
      }
    });
  }

  // 3. Best-Selling Products by Revenue (Bar)
  const ctxProduct = document.getElementById('chart-products')?.getContext('2d');
  if (ctxProduct) {
    if (productChartInstance) productChartInstance.destroy();
    const prodEntries = Object.entries(summary.productAgg).sort((a,b) => b[1].revenue - a[1].revenue);
    const prodNames = prodEntries.map(e => e[0].split(' ')[0] + ' ' + (e[0].split(' ')[1] || ''));
    const prodRevs = prodEntries.map(e => e[1].revenue);

    productChartInstance = new Chart(ctxProduct, {
      type: 'bar',
      data: {
        labels: prodNames,
        datasets: [{
          label: 'Revenue ($)',
          data: prodRevs,
          backgroundColor: '#1e3e62',
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            ticks: {
              callback: val => `$${val / 1000}k`
            }
          }
        }
      }
    });
  }

  // 4. Customer Satisfaction Distribution (Radar/Polar)
  const ctxSat = document.getElementById('chart-satisfaction')?.getContext('2d');
  if (ctxSat) {
    if (satisfactionChartInstance) satisfactionChartInstance.destroy();
    const prodEntries = Object.entries(summary.productAgg);
    const prodNames = prodEntries.map(e => e[0].split(' ')[0]);
    const prodScores = prodEntries.map(e => Number((e[1].scoreSum / e[1].count).toFixed(2)));

    satisfactionChartInstance = new Chart(ctxSat, {
      type: 'bar',
      data: {
        labels: prodNames,
        datasets: [{
          label: 'Average Score (out of 5.0)',
          data: prodScores,
          backgroundColor: '#0ea5e9',
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            min: 3.5,
            max: 5.0,
            ticks: { stepSize: 0.5 }
          }
        },
        plugins: {
          legend: { display: false }
        }
      }
    });
  }
}

function renderTable(records) {
  const tbody = document.getElementById('dataset-table-body');
  if (!tbody) return;

  tbody.innerHTML = records.map(r => `
    <tr>
      <td><strong>${r.id}</strong></td>
      <td>${r.month}</td>
      <td><span class="badge-demo" style="background:#e0f2fe;color:#0369a1;font-weight:600;">${r.category}</span></td>
      <td>${r.product}</td>
      <td>${r.region}</td>
      <td>${r.units}</td>
      <td>$${r.unitPrice.toLocaleString()}</td>
      <td><strong>$${r.revenue.toLocaleString()}</strong></td>
      <td><span style="color:#059669;font-weight:700;">★ ${r.satisfactionScore}</span></td>
    </tr>
  `).join('');
}
