// ============================================================
// KhangHang1 Trading Journal — Main App
// ============================================================

// --- STATE ---
let allTrades = [];
let filteredTrades = [];
let charts = {};
let currentPage = 'overview';
let calendarDate = new Date();

// --- CONFIG ---
const CONFIG = {
  vonBanDau: 200000000,
  diemToVND: 100000,
  phiPS: 7700,
  phiCP: 0.0015,
  thueBanCP: 0.001
};

// --- INIT ---
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('dateDisplay').textContent = new Date().toLocaleDateString('vi-VN',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
  loadDemoData();
});

// --- NAVIGATION ---
function navigateTo(page) {
  currentPage = page;
  document.querySelectorAll('.page-section').forEach(s => s.style.display = 'none');
  const el = document.getElementById('page-' + page);
  if (el) el.style.display = 'block';
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const navEl = document.querySelector(`.nav-item[data-page="${page}"]`);
  if (navEl) navEl.classList.add('active');
  if (page === 'calendar') renderCalendar();
  if (page === 'charts') renderAnalysisCharts();
  if (page === 'journal') renderFullTable();
}

// --- DEMO DATA ---
function loadDemoData() {
  const strategies = ['Breakout','MA Cross','Scalping','Support/Resistance','Trend Following'];
  const tickers_ps = ['VN30F2506','VN30F2507'];
  const tickers_cp = ['HPG','FPT','VNM','MWG','TCB','VCB','MBB','SSI'];
  const sessions = ['Sáng','Chiều','ATO','ATC'];
  const moods = ['😌 Bình tĩnh','🔥 Tự tin','😰 Lo lắng','🎯 Kỷ luật','🤑 Tham lam'];
  const trades = [];
  let balance = CONFIG.vonBanDau;
  const startDate = new Date(2025, 10, 3);

  for (let i = 0; i < 80; i++) {
    const isPS = Math.random() > 0.4;
    const date = new Date(startDate.getTime() + i * (12 + Math.random()*36) * 3600000);
    const closeDate = new Date(date.getTime() + (0.5 + Math.random()*5) * 3600000);
    const strategy = strategies[Math.floor(Math.random()*strategies.length)];
    const position = isPS ? (Math.random()>0.5?'Long':'Short') : (Math.random()>0.5?'Mua':'Bán');
    const session = sessions[Math.floor(Math.random()*sessions.length)];
    const mood = moods[Math.floor(Math.random()*moods.length)];
    const ticker = isPS ? tickers_ps[Math.floor(Math.random()*tickers_ps.length)] : tickers_cp[Math.floor(Math.random()*tickers_cp.length)];

    let entryPrice, sl, tp, exitPrice, volume, grossPnl, fee, tax, netPnl, points;

    if (isPS) {
      entryPrice = 1250 + Math.round(Math.random()*100);
      const slDist = 5 + Math.round(Math.random()*10);
      const tpDist = 5 + Math.round(Math.random()*20);
      sl = position === 'Long' ? entryPrice - slDist : entryPrice + slDist;
      tp = position === 'Long' ? entryPrice + tpDist : entryPrice - tpDist;
      volume = 1 + Math.floor(Math.random()*3);
      const outcomes = [-slDist, -Math.round(slDist*0.5), 0, Math.round(tpDist*0.5), tpDist, tpDist+5];
      points = outcomes[Math.floor(Math.random()*outcomes.length)] * (Math.random()>0.45?1:-1);
      exitPrice = position === 'Long' ? entryPrice + points : entryPrice - points;
      grossPnl = points * volume * CONFIG.diemToVND;
      fee = volume * CONFIG.phiPS * 2;
      tax = 0;
    } else {
      entryPrice = 20 + Math.round(Math.random()*60*10)/10;
      const slPct = 0.03 + Math.random()*0.05;
      const tpPct = 0.03 + Math.random()*0.08;
      sl = Math.round((entryPrice*(1-slPct))*10)/10;
      tp = Math.round((entryPrice*(1+tpPct))*10)/10;
      volume = (1+Math.floor(Math.random()*10))*100;
      const pctChange = (Math.random()-0.45)*0.1;
      exitPrice = Math.round((entryPrice*(1+pctChange))*10)/10;
      points = exitPrice - entryPrice;
      grossPnl = points * volume * 1000;
      fee = (entryPrice*volume*1000*CONFIG.phiCP) + (exitPrice*volume*1000*CONFIG.phiCP);
      tax = exitPrice * volume * 1000 * CONFIG.thueBanCP;
    }

    netPnl = grossPnl - fee - tax;
    balance += netPnl;
    const status = netPnl > 50000 ? '✅ Win' : netPnl < -50000 ? '❌ Lose' : '➖ Hòa';
    const rr = Math.abs(points / (isPS?(entryPrice-sl):(entryPrice-sl)));

    trades.push({
      stt: i+1, trang_thai: status, loai_tai_san: isPS?'Phái sinh':'Cổ phiếu',
      ma_gd: ticker, chien_luoc: strategy, vi_the: position, phien: session,
      ngay_gio_vao: date, thu: date.toLocaleDateString('vi-VN',{weekday:'long'}),
      ngay_gio_dong: closeDate,
      thoi_gian_gd: Math.round((closeDate-date)/60000)+'m',
      so_du: balance - netPnl, khoi_luong: volume,
      gia_vao: entryPrice, cat_lo: sl, chot_loi: tp, gia_dong: exitPrice,
      diem_thuc_te: isPS ? points : points, rr_ky_vong: Math.round(rr*100)/100,
      lai_lo_gop: Math.round(grossPnl), phi_gd: Math.round(fee), thue: Math.round(tax),
      lai_lo_rong: Math.round(netPnl), so_du_da_dong: Math.round(balance),
      tam_ly: mood, ghi_chu: ''
    });
  }

  allTrades = trades;
  applyFilters();
  hideLoading();
}

