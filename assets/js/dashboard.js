/* ===== AEGIS Dashboard ===== */
const API = {
  health: '/api/health',
  trades: '/api/trades',
  signals: '/api/signals',
  metrics: '/api/metrics',
  accounts: '/api/accounts',
};

const MAGIC = { Forex: 31337, Crypto: 31338, Indices: 31339, Metals: 31340 };
const ASSET_TABS = ['Forex', 'Crypto', 'Indices', 'Metals', 'Combined'];
let currentAccount = 'PepperstoneUK-Demo';
let currentAsset = 'Forex';
let refreshTimer = null;
let progressTimer = null;
let refreshInterval = 30000;

// Mock data generator
function generateMockData() {
  const symbols = {
    Forex: ['EURUSD','GBPUSD','USDJPY','AUDUSD','USDCAD','USDCHF','NZDUSD','EURGBP'],
    Crypto: ['BTCUSD','ETHUSD','XRPUSD','LTCUSD','SOLUSD','DOTUSD'],
    Indices: ['US30','US100','DE40','UK100','JP225','AU200'],
    Metals: ['XAUUSD','XAGUSD','XPTUSD','XPDUSD']
  };
  const regimes = ['Trending', 'Ranging', 'Volatile', 'Low Volatility', 'Breakout', 'Reversal'];
  const reasons = [
    'ADX > 25 with MACD confirmation, price above 20 EMA',
    'RSI divergence on H4, support held, volume spike detected',
    'Bollinger squeeze + breakout, volume confirmation, ATR expanding',
    'Order block retest + FVG fill, ICT setup valid',
    'EMA 50/200 golden cross, momentum aligned with trend',
    'Wyckoff accumulation phase C, spring test passed',
    'Fair value gap + breaker block, price at premium discount',
    'Harmonic pattern completion (BAT 88.6), RSI oversold'
  ];
  const notExec = ['Max positions reached', 'Daily breaker active', 'Spread too wide', 'Risk limit exceeded', 'Correlated trade open', 'News event filter', 'Magic number mismatch', 'Session filter'];

  const metrics = {
    total_trades: Math.floor(Math.random()*80)+40,
    win_rate: +(Math.random()*25+55).toFixed(1),
    profit_factor: +(Math.random()*1.5+1.2).toFixed(2),
    total_pnl: +(Math.random()*4000-500).toFixed(2),
    avg_pnl: +(Math.random()*80-10).toFixed(2),
    max_drawdown: +(Math.random()*8+2).toFixed(1),
    sharpe: +(Math.random()*1.5+0.5).toFixed(2),
    open_positions: Math.floor(Math.random()*6),
    today_signals: Math.floor(Math.random()*12)+3,
    kelly: +(Math.random()*0.15+0.05).toFixed(3),
    balance: currentAccount === 'PepperstoneUK-Demo' ? 22000 : 5200,
    equity: currentAccount === 'PepperstoneUK-Demo' ? 22150 : 5180,
  };

  const trades = [];
  const tradeCount = Math.floor(Math.random()*15)+8;
  for (let i=0;i<tradeCount;i++) {
    const asset = currentAsset === 'Combined' ? Object.keys(symbols)[Math.floor(Math.random()*4)] : currentAsset;
    const sym = symbols[asset][Math.floor(Math.random()*symbols[asset].length)];
    const dir = Math.random() > 0.5 ? 'BUY' : 'SELL';
    const pnl = +(Math.random()*200-80).toFixed(2);
    trades.push({
      id: i+1, symbol: sym, direction: dir, asset_class: asset,
      entry: +(Math.random()*1.5+0.5).toFixed(5),
      exit: +(Math.random()*1.5+0.5).toFixed(5),
      pnl: pnl, lots: +(Math.random()*0.5+0.05).toFixed(2),
      risk: +(Math.random()*2+0.5).toFixed(1),
      sl: +(Math.random()*50+20).toFixed(1),
      tp: +(Math.random()*80+30).toFixed(1),
      open_time: new Date(Date.now()-Math.random()*86400000*7).toISOString(),
      close_time: Math.random()>0.3 ? new Date(Date.now()-Math.random()*86400000*3).toISOString() : null,
      reasoning: reasons[Math.floor(Math.random()*reasons.length)],
      magic: MAGIC[asset]
    });
  }
  trades.sort((a,b) => new Date(b.open_time)-new Date(a.open_time));

  const signals = [];
  const sigCount = Math.floor(Math.random()*10)+5;
  for (let i=0;i<sigCount;i++) {
    const asset = currentAsset === 'Combined' ? Object.keys(symbols)[Math.floor(Math.random()*4)] : currentAsset;
    const executed = Math.random() > 0.35;
    signals.push({
      id: i+100, symbol: symbols[asset][Math.floor(Math.random()*symbols[asset].length)],
      direction: Math.random()>0.5?'BUY':'SELL', asset_class: asset,
      score: Math.floor(Math.random()*40)+60, regime: regimes[Math.floor(Math.random()*regimes.length)],
      reasoning: reasons[Math.floor(Math.random()*reasons.length)],
      executed: executed,
      reason_not_executed: executed ? null : notExec[Math.floor(Math.random()*notExec.length)],
      timestamp: new Date(Date.now()-Math.random()*86400000).toISOString(),
      kelly: +(Math.random()*0.1+0.02).toFixed(3)
    });
  }
  signals.sort((a,b) => new Date(b.timestamp)-new Date(a.timestamp));

  return { metrics, trades, signals };
}

