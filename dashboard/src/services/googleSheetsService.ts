import type { Trade, TradeStatus, AssetType, PositionType, FeeCharge, SheetUser } from '../types.ts';

import type { SheetRuntimeConfig } from '../types.ts';

const SHEET_RANGE = 'JOURNAL!A1:Y2000';
const CASHFLOW_RANGE = 'CASHFLOW!A1:E2000';
const FEE_CHARGES_RANGE = 'FEE_CHARGES!A1:N2000';
const CONFIG_RISK_RANGE = 'CONFIG!G3:G7';
const USERS_RANGE = 'USERS!A1:G500';
const ACCOUNT_LIST_RANGES = ['FORMULAS!I2:I200', 'SETUP!AJ2:AJ200'];
const DEFAULT_SHEET_ID = '1PdCmBoBQsznOx6JXvOlbD-atxQnX9wHRXiM127f109I';
const FALLBACK_INITIAL_CAPITAL = 200_000_000;
const GOOGLE_SHEETS_VALUE_PARAMS = 'valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=SERIAL_NUMBER';
const GOOGLE_SHEETS_EPOCH_MS = Date.UTC(1899, 11, 30);
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const isLocalHost = () => window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const getApiBaseUrl = () => {
  const configured = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || '';
  if (configured) return configured;
  if (!isLocalHost()) return 'https://journal-api.dahodo.com';
  return '';
};

interface CashFlowEvent {
  key: string;
  amount: number;
}

interface ProxyDatasetResponse {
  trades?: Trade[];
  feeCharges?: FeeCharge[];
  availableAccounts?: string[];
  sheetConfig?: SheetRuntimeConfig | null;
  users?: SheetUser[];
  values?: unknown[][];
  error?: { message?: string } | string;
}

interface FetchOptions {
  forceRefresh?: boolean;
}

let proxyDatasetCache: {
  key: string;
  expiresAt: number;
  data: ProxyDatasetResponse | null;
  promise: Promise<ProxyDatasetResponse> | null;
} = {
  key: '',
  expiresAt: 0,
  data: null,
  promise: null,
};

function uniqueSortedStrings(values: string[]) {
  const seen = new Set<string>();
  values.forEach((value) => {
    const normalized = String(value || '').trim();
    if (!normalized) return;
    seen.add(normalized);
  });
  return Array.from(seen).sort((left, right) => left.localeCompare(right, 'vi'));
}

function normalizeText(value: unknown) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function parseNumber(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const raw = String(value ?? '').trim();
  if (!raw) return 0;

  const normalized = raw.replace(/\s/g, '').replace(/â‚«/g, '');
  const commaCount = (normalized.match(/,/g) || []).length;
  const dotCount = (normalized.match(/\./g) || []).length;

  if (commaCount > 0 && dotCount > 0) {
    if (normalized.lastIndexOf(',') > normalized.lastIndexOf('.')) {
      return Number(normalized.replace(/\./g, '').replace(',', '.')) || 0;
    }
    return Number(normalized.replace(/,/g, '')) || 0;
  }

  if (commaCount > 1 && dotCount === 0) {
    return Number(normalized.replace(/,/g, '')) || 0;
  }

  if (dotCount > 1 && commaCount === 0) {
    return Number(normalized.replace(/\./g, '')) || 0;
  }

  if (commaCount === 1 && dotCount === 0) {
    const [left, right] = normalized.split(',');
    if (right.length === 3 && /^-?\d+$/.test(left)) {
      return Number(left + right) || 0;
    }
    return Number(normalized.replace(',', '.')) || 0;
  }

  return Number(normalized) || 0;
}

function parsePercent(value: unknown): number {
  const parsed = parseNumber(value);
  return parsed > 1 ? parsed / 100 : parsed;
}

function buildValuesUrl(sheetId: string, range: string, apiKey: string) {
  return `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}?key=${encodeURIComponent(apiKey)}&${GOOGLE_SHEETS_VALUE_PARAMS}`;
}

function googleSerialDate(value: number) {
  if (!Number.isFinite(value)) return null;
  return new Date(GOOGLE_SHEETS_EPOCH_MS + Math.floor(value) * MS_PER_DAY);
}

function formatDateCell(value: unknown) {
  if (typeof value === 'number') {
    const date = googleSerialDate(value);
    if (date) {
      const day = String(date.getUTCDate()).padStart(2, '0');
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      return `${day}/${month}/${date.getUTCFullYear()}`;
    }
  }

  return String(value || '').trim();
}

