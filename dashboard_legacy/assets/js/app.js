// KhangHang1 Trading Journal — Dashboard App
let allTrades = [];
let filteredTrades = [];
let charts = {};
let currentPage = "overview";
let calendarDate = new Date();
let equityPeriod = "all";
const SETTINGS_KEY = "khanghang_dashboard_settings";
const THEME_KEY = "khanghang_dashboard_theme";
const CONFIG = {
  vonBanDau: 200000000,
  diemToVND: 100000,
  phiPS: 7700,
  phiCP: 0.0015,
  thueBanCP: 0.001,
};
const COLORS = {
  green: "#10b981",
  red: "#ef4444",
  blue: "#3b82f6",
  gold: "#f59e0b",
  purple: "#8b5cf6",
  muted: "#64748b",
  grid: "rgba(255,255,255,.06)",
  tick: "#8b98a5",
};

document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  setText(
    "dateDisplay",
    new Date().toLocaleDateString("vi-VN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
  );
  loadSettingsIntoForm();
  refreshData();
});
function getSettings() {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
  } catch {
    return {};
  }
}
function loadSettingsIntoForm() {
  const s = getSettings();
  setValue("settingSheetId", s.sheetId || "");
  setValue("settingApiKey", s.apiKey || "");
}
function navigateTo(page) {
  currentPage = page;
  document
    .querySelectorAll(".page-section")
    .forEach((s) => (s.style.display = "none"));
  const el = document.getElementById("page-" + page);
  if (el) el.style.display = "block";
  document
    .querySelectorAll(".nav-item")
    .forEach((n) => n.classList.remove("active"));
  document
    .querySelector(`.nav-item[data-page="${page}"]`)
    ?.classList.add("active");
  closeSidebar();
  if (page === "calendar") renderCalendar();
  if (page === "charts") renderAnalysisCharts();
  if (page === "journal") renderFullTable();
}
function toggleSidebar() {
  document.getElementById("sidebar")?.classList.toggle("open");
  document.getElementById("sidebarBackdrop")?.classList.toggle("show");
}
function closeSidebar() {
  document.getElementById("sidebar")?.classList.remove("open");
  document.getElementById("sidebarBackdrop")?.classList.remove("show");
}

function initTheme() {
  const savedTheme = localStorage.getItem(THEME_KEY) || "dark";
  applyTheme(savedTheme === "light" ? "light" : "dark");
}

function toggleTheme() {
  const nextTheme = document.body.classList.contains("light-mode")
    ? "dark"
    : "light";
  localStorage.setItem(THEME_KEY, nextTheme);
  applyTheme(nextTheme);
  renderVisibleCharts();
}

function applyTheme(theme) {
  const isLight = theme === "light";
  document.body.classList.toggle("light-mode", isLight);
  COLORS.grid = isLight ? "rgba(15,23,42,.08)" : "rgba(255,255,255,.06)";
  COLORS.tick = isLight ? "#64748b" : "#8b98a5";
  setText("themeToggleIcon", isLight ? "☀️" : "🌙");
  setText("themeToggleLabel", isLight ? "Light mode" : "Dark mode");
  setText(
    "themeToggleHint",
    isLight ? "Nền sáng dễ đọc" : "Tối ưu cho dashboard",
  );
}

function renderVisibleCharts() {
  renderOverviewCharts();
  if (currentPage === "charts") renderAnalysisCharts();
  if (currentPage === "calendar") renderCalendar();
}