// --- FILTERS ---
function applyFilters() {
  filteredTrades = [...allTrades];
  const period = document.getElementById('filterPeriod').value;
  const asset = document.getElementById('filterAsset').value;
  const strategy = document.getElementById('filterStrategy').value;
  const status = document.getElementById('filterStatus').value;

  if (asset !== 'all') {
    const label = asset === 'phai_sinh' ? 'Phái sinh' : 'Cổ phiếu';
    filteredTrades = filteredTrades.filter(t => t.loai_tai_san === label);
  }
  if (strategy !== 'all') filteredTrades = filteredTrades.filter(t => t.chien_luoc === strategy);
  if (status !== 'all') filteredTrades = filteredTrades.filter(t => t.trang_thai.includes(status));
  if (period !== 'all') {
    const now = new Date();
    let cutoff = new Date(now);
    if (period==='today') cutoff.setHours(0,0,0,0);
    else if (period==='week') cutoff.setDate(now.getDate()-7);
    else if (period==='month') cutoff.setMonth(now.getMonth()-1);
    else if (period==='quarter') cutoff.setMonth(now.getMonth()-3);
    else if (period==='year') cutoff.setFullYear(now.getFullYear()-1);
    filteredTrades = filteredTrades.filter(t => t.ngay_gio_vao >= cutoff);
  }

  populateStrategyFilter();
  updateKPIs();
  renderOverviewCharts();
  renderTradeTable();
}

function populateStrategyFilter() {
  const sel = document.getElementById('filterStrategy');
  const current = sel.value;
  const strategies = [...new Set(allTrades.map(t=>t.chien_luoc))].sort();
  sel.innerHTML = '<option value="all">Tất cả</option>' + strategies.map(s=>`<option value="${s}">${s}</option>`).join('');
  sel.value = current;
}