async function fetchData() {
  if (isDemoMode()) return generateMockData();
  try {
    const params = `?account=${encodeURIComponent(currentAccount)}&asset=${encodeURIComponent(currentAsset)}`;
    const [mRes, tRes, sRes] = await Promise.all([
      authFetch(API.metrics + params),
      authFetch(API.trades + params),
      authFetch(API.signals + params)
    ]);
    const metrics = mRes.ok ? await mRes.json() : {};
    const trades = tRes.ok ? await tRes.json() : [];
    const signals = sRes.ok ? await sRes.json() : [];
    return { metrics, trades, signals };
  } catch (e) {
    console.error('API error, using mock data', e);
    return generateMockData();
  }
}

// Render
function renderMetrics(m) {
  const grid = document.getElementById('metricsGrid'); if (!grid) return;
  const pnlClass = m.total_pnl >= 0 ? 'profit' : 'loss';
  const pnlSign = m.total_pnl >= 0 ? '+' : '';
  grid.innerHTML = `
    <div class="metric-card">
      <svg class="metric-icon" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>
      <div class="metric-label">Balance</div>
      <div class="metric-value">$${m.balance?.toLocaleString()||'0'}</div>
      <div class="metric-change up">Equity $${m.equity?.toLocaleString()||'0'}</div>
      <canvas class="sparkline" id="spark1"></canvas>
    </div>
    <div class="metric-card">
      <svg class="metric-icon" viewBox="0 0 24 24"><path d="M7 11h2v2H7v-2zm14-5v14c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2V5l4 2 4-4 4 4 4-2z"/></svg>
      <div class="metric-label">Total P&L</div>
      <div class="metric-value ${pnlClass}">${pnlSign}$${m.total_pnl?.toLocaleString()||'0'}</div>
      <div class="metric-change ${pnlClass}">${pnlSign}${m.avg_pnl||0}/trade avg</div>
      <canvas class="sparkline" id="spark2"></canvas>
    </div>
    <div class="metric-card">
      <svg class="metric-icon" viewBox="0 0 24 24"><path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/></svg>
      <div class="metric-label">Win Rate</div>
      <div class="metric-value">${m.win_rate||0}%</div>
      <div class="metric-change up">${m.profit_factor||0} Profit Factor</div>
      <canvas class="sparkline" id="spark3"></canvas>
    </div>
    <div class="metric-card">
      <svg class="metric-icon" viewBox="0 0 24 24"><path d="M11 15h2v2h-2zm0-8h2v6h-2zm1-5C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2z"/></svg>
      <div class="metric-label">Max Drawdown</div>
      <div class="metric-value loss">-${m.max_drawdown||0}%</div>
      <div class="metric-change">Sharpe ${m.sharpe||0}</div>
      <canvas class="sparkline" id="spark4"></canvas>
    </div>
    <div class="metric-card">
      <svg class="metric-icon" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14h-2V9h-2V7h4v10z"/></svg>
      <div class="metric-label">Open Positions</div>
      <div class="metric-value">${m.open_positions||0}</div>
      <div class="metric-change">Magic: ${MAGIC[currentAsset]||'All'}</div>
      <canvas class="sparkline" id="spark5"></canvas>
    </div>
    <div class="metric-card">
      <svg class="metric-icon" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
      <div class="metric-label">Today Signals</div>
      <div class="metric-value">${m.today_signals||0}</div>
      <div class="metric-change up">Kelly ${m.kelly||0}</div>
      <canvas class="sparkline" id="spark6"></canvas>
    </div>
  `;
  // Sparklines
  setTimeout(() => {
    for (let i=1;i<=6;i++) {
      const c = document.getElementById('spark'+i);
      if (c && window.AegisCharts) window.AegisCharts.sparkline(c, Array.from({length:20},()=>Math.random()*100));
    }
  }, 50);
}