function loadDemoData() {
  const strategies = [
    "Breakout",
    "MA Cross",
    "Scalping",
    "Support/Resistance",
    "Trend Following",
    "VWAP Pullback",
  ];
  const ps = ["VN30F2506", "VN30F2507"];
  const cp = ["HPG", "FPT", "VNM", "MWG", "TCB", "VCB", "MBB", "SSI"];
  const sessions = ["ATO", "Sáng", "Chiều", "ATC"];
  const moods = [
    "😌 Bình tĩnh",
    "🔥 Tự tin",
    "😰 Lo lắng",
    "🎯 Kỷ luật",
    "🧊 Kiên nhẫn",
  ];
  let balance = CONFIG.vonBanDau;
  const start = new Date();
  start.setDate(start.getDate() - 110);
  start.setHours(9, 15, 0, 0);
  const trades = [];
  for (let i = 0; i < 96; i++) {
    const isPS = Math.random() > 0.42;
    const entry = new Date(
      start.getTime() + i * (22 + Math.random() * 18) * 36e5,
    );
    const close = new Date(entry.getTime() + (1 + Math.random() * 22) * 36e5);
    const position = Math.random() > 0.5 ? "LONG" : "SHORT";
    const asset = isPS ? "Phái sinh" : "Cổ phiếu";
    const ticker = isPS ? pick(ps) : pick(cp);
    let entryPrice,
      sl,
      tp,
      exitPrice,
      volume,
      move,
      gross,
      fee,
      tax = 0;
    if (isPS) {
      entryPrice = 1240 + Math.round(Math.random() * 115);
      const sd = 4 + Math.round(Math.random() * 10),
        td = 8 + Math.round(Math.random() * 22);
      sl = position === "LONG" ? entryPrice - sd : entryPrice + sd;
      tp = position === "LONG" ? entryPrice + td : entryPrice - td;
      volume = 1 + Math.floor(Math.random() * 4);
      move =
        Math.round(pick([-sd, -sd * 0.65, 0, td * 0.45, td, td * 1.25]) * 10) /
        10;
      exitPrice = position === "LONG" ? entryPrice + move : entryPrice - move;
      gross = move * volume * CONFIG.diemToVND;
      fee = volume * CONFIG.phiPS * 2;
    } else {
      entryPrice = Math.round((18 + Math.random() * 75) * 10) / 10;
      const sp = 0.025 + Math.random() * 0.055,
        tpct = 0.035 + Math.random() * 0.09;
      sl =
        Math.round(entryPrice * (position === "LONG" ? 1 - sp : 1 + sp) * 10) /
        10;
      tp =
        Math.round(
          entryPrice * (position === "LONG" ? 1 + tpct : 1 - tpct) * 10,
        ) / 10;
      volume = (1 + Math.floor(Math.random() * 12)) * 100;
      const signed = (Math.random() - 0.43) * 0.11;
      exitPrice =
        Math.round(
          entryPrice * (1 + (position === "LONG" ? signed : -signed)) * 10,
        ) / 10;
      move =
        Math.round(
          (position === "LONG"
            ? exitPrice - entryPrice
            : entryPrice - exitPrice) * 10,
        ) / 10;
      gross = move * volume * 1000;
      fee = (entryPrice + exitPrice) * volume * 1000 * CONFIG.phiCP;
      tax = exitPrice * volume * 1000 * CONFIG.thueBanCP;
    }
    const net = Math.round(gross - fee - tax);
    balance += net;
    trades.push(
      normalizeTrade({
        stt: i + 1,
        trang_thai: net > 5e4 ? "Thắng" : net < -5e4 ? "Thua" : "Hòa",
        loai_tai_san: asset,
        ma_gd: ticker,
        chien_luoc: pick(strategies),
        vi_the: position,
        phien: pick(sessions),
        ngay_gio_vao: entry,
        ngay_gio_dong: close,
        thoi_gian_gd: `${Math.max(1, Math.round((close - entry) / 36e5))} giờ`,
        khoi_luong: volume,
        gia_vao: entryPrice,
        cat_lo: sl,
        chot_loi: tp,
        gia_dong: exitPrice,
        diem_thuc_te: move,
        rr_ky_vong: calcRR(entryPrice, sl, tp),
        lai_lo_gop: Math.round(gross),
        phi_gd: Math.round(fee + tax),
        thue: Math.round(tax),
        lai_lo_rong: net,
        so_du_da_dong: Math.round(balance),
        tam_ly: pick(moods),
        ghi_chu: i % 7 === 0 ? "Tuân thủ setup, cần tối ưu điểm thoát." : "",
      }),
    );
  }
  allTrades = trades;
  applyFilters();
  updateDataStatus(
    "demo",
    `Đang dùng dữ liệu demo: ${trades.length} lệnh để kiểm thử dashboard.`,
  );
  hideLoading();
}
async function loadSheetData() {
  const { sheetId, apiKey } = getSettings();
  if (!sheetId || !apiKey) return false;
  const range = encodeURIComponent("JOURNAL!A1:X2000");
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sheetId)}/values/${range}?key=${encodeURIComponent(apiKey)}&valueRenderOption=FORMATTED_VALUE&dateTimeRenderOption=FORMATTED_STRING`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Google Sheets API ${res.status}`);
  const data = await res.json();
  const trades = parseJournalRows(data.values || []);
  if (!trades.length) throw new Error("Không có dữ liệu hợp lệ trong JOURNAL");
  allTrades = trades;
  applyFilters();
  updateDataStatus(
    "live",
    `Đã đồng bộ Google Sheets: ${trades.length} lệnh từ JOURNAL.`,
  );
  hideLoading();
  return true;
}
function parseJournalRows(rows) {
  if (rows.length < 2) return [];
  const headers = rows[0].map(normalizeHeader);
  let running = CONFIG.vonBanDau;
  return rows
    .slice(1)
    .map((row, i) => {
      const t = rowToTrade(row, headers, i, running);
      if (t && isClosedTrade(t)) running = t.so_du_da_dong;
      return t;
    })
    .filter(Boolean);
}
function rowToTrade(row, headers, index, previousBalance) {
  const get = (...names) => {
    for (const name of names) {
      const idx = headers.indexOf(normalizeHeader(name));
      if (idx >= 0 && row[idx] !== undefined && row[idx] !== "")
        return row[idx];
    }
    return "";
  };
  const ticker = get("Mã GD", "Ma GD");
  if (!ticker) return null;
  const entry = toDate(
    get("Ngày & Giờ Vào", "Ngày Mở", "Ngay Mo"),
    get("Giờ Mở", "Gio Mo"),
  );
  const closeRaw = get("Ngày & Giờ Đóng", "Ngày Đóng", "Ngay Dong");
  const close = closeRaw ? toDate(closeRaw, get("Giờ Đóng", "Gio Dong")) : null;
  const net = toNumber(get("Lãi/Lỗ Ròng", "Lai/Lo Rong"));
  const entryPrice = toNumber(get("Giá Vào", "Gia Vao"));
  const sl = toNumber(get("Cắt Lỗ (SL)", "Cắt Lỗ SL", "Cat Lo (SL)", "Cat Lo"));
  const tp = toNumber(
    get("Chốt Lời (TP)", "Chốt Lời TP", "Chot Loi (TP)", "Chot Loi"),
  );
  return normalizeTrade({
    stt: toNumber(get("STT", "#")) || index + 1,
    trang_thai: String(
      get("Trạng Thái", "Trang Thai") ||
        (close ? statusFromPnl(net) : "Đang mở"),
    ),
    loai_tai_san: String(get("Loại TS", "Tài Sản", "Tai San")),
    ma_gd: String(ticker),
    chien_luoc: String(get("Chiến Lược", "Chien Luoc") || "Chưa phân loại"),
    vi_the: String(get("Vị Thế", "Vi The")).toUpperCase(),
    phien: String(get("Phiên", "Loại Lệnh", "Loai Lenh") || "Khác"),
    ngay_gio_vao: entry,
    ngay_gio_dong: close,
    thoi_gian_gd: String(get("TG Giao Dịch", "Số Ngày", "So Ngay")),
    khoi_luong: toNumber(get("Số HĐ/CP", "Số HĐ", "Khối Lượng", "Khoi Luong")),
    gia_vao: entryPrice,
    cat_lo: sl,
    chot_loi: tp,
    gia_dong: toNumber(get("Giá Đóng", "Gia Dong")),
    diem_thuc_te: toNumber(get("Điểm Thực Tế", "Biên Độ", "Bien Do")),
    rr_ky_vong: toNumber(get("R:R Kỳ Vọng")) || calcRR(entryPrice, sl, tp),
    lai_lo_gop: toNumber(get("Lãi/Lỗ Gộp", "Lai/Lo Gop")),
    phi_gd: toNumber(get("Phí GD", "Phí & Thuế", "Phi & Thue")),
    thue: toNumber(get("Thuế", "Thue")),
    lai_lo_rong: net,
    so_du_da_dong:
      toNumber(get("Số Dư Đã Đóng", "So Du Da Dong")) ||
      (close ? previousBalance + net : previousBalance),
    tam_ly: String(get("Tâm Lý", "Tam Ly")),
    ghi_chu: String(get("Ghi Chú", "Ghi Chú Review", "Ghi Chu Review")),
  });
}
function normalizeTrade(t) {
  const entry = validDate(t.ngay_gio_vao) || new Date();
  const close = validDate(t.ngay_gio_dong);
  return {
    ...t,
    trang_thai: normalizeStatus(t.trang_thai, t.lai_lo_rong, close),
    loai_tai_san: normalizeAsset(t.loai_tai_san),
    vi_the: normalizePosition(t.vi_the),
    ngay_gio_vao: entry,
    ngay_gio_dong: close,
    chien_luoc: t.chien_luoc || "Chưa phân loại",
    phien: t.phien || "Khác",
    lai_lo_rong: Number(t.lai_lo_rong) || 0,
    lai_lo_gop: Number(t.lai_lo_gop) || 0,
    phi_gd: Number(t.phi_gd) || 0,
    so_du_da_dong: Number(t.so_du_da_dong) || CONFIG.vonBanDau,
    rr_ky_vong: Number.isFinite(Number(t.rr_ky_vong))
      ? Number(t.rr_ky_vong)
      : 0,
  };
}
function applyFilters() {
  const period = getValue("filterPeriod", "month"),
    asset = getValue("filterAsset", "all"),
    strategy = getValue("filterStrategy", "all"),
    ticker = getValue("filterTicker", "all"),
    status = getValue("filterStatus", "all");
  filteredTrades = allTrades
    .filter((t) => {
      if (
        asset !== "all" &&
        t.loai_tai_san !== (asset === "phai_sinh" ? "Phái sinh" : "Cổ phiếu")
      )
        return false;
      if (strategy !== "all" && t.chien_luoc !== strategy) return false;
      if (ticker !== "all" && t.ma_gd !== ticker) return false;
      if (status !== "all" && !matchesStatus(t, status)) return false;
      return isInPeriod(t.ngay_gio_vao, period);
    })
    .sort((a, b) => a.ngay_gio_vao - b.ngay_gio_vao || a.stt - b.stt);
  populateSelect(
    "filterStrategy",
    uniqueSorted(allTrades.map((t) => t.chien_luoc)),
    strategy,
  );
  populateSelect(
    "filterTicker",
    uniqueSorted(allTrades.map((t) => t.ma_gd)),
    ticker,
  );
  updateKPIs();
  renderOverviewCharts();
  renderTradeTable();
  if (currentPage === "charts") renderAnalysisCharts();
  if (currentPage === "calendar") renderCalendar();
  if (currentPage === "journal") renderFullTable();
}
function updateKPIs() {
  const trades = filteredTrades,
    closed = trades.filter(isClosedTrade),
    wins = closed.filter(isWinTrade),
    losses = closed.filter(isLoseTrade),
    draws = closed.filter(isDrawTrade),
    opens = trades.filter(isOpenTrade);
  const net = closed.reduce((s, t) => s + t.lai_lo_rong, 0),
    winPnl = wins.reduce((s, t) => s + t.lai_lo_rong, 0),
    lossPnl = losses.reduce((s, t) => s + t.lai_lo_rong, 0);
  const wr = closed.length ? (wins.length / closed.length) * 100 : 0,
    pf =
      Math.abs(lossPnl) > 0
        ? winPnl / Math.abs(lossPnl)
        : winPnl > 0
          ? Infinity
          : 0,
    avgRR = closed.length
      ? closed.reduce((s, t) => s + (t.rr_ky_vong || 0), 0) / closed.length
      : 0,
    avgWin = wins.length ? winPnl / wins.length : 0,
    avgLoss = losses.length ? lossPnl / losses.length : 0,
    expectancy = closed.length
      ? (wins.length / closed.length) * avgWin +
        (losses.length / closed.length) * avgLoss
      : 0,
    dd = calculateMaxDrawdown(closed);
  setText("kpiTotalTrades", trades.length);
  setText("kpiTotalChange", `${closed.length} đóng`);
  setText("kpiWinRate", wr.toFixed(1) + "%");
  setText("kpiNetPnl", formatVND(net));
  setText("kpiBalance", formatVND(CONFIG.vonBanDau + net));
  setText("kpiMaxDD", (dd * 100).toFixed(2) + "%");
  setText("kpiProfitFactor", Number.isFinite(pf) ? pf.toFixed(2) : "∞");
  setText("kpiAvgRRR", avgRR.toFixed(2));
  setText("kpiExpectancy", formatVND(Math.round(expectancy)));
  setText("statWinCount", wins.length);
  setText("statLoseCount", losses.length);
  setText("statDrawCount", draws.length);
  setText("statOpenCount", opens.length);
  setText("tradeCount", `${trades.length} lệnh`);
  const card = document.getElementById("kpiPnlCard");
  if (card) card.className = "kpi-card " + (net >= 0 ? "profit" : "loss");
  updateInsights({ closed, wins, losses, opens, wr, net, pf, expectancy, dd });
}
function updateInsights(m) {
  const quality =
    m.closed.length < 10
      ? "Chưa đủ mẫu"
      : m.pf >= 1.5 && m.expectancy > 0
        ? "Edge tích cực"
        : m.net >= 0
          ? "Ổn định"
          : "Cần siết rủi ro";
  const best = bestByGroup(m.closed, "chien_luoc");
  setText("insightQuality", quality);
  setText(
    "insightQualityText",
    m.closed.length
      ? `${m.closed.length} lệnh đóng · Winrate ${m.wr.toFixed(1)}% · Expectancy ${formatVNDShort(m.expectancy)}`
      : "Chưa có lệnh đóng trong bộ lọc này",
  );
  setText("insightBestEdge", best ? best.label : "—");
  setText(
    "insightBestEdgeText",
    best
      ? `${formatVND(best.value)} từ chiến lược tốt nhất`
      : "Chưa có dữ liệu chiến lược",
  );
  setText(
    "insightRisk",
    m.dd <= -0.08
      ? "Cảnh báo cao"
      : m.opens.length
        ? `${m.opens.length} lệnh mở`
        : "Được kiểm soát",
  );
  setText(
    "insightRiskText",
    `Max DD ${(m.dd * 100).toFixed(2)}% · P/L ${formatVNDShort(m.net)}`,
  );
}
function renderOverviewCharts() {
  renderEquityChart();
  renderWinLoseChart();
  renderDailyPnlChart();
}
function renderEquityChart() {
  destroyChart("equity");
  const ctx = document.getElementById("equityChart");
  if (!ctx || !window.Chart) return;
  const trades = filterForEquityPeriod(filteredTrades.filter(isClosedTrade));
  let bal = CONFIG.vonBanDau;
  const labels = ["Bắt đầu"],
    data = [bal];
  trades.forEach((t) => {
    bal += t.lai_lo_rong;
    labels.push(formatDateShort(t.ngay_gio_vao));
    data.push(bal);
  });
  charts.equity = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          data,
          borderColor: COLORS.green,
          backgroundColor: "rgba(16,185,129,.12)",
          fill: true,
          tension: 0.35,
          pointRadius: 0,
          pointHoverRadius: 4,
          borderWidth: 2,
        },
      ],
    },
    options: chartOptions({ legend: false, yMoney: true, xMaxTicks: 8 }),
  });
}
function renderWinLoseChart() {
  destroyChart("winLose");
  const ctx = document.getElementById("winLoseChart");
  if (!ctx || !window.Chart) return;
  const c = filteredTrades.filter(isClosedTrade);
  charts.winLose = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Thắng", "Thua", "Hòa"],
      datasets: [
        {
          data: [
            c.filter(isWinTrade).length,
            c.filter(isLoseTrade).length,
            c.filter(isDrawTrade).length,
          ],
          backgroundColor: [COLORS.green, COLORS.red, COLORS.gold],
          borderWidth: 0,
          hoverOffset: 6,
        },
      ],
    },
    options: doughnutOptions(),
  });
}
function renderDailyPnlChart() {
  destroyChart("dailyPnl");
  const ctx = document.getElementById("dailyPnlChart");
  if (!ctx || !window.Chart) return;
  const by = groupSum(filteredTrades.filter(isClosedTrade), (t) =>
    dateKey(t.ngay_gio_vao),
  );
  const keys = Object.keys(by).sort();
  const data = keys.map((k) => by[k]);
  charts.dailyPnl = new Chart(ctx, {
    type: "bar",
    data: {
      labels: keys.map(formatISODateLabel),
      datasets: [
        {
          data,
          backgroundColor: barColors(data),
          borderRadius: 6,
          borderSkipped: false,
        },
      ],
    },
    options: chartOptions({ legend: false, yMoney: true, xMaxTicks: 14 }),
  });
}
function renderAnalysisCharts() {
  renderGroupChart("strategy", "strategyChart", "chien_luoc", true);
  renderWeekdayChart();
  renderAssetChart();
  renderGroupChart("session", "sessionChart", "phien", false);
}
function renderGroupChart(name, id, field, horizontal) {
  destroyChart(name);
  const ctx = document.getElementById(id);
  if (!ctx || !window.Chart) return;
  const groups = sortedGroupData(
    filteredTrades.filter(isClosedTrade),
    field,
  ).slice(0, 8);
  const data = groups.map((g) => g.value);
  charts[name] = new Chart(ctx, {
    type: "bar",
    data: {
      labels: groups.map((g) => g.label),
      datasets: [{ data, backgroundColor: barColors(data), borderRadius: 8 }],
    },
    options: chartOptions({
      axis: horizontal ? "y" : "x",
      legend: false,
      yMoney: !horizontal,
      xMoney: horizontal,
    }),
  });
}
function renderWeekdayChart() {
  destroyChart("weekday");
  const ctx = document.getElementById("weekdayChart");
  if (!ctx || !window.Chart) return;
  const labels = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"],
    data = new Array(7).fill(0);
  filteredTrades
    .filter(isClosedTrade)
    .forEach((t) => (data[(t.ngay_gio_vao.getDay() + 6) % 7] += t.lai_lo_rong));
  charts.weekday = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{ data, backgroundColor: barColors(data), borderRadius: 8 }],
    },
    options: chartOptions({ legend: false, yMoney: true }),
  });
}
function renderAssetChart() {
  destroyChart("asset");
  const ctx = document.getElementById("assetChart");
  if (!ctx || !window.Chart) return;
  const groups = sortedGroupData(
    filteredTrades.filter(isClosedTrade),
    "loai_tai_san",
  );
  charts.asset = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: groups.map((g) => `${g.label} (${formatVNDShort(g.value)})`),
      datasets: [
        {
          data: groups.map((g) => Math.abs(g.value)),
          backgroundColor: [COLORS.blue, COLORS.purple, COLORS.gold],
          borderWidth: 0,
        },
      ],
    },
    options: doughnutOptions(),
  });
}
function renderTradeTable() {
  const tbody = document.getElementById("tradeTableBody");
  if (!tbody) return;
  const recent = [...filteredTrades]
    .sort((a, b) => b.ngay_gio_vao - a.ngay_gio_vao)
    .slice(0, 20);
  if (!recent.length) {
    tbody.innerHTML = emptyRow(12, "Không có dữ liệu theo bộ lọc hiện tại");
    return;
  }
  tbody.innerHTML = recent
    .map(
      (t) =>
        `<tr><td>${escapeHtml(t.stt)}</td><td><span class="status-badge ${statusClass(t)}">${escapeHtml(t.trang_thai)}</span></td><td>${escapeHtml(t.loai_tai_san)}</td><td class="ticker-cell">${escapeHtml(t.ma_gd)}</td><td><span class="position-badge ${posClass(t.vi_the)}">${escapeHtml(t.vi_the)}</span></td><td>${formatNumber(t.khoi_luong)}</td><td class="mono">${formatPrice(t.gia_vao)}</td><td class="mono">${formatPrice(t.gia_dong)}</td><td class="pnl-value ${valueClass(t.diem_thuc_te)}">${formatSignedNumber(t.diem_thuc_te)}</td><td class="pnl-value ${valueClass(t.lai_lo_rong)}">${formatVND(t.lai_lo_rong)}</td><td>${formatDateShort(t.ngay_gio_vao)}</td><td>${escapeHtml(t.chien_luoc)}</td></tr>`,
    )
    .join("");
}
function renderFullTable() {
  const tbody = document.getElementById("fullTradeTableBody");
  if (!tbody) return;
  setText("fullTradeCount", `${filteredTrades.length} lệnh`);
  if (!filteredTrades.length) {
    tbody.innerHTML = emptyRow(23, "Không có giao dịch để hiển thị");
    return;
  }
  tbody.innerHTML = filteredTrades
    .map(
      (t) =>
        `<tr><td>${escapeHtml(t.stt)}</td><td><span class="status-badge ${statusClass(t)}">${escapeHtml(t.trang_thai)}</span></td><td>${escapeHtml(t.loai_tai_san)}</td><td class="ticker-cell">${escapeHtml(t.ma_gd)}</td><td>${escapeHtml(t.chien_luoc)}</td><td><span class="position-badge ${posClass(t.vi_the)}">${escapeHtml(t.vi_the)}</span></td><td>${escapeHtml(t.phien)}</td><td>${formatDateShort(t.ngay_gio_vao)}</td><td>${t.ngay_gio_dong ? formatDateShort(t.ngay_gio_dong) : "—"}</td><td>${escapeHtml(t.thoi_gian_gd || "—")}</td><td>${formatNumber(t.khoi_luong)}</td><td class="mono">${formatPrice(t.gia_vao)}</td><td class="mono">${formatPrice(t.cat_lo)}</td><td class="mono">${formatPrice(t.chot_loi)}</td><td class="mono">${formatPrice(t.gia_dong)}</td><td class="pnl-value ${valueClass(t.diem_thuc_te)}">${formatSignedNumber(t.diem_thuc_te)}</td><td>${formatPrice(t.rr_ky_vong)}</td><td class="pnl-value ${valueClass(t.lai_lo_gop)}">${formatVND(t.lai_lo_gop)}</td><td>${formatVND(Math.abs(t.phi_gd || 0))}</td><td class="pnl-value ${valueClass(t.lai_lo_rong)}">${formatVND(t.lai_lo_rong)}</td><td class="mono">${formatVND(t.so_du_da_dong)}</td><td>${escapeHtml(t.tam_ly || "—")}</td><td class="note-cell">${escapeHtml(t.ghi_chu || "—")}</td></tr>`,
    )
    .join("");
}
function renderCalendar() {
  const grid = document.getElementById("calendarGrid");
  if (!grid) return;
  const y = calendarDate.getFullYear(),
    m = calendarDate.getMonth();
  setText("calendarMonth", `Tháng ${m + 1}/${y}`);
  const by = {};
  filteredTrades.filter(isClosedTrade).forEach((t) => {
    if (t.ngay_gio_vao.getFullYear() === y && t.ngay_gio_vao.getMonth() === m)
      by[t.ngay_gio_vao.getDate()] =
        (by[t.ngay_gio_vao.getDate()] || 0) + t.lai_lo_rong;
  });
  const days = new Date(y, m + 1, 0).getDate(),
    first = new Date(y, m, 1).getDay() || 7;
  let html = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"]
    .map((d) => `<div class="calendar-head">${d}</div>`)
    .join("");
  for (let i = 1; i < first; i++) html += "<div></div>";
  for (let d = 1; d <= days; d++) {
    const pnl = by[d] || 0;
    html += `<div class="calendar-day ${valueClass(pnl)}"><span>${d}</span><strong>${pnl ? formatVNDShort(pnl) : "—"}</strong></div>`;
  }
  grid.innerHTML = html;
}
function calendarPrev() {
  calendarDate.setMonth(calendarDate.getMonth() - 1);
  renderCalendar();
}
function calendarNext() {
  calendarDate.setMonth(calendarDate.getMonth() + 1);
  renderCalendar();
}
async function refreshData() {
  showLoading();
  try {
    const loaded = await loadSheetData();
    if (!loaded) loadDemoData();
  } catch (e) {
    console.warn("Không tải được Google Sheets, dùng dữ liệu demo:", e);
    updateDataStatus(
      "warning",
      `Không tải được Google Sheets (${e.message}). Đang dùng demo an toàn.`,
    );
    loadDemoData();
  }
}
function exportReport() {
  const rows = filteredTrades.map((t) => ({
    STT: t.stt,
    "Trạng thái": t.trang_thai,
    "Tài sản": t.loai_tai_san,
    "Mã GD": t.ma_gd,
    "Chiến lược": t.chien_luoc,
    "Lãi/Lỗ ròng": t.lai_lo_rong,
  }));
  const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `khanghang-dashboard-${dateKey(new Date())}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
function saveSettings() {
  localStorage.setItem(
    SETTINGS_KEY,
    JSON.stringify({
      sheetId: getValue("settingSheetId", "").trim(),
      apiKey: getValue("settingApiKey", "").trim(),
    }),
  );
  updateDataStatus(
    "warning",
    "Đã lưu cài đặt. Đang thử kết nối Google Sheets...",
  );
  refreshData();
}
function setEquityPeriod(p) {
  equityPeriod = p;
  document
    .querySelectorAll(".chart-actions .chart-btn")
    .forEach((b) => b.classList.remove("active"));
  Array.from(document.querySelectorAll(".chart-actions .chart-btn"))
    .find((b) => b.getAttribute("onclick")?.includes(`'${p}'`))
    ?.classList.add("active");
  renderEquityChart();
}
function filterForEquityPeriod(trades) {
  if (equityPeriod === "all") return trades;
  const now = new Date(),
    cut = new Date(now);
  if (equityPeriod === "week") cut.setDate(now.getDate() - 7);
  if (equityPeriod === "month") cut.setMonth(now.getMonth() - 1);
  return trades.filter((t) => t.ngay_gio_vao >= cut);
}
function isInPeriod(date, period) {
  if (period === "all") return true;
  const now = new Date(),
    start = new Date(now);
  start.setHours(0, 0, 0, 0);
  if (period === "today") return date >= start;
  if (period === "week") {
    start.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    return date >= start;
  }
  if (period === "month")
    return (
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth()
    );
  if (period === "quarter") {
    const q = Math.floor(now.getMonth() / 3) * 3;
    return (
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() >= q &&
      date.getMonth() <= now.getMonth()
    );
  }
  if (period === "year") return date.getFullYear() === now.getFullYear();
  return true;
}
function chartOptions({
  axis,
  legend = true,
  yMoney = false,
  xMoney = false,
  xMaxTicks = 10,
} = {}) {
  return {
    indexAxis: axis === "y" ? "y" : "x",
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: {
        display: legend,
        labels: { color: COLORS.tick, usePointStyle: true },
      },
      tooltip: {
        callbacks: {
          label: (c) => formatVND(c.parsed?.y ?? c.parsed?.x ?? c.raw),
        },
      },
    },
    scales: {
      x: {
        ticks: {
          color: COLORS.tick,
          maxTicksLimit: xMaxTicks,
          callback: xMoney ? (v) => formatVNDShort(v) : undefined,
        },
        grid: { color: axis === "y" ? COLORS.grid : "transparent" },
      },
      y: {
        ticks: {
          color: COLORS.tick,
          callback: yMoney ? (v) => formatVNDShort(v) : undefined,
        },
        grid: { color: axis === "y" ? "transparent" : COLORS.grid },
      },
    },
  };
}
function doughnutOptions() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "68%",
    plugins: {
      legend: {
        position: "bottom",
        labels: { color: COLORS.tick, padding: 14, usePointStyle: true },
      },
    },
  };
}
function destroyChart(n) {
  if (charts[n]) charts[n].destroy();
  charts[n] = null;
}
function calculateMaxDrawdown(trades) {
  let bal = CONFIG.vonBanDau,
    peak = bal,
    max = 0;
  trades.forEach((t) => {
    bal += t.lai_lo_rong;
    peak = Math.max(peak, bal);
    max = Math.min(max, (bal - peak) / peak);
  });
  return max;
}
function groupSum(trades, keyGetter) {
  return trades.reduce((a, t) => {
    const k = keyGetter(t) || "Khác";
    a[k] = (a[k] || 0) + t.lai_lo_rong;
    return a;
  }, {});
}
function sortedGroupData(trades, field) {
  return Object.entries(groupSum(trades, (t) => t[field]))
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
}
function bestByGroup(trades, field) {
  return sortedGroupData(trades, field)
    .filter((i) => i.value > 0)
    .sort((a, b) => b.value - a.value)[0];
}
function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "vi"),
  );
}
function populateSelect(id, values, current) {
  const sel = document.getElementById(id);
  if (!sel) return;
  const val = values.includes(current) ? current : "all";
  sel.innerHTML =
    '<option value="all">Tất cả</option>' +
    values
      .map((v) => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`)
      .join("");
  sel.value = val;
}
function matchesStatus(t, s) {
  if (s === "Win") return isWinTrade(t);
  if (s === "Lose") return isLoseTrade(t);
  if (s === "Hòa") return isDrawTrade(t);
  if (s === "Đang mở") return isOpenTrade(t);
  return true;
}
function isClosedTrade(t) {
  return !isOpenTrade(t);
}
function isOpenTrade(t) {
  return normalizeText(t.trang_thai).includes("dang mo") || !t.ngay_gio_dong;
}
function isWinTrade(t) {
  return (
    normalizeText(t.trang_thai).includes("thang") ||
    (!isOpenTrade(t) && t.lai_lo_rong > 0)
  );
}
function isLoseTrade(t) {
  return (
    normalizeText(t.trang_thai).includes("thua") ||
    (!isOpenTrade(t) && t.lai_lo_rong < 0)
  );
}
function isDrawTrade(t) {
  return (
    normalizeText(t.trang_thai).includes("hoa") ||
    (!isOpenTrade(t) && t.lai_lo_rong === 0)
  );
}
function normalizeStatus(status, pnl, close) {
  const text = normalizeText(status);
  if (!close || text.includes("dang mo") || text.includes("open"))
    return "Đang mở";
  if (text.includes("thang") || text.includes("win")) return "Thắng";
  if (text.includes("thua") || text.includes("lose")) return "Thua";
  if (text.includes("hoa") || text.includes("draw")) return "Hòa";
  return statusFromPnl(pnl);
}
function statusFromPnl(pnl) {
  return pnl > 0 ? "Thắng" : pnl < 0 ? "Thua" : "Hòa";
}
function normalizeAsset(asset) {
  const t = normalizeText(asset);
  if (t.includes("phai") || t.includes("ps") || t.includes("future"))
    return "Phái sinh";
  if (t.includes("co phieu") || t === "cp" || t.includes("stock"))
    return "Cổ phiếu";
  return asset || "Khác";
}
function normalizePosition(pos) {
  const t = normalizeText(pos);
  if (t.includes("short") || t.includes("ban")) return "SHORT";
  if (t.includes("long") || t.includes("mua")) return "LONG";
  return String(pos || "—").toUpperCase();
}
function normalizeHeader(v) {
  return normalizeText(v)
    .replace(/[^a-z0-9:/ ]/g, "")
    .trim();
}
function normalizeText(v) {
  return String(v || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}
function calcRR(entry, sl, tp) {
  const risk = Math.abs(entry - sl),
    reward = Math.abs(tp - entry);
  return risk && reward ? Math.round((reward / risk) * 100) / 100 : 0;
}
function toNumber(v) {
  if (typeof v === "number") return v;
  const raw = String(v || "").trim();
  if (!raw) return 0;
  const negative = /^\(.*\)$/.test(raw) || raw.includes("-");
  const cleaned = raw.replace(/[()₫đvndVNĐ\s+]/g, "").replace(/,/g, ".");
  const parts = cleaned.split(".");
  const normalized = parts.length > 2 ? parts.join("") : cleaned;
  const n = Number(normalized.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? (negative ? -Math.abs(n) : n) : 0;
}
function toDate(v, time = "") {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (typeof v === "number")
    return new Date(Math.round((v - 25569) * 86400 * 1000));
  const combined = normalizeTimeValue(time)
    ? `${String(v).trim()} ${normalizeTimeValue(time)}`
    : String(v).trim();
  const m = combined.match(
    /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/,
  );
  if (m) {
    const [, d, mo, y, h = "0", mi = "0", s = "0"] = m;
    return new Date(
      Number(y.length === 2 ? "20" + y : y),
      Number(mo) - 1,
      Number(d),
      Number(h),
      Number(mi),
      Number(s),
    );
  }
  const parsed = new Date(combined);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
function normalizeTimeValue(v) {
  if (!v) return "";
  if (typeof v === "number") {
    const sec = Math.round(v * 86400),
      h = String(Math.floor(sec / 3600)).padStart(2, "0"),
      m = String(Math.floor((sec % 3600) / 60)).padStart(2, "0");
    return `${h}:${m}`;
  }
  return String(v).trim();
}
function validDate(v) {
  return v instanceof Date && !Number.isNaN(v.getTime()) ? v : null;
}
function dateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function formatISODateLabel(v) {
  const [, m, d] = v.split("-");
  return `${d}/${m}`;
}
function formatDateShort(d) {
  return validDate(d)
    ? d.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
      })
    : "—";
}
function formatVND(v) {
  const n = Number(v) || 0,
    sign = n > 0 ? "+" : n < 0 ? "-" : "";
  return sign + Math.abs(Math.round(n)).toLocaleString("vi-VN");
}
function formatVNDShort(v) {
  const n = Number(v) || 0,
    a = Math.abs(n),
    s = n > 0 ? "+" : n < 0 ? "-" : "";
  if (a >= 1e9) return `${s}${(a / 1e9).toFixed(1)} tỷ`;
  if (a >= 1e6) return `${s}${(a / 1e6).toFixed(1)} tr`;
  if (a >= 1e3) return `${s}${(a / 1e3).toFixed(0)}k`;
  return s + Math.round(a);
}
function formatNumber(v) {
  return (Number(v) || 0).toLocaleString("vi-VN");
}
function formatPrice(v) {
  const n = Number(v) || 0;
  return n ? n.toLocaleString("vi-VN", { maximumFractionDigits: 2 }) : "—";
}
function formatSignedNumber(v) {
  const n = Number(v) || 0;
  return (
    (n > 0 ? "+" : "") + n.toLocaleString("vi-VN", { maximumFractionDigits: 2 })
  );
}
function valueClass(v) {
  return v > 0 ? "positive" : v < 0 ? "negative" : "zero";
}
function statusClass(t) {
  return isWinTrade(t)
    ? "win"
    : isLoseTrade(t)
      ? "lose"
      : isDrawTrade(t)
        ? "draw"
        : "open";
}
function posClass(p) {
  return normalizeText(p).replace(/[^a-z0-9]/g, "") || "unknown";
}
function barColors(data) {
  return data.map((v) =>
    v > 0
      ? "rgba(16,185,129,.78)"
      : v < 0
        ? "rgba(239,68,68,.78)"
        : "rgba(100,116,139,.55)",
  );
}
function setText(id, v) {
  const el = document.getElementById(id);
  if (el) el.textContent = v;
}
function setValue(id, v) {
  const el = document.getElementById(id);
  if (el) el.value = v;
}
function getValue(id, f = "") {
  return document.getElementById(id)?.value ?? f;
}
function showLoading() {
  document.getElementById("loadingOverlay")?.classList.remove("hidden");
}
function hideLoading() {
  document.getElementById("loadingOverlay")?.classList.add("hidden");
}
function pick(a) {
  return a[Math.floor(Math.random() * a.length)];
}
function updateDataStatus(type, msg) {
  const el = document.getElementById("dataStatus");
  if (el) el.className = "data-status " + type;
  setText("dataStatusText", msg);
}
function emptyRow(colspan, msg) {
  return `<tr><td colspan="${colspan}" class="empty-state"><div class="empty-state-icon">📭</div><p>${escapeHtml(msg)}</p></td></tr>`;
}
function escapeHtml(v) {
  return String(v ?? "").replace(
    /[&<>'"]/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[
        c
      ],
  );
}
function toCsv(rows) {
  if (!rows.length) return "";
  const h = Object.keys(rows[0]);
  return (
    "\uFEFF" +
    [
      h.join(","),
      ...rows.map((r) =>
        h.map((k) => `"${String(r[k] ?? "").replace(/"/g, '""')}"`).join(","),
      ),
    ].join("\n")
  );
}