// --- KPI ---
function updateKPIs() {
  const t = filteredTrades;
  const total = t.length;
  const wins = t.filter(x=>x.trang_thai.includes('Win')).length;
  const loses = t.filter(x=>x.trang_thai.includes('Lose')).length;
  const draws = t.filter(x=>x.trang_thai.includes('Hòa')).length;
  const opens = t.filter(x=>x.trang_thai.includes('Đang mở')).length;
  const winRate = total>0 ? (wins/total*100) : 0;
  const netPnl = t.reduce((s,x)=>s+x.lai_lo_rong,0);
  const balance = total>0 ? t[t.length-1].so_du_da_dong : CONFIG.vonBanDau;
  const winPnl = t.filter(x=>x.trang_thai.includes('Win')).reduce((s,x)=>s+x.lai_lo_rong,0);
  const losePnl = t.filter(x=>x.trang_thai.includes('Lose')).reduce((s,x)=>s+x.lai_lo_rong,0);
  const pf = losePnl!==0 ? Math.abs(winPnl/losePnl) : 0;
  const avgRR = total>0 ? t.reduce((s,x)=>s+x.rr_ky_vong,0)/total : 0;
  const avgWin = wins>0 ? winPnl/wins : 0;
  const avgLose = loses>0 ? losePnl/loses : 0;
  const expectancy = total>0 ? (wins/total*avgWin)+(loses/total*avgLose) : 0;

  let maxDD = 0, peak = CONFIG.vonBanDau;
  t.forEach(x => { if(x.so_du_da_dong>peak) peak=x.so_du_da_dong; const dd=(x.so_du_da_dong-peak)/peak; if(dd<maxDD) maxDD=dd; });

  setText('kpiTotalTrades', total);
  setText('kpiWinRate', winRate.toFixed(1)+'%');
  setText('kpiNetPnl', formatVND(netPnl));
  setText('kpiBalance', formatVND(balance));
  setText('kpiMaxDD', (maxDD*100).toFixed(2)+'%');
  setText('kpiProfitFactor', pf.toFixed(2));
  setText('kpiAvgRRR', avgRR.toFixed(2));
  setText('kpiExpectancy', formatVND(Math.round(expectancy)));

  const pnlCard = document.getElementById('kpiPnlCard');
  pnlCard.className = 'kpi-card ' + (netPnl>=0?'profit':'loss');

  setText('statWinCount', wins);
  setText('statLoseCount', loses);
  setText('statDrawCount', draws);
  setText('statOpenCount', opens);
  setText('tradeCount', total+' lệnh');
}

// --- CHARTS ---
function renderOverviewCharts() {
  renderEquityChart();
  renderWinLoseChart();
  renderDailyPnlChart();
}

function renderEquityChart() {
  if(charts.equity) charts.equity.destroy();
  const ctx = document.getElementById('equityChart');
  if(!ctx) return;
  const labels = filteredTrades.map(t=>t.ngay_gio_vao.toLocaleDateString('vi-VN'));
  const data = filteredTrades.map(t=>t.so_du_da_dong);
  data.unshift(CONFIG.vonBanDau);
  labels.unshift('Bắt đầu');

  charts.equity = new Chart(ctx, {
    type:'line',
    data:{labels, datasets:[{label:'Số dư',data,borderColor:'#3b82f6',backgroundColor:'rgba(59,130,246,0.08)',fill:true,tension:0.3,pointRadius:1,borderWidth:2}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{display:true,ticks:{color:'#4b5563',maxTicksLimit:8,font:{size:10}},grid:{color:'rgba(255,255,255,0.03)'}},y:{ticks:{color:'#4b5563',callback:v=>formatVNDShort(v),font:{size:10}},grid:{color:'rgba(255,255,255,0.03)'}}}}
  });
}

function renderWinLoseChart() {
  if(charts.winLose) charts.winLose.destroy();
  const ctx = document.getElementById('winLoseChart');
  if(!ctx) return;
  const w=filteredTrades.filter(x=>x.trang_thai.includes('Win')).length;
  const l=filteredTrades.filter(x=>x.trang_thai.includes('Lose')).length;
  const d=filteredTrades.filter(x=>x.trang_thai.includes('Hòa')).length;

  charts.winLose = new Chart(ctx, {
    type:'doughnut',
    data:{labels:['Thắng','Thua','Hòa'],datasets:[{data:[w,l,d],backgroundColor:['#10b981','#ef4444','#f59e0b'],borderWidth:0,hoverOffset:6}]},
    options:{responsive:true,maintainAspectRatio:false,cutout:'70%',plugins:{legend:{position:'bottom',labels:{color:'#9ca3af',padding:12,font:{size:11}}}}}
  });
}

