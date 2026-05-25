ï»¿const APP_NAME = 'Dahodo Journal Apps Script';
const DEFAULT_SHEET_ID = '1PdCmBoBQsznOx6JXvOlbD-atxQnX9wHRXiM127f109I';
const SHEET_RANGE = 'JOURNAL!A1:Y2000';
const CASHFLOW_RANGE = 'CASHFLOW!A1:E2000';
const FEE_CHARGES_RANGE = 'FEE_CHARGES!A1:N2000';
const CONFIG_RISK_RANGE = 'CONFIG!G3:G7';
const USERS_RANGE = 'USERS!A1:G500';
const ACCOUNT_LIST_RANGES = ['FORMULAS!I2:I200', 'SETUP!AJ2:AJ200'];
const FALLBACK_INITIAL_CAPITAL = 200000000;
const CACHE_TTL_SECONDS = 30;

function doGet(e) {
  const mode = String((e && e.parameter && e.parameter.mode) || '').trim().toLowerCase();
  if (mode === 'api') {
    return jsonOutput(handleApiRequest_(e));
  }

  const template = HtmlService.createTemplateFromFile('Index');
  template.appName = APP_NAME;
  template.defaultSheetId = DEFAULT_SHEET_ID;
  return template
    .evaluate()
    .setTitle(APP_NAME)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function getBootstrapData(sheetId) {
  return getDataset_({ sheetId: sheetId, forceRefresh: false });
}

function refreshBootstrapData(sheetId) {
  return getDataset_({ sheetId: sheetId, forceRefresh: true });
}

function handleApiRequest_(e) {
  try {
    const sheetId = String((e && e.parameter && e.parameter.sheetId) || DEFAULT_SHEET_ID).trim();
    const forceRefresh = String((e && e.parameter && (e.parameter.refresh || e.parameter.force)) || '') === '1';
    return getDataset_({ sheetId: sheetId, forceRefresh: forceRefresh });
  } catch (error) {
    return { ok: false, error: error && error.message ? error.message : String(error) };
  }
}

function getDataset_(options) {
  const sheetId = String((options && options.sheetId) || DEFAULT_SHEET_ID).trim();
  const forceRefresh = Boolean(options && options.forceRefresh);
  if (!sheetId) throw new Error('Missing sheetId');

  const cacheKey = 'dataset:' + sheetId;
  const cache = CacheService.getScriptCache();

  if (!forceRefresh) {
    const cached = cache.get(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      parsed.cached = true;
      return parsed;
    }
  }

  const spreadsheet = SpreadsheetApp.openById(sheetId);
  const journalValues = readRĐangeSafe_(spreadsheet, SHEET_RANGE);
  const cashFlowValues = readRĐangeSafe_(spreadsheet, CASHFLOW_RANGE);
  const feeValues = readRĐangeSafe_(spreadsheet, FEE_CHARGES_RANGE);
  const configValues = readRĐangeSafe_(spreadsheet, CONFIG_RISK_RANGE);
  const userValues = readRĐangeSafe_(spreadsheet, USERS_RANGE);
  const availableAccounts = getAvailableAccounts_(spreadsheet);

  const sheetConfig = mapSheetConfig_(configValues);
  const trades = mapRows_(journalValues, mapCashFlows_(cashFlowValues), sheetConfig ? sheetConfig.initialCapital : FALLBACK_INITIAL_CAPITAL);
  const feeCharges = mapFeeCharges_(feeValues);
  const users = mapUsers_(userValues);

  const payload = {
    ok: true,
    trades: trades,
    feeCharges: feeCharges,
    availableAccounts: availableAccounts,
    sheetConfig: sheetConfig,
    users: users,
    source: 'google-apps-script',
    count: trades.length,
    feeChargeCount: feeCharges.length,
    userCount: users.length,
    cached: false,
    fetchedAt: new Date().toISOString()
  };

  cache.put(cacheKey, JSON.stringify(payload), CACHE_TTL_SECONDS);
  return payload;
}

function jsonOutput(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function readRĐangeSafe_(spreadsheet, a1RĐange) {
  try {
    const match = String(a1RĐange).match(/^([^!]+)!([A-Z]+)(\d+):([A-Z]+)(\d+)$/i);
    if (!match) return [];
    const sheetName = match[1];
    const startCol = a1ToCol_(match[2]);
    const startRow = Number(match[3]);
    const endCol = a1ToCol_(match[4]);
    const endRow = Number(match[5]);
    const sheet = spreadsheet.getSheetByName(sheetName);
    if (!sheet) return [];
    return sheet.getRĐange(startRow, startCol, endRow - startRow + 1, endCol - startCol + 1).getDisplayValues();
  } catch (_error) {
    return [];
  }
}

function a1ToCol_(letters) {
  return String(letters).toUpperCase().split('').reduce(function(sum, ch) {
    return sum * 26 + (ch.charCodeAt(0) - 64);
  }, 0);
}

function normalizeText_(value) {
  return String(value == null ? '' : value)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function parseNumber_(value) {
  if (typeof value === 'number') return isFinite(value) ? value : 0;
  const raw = String(value == null ? '' : value).trim();
  if (!raw) return 0;
  const normalized = raw.replace(/[^\d,.\-]/g, '');
  const commaCount = (normalized.match(/,/g) || []).length;
  const dotCount = (normalized.match(/\./g) || []).length;

  if (commaCount > 0 && dotCount > 0) {
    return normalized.lastIndexOf(',') > normalized.lastIndexOf('.')
      ? Number(normalized.replace(/\./g, '').replace(',', '.')) || 0
      : Number(normalized.replace(/,/g, '')) || 0;
  }
  if (commaCount > 1 && dotCount === 0) return Number(normalized.replace(/,/g, '')) || 0;
  if (dotCount > 1 && commaCount === 0) return Number(normalized.replace(/\./g, '')) || 0;
  if (commaCount === 1 && dotCount === 0) {
    const parts = normalized.split(',');
    return parts[1] && parts[1].length === 3 ? Number(parts[0] + parts[1]) || 0 : Number(normalized.replace(',', '.')) || 0;
  }
  return Number(normalized) || 0;
}

function parsePercent_(value) {
  const parsed = parseNumber_(value);
  return parsed > 1 ? parsed / 100 : parsed;
}

function parseDateTime_(dateStr, timeStr) {
  const dateValue = String(dateStr || '').trim();
  if (!dateValue) return null;
  const timeValue = String(timeStr || '').trim() || '00:00';
  const slash = dateValue.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slash) {
    return new Date(slash[3] + '-' + pad2_(slash[2]) + '-' + pad2_(slash[1]) + 'T' + timeValue);
  }
  const iso = dateValue.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) {
    return new Date(iso[1] + '-' + pad2_(iso[2]) + '-' + pad2_(iso[3]) + 'T' + timeValue);
  }
  const parsed = new Date(dateValue + ' ' + timeValue);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function pad2_(value) {
  return String(value).padStart(2, '0');
}

function headerIndex_(headers, candidates, fallback) {
  const normalizedHeaders = (headers || []).map(function(header) { return normalizeText_(header); });
  for (var i = 0; i < candidates.length; i += 1) {
    const normalizedCandidate = normalizeText_(candidates[i]);
    const index = normalizedHeaders.findIndex(function(header) { return header === normalizedCandidate || header.indexOf(normalizedCandidate) >= 0; });
    if (index >= 0) return index;
  }
  return fallback;
}

function isCashOutflow_(type, note) {
  const normalized = normalizeText_(String(type || '') + ' ' + String(note || ''));
  return normalized.indexOf('rut') >= 0 || normalized.indexOf('withdraw') >= 0 || normalized.indexOf('outflow') >= 0 || normalized.indexOf('chi tien') >= 0;
}

function getDateKey_(value) {
  const date = parseDateTime_(value, '00:00');
  if (!date) return '';
  return date.getFullYear() + '-' + pad2_(date.getMonth() + 1) + '-' + pad2_(date.getDate());
}

function uniqueSortedStrings_(values) {
  const map = {};
  (values || []).forEach(function(value) {
    const normalized = String(value || '').trim();
    if (normalized) map[normalized] = true;
  });
  return Object.keys(map).sort();
}

function normalizeStatus_(value) {
  const normalized = normalizeText_(value);
  if (normalized === 'thĐang') return 'Thắng';
  if (normalized === 'thua') return 'Thua';
  if (normalized === 'hoa') return 'Hòa';
  if (normalized === 'dĐang mo') return 'Đang mở';
    return 'Đang mở';
}

function normalizeAssetType_(value) {
  return normalizeText_(value) === 'phai sinh' ? 'PhÃ¡i sinh' : 'Cá» phiáº¿u';
}

function normalizePosition_(value) {
  return normalizeText_(value) === 'short' ? 'SHORT' : 'LONG';
}

function mapCashFlows_(values) {
  const grouped = {};
  const headers = values && values[0] ? values[0] : [];
  const dateIndex = headerIndex_(headers, ['ngay', 'date'], 0);
  const typeIndex = headerIndex_(headers, ['loai', 'type'], 2);
  const amountIndex = headerIndex_(headers, ['so tien', 'amount', 'gia tri'], 3);
  const noteIndex = headerIndex_(headers, ['ghi chu', 'note', 'noi dung'], 4);

  (values || []).slice(1).forEach(function(row) {
    if (!row || !row.some(function(cell) { return String(cell || '').trim() !== ''; })) return;
    const key = getDateKey_(String(row[dateIndex] || '').trim());
    if (!key) return;
    const amount = Math.abs(parseNumber_(row[amountIndex]));
    if (!amount) return;
    const signedAmount = isCashOutflow_(row[typeIndex], row[noteIndex]) ? -amount : amount;
    grouped[key] = (grouped[key] || 0) + signedAmount;
  });
  return Object.keys(grouped).sort().map(function(key) {
    return { key: key, amount: grouped[key] };
  });
}

function mapFeeCharges_(values) {
  return (values || []).slice(1)
    .filter(function(row) { return row && row.some(function(cell) { return String(cell || '').trim() !== ''; }); })
    .map(function(row, index) {
      return {
        rowNumber: index + 2,
        date: String(row[0] || '').trim(),
        account: String(row[2] || '').trim(),
        category: String(row[4] || 'PhÃÂ­ ÃâÃ¡Â»â¹nh kÃ¡Â»Â³').trim(),
        amount: Math.abs(parseNumber_(row[11] || row[10] || row[9])),
        note: [String(row[3] || '').trim(), String(row[1] || '').trim(), String(row[13] || '').trim()].filter(String).join(' Â· ')
      };
    })
    .filter(function(item) { return item.amount > 0 && item.date; });
}

function mapSheetConfig_(values) {
  const stockCapital = parseNumber_(values[0] && values[0][0]);
  const derivativesCapital = parseNumber_(values[1] && values[1][0]);
  const maxRiskPerTradePct = parsePercent_(values[2] && values[2][0]);
  const monthlyTargetPct = parsePercent_(values[3] && values[3][0]);
  const minRewardRisk = parseNumber_(values[4] && values[4][0]);
  if (![stockCapital, derivativesCapital, maxRiskPerTradePct, monthlyTargetPct, minRewardRisk].some(function(value) { return value > 0; })) {
    return null;
  }
  return {
    initialCapital: stockCapital + derivativesCapital,
    stockCapital: stockCapital,
    derivativesCapital: derivativesCapital,
    maxRiskPerTradePct: maxRiskPerTradePct,
    monthlyTargetPct: monthlyTargetPct,
    minRewardRisk: minRewardRisk
  };
}

function mapAvailableAccounts_(values) {
  return uniqueSortedStrings_((values || []).map(function(row) { return String((row && row[0]) || '').trim(); })
    .filter(function(value) {
      const normalized = normalizeText_(value);
      return value && value !== '*' && normalized !== 'tat ca' && normalized !== 'tai khoan';
    }));
}

function mapUsers_(values) {
  return (values || []).slice(1)
    .filter(function(row) { return row && row.some(function(cell) { return String(cell || '').trim() !== ''; }); })
    .map(function(row, index) {
      return {
        rowNumber: parseInt(String(row[0] || '').trim(), 10) || index + 2,
        username: String(row[1] || '').trim(),
        passwordHash: String(row[2] || '').trim(),
        role: String(row[3] || '').trim(),
        displayName: String(row[4] || '').trim(),
        status: String(row[5] || '').trim(),
        lastLoginAt: String(row[6] || '').trim()
      };
    })
    .filter(function(user) { return user.username && user.passwordHash; });
}

function getAvailableAccounts_(spreadsheet) {
  for (var i = 0; i < ACCOUNT_LIST_RANGES.length; i += 1) {
    const values = readRĐangeSafe_(spreadsheet, ACCOUNT_LIST_RANGES[i]);
    const accounts = mapAvailableAccounts_(values);
    if (accounts.length > 0) return accounts;
  }
  return [];
}

function mapRows_(values, cashFlows, initialCapital) {
  let runningEquity = initialCapital || FALLBACK_INITIAL_CAPITAL;
  let cashFlowIndex = 0;

  const trades = (values || []).slice(1)
    .filter(function(row) { return row && row.some(function(cell) { return String(cell || '').trim() !== ''; }); })
    .map(function(row, index) {
      const netPnL = parseNumber_(row[21]);
      const openDate = String(row[8] || '').trim();
      const openTime = String(row[9] || '').trim();
      const closeDate = String(row[10] || '').trim();
      const closeTime = String(row[11] || '').trim();
      const tradeKey = getDateKey_(closeDate || openDate);
      let cashFlow = 0;

      while (cashFlowIndex < cashFlows.length && (!tradeKey || cashFlows[cashFlowIndex].key <= tradeKey)) {
        cashFlow += cashFlows[cashFlowIndex].amount;
        cashFlowIndex += 1;
      }

      runningEquity += cashFlow + netPnL;

      return {
        rowNumber: index + 2,
        status: normalizeStatus_(row[0]),
        account: String(row[1] || '').trim(),
        orderId: String(row[2] || '').trim(),
        assetType: normalizeAssetType_(row[3]),
        symbol: String(row[4] || '').trim(),
        position: normalizePosition_(row[5]),
        orderType: String(row[6] || '').trim(),
        strategy: String(row[7] || '').trim(),
        openDate: openDate,
        openTime: openTime,
        closeDate: closeDate,
        closeTime: closeTime,
        holdingDays: parseNumber_(row[12]),
        volume: parseNumber_(row[13]),
        entryPrice: parseNumber_(row[14]),
        exitPrice: parseNumber_(row[15]),
        stopLoss: parseNumber_(row[16]),
        takeProfit: parseNumber_(row[17]),
        feesAndTaxes: parseNumber_(row[18]),
        amplitude: parseNumber_(row[19]),
        grossPnL: parseNumber_(row[20]),
        netPnL: netPnL,
        mood: String(row[22] || '').trim(),
        reviewNote: String(row[23] || '').trim(),
        sector: String(row[24] || '').trim(),
        entryDateTime: parseDateTime_(openDate, openTime),
        exitDateTime: parseDateTime_(closeDate, closeTime),
        cashFlow: cashFlow,
        equity: runningEquity
      };
    });

  const trailingCashFlow = cashFlows.slice(cashFlowIndex).reduce(function(sum, item) {
    return sum + item.amount;
  }, 0);

  if (trailingCashFlow) {
    runningEquity += trailingCashFlow;
    if (trades.length > 0) {
      trades[trades.length - 1].cashFlow += trailingCashFlow;
      trades[trades.length - 1].equity = runningEquity;
    }
  }

  return trades;
}

