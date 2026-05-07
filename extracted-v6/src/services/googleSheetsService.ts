import type { Trade, TradeStatus, AssetType, PositionType } from '../types.ts';

const SHEET_RANGE = 'JOURNAL!A1:X2000';
const DEFAULT_SHEET_ID = '1PdCmBoBQsznOx6JXvOlbD-atxQnX9wHRXiM127f109I';

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

export class GoogleSheetsService {
  static async fetchTrades(sheetId: string, apiKey: string): Promise<Trade[]> {
    if (!sheetId) {
      throw new Error('Sheet ID là bắt buộc.');
    }

    const isDefaultSheet = sheetId === DEFAULT_SHEET_ID;
    const url = !apiKey && isDefaultSheet
      ? '/api/trades'
      : `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${SHEET_RANGE}?key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.error?.message || 'Không thể đọc dữ liệu Google Sheets.');
    }

    if (Array.isArray(data.trades)) {
      return data.trades.map((trade: Trade, index: number) => ({ ...trade, rowNumber: trade.rowNumber || index + 2 }));
    }

    if (!Array.isArray(data.values) || data.values.length < 2) {
      return [];
    }

    const rows = data.values.slice(1);
    let runningEquity = 0;

    return rows
      .filter((row: unknown[]) => Array.isArray(row) && row.some((cell) => String(cell ?? '').trim() !== ''))
      .map((row: unknown[], index: number) => {
        const netPnL = parseNumber(row[20]);
        runningEquity += netPnL;

        const openDate = String(row[7] || '').trim();
        const openTime = String(row[8] || '').trim();
        const closeDate = String(row[9] || '').trim();
        const closeTime = String(row[10] || '').trim();

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
          equity: runningEquity,
        };
      });
  }
}
