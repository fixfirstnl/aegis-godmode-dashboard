/* ===== AEGIS Canvas Charts ===== */
const ChartColors = {
  primary: '#0ea5e9',
  profit: '#10b981',
  loss: '#ef4444',
  warning: '#f59e0b',
  grid: '#1e293b',
  text: '#94a3b8',
  fill: 'rgba(14,165,233,0.1)',
  profitFill: 'rgba(16,185,129,0.15)',
  lossFill: 'rgba(239,68,68,0.15)',
  palette: ['#0ea5e9','#10b981','#f59e0b','#8b5cf6','#ec4899','#06b6d4','#84cc16','#f97316']
};

function setupCanvas(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr; canvas.height = rect.height * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  return { ctx, w: rect.width, h: rect.height };
}

function clearChart(canvas) { const c = canvas.getContext('2d'); c.clearRect(0,0,canvas.width,canvas.height); }

function drawGrid(ctx, w, h, padding, labelsX, labelsY) {
  const pw = padding || { t: 20, r: 20, b: 30, l: 50 };
  const gw = w - pw.l - pw.r, gh = h - pw.t - pw.b;
  ctx.strokeStyle = ChartColors.grid; ctx.lineWidth = 1; ctx.font = '11px sans-serif'; ctx.fillStyle = ChartColors.text;
  // Y grid
  const yCount = labelsY.length || 5;
  for (let i = 0; i < yCount; i++) {
    const y = pw.t + (gh / (yCount - 1)) * i;
    ctx.beginPath(); ctx.moveTo(pw.l, y); ctx.lineTo(pw.l + gw, y); ctx.stroke();
    const val = labelsY[i] !== undefined ? labelsY[i] : Math.round((1 - i/(yCount-1)) * 100);
    ctx.textAlign = 'right'; ctx.fillText(String(val), pw.l - 8, y + 4);
  }
  // X grid
  const xCount = labelsX.length || 5;
  for (let i = 0; i < xCount; i++) {
    const x = pw.l + (gw / (xCount - 1)) * i;
    ctx.beginPath(); ctx.moveTo(x, pw.t); ctx.lineTo(x, pw.t + gh); ctx.stroke();
    const label = labelsX[i] !== undefined ? labelsX[i] : String(i);
    ctx.textAlign = 'center'; ctx.fillText(label, x, h - 8);
  }
  // Axes
  ctx.strokeStyle = '#334155'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(pw.l, pw.t); ctx.lineTo(pw.l, pw.t + gh); ctx.lineTo(pw.l + gw, pw.t + gh); ctx.stroke();
}

// Line Chart
function lineChart(canvas, data, labels) {
  const { ctx, w, h } = setupCanvas(canvas);
  const pw = { t: 20, r: 20, b: 30, l: 55 };
  const gw = w - pw.l - pw.r, gh = h - pw.t - pw.b;
  if (!data || data.length < 2) return;
  const min = Math.min(...data), max = Math.max(...data), range = max - min || 1;
  const norm = v => pw.t + gh - ((v - min) / range) * gh;
  const yLabels = [max, max - range/2, min].map(v => v.toFixed(2));
  drawGrid(ctx, w, h, pw, labels, yLabels);
  // Area fill
  ctx.beginPath(); ctx.moveTo(pw.l, norm(data[0]));
  for (let i = 1; i < data.length; i++) ctx.lineTo(pw.l + (gw / (data.length - 1)) * i, norm(data[i]));
  ctx.lineTo(pw.l + gw, pw.t + gh); ctx.lineTo(pw.l, pw.t + gh); ctx.closePath();
  ctx.fillStyle = ChartColors.fill; ctx.fill();
  // Line
  ctx.beginPath(); ctx.moveTo(pw.l, norm(data[0]));
  for (let i = 1; i < data.length; i++) ctx.lineTo(pw.l + (gw / (data.length - 1)) * i, norm(data[i]));
  ctx.strokeStyle = ChartColors.primary; ctx.lineWidth = 2; ctx.stroke();
  // Points
  for (let i = 0; i < data.length; i++) {
    const x = pw.l + (gw / (data.length - 1)) * i, y = norm(data[i]);
    ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fillStyle = ChartColors.primary; ctx.fill();
  }
}

// Area Chart (drawdown)
function areaChart(canvas, data, labels) {
  const { ctx, w, h } = setupCanvas(canvas);
  const pw = { t: 20, r: 20, b: 30, l: 55 };
  const gw = w - pw.l - pw.r, gh = h - pw.t - pw.b;
  if (!data || data.length < 2) return;
  const min = Math.min(...data), max = Math.max(...data), range = max - min || 1;
  const norm = v => pw.t + gh - ((v - min) / range) * gh;
  const yLabels = [max, max - range/2, min].map(v => v.toFixed(1) + '%');
  drawGrid(ctx, w, h, pw, labels, yLabels);
  // Gradient fill
  const grad = ctx.createLinearGradient(0, pw.t, 0, pw.t + gh);
  grad.addColorStop(0, 'rgba(239,68,68,0.25)'); grad.addColorStop(1, 'rgba(239,68,68,0.02)');
  ctx.beginPath(); ctx.moveTo(pw.l, norm(data[0]));
  for (let i = 1; i < data.length; i++) ctx.lineTo(pw.l + (gw / (data.length - 1)) * i, norm(data[i]));
  ctx.lineTo(pw.l + gw, pw.t + gh); ctx.lineTo(pw.l, pw.t + gh); ctx.closePath();
  ctx.fillStyle = grad; ctx.fill();
  // Line
  ctx.beginPath(); ctx.moveTo(pw.l, norm(data[0]));
  for (let i = 1; i < data.length; i++) ctx.lineTo(pw.l + (gw / (data.length - 1)) * i, norm(data[i]));
  ctx.strokeStyle = ChartColors.loss; ctx.lineWidth = 2; ctx.stroke();
}

