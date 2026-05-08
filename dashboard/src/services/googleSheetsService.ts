import type { Trade, TradeStatus, AssetType, PositionType, FeeCharge, SheetUser } from '../types.ts';

import type { SheetRuntimeConfig } from '../types.ts';

const SHEET_RANGE = 'JOURNAL!A1:X2000';
const CASHFLOW_RANGE = 'CASHFLOW!A1:E2000';
const FEE_CHARGES_RANGE = 'FEE_CHARGES!A1:L2000';
const CONFIG_RISK_RANGE = 'CONFIG!G3:G7';
const USERS_RANGE = 'USERS!A1:G500';
const ACCOUNT_LIST_RANGES = ['FORMULAS!I2:I200', 'SETUP!AJ2:AJ200'];
const DEFAULT_SHEET_ID = '1PdCmBoBQsznOx6JXvOlbD-atxQnX9wHRXiM127f109I';
const FALLBACK_INITIAL_CAPITAL = 200_000_000;
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

  const normalized = raw.replace(/\s/g, '').replace(/₫/g, '');
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

function getDateKey(value: string) {
  const date = parseDateTime(value, '00:00');
  if (!date) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function todayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function mapCashFlows(values: unknown[][]): CashFlowEvent[] {
  const map: Record<string, number> = {};
  values.slice(1).forEach((row) => {
    const key = getDateKey(String(row[0] || '').trim());
    if (!key) return;
    const type = normalizeText(row[2]);
    const amount = Math.abs(parseNumber(row[3]));
    if (!amount) return;
    map[key] = (map[key] || 0) + (type.includes('rut') ? -amount : amount);
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
      date: String(row[0] || '').trim(),
      account: String(row[2] || '').trim(),
      category: String(row[4] || 'Phí định kỳ').trim(),
      amount: Math.abs(parseNumber(row[11] ?? row[10] ?? row[9])),
      note: [String(row[3] || '').trim(), String(row[1] || '').trim()].filter(Boolean).join(' · '),
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
    const response = await fetch(`${apiBaseUrl}/api/trades?sheetId=${encodeURIComponent(cacheKey)}`);
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      throw new Error('Endpoint dữ liệu không trả JSON. Nếu đang chạy trên Cloudflare Pages, hãy nhập API Key hoặc dùng Worker proxy.');
    }

    const data = await response.json() as ProxyDatasetResponse;
    if (!response.ok) {
      throw new Error(readApiError(data?.error) || 'Không thể đọc dữ liệu Google Sheets.');
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
  const maxTradeKey = todayKey();
  const trades = rows
    .filter((row: unknown[]) => Array.isArray(row) && row.some((cell) => String(cell ?? '').trim() !== ''))
    .filter((row: unknown[]) => {
      const tradeKey = getDateKey(String(row[9] || row[7] || '').trim());
      return !tradeKey || tradeKey <= maxTradeKey;
    })
    .map((row: unknown[], index: number) => {
      const netPnL = parseNumber(row[20]);
      const openDate = String(row[7] || '').trim();
      const openTime = String(row[8] || '').trim();
      const closeDate = String(row[9] || '').trim();
      const closeTime = String(row[10] || '').trim();
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
        assetType: normalizeAssetType(row[2]),
        symbol: String(row[3] || '').trim(),
        position: normalizePosition(row[4]),
        orderType: String(row[5] || '').trim(),
        strategy: String(row[6] || '').trim(),
        openDate,
        openTime,
        closeDate,
        closeTime,
        holdingDays: parseNumber(row[11]),
        volume: parseNumber(row[12]),
        entryPrice: parseNumber(row[13]),
        exitPrice: parseNumber(row[14]),
        stopLoss: parseNumber(row[15]),
        takeProfit: parseNumber(row[16]),
        amplitude: parseNumber(row[17]),
        grossPnL: parseNumber(row[18]),
        feesAndTaxes: parseNumber(row[19]),
        netPnL,
        mood: String(row[21] || '').trim(),
        reviewNote: String(row[22] || '').trim(),
        sector: String(row[23] || '').trim(),
        entryDateTime: parseDateTime(openDate, openTime),
        exitDateTime: parseDateTime(closeDate, closeTime),
        cashFlow,
        equity: runningEquity,
      };
    });

  const trailingCashFlow = cashFlows.slice(cashFlowIndex).reduce((sum, item) => sum + item.amount, 0);
  if (trailingCashFlow && trades.length > 0) {
    const lastTrade = trades[trades.length - 1];
    lastTrade.cashFlow += trailingCashFlow;
    lastTrade.equity += trailingCashFlow;
  }

  return trades;
}

export class GoogleSheetsService {
  static async fetchTrades(sheetId: string, apiKey: string): Promise<Trade[]> {
    if (!sheetId) {
      throw new Error('Sheet ID là bắt buộc.');
    }

    const normalizedSheetId = sheetId.trim() || DEFAULT_SHEET_ID;
    const normalizedApiKey = apiKey.trim();
    const apiBaseUrl = getApiBaseUrl();
    const canUseLocalProxy = isLocalHost();
    const canUseBackendProxy = Boolean(apiBaseUrl);

    if (!normalizedApiKey && !canUseLocalProxy && !canUseBackendProxy) {
      throw new Error('Cloudflare Pages không có /api/trades nội bộ. Hãy cấu hình VITE_API_BASE_URL tới VPS API hoặc nhập Google Sheets API Key trong Cài đặt.');
    }

    const data = normalizedApiKey
      ? await (async () => {
          const url = `https://sheets.googleapis.com/v4/spreadsheets/${normalizedSheetId}/values/${encodeURIComponent(SHEET_RANGE)}?key=${normalizedApiKey}`;
          const response = await fetch(url);
          const contentType = response.headers.get('content-type') || '';
          if (!contentType.includes('application/json')) {
            throw new Error('Endpoint dữ liệu không trả JSON. Nếu đang chạy trên Cloudflare Pages, hãy nhập API Key hoặc dùng Worker proxy.');
          }

          const payload = await response.json();
          if (!response.ok) {
            throw new Error(readApiError(payload?.error) || 'Không thể đọc dữ liệu Google Sheets.');
          }
          return payload as ProxyDatasetResponse;
        })()
      : await fetchProxyDataset(normalizedSheetId);

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
        fetch(`https://sheets.googleapis.com/v4/spreadsheets/${normalizedSheetId}/values/${encodeURIComponent(CASHFLOW_RANGE)}?key=${normalizedApiKey}`),
        fetch(`https://sheets.googleapis.com/v4/spreadsheets/${normalizedSheetId}/values/${encodeURIComponent(CONFIG_RISK_RANGE)}?key=${normalizedApiKey}`),
      ]);

      const [cashData, configData] = await Promise.all([cashResponse.json(), configResponse.json()]);
      if (cashResponse.ok && Array.isArray(cashData.values)) cashFlows = mapCashFlows(cashData.values);
      if (configResponse.ok && Array.isArray(configData.values)) sheetConfig = mapSheetConfig(configData.values);
    }

    return mapRows(data.values.slice(1), cashFlows, sheetConfig?.initialCapital ?? FALLBACK_INITIAL_CAPITAL);
  }

  static async fetchFeeCharges(sheetId: string, apiKey: string): Promise<FeeCharge[]> {
    if (!sheetId) return [];

    const normalizedSheetId = sheetId.trim() || DEFAULT_SHEET_ID;
    const normalizedApiKey = apiKey.trim();

    if (!normalizedApiKey) {
      const data = await fetchProxyDataset(normalizedSheetId).catch(() => ({} as ProxyDatasetResponse));
      if (Array.isArray(data.feeCharges)) return data.feeCharges;
      return [];
    }

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${normalizedSheetId}/values/${encodeURIComponent(FEE_CHARGES_RANGE)}?key=${normalizedApiKey}`;
    const response = await fetch(url);
    const data = await response.json();
    if (!response.ok || !Array.isArray(data.values)) return [];
    return mapFeeCharges(data.values);
  }

  static async fetchAvailableAccounts(sheetId: string, apiKey: string): Promise<string[]> {
    if (!sheetId) return [];

    const normalizedSheetId = sheetId.trim() || DEFAULT_SHEET_ID;
    const normalizedApiKey = apiKey.trim();

    if (!normalizedApiKey) {
      const data = await fetchProxyDataset(normalizedSheetId).catch(() => ({} as ProxyDatasetResponse));
      if (!Array.isArray(data.availableAccounts)) return [];
      return uniqueSortedStrings(data.availableAccounts);
    }

    for (const range of ACCOUNT_LIST_RANGES) {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${normalizedSheetId}/values/${encodeURIComponent(range)}?key=${normalizedApiKey}`;
      const response = await fetch(url);
      const data = await response.json();
      if (!response.ok || !Array.isArray(data.values)) continue;

      const accounts = mapAvailableAccounts(data.values);
      if (accounts.length > 0) return accounts;
    }

    return [];
  }

  static async fetchSheetConfig(sheetId: string, apiKey: string): Promise<SheetRuntimeConfig | null> {
    if (!sheetId) return null;

    const normalizedSheetId = sheetId.trim() || DEFAULT_SHEET_ID;
    const normalizedApiKey = apiKey.trim();

    if (!normalizedApiKey) {
      const data = await fetchProxyDataset(normalizedSheetId).catch(() => ({} as ProxyDatasetResponse));
      return data.sheetConfig || null;
    }

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${normalizedSheetId}/values/${encodeURIComponent(CONFIG_RISK_RANGE)}?key=${normalizedApiKey}`;
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

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${normalizedSheetId}/values/${encodeURIComponent(USERS_RANGE)}?key=${normalizedApiKey}`;
    const response = await fetch(url);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(readApiError(data?.error) || 'KhÃ´ng thá»ƒ Ä‘á»c tab USERS tá»« Google Sheets.');
    }
    if (!Array.isArray(data.values)) return [];
    return mapUsers(data.values);
  }
}