function renderDailyPnlChart() {
  if(charts.dailyPnl) charts.dailyPnl.destroy();
  const ctx = document.getElementById('dailyPnlChart');
  if(!ctx) return;
  const byDay = {};
  filteredTrades.forEach(t => { const k=t.ngay_gio_vao.toLocaleDateString('vi-VN'); byDay[k]=(byDay[k]||0)+t.lai_lo_rong; });
  const labels = Object.keys(byDay);
  const data = Object.values(byDay);

  charts.dailyPnl = new Chart(ctx, {
    type:'bar',
    data:{labels,datasets:[{label:'P/L',data,backgroundColor:data.map(v=>v>=0?'rgba(16,185,129,0.7)':'rgba(239,68,68,0.7)'),borderRadius:4,borderSkipped:false}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{ticks:{color:'#4b5563',maxTicksLimit:12,font:{size:10}},grid:{display:false}},y:{ticks:{color:'#4b5563',callback:v=>formatVNDShort(v),font:{size:10}},grid:{color:'rgba(255,255,255,0.03)'}}}}
  });
}

// --- ANALYSIS CHARTS ---
function renderAnalysisCharts() {
  renderStrategyChart();
  renderWeekdayChart();
  renderAssetChart();
  renderSessionChart();
}

function renderStrategyChart() {
  if(charts.strategy) charts.strategy.destroy();
  const ctx = document.getElementById('strategyChart');
  if(!ctx) return;
  const byStrat = {};
  filteredTrades.forEach(t => { byStrat[t.chien_luoc]=(byStrat[t.chien_luoc]||0)+t.lai_lo_rong; });
  const labels = Object.keys(byStrat);
  const data = Object.values(byStrat);
  charts.strategy = new Chart(ctx, {type:'bar',data:{labels,datasets:[{label:'P/L',data,backgroundColor:data.map(v=>v>=0?'#10b981':'#ef4444'),borderRadius:6}]},options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{ticks:{color:'#4b5563',callback:v=>formatVNDShort(v)},grid:{color:'rgba(255,255,255,0.03)'}},y:{ticks:{color:'#9ca3af'},grid:{display:false}}}}});
}

function renderWeekdayChart() {
  if(charts.weekday) charts.weekday.destroy();
  const ctx = document.getElementById('weekdayChart');
  if(!ctx) return;
  const days = ['Thứ Hai','Thứ Ba','Thứ Tư','Thứ Năm','Thứ Sáu'];
  const byDay = {};
  days.forEach(d=>byDay[d]=0);
  filteredTrades.forEach(t => { const d=t.ngay_gio_vao.getDay(); const name=days[d-1]; if(name) byDay[name]+=t.lai_lo_rong; });
  charts.weekday = new Chart(ctx, {type:'bar',data:{labels:days,datasets:[{label:'P/L',data:days.map(d=>byDay[d]),backgroundColor:days.map(d=>byDay[d]>=0?'rgba(16,185,129,0.7)':'rgba(239,68,68,0.7)'),borderRadius:6}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{ticks:{color:'#9ca3af'},grid:{display:false}},y:{ticks:{color:'#4b5563',callback:v=>formatVNDShort(v)},grid:{color:'rgba(255,255,255,0.03)'}}}}});
}

function renderAssetChart() {
  if(charts.asset) charts.asset.destroy();
  const ctx = document.getElementById('assetChart');
  if(!ctx) return;
  const ps = filteredTrades.filter(t=>t.loai_tai_san==='Phái sinh').reduce((s,t)=>s+t.lai_lo_rong,0);
  const cp = filteredTrades.filter(t=>t.loai_tai_san==='Cổ phiếu').reduce((s,t)=>s+t.lai_lo_rong,0);
  charts.asset = new Chart(ctx, {type:'doughnut',data:{labels:['Phái sinh','Cổ phiếu'],datasets:[{data:[ps,cp],backgroundColor:['#3b82f6','#8b5cf6'],borderWidth:0}]},options:{responsive:true,maintainAspectRatio:false,cutout:'65%',plugins:{legend:{position:'bottom',labels:{color:'#9ca3af'}}}}});
}