function renderTrades(trades) {
  const tbody = document.getElementById('tradesBody'); if (!tbody) return;
  if (!trades || trades.length === 0) { tbody.innerHTML = '<tr><td colspan="10" class="empty-state"><svg class="icon" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg><p>No trades found</p></td></tr>'; return; }
  tbody.innerHTML = trades.map(t => {
    const pnlClass = t.pnl >= 0 ? 'profit' : 'loss'; const pnlSign = t.pnl >= 0 ? '+' : '';
    const dirClass = t.direction === 'BUY' ? 'buy' : 'sell';
    const isOpen = !t.close_time;
    return `<tr>
      <td class="col-symbol">${t.symbol}</td>
      <td class="col-direction ${dirClass}">${t.direction}</td>
      <td>${t.asset_class}</td>
      <td>${t.lots}</td>
      <td>${t.entry}</td>
      <td>${t.exit || (isOpen ? '<span class=\"badge badge-live\">Open</span>' : '-')}</td>
      <td class="col-pnl ${pnlClass}">${pnlSign}$${t.pnl.toFixed(2)}</td>
      <td>${t.risk}%</td>
      <td class="col-reason" title="${t.reasoning||''}">${t.reasoning ? (t.reasoning.substring(0,50)+'...') : '-'}</td>
      <td>${new Date(t.open_time).toLocaleDateString()}</td>
    </tr>`;
  }).join('');
}

function renderSignals(signals) {
  const container = document.getElementById('signalsList'); if (!container) return;
  if (!signals || signals.length === 0) { container.innerHTML = '<div class="empty-state"><svg class="icon" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg><p>No signals found</p></div>'; return; }
  container.innerHTML = signals.map(s => {
    const status = s.executed ? 'executed' : (s.reason_not_executed ? 'rejected' : 'pending');
    const statusTag = s.executed ? '<span class="tag tag-go">EXECUTED</span>' : '<span class="tag tag-nogo">NOT TAKEN</span>';
    const notExec = s.reason_not_executed ? `<div class="signal-notice"><svg class="icon" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>Why not executed: ${s.reason_not_executed}</div>` : '';
    return `<div class="signal-item ${status}">
      <div class="signal-header">
        <div class="signal-title"><span class="signal-symbol">${s.symbol}</span> ${s.direction} ${statusTag}</div>
        <div class="signal-meta">
          <span class="tag tag-score">Score: ${s.score}</span>
          <span class="tag tag-regime">${s.regime}</span>
          <span style="font-size:0.75rem;color:var(--text-muted);">${new Date(s.timestamp).toLocaleTimeString()}</span>
        </div>
      </div>
      <div class="signal-reasoning"><strong>Setup:</strong> ${s.reasoning}</div>
      <div style="font-size:0.8125rem;color:var(--text-muted);margin-top:0.25rem;">Kelly sizing: ${s.kelly||'0.05'} | Magic: ${MAGIC[s.asset_class]||'Combined'}</div>
      ${notExec}
    </div>`;
  }).join('');
}