function formatTimeCell(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const fraction = ((value % 1) + 1) % 1;
    const totalMinutes = Math.round(fraction * 24 * 60) % (24 * 60);
    const hours = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
    const minutes = String(totalMinutes % 60).padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  return String(value || '').trim();
}

function parseDateTime(dateStr: string, timeStr: string): Date | null {
  const dateValue = String(dateStr || '').trim();
  if (!dateValue) return null;

  const timeValue = String(timeStr || '').trim() || '00:00';
  const slashMatch = dateValue.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const [, dd, mm, yyyy] = slashMatch;
    return new Date(`${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}T${timeValue}`);
  }

  const isoMatch = dateValue.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const [, yyyy, mm, dd] = isoMatch;
    return new Date(`${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}T${timeValue}`);
  }

  const parsed = new Date(`${dateValue} ${timeValue}`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeStatus(value: unknown): TradeStatus {
  const normalized = normalizeText(value);
  if (normalized === 'thang') return 'Thắng';
  if (normalized === 'thua') return 'Thua';
  if (normalized === 'hoa') return 'Hòa';
  if (normalized === 'dang mo') return 'Đang mở';
  return 'Đang mở';
}

function normalizeAssetType(value: unknown): AssetType {
  return normalizeText(value) === 'phai sinh' ? 'Phái sinh' : 'Cổ phiếu';
}

function normalizePosition(value: unknown): PositionType {
  return normalizeText(value) === 'short' ? 'SHORT' : 'LONG';
}

function headerIndex(headers: unknown[], candidates: string[], fallback: number) {
  const normalizedHeaders = headers.map((header) => normalizeText(header));
  for (const candidate of candidates) {
    const normalizedCandidate = normalizeText(candidate);
    const index = normalizedHeaders.findIndex((header) => header === normalizedCandidate || header.includes(normalizedCandidate));
    if (index >= 0) return index;
  }
  return fallback;
}

function isCashOutflow(type: unknown, note: unknown) {
  const normalized = normalizeText(`${type ?? ''} ${note ?? ''}`);
  return normalized.includes('rut') || normalized.includes('withdraw') || normalized.includes('outflow') || normalized.includes('chi tien');
}

function getDateKey(value: string) {
  const date = parseDateTime(value, '00:00');
  if (!date) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function mapCashFlows(values: unknown[][]): CashFlowEvent[] {
  const map: Record<string, number> = {};
  const headers = Array.isArray(values[0]) ? values[0] : [];
  const dateIndex = headerIndex(headers, ['ngay', 'date'], 0);
  const typeIndex = headerIndex(headers, ['loai', 'type'], 2);
  const amountIndex = headerIndex(headers, ['so tien', 'amount', 'gia tri'], 3);
  const noteIndex = headerIndex(headers, ['ghi chu', 'note', 'noi dung'], 4);

  values.slice(1).forEach((row) => {
    if (!Array.isArray(row) || !row.some((cell) => String(cell ?? '').trim() !== '')) return;
    const key = getDateKey(formatDateCell(row[dateIndex]));
    if (!key) return;
    const amount = Math.abs(parseNumber(row[amountIndex]));
    if (!amount) return;
    const signedAmount = isCashOutflow(row[typeIndex], row[noteIndex]) ? -amount : amount;
    map[key] = (map[key] || 0) + signedAmount;
  });
  return Object.entries(map)
    .map(([key, amount]) => ({ key, amount }))
    .sort((left, right) => left.key.localeCompare(right.key));
}

function mapFeeCharges(values: unknown[][]): FeeCharge[] {
  return values.slice(1)
    .filter((row) => Array.isArray(row) && row.some((cell) => String(cell ?? '').trim() !== ''))
    .map((row, index) => ({
      rowNumber: index + 2,
      date: formatDateCell(row[0]),
      account: String(row[2] || '').trim(),
            category: String(row[4] || 'Phí d?nh k?').trim(),
            amount: Math.abs(parseNumber(row[11] ?? row[10] ?? row[9])),
            note: [String(row[3] || '').trim(), String(row[1] || '').trim(), String(row[13] || '').trim()].filter(Boolean).join(' · '),
    }))
    .filter((charge) => charge.amount > 0 && charge.date);
}

function mapSheetConfig(values: unknown[][]): SheetRuntimeConfig | null {
  const stockCapital = parseNumber(values[0]?.[0]);
  const derivativesCapital = parseNumber(values[1]?.[0]);
  const maxRiskPerTradePct = parsePercent(values[2]?.[0]);
  const monthlyTargetPct = parsePercent(values[3]?.[0]);
  const minRewardRisk = parseNumber(values[4]?.[0]);

  if (![stockCapital, derivativesCapital, maxRiskPerTradePct, monthlyTargetPct, minRewardRisk].some((value) => value > 0)) {
    return null;
  }

  return {
    initialCapital: stockCapital + derivativesCapital,
    stockCapital,
    derivativesCapital,
    maxRiskPerTradePct,
    monthlyTargetPct,
    minRewardRisk,
  };
}

function mapAvailableAccounts(values: unknown[][]) {
  return uniqueSortedStrings(
    values
      .map((row) => String(row?.[0] || '').trim())
      .filter((value) => {
        const normalized = normalizeText(value);
        return value && value !== '*' && normalized !== 'tat ca' && normalized !== 'tai khoan';
      }),
  );
}

function mapUsers(values: unknown[][]): SheetUser[] {
  return values.slice(1)
    .filter((row) => Array.isArray(row) && row.some((cell) => String(cell ?? '').trim() !== ''))
    .map((row, index) => ({
      rowNumber: Number.parseInt(String(row[0] || '').trim(), 10) || index + 2,
      username: String(row[1] || '').trim(),
      passwordHash: String(row[2] || '').trim(),
            role: String(row[3] || '').trim(),
            displayName: String(row[4] || '').trim(),
            status: String(row[5] || '').trim(),
            lastLoginAt: String(row[6] || '').trim(),
    }))
    .filter((user) => user.username && user.passwordHash);
}

function readApiError(error: ProxyDatasetResponse['error']) {
  if (!error) return '';
  if (typeof error === 'string') return error;
  return error.message || '';
}

async function fetchProxyDataset(sheetId: string, options: FetchOptions = {}) {
  const apiBaseUrl = getApiBaseUrl();
  const cacheKey = sheetId.trim();
  const forceRefresh = Boolean(options.forceRefresh);

  if (forceRefresh && proxyDatasetCache.key === cacheKey) {
    proxyDatasetCache = { key: '', expiresAt: 0, data: null, promise: null };
  }

  if (!forceRefresh && proxyDatasetCache.key === cacheKey && proxyDatasetCache.data && proxyDatasetCache.expiresAt > Date.now()) {
    return proxyDatasetCache.data;
  }

  if (!forceRefresh && proxyDatasetCache.key === cacheKey && proxyDatasetCache.promise) {
    return proxyDatasetCache.promise;
  }

  const request = (async () => {
    const refreshParam = forceRefresh ? '&refresh=1' : '';
    const response = await fetch(`${apiBaseUrl}/api/trades?sheetId=${encodeURIComponent(cacheKey)}${refreshParam}`);
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      throw new Error('Endpoint dá»¯ liá»‡u khÃ´ng tráº£ JSON. Náº¿u Ä‘ang cháº¡y trÃªn Cloudflare Pages, hÃ£y nháº­p API Key hoáº·c dÃ¹ng Worker proxy.');
    }

    const data = await response.json() as ProxyDatasetResponse;
    if (!response.ok) {
      throw new Error(readApiError(data?.error) || 'KhÃ´ng thá»ƒ Ä‘á»c dá»¯ liá»‡u Google Sheets.');
    }

    proxyDatasetCache = {
      key: cacheKey,
      expiresAt: Date.now() + 30_000,
      data,
      promise: null,
    };

    return data;
  })();

  proxyDatasetCache = {
    key: cacheKey,
    expiresAt: 0,
    data: null,
    promise: request,
  };

  try {
    return await request;
  } catch (error) {
    if (proxyDatasetCache.key === cacheKey) {
      proxyDatasetCache = { key: '', expiresAt: 0, data: null, promise: null };
    }
    throw error;
  }
}

function mapRows(rows: unknown[][], cashFlows: CashFlowEvent[], initialCapital = FALLBACK_INITIAL_CAPITAL): Trade[] {
  let runningEquity = initialCapital;
  let cashFlowIndex = 0;
  const trades = rows
    .filter((row: unknown[]) => Array.isArray(row) && row.some((cell) => String(cell ?? '').trim() !== ''))
    .map((row: unknown[], index: number) => {
      const netPnL = parseNumber(row[21]);
      const openDate = formatDateCell(row[8]);
      const openTime = formatTimeCell(row[9]);
      const closeDate = formatDateCell(row[10]);
      const closeTime = formatTimeCell(row[11]);
      const tradeKey = getDateKey(closeDate || openDate);
      let cashFlow = 0;

      while (cashFlowIndex < cashFlows.length && (!tradeKey || cashFlows[cashFlowIndex].key <= tradeKey)) {
        cashFlow += cashFlows[cashFlowIndex].amount;
        cashFlowIndex += 1;
      }

      runningEquity += cashFlow + netPnL;

      return {
        rowNumber: index + 2,
        status: normalizeStatus(row[0]),
        account: String(row[1] || '').trim(),
        orderId: String(row[2] || '').trim(),
        assetType: normalizeAssetType(row[3]),
        symbol: String(row[4] || '').trim(),
        position: normalizePosition(row[5]),
        orderType: String(row[6] || '').trim(),
        strategy: String(row[7] || '').trim(),
        openDate,
        openTime,
        closeDate,
        closeTime,
        holdingDays: parseNumber(row[12]),
        volume: parseNumber(row[13]),
        entryPrice: parseNumber(row[14]),
        exitPrice: parseNumber(row[15]),
        stopLoss: parseNumber(row[16]),
        takeProfit: parseNumber(row[17]),
        feesAndTaxes: parseNumber(row[18]),
        amplitude: parseNumber(row[19]),
        grossPnL: parseNumber(row[20]),
        netPnL,
        mood: String(row[22] || '').trim(),
        reviewNote: String(row[23] || '').trim(),
        sector: String(row[24] || '').trim(),
        entryDateTime: parseDateTime(openDate, openTime),
        exitDateTime: parseDateTime(closeDate, closeTime),
        cashFlow,
        equity: runningEquity,
      };
    });

  const trailingCashFlow = cashFlows.slice(cashFlowIndex).reduce((sum, item) => sum + item.amount, 0);
  if (trailingCashFlow) {
    runningEquity += trailingCashFlow;
    if (trades.length > 0) {
      const lastTrade = trades[trades.length - 1];
      lastTrade.cashFlow += trailingCashFlow;
      lastTrade.equity = runningEquity;
    }
  }

  return trades;
}

export class GoogleSheetsService {
  static async fetchTrades(sheetId: string, apiKey: string, options: FetchOptions = {}): Promise<Trade[]> {
    if (!sheetId) {
      throw new Error('Sheet ID lÃ  báº¯t buá»™c.');
    }

    const normalizedSheetId = sheetId.trim() || DEFAULT_SHEET_ID;
    const normalizedApiKey = apiKey.trim();
    const apiBaseUrl = getApiBaseUrl();
    const canUseLocalProxy = isLocalHost();
    const canUseBackendProxy = Boolean(apiBaseUrl);

    if (!normalizedApiKey && !canUseLocalProxy && !canUseBackendProxy) {
      throw new Error('Cloudflare Pages khÃ´ng cÃ³ /api/trades ná»™i bá»™. HÃ£y cáº¥u hÃ¬nh VITE_API_BASE_URL tá»›i VPS API hoáº·c nháº­p Google Sheets API Key trong CÃ i Ä‘áº·t.');
    }

    const data = normalizedApiKey
      ? await (async () => {
          const url = buildValuesUrl(normalizedSheetId, SHEET_RANGE, normalizedApiKey);
          const response = await fetch(url);
          const contentType = response.headers.get('content-type') || '';
          if (!contentType.includes('application/json')) {
            throw new Error('Endpoint dá»¯ liá»‡u khÃ´ng tráº£ JSON. Náº¿u Ä‘ang cháº¡y trÃªn Cloudflare Pages, hÃ£y nháº­p API Key hoáº·c dÃ¹ng Worker proxy.');
          }

          const payload = await response.json();
          if (!response.ok) {
            throw new Error(readApiError(payload?.error) || 'KhÃ´ng thá»ƒ Ä‘á»c dá»¯ liá»‡u Google Sheets.');
          }
          return payload as ProxyDatasetResponse;
        })()
      : await fetchProxyDataset(normalizedSheetId, options);

    if (Array.isArray(data.trades)) {
      return data.trades.map((trade: Trade, index: number) => ({ ...trade, cashFlow: trade.cashFlow || 0, rowNumber: trade.rowNumber || index + 2 }));
    }

    if (!Array.isArray(data.values) || data.values.length < 2) {
      return [];
    }

    let cashFlows: CashFlowEvent[] = [];
    let sheetConfig: SheetRuntimeConfig | null = data.sheetConfig || null;

    if (normalizedApiKey) {
      const [cashResponse, configResponse] = await Promise.all([
        fetch(buildValuesUrl(normalizedSheetId, CASHFLOW_RANGE, normalizedApiKey)),
        fetch(buildValuesUrl(normalizedSheetId, CONFIG_RISK_RANGE, normalizedApiKey)),
      ]);

      const [cashData, configData] = await Promise.all([cashResponse.json(), configResponse.json()]);
      if (cashResponse.ok && Array.isArray(cashData.values)) cashFlows = mapCashFlows(cashData.values);
      if (configResponse.ok && Array.isArray(configData.values)) sheetConfig = mapSheetConfig(configData.values);
    }

    return mapRows(data.values.slice(1), cashFlows, sheetConfig?.initialCapital ?? FALLBACK_INITIAL_CAPITAL);
  }

  static async fetchFeeCharges(sheetId: string, apiKey: string, options: FetchOptions = {}): Promise<FeeCharge[]> {
    if (!sheetId) return [];

    const normalizedSheetId = sheetId.trim() || DEFAULT_SHEET_ID;
    const normalizedApiKey = apiKey.trim();

    if (!normalizedApiKey) {
      const data = await fetchProxyDataset(normalizedSheetId, options).catch(() => ({} as ProxyDatasetResponse));
      if (Array.isArray(data.feeCharges)) return data.feeCharges;
      return [];
    }

    const url = buildValuesUrl(normalizedSheetId, FEE_CHARGES_RANGE, normalizedApiKey);
    const response = await fetch(url);
    const data = await response.json();
    if (!response.ok || !Array.isArray(data.values)) return [];
    return mapFeeCharges(data.values);
  }

  static async fetchAvailableAccounts(sheetId: string, apiKey: string, options: FetchOptions = {}): Promise<string[]> {
    if (!sheetId) return [];

    const normalizedSheetId = sheetId.trim() || DEFAULT_SHEET_ID;
    const normalizedApiKey = apiKey.trim();

    if (!normalizedApiKey) {
      const data = await fetchProxyDataset(normalizedSheetId, options).catch(() => ({} as ProxyDatasetResponse));
      if (!Array.isArray(data.availableAccounts)) return [];
      return uniqueSortedStrings(data.availableAccounts);
    }

    for (const range of ACCOUNT_LIST_RANGES) {
      const url = buildValuesUrl(normalizedSheetId, range, normalizedApiKey);
      const response = await fetch(url);
      const data = await response.json();
      if (!response.ok || !Array.isArray(data.values)) continue;

      const accounts = mapAvailableAccounts(data.values);
      if (accounts.length > 0) return accounts;
    }

    return [];
  }

  static async fetchSheetConfig(sheetId: string, apiKey: string, options: FetchOptions = {}): Promise<SheetRuntimeConfig | null> {
    if (!sheetId) return null;

    const normalizedSheetId = sheetId.trim() || DEFAULT_SHEET_ID;
    const normalizedApiKey = apiKey.trim();

    if (!normalizedApiKey) {
      const data = await fetchProxyDataset(normalizedSheetId, options).catch(() => ({} as ProxyDatasetResponse));
      return data.sheetConfig || null;
    }

    const url = buildValuesUrl(normalizedSheetId, CONFIG_RISK_RANGE, normalizedApiKey);
    const response = await fetch(url);
    const data = await response.json();
    if (!response.ok || !Array.isArray(data.values)) return null;
    return mapSheetConfig(data.values);
  }

  static async fetchUsers(sheetId: string, apiKey: string, options: FetchOptions = {}): Promise<SheetUser[]> {
    if (!sheetId) return [];

    const normalizedSheetId = sheetId.trim() || DEFAULT_SHEET_ID;
    const normalizedApiKey = apiKey.trim();

    if (!normalizedApiKey) {
      const data = await fetchProxyDataset(normalizedSheetId, options);
      if (!Array.isArray(data.users)) return [];
      return data.users;
    }

    const url = buildValuesUrl(normalizedSheetId, USERS_RANGE, normalizedApiKey);
    const response = await fetch(url);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(readApiError(data?.error) || 'KhÃƒÂ´ng thÃ¡Â»Æ’ Ã„â€˜Ã¡Â»Âc tab USERS tÃ¡Â»Â« Google Sheets.');
    }
    if (!Array.isArray(data.values)) return [];
    return mapUsers(data.values);
  }
}