function renderSessionChart() {
  if(charts.session) charts.session.destroy();
  const ctx = document.getElementById('sessionChart');
  if(!ctx) return;
  const bySes = {};
  filteredTrades.forEach(t => { bySes[t.phien]=(bySes[t.phien]||0)+t.lai_lo_rong; });
  const labels = Object.keys(bySes);
  const data = Object.values(bySes);
  charts.session = new Chart(ctx, {type:'bar',data:{labels,datasets:[{label:'P/L',data,backgroundColor:data.map(v=>v>=0?'rgba(16,185,129,0.7)':'rgba(239,68,68,0.7)'),borderRadius:6}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{ticks:{color:'#9ca3af'},grid:{display:false}},y:{ticks:{color:'#4b5563',callback:v=>formatVNDShort(v)},grid:{color:'rgba(255,255,255,0.03)'}}}}});
}

// --- TRADE TABLE ---
function renderTradeTable() {
  const tbody = document.getElementById('tradeTableBody');
  if(!tbody) return;
  const recent = filteredTrades.slice(-20).reverse();
  if(recent.length===0) { tbody.innerHTML='<tr><td colspan="12" class="empty-state"><div class="empty-state-icon">📭</div><p>Không có dữ liệu</p></td></tr>'; return; }
  tbody.innerHTML = recent.map(t => `<tr>
    <td>${t.stt}</td>
    <td><span class="status-badge ${statusClass(t.trang_thai)}">${t.trang_thai}</span></td>
    <td>${t.loai_tai_san}</td>
    <td style="font-weight:600;">${t.ma_gd}</td>
    <td><span class="position-badge ${posClass(t.vi_the)}">${t.vi_the}</span></td>
    <td>${t.khoi_luong}</td>
    <td style="font-family:var(--font-mono)">${t.gia_vao}</td>
    <td style="font-family:var(--font-mono)">${t.gia_dong}</td>
    <td class="pnl-value ${t.diem_thuc_te>=0?'positive':'negative'}">${t.diem_thuc_te>=0?'+':''}${typeof t.diem_thuc_te==='number'?t.diem_thuc_te.toFixed(1):t.diem_thuc_te}</td>
    <td class="pnl-value ${t.lai_lo_rong>=0?'positive':'negative'}">${formatVND(t.lai_lo_rong)}</td>
    <td>${t.ngay_gio_vao.toLocaleDateString('vi-VN')}</td>
    <td>${t.chien_luoc}</td>
  </tr>`).join('');
}

function renderFullTable() {
  const tbody = document.getElementById('fullTradeTableBody');
  if(!tbody) return;
  setText('fullTradeCount', filteredTrades.length+' lệnh');
  tbody.innerHTML = filteredTrades.map(t => `<tr>
    <td>${t.stt}</td>
    <td><span class="status-badge ${statusClass(t.trang_thai)}">${t.trang_thai}</span></td>
    <td>${t.loai_tai_san}</td><td style="font-weight:600">${t.ma_gd}</td>
    <td>${t.chien_luoc}</td>
    <td><span class="position-badge ${posClass(t.vi_the)}">${t.vi_the}</span></td>
    <td>${t.phien}</td>
    <td>${t.ngay_gio_vao.toLocaleDateString('vi-VN')}</td>
    <td>${t.ngay_gio_dong.toLocaleDateString('vi-VN')}</td>
    <td>${t.thoi_gian_gd}</td>
    <td>${t.khoi_luong}</td>
    <td style="font-family:var(--font-mono)">${t.gia_vao}</td>
    <td>${t.cat_lo}</td><td>${t.chot_loi}</td>
    <td style="font-family:var(--font-mono)">${t.gia_dong}</td>
    <td class="pnl-value ${t.diem_thuc_te>=0?'positive':'negative'}">${typeof t.diem_thuc_te==='number'?t.diem_thuc_te.toFixed(1):t.diem_thuc_te}</td>
    <td>${t.rr_ky_vong}</td>
    <td class="pnl-value ${t.lai_lo_gop>=0?'positive':'negative'}">${formatVND(t.lai_lo_gop)}</td>
    <td>${formatVND(t.phi_gd)}</td>
    <td class="pnl-value ${t.lai_lo_rong>=0?'positive':'negative'}">${formatVND(t.lai_lo_rong)}</td>
    <td style="font-family:var(--font-mono)">${formatVND(t.so_du_da_dong)}</td>
    <td>${t.tam_ly}</td><td>${t.ghi_chu}</td>
  </tr>`).join('');
}