function renderCharts(data) {
  if (!window.AegisCharts) return;
  const trades = data.trades || [];
  // Equity curve (cumulative P&L)
  const equity = []; let cum = 0;
  for (const t of [...trades].reverse()) { cum += t.pnl; equity.push(cum); }
  const equityLabels = equity.map((_,i) => String(i+1));
  const eqCanvas = document.getElementById('equityChart');
  if (eqCanvas && equity.length > 1) window.AegisCharts.lineChart(eqCanvas, equity, equityLabels);

  // Drawdown (simulated from equity)
  const dd = equity.map(v => { const peak = Math.max(...equity.slice(0, equity.indexOf(v)+1)); return -((peak-v)/peak*100); });
  const ddCanvas = document.getElementById('drawdownChart');
  if (ddCanvas && dd.length > 1) window.AegisCharts.areaChart(ddCanvas, dd, equityLabels);

  // Distribution histogram
  const bins = ['-200','-100','-50','0','50','100','200']; const binVals = [0,0,0,0,0,0,0];
  for (const t of trades) {
    const p = t.pnl;
    if (p <= -200) binVals[0]++; else if (p <= -100) binVals[1]++; else if (p <= -50) binVals[2]++;
    else if (p <= 0) binVals[3]++; else if (p <= 50) binVals[4]++; else if (p <= 100) binVals[5]++; else binVals[6]++;
  }
  const histCanvas = document.getElementById('distChart');
  if (histCanvas) window.AegisCharts.histogramChart(histCanvas, bins, binVals);

  // Strategy/Symbol bar chart
  const symPnL = {};
  for (const t of trades) { symPnL[t.symbol] = (symPnL[t.symbol]||0) + t.pnl; }
  const syms = Object.keys(symPnL).slice(0,6); const vals = syms.map(s => +symPnL[s].toFixed(2));
  const barCanvas = document.getElementById('perfChart');
  if (barCanvas) window.AegisCharts.barChart(barCanvas, syms, vals);

  // Regime pie
  const regimeCounts = {};
  for (const s of data.signals||[]) { regimeCounts[s.regime] = (regimeCounts[s.regime]||0)+1; }
  const pieCanvas = document.getElementById('regimeChart');
  if (pieCanvas) window.AegisCharts.pieChart(pieCanvas, Object.keys(regimeCounts), Object.values(regimeCounts));
}

function renderGoNoGo(signals) {
  const grid = document.getElementById('gonogoGrid'); if (!grid) return;
  const exec = signals.filter(s => s.executed).length;
  const notExec = signals.filter(s => !s.executed && s.reason_not_executed).length;
  const pending = signals.filter(s => !s.executed && !s.reason_not_executed).length;
  grid.innerHTML = `
    <div class="gonogo-card go">
      <svg class="status-icon" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
      <div class="status-text">TRADES TAKEN</div>
      <div class="status-detail">${exec} signals executed this session</div>
    </div>
    <div class="gonogo-card nogo">
      <svg class="status-icon" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
      <div class="status-text">TRADES BLOCKED</div>
      <div class="status-detail">${notExec} signals filtered by risk rules</div>
    </div>
    <div class="gonogo-card" style="border-left:3px solid var(--warning);">
      <svg class="status-icon" viewBox="0 0 24 24" style="fill:var(--warning)"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
      <div class="status-text" style="color:var(--warning)">PENDING</div>
      <div class="status-detail">${pending} awaiting execution</div>
    </div>
  `;
}

