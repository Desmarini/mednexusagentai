import { api } from './api.js';

const byId = id => document.getElementById(id);
const fmt = n => new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Number(n)||0);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const today = () => new Date().toISOString().slice(0,10);

async function save(type, payload) {
  try { await api.saveBusinessItem(type,payload); await loadLists(); return true; }
  catch (e) { alert(e.message || 'Could not save. Please sign in and try again.'); return false; }
}
async function remove(type,id) {
  if (!confirm('Delete this record?')) return;
  try { await api.deleteBusinessItem(type,id); await loadLists(); }
  catch (e) { alert(e.message || 'Could not delete record.'); }
}
function listMarkup(items,type,render) {
  if (!items?.length) return '<p class="card-subtitle tool-empty">No records yet.</p>';
  return `<div class="tool-records">${items.map(x=>`<div class="tool-record">${render(x)}<button type="button" class="btn btn-outline btn-sm" data-delete-type="${type}" data-delete-id="${esc(x.id)}">Delete</button></div>`).join('')}</div>`;
}
async function loadLists() {
  for (const type of ['services','scenarios','alerts']) {
    const target = byId(({services:'service-list',scenarios:'scenario-list',alerts:'alert-list'})[type]);
    if (!target) continue;
    try {
      const {items=[]} = await api.getBusinessItems(type);
      if (type==='services') target.innerHTML=listMarkup(items,type,x=>`<div><strong>${esc(x.device)} — ${esc(x.customer)}</strong><p>${esc(x.serviceType||'Service')} · Due: ${esc(x.dueDate)} · Warranty: ${esc(x.warrantyUntil||'Not recorded')}</p><p>${esc(x.notes||'')}</p><span class="tool-status ${x.dueDate < today()?'overdue':''}">${x.dueDate < today()?'Overdue':x.dueDate===today()?'Due today':'Scheduled'}</span></div>`);
      if (type==='scenarios') target.innerHTML=listMarkup(items,type,x=>`<div><strong>${esc(x.name)}</strong><p>Revenue: ${fmt(x.projectedRevenue)} · Estimated profit after discount and costs: ${fmt(x.projectedProfit)}</p><p>Revenue change ${x.revenueChangePct}% · Cost change ${x.costChangePct}%</p></div>`);
      if (type==='alerts') target.innerHTML=listMarkup(items,type,x=>`<div><strong>${esc(x.title)}</strong><p>${esc(x.metric)} ${x.operator==='below'?'below':'above'} ${x.threshold}; current value ${x.currentValue}</p><span class="tool-status ${x.triggered?'overdue':'scheduled'}">${x.triggered?'Triggered':'Not triggered'}</span></div>`);
    } catch(e) {
      target.innerHTML='<p class="card-subtitle">Sign in to load your private records. If already signed in, check Netlify Functions and storage configuration.</p>';
    }
  }
}
function calcPricing() {
  const cost=Number(byId('price-cost').value)||0, price=Number(byId('price-sale').value)||0;
  const discount=Math.min(100,Math.max(0,Number(byId('price-discount').value)||0));
  const units=Math.max(0,Number(byId('price-units').value)||0);
  const net=price*(1-discount/100), profit=(net-cost)*units, margin=net>0?((net-cost)/net*100):0;
  byId('price-result').innerHTML=`<div class="tool-metrics"><div><span>Net unit price</span><strong>${fmt(net)}</strong></div><div><span>Total gross profit estimate</span><strong>${fmt(profit)}</strong></div><div><span>Gross margin</span><strong>${margin.toFixed(2)}%</strong></div></div><p class="card-subtitle">Estimate excludes taxes, overhead, financing, and other costs unless included in unit cost.</p>`;
}
function calcScenarioPreview() {
  const rev=Math.max(0,Number(byId('scenario-revenue').value)||0), revChange=Number(byId('scenario-revenue-change').value)||0;
  const cost=Math.max(0,Number(byId('scenario-cost').value)||0), costChange=Number(byId('scenario-cost-change').value)||0;
  const disc=Math.min(100,Math.max(0,Number(byId('scenario-discount').value)||0));
  const projectedRevenue=rev*(1+revChange/100), projectedCost=cost*(1+costChange/100), profit=projectedRevenue*(1-disc/100)-projectedCost;
  byId('scenario-result').innerHTML=`<div class="tool-metrics"><div><span>Projected revenue</span><strong>${fmt(projectedRevenue)}</strong></div><div><span>Projected cost</span><strong>${fmt(projectedCost)}</strong></div><div><span>Estimated profit</span><strong>${fmt(profit)}</strong></div></div>`;
  return {baseRevenue:rev,revenueChangePct:revChange,baseCost:cost,costChangePct:costChange,baseDiscountPct:disc};
}
export function initBusinessTools() {
  if (!byId('section-business-tools') || byId('section-business-tools').dataset.initialized) return;
  byId('section-business-tools').dataset.initialized='true';
  byId('form-service').addEventListener('submit',async e=>{e.preventDefault(); if(await save('services',{customer:byId('service-customer').value,device:byId('service-device').value,serial:byId('service-serial').value,serviceType:byId('service-type').value,dueDate:byId('service-due').value,warrantyUntil:byId('service-warranty').value,notes:byId('service-notes').value})){e.target.reset();}});
  byId('form-alert').addEventListener('submit',async e=>{e.preventDefault(); if(await save('alerts',{title:byId('alert-title').value,metric:byId('alert-metric').value,operator:byId('alert-operator').value,threshold:byId('alert-threshold').value,currentValue:byId('alert-current').value})){e.target.reset();}});
  byId('form-scenario').addEventListener('submit',async e=>{e.preventDefault(); const values=calcScenarioPreview(); const ok=await save('scenarios',{...values,name:byId('scenario-name').value}); if(ok) calcScenarioPreview();});
  ['price-cost','price-sale','price-discount','price-units'].forEach(id=>byId(id).addEventListener('input',calcPricing));
  ['scenario-revenue','scenario-revenue-change','scenario-cost','scenario-cost-change','scenario-discount'].forEach(id=>byId(id).addEventListener('input',calcScenarioPreview));
  document.addEventListener('click',e=>{const b=e.target.closest('[data-delete-type]'); if(b) remove(b.dataset.deleteType,b.dataset.deleteId);});
  calcPricing(); calcScenarioPreview();
  loadLists();
}