// --- CALENDAR ---
function renderCalendar() {
  const grid = document.getElementById('calendarGrid');
  if(!grid) return;
  const y=calendarDate.getFullYear(), m=calendarDate.getMonth();
  setText('calendarMonth', `Tháng ${m+1}/${y}`);
  const byDay = {};
  allTrades.forEach(t => { const d=t.ngay_gio_vao; if(d.getFullYear()===y&&d.getMonth()===m) { const k=d.getDate(); byDay[k]=(byDay[k]||0)+t.lai_lo_rong; }});
  const daysInMonth = new Date(y,m+1,0).getDate();
  const firstDay = new Date(y,m,1).getDay()||7;
  const headers = ['T2','T3','T4','T5','T6','T7','CN'];
  let html = headers.map(h=>`<div style="text-align:center;font-weight:600;color:var(--text-secondary);padding:8px;font-size:0.8rem;">${h}</div>`).join('');
  for(let i=1;i<firstDay;i++) html += '<div></div>';
  for(let d=1;d<=daysInMonth;d++) {
    const pnl = byDay[d]||0;
    const bg = pnl>0?'var(--accent-green-soft)':pnl<0?'var(--accent-red-soft)':'var(--bg-input)';
    const color = pnl>0?'var(--accent-green)':pnl<0?'var(--accent-red)':'var(--text-secondary)';
    html += `<div style="background:${bg};border-radius:var(--radius-sm);padding:12px 8px;text-align:center;border:var(--border-subtle);">
      <div style="font-size:0.8rem;color:var(--text-secondary);margin-bottom:4px;">${d}</div>
      <div style="font-family:var(--font-mono);font-size:0.75rem;font-weight:600;color:${color}">${pnl!==0?formatVNDShort(pnl):'-'}</div>
    </div>`;
  }
  grid.innerHTML = html;
}
function calendarPrev() { calendarDate.setMonth(calendarDate.getMonth()-1); renderCalendar(); }
function calendarNext() { calendarDate.setMonth(calendarDate.getMonth()+1); renderCalendar(); }

// --- UTILITIES ---
function formatVND(n) { if(n==null) return ''; const s=Math.abs(Math.round(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g,'.'); return (n<0?'-':n>0?'+':'')+s; }
function formatVNDShort(n) { const a=Math.abs(n); if(a>=1e9) return (n/1e9).toFixed(1)+'tỷ'; if(a>=1e6) return (n/1e6).toFixed(1)+'tr'; if(a>=1e3) return (n/1e3).toFixed(0)+'k'; return n.toString(); }
function setText(id,v) { const el=document.getElementById(id); if(el) el.textContent=v; }
function statusClass(s) { if(s.includes('Win')) return 'win'; if(s.includes('Lose')) return 'lose'; if(s.includes('Hòa')) return 'draw'; return 'open'; }
function posClass(p) { return p.toLowerCase().replace('á','a'); }
function hideLoading() { const el=document.getElementById('loadingOverlay'); if(el) el.classList.add('hidden'); }
function refreshData() { location.reload(); }
function exportReport() { alert('Tính năng xuất báo cáo sẽ được triển khai trong Phase 4'); }
function saveSettings() { alert('Đã lưu cài đặt!'); }
function setEquityPeriod(p) { /* TODO: filter equity chart by period */ }