function renderKelly(metrics) {
  const el = document.getElementById('kellyDisplay'); if (!el) return;
  const k = metrics.kelly || 0.05; const pct = Math.min(k * 500, 100);
  el.innerHTML = `
    <div class="kelly-value">${k}</div>
    <div style="flex:1">
      <div class="kelly-bar"><div class="kelly-bar-fill" style="width:${pct}%"></div></div>
      <div class="kelly-labels"><span>0.0</span><span>0.1</span><span>0.2</span></div>
    </div>
  `;
}

// Navigation
function initTabs() {
  const tabs = document.querySelectorAll('.sidebar-nav-item');
  tabs.forEach(t => t.addEventListener('click', () => {
    tabs.forEach(x => x.classList.remove('active'));
    t.classList.add('active');
    currentAsset = t.dataset.asset;
    document.getElementById('contentTitle').textContent = currentAsset + ' Dashboard';
    document.getElementById('contentSubtitle').textContent = currentAsset === 'Combined' ? 'All asset classes' : currentAsset + ' trading';
    loadDashboard();
  }));
}

function initAccountSwitcher() {
  const sel = document.getElementById('accountSwitcher'); if (!sel) return;
  sel.addEventListener('change', () => { currentAccount = sel.value; loadDashboard(); });
}

// Main load
async function loadDashboard() {
  const loading = document.getElementById('loadingOverlay');
  if (loading) loading.style.display = 'flex';
  const data = await fetchData();
  renderMetrics(data.metrics);
  renderTrades(data.trades);
  renderSignals(data.signals);
  renderCharts(data);
  renderGoNoGo(data.signals);
  renderKelly(data.metrics);
  if (loading) loading.style.display = 'none';
  document.getElementById('lastUpdated').textContent = new Date().toLocaleTimeString();
  updateProgress();
}

// Auto refresh
function updateProgress() {
  const bar = document.getElementById('refreshProgress'); if (!bar) return;
  let elapsed = 0;
  if (progressTimer) clearInterval(progressTimer);
  progressTimer = setInterval(() => {
    elapsed += 500;
    const pct = Math.min((elapsed / refreshInterval) * 100, 100);
    bar.style.width = pct + '%';
    if (elapsed >= refreshInterval) { clearInterval(progressTimer); loadDashboard(); }
  }, 500);
}

function startAutoRefresh() {
  if (refreshTimer) clearInterval(refreshTimer);
  refreshTimer = setInterval(loadDashboard, refreshInterval);
  updateProgress();
}

function stopAutoRefresh() { if (refreshTimer) clearInterval(refreshTimer); if (progressTimer) clearInterval(progressTimer); }

// CSV Export
function exportCSV() {
  const rows = document.querySelectorAll('#tradesBody tr');
  if (rows.length === 0 || rows[0].querySelector('.empty-state')) return alert('No data to export');
  let csv = 'Symbol,Direction,Asset,Lots,Entry,Exit,P&L,Risk,Date\n';
  rows.forEach(r => {
    const cells = r.querySelectorAll('td'); if (cells.length < 10) return;
    csv += Array.from(cells).map(c => '"' + c.textContent.trim().replace(/"/g,'""') + '"').join(',') + '\n';
  });
  const blob = new Blob([csv], {type:'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `aegis_trades_${currentAccount}_${currentAsset}_${Date.now()}.csv`; a.click();
  URL.revokeObjectURL(url);
}

// Mobile sidebar
function initMobile() {
  const toggle = document.getElementById('menuToggle');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  if (toggle && sidebar && overlay) {
    toggle.addEventListener('click', () => { sidebar.classList.toggle('open'); overlay.classList.toggle('open'); });
    overlay.addEventListener('click', () => { sidebar.classList.remove('open'); overlay.classList.remove('open'); });
  }
}

// Init
function initDashboard() {
  if (document.getElementById('dashboard')) {
    initTabs(); initAccountSwitcher(); initMobile(); loadDashboard(); startAutoRefresh();
    document.getElementById('refreshBtn')?.addEventListener('click', () => { loadDashboard(); });
    document.getElementById('exportBtn')?.addEventListener('click', exportCSV);
    document.getElementById('logoutBtn')?.addEventListener('click', logout);
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initDashboard);
else initDashboard();