// Histogram
function histogramChart(canvas, bins, values) {
  const { ctx, w, h } = setupCanvas(canvas);
  const pw = { t: 20, r: 20, b: 30, l: 55 };
  const gw = w - pw.l - pw.r, gh = h - pw.t - pw.b;
  if (!values || values.length === 0) return;
  const max = Math.max(...values); const norm = v => (v / max) * gh;
  const bw = gw / values.length * 0.7, gap = gw / values.length * 0.3;
  drawGrid(ctx, w, h, pw, bins, [max, max/2, 0]);
  for (let i = 0; i < values.length; i++) {
    const x = pw.l + (gw / values.length) * i + gap/2;
    const barH = norm(values[i]);
    ctx.fillStyle = values[i] >= 0 ? ChartColors.profitFill : ChartColors.lossFill;
    ctx.fillRect(x, pw.t + gh - barH, bw, barH);
    ctx.strokeStyle = values[i] >= 0 ? ChartColors.profit : ChartColors.loss;
    ctx.strokeRect(x, pw.t + gh - barH, bw, barH);
  }
}

// Bar Chart
function barChart(canvas, labels, values) {
  const { ctx, w, h } = setupCanvas(canvas);
  const pw = { t: 20, r: 20, b: 40, l: 55 };
  const gw = w - pw.l - pw.r, gh = h - pw.t - pw.b;
  if (!values || values.length === 0) return;
  const max = Math.max(...values.map(Math.abs)); const norm = v => (v / max) * gh;
  const bw = gw / values.length * 0.6, gap = gw / values.length * 0.4;
  drawGrid(ctx, w, h, pw, labels, [max, max/2, 0, -max/2, -max]);
  for (let i = 0; i < values.length; i++) {
    const x = pw.l + (gw / values.length) * i + gap/2;
    const barH = norm(values[i]);
    const isPos = values[i] >= 0;
    ctx.fillStyle = isPos ? ChartColors.profitFill : ChartColors.lossFill;
    ctx.fillRect(x, isPos ? pw.t + gh - barH : pw.t + gh, bw, Math.abs(barH));
    ctx.strokeStyle = isPos ? ChartColors.profit : ChartColors.loss;
    ctx.strokeRect(x, isPos ? pw.t + gh - barH : pw.t + gh, bw, Math.abs(barH));
    // Value label
    ctx.fillStyle = ChartColors.text; ctx.textAlign = 'center'; ctx.font = '10px sans-serif';
    ctx.fillText(String(values[i]), x + bw/2, isPos ? pw.t + gh - barH - 4 : pw.t + gh + Math.abs(barH) + 12);
  }
}

// Pie Chart
function pieChart(canvas, labels, values) {
  const { ctx, w, h } = setupCanvas(canvas);
  const cx = w/2, cy = h/2, r = Math.min(w,h)/2 - 30;
  if (!values || values.length === 0) return;
  const total = values.reduce((a,b) => a+b, 0);
  let start = -Math.PI/2;
  for (let i = 0; i < values.length; i++) {
    const slice = (values[i] / total) * Math.PI * 2;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r, start, start + slice); ctx.closePath();
    ctx.fillStyle = ChartColors.palette[i % ChartColors.palette.length]; ctx.fill();
    ctx.strokeStyle = var(--bg-card); ctx.lineWidth = 2; ctx.stroke();
    // Label
    const mid = start + slice/2;
    const lx = cx + Math.cos(mid) * (r * 0.6), ly = cy + Math.sin(mid) * (r * 0.6);
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = 'bold 12px sans-serif';
    ctx.fillText(Math.round(values[i]/total*100)+'%', lx, ly + 4);
    start += slice;
  }
  // Legend
  ctx.font = '11px sans-serif'; ctx.fillStyle = ChartColors.text;
  const legendY = h - 15;
  let lx = 20;
  for (let i = 0; i < labels.length; i++) {
    ctx.fillStyle = ChartColors.palette[i % ChartColors.palette.length];
    ctx.fillRect(lx, legendY - 8, 10, 10); lx += 14;
    ctx.fillStyle = ChartColors.text; ctx.textAlign = 'left';
    ctx.fillText(labels[i], lx, legendY); lx += ctx.measureText(labels[i]).width + 18;
  }
}

// Sparkline (mini line, no axes)
function sparkline(canvas, data) {
  const { ctx, w, h } = setupCanvas(canvas);
  if (!data || data.length < 2) return;
  const min = Math.min(...data), max = Math.max(...data), range = max - min || 1;
  const norm = v => h - ((v - min) / range) * h;
  const isPos = data[data.length-1] >= data[0];
  ctx.beginPath(); ctx.moveTo(0, norm(data[0]));
  for (let i = 1; i < data.length; i++) ctx.lineTo((w/(data.length-1))*i, norm(data[i]));
  ctx.strokeStyle = isPos ? ChartColors.profit : ChartColors.loss; ctx.lineWidth = 2; ctx.stroke();
}

window.AegisCharts = { lineChart, areaChart, histogramChart, barChart, pieChart, sparkline, setupCanvas, clearChart, ChartColors };
