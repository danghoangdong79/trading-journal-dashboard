import type { Trade, TradeStatus, AssetType, PositionType } from '../types.ts';

const SHEET_RANGE = 'JOURNAL!A1:X2000';
const CASHFLOW_RANGE = 'CASHFLOW!A1:E2000';
const DEFAULT_SHEET_ID = '1PdCmBoBQsznOx6JXvOlbD-atxQnX9wHRXiM127f109I';
const INITIAL_CAPITAL = 200_000_000;
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || '';

interface CashFlowEvent {
  key: string;
  amount: number;
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
  const text = String(value || '').trim();
  if (text === 'Thắng' || text === 'Thua' || text === 'Hòa' || text === 'Đang mở') return text;
  return 'Đang mở';
}

function normalizeAssetType(value: unknown): AssetType {
  return String(value || '').trim() === 'Phái sinh' ? 'Phái sinh' : 'Cổ phiếu';
}

function normalizePosition(value: unknown): PositionType {
  return String(value || '').trim() === 'SHORT' ? 'SHORT' : 'LONG';
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
    const type = String(row[2] || '').trim().toLowerCase();
    const amount = Math.abs(parseNumber(row[3]));
    if (!amount) return;
    map[key] = (map[key] || 0) + (type.includes('rút') || type.includes('rut') ? -amount : amount);
  });
  return Object.entries(map)
    .map(([key, amount]) => ({ key, amount }))
    .sort((left, right) => left.key.localeCompare(right.key));
}

function mapRows(rows: unknown[][], cashFlows: CashFlowEvent[]): Trade[] {
  let runningEquity = INITIAL_CAPITAL;
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
    const canUseLocalProxy = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const canUseBackendProxy = Boolean(API_BASE_URL);

    if (!normalizedApiKey && !canUseLocalProxy && !canUseBackendProxy) {
      throw new Error('Cloudflare Pages không có /api/trades nội bộ. Hãy cấu hình VITE_API_BASE_URL tới VPS API hoặc nhập Google Sheets API Key trong Cài đặt.');
    }

    const url = normalizedApiKey
      ? `https://sheets.googleapis.com/v4/spreadsheets/${normalizedSheetId}/values/${encodeURIComponent(SHEET_RANGE)}?key=${normalizedApiKey}`
      : `${API_BASE_URL}/api/trades?sheetId=${encodeURIComponent(normalizedSheetId)}`;
    const response = await fetch(url);
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      throw new Error('Endpoint dữ liệu không trả JSON. Nếu đang chạy trên Cloudflare Pages, hãy nhập API Key hoặc dùng Worker proxy.');
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.error?.message || data?.error || 'Không thể đọc dữ liệu Google Sheets.');
    }

    if (Array.isArray(data.trades)) {
      return data.trades.map((trade: Trade, index: number) => ({ ...trade, cashFlow: trade.cashFlow || 0, rowNumber: trade.rowNumber || index + 2 }));
    }

    if (!Array.isArray(data.values) || data.values.length < 2) {
      return [];
    }

    let cashFlows: CashFlowEvent[] = [];
    if (normalizedApiKey) {
      const cashUrl = `https://sheets.googleapis.com/v4/spreadsheets/${normalizedSheetId}/values/${encodeURIComponent(CASHFLOW_RANGE)}?key=${normalizedApiKey}`;
      const cashResponse = await fetch(cashUrl);
      const cashData = await cashResponse.json();
      if (cashResponse.ok && Array.isArray(cashData.values)) cashFlows = mapCashFlows(cashData.values);
    }

    return mapRows(data.values.slice(1), cashFlows);
  }
}
